import { assertEquals } from "@std/assert";
import type { FindingType } from "../../src/contracts/finding.ts";
import type { GraphType } from "../../src/contracts/graph_node.ts";
import type { OntologyType } from "../../src/contracts/ontology.ts";
import { validateOntology } from "../../src/validate/graph_ontology.ts";

function g(
  nodes: Array<{ id: string; type?: string; refs?: string[] }>,
): GraphType {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, refs: n.refs ?? [] })),
    roots: [],
  };
}

function ont(o: Partial<OntologyType>): OntologyType {
  return {
    classes: o.classes ?? [],
    edges: o.edges ?? {},
    requireTyped: o.requireTyped ?? false,
  };
}

function codes(findings: FindingType[]): string[] {
  return findings.map((f) => f.code);
}

// ── Conforming graphs ────────────────────────────────────────────────────────

Deno.test("ontology - typed graph within the vocabulary and edges is clean", () => {
  const graph = g([
    { id: "p1", type: "Post", refs: ["a1"] },
    { id: "a1", type: "Author" },
  ]);
  const o = ont({ classes: ["Post", "Author"], edges: { Post: ["Author"] } });
  assertEquals(validateOntology(graph, o), []);
});

Deno.test("ontology - a source class absent from edges is unconstrained", () => {
  const graph = g([
    { id: "p1", type: "Post", refs: ["x"] },
    { id: "x", type: "Author" },
  ]);
  // No `edges` entry for Post → any target class is allowed.
  const o = ont({ classes: ["Post", "Author"] });
  assertEquals(validateOntology(graph, o), []);
});

// ── Class membership ─────────────────────────────────────────────────────────

Deno.test("ontology - type outside the vocabulary is an unknown class", () => {
  const graph = g([{ id: "n1", type: "Widget" }]);
  const o = ont({ classes: ["Post", "Author"] });
  const findings = validateOntology(graph, o);
  assertEquals(codes(findings), ["LONE_ONTOLOGY_UNKNOWN_CLASS"]);
  assertEquals(findings[0].path, "$.nodes[0]");
});

// ── Required typing ──────────────────────────────────────────────────────────

Deno.test("ontology - untyped node flagged only when requireTyped is set", () => {
  const graph = g([{ id: "n1" }]);
  assertEquals(validateOntology(graph, ont({ classes: ["Post"] })), []);
  assertEquals(
    codes(
      validateOntology(graph, ont({ classes: ["Post"], requireTyped: true })),
    ),
    ["LONE_ONTOLOGY_UNTYPED_NODE"],
  );
});

// ── Edge endpoint constraints (coarse domain/range) ──────────────────────────

Deno.test("ontology - reference to a disallowed target class is a forbidden edge", () => {
  const graph = g([
    { id: "p1", type: "Post", refs: ["c1"] },
    { id: "c1", type: "Comment" },
  ]);
  // Post may point at Author, not Comment.
  const o = ont({
    classes: ["Post", "Author", "Comment"],
    edges: { Post: ["Author"] },
  });
  const findings = validateOntology(graph, o);
  assertEquals(codes(findings), ["LONE_ONTOLOGY_FORBIDDEN_EDGE"]);
  assertEquals(findings[0].path, "$.nodes[0].refs[0]");
});

Deno.test("ontology - dangling/untyped targets are not double-reported here", () => {
  const graph = g([
    { id: "p1", type: "Post", refs: ["ghost", "u1"] },
    { id: "u1" }, // present but untyped
  ]);
  const o = ont({ classes: ["Post"], edges: { Post: ["Post"] } });
  // "ghost" is dangling (integrity family); "u1" is untyped (untyped-node rule
  // only fires with requireTyped). Neither is a forbidden-edge here.
  assertEquals(validateOntology(graph, o), []);
});
