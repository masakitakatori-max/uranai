import { Capacitor } from "@capacitor/core";

/**
 * Apple Guideline 3.1.1/3.1.3: iOS ネイティブアプリ内では、AI解説（アプリ内デジタルコンテンツ）の
 * 購入導線に外部決済（Stripe）を露出させない。Web版はStripeのまま。
 */
export function isIosNative() {
  return Capacitor.getPlatform() === "ios";
}
