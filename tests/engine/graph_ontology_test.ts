import { assertEquals } from "@std/assert";
import { validateGraph } from "../../src/engine/mod.ts";

Deno.test("validateGraph - ontology arg runs typed conformance after structure", async () => {
  const result = await validateGraph(
    {
      nodes: [
        { id: "p1", type: "Post", refs: ["c1"] },
        { id: "c1", type: "Comment" },
      ],
      roots: ["p1"],
    },
    { classes: ["Post", "Author", "Comment"], edges: { Post: ["Author"] } },
  );
  // Structure is sound; ontology forbids Post → Comment.
  assertEquals(result.findings.map((f) => f.code), [
    "LONE_ONTOLOGY_FORBIDDEN_EDGE",
  ]);
});

Deno.test("validateGraph - no ontology arg means structure only", async () => {
  const result = await validateGraph({
    nodes: [{ id: "p1", type: "Widget", refs: [] }],
    roots: ["p1"],
  });
  // "Widget" would be an unknown class IF an ontology were supplied; without one,
  // type is not checked.
  assertEquals(result.findings.length, 0);
});

Deno.test("validateGraph - malformed ontology yields LONE_ONTOLOGY_INVALID_INPUT", async () => {
  const result = await validateGraph(
    { nodes: [{ id: "p1", refs: [] }], roots: ["p1"] },
    { classes: "not-an-array" },
  );
  assertEquals(result.findings.map((f) => f.code), [
    "LONE_ONTOLOGY_INVALID_INPUT",
  ]);
});
