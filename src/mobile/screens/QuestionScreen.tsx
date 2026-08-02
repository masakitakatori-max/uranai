import { LOCATION_OFFSETS } from "../../lib/engine";
import type { LiurenTopic } from "../../lib/types";
import type { ConditionsDraft } from "../MobileApp";

const TOPIC_OPTIONS: readonly LiurenTopic[] = ["総合", "仕事", "金運", "恋愛", "結婚", "健康", "失せ物", "天気"];

interface QuestionScreenProps {
  question: string;
  activeTopic: LiurenTopic;
  inferredTopic: LiurenTopic;
  onQuestionChange: (value: string) => void;
  onTopicSelect: (topic: LiurenTopic) => void;
  onBack: () => void;
  onProceed: () => void;
}

export function QuestionScreen({
  question,
  activeTopic,
  inferredTopic,
  onQuestionChange,
  onTopicSelect,
  onBack,
  onProceed,
}: QuestionScreenProps) {
  return (
    <div className="screen flow-screen">
      <nav className="flow-nav">
        <button type="button" className="nav-button" onClick={onBack}>
          ‹ 戻る
        </button>
        <span className="nav-title">相談内容</span>
        <button type="button" className="nav-button nav-button-sub" onClick={onProceed}>
          省略
        </button>
      </nav>

      <div className="flow-body">
        <div className="question-card">
          <textarea
            className="question-input mincho"
            value={question}
            placeholder="占いたい事柄を自由に入力。内容から近い占的へ解釈を寄せます。"
            onChange={(event) => onQuestionChange(event.target.value)}
            rows={4}
          />
        </div>

        <div className="topic-block">
          <p className="field-label">推定された占的</p>
          <div className="chip-row">
            {TOPIC_OPTIONS.map((topic) => (
              <button
                key={topic}
                type="button"
                className={activeTopic === topic ? "chip is-selected" : "chip"}
                onClick={() => onTopicSelect(topic)}
              >
                {topic}
                {activeTopic === topic && inferredTopic === topic && question.trim() ? " ✓" : ""}
              </button>
            ))}
          </div>
          <p className="field-note">占的は解釈の重みづけにのみ使われ、盤の算出は変わりません。</p>
        </div>
      </div>

      <footer className="flow-footer">
        <button type="button" className="primary-button" onClick={onProceed}>
          この内容で起局
        </button>
      </footer>
    </div>
  );
}

interface ConditionsSheetProps {
  conditions: ConditionsDraft;
  onChange: (next: ConditionsDraft) => void;
  onClose: () => void;
  onCast: () => void;
}

export function ConditionsSheet({ conditions, onChange, onClose, onCast }: ConditionsSheetProps) {
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="起局条件">
      <button type="button" className="sheet-dismiss" aria-label="閉じる" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grabber" />
        <div className="sheet-heading">
          <h2 className="mincho">起局条件</h2>
          <button
            type="button"
            className="nav-button nav-button-sub"
            onClick={() =>
              onChange({ ...conditions, mode: "now" })
            }
          >
            既定に戻す
          </button>
        </div>

        <div className="segment-control" role="tablist" aria-label="日時の指定方法">
          <button
            type="button"
            className={conditions.mode === "now" ? "segment is-active" : "segment"}
            onClick={() => onChange({ ...conditions, mode: "now" })}
          >
            現在時刻
          </button>
          <button
            type="button"
            className={conditions.mode === "manual" ? "segment is-active" : "segment"}
            onClick={() => onChange({ ...conditions, mode: "manual" })}
          >
            日時を指定
          </button>
        </div>

        {conditions.mode === "manual" ? (
          <div className="field-columns">
            <label className="field-card">
              <span className="field-label">日付</span>
              <input
                type="date"
                value={conditions.date}
                onChange={(event) => onChange({ ...conditions, date: event.target.value })}
              />
            </label>
            <label className="field-card">
              <span className="field-label">時刻</span>
              <input
                type="time"
                value={conditions.time}
                onChange={(event) => onChange({ ...conditions, time: event.target.value })}
              />
            </label>
          </div>
        ) : null}

        <div className="sheet-list">
          <label className="sheet-row">
            <span>地点</span>
            <select
              value={conditions.locationId}
              onChange={(event) => onChange({ ...conditions, locationId: event.target.value })}
            >
              {LOCATION_OFFSETS.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}（{location.offsetMinutes >= 0 ? "+" : "−"}
                  {Math.abs(location.offsetMinutes)}分）
                </option>
              ))}
            </select>
          </label>
          <p className="field-note">地方時差を補正した時刻を基準に、日干支・月将・占時を決定します。</p>
        </div>

        <button type="button" className="primary-button" onClick={onCast}>
          起局する
        </button>
      </div>
    </div>
  );
}
