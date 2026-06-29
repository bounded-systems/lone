import { assertEquals } from "@std/assert";
import type { FindingType } from "../../src/contracts/finding.ts";
import type { GraphType } from "../../src/contracts/graph_node.ts";
import {
  validateGraphIntegrity,
  validateNoDanglingRef,
  validateNoDuplicateId,
  validateNoOrphan,
} from "../../src/validate/graph_integrity.ts";

function g(
  nodes: Array<{ id: string; type?: string; refs?: string[] }>,
  roots: string[] = [],
): GraphType {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, refs: n.refs ?? [] })),
    roots,
  };
}

function codes(findings: FindingType[]): string[] {
  return findings.map((f) => f.code);
}

// ── Clean graphs produce no findings ─────────────────────────────────────────

Deno.test("graph integrity - empty graph is clean", () => {
  assertEquals(validateGraphIntegrity(g([])).length, 0);
});

Deno.test("graph integrity - connected DAG from declared root is clean", () => {
  const graph = g([
    { id: "home", refs: ["about", "blog"] },
    { id: "about", refs: [] },
    { id: "blog", refs: ["post-1"] },
    { id: "post-1", refs: [] },
  ], ["home"]);
  assertEquals(validateGraphIntegrity(graph).length, 0);
});

Deno.test("graph integrity - a CYCLE reachable from the root is clean", () => {
  // The whole point of the engine: the backend is cyclic. A cycle that is
  // reachable from a root must NOT be flagged — its members are reachable.
  const graph = g([
    { id: "a", refs: ["b"] },
    { id: "b", refs: ["c"] },
    { id: "c", refs: ["a"] }, // c → a closes the cycle
  ], ["a"]);
  assertEquals(validateNoOrphan(graph), []);
  assertEquals(validateGraphIntegrity(graph).length, 0);
});

Deno.test("graph integrity - roots derived from source nodes when none declared", () => {
  // No roots declared; "home" is the only source (no inbound ref) → derived root.
  const graph = g([
    { id: "home", refs: ["about"] },
    { id: "about", refs: [] },
  ]);
  assertEquals(validateNoOrphan(graph), []);
});

// ── Duplicate identity ───────────────────────────────────────────────────────

Deno.test("graph integrity - duplicate id is flagged at the later occurrence", () => {
  const graph = g([
    { id: "x" },
    { id: "y" },
    { id: "x" },
  ], ["x"]);
  const findings = validateNoDuplicateId(graph);
  assertEquals(codes(findings), ["LONE_GRAPH_DUPLICATE_ID"]);
  assertEquals(findings[0].path, "$.nodes[2]");
});

// ── Dangling reference ───────────────────────────────────────────────────────

Deno.test("graph integrity - reference to undeclared id is dangling", () => {
  const graph = g([
    { id: "home", refs: ["about", "ghost"] },
    { id: "about", refs: [] },
  ], ["home"]);
  const findings = validateNoDanglingRef(graph);
  assertEquals(codes(findings), ["LONE_GRAPH_DANGLING_REF"]);
  assertEquals(findings[0].path, "$.nodes[0].refs[1]");
});

// ── Orphan (unreachable) ─────────────────────────────────────────────────────

Deno.test("graph integrity - node unreachable from root is an orphan", () => {
  const graph = g([
    { id: "home", refs: ["about"] },
    { id: "about", refs: [] },
    { id: "stray", refs: [] }, // nothing links to it, not a root
  ], ["home"]);
  const findings = validateNoOrphan(graph);
  assertEquals(codes(findings), ["LONE_GRAPH_ORPHAN"]);
  assertEquals(findings[0].path, "$.nodes[2]");
});

// ── Undefined reachability (pure cycle, no root) ─────────────────────────────

Deno.test("graph integrity - pure cycle with no root asks for one, not all-orphans", () => {
  // Every node has an inbound edge, so no source can be derived. Reachability is
  // undefined; the validator must NOT flag every node — it emits one NO_ROOT.
  const graph = g([
    { id: "a", refs: ["b"] },
    { id: "b", refs: ["a"] },
  ]);
  const findings = validateNoOrphan(graph);
  assertEquals(codes(findings), ["LONE_GRAPH_NO_ROOT"]);
});

// ── Combined ordering is stable across the family ────────────────────────────

Deno.test("graph integrity - combined family reports all violation kinds", () => {
  const graph = g([
    { id: "home", refs: ["ghost"] }, // dangling
    { id: "home", refs: [] }, // duplicate id
    { id: "stray", refs: [] }, // orphan
  ], ["home"]);
  const found = new Set(codes(validateGraphIntegrity(graph)));
  assertEquals(found.has("LONE_GRAPH_DUPLICATE_ID"), true);
  assertEquals(found.has("LONE_GRAPH_DANGLING_REF"), true);
  assertEquals(found.has("LONE_GRAPH_ORPHAN"), true);
});
