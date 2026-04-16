export type FailureCategory =
  | "silent_fallback"
  | "book_knowledge_gap"
  | "contract_mismatch"
  | "missing_guard"
  | "auth_boundary"
  | "performance"
  | "unknown";

export type FailureSeverity = "critical" | "high" | "medium" | "low";

export interface FailureEvent {
  category: FailureCategory;
  severity: FailureSeverity;
  surface: "engine" | "ui" | "api" | "knowledge" | "build" | "test";
  message: string;
  module?: string;
}

export interface FailureCategoryDefinition {
  id: FailureCategory;
  title: string;
  whyItMatters: string;
  detect: string;
  repoExamples: string[];
}

export interface FailureParetoRow {
  category: FailureCategory;
  title: string;
  count: number;
  weightedScore: number;
  share: number;
  cumulativeShare: number;
  surfaces: Array<FailureEvent["surface"]>;
}

const SEVERITY_WEIGHT: Record<FailureSeverity, number> = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1,
};

export const FAILURE_CATEGORY_DEFINITIONS: FailureCategoryDefinition[] = [
  {
    id: "silent_fallback",
    title: "Silent fallback",
    whyItMatters: "入力や盤が壊れたのに、別の既定値へ倒れて誤鑑定を返す。最悪の誤答を作りやすい。",
    detect: "fallback / default / akashi / unresolved を見たら要注意。",
    repoExamples: [
      "src/lib/engine.ts",
      "src/lib/danneki.ts",
      "src/lib/kingoketsu.ts",
      "src/lib/location.ts",
    ],
  },
  {
    id: "book_knowledge_gap",
    title: "Book knowledge gap",
    whyItMatters: "書籍由来の fixture や rule table が薄いと、精度の土台が足りない。",
    detect: "fixture が少ない、規則が抽象的、OCR 由来の例が未展開なら該当。",
    repoExamples: [
      "src/lib/data/dannekiRules.ts",
      "src/lib/data/dannekiBookKnowledge.ts",
      "knowledge/danneki/*",
      "knowledge/kingoketsu/*",
    ],
  },
  {
    id: "contract_mismatch",
    title: "Contract mismatch",
    whyItMatters: "UI と API の契約がズレると、押せるのに失敗する・送れたのに弾かれる、という UX 事故になる。",
    detect: "minimum length / response shape / env name / required field のズレを探す。",
    repoExamples: ["src/components/AiFeedbackPanel.tsx", "api/ai-feedback.js", "src/lib/aiContract.js"],
  },
  {
    id: "missing_guard",
    title: "Missing guard",
    whyItMatters: "null / undefined / 空配列へのガード不足は、画面全体のクラッシュに直結する。",
    detect: "cannot read property / undefined.map / undefined.filter / missing array guard。",
    repoExamples: ["src/components/HelperPanel.tsx", "src/components/DannekiHelperPanel.tsx", "src/components/KingoketsuHelperPanel.tsx", "src/components/RenderErrorBoundary.tsx"],
  },
  {
    id: "auth_boundary",
    title: "Auth boundary",
    whyItMatters: "会員情報や token をブラウザ保存すると、XSS・共有端末・拡張機能で漏えいしやすい。",
    detect: "localStorage / bearer token / session cookie / signed pass をチェック。",
    repoExamples: ["src/lib/aiFeedback.ts", "api/member-session.js", "api/stripe-member-pass.js"],
  },
  {
    id: "performance",
    title: "Performance",
    whyItMatters: "初回バンドルや重い同期処理は、UX を壊しやすく将来の拡張も阻害する。",
    detect: "large chunk / static import / big engine / slow build / long render。",
    repoExamples: ["src/App.tsx", "src/components/workspaces/*", "src/lib/engine.ts", "src/lib/danneki.ts", "src/lib/kingoketsu.ts"],
  },
  {
    id: "unknown",
    title: "Unknown",
    whyItMatters: "分類できない失敗は、まず未知として隔離し、あとで語彙を追加する。",
    detect: "ルールに当てはまらない失敗は unknown に落とす。",
    repoExamples: ["logs / new regressions / uncategorized failures"],
  },
];

const FALLBACK_PATTERNS: Array<{ category: FailureCategory; patterns: RegExp[] }> = [
  {
    category: "silent_fallback",
    patterns: [/fallback/i, /default/i, /akashi/i, /unresolved/i, /三伝未確定/, /代用/i, /静かに間違/i],
  },
  {
    category: "book_knowledge_gap",
    patterns: [/fixture/i, /rule table/i, /book/i, /knowledge/i, /thin/i, /薄/i, /欠損/i, /不足/i],
  },
  {
    category: "contract_mismatch",
    patterns: [/contract/i, /payload/i, /response shape/i, /minimum length/i, /min length/i, /400/i, /unexpected/i],
  },
  {
    category: "missing_guard",
    patterns: [/undefined/i, /null/i, /cannot read/i, /\.map\(/i, /\.filter\(/i, /missing guard/i, /traces undefined/i],
  },
  {
    category: "auth_boundary",
    patterns: [/localStorage/i, /bearer/i, /cookie/i, /session/i, /token/i, /signed pass/i, /auth/i],
  },
  {
    category: "performance",
    patterns: [/chunk/i, /bundle/i, /performance/i, /slow/i, /render/i, /static import/i, /large/i],
  },
];

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function scoreSeverity(severity: FailureSeverity) {
  return SEVERITY_WEIGHT[severity];
}

export function classifyFailure(input: {
  message?: string;
  module?: string;
  trace?: string[];
}): FailureCategory {
  const haystack = [input.message, input.module, ...(input.trace ?? [])].map(normalizeText).filter(Boolean).join(" ");

  for (const bucket of FALLBACK_PATTERNS) {
    if (bucket.patterns.some((pattern) => pattern.test(haystack))) {
      return bucket.category;
    }
  }

  return "unknown";
}

export function buildFailurePareto(events: FailureEvent[]): FailureParetoRow[] {
  const rows = new Map<FailureCategory, FailureParetoRow>();

  for (const event of events) {
    const existing = rows.get(event.category);
    const weighted = scoreSeverity(event.severity);
    if (existing) {
      existing.count += 1;
      existing.weightedScore += weighted;
      if (!existing.surfaces.includes(event.surface)) {
        existing.surfaces.push(event.surface);
      }
      continue;
    }

    const definition = FAILURE_CATEGORY_DEFINITIONS.find((item) => item.id === event.category) ?? FAILURE_CATEGORY_DEFINITIONS[FAILURE_CATEGORY_DEFINITIONS.length - 1];
    rows.set(event.category, {
      category: event.category,
      title: definition.title,
      count: 1,
      weightedScore: weighted,
      share: 0,
      cumulativeShare: 0,
      surfaces: [event.surface],
    });
  }

  const sorted = Array.from(rows.values()).sort((left, right) => {
    if (right.weightedScore !== left.weightedScore) {
      return right.weightedScore - left.weightedScore;
    }
    return right.count - left.count;
  });

  const total = sorted.reduce((sum, row) => sum + row.weightedScore, 0);
  let cumulative = 0;

  return sorted.map((row) => {
    const share = total > 0 ? row.weightedScore / total : 0;
    cumulative += share;
    return {
      ...row,
      share,
      cumulativeShare: cumulative,
    };
  });
}

