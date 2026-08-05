// @vitest-environment node
import * as asn1js from "asn1js";
import { AttributeTypeAndValue, Certificate, CryptoEngine, setEngine } from "pkijs";
import { toBase64 as pvutilsToBase64 } from "pvutils";
import { describe, expect, it } from "vitest";

import { verifyAppleSignedPayload } from "./appleJws.js";

setEngine("test-engine", new CryptoEngine({ name: "test", crypto: globalThis.crypto }));

function toBase64(buf) {
  return pvutilsToBase64(String.fromCharCode(...new Uint8Array(buf)));
}

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

async function generateKeyPair() {
  return globalThis.crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
}

async function buildSelfSignedCertificate(keys, commonName) {
  const certificate = new Certificate();
  certificate.version = 2;
  certificate.serialNumber = new asn1js.Integer({ value: 1 });
  const rdn = [new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: commonName }) })];
  certificate.subject.typesAndValues.push(...rdn);
  certificate.issuer.typesAndValues.push(...rdn);
  certificate.notBefore.value = new Date();
  certificate.notAfter.value = new Date();
  certificate.notAfter.value.setFullYear(certificate.notAfter.value.getFullYear() + 1);
  certificate.extensions = [];
  await certificate.subjectPublicKeyInfo.importKey(keys.publicKey);
  await certificate.sign(keys.privateKey, "SHA-256");
  return certificate;
}

/** Appleではない、テスト用の自己署名証明書チェーンで JWS を組み立てる（不正なx5cのシミュレーション）。 */
async function buildUntrustedJws(payload) {
  const keys = await generateKeyPair();
  const certificate = await buildSelfSignedCertificate(keys, "not-apple.test");
  const certB64 = toBase64(certificate.toSchema(true).toBER(false));

  const header = { alg: "ES256", x5c: [certB64] };
  const encoder = new TextEncoder();
  const signingInput = `${b64url(encoder.encode(JSON.stringify(header)))}.${b64url(encoder.encode(JSON.stringify(payload)))}`;
  const signature = await globalThis.crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, encoder.encode(signingInput));
  return `${signingInput}.${b64url(signature)}`;
}

describe("verifyAppleSignedPayload — fail-closed behavior", () => {
  it("rejects a well-formed JWS whose x5c chain does not trace to Apple's real root", async () => {
    const jws = await buildUntrustedJws({ originalTransactionId: "spoofed" });
    const result = await verifyAppleSignedPayload(jws);
    expect(result).toBeNull();
  });

  it("rejects malformed input without throwing", async () => {
    await expect(verifyAppleSignedPayload("not-a-jws")).resolves.toBeNull();
    await expect(verifyAppleSignedPayload("")).resolves.toBeNull();
    await expect(verifyAppleSignedPayload("a.b.c")).resolves.toBeNull();
    await expect(verifyAppleSignedPayload(null)).resolves.toBeNull();
  });

  it("rejects a JWS with no x5c header at all", async () => {
    const header = { alg: "ES256" };
    const encoder = new TextEncoder();
    const signingInput = `${b64url(encoder.encode(JSON.stringify(header)))}.${b64url(encoder.encode(JSON.stringify({ a: 1 })))}`;
    const jws = `${signingInput}.${b64url(encoder.encode("fake-signature"))}`;
    await expect(verifyAppleSignedPayload(jws)).resolves.toBeNull();
  });
});
