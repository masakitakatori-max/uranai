import { useEffect, useMemo, useState } from "react";

import "./mobile.css";
import { buildLiurenChart } from "../lib/engine";
import { inferTopicFromQuestion } from "../lib/consultation";
import type { LiurenInput, LiurenTopic } from "../lib/types";
import { certaintyFromChart, isNearHourBoundary } from "./liurenSupport";
import { BoardScreen } from "./screens/BoardScreen";
import { DictionaryScreen } from "./screens/DictionaryScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { PaywallSheet } from "./screens/PaywallSheet";
import { ConditionsSheet, QuestionScreen } from "./screens/QuestionScreen";
import { RecordsScreen } from "./screens/RecordsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SummaryScreen } from "./screens/SummaryScreen";
import {
  createReadingId,
  hasOnboarded,
  loadDefaults,
  loadHistory,
  saveDefaults,
  saveReading,
  setOnboarded,
  type MobileDefaults,
  type SavedReading,
} from "./storage";

export type MobileTab = "home" | "records" | "dictionary" | "settings";

type FlowState =
  | { screen: "question" }
  | { screen: "summary"; reading: SavedReading }
  | { screen: "board"; reading: SavedReading };

export interface ConditionsDraft {
  mode: "now" | "manual";
  date: string;
  time: string;
  locationId: string;
}

const TAB_ITEMS: ReadonlyArray<{ id: MobileTab; glyph: string; label: string }> = [
  { id: "home", glyph: "盤", label: "ホーム" },
  { id: "records", glyph: "録", label: "記録" },
  { id: "dictionary", glyph: "典", label: "辞典" },
  { id: "settings", glyph: "設", label: "設定" },
];

