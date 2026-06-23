import { assertEquals } from "@std/assert";
import { validateARIAUsage } from "../../src/validate/aria_usage.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

Deno.test("validateARIAUsage - passes valid checkbox with aria-checked", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "checkbox",
    props: { "aria-checked": "true" },
    children: [],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateARIAUsage - flags missing required aria attribute", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "checkbox",
    props: {},
    children: [],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_ARIA_REQUIRED_ATTRIBUTE_MISSING");
});

Deno.test("validateARIAUsage - flags invalid aria attribute value", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "checkbox",
    props: { "aria-checked": "maybe" },
    children: [],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_ARIA_INVALID_ATTRIBUTE_VALUE");
});

Deno.test("validateARIAUsage - flags redundant role", () => {
  const node: SemanticNodeType = {
    type: "button",
    role: "button",
    props: { role: "button" },
    children: [],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_ARIA_REDUNDANT_ROLE");
});

Deno.test("validateARIAUsage - flags conflicting role", () => {
  const node: SemanticNodeType = {
    type: "button",
    role: "link",
    props: {},
    children: [],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_ARIA_CONFLICTING_ROLE");
});

Deno.test("validateARIAUsage - flags missing relationship target", () => {
  const node: SemanticNodeType = {
    type: "button",
    role: "button",
    props: { role: "button", "aria-labelledby": "missing-id" },
    children: [],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 2);
  assertEquals(findings[0].code, "LONE_ARIA_REDUNDANT_ROLE");
  assertEquals(findings[1].code, "LONE_ARIA_RELATIONSHIP_MISSING_TARGET");
});

Deno.test("validateARIAUsage - passes aria-labelledby when target exists", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: { id: "label" },
    children: [
      {
        type: "div",
        role: "checkbox",
        props: { "aria-checked": "false", "aria-labelledby": "label" },
        children: [],
      },
    ],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateARIAUsage - flags invalid aria-live", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "status",
    props: { "aria-live": "loud" },
    children: [],
  };

  const findings = validateARIAUsage(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_ARIA_LIVE_INVALID");
});
