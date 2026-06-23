import { assertEquals } from "@std/assert";
import { validateSemanticHTML } from "../../src/validate/semantic_html.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";
import { goodSemanticsSemanticNode } from "../../examples/mdn-good-semantics/good_semantics.ts";

Deno.test("validateSemanticHTML - MDN good-semantics example passes", () => {
  const findings = validateSemanticHTML(goodSemanticsSemanticNode);

  assertEquals(findings.length, 0);
});

Deno.test("validateSemanticHTML - bad semantics triggers all core checks", () => {
  const badNode: SemanticNodeType = {
    type: "article",
    props: {},
    children: [
      {
        type: "h1",
        role: "heading",
        name: "Title",
        props: {},
        children: [],
      },
      {
        type: "h3",
        role: "heading",
        name: "Skipped level",
        props: {},
        children: [],
      },
      { type: "a", props: {}, children: [] },
      {
        type: "ul",
        props: {},
        children: [{ type: "div", props: {}, children: [] }],
      },
      {
        type: "table",
        props: {},
        children: [
          {
            type: "tr",
            props: {},
            children: [{ type: "td", props: {}, children: [] }],
          },
        ],
      },
      {
        type: "form",
        props: {},
        children: [{ type: "input", props: {}, children: [] }],
      },
    ],
  };

  const findings = validateSemanticHTML(badNode);
  const codes = findings.map((finding) => finding.code);

  assertEquals(codes.includes("LONE_SEMANTIC_HEADING_LEVEL_SKIP"), true);
  assertEquals(codes.includes("LONE_SEMANTIC_LINK_WITHOUT_HREF"), true);
  assertEquals(codes.includes("LONE_SEMANTIC_INVALID_LIST_CHILD"), true);
  assertEquals(codes.includes("LONE_SEMANTIC_TABLE_MISSING_HEADERS"), true);
  assertEquals(codes.includes("LONE_SEMANTIC_FORM_CONTROL_UNLABELED"), true);
});
