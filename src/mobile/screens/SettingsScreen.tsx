import { useEffect, useState } from "react";

import { getAiFeedbackClientConfig, getEntitlementToken } from "../../lib/aiFeedback";
import { LOCATION_OFFSETS } from "../../lib/engine";
import { isIosNative } from "../platform";
import { StoreKit } from "../storekit";
import type { MobileDefaults } from "../storage";

interface SettingsScreenProps {
  defaults: MobileDefaults;
  onUpdateDefaults: (next: MobileDefaults) => void;
  onOpenPaywall: () => void;
  entitlementVersion: number;
}

export function SettingsScreen({ defaults, onUpdateDefaults, onOpenPaywall, entitlementVersion }: SettingsScreenProps) {
  const clientConfig = getAiFeedbackClientConfig();
  const requiresEntitlement = clientConfig.gateMode === "paid";
  const [isEntitled, setIsEntitled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!requiresEntitlement) {
      return;
    }
    let cancelled = false;
    getEntitlementToken().then((token) => {
      if (!cancelled) {
        setIsEntitled(Boolean(token));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [requiresEntitlement, entitlementVersion]);

  async function handleManageSubscriptions() {
    try {
      await StoreKit.manageSubscriptions();
    } catch {
      // ユーザー操作でのキャンセル等は無視する
    }
  }

  return (
    <div className="screen settings-screen">
      <h1 className="mincho screen-title">設定</h1>

      {requiresEntitlement ? (
        <section className="record-group" aria-label="AI解説パス">
          <p className="record-group-label">AI解説パス</p>
          <div className="settings-group">
            <div className="sheet-row">
              <span>状態</span>
              <span className={isEntitled ? "pill pill-high" : "pill pill-neutral"}>
                {isEntitled ? "有効" : "未購読"}
              </span>
            </div>
            {isEntitled ? (
              isIosNative() ? (
                <button type="button" className="sheet-row sheet-link" onClick={handleManageSubscriptions}>
                  <span>サブスクリプションを管理</span>
                  <span className="reading-chevron">›</span>
                </button>
              ) : null
            ) : (
              <button type="button" className="sheet-row sheet-link" onClick={onOpenPaywall}>
                <span>AI解説パスを購入</span>
                <span className="reading-chevron">›</span>
              </button>
            )}
          </div>
        </section>
      ) : null}

      <section className="record-group" aria-label="作盤の既定値">
        <p className="record-group-label">作盤の既定値</p>
        <div className="settings-group">
          <label className="sheet-row">
            <span>既定の地点</span>
            <select
              value={defaults.locationId}
              onChange={(event) => onUpdateDefaults({ ...defaults, locationId: event.target.value })}
            >
              {LOCATION_OFFSETS.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="record-group" aria-label="表示">
        <p className="record-group-label">表示</p>
        <div className="settings-group">
          <div className="sheet-row">
            <span>文字サイズ</span>
            <div className="segment-control segment-inline">
              <button
                type="button"
                className={defaults.textScale === "standard" ? "segment is-active" : "segment"}
                onClick={() => onUpdateDefaults({ ...defaults, textScale: "standard" })}
              >
                標準
              </button>
              <button
                type="button"
                className={defaults.textScale === "large" ? "segment is-active" : "segment"}
                onClick={() => onUpdateDefaults({ ...defaults, textScale: "large" })}
              >
                大きめ
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="record-group" aria-label="その他">
        <p className="record-group-label">その他</p>
        <div className="settings-group">
          <a className="sheet-row sheet-link" href="https://uranai.mozule.co.jp/terms/" rel="noreferrer" target="_blank">
            <span>利用規約</span>
            <span className="reading-chevron">›</span>
          </a>
          <a className="sheet-row sheet-link" href="https://uranai.mozule.co.jp/privacy/" rel="noreferrer" target="_blank">
            <span>プライバシーポリシー</span>
            <span className="reading-chevron">›</span>
          </a>
        </div>
      </section>

      <p className="settings-footer">占術ワークスペース ・ jp.co.mozule.uranai</p>
    </div>
  );
}
