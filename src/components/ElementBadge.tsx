import { getWuxingColor } from "../lib/relationships";
import type { Wuxing } from "../lib/types";
import type { CSSProperties } from "react";

interface ElementBadgeProps {
  element: Wuxing;
  label?: string;
  compact?: boolean;
}

export function ElementBadge({ element, label, compact = false }: ElementBadgeProps) {
  return (
    <span className={compact ? "element-badge element-badge-compact" : "element-badge"} style={{ "--element-color": getWuxingColor(element) } as CSSProperties}>
      <span className="element-badge-dot" aria-hidden="true" />
      {label ?? element}
    </span>
  );
}
