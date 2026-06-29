// Graph-ontology validator — the typed-conformance layer over lone's graph IR.
//
// HONEST LABELLING — READ THIS FIRST:
// Where graph_integrity.ts checks that a graph is STRUCTURALLY cut-able, this
// checks that its nodes are well-TYPED against a declared ontology: every node's
// `type` is in the vocabulary, every node is typed when the ontology requires it,
// and every reference connects classes the ontology permits. A green check here
// means "the graph conforms to this vocabulary", NOT "the graph is structurally
// sound" — run the integrity family for that. The two compose: structure first,
// then type.
//
// SCOPE of this slice (the graph IR's `refs` are unlabeled, so):
//   • class membership      — LONE_ONTOLOGY_UNKNOWN_CLASS
//   • required typing       — LONE_ONTOLOGY_UNTYPED_NODE
//   • coarse domain/range   — LONE_ONTOLOGY_FORBIDDEN_EDGE (by endpoint class)
// NOT covered (needs labeled edges / a richer ontology — later): per-predicate
// domain/range, cardinality, and subclass hierarchies.
//
// Dangling or untyped reference targets are the integrity family's concern; this
// validator does not double-report them — it only type-checks edges between two
// typed, present nodes.
//
// Pure function returning FindingType[], like every validator in src/validate/*.

import type { FindingType } from "../contracts/finding.ts";
import type { GraphType } from "../contracts/graph_node.ts";
import type { OntologyType } from "../contracts/ontology.ts";

export function validateOntology(
  graph: GraphType,
  ontology: OntologyType,
): FindingType[] {
  const findings: FindingType[] = [];
  const classes = new Set(ontology.classes);

  // First declared type wins, mirroring the integrity family's first-occurrence
  // rule for duplicate ids.
  const typeById = new Map<string, string | undefined>();
  for (const node of graph.nodes) {
    if (!typeById.has(node.id)) typeById.set(node.id, node.type);
  }

  graph.nodes.forEach((node, i) => {
    if (node.type === undefined) {
      if (ontology.requireTyped) {
        findings.push({
          code: "LONE_ONTOLOGY_UNTYPED_NODE",
          path: `$.nodes[${i}]`,
          message:
            `Node "${node.id}" has no type, but the ontology requires every ` +
            `node to declare one. Add a type from the ontology's classes.`,
          severity: "error",
        });
      }
      return; // an untyped node can't be class- or edge-checked
    }

    if (!classes.has(node.type)) {
      findings.push({
        code: "LONE_ONTOLOGY_UNKNOWN_CLASS",
        path: `$.nodes[${i}]`,
        message:
          `Node "${node.id}" has type "${node.type}", which is not a class in ` +
          `the ontology. Declare the class or correct the type.`,
        severity: "error",
      });
      return; // unknown source class — don't also check edges out of it
    }

    const allowed = ontology.edges[node.type];
    if (allowed === undefined) return; // this source class is unconstrained
    const allowedSet = new Set(allowed);

    (node.refs ?? []).forEach((ref, r) => {
      const targetType = typeById.get(ref);
      // Skip when the target is absent (dangling) or untyped — the integrity
      // family and the untyped-node rule respectively own those.
      if (targetType === undefined) return;
      if (!allowedSet.has(targetType)) {
        findings.push({
          code: "LONE_ONTOLOGY_FORBIDDEN_EDGE",
          path: `$.nodes[${i}].refs[${r}]`,
          message: `Node "${node.id}" (${node.type}) references "${ref}" ` +
            `(${targetType}); the ontology does not permit ${node.type} → ` +
            `${targetType}. Allowed targets from ${node.type}: ` +
            `${allowed.join(", ") || "none"}.`,
          severity: "error",
        });
      }
    });
  });

  return findings;
}
