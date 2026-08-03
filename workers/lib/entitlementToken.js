import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";

function getSecretKey(env) {
  const secret = env.AI_FEEDBACK_MEMBER_TOKEN_SECRET;
  if (!secret) {
    throw new Error("AI_FEEDBACK_MEMBER_TOKEN_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function signEntitlementToken(env, claims, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(getSecretKey(env));
}

export async function verifyEntitlementToken(env, token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(env));
    return payload;
  } catch {
    return null;
  }
}
