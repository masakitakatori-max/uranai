import { corsHeaders, jsonResponse } from "../lib/http.js";
import { signEntitlementToken } from "../lib/entitlementToken.js";
import { findActiveEntitlementForDevice } from "../lib/entitlements.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 24;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "対応していないメソッドです。" }, origin);
    }

    if (!env.DB) {
      return jsonResponse(503, { ok: false, error: "DB未設定です。" }, origin);
    }

    if (!env.AI_FEEDBACK_MEMBER_TOKEN_SECRET) {
      return jsonResponse(503, { ok: false, error: "署名鍵が未設定です。" }, origin);
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

    const entitlement = await findActiveEntitlementForDevice(env.DB, deviceId);
    if (!entitlement) {
      return jsonResponse(200, { ok: false, pending: true }, origin);
    }

    const token = await signEntitlementToken(
      env,
      {
        sub: entitlement.account_id,
        device: deviceId,
        eid: entitlement.entitlement_id,
        source: entitlement.source,
        product: entitlement.product_id,
        status: entitlement.status,
      },
      TOKEN_TTL_SECONDS,
    );

    return jsonResponse(200, { ok: true, token, expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000 }, origin);
  },
};
