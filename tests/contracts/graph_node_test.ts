import { assert, assertEquals } from "@std/assert";
import { Graph, GraphNode } from "../../src/contracts/graph_node.ts";

Deno.test("GraphNode - defaults refs to an empty array", () => {
  const parsed = GraphNode.parse({ id: "a" });
  assertEquals(parsed.refs, []);
});

Deno.test("GraphNode - rejects an empty id", () => {
  assert(!GraphNode.safeParse({ id: "" }).success);
});

Deno.test("GraphNode - keeps an optional type for the ontology layer", () => {
  const parsed = GraphNode.parse({ id: "a", type: "Article" });
  assertEquals(parsed.type, "Article");
});

Deno.test("Graph - defaults roots and accepts a node list", () => {
  const parsed = Graph.parse({
    nodes: [{ id: "a", refs: ["b"] }, { id: "b" }],
  });
  assertEquals(parsed.roots, []);
  assertEquals(parsed.nodes.length, 2);
});

Deno.test("Graph - rejects a non-array nodes field", () => {
  assert(!Graph.safeParse({ nodes: "nope" }).success);
});
