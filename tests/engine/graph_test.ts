import { assertEquals } from "@std/assert";
import { validateGraph } from "../../src/engine/mod.ts";

Deno.test("validateGraph - clean graph yields no findings", async () => {
  const result = await validateGraph({
    nodes: [
      { id: "home", refs: ["about"] },
      { id: "about", refs: [] },
    ],
    roots: ["home"],
  });
  assertEquals(result.findings.length, 0);
});

Deno.test("validateGraph - non-graph input is a single invalid-input finding", async () => {
  const result = await validateGraph("not a graph");
  assertEquals(result.findings.length, 1);
  assertEquals(result.findings[0].code, "LONE_GRAPH_INVALID_INPUT");
  assertEquals(result.findings[0].severity, "error");
});

Deno.test("validateGraph - findings are sorted deterministically", async () => {
  const result = await validateGraph({
    nodes: [
      { id: "home", refs: ["ghost"] },
      { id: "home", refs: [] },
      { id: "stray", refs: [] },
    ],
    roots: ["home"],
  });
  // errors first, then by code: DANGLING_REF, DUPLICATE_ID, ORPHAN (alphabetical)
  const codes = result.findings.map((f) => f.code);
  const sorted = [...codes].sort();
  assertEquals(codes, sorted);
});
