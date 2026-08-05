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

/** クライアント提供JWSの中身は信頼しない。originalTransactionId等の“検索キー”を拾うためだけのデコード。 */
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
  // (StatusResponse.data[].lastTransactions[].status — 数値。JWSTransactionDecodedPayload自体には無い)
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

function findLastTransactionItem(statusResponse, originalTransactionId) {
  const groups = Array.isArray(statusResponse?.data) ? statusResponse.data : [];
  for (const group of groups) {
    const items = Array.isArray(group?.lastTransactions) ? group.lastTransactions : [];
    const match = items.find((item) => item?.originalTransactionId === originalTransactionId);
    if (match) {
      return match;
    }
    if (items[0]) {
      return items[0];
    }
  }
  return null;
}

/**
 * originalTransactionId から Apple の権威ある購読ステータスを取得する。
 * "Get All Subscription Statuses" (GET /inApps/v1/subscriptions/{id}) を使う理由:
 * "Get Transaction Info" (GET /inApps/v1/transactions/{id}) が返す
 * JWSTransactionDecodedPayload には status フィールドが存在しない
 * （revocationDate/expiresDate等はあるが、1-5のstatus enumはこちらの
 * lastTransactions[].status にしか無い）。verify-transaction・notifications
 * 双方でこの1つの関数に統一し、ステータス判定ロジックを重複させない。
 */
async function fetchAuthoritativeSubscriptionStatus(env, originalTransactionId) {
  const environment = env.APPLE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const host = APP_STORE_SERVER_API_HOSTS[environment];
  const jwt = await buildAppStoreServerJwt(env);

  const response = await fetch(`${host}/inApps/v1/subscriptions/${originalTransactionId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`App Store Server API の呼び出しに失敗しました: ${response.status} ${body}`);
  }

  const statusResponse = await response.json();
  const lastTransactionItem = findLastTransactionItem(statusResponse, originalTransactionId);
  if (!lastTransactionItem?.signedTransactionInfo) {
    throw new Error("App Store Server API の応答に該当する購読情報がありません。");
  }

  const claims = await verifyAppleSignedPayload(lastTransactionItem.signedTransactionInfo);
  if (!claims?.originalTransactionId) {
    throw new Error("App Store Server API の応答の署名検証に失敗しました。");
  }

  return { claims, status: mapAppleStatus(lastTransactionItem.status) };
}

async function upsertEntitlementFromAppleStatus(db, { claims, status }) {
  const accountId = await upsertAccountByAppleOriginalTransactionId(db, claims.originalTransactionId);
  await upsertAppleEntitlement(db, {
    accountId,
    originalTransactionId: claims.originalTransactionId,
    productId: claims.productId || "",
    status,
    currentPeriodEnd: typeof claims.expiresDate === "number" ? claims.expiresDate : null,
    rawPayload: JSON.stringify({ claims, status }),
  });
  return accountId;
}

/**
 * POST /api/billing/apple/verify-transaction
 * StoreKit 購入直後に、クライアントが受け取った signedTransactionInfo(JWS) から
 * originalTransactionId だけを取り出し（検索キーとして。内容は信頼しない）、
 * fetchAuthoritativeSubscriptionStatus でAppleの権威ある応答（署名検証済み）を
 * 取得してD1を更新する。
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
  const originalTransactionId = clientClaims?.originalTransactionId;
  if (!originalTransactionId) {
    return jsonResponse(400, { ok: false, error: "signedTransactionInfo からoriginalTransactionIdを取得できませんでした。" }, origin);
  }

  if (!env.DB) {
    return jsonResponse(503, { ok: false, error: "DB未設定です。" }, origin);
  }

  try {
    const { claims, status } = await fetchAuthoritativeSubscriptionStatus(env, originalTransactionId);
    const accountId = await upsertEntitlementFromAppleStatus(env.DB, { claims, status });
    await linkDevice(env.DB, deviceId, accountId, "ios");

    return jsonResponse(200, { ok: true, status, originalTransactionId: claims.originalTransactionId }, origin);
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error?.message || "検証処理に失敗しました。" }, origin);
  }
}

/**
 * POST /api/billing/apple/notifications — App Store Server Notifications V2。
 * インターネットに公開された受信専用エンドポイントのため、signedPayload の
 * JWS(x5c chain, Apple Root CA - G3を信頼点)検証を経てからのみ内容を信頼する。
 * 通知の種類（notificationType）ごとの状態遷移を自前で解釈するのではなく、
 * 「何かが起きた」というトリガーとしてのみ扱い、originalTransactionIdを取り出して
 * fetchAuthoritativeSubscriptionStatus でAppleから最新状態を取り直す
 * （verify-transactionと同じ関数・同じ信頼の根拠を使う）。
 */
async function handleNotifications(request, env, origin) {
  if (!isAppleConfigured(env)) {
    return jsonResponse(503, { ok: false, error: "Apple IAP はまだ設定されていません。" }, origin);
  }
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

  // 通知に含まれる signedTransactionInfo は「何のoriginalTransactionIdか」を知るためだけに使う。
  const embeddedTransactionInfo = notification.data?.signedTransactionInfo;
  const triggerClaims =
    typeof embeddedTransactionInfo === "string" ? await verifyAppleSignedPayload(embeddedTransactionInfo) : null;
  const originalTransactionId = triggerClaims?.originalTransactionId;

  if (originalTransactionId) {
    try {
      const authoritative = await fetchAuthoritativeSubscriptionStatus(env, originalTransactionId);
      await upsertEntitlementFromAppleStatus(env.DB, authoritative);
    } catch {
      // Apple API側の一時的な失敗はここでは黙って諦める（次回の通知や定期再検証に委ねる）。
      // 通知そのものへの応答は200のまま返し、Appleの不要なリトライストームを避ける。
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
