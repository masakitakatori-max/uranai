import { LOCATION_OFFSETS } from "../../lib/engine";
import type { MobileDefaults } from "../storage";

interface SettingsScreenProps {
  defaults: MobileDefaults;
  onUpdateDefaults: (next: MobileDefaults) => void;
}

export function SettingsScreen({ defaults, onUpdateDefaults }: SettingsScreenProps) {
  return (
    <div className="screen settings-screen">
      <h1 className="mincho screen-title">設定</h1>

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
