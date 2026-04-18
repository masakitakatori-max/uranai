import { useId } from "react";

import { WUXING_COLORS, WUXING_ORDER } from "../lib/relationships";
import type { Wuxing } from "../lib/types";

interface WuxingPentagramProps {
  highlights?: Array<{ label: string; element: Wuxing }>;
  size?: number;
}

// 相生 (生む順): 木→火→土→金→水→木
// 相剋 (剋す): 木→土, 土→水, 水→火, 火→金, 金→木

export function WuxingPentagram({ highlights = [], size = 200 }: WuxingPentagramProps) {
  const idBase = useId().replace(/:/g, "");
  const shengMarkerId = `${idBase}-arrow-sheng`;
  const keMarkerId = `${idBase}-arrow-ke`;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  // 木(上), 火(右上), 土(右下), 金(左下), 水(左上) 五芒星配置
  const positions: Record<Wuxing, { x: number; y: number }> = WUXING_ORDER.reduce((acc, element, index) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    acc[element] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
    return acc;
  }, {} as Record<Wuxing, { x: number; y: number }>);

  const generates: Array<[Wuxing, Wuxing]> = [
    ["木", "火"],
    ["火", "土"],
    ["土", "金"],
    ["金", "水"],
    ["水", "木"],
  ];
  const overcomes: Array<[Wuxing, Wuxing]> = [
    ["木", "土"],
    ["土", "水"],
    ["水", "火"],
    ["火", "金"],
    ["金", "木"],
  ];

  const highlightedElements = new Set(highlights.map((h) => h.element));

  return (
    <div className="wuxing-pentagram">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="五行相生相剋">
        <defs>
          <marker id={shengMarkerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#77806f" />
          </marker>
          <marker id={keMarkerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#9d3f3f" />
          </marker>
        </defs>

        {generates.map(([from, to]) => (
          <line
            key={`sheng-${from}-${to}`}
            x1={positions[from].x}
            y1={positions[from].y}
            x2={positions[to].x}
            y2={positions[to].y}
            stroke="#77806f"
            strokeWidth={1.2}
            markerEnd={`url(#${shengMarkerId})`}
          />
        ))}

        {overcomes.map(([from, to]) => (
          <line
            key={`ke-${from}-${to}`}
            x1={positions[from].x}
            y1={positions[from].y}
            x2={positions[to].x}
            y2={positions[to].y}
            stroke="#9d3f3f"
            strokeWidth={1}
            strokeDasharray="3 3"
            markerEnd={`url(#${keMarkerId})`}
          />
        ))}

        {WUXING_ORDER.map((element) => {
          const pos = positions[element];
          const isHighlight = highlightedElements.has(element);
          const r = isHighlight ? 18 : 14;
          return (
            <g key={element}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={WUXING_COLORS[element]}
                stroke={isHighlight ? "#fff6b8" : "#fff"}
                strokeWidth={isHighlight ? 3 : 1.5}
              />
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                fill="#fff"
                fontSize={14}
                fontWeight="bold"
              >
                {element}
              </text>
            </g>
          );
        })}
      </svg>
      {highlights.length ? (
        <ul className="wuxing-pentagram-legend">
          {highlights.map((h) => (
            <li key={h.label}>
              <span className="wuxing-pentagram-dot" style={{ background: WUXING_COLORS[h.element] }} />
              {h.label}: {h.element}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