function toDateInputValue(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(now: Date) {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function MobileApp() {
  const [onboarded, setOnboardedState] = useState(() => hasOnboarded());
  const [defaults, setDefaults] = useState<MobileDefaults>(() => loadDefaults());
  const [tab, setTab] = useState<MobileTab>("home");
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [history, setHistory] = useState<SavedReading[]>(() => loadHistory());
  const [question, setQuestion] = useState("");
  const [topicOverride, setTopicOverride] = useState<LiurenTopic | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [entitlementVersion, setEntitlementVersion] = useState(0);
  const [conditions, setConditions] = useState<ConditionsDraft>(() => ({
    mode: "now",
    date: toDateInputValue(new Date()),
    time: toTimeInputValue(new Date()),
    locationId: loadDefaults().locationId,
  }));

  useEffect(() => {
    document.title = "占術ワークスペース";
  }, []);

  const inferredTopic = useMemo(
    () => inferTopicFromQuestion(question, "総合"),
    [question],
  );
  const activeTopic: LiurenTopic = topicOverride ?? inferredTopic;

  const latestReading = history[0] ?? null;

  const handleCompleteOnboarding = () => {
    setOnboarded();
    setOnboardedState(true);
  };

  const openQuestion = (presetTopic?: LiurenTopic) => {
    const now = new Date();
    setQuestion("");
    setTopicOverride(presetTopic ?? null);
    setConditions({
      mode: "now",
      date: toDateInputValue(now),
      time: toTimeInputValue(now),
      locationId: defaults.locationId,
    });
    setSheetOpen(false);
    setFlow({ screen: "question" });
  };

  const handleCast = () => {
    const now = new Date();
    const useManual = conditions.mode === "manual";
    const [yearText, monthText, dayText] = conditions.date.split("-");
    const [hourText, minuteText] = conditions.time.split(":");

    const input: LiurenInput = {
      year: useManual ? Number(yearText) : now.getFullYear(),
      month: useManual ? Number(monthText) : now.getMonth() + 1,
      day: useManual ? Number(dayText) : now.getDate(),
      hour: useManual ? Number(hourText) : now.getHours(),
      minute: useManual ? Number(minuteText) : now.getMinutes(),
      locationId: conditions.locationId,
      topic: activeTopic,
      questionText: question.trim(),
      manualOverrides: { dayGanzhi: "", monthGeneral: "", hourBranch: "" },
    };

    const chart = buildLiurenChart(input);
    const nearBoundary = isNearHourBoundary(chart.basis.correctedDateTime);
    const reading: SavedReading = {
      id: createReadingId(),
      mode: "liuren",
      question: input.questionText,
      topic: chart.resolvedTopic,
      input,
      createdAt: new Date().toISOString(),
      certainty: certaintyFromChart(chart, nearBoundary),
      lessonType: chart.lessonType,
      dayGanzhi: chart.basis.dayGanzhi,
      nearBoundary,
    };

    setHistory(saveReading(reading));
    setSheetOpen(false);
    setFlow({ screen: "summary", reading });
  };

  const handleUpdateDefaults = (next: MobileDefaults) => {
    setDefaults(next);
    saveDefaults(next);
  };

  if (!onboarded) {
    return (
      <div className={`mobile-shell text-${defaults.textScale}`}>
        <OnboardingScreen onComplete={handleCompleteOnboarding} />
      </div>
    );
  }

  const renderFlow = () => {
    if (!flow) {
      return null;
    }
    if (flow.screen === "question") {
      return (
        <>
          <QuestionScreen
            question={question}
            activeTopic={activeTopic}
            inferredTopic={inferredTopic}
            onQuestionChange={(value) => {
              setQuestion(value);
              setTopicOverride(null);
            }}
            onTopicSelect={setTopicOverride}
            onBack={() => setFlow(null)}
            onProceed={() => setSheetOpen(true)}
          />
          {sheetOpen ? (
            <ConditionsSheet
              conditions={conditions}
              onChange={setConditions}
              onClose={() => setSheetOpen(false)}
              onCast={handleCast}
            />
          ) : null}
        </>
      );
    }
    if (flow.screen === "summary") {
      return (
        <SummaryScreen
          reading={flow.reading}
          onBack={() => setFlow(null)}
          onOpenBoard={() => setFlow({ screen: "board", reading: flow.reading })}
          onOpenPaywall={() => setPaywallOpen(true)}
          entitlementVersion={entitlementVersion}
        />
      );
    }
    return (
      <BoardScreen
        reading={flow.reading}
        onBack={() => setFlow({ screen: "summary", reading: flow.reading })}
      />
    );
  };

  const renderTab = () => {
    switch (tab) {
      case "home":
        return (
          <HomeScreen
            defaults={defaults}
            history={history}
            onStartNow={() => openQuestion()}
            onSelectTopic={(topic) => openQuestion(topic)}
            onOpenReading={(reading) => setFlow({ screen: "summary", reading })}
          />
        );
      case "records":
        return (
          <RecordsScreen
            history={history}
            onOpenReading={(reading) => setFlow({ screen: "summary", reading })}
          />
        );
      case "dictionary":
        return <DictionaryScreen latestReading={latestReading} />;
      case "settings":
        return (
          <SettingsScreen
            defaults={defaults}
            onUpdateDefaults={handleUpdateDefaults}
            onOpenPaywall={() => setPaywallOpen(true)}
            entitlementVersion={entitlementVersion}
          />
        );
    }
  };

  return (
    <div className={`mobile-shell text-${defaults.textScale}`}>
      {flow ? (
        renderFlow()
      ) : (
        <>
          <div className="tab-content">{renderTab()}</div>
          <nav className="tab-bar" aria-label="メインタブ">
            {TAB_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "tab-item is-active" : "tab-item"}
                onClick={() => setTab(item.id)}
              >
                <span className="tab-glyph">{item.glyph}</span>
                <span className="tab-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      {paywallOpen ? (
        <PaywallSheet
          onClose={() => setPaywallOpen(false)}
          onEntitled={() => {
            setPaywallOpen(false);
            setEntitlementVersion((value) => value + 1);
          }}
        />
      ) : null}
    </div>
  );
}

export default MobileApp;
