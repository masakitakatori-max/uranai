import { useEffect, useState } from "react";

import "./App.css";
import { AiFeedbackPanel } from "./components/AiFeedbackPanel";
import { BoardView } from "./components/BoardView";
import { DannekiBoardView } from "./components/DannekiBoardView";
import { DannekiHelperPanel } from "./components/DannekiHelperPanel";
import { DannekiInputPanel } from "./components/DannekiInputPanel";
import { HelperPanel } from "./components/HelperPanel";
import { InputPanel } from "./components/InputPanel";
import { KingoketsuBoardView } from "./components/KingoketsuBoardView";
import { KingoketsuHelperPanel } from "./components/KingoketsuHelperPanel";
import { KingoketsuInputPanel } from "./components/KingoketsuInputPanel";
import { withCurrentDateTime } from "./lib/currentDateTime";
import { buildDannekiChart } from "./lib/danneki";
import { GANZHI_CYCLE, LOCATION_OFFSETS, buildLiurenChart } from "./lib/engine";
import { buildKingoketsuChart } from "./lib/kingoketsu";
import { applyModeSeo, getModeFromPath, getPathForMode, normalizePath } from "./lib/seo";
import type { AppMode, DannekiInput, KingoketsuInput, LiurenInput } from "./lib/types";

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
  });
}

const MODE_TITLES: Record<AppMode, string> = {
  liuren: "六壬神課盤 自動作成",
  kingoketsu: "金口訣盤 自動作成",
  danneki: "断易モード 試作",
};

const MODE_LEADS: Record<AppMode, string> = {
  liuren: "地方時差、中気基準の月将、四課、三伝、十二天将、六親を同時に確認するための静的Webアプリです。",
  kingoketsu: "真太陽時補正、節入り基準の四柱、月将、貴神、将神、人元、用爻を一画面で組み立てるための金口訣モードです。",
  danneki: "占いたい事象を定性的に入力し、解釈軸を自動補強しながら、本卦・之卦・動爻をもとに読み筋を返す断易の試作モードです。",
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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function App() {
  const [mode, setMode] = useState<AppMode>(() => getModeFromPath(window.location.pathname));
  const [liurenInput, setLiurenInput] = useState<LiurenInput>(() => createDefaultLiurenInput());
  const [kingoketsuInput, setKingoketsuInput] = useState<KingoketsuInput>(() => createDefaultKingoketsuInput());
  const [dannekiInput, setDannekiInput] = useState<DannekiInput>(() => createDefaultDannekiInput());
  const years = Array.from({ length: 2065 - 1989 + 1 }, (_, index) => 1989 + index);
  const liurenChart = mode === "liuren" ? buildLiurenChart(liurenInput) : null;
  const kingoketsuChart = mode === "kingoketsu" ? buildKingoketsuChart(kingoketsuInput) : null;
  const dannekiChart = mode === "danneki" ? buildDannekiChart(dannekiInput) : null;
  const liurenDaysInMonth = getDaysInMonth(liurenInput.year, liurenInput.month);
  const kingoketsuDaysInMonth = getDaysInMonth(kingoketsuInput.year, kingoketsuInput.month);
  const dannekiDaysInMonth = getDaysInMonth(dannekiInput.year, dannekiInput.month);

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
          <p className="eyebrow">Divination Workspace</p>
          <h1>{MODE_TITLES[mode]}</h1>
        </div>
        <p className="lead">{MODE_LEADS[mode]}</p>
        <div className="mode-switch" role="tablist" aria-label="作盤モード">
          <button className={mode === "liuren" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("liuren")} type="button">
            六壬神課
          </button>
          <button className={mode === "kingoketsu" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("kingoketsu")} type="button">
            金口訣
          </button>
          <button className={mode === "danneki" ? "mode-button is-active" : "mode-button"} onClick={() => handleModeChange("danneki")} type="button">
            断易
          </button>
        </div>
        {mode === "liuren" ? (
          <section className="column-rail" aria-label="関連コラム">
            <div className="column-rail-heading">
              <span>Related Reading</span>
              <strong>六壬神課アプリとあわせて読みたいコラム</strong>
            </div>
            <div className="column-link-grid">
              {FEATURED_COLUMNS.map((column) => (
                <a key={column.href} className="column-link-card" href={column.href}>
                  <strong>{column.title}</strong>
                  <p>{column.summary}</p>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </header>

      <main className="workspace-grid">
        {mode === "liuren" ? (
          <>
            <InputPanel
              input={liurenInput}
              locations={LOCATION_OFFSETS}
              daysInMonth={liurenDaysInMonth}
              years={years}
              ganzhiOptions={GANZHI_CYCLE}
              onApplyNow={() => setLiurenInput((current) => withCurrentDateTime(current))}
              onInputChange={(updater: (draft: LiurenInput) => LiurenInput) => setLiurenInput((current) => updater(current))}
            />
            <BoardView chart={liurenChart!} />
            <HelperPanel chart={liurenChart!} />
            <AiFeedbackPanel chart={liurenChart!} mode="liuren" />
          </>
        ) : null}

        {mode === "kingoketsu" ? (
          <>
            <KingoketsuInputPanel
              input={kingoketsuInput}
              locations={LOCATION_OFFSETS}
              daysInMonth={kingoketsuDaysInMonth}
              years={years}
              onApplyNow={() => setKingoketsuInput((current) => withCurrentDateTime(current))}
              onInputChange={(updater: (draft: KingoketsuInput) => KingoketsuInput) => setKingoketsuInput((current) => updater(current))}
            />
            <KingoketsuBoardView chart={kingoketsuChart!} />
            <KingoketsuHelperPanel chart={kingoketsuChart!} />
            <AiFeedbackPanel chart={kingoketsuChart!} mode="kingoketsu" />
          </>
        ) : null}

        {mode === "danneki" ? (
          <>
            <DannekiInputPanel
              input={dannekiInput}
              locations={LOCATION_OFFSETS}
              daysInMonth={dannekiDaysInMonth}
              years={years}
              onApplyNow={() => setDannekiInput((current) => withCurrentDateTime(current))}
              onInputChange={(updater: (draft: DannekiInput) => DannekiInput) => setDannekiInput((current) => updater(current))}
            />
            <DannekiBoardView chart={dannekiChart!} />
            <DannekiHelperPanel chart={dannekiChart!} />
            <AiFeedbackPanel chart={dannekiChart!} mode="danneki" />
          </>
        ) : null}
      </main>
    </div>
  );
}

export default App;
