import { assertEquals } from "jsr:@std/assert";
import { unfoldNode } from "../../src/engine/unfold.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

function node(
  type: string,
  name?: string,
  children: SemanticNodeType[] = [],
  props: Record<string, unknown> = {},
): SemanticNodeType {
  return { type, name, children, props };
}

Deno.test("unfoldNode - heading h1 extracts at level 1", () => {
  const { nodes } = unfoldNode(node("div", undefined, [node("h1", "The model")]));
  assertEquals(nodes, [{ kind: "heading", level: 1, text: "The model" }]);
});

Deno.test("unfoldNode - heading h3 extracts at level 3", () => {
  const { nodes } = unfoldNode(node("h3", "Sub-section"));
  assertEquals(nodes, [{ kind: "heading", level: 3, text: "Sub-section" }]);
});

Deno.test("unfoldNode - paragraph extracted from p", () => {
  const { nodes } = unfoldNode(node("p", "Hello world"));
  assertEquals(nodes, [{ kind: "paragraph", text: "Hello world" }]);
});

Deno.test("unfoldNode - pre extracted as preFormatted code", () => {
  const { nodes } = unfoldNode(node("pre", "const x = 1;"));
  assertEquals(nodes, [{ kind: "code", text: "const x = 1;", preFormatted: true }]);
});

Deno.test("unfoldNode - code extracted as not-preFormatted", () => {
  const { nodes } = unfoldNode(node("code", "x = 1"));
  assertEquals(nodes, [{ kind: "code", text: "x = 1", preFormatted: false }]);
});

Deno.test("unfoldNode - empty pre produces no node", () => {
  const { nodes } = unfoldNode(node("pre", "   "));
  assertEquals(nodes.length, 0);
});

Deno.test("unfoldNode - ul extracts ordered=false list", () => {
  const { nodes } = unfoldNode(
    node("ul", undefined, [node("li", "alpha"), node("li", "beta")]),
  );
  assertEquals(nodes, [{ kind: "list", ordered: false, items: ["alpha", "beta"] }]);
});

Deno.test("unfoldNode - ol extracts ordered=true list", () => {
  const { nodes } = unfoldNode(
    node("ol", undefined, [node("li", "first"), node("li", "second")]),
  );
  assertEquals(nodes, [{ kind: "list", ordered: true, items: ["first", "second"] }]);
});

Deno.test("unfoldNode - aria-hidden subtree is skipped", () => {
  const { nodes } = unfoldNode(
    node("div", undefined, [
      node("h1", "Visible"),
      node("div", undefined, [node("h2", "Hidden")], { "aria-hidden": "true" }),
    ]),
  );
  assertEquals(nodes.length, 1);
  assertEquals(nodes[0], { kind: "heading", level: 1, text: "Visible" });
});

Deno.test("unfoldNode - aria-hidden true (boolean) subtree is skipped", () => {
  const { nodes } = unfoldNode(
    node("div", undefined, [
      node("p", "Keep this"),
      node("p", "Skip this", [], { "aria-hidden": true }),
    ]),
  );
  assertEquals(nodes.length, 1);
  assertEquals(nodes[0], { kind: "paragraph", text: "Keep this" });
});

Deno.test("unfoldNode - div.code produces LONE_READER_CODE_NOT_PRE finding", () => {
  const { findings } = unfoldNode(
    node("div", "const x = 1;", [], { class: "code" }),
  );
  assertEquals(findings.some((f) => f.code === "LONE_READER_CODE_NOT_PRE"), true);
});

Deno.test("unfoldNode - pre.code produces no reader findings", () => {
  const { findings } = unfoldNode(node("pre", "const x = 1;", [], { class: "code" }));
  assertEquals(
    findings.some((f) => f.code === "LONE_READER_CODE_NOT_PRE"),
    false,
  );
});

Deno.test("unfoldNode - deep nesting is traversed", () => {
  const { nodes } = unfoldNode(
    node("main", undefined, [
      node("section", undefined, [
        node("div", undefined, [
          node("h2", "Deep heading"),
          node("p", "Deep paragraph"),
        ]),
      ]),
    ]),
  );
  assertEquals(nodes, [
    { kind: "heading", level: 2, text: "Deep heading" },
    { kind: "paragraph", text: "Deep paragraph" },
  ]);
});

Deno.test("unfoldNode - returns empty nodes and no findings for empty div", () => {
  const { nodes, findings } = unfoldNode(node("div"));
  assertEquals(nodes.length, 0);
  assertEquals(findings.length, 0);
});
