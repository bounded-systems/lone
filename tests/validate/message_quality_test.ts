import { assert } from "@std/assert";
import type { FindingType } from "../../src/contracts/finding.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";
import { validateSemanticHTML } from "../../src/validate/semantic_html.ts";
import { validateNameRequired } from "../../src/validate/nameable.ts";
import { validateKeyboardAccessible } from "../../src/validate/keyboard_accessible.ts";
import { validateTextAlternatives } from "../../src/validate/text_alternatives.ts";
import { validateARIAUsage } from "../../src/validate/aria_usage.ts";
import { validateScreenReaderContent } from "../../src/validate/screen_reader_content.ts";
import { validateColorContrast } from "../../src/validate/color_contrast.ts";

const actionRegex =
  /(must|should|use|add|provide|include|remove|ensure|avoid|requires|increase)/i;

const exampleRequiredCodes = new Set([
  "LONE_ARIA_INVALID_ATTRIBUTE_VALUE",
]);

function assertMessageQuality(finding: FindingType) {
  assert(finding.message === finding.message.trim());
  assert(/^[A-Z]/.test(finding.message));
  assert(/\.$/.test(finding.message));
  assert(actionRegex.test(finding.message));

  if (exampleRequiredCodes.has(finding.code)) {
    assert(/one of:/i.test(finding.message));
  }
}

function findByCode(findings: FindingType[], code: string): FindingType {
  const found = findings.find((finding) => finding.code === code);
  assert(found, `Expected finding ${code}`);
  return found;
}

function n(
  type: string,
  options: {
    role?: string;
    name?: string;
    props?: Record<string, unknown>;
    children?: SemanticNodeType[];
  } = {},
): SemanticNodeType {
  return {
    type,
    role: options.role,
    name: options.name,
    props: options.props ?? {},
    children: options.children ?? [],
  };
}

Deno.test("Finding messages - semantic HTML rules are actionable", () => {
  const root = n("div", {
    children: [
      n("h1", { role: "heading" }),
      n("h3", { role: "heading" }),
      n("a", { props: { onclick: true } }),
      n("a"),
      n("button", { props: { href: "/docs" } }),
      n("ul", { children: [n("div")] }),
      n("table", {
        children: [
          n("tr", { children: [n("th", { props: { scope: "col" } })] }),
          n("tr"),
          n("tr"),
          n("tr"),
        ],
      }),
      n("table", { children: [n("tr", { children: [n("th")] })] }),
      n("table", { children: [n("tr", { children: [n("td")] })] }),
      n("input", { props: { id: "email" } }),
    ],
  });

  const findings = validateSemanticHTML(root);

  [
    "LONE_SEMANTIC_HEADING_LEVEL_SKIP",
    "LONE_SEMANTIC_LINK_WITH_ONCLICK",
    "LONE_SEMANTIC_LINK_WITHOUT_HREF",
    "LONE_SEMANTIC_BUTTON_WITH_HREF",
    "LONE_SEMANTIC_INVALID_LIST_CHILD",
    "LONE_SEMANTIC_TH_MISSING_SCOPE",
    "LONE_SEMANTIC_TABLE_MISSING_THEAD_TBODY",
    "LONE_SEMANTIC_TABLE_MISSING_HEADERS",
    "LONE_SEMANTIC_FORM_CONTROL_UNLABELED",
  ].forEach((code) => assertMessageQuality(findByCode(findings, code)));
});

Deno.test("Finding messages - heading warnings include h1 guidance", () => {
  const findings = validateSemanticHTML(
    n("div", { children: [n("h2", { role: "heading" })] }),
  );

  assertMessageQuality(findByCode(findings, "LONE_SEMANTIC_MISSING_H1"));
});

Deno.test("Finding messages - name required rules are actionable", () => {
  const findings = validateNameRequired(n("button"));

  assertMessageQuality(findByCode(findings, "LONE_NAME_MISSING"));
});

