import { assertEquals } from "@std/assert";
import { validateSemanticHTML } from "../../src/validate/semantic_html.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

// ============================================================================
// Heading Hierarchy Tests
// ============================================================================

Deno.test("validateSemanticHTML - valid heading hierarchy (h1 -> h2 -> h3)", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "h1",
        role: "heading",
        name: "Main Title",
        props: { "aria-level": 1 },
        children: [],
      },
      {
        type: "h2",
        role: "heading",
        name: "Section",
        props: { "aria-level": 2 },
        children: [],
      },
      {
        type: "h3",
        role: "heading",
        name: "Subsection",
        props: { "aria-level": 3 },
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const headingFindings = findings.filter((f) =>
    f.code === "LONE_SEMANTIC_HEADING_LEVEL_SKIP"
  );

  assertEquals(headingFindings.length, 0);
});

Deno.test("validateSemanticHTML - flags heading level skip (h1 -> h3)", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "h1",
        role: "heading",
        name: "Main Title",
        props: { "aria-level": 1 },
        children: [],
      },
      {
        type: "h3",
        role: "heading",
        name: "Subsection",
        props: { "aria-level": 3 },
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const headingSkip = findings.find((f) =>
    f.code === "LONE_SEMANTIC_HEADING_LEVEL_SKIP"
  );

  assertEquals(headingSkip !== undefined, true);
  assertEquals(
    headingSkip?.message.includes("skips level"),
    true,
  );
});

Deno.test("validateSemanticHTML - allows jumping back to lower levels (h3 -> h2)", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "h1",
        role: "heading",
        name: "Main",
        props: { "aria-level": 1 },
        children: [],
      },
      {
        type: "h2",
        role: "heading",
        name: "Section",
        props: { "aria-level": 2 },
        children: [],
      },
      {
        type: "h3",
        role: "heading",
        name: "Subsection",
        props: { "aria-level": 3 },
        children: [],
      },
      {
        type: "h2",
        role: "heading",
        name: "Another Section",
        props: { "aria-level": 2 },
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const headingSkip = findings.find((f) =>
    f.code === "LONE_SEMANTIC_HEADING_LEVEL_SKIP"
  );

  assertEquals(headingSkip, undefined);
});

Deno.test("validateSemanticHTML - warns about missing h1", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "h2",
        role: "heading",
        name: "Section",
        props: { "aria-level": 2 },
        children: [],
      },
      {
        type: "h3",
        role: "heading",
        name: "Subsection",
        props: { "aria-level": 3 },
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const missingH1 = findings.find((f) => f.code === "LONE_SEMANTIC_MISSING_H1");

  assertEquals(missingH1 !== undefined, true);
  assertEquals(missingH1?.severity, "warning");
});

// ============================================================================
// Button vs Link Usage Tests
// ============================================================================

