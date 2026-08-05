// @vitest-environment node
import { describe, expect, it } from "vitest";

import { signEntitlementToken, verifyEntitlementToken } from "./entitlementToken.js";

const TEST_ENV = { AI_FEEDBACK_MEMBER_TOKEN_SECRET: "test-secret-at-least-32-characters-long" };

describe("entitlement token", () => {
  it("signs and verifies a round trip", async () => {
    const token = await signEntitlementToken(TEST_ENV, { sub: "acct-1", status: "active" }, 60);
    const claims = await verifyEntitlementToken(TEST_ENV, token);

    expect(claims).not.toBeNull();
    expect(claims.sub).toBe("acct-1");
    expect(claims.status).toBe("active");
  });

  it("rejects an expired token", async () => {
    const token = await signEntitlementToken(TEST_ENV, { sub: "acct-1", status: "active" }, -1);
    const claims = await verifyEntitlementToken(TEST_ENV, token);

    expect(claims).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signEntitlementToken(TEST_ENV, { sub: "acct-1", status: "active" }, 60);
    const claims = await verifyEntitlementToken({ AI_FEEDBACK_MEMBER_TOKEN_SECRET: "a-completely-different-secret-value" }, token);

    expect(claims).toBeNull();
  });

  it("throws when the signing secret is missing", async () => {
    await expect(signEntitlementToken({}, { sub: "acct-1" }, 60)).rejects.toThrow();
  });
});
