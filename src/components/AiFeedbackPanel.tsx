import type { DannekiChart, KingoketsuChart, LiurenChart } from "../lib/types";

type AiFeedbackPanelProps =
  | { mode: "liuren"; chart: LiurenChart }
  | { mode: "kingoketsu"; chart: KingoketsuChart }
  | { mode: "danneki"; chart: DannekiChart };

export function AiFeedbackPanel(_props: AiFeedbackPanelProps) {
  return (
    <section className="panel helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">AI 解説</p>
        <h2>準備中</h2>
        <p>AI 解説機能は現在整備中です。盤面と trace を参考にご判断ください。</p>
      </div>
    </section>
  );
}