Deno.test("Finding messages - keyboard accessibility rules are actionable", () => {
  const root = n("div", {
    children: [
      n("button", { props: { tabIndex: -1 } }),
      n("div", { role: "button", props: { focusable: false } }),
      n("div", { role: "button", props: { keyboardHandlers: ["enter"] } }),
      n("div", { role: "dialog", props: { keyboardHandlers: ["enter"] } }),
      n("div", { role: "menu", props: { keyboardHandlers: ["enter"] } }),
      n("div", { role: "button", props: { tabIndex: 3 } }),
      n("div", { role: "button", props: { tabIndex: 2 } }),
      n("div", {
        role: "button",
        props: { keyboardTrap: true, keyboardHandlers: ["enter"] },
      }),
      n("div", { role: "button", props: { focusVisible: false } }),
    ],
  });

  const findings = validateKeyboardAccessible(root);

  [
    "LONE_KEYBOARD_NEGATIVE_TABINDEX",
    "LONE_KEYBOARD_NOT_FOCUSABLE",
    "LONE_KEYBOARD_MISSING_TABINDEX",
    "LONE_KEYBOARD_MISSING_KEYBOARD_HANDLER",
    "LONE_KEYBOARD_MISSING_ESCAPE_HANDLER",
    "LONE_KEYBOARD_MISSING_ARROW_KEY_SUPPORT",
    "LONE_KEYBOARD_TABINDEX_OUT_OF_ORDER",
    "LONE_KEYBOARD_TRAP",
    "LONE_KEYBOARD_MISSING_FOCUS_INDICATOR",
  ].forEach((code) => assertMessageQuality(findByCode(findings, code)));
});

Deno.test("Finding messages - text alternatives rules are actionable", () => {
  const root = n("div", {
    children: [
      n("img"),
      n("img", { props: { alt: "" } }),
      n("svg"),
      n("video"),
      n("button", { props: { iconOnly: true } }),
      n("canvas"),
    ],
  });

  const findings = validateTextAlternatives(root);

  [
    "LONE_TEXT_MISSING_ALT",
    "LONE_TEXT_EMPTY_ALT_MEANINGFUL",
    "LONE_TEXT_MISSING_SVG_ALT",
    "LONE_TEXT_MISSING_MEDIA_ALT",
    "LONE_TEXT_ICON_BUTTON_MISSING_LABEL",
    "LONE_TEXT_MISSING_FALLBACK_CONTENT",
  ].forEach((code) => assertMessageQuality(findByCode(findings, code)));
});

Deno.test("Finding messages - ARIA usage rules are actionable", () => {
  const root = n("div", {
    children: [
      n("div", { role: "checkbox" }),
      n("div", { role: "checkbox", props: { "aria-checked": "maybe" } }),
      n("button", { role: "button", props: { role: "button" } }),
      n("button", { role: "link" }),
      n("div", { role: "textbox", props: { "aria-labelledby": "missing-id" } }),
      n("div", { role: "status", props: { "aria-live": "nope" } }),
    ],
  });

  const findings = validateARIAUsage(root);

  [
    "LONE_ARIA_REQUIRED_ATTRIBUTE_MISSING",
    "LONE_ARIA_INVALID_ATTRIBUTE_VALUE",
    "LONE_ARIA_REDUNDANT_ROLE",
    "LONE_ARIA_CONFLICTING_ROLE",
    "LONE_ARIA_RELATIONSHIP_MISSING_TARGET",
    "LONE_ARIA_LIVE_INVALID",
  ].forEach((code) => assertMessageQuality(findByCode(findings, code)));
});

Deno.test("Finding messages - screen reader content rules are actionable", () => {
  const root = n("div", {
    children: [
      n("div", { props: { display: "none" } }),
      n("button", { props: { display: "none" } }),
      n("button", { props: { "aria-hidden": true, tabIndex: 0 } }),
      n("div", { props: { className: "sr-only" } }),
    ],
  });

  const findings = validateScreenReaderContent(root);

  [
    "LONE_SR_CONTENT_HIDDEN",
    "LONE_SR_INTERACTIVE_HIDDEN",
    "LONE_SR_ARIA_HIDDEN_FOCUSABLE",
    "LONE_SR_ONLY_NO_TEXT",
  ].forEach((code) => assertMessageQuality(findByCode(findings, code)));
});

Deno.test("Finding messages - color contrast rules are actionable", () => {
  const root = n("div", {
    props: { color: "#111111", backgroundColor: "#121212" },
  });

  const findings = validateColorContrast(root);

  assertMessageQuality(
    findByCode(findings, "LONE_COLOR_INSUFFICIENT_CONTRAST"),
  );
});
