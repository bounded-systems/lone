import { z } from "zod";

// The graph IR: a set of identified nodes with outbound references, plus optional
// entry roots. This is lone's *non-DOM* input — where a SemanticNode is a DOM
// subtree (already a tree, rooted, no identity), a Graph is the cyclic,
// connected shape a knowledge base / PKM actually has: nodes carry an `id`, refer
// to each other by id, and may form cycles.
//
// The graph-integrity validators (src/validate/graph_integrity.ts) operate on
// this IR. They check the structural properties a page-cut depends on — distinct
// identities (no duplicate id), resolvable references (no dangling ref), and
// reachability (no orphan) — NOT the typed/ontological conformance of the nodes.
// That typed layer is a separate, later validator family; the optional `type`
// field below is its forward hook (a node already declares what it is, so an
// ontology validator can later check it against a declared vocabulary).

export type GraphNodeType = {
  id: string;
  type?: string;
  refs: string[];
};

export const GraphNode: z.ZodType<GraphNodeType> = z.object({
  // Stable identity. Two nodes sharing an id is a duplicate-node violation.
  id: z.string().min(1).max(512),
  // What the node is. Unconstrained here on purpose — structural integrity is
  // type-agnostic; the ontology layer is what will constrain this.
  type: z.string().min(1).max(256).optional(),
  // Outbound references, by id. A ref to an id not in the node set is dangling.
  refs: z.array(z.string().min(1)).optional().default([]),
}) as z.ZodType<GraphNodeType>;

export type GraphType = {
  nodes: GraphNodeType[];
  roots: string[];
};

export const Graph: z.ZodType<GraphType> = z.object({
  nodes: z.array(GraphNode),
  // Entry points for the page-cut. Reachability (the orphan check) is measured
  // from these. When omitted, the validator derives roots as the source nodes
  // (those with no inbound reference); see validateNoOrphan for the cyclic case.
  roots: z.array(z.string().min(1)).optional().default([]),
}) as z.ZodType<GraphType>;
