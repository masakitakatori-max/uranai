import { getBranchRelations } from "./data/rules";
import type { Branch, RelationshipEdge, RelationshipGraph, RelationshipKind, RelationshipNode, Wuxing } from "./types";

export const WUXING_ORDER = ["木", "火", "土", "金", "水"] as const satisfies readonly Wuxing[];

export const WUXING_COLORS: Record<Wuxing, string> = {
  木: "#2f9e44",
  火: "#d83b3b",
  土: "#8a5a36",
  金: "#f2c94c",
  水: "#1f78d1",
};

export const WUXING_GENERATES: Record<Wuxing, Wuxing> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

export const WUXING_OVERCOMES: Record<Wuxing, Wuxing> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

export function getWuxingColor(element: Wuxing) {
  return WUXING_COLORS[element];
}

export function getWuxingRelation(from: Wuxing, to: Wuxing): { kind: RelationshipKind; label: string; detail: string } {
  if (from === to) {
    return { kind: "same", label: "同気", detail: `${from}同士で同じ気です。` };
  }
  if (WUXING_GENERATES[from] === to) {
    return { kind: "generates", label: "生じる", detail: `${from}が${to}を生じます。` };
  }
  if (WUXING_GENERATES[to] === from) {
    return { kind: "generated-by", label: "生じられる", detail: `${from}は${to}から生じられます。` };
  }
  if (WUXING_OVERCOMES[from] === to) {
    return { kind: "overcomes", label: "剋す", detail: `${from}が${to}を剋します。` };
  }
  return { kind: "overcome-by", label: "剋される", detail: `${from}は${to}から剋されます。` };
}

function edgeId(parts: readonly string[]) {
  return parts.join("-").replace(/\s+/g, "");
}

export function createWuxingRelationEdge(from: RelationshipNode, to: RelationshipNode, prefix = "wuxing"): RelationshipEdge {
  const relation = getWuxingRelation(from.element, to.element);
  return {
    id: edgeId([prefix, from.id, to.id, relation.kind]),
    from: from.id,
    to: to.id,
    label: relation.label,
    kind: relation.kind,
    detail: `${from.label}(${from.element}) → ${to.label}(${to.element}): ${relation.detail}`,
  };
}

export function createWuxingRelationEdges(nodes: readonly RelationshipNode[], prefix = "wuxing"): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      edges.push(createWuxingRelationEdge(nodes[left], nodes[right], prefix));
    }
  }
  return edges;
}

export function createBranchRelationEdges(nodes: readonly RelationshipNode[], prefix = "branch"): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const from = nodes[left];
      const to = nodes[right];
      if (!from.branch || !to.branch) continue;
      const relations = from.branch === to.branch ? ["同支"] : getBranchRelations(from.branch as Branch, to.branch as Branch);
      if (!relations.length) continue;
      edges.push({
        id: edgeId([prefix, from.id, to.id, relations.join("")]),
        from: from.id,
        to: to.id,
        label: relations.join(" / "),
        kind: "branch",
        detail: `${from.label}${from.branch} と ${to.label}${to.branch}: ${relations.join(" / ")}`,
        tags: relations,
      });
    }
  }
  return edges;
}

export function createFlowEdge(from: RelationshipNode, to: RelationshipNode, label: string, detail?: string): RelationshipEdge {
  return {
    id: edgeId(["flow", from.id, to.id, label]),
    from: from.id,
    to: to.id,
    label,
    kind: "flow",
    detail,
  };
}

export function createStructureEdge(from: RelationshipNode, to: RelationshipNode, label: string, detail?: string): RelationshipEdge {
  return {
    id: edgeId(["structure", from.id, to.id, label]),
    from: from.id,
    to: to.id,
    label,
    kind: "structure",
    detail,
  };
}

export function dedupeRelationshipEdges(edges: readonly RelationshipEdge[]) {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (seen.has(edge.id)) return false;
    seen.add(edge.id);
    return true;
  });
}

export function createRelationshipGraph(params: {
  title: string;
  summary: string[];
  nodes: readonly RelationshipNode[];
  edges: readonly RelationshipEdge[];
}): RelationshipGraph {
  return {
    title: params.title,
    summary: params.summary,
    nodes: [...params.nodes],
    edges: dedupeRelationshipEdges(params.edges),
  };
}
