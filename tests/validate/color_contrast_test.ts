import { assertEquals } from "@std/assert";
import { validateColorContrast } from "../../src/validate/color_contrast.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

Deno.test("validateColorContrast - passes high contrast text", () => {
  const node: SemanticNodeType = {
    type: "span",
    props: { color: "#000000", backgroundColor: "#ffffff" },
    children: [],
  };

  const findings = validateColorContrast(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateColorContrast - flags low contrast text", () => {
  const node: SemanticNodeType = {
    type: "span",
    props: { color: "#777777", backgroundColor: "#ffffff" },
    children: [],
  };

  const findings = validateColorContrast(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_COLOR_INSUFFICIENT_CONTRAST");
});

Deno.test("validateColorContrast - allows large text at lower ratio", () => {
  const node: SemanticNodeType = {
    type: "span",
    props: { color: "#777777", backgroundColor: "#ffffff", fontSize: 24 },
    children: [],
  };

  const findings = validateColorContrast(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateColorContrast - flags white on white", () => {
  const node: SemanticNodeType = {
    type: "span",
    props: { color: "#ffffff", backgroundColor: "#ffffff" },
    children: [],
  };

  const findings = validateColorContrast(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_COLOR_INSUFFICIENT_CONTRAST");
});

Deno.test("validateColorContrast - uses non-text contrast threshold", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: { color: "#777777", backgroundColor: "#ffffff", nonText: true },
    children: [],
  };

  const findings = validateColorContrast(node);

  assertEquals(findings.length, 0);
});
