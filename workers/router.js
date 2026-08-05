import aiFeedbackWorker from "./ai-feedback.js";
import billingAppleWorker from "./routes/billingApple.js";
import billingStripeWorker from "./routes/billingStripe.js";
import entitlementWorker from "./routes/entitlement.js";
import { corsHeaders } from "./lib/http.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/api/entitlement/token") {
      return entitlementWorker.fetch(request, env, ctx);
    }

    if (url.pathname.startsWith("/api/billing/stripe/")) {
      return billingStripeWorker.fetch(request, env, ctx);
    }

    if (url.pathname.startsWith("/api/billing/apple/")) {
      return billingAppleWorker.fetch(request, env, ctx);
    }

    return aiFeedbackWorker.fetch(request, env, ctx);
  },
};
