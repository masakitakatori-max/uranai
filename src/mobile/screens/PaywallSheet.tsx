import { useEffect, useState } from "react";

import { createStripeCheckoutSession, fetchEntitlementToken, verifyAppleTransaction } from "../../lib/aiFeedback";
import { isIosNative } from "../platform";
import { StoreKit } from "../storekit";

const APPLE_PRODUCT_ID = "jp.co.mozule.uranai.aicommentary.monthly";
const DEFAULT_PRICE_LABEL = "480円 / 月";

interface PaywallSheetProps {
  onClose: () => void;
  onEntitled: () => void;
}

export function PaywallSheet({ onClose, onEntitled }: PaywallSheetProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceLabel, setPriceLabel] = useState(DEFAULT_PRICE_LABEL);

  useEffect(() => {
    if (!isIosNative()) {
      return;
    }
    StoreKit.getProducts({ productIds: [APPLE_PRODUCT_ID] })
      .then((result) => {
        const product = result.products[0];
        if (product) {
          setPriceLabel(`${product.displayPrice} / 月`);
        }
      })
      .catch(() => {
        // ローカル/Sandboxで商品未設定の場合は既定表示のまま
      });
  }, []);

  async function finishWithAppleTransaction(signedTransactionInfo: string) {
    const verification = await verifyAppleTransaction(signedTransactionInfo);
    if (!verification.ok) {
      setError(verification.error || "購入の検証に失敗しました。");
      return;
    }
    await fetchEntitlementToken();
    onEntitled();
  }

  async function handlePurchase() {
    setIsBusy(true);
    setError(null);
    try {
      if (isIosNative()) {
        const result = await StoreKit.purchase({ productId: APPLE_PRODUCT_ID });
        if (result.status === "success" && result.transaction) {
          await finishWithAppleTransaction(result.transaction.signedTransactionInfo);
          return;
        }
        if (result.status === "cancelled") {
          return;
        }
        setError("購入処理が完了しませんでした。しばらくしてからもう一度お試しください。");
        return;
      }

      const session = await createStripeCheckoutSession();
      if (session.ok && session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
        return;
      }
      setError(session.error || "購入手続きを開始できませんでした。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "購入に失敗しました。");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestore() {
    setIsBusy(true);
    setError(null);
    try {
      const result = await StoreKit.restorePurchases();
      const transaction = result.transactions[0];
      if (!transaction) {
        setError("復元できる購入が見つかりませんでした。");
        return;
      }
      await finishWithAppleTransaction(transaction.signedTransactionInfo);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "復元に失敗しました。");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="AI解説パス">
      <button type="button" className="sheet-dismiss" aria-label="閉じる" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grabber" />
        <div className="sheet-heading">
          <h2 className="mincho">AI解説パス</h2>
        </div>
        <p className="screen-lead">盤面・相談文をもとにしたAI解説を無制限に利用できます。</p>
        <div className="board-digest-item">
          <span className="board-digest-title">{priceLabel}</span>
          <p className="board-digest-text">いつでも解約できます。</p>
        </div>

        {error ? (
          <div className="warning-banner" role="alert">
            {error}
          </div>
        ) : null}

        <button type="button" className="primary-button" disabled={isBusy} onClick={handlePurchase}>
          {isBusy ? "処理中…" : "購入する"}
        </button>
        {isIosNative() ? (
          <button type="button" className="secondary-button" disabled={isBusy} onClick={handleRestore}>
            購入を復元
          </button>
        ) : null}
      </div>
    </div>
  );
}