Deno.test("validateSemanticHTML - valid button (no href)", () => {
  const node: SemanticNodeType = {
    type: "button",
    name: "Submit",
    props: { onclick: "submit()" },
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const buttonLinkFindings = findings.filter((f) =>
    f.code.startsWith("LONE_SEMANTIC_BUTTON_") ||
    f.code.startsWith("LONE_SEMANTIC_LINK_")
  );

  assertEquals(buttonLinkFindings.length, 0);
});

Deno.test("validateSemanticHTML - valid link (has href, no onclick)", () => {
  const node: SemanticNodeType = {
    type: "a",
    name: "Go to page",
    props: { href: "/page" },
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const buttonLinkFindings = findings.filter((f) =>
    f.code.startsWith("LONE_SEMANTIC_BUTTON_") ||
    f.code.startsWith("LONE_SEMANTIC_LINK_")
  );

  assertEquals(buttonLinkFindings.length, 0);
});

Deno.test("validateSemanticHTML - flags link with onclick", () => {
  const node: SemanticNodeType = {
    type: "a",
    name: "Click me",
    props: { href: "#", onclick: "doAction()" },
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const linkOnclick = findings.find((f) =>
    f.code === "LONE_SEMANTIC_LINK_WITH_ONCLICK"
  );

  assertEquals(linkOnclick !== undefined, true);
  assertEquals(
    linkOnclick?.message.includes("Use <button> for actions"),
    true,
  );
});

Deno.test("validateSemanticHTML - flags link without href", () => {
  const node: SemanticNodeType = {
    type: "a",
    name: "Click me",
    props: {},
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const linkNoHref = findings.find((f) =>
    f.code === "LONE_SEMANTIC_LINK_WITHOUT_HREF"
  );

  assertEquals(linkNoHref !== undefined, true);
  assertEquals(
    linkNoHref?.message.includes("missing href"),
    true,
  );
});

Deno.test("validateSemanticHTML - flags button with href", () => {
  const node: SemanticNodeType = {
    type: "button",
    name: "Navigate",
    props: { href: "/page" },
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const buttonHref = findings.find((f) =>
    f.code === "LONE_SEMANTIC_BUTTON_WITH_HREF"
  );

  assertEquals(buttonHref !== undefined, true);
  assertEquals(
    buttonHref?.message.includes("Use <a> for navigation"),
    true,
  );
});

// ============================================================================
// List Structure Tests
// ============================================================================

Deno.test("validateSemanticHTML - valid list structure (ul > li)", () => {
  const node: SemanticNodeType = {
    type: "ul",
    role: "list",
    props: {},
    children: [
      {
        type: "li",
        role: "listitem",
        name: "Item 1",
        props: {},
        children: [],
      },
      {
        type: "li",
        role: "listitem",
        name: "Item 2",
        props: {},
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const listFindings = findings.filter((f) =>
    f.code === "LONE_SEMANTIC_INVALID_LIST_CHILD"
  );

  assertEquals(listFindings.length, 0);
});

Deno.test("validateSemanticHTML - flags invalid list child (ul > div)", () => {
  const node: SemanticNodeType = {
    type: "ul",
    role: "list",
    props: {},
    children: [
      {
        type: "li",
        role: "listitem",
        name: "Item 1",
        props: {},
        children: [],
      },
      {
        type: "div",
        name: "Not a list item!",
        props: {},
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const invalidChild = findings.find((f) =>
    f.code === "LONE_SEMANTIC_INVALID_LIST_CHILD"
  );

  assertEquals(invalidChild !== undefined, true);
  assertEquals(
    invalidChild?.message.includes("List child must be <li>"),
    true,
  );
  assertEquals(invalidChild?.path, "$.children[1]");
});

Deno.test("validateSemanticHTML - accepts role='listitem' as valid", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "list",
    props: {},
    children: [
      {
        type: "div",
        role: "listitem",
        name: "Custom list item",
        props: {},
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const listFindings = findings.filter((f) =>
    f.code === "LONE_SEMANTIC_INVALID_LIST_CHILD"
  );

  assertEquals(listFindings.length, 0);
});

// ============================================================================
// Table Semantics Tests
// ============================================================================

Deno.test("validateSemanticHTML - valid table with thead and th", () => {
  const node: SemanticNodeType = {
    type: "table",
    role: "table",
    props: {},
    children: [
      {
        type: "thead",
        props: {},
        children: [
          {
            type: "tr",
            role: "row",
            props: {},
            children: [
              {
                type: "th",
                role: "columnheader",
                name: "Name",
                props: { scope: "col" },
                children: [],
              },
              {
                type: "th",
                role: "columnheader",
                name: "Age",
                props: { scope: "col" },
                children: [],
              },
            ],
          },
        ],
      },
      {
        type: "tbody",
        props: {},
        children: [
          {
            type: "tr",
            role: "row",
            props: {},
            children: [
              {
                type: "td",
                role: "cell",
                name: "Alice",
                props: {},
                children: [],
              },
              {
                type: "td",
                role: "cell",
                name: "30",
                props: {},
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const tableFindings = findings.filter((f) =>
    f.code.startsWith("LONE_SEMANTIC_TABLE_")
  );

  // Should have no errors (maybe info suggestions)
  const errors = tableFindings.filter((f) => f.severity === "error");
  assertEquals(errors.length, 0);
});

Deno.test("validateSemanticHTML - warns about th without scope", () => {
  const node: SemanticNodeType = {
    type: "table",
    role: "table",
    props: {},
    children: [
      {
        type: "thead",
        props: {},
        children: [
          {
            type: "tr",
            role: "row",
            props: {},
            children: [
              {
                type: "th",
                role: "columnheader",
                name: "Name",
                props: {}, // Missing scope!
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const thScope = findings.find((f) =>
    f.code === "LONE_SEMANTIC_TH_MISSING_SCOPE"
  );

  assertEquals(thScope !== undefined, true);
  assertEquals(thScope?.severity, "warning");
});

Deno.test("validateSemanticHTML - suggests thead/tbody for complex tables", () => {
  const node: SemanticNodeType = {
    type: "table",
    role: "table",
    props: {},
    children: [
      { type: "tr", role: "row", props: {}, children: [] },
      { type: "tr", role: "row", props: {}, children: [] },
      { type: "tr", role: "row", props: {}, children: [] },
      { type: "tr", role: "row", props: {}, children: [] },
      { type: "tr", role: "row", props: {}, children: [] },
    ],
  };

  const findings = validateSemanticHTML(node);
  const theadSuggestion = findings.find((f) =>
    f.code === "LONE_SEMANTIC_TABLE_MISSING_THEAD_TBODY"
  );

  assertEquals(theadSuggestion !== undefined, true);
  assertEquals(theadSuggestion?.severity, "info");
});

Deno.test("validateSemanticHTML - warns about missing header cells", () => {
  const node: SemanticNodeType = {
    type: "table",
    role: "table",
    props: {},
    children: [
      {
        type: "tbody",
        props: {},
        children: [
          {
            type: "tr",
            role: "row",
            props: {},
            children: [
              {
                type: "td",
                role: "cell",
                name: "Data",
                props: {},
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const missingHeaders = findings.find((f) =>
    f.code === "LONE_SEMANTIC_TABLE_MISSING_HEADERS"
  );

  assertEquals(missingHeaders !== undefined, true);
  assertEquals(missingHeaders?.severity, "warning");
});

// ============================================================================
// Form Label Association Tests
// ============================================================================

Deno.test("validateSemanticHTML - valid form input with label", () => {
  const node: SemanticNodeType = {
    type: "form",
    props: {},
    children: [
      {
        type: "label",
        name: "Email:",
        props: { for: "email-input" },
        children: [],
      },
      {
        type: "input",
        role: "textbox",
        props: { id: "email-input", type: "email" },
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);
  const formFindings = findings.filter((f) =>
    f.code === "LONE_SEMANTIC_FORM_CONTROL_UNLABELED"
  );

  assertEquals(formFindings.length, 0);
});

Deno.test("validateSemanticHTML - valid form input with aria-label", () => {
  const node: SemanticNodeType = {
    type: "input",
    role: "textbox",
    props: { "aria-label": "Search query", type: "search" },
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const formFindings = findings.filter((f) =>
    f.code === "LONE_SEMANTIC_FORM_CONTROL_UNLABELED"
  );

  assertEquals(formFindings.length, 0);
});

Deno.test("validateSemanticHTML - valid form input with accessible name", () => {
  const node: SemanticNodeType = {
    type: "input",
    name: "Email address",
    role: "textbox",
    props: { type: "email" },
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const formFindings = findings.filter((f) =>
    f.code === "LONE_SEMANTIC_FORM_CONTROL_UNLABELED"
  );

  assertEquals(formFindings.length, 0);
});

Deno.test("validateSemanticHTML - flags unlabeled form input", () => {
  const node: SemanticNodeType = {
    type: "input",
    role: "textbox",
    props: { type: "text" },
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const unlabeled = findings.find((f) =>
    f.code === "LONE_SEMANTIC_FORM_CONTROL_UNLABELED"
  );

  assertEquals(unlabeled !== undefined, true);
  assertEquals(
    unlabeled?.message.includes("should have associated <label>"),
    true,
  );
});

Deno.test("validateSemanticHTML - flags select without label", () => {
  const node: SemanticNodeType = {
    type: "select",
    role: "combobox",
    props: {},
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const unlabeled = findings.find((f) =>
    f.code === "LONE_SEMANTIC_FORM_CONTROL_UNLABELED"
  );

  assertEquals(unlabeled !== undefined, true);
});

Deno.test("validateSemanticHTML - flags textarea without label", () => {
  const node: SemanticNodeType = {
    type: "textarea",
    role: "textbox",
    props: {},
    children: [],
  };

  const findings = validateSemanticHTML(node);
  const unlabeled = findings.find((f) =>
    f.code === "LONE_SEMANTIC_FORM_CONTROL_UNLABELED"
  );

  assertEquals(unlabeled !== undefined, true);
});

// ============================================================================
// Integration Tests
// ============================================================================

Deno.test("validateSemanticHTML - complex document with multiple issues", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "h1",
        role: "heading",
        name: "Title",
        props: { "aria-level": 1 },
        children: [],
      },
      {
        type: "h3", // Skip h2!
        role: "heading",
        name: "Section",
        props: { "aria-level": 3 },
        children: [],
      },
      {
        type: "a",
        name: "Click me",
        props: { onclick: "alert('hi')" }, // Link with onclick!
        children: [],
      },
      {
        type: "ul",
        role: "list",
        props: {},
        children: [
          {
            type: "div", // Invalid list child!
            name: "Item",
            props: {},
            children: [],
          },
        ],
      },
      {
        type: "input", // Unlabeled input!
        role: "textbox",
        props: { type: "text" },
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);

  // Should catch all 5 issues
  const headingSkip = findings.find((f) =>
    f.code === "LONE_SEMANTIC_HEADING_LEVEL_SKIP"
  );
  const linkOnclick = findings.find((f) =>
    f.code === "LONE_SEMANTIC_LINK_WITH_ONCLICK"
  );
  const linkNoHref = findings.find((f) =>
    f.code === "LONE_SEMANTIC_LINK_WITHOUT_HREF"
  );
  const invalidList = findings.find((f) =>
    f.code === "LONE_SEMANTIC_INVALID_LIST_CHILD"
  );
  const unlabeled = findings.find((f) =>
    f.code === "LONE_SEMANTIC_FORM_CONTROL_UNLABELED"
  );

  assertEquals(headingSkip !== undefined, true);
  assertEquals(linkOnclick !== undefined, true);
  assertEquals(linkNoHref !== undefined, true);
  assertEquals(invalidList !== undefined, true);
  assertEquals(unlabeled !== undefined, true);
});

Deno.test("validateSemanticHTML - fully accessible document passes", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "h1",
        role: "heading",
        name: "Main Title",
        props: { "aria-level": 1 },
        children: [],
      },
      {
        type: "h2",
        role: "heading",
        name: "Section",
        props: { "aria-level": 2 },
        children: [],
      },
      {
        type: "a",
        name: "Learn more",
        props: { href: "/learn" },
        children: [],
      },
      {
        type: "button",
        name: "Submit form",
        props: { onclick: "submit()" },
        children: [],
      },
      {
        type: "ul",
        role: "list",
        props: {},
        children: [
          {
            type: "li",
            role: "listitem",
            name: "Item 1",
            props: {},
            children: [],
          },
        ],
      },
      {
        type: "label",
        name: "Email:",
        props: { for: "email" },
        children: [],
      },
      {
        type: "input",
        role: "textbox",
        props: { id: "email", type: "email" },
        children: [],
      },
    ],
  };

  const findings = validateSemanticHTML(node);

  // Should only have LONE_SEMANTIC_MISSING_H1 as warning (if any)
  const errors = findings.filter((f) => f.severity === "error");
  assertEquals(errors.length, 0);
});
