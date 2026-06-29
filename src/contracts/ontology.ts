import { z } from "zod";

// An ontology: the typed vocabulary a graph's nodes must conform to. Where the
// graph-integrity family (src/validate/graph_integrity.ts) checks that a graph
// is structurally cut-able (distinct ids, resolvable refs, reachability), the
// ontology declares what the nodes are ALLOWED to be and how they may relate.
//
// This is a deliberately lightweight ontology, matched to the graph IR's current
// shape (unlabeled `refs`):
//   • classes      — the permitted node `type` vocabulary.
//   • edges        — per source class, the target classes a reference may point
//                    at. A class absent from `edges` is unconstrained (any
//                    target). Coarse domain/range: it constrains edges by their
//                    endpoint CLASSES, not by a per-edge predicate (refs carry
//                    no predicate yet — that is a later, labeled-edge extension).
//   • requireTyped — when true, every node must declare a `type`.

export type OntologyType = {
  classes: string[];
  edges: Record<string, string[]>;
  requireTyped: boolean;
};

export const Ontology: z.ZodType<OntologyType> = z.object({
  classes: z.array(z.string().min(1)),
  edges: z.record(z.array(z.string().min(1))).optional().default({}),
  requireTyped: z.boolean().optional().default(false),
}) as z.ZodType<OntologyType>;
