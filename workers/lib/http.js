const ALLOWED_ORIGIN = "https://uranai.mozule.co.jp";

export function corsHeaders(origin) {
  const allowed =
    origin === ALLOWED_ORIGIN ||
    origin === "capacitor://localhost" ||
    (origin && origin.startsWith("http://localhost")) ||
    (origin && origin.startsWith("http://127.0.0.1"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function jsonResponse(statusCode, payload, origin) {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}
