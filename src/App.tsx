import { Suspense, lazy, useEffect, useState } from "react";

import "./App.css";
import { RenderErrorBoundary } from "./components/RenderErrorBoundary";
import { withCurrentDateTime } from "./lib/currentDateTime";
import { applyModeSeo, getModeFromPath, getPathForMode, normalizePath } from "./lib/seo";
import type { AppMode, DannekiInput, KingoketsuInput, LiurenInput, QimenInput, TaiitsuInput } from "./lib/types";

const LiurenWorkspace = lazy(async () => {
  const module = await import("./components/workspaces/LiurenWorkspace");
  return { default: module.LiurenWorkspace };
});

const KingoketsuWorkspace = lazy(async () => {
  const module = await import("./components/workspaces/KingoketsuWorkspace");
  return { default: module.KingoketsuWorkspace };
});

const QimenWorkspace = lazy(async () => {
  const module = await import("./components/workspaces/QimenWorkspace");
  return { default: module.QimenWorkspace };
});

const DannekiWorkspace = lazy(async () => {
  const module = await import("./components/workspaces/DannekiWorkspace");
  return { default: module.DannekiWorkspace };
});

const TaiitsuWorkspace = lazy(async () => {
  const module = await import("./components/workspaces/TaiitsuWorkspace");
  return { default: module.TaiitsuWorkspace };
});

const QIMEN_YEAR_RANGE = { start: 2015, end: 2030 } as const;

function createDefaultLiurenInput(): LiurenInput {
  return withCurrentDateTime({
    year: 2006,
    month: 5,
    day: 12,
    hour: 12,
    minute: 0,
    locationId: "akashi",
    topic: "総合",
    questionText: "",
    manualOverrides: {
      dayGanzhi: "",
      monthGeneral: "",
      hourBranch: "",
    },
  });
}

function createDefaultKingoketsuInput(): KingoketsuInput {
  return withCurrentDateTime({
    year: 2016,
    month: 5,
    day: 3,
    hour: 11,
    minute: 40,
    locationId: "tokyo23",
    difen: "丑",
    topic: "総合",
    questionText: "",
    nobleChoice: "陽貴",
    dstMinutes: 0,
  });
}

function clampQimenYear(year: number) {
  return Math.min(Math.max(year, QIMEN_YEAR_RANGE.start), QIMEN_YEAR_RANGE.end);
}

function withCurrentQimenDateTime(input: QimenInput): QimenInput {
  const next = withCurrentDateTime(input);
  return {
    ...next,
    year: clampQimenYear(next.year),
  };
}

function createDefaultQimenInput(): QimenInput {
  return withCurrentQimenDateTime({
    year: 2026,
    month: 4,
    day: 18,
    hour: 12,
    minute: 0,
    locationId: "akashi",
    topic: "総合",
    questionText: "",
    targetDirection: "東",
  });
}

function createDefaultDannekiInput(): DannekiInput {
  return withCurrentDateTime({
    year: 2026,
    month: 4,
    day: 12,
    hour: 15,
    minute: 0,
    locationId: "akashi",
    topic: "総合",
    questionText: "",
    lineInputMode: "auto",
    manualLineValues: null,
  });
}

function createDefaultTaiitsuInput(): TaiitsuInput {
  return withCurrentDateTime({
    year: 2026,
    month: 4,
    day: 16,
    hour: 12,
    minute: 0,
    locationId: "akashi",
    direction: "午",
    startCondition: "time-and-direction",
    topic: "総合",
    questionText: "",
  });
}

const MODE_TITLES: Record<AppMode, string> = {
  liuren: "六壬神課盤 自動作成",
  qimen: "奇門遁甲 四盤作成ツール",
  kingoketsu: "金口訣盤 自動作成",
  danneki: "断易盤 自動作成",
  taiitsu: "太乙神数盤 自動作成",
};

const MODE_LEADS: Record<AppMode, string> = {
  liuren: "地方時差、中気基準の月将、四課、三伝、十二天将、六親を同時に確認するための静的Webアプリです。",
  qimen: "手直し済み原稿の活盤式を土台に、年盤・月盤・日盤・時盤と八方位の吉凶を同時に確認する作盤モードです。",
  kingoketsu: "真太陽時補正、節入り基準の四柱、月将、貴神、将神、人元、用爻を一画面で組み立てるための金口訣モードです。",
  danneki: "コイン法または時刻法で立卦し、京房納甲法で干支・六親・世応・用神を算出。本卦・之卦・動爻を日辰/月建/空亡で読み解く断易モードです。",
  taiitsu: "太乙神数の構造化ルールインデックスを参照し、起局日時・方位・起局条件から太乙神数盤を組み立てるモードです。",
};

