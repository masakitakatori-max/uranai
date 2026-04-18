import { ElementBadge } from "./ElementBadge";
import { WuxingPentagram } from "./WuxingPentagram";
import { getWuxingColor } from "../lib/relationships";
import { getSafeList } from "../lib/uiUtils";
import type { RelationshipEdge, RelationshipGraph, RelationshipKind, RelationshipNode } from "../lib/types";
import type { CSSProperties } from "react";

interface RelationshipMapProps {
  graph?: RelationshipGraph;
}

const RELATION_TONE: Record<RelationshipKind, string> = {
  same: "same",
  generates: "generate",
  "generated-by": "generate",
  overcomes: "overcome",
  "overcome-by": "overcome",
  branch: "branch",
  flow: "flow",
  state: "state",
  void: "void",
  "month-break": "break",
  role: "role",
  structure: "structure",
};

export function RelationBadge({ edge }: { edge: RelationshipEdge }) {
  return <span className={`relation-badge relation-badge-${RELATION_TONE[edge.kind]}`}>{edge.label}</span>;
}

function RelationshipNodeCard({ node }: { node: RelationshipNode }) {
  return (
    <article className={node.isPrimary ? "relationship-node is-primary" : "relationship-node"} style={{ "--element-color": getWuxingColor(node.element) } as CSSProperties}>
      <header>
        <span>{node.label}</span>
        <strong>{node.value}</strong>
      </header>
      <div className="relationship-node-meta">
        <ElementBadge element={node.element} />
        {node.role ? <span>{node.role}</span> : null}
        {node.branch ? <span>支 {node.branch}</span> : null}
        {node.stem ? <span>干 {node.stem}</span> : null}
      </div>
      {node.tags?.length ? (
        <div className="relationship-node-tags">
          {node.tags.map((tag) => (
            <span key={`${node.id}-${tag}`}>{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function RelationshipEdgeCard({ edge, nodes }: { edge: RelationshipEdge; nodes: Map<string, RelationshipNode> }) {
  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (!from || !to) return null;

  return (
    <article className={`relationship-edge relationship-edge-${RELATION_TONE[edge.kind]}`}>
      <header>
        <span>{from.label}</span>
        <RelationBadge edge={edge} />
        <span>{to.label}</span>
      </header>
      <div className="relationship-edge-values">
        <strong>{from.value}</strong>
        <span>→</span>
        <strong>{to.value}</strong>
      </div>
      {edge.detail ? <p>{edge.detail}</p> : null}
      {edge.tags?.length ? (
        <div className="relationship-node-tags">
          {edge.tags.map((tag) => (
            <span key={`${edge.id}-${tag}`}>{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function RelationshipMap({ graph }: RelationshipMapProps) {
  const nodes = getSafeList(graph?.nodes);
  const edges = getSafeList(graph?.edges);
  const summary = getSafeList(graph?.summary);
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

  if (!graph || !nodes.length) {
    return (
      <section className="relationship-map">
        <div className="section-label">星同士の関係</div>
        <div className="relationship-empty">関係性データは未生成です。</div>
      </section>
    );
  }

  return (
    <section className="relationship-map" aria-label={graph.title}>
      <div className="relationship-map-heading">
        <div>
          <div className="section-label">星同士の関係</div>
          <h3>{graph.title}</h3>
        </div>
        <div className="relationship-counts" aria-label="関係性件数">
          <span>{nodes.length} 要素</span>
          <span>{edges.length} 関係</span>
        </div>
      </div>

      {summary.length ? (
        <div className="relationship-summary">
          {summary.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      ) : null}

      <div className="relationship-node-grid">
        {nodes.map((node) => (
          <RelationshipNodeCard key={node.id} node={node} />
        ))}
      </div>

      <div className="relationship-pentagram-wrap">
        <WuxingPentagram highlights={nodes.map((node) => ({ label: `${node.label} ${node.value}`, element: node.element }))} size={240} />
      </div>

      <div className="relationship-edge-grid">
        {edges.map((edge) => (
          <RelationshipEdgeCard edge={edge} key={edge.id} nodes={nodeById} />
        ))}
      </div>
    </section>
  );
}
