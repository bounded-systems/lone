import { assertEquals } from "@std/assert";
import { validateNameRequired } from "../../src/validate/nameable.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

Deno.test("validateNameRequired - flags unnamed button", () => {
  const node: SemanticNodeType = {
    type: "button",
    props: {},
    children: [],
  };

  const findings = validateNameRequired(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_NAME_MISSING");
  assertEquals(findings[0].path, "$");
  assertEquals(
    findings[0].message,
    "Interactive element 'button' must have a name.",
  );
});

Deno.test("validateNameRequired - passes named button", () => {
  const node: SemanticNodeType = {
    type: "button",
    name: "Submit",
    props: {},
    children: [],
  };

  const findings = validateNameRequired(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateNameRequired - passes non-interactive element without name", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [],
  };

  const findings = validateNameRequired(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateNameRequired - walks nested children", () => {
  const node: SemanticNodeType = {
    type: "div",
    name: "container",
    props: {},
    children: [
      {
        type: "button",
        name: "OK",
        props: {},
        children: [],
      },
      {
        type: "section",
        props: {},
        children: [
          {
            type: "link",
            // Missing name!
            props: {},
            children: [],
          },
        ],
      },
    ],
  };

  const findings = validateNameRequired(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_NAME_MISSING");
  assertEquals(findings[0].path, "$.children[1].children[0]");
  assertEquals(
    findings[0].message,
    "Interactive element 'link' must have a name.",
  );
});

Deno.test("validateNameRequired - flags multiple unnamed interactive elements", () => {
  const node: SemanticNodeType = {
    type: "form",
    props: {},
    children: [
      {
        type: "textbox",
        props: {},
        children: [],
      },
      {
        type: "checkbox",
        props: {},
        children: [],
      },
      {
        type: "radio",
        props: {},
        children: [],
      },
    ],
  };

  const findings = validateNameRequired(node);

  assertEquals(findings.length, 3);
  assertEquals(findings[0].path, "$.children[0]");
  assertEquals(findings[1].path, "$.children[1]");
  assertEquals(findings[2].path, "$.children[2]");
});

Deno.test("validateNameRequired - rejects empty name string", () => {
  const node: SemanticNodeType = {
    type: "button",
    name: "",
    props: {},
    children: [],
  };

  const findings = validateNameRequired(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_NAME_MISSING");
});

Deno.test("validateNameRequired - accepts whitespace-only name as valid", () => {
  const node: SemanticNodeType = {
    type: "button",
    name: "   ",
    props: {},
    children: [],
  };

  const findings = validateNameRequired(node);

  // Whitespace-only is technically non-empty, so it passes
  assertEquals(findings.length, 0);
});
