import type { LiurenInput, LiurenTopic } from "../lib/types";

const ONBOARDED_KEY = "uranai.mobile.onboarded.v1";
const DEFAULTS_KEY = "uranai.mobile.defaults.v1";
const HISTORY_KEY = "uranai.mobile.history.v1";
const HISTORY_LIMIT = 100;

export type MobileCertainty = "high" | "medium" | "review";

export interface MobileDefaults {
  locationId: string;
  textScale: "standard" | "large";
}

export interface SavedReading {
  id: string;
  mode: "liuren";
  question: string;
  topic: LiurenTopic;
  input: LiurenInput;
  createdAt: string;
  certainty: MobileCertainty;
  lessonType: string | null;
  dayGanzhi: string;
  nearBoundary: boolean;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存失敗（容量・プライベートモード）は致命ではないため握りつぶす
  }
}

export function hasOnboarded() {
  return readJson<boolean>(ONBOARDED_KEY) === true;
}

export function setOnboarded() {
  writeJson(ONBOARDED_KEY, true);
}

export function loadDefaults(): MobileDefaults {
  const stored = readJson<Partial<MobileDefaults>>(DEFAULTS_KEY);
  return {
    locationId: stored?.locationId ?? "tokyo23",
    textScale: stored?.textScale === "large" ? "large" : "standard",
  };
}

export function saveDefaults(defaults: MobileDefaults) {
  writeJson(DEFAULTS_KEY, defaults);
}

export function loadHistory(): SavedReading[] {
  const stored = readJson<SavedReading[]>(HISTORY_KEY);
  return Array.isArray(stored) ? stored : [];
}

export function saveReading(reading: SavedReading) {
  const next = [reading, ...loadHistory()].slice(0, HISTORY_LIMIT);
  writeJson(HISTORY_KEY, next);
  return next;
}

export function createReadingId() {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
