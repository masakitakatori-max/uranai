import { registerPlugin } from "@capacitor/core";

export interface StoreKitProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
}

export interface StoreKitTransaction {
  productId: string;
  originalTransactionId: string;
  transactionId: string;
  purchaseDate: number;
  expirationDate: number | null;
  /** サーバー側の署名検証（App Store Server API）に渡す生の JWS。 */
  signedTransactionInfo: string;
}

export type StoreKitPurchaseStatus = "success" | "cancelled" | "pending" | "unknown";

export interface StoreKitPurchaseResult {
  status: StoreKitPurchaseStatus;
  transaction?: StoreKitTransaction;
}

export interface StoreKitPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchase(options: { productId: string }): Promise<StoreKitPurchaseResult>;
  restorePurchases(): Promise<{ transactions: StoreKitTransaction[] }>;
  getCurrentEntitlements(): Promise<{ transactions: StoreKitTransaction[] }>;
  manageSubscriptions(): Promise<void>;
}

/**
 * ネイティブ実装は ios/App/App/Plugins/StoreKitPlugin.swift。
 * Web/Android には未対応（このアプリは iOS ネイティブのみを対象とする方針）のため、
 * すべて拒否するスタブを web 実装として登録する。
 */
export const StoreKit = registerPlugin<StoreKitPlugin>("StoreKitPlugin", {
  web: () =>
    Promise.resolve({
      async getProducts() {
        throw new Error("StoreKit is only available on iOS native builds.");
      },
      async purchase() {
        throw new Error("StoreKit is only available on iOS native builds.");
      },
      async restorePurchases() {
        throw new Error("StoreKit is only available on iOS native builds.");
      },
      async getCurrentEntitlements() {
        throw new Error("StoreKit is only available on iOS native builds.");
      },
      async manageSubscriptions() {
        throw new Error("StoreKit is only available on iOS native builds.");
      },
    } satisfies StoreKitPlugin),
});
