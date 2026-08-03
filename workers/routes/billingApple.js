import { SignJWT, importPKCS8 } from "jose";

import { corsHeaders, jsonResponse } from "../lib/http.js";
import { linkDevice, upsertAccountByAppleOriginalTransactionId, upsertAppleEntitlement } from "../lib/entitlements.js";

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

/**
 * POST /api/billing/apple/verify-transaction
 * StoreKit 購入直後に、クライアントが受け取った signedTransactionInfo(JWS) の
 * originalTransactionId を使って App Store Server API へ直接問い合わせ、
 * Appleから返る最新の権威あるステータスでD1を更新する。
 *
 * 注意（既知の未解決事項・plan参照）: Appleのレスポンス自体もJWS署名されているが、
 * ここではペイロードのbase64url decodeのみ行い、x5c証明書チェーンの署名検証は
 * 行っていない。信頼の根拠は「Appleの実サーバーへ直接HTTPS接続して得た応答」という
 * 点のみ（transport trust）。フル検証（pkijs等によるx5c chain-of-trust）は
 * 別途実装が必要 — 詳細はプロジェクトのbilling設計docを参照。
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
    const claims = decodeJwsPayload(authoritativeJws);
    if (!claims?.originalTransactionId) {
      return jsonResponse(502, { ok: false, error: "App Store Server API の応答を解析できませんでした。" }, origin);
    }

    if (!env.DB) {
      return jsonResponse(503, { ok: false, error: "DB未設定です。" }, origin);
    }

    const status = mapAppleStatus(claims.subscriptionStatus ?? claims.status);
    const accountId = await upsertAccountByAppleOriginalTransactionId(env.DB, claims.originalTransactionId);
    await linkDevice(env.DB, deviceId, accountId, "ios");
    await upsertAppleEntitlement(env.DB, {
      accountId,
      originalTransactionId: claims.originalTransactionId,
      productId: claims.productId || "",
      status,
      currentPeriodEnd: typeof claims.expiresDate === "number" ? claims.expiresDate : null,
      rawPayload: JSON.stringify(claims),
    });

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
 * インターネットに公開された受信専用エンドポイントのため、なりすまし防止に
 * signedPayload のJWS(x5c chain)検証が必須。pkijs によるchain-of-trust検証が
 * 未実装のため、安全側に倒してここでは何も信頼せず501を返す。
 */
async function handleNotifications(request, env, origin) {
  return jsonResponse(501, {
    ok: false,
    error: "Apple Server Notifications はJWS署名検証（pkijs実装）待ちのため未対応です。",
  }, origin);
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
