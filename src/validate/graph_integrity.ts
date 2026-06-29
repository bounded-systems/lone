// Graph-integrity validators — the structural-soundness family for lone's graph
// IR (src/contracts/graph_node.ts).
//
// HONEST LABELLING — READ THIS FIRST:
// This family checks the STRUCTURAL properties a page-cut depends on, and only
// those. A page is a finite tree cut from a cyclic graph; for that cut to be
// well-formed the graph must have distinct node identities, resolvable
// references, and no node stranded outside the reachable set. These validators
// check exactly that:
//   • LONE_GRAPH_DUPLICATE_ID  — two nodes claim one identity
//   • LONE_GRAPH_DANGLING_REF  — a reference points at an id that isn't declared
//   • LONE_GRAPH_ORPHAN        — a node is unreachable from any root
//   • LONE_GRAPH_NO_ROOT       — reachability is undefined (no root, pure cycle)
//
// They DO NOT check that nodes are well-TYPED — that a node's `type` is a known
// class, or that an edge connects types an ontology permits. That typed
// conformance is a separate (later) validator family; a green check here means
// "the graph is structurally cut-able", not "the graph conforms to a vocabulary".
//
// Like every validator in src/validate/*, each is a pure function returning
// FindingType[]. Here the input is a GraphType rather than a SemanticNodeType.

import type { FindingType } from "../contracts/finding.ts";
import type { GraphNodeType, GraphType } from "../contracts/graph_node.ts";

// ── Distinct identity ────────────────────────────────────────────────────────

/** No two nodes may share an `id`. The first occurrence is canonical; every
 * later occurrence of the same id is the violation. */
export function validateNoDuplicateId(graph: GraphType): FindingType[] {
  const findings: FindingType[] = [];
  const firstSeen = new Map<string, number>();

  graph.nodes.forEach((node, i) => {
    const prev = firstSeen.get(node.id);
    if (prev === undefined) {
      firstSeen.set(node.id, i);
    } else {
      findings.push({
        code: "LONE_GRAPH_DUPLICATE_ID",
        path: `$.nodes[${i}]`,
        message:
          `Node id "${node.id}" is already declared at $.nodes[${prev}]. Each ` +
          `node must have a unique identity — merge the duplicates or re-id one.`,
        severity: "error",
      });
    }
  });

  return findings;
}

// ── Resolvable references ────────────────────────────────────────────────────

/** Every `ref` must resolve to a declared node id. A ref to an unknown id is a
 * dangling edge — the cut would point at nothing. */
export function validateNoDanglingRef(graph: GraphType): FindingType[] {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const findings: FindingType[] = [];

  graph.nodes.forEach((node, i) => {
    (node.refs ?? []).forEach((ref, r) => {
      if (!ids.has(ref)) {
        findings.push({
          code: "LONE_GRAPH_DANGLING_REF",
          path: `$.nodes[${i}].refs[${r}]`,
          message:
            `Node "${node.id}" references "${ref}", which is not a declared ` +
            `node. Add the target node or remove the dangling reference.`,
          severity: "error",
        });
      }
    });
  });

  return findings;
}

// ── Reachability (no orphan) ─────────────────────────────────────────────────

/** Every node must be reachable from a root by following references. Roots are
 * the declared `graph.roots`; when none are declared they are derived as the
 * source nodes (no inbound reference).
 *
 * The cyclic case is the point of this engine, so it is handled explicitly: a
 * cycle reachable from a root is FINE (its members are reachable and produce no
 * findings). Only a graph with no declared root AND no source node — a pure
 * cycle with no entry — has undefined reachability; rather than wrongly flag
 * every node as an orphan, it emits a single LONE_GRAPH_NO_ROOT so the caller
 * declares an entry point. */
export function validateNoOrphan(graph: GraphType): FindingType[] {
  if (graph.nodes.length === 0) return [];

  const byId = new Map<string, GraphNodeType>();
  for (const node of graph.nodes) {
    if (!byId.has(node.id)) byId.set(node.id, node);
  }

  let roots = (graph.roots ?? []).filter((r) => byId.has(r));
  if (roots.length === 0) {
    const hasInbound = new Set<string>();
    for (const node of graph.nodes) {
      for (const ref of node.refs ?? []) hasInbound.add(ref);
    }
    roots = graph.nodes.filter((n) => !hasInbound.has(n.id)).map((n) => n.id);
  }

  if (roots.length === 0) {
    return [{
      code: "LONE_GRAPH_NO_ROOT",
      path: "$",
      message:
        "Graph has no declared root and no source node (every node has an " +
        "inbound reference, e.g. a pure cycle), so orphan-reachability is " +
        "undefined. Declare graph.roots to fix the page-cut entry point.",
      severity: "warning",
    }];
  }

  // BFS over the directed reference edges from the roots.
  const reachable = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const current = byId.get(queue.shift() as string);
    for (const ref of current?.refs ?? []) {
      if (byId.has(ref) && !reachable.has(ref)) {
        reachable.add(ref);
        queue.push(ref);
      }
    }
  }

  const findings: FindingType[] = [];
  graph.nodes.forEach((node, i) => {
    if (!reachable.has(node.id)) {
      findings.push({
        code: "LONE_GRAPH_ORPHAN",
        path: `$.nodes[${i}]`,
        message:
          `Node "${node.id}" is not reachable from any root, so no page-cut ` +
          `can reach it. Link it into the graph or declare it a root.`,
        severity: "error",
      });
    }
  });

  return findings;
}

// ── Combined entry point ─────────────────────────────────────────────────────

/** Run the whole structural family over a graph. Findings are returned in
 * discovery order; the engine sorts them deterministically. */
export function validateGraphIntegrity(graph: GraphType): FindingType[] {
  return [
    ...validateNoDuplicateId(graph),
    ...validateNoDanglingRef(graph),
    ...validateNoOrphan(graph),
  ];
}
