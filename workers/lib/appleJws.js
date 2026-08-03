import { fromBER } from "asn1js";
import { Certificate, CertificateChainValidationEngine, CryptoEngine, setEngine } from "pkijs";
import { fromBase64 } from "pvutils";

/**
 * Apple Root CA - G3（自己署名ルート、有効期限 2039-04-30）。
 * https://www.apple.com/certificateauthority/ の公開証明書をそのままbase64 DER化したもの。
 * App Store Server API / Server Notifications V2 の signedTransactionInfo / signedPayload の
 * x5c チェーンは、最終的にこのルートに到達する必要がある。
 */
const APPLE_ROOT_CA_G3_B64 =
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";

let engineInitialized = false;

/**
 * Cloudflare Workers には node:crypto の X509Certificate がポリフィルされておらず
 * （nodejs_compat でも未対応）、Apple公式のapp-store-server-libraryはそれに依存するため
 * そのままでは動かない。pkijsはWebCrypto（globalThis.crypto）のみに依存する純JS実装で、
 * Workers/ブラウザ双方で動作する。ここで一度だけエンジンを登録する。
 */
function ensureEngine() {
  if (engineInitialized) {
    return;
  }
  setEngine("workersEngine", new CryptoEngine({ name: "workers", crypto: globalThis.crypto }));
  engineInitialized = true;
}

function base64ToArrayBuffer(b64) {
  const binary = fromBase64(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function parseCertificateFromB64(b64) {
  const der = base64ToArrayBuffer(b64);
  const asn1 = fromBER(der);
  if (asn1.result.error) {
    throw new Error(`証明書のASN.1解析に失敗しました: ${asn1.result.error}`);
  }
  return new Certificate({ schema: asn1.result });
}

function base64UrlToArrayBuffer(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(b64url.length + ((4 - (b64url.length % 4)) % 4), "=");
  return base64ToArrayBuffer(b64);
}

async function verifySignatureWithCertificate(signingInput, signatureB64Url, certificate) {
  const spki = certificate.subjectPublicKeyInfo.toSchema().toBER(false);
  const publicKey = await globalThis.crypto.subtle.importKey(
    "spki",
    spki,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
  const signature = base64UrlToArrayBuffer(signatureB64Url);
  const data = new TextEncoder().encode(signingInput);
  return globalThis.crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, data);
}

/**
 * App Store Server API / Server Notifications V2 の signedTransactionInfo・signedRenewalInfo・
 * signedPayload（いずれもJWS、ES256、x5cヘッダ付き）を検証し、ペイロードを返す。
 *
 * 検証内容: (1) x5c の各証明書をパース (2) 先頭(leaf)以外を中間証明書として、
 * Apple Root CA - G3 を信頼点にチェーン検証 (3) leafの公開鍵でJWS署名を検証。
 * いずれかに失敗した場合は null を返す（呼び出し側はペイロードを一切信用しないこと）。
 *
 * @param {string} jws - "header.payload.signature" 形式のコンパクトJWS
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function verifyAppleSignedPayload(jws) {
  ensureEngine();

  const parts = String(jws || "").split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToArrayBuffer(headerB64)));
  } catch {
    return null;
  }

  const x5c = Array.isArray(header?.x5c) ? header.x5c : null;
  if (!x5c || x5c.length === 0) {
    return null;
  }

  let certs;
  try {
    certs = x5c.map((certB64) => parseCertificateFromB64(certB64));
  } catch {
    return null;
  }

  const [leafCertificate] = certs;
  const trustedRoot = parseCertificateFromB64(APPLE_ROOT_CA_G3_B64);

  const chainEngine = new CertificateChainValidationEngine({
    trustedCerts: [trustedRoot],
    certs,
  });

  let chainResult;
  try {
    chainResult = await chainEngine.verify();
  } catch {
    return null;
  }
  if (!chainResult.result) {
    return null;
  }

  let signatureValid;
  try {
    signatureValid = await verifySignatureWithCertificate(`${headerB64}.${payloadB64}`, signatureB64, leafCertificate);
  } catch {
    return null;
  }
  if (!signatureValid) {
    return null;
  }

  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToArrayBuffer(payloadB64)));
  } catch {
    return null;
  }
}

export const __testing = { APPLE_ROOT_CA_G3_B64, base64ToArrayBuffer };
