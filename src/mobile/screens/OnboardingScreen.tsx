import { useState } from "react";

const GOALS = [
  { glyph: "壬", title: "出来事の行方を読む", detail: "六壬神課 ・ 四課三伝", available: true },
  { glyph: "遁", title: "動く方角を決める", detail: "奇門遁甲 ・ 九宮八門", available: false },
  { glyph: "易", title: "是か非かを判じる", detail: "断易 ・ 用神と世応", available: false },
  { glyph: "金", title: "今この場から占う", detail: "金口訣 ・ 地分と月将", available: false },
  { glyph: "乙", title: "大きな流れを俯瞰する", detail: "太乙神数 ・ 局と方位", available: false },
  { glyph: "三", title: "五術をまとめて照合する", detail: "三式統合 ・ 横断解釈", available: false },
] as const;

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="screen onboarding-screen">
      <header className="onboarding-header">
        <p className="eyebrow-label">はじめに</p>
        <h1 className="mincho">何を知りたいですか</h1>
        <p className="screen-lead">術ではなく目的から選べます。あとから切り替えもできます。</p>
      </header>
      <div className="goal-list" role="radiogroup" aria-label="占う目的">
        {GOALS.map((goal, index) => (
          <button
            key={goal.glyph}
            type="button"
            role="radio"
            aria-checked={selected === index}
            className={selected === index ? "goal-card is-selected" : "goal-card"}
            disabled={!goal.available}
            onClick={() => setSelected(index)}
          >
            <span className="goal-glyph mincho">{goal.glyph}</span>
            <span className="goal-text">
              <span className="goal-title">{goal.title}</span>
              <span className="goal-detail">
                {goal.detail}
                {goal.available ? "" : " ・ 近日対応"}
              </span>
            </span>
            {selected === index ? <span className="goal-check">✓</span> : null}
          </button>
        ))}
      </div>
      <footer className="onboarding-footer">
        <button type="button" className="primary-button" onClick={onComplete}>
          続ける
        </button>
      </footer>
    </div>
  );
}
