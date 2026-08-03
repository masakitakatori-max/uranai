import { SignJWT, importPKCS8 } from "jose";

import { verifyAppleSignedPayload } from "../lib/appleJws.js";
import { corsHeaders, jsonResponse } from "../lib/http.js";
import {
  hasWebhookEventBeenProcessed,
  linkDevice,
  recordWebhookEvent,
  upsertAccountByAppleOriginalTransactionId,
  upsertAppleEntitlement,
} from "../lib/entitlements.js";

const APP_STORE_SERVER_API_HOSTS = {
  production: "https://api.storekit.itunes.apple.com",
  sandbox: "https://api.storekit-sandbox.itunes.apple.com",
};

function isAppleConfigured(env) {
  return Boolean(env.APPLE_KEY_ID && env.APPLE_ISSUER_ID && env.APPLE_BUNDLE_ID && env.APPLE_PRIVATE_KEY);
}

/** App Store Server API 認証用の短命JWT（ES256）。仕様: iss/iat/exp(<=60分)/aud=appstoreconnect-v1/bid。 */
async function buildAppStoreServerJwt(env) {
  const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ bid: env.APPLE_BUNDLE_ID })
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" })
    .setIssuedAt(now)
    .setIssuer(env.APPLE_ISSUER_ID)
    .setAudience("appstoreconnect-v1")
    .setExpirationTime(now + 60 * 5)
    .sign(privateKey);
}