const FEATURED_COLUMNS = [
  {
    href: "/uranai-guide/",
    title: "占い入門ガイド",
    summary: "占いの使い方と、結果の受け止め方を最初に整理したい人向け。",
  },
  {
    href: "/tarot-beginner/",
    title: "タロット初心者向け解説",
    summary: "他の占術との違いと、読み進め方の基本を短く確認できます。",
  },
  {
    href: "/reliability-check/",
    title: "占いの信頼性チェック",
    summary: "結果を過信しないための見方と、判断軸の置き方をまとめています。",
  },
  {
    href: "/about/author/",
    title: "著者・監修者プロフィール",
    summary: "記事とアプリの監修方針、運営情報、公開ポリシーを確認できます。",
  },
] as const;

void FEATURED_COLUMNS;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function WorkspaceLoadingFallback() {
  return (
    <section className="panel helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">Workspace Loader</p>
        <h2>盤面を読み込み中</h2>
        <p>モード切り替えに応じて必要なワークスペースだけを読み込んでいます。</p>
      </div>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>(() => getModeFromPath(window.location.pathname));
  const [liurenInput, setLiurenInput] = useState<LiurenInput>(() => createDefaultLiurenInput());
  const [qimenInput, setQimenInput] = useState<QimenInput>(() => createDefaultQimenInput());
  const [kingoketsuInput, setKingoketsuInput] = useState<KingoketsuInput>(() => createDefaultKingoketsuInput());
  const [dannekiInput, setDannekiInput] = useState<DannekiInput>(() => createDefaultDannekiInput());
  const [taiitsuInput, setTaiitsuInput] = useState<TaiitsuInput>(() => createDefaultTaiitsuInput());
  const years = Array.from({ length: 2065 - 1989 + 1 }, (_, index) => 1989 + index);
  const qimenYears = Array.from({ length: QIMEN_YEAR_RANGE.end - QIMEN_YEAR_RANGE.start + 1 }, (_, index) => QIMEN_YEAR_RANGE.start + index);
  const liurenDaysInMonth = getDaysInMonth(liurenInput.year, liurenInput.month);
  const qimenDaysInMonth = getDaysInMonth(qimenInput.year, qimenInput.month);
  const kingoketsuDaysInMonth = getDaysInMonth(kingoketsuInput.year, kingoketsuInput.month);
  const dannekiDaysInMonth = getDaysInMonth(dannekiInput.year, dannekiInput.month);
  const taiitsuDaysInMonth = getDaysInMonth(taiitsuInput.year, taiitsuInput.month);

  useEffect(() => {
    const handlePopState = () => setMode(getModeFromPath(window.location.pathname));

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const normalizedPath = normalizePath(window.location.pathname);
    const expectedPath = getPathForMode(mode);

    if (normalizedPath !== expectedPath) {
      window.history.replaceState({ mode }, "", expectedPath);
    }

    applyModeSeo(mode);
  }, [mode]);

  const handleModeChange = (nextMode: AppMode) => {
    if (nextMode === mode) {
      return;
    }

    const nextPath = getPathForMode(nextMode);

    if (normalizePath(window.location.pathname) !== nextPath) {
      window.history.pushState({ mode: nextMode }, "", nextPath);
    }

    setMode(nextMode);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">作盤ワークスペース</p>
          <h1>{MODE_TITLES[mode]}</h1>
        </div>
        <p className="lead">{MODE_LEADS[mode]}</p>
        <div className="mode-switch" role="tablist" aria-label="作盤モード">
          <button className={mode === "liuren" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("liuren")} type="button">
            六壬神課
          </button>
          <button className={mode === "qimen" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("qimen")} type="button">
            奇門遁甲
          </button>
          <button className={mode === "kingoketsu" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("kingoketsu")} type="button">
            金口訣
          </button>
          <button className={mode === "danneki" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("danneki")} type="button">
            断易
          </button>
          <button className={mode === "taiitsu" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("taiitsu")} type="button">
            太乙神数
          </button>
        </div>
        {mode === "liuren" ? (
          <section className="column-rail" aria-label="関連コラム">
            <div className="column-rail-heading">
              <span>Related Reading</span>
              <strong>六壬神課アプリとあわせて読みたいコラム</strong>
            </div>
            <div className="column-link-grid">
              <a className="column-link-card" href="/columns/">
                <strong>コラム一覧</strong>
                <p>公開中の読みものを一覧で見て、気になるテーマから選べます。</p>
              </a>
              <a className="column-link-card" href="/uranai-guide/">
                <strong>占い入門ガイド</strong>
                <p>最初に押さえる前提と、占いの使い方をまとめた入口ページです。</p>
              </a>
              <a className="column-link-card" href="/uranai-types/">
                <strong>占術タイプ比較</strong>
                <p>タロット、数秘術、夢占いなどの違いを見比べるクラスタページです。</p>
              </a>
            </div>
          </section>
        ) : null}
      </header>

      <main className="workspace-grid">
        {mode === "qimen" ? (
          <Suspense fallback={<WorkspaceLoadingFallback />}>
            <RenderErrorBoundary modeLabel="Qimen">
              <QimenWorkspace
                input={qimenInput}
                daysInMonth={qimenDaysInMonth}
                years={qimenYears}
                onApplyNow={() => setQimenInput((current) => withCurrentQimenDateTime(current))}
                onInputChange={(updater: (draft: QimenInput) => QimenInput) => setQimenInput((current) => updater(current))}
              />
            </RenderErrorBoundary>
          </Suspense>
        ) : null}

        {mode === "liuren" ? (
          <Suspense fallback={<WorkspaceLoadingFallback />}>
            <RenderErrorBoundary modeLabel="Liuren">
              <LiurenWorkspace
                input={liurenInput}
                daysInMonth={liurenDaysInMonth}
                years={years}
                onApplyNow={() => setLiurenInput((current) => withCurrentDateTime(current))}
                onInputChange={(updater: (draft: LiurenInput) => LiurenInput) => setLiurenInput((current) => updater(current))}
              />
            </RenderErrorBoundary>
          </Suspense>
        ) : null}

        {mode === "kingoketsu" ? (
          <Suspense fallback={<WorkspaceLoadingFallback />}>
            <RenderErrorBoundary modeLabel="Kingoketsu">
              <KingoketsuWorkspace
                input={kingoketsuInput}
                daysInMonth={kingoketsuDaysInMonth}
                years={years}
                onApplyNow={() => setKingoketsuInput((current) => withCurrentDateTime(current))}
                onInputChange={(updater: (draft: KingoketsuInput) => KingoketsuInput) => setKingoketsuInput((current) => updater(current))}
              />
            </RenderErrorBoundary>
          </Suspense>
        ) : null}

        {mode === "danneki" ? (
          <Suspense fallback={<WorkspaceLoadingFallback />}>
            <RenderErrorBoundary modeLabel="Danneki">
              <DannekiWorkspace
                input={dannekiInput}
                daysInMonth={dannekiDaysInMonth}
                years={years}
                onApplyNow={() => setDannekiInput((current) => withCurrentDateTime(current))}
                onInputChange={(updater: (draft: DannekiInput) => DannekiInput) => setDannekiInput((current) => updater(current))}
              />
            </RenderErrorBoundary>
          </Suspense>
        ) : null}

        {mode === "taiitsu" ? (
          <Suspense fallback={<WorkspaceLoadingFallback />}>
            <RenderErrorBoundary modeLabel="Taiitsu">
              <TaiitsuWorkspace
                input={taiitsuInput}
                daysInMonth={taiitsuDaysInMonth}
                years={years}
                onApplyNow={() => setTaiitsuInput((current) => withCurrentDateTime(current))}
                onInputChange={(updater: (draft: TaiitsuInput) => TaiitsuInput) => setTaiitsuInput((current) => updater(current))}
              />
            </RenderErrorBoundary>
          </Suspense>
        ) : null}
      </main>

      <footer className="site-footer">
        <p>本ツールは書籍準拠の方式で盤を自動作成します。最終判断は原典と占式でご確認ください。</p>
        <div className="site-footer-links">
          <a href="/terms/" rel="noreferrer" target="_blank">
            利用規約
          </a>
          <a href="/privacy/" rel="noreferrer" target="_blank">
            プライバシーポリシー
          </a>
          <a href="https://github.com/masakitakatori-max/uranai" rel="noreferrer" target="_blank">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
