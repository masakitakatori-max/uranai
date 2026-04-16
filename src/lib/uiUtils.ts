import type { SourceReference } from "./types";

export const DANNEKI_LINE_LABELS = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;

export function getSafeList<T>(value: readonly T[] | undefined | null): T[] {
  return Array.isArray(value) ? [...value] : [];
}

export function formatSourceReference(reference?: SourceReference | null) {
  if (!reference) {
    return "source omitted";
  }

  const segments = [reference.label];
  if (reference.detail) {
    segments.push(reference.detail);
  }
  if (reference.imageId) {
    segments.push(reference.imageId);
  }
  if (reference.chapter) {
    segments.push(reference.chapter);
  }

  return segments.join(" · ");
}

export function getDannekiLineLabel(position: number) {
  return DANNEKI_LINE_LABELS[position - 1] ?? `${position}爻`;
}