function decodeJwsPayload(jws) {
  const parts = String(jws || "").split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function mapAppleStatus(status) {
  // 1=active, 2=expired, 3=in billing retry, 4=in grace period, 5=revoked
  switch (status) {
    case 1:
      return "active";
    case 3:
      return "past_due";
    case 4:
      return "grace_period";
    default:
      return "canceled";
  }
}

/** 検証済みのApple Transaction claimsからD1のentitlementsを更新する（account/entitlementのみ、device紐付けは呼び出し側）。 */
async function upsertEntitlementFromAppleClaims(db, claims) {
  const status = mapAppleStatus(claims.subscriptionStatus ?? claims.status);
  const accountId = await upsertAccountByAppleOriginalTransactionId(db, claims.originalTransactionId);
  await upsertAppleEntitlement(db, {
    accountId,
    originalTransactionId: claims.originalTransactionId,
    productId: claims.productId || "",
    status,
    currentPeriodEnd: typeof claims.expiresDate === "number" ? claims.expiresDate : null,
    rawPayload: JSON.stringify(claims),
  });
  return { accountId, status };
}

/**
 * POST /api/billing/apple/verify-transaction
 * StoreKit 購入直後に、クライアントが受け取った signedTransactionInfo(JWS) の
 * transactionId を使って App Store Server API へ直接問い合わせ、Appleから返る
 * 応答を x5c チェーン検証（verifyAppleSignedPayload、Apple Root CA - G3 を信頼点とする）
 * した上でD1を更新する。クライアントから受け取った signedTransactionInfo 自体は
 * 検索キー（どのtransactionIdを問い合わせるか）としてのみ使い、内容は信頼しない
 * — 信頼の根拠は常に「Appleサーバーからの、署名検証済みの応答」のみ。
 */
async function handleVerifyTransaction(request, env, origin) {
  if (!isAppleConfigured(env)) {
    return jsonResponse(503, { ok: false, error: "Apple IAP はまだ設定されていません。" }, origin);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "リクエストボディが不正です。" }, origin);
  }

  const deviceId = typeof payload?.deviceId === "string" ? payload.deviceId.trim() : "";
  const signedTransactionInfo = typeof payload?.signedTransactionInfo === "string" ? payload.signedTransactionInfo : "";
  if (!deviceId || !signedTransactionInfo) {
    return jsonResponse(400, { ok: false, error: "deviceId と signedTransactionInfo が必要です。" }, origin);
  }

  const clientClaims = decodeJwsPayload(signedTransactionInfo);
  const transactionId = clientClaims?.transactionId;
  if (!transactionId) {
    return jsonResponse(400, { ok: false, error: "signedTransactionInfo からtransactionIdを取得できませんでした。" }, origin);
  }

  const environment = env.APPLE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const host = APP_STORE_SERVER_API_HOSTS[environment];

  try {
    const jwt = await buildAppStoreServerJwt(env);
    const response = await fetch(`${host}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!response.ok) {
      const body = await response.text();
      return jsonResponse(502, { ok: false, error: `App Store Server API の呼び出しに失敗しました: ${response.status} ${body}` }, origin);
    }

    const { signedTransactionInfo: authoritativeJws } = await response.json();
    const claims = await verifyAppleSignedPayload(authoritativeJws);
    if (!claims?.originalTransactionId) {
      return jsonResponse(502, { ok: false, error: "App Store Server API の応答の署名検証に失敗しました。" }, origin);
    }

    if (!env.DB) {
      return jsonResponse(503, { ok: false, error: "DB未設定です。" }, origin);
    }

    const { status, accountId } = await upsertEntitlementFromAppleClaims(env.DB, claims);
    await linkDevice(env.DB, deviceId, accountId, "ios");

    return jsonResponse(200, {
      ok: true,
      status,
      originalTransactionId: claims.originalTransactionId,
    }, origin);
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error?.message || "検証処理に失敗しました。" }, origin);
  }
}

/**
 * POST /api/billing/apple/notifications — App Store Server Notifications V2。
 * インターネットに公開された受信専用エンドポイントのため、signedPayload の
 * JWS(x5c chain, Apple Root CA - G3を信頼点)検証を経てからのみ内容を信頼する
 * （verifyAppleSignedPayload）。renewal/expiration/refund/revoke等の通知を
 * 「再検証のトリガー」ではなく、通知自体の署名検証済みペイロードから直接D1を更新する
 * （notificationのsignedTransactionInfoも別途JWS署名されているため、そちらも検証する）。
 */
async function handleNotifications(request, env, origin) {
  if (!env.DB) {
    return jsonResponse(503, { ok: false, error: "DB未設定です。" }, origin);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "リクエストボディが不正です。" }, origin);
  }

  const signedPayload = typeof payload?.signedPayload === "string" ? payload.signedPayload : "";
  const notification = await verifyAppleSignedPayload(signedPayload);
  if (!notification) {
    // 署名検証に失敗した通知は完全に無視する（なりすましの可能性があるため200は返すが何もしない）。
    return jsonResponse(200, { ok: false, error: "signedPayload の署名検証に失敗しました。" }, origin);
  }

  const notificationUUID = typeof notification.notificationUUID === "string" ? notification.notificationUUID : null;
  if (notificationUUID) {
    const alreadyProcessed = await hasWebhookEventBeenProcessed(env.DB, notificationUUID);
    if (alreadyProcessed) {
      return jsonResponse(200, { ok: true, received: true }, origin);
    }
    await recordWebhookEvent(env.DB, {
      id: notificationUUID,
      source: "apple",
      eventType: notification.notificationType || "unknown",
      payload: JSON.stringify(notification),
    });
  }

  const signedTransactionInfo = notification.data?.signedTransactionInfo;
  if (typeof signedTransactionInfo === "string") {
    const transactionClaims = await verifyAppleSignedPayload(signedTransactionInfo);
    if (transactionClaims?.originalTransactionId) {
      await upsertEntitlementFromAppleClaims(env.DB, transactionClaims);
    }
  }

  return jsonResponse(200, { ok: true, received: true }, origin);
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

    if (url.pathname === "/api/billing/apple/verify-transaction") {
      return handleVerifyTransaction(request, env, origin);
    }

    if (url.pathname === "/api/billing/apple/notifications") {
      return handleNotifications(request, env, origin);
    }

    return jsonResponse(404, { ok: false, error: "not found" }, origin);
  },
};
