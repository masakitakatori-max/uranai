import Stripe from "stripe";

import { corsHeaders, jsonResponse } from "../lib/http.js";
import {
  hasWebhookEventBeenProcessed,
  linkDevice,
  recordWebhookEvent,
  updateStripeEntitlementStatus,
  upsertAccountByEmail,
  upsertStripeEntitlement,
} from "../lib/entitlements.js";

function getStripeClient(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function mapStripeStatus(status) {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    default:
      return "canceled";
  }
}

async function handleCheckoutSession(request, env, origin) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return jsonResponse(503, { ok: false, error: "Stripe が未設定です。" }, origin);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "リクエストボディが不正です。" }, origin);
  }

  const deviceId = typeof payload?.deviceId === "string" ? payload.deviceId.trim() : "";
  if (!deviceId) {
    return jsonResponse(400, { ok: false, error: "deviceId が必要です。" }, origin);
  }

  const siteUrl = env.SITE_URL || "https://uranai.mozule.co.jp";
  const stripe = getStripeClient(env);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: deviceId,
    success_url: typeof payload.successUrl === "string" && payload.successUrl ? payload.successUrl : `${siteUrl}/billing/success`,
    cancel_url: typeof payload.cancelUrl === "string" && payload.cancelUrl ? payload.cancelUrl : siteUrl,
  });

  return jsonResponse(200, { ok: true, checkoutUrl: session.url, sessionId: session.id }, origin);
}

async function handleWebhook(request, env, origin) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse(503, { ok: false, error: "Stripe Webhook が未設定です。" }, origin);
  }

  const signature = request.headers.get("Stripe-Signature") || "";
  const rawBody = await request.text();
  const stripe = getStripeClient(env);

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return jsonResponse(400, { ok: false, error: `Webhook署名検証に失敗しました: ${error.message}` }, origin);
  }

  if (!env.DB) {
    return jsonResponse(200, { received: true }, origin);
  }

  const alreadyProcessed = await hasWebhookEventBeenProcessed(env.DB, event.id);
  if (alreadyProcessed) {
    return jsonResponse(200, { received: true }, origin);
  }

  await recordWebhookEvent(env.DB, {
    id: event.id,
    source: "stripe",
    eventType: event.type,
    payload: JSON.stringify(event),
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const deviceId = session.client_reference_id;
    const subscriptionId = session.subscription;

    if (email && subscriptionId) {
      const accountId = await upsertAccountByEmail(env.DB, email);
      if (deviceId) {
        await linkDevice(env.DB, deviceId, accountId, "web");
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await upsertStripeEntitlement(env.DB, {
        accountId,
        subscriptionId,
        productId: env.STRIPE_PRICE_ID || "",
        status: mapStripeStatus(subscription.status),
        currentPeriodEnd: subscription.current_period_end * 1000,
        rawPayload: JSON.stringify(event),
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await updateStripeEntitlementStatus(
      env.DB,
      subscription.id,
      mapStripeStatus(subscription.status),
      subscription.current_period_end * 1000,
      JSON.stringify(event),
    );
  }

  return jsonResponse(200, { received: true }, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "対応していないメソッドです。" }, origin);
    }

    if (url.pathname === "/api/billing/stripe/checkout-session") {
      try {
        return await handleCheckoutSession(request, env, origin);
      } catch (error) {
        return jsonResponse(500, { ok: false, error: error?.message || "Checkout Session の作成に失敗しました。" }, origin);
      }
    }

    if (url.pathname === "/api/billing/stripe/webhook") {
      try {
        return await handleWebhook(request, env, origin);
      } catch (error) {
        return jsonResponse(500, { ok: false, error: error?.message || "Webhook処理に失敗しました。" }, origin);
      }
    }

    return jsonResponse(404, { ok: false, error: "not found" }, origin);
  },
};
