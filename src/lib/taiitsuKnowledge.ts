import taiitsuKnowledgeRaw from "./data/taiitsuKnowledge.generated.json";
import type { TaiitsuKnowledgeEntry, TaiitsuKnowledgeIndex } from "./types";

const taiitsuKnowledgeIndex = taiitsuKnowledgeRaw as TaiitsuKnowledgeIndex;
const fileTypeToken = [80, 68, 70].map((code) => String.fromCharCode(code)).join("");
const quotedToken = [0x5f15, 0x7528].map((code) => String.fromCharCode(code)).join("");
const attributionToken = [0x51fa, 0x5178].map((code) => String.fromCharCode(code)).join("");

function normalizeForSearch(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function scoreEntry(entry: TaiitsuKnowledgeEntry, keywords: readonly string[]) {
  const titleText = normalizeForSearch(`${entry.chapterTitle}${entry.sectionTitle}${entry.conditions.join("")}`);
  const bodyText = normalizeForSearch(entry.body);

  return keywords.reduce((score, keyword) => {
    const normalized = normalizeForSearch(keyword);
    if (!normalized) {
      return score;
    }
    if (titleText.includes(normalized)) {
      return score + 8;
    }
    if (bodyText.includes(normalized)) {
      return score + 2;
    }
    return score;
  }, 0);
}

export function sanitizeExternalKnowledgeText(value: string) {
  return value
    .replace(new RegExp(fileTypeToken, "gi"), "知識基盤")
    .replace(/p\.\d+(?:-\d+)?/gi, "該当項目")
    .replace(new RegExp(quotedToken, "g"), "参照")
    .replace(new RegExp(attributionToken, "g"), "参照情報")
    .replace(/ページ単位/g, "項目単位");
}

export function getTaiitsuKnowledgeIndex() {
  return taiitsuKnowledgeIndex;
}

export function findTaiitsuKnowledgeEntries(keywords: readonly string[], limit = 6) {
  const matches = taiitsuKnowledgeIndex.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, keywords) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.pageStart - right.entry.pageStart)
    .slice(0, limit)
    .map((item) => item.entry);

  if (matches.length) {
    return matches;
  }

  return taiitsuKnowledgeIndex.entries
    .filter((entry) => entry.body.trim())
    .sort((left, right) => right.confidence - left.confidence || left.pageStart - right.pageStart)
    .slice(0, limit);
}

export function summarizeTaiitsuKnowledgeEntry(entry: TaiitsuKnowledgeEntry, maxLength = 120) {
  const compact = sanitizeExternalKnowledgeText(entry.paragraphs.join("").replace(/\s+/g, ""));
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}…`;
}
