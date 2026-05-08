import { useEffect, useState } from "react";
import { fetchAiSession, fetchAiSessions } from "../lib/aiFeedback";
import type { AiSessionDetail, AiSessionSummary } from "../lib/aiFeedback";
import type { AppMode } from "../lib/types";

const MODE_LABELS: Record<string, string> = {
  liuren: "六壬神課",
  qimen: "奇門遁甲",
  kingoketsu: "金口訣",
  danneki: "断易",
  taiitsu: "太乙神数",
  sansiki: "三式統合",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function getStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => getString(x)).filter(Boolean) : [];
}

function FeedbackList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div className="ai-results-block">
      <h4>{title}</h4>
      <ul className="ai-feedback-list">
        {items.map((item, i) => <li className="annotation-item" key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

function SessionDetail({ session, onClose }: { session: AiSessionDetail; onClose: () => void }) {
  const fb = session.feedback as unknown as Record<string, unknown>;
  return (
    <div className="session-detail">
      <div className="session-detail-header">
        <div>
          <strong>{MODE_LABELS[session.mode] ?? session.mode}</strong>
          <span className="session-meta"> / {session.topic} / {formatDate(session.createdAt)}</span>
        </div>
        <button className="utility-button" onClick={onClose} type="button">✕ 閉じる</button>
      </div>
      <p className="session-question">{session.questionText}</p>
      {getString(fb.overview) ? (
        <div className="ai-results-block">
          <h4>概要</h4>
          <p>{getString(fb.overview)}</p>
          {getString(fb.confidence) ? <p><strong>信頼度:</strong> {getString(fb.confidence)}</p> : null}
        </div>
      ) : null}
      <FeedbackList items={getStringArray(fb.keySignals)} title="主要シグナル" />
      <FeedbackList items={getStringArray(fb.cautions)} title="注意点" />
      <FeedbackList items={getStringArray(fb.nextActions)} title="次に見る観点" />
      <FeedbackList items={getStringArray(fb.followUpQuestions)} title="追加確認質問" />
      {getString(fb.disclaimer) ? (
        <div className="ai-empty-state"><strong>免責:</strong> {getString(fb.disclaimer)}</div>
      ) : null}
      <p className="session-meta">Model: {session.model}</p>
    </div>
  );
}

interface Props {
  currentMode: AppMode;
}

export function AiSessionHistoryPanel({ currentMode }: Props) {
  const [filterMode, setFilterMode] = useState<string>(currentMode);
  const [sessions, setSessions] = useState<AiSessionSummary[]>([]);
  const [selected, setSelected] = useState<AiSessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setFilterMode(currentMode);
  }, [currentMode]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setOffset(0);
    setSelected(null);
    fetchAiSessions(filterMode, 0).then((list) => {
      if (!cancelled) {
        setSessions(list);
        setHasMore(list.length === 20);
        setIsLoading(false);
      }
    }).catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [filterMode]);

  async function loadMore() {
    const nextOffset = offset + 20;
    const more = await fetchAiSessions(filterMode, nextOffset);
    setSessions((prev) => [...prev, ...more]);
    setOffset(nextOffset);
    setHasMore(more.length === 20);
  }

  async function handleSelect(id: string) {
    setIsLoadingDetail(true);
    const detail = await fetchAiSession(id);
    setSelected(detail);
    setIsLoadingDetail(false);
  }

  const modes = ["all", "liuren", "qimen", "kingoketsu", "danneki", "taiitsu", "sansiki"];

  return (
    <section className="panel ai-feedback-panel">
      <div className="panel-heading">
        <p className="eyebrow">履歴</p>
        <h2>AI解説履歴</h2>
        <p>過去に生成したAI解説を参照できます。</p>
      </div>

      <div className="session-filter">
        {modes.map((m) => (
          <button
            key={m}
            className={filterMode === m || (m === "all" && filterMode === currentMode && !modes.slice(1).includes(filterMode)) ? "mode-button is-active" : "mode-button"}
            style={{ fontSize: "0.8em", padding: "4px 10px" }}
            onClick={() => setFilterMode(m)}
            type="button"
          >
            {m === "all" ? "すべて" : MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="ai-empty-state">読み込み中...</div>
      ) : sessions.length === 0 ? (
        <div className="ai-empty-state">履歴がありません。AI解説を生成すると自動保存されます。</div>
      ) : (
        <div className="session-list">
          {sessions.map((s) => (
            <button
              key={s.id}
              className="session-item"
              onClick={() => handleSelect(s.id)}
              type="button"
            >
              <span className="session-mode-badge">{MODE_LABELS[s.mode] ?? s.mode}</span>
              <span className="session-topic">{s.topic}</span>
              <span className="session-question-preview">{s.questionText.slice(0, 40)}{s.questionText.length > 40 ? "…" : ""}</span>
              <span className="session-date">{formatDate(s.createdAt)}</span>
            </button>
          ))}
          {hasMore ? (
            <button className="utility-button" onClick={loadMore} type="button">さらに読み込む</button>
          ) : null}
        </div>
      )}

      {isLoadingDetail ? (
        <div className="ai-empty-state">詳細を読み込み中...</div>
      ) : selected ? (
        <SessionDetail session={selected} onClose={() => setSelected(null)} />
      ) : null}
    </section>
  );
}
