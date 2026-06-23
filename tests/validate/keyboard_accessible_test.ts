import { assertEquals } from "@std/assert";
import {
  simulateTabNavigation,
  validateKeyboardAccessible,
} from "../../src/validate/keyboard_accessible.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

Deno.test("validateKeyboardAccessible - flags non-tabbable interactive elements", () => {
  const node: SemanticNodeType = {
    type: "form",
    props: {},
    children: [
      {
        type: "button",
        props: { tabIndex: -1 },
        children: [],
      },
      {
        type: "link",
        props: { focusable: false },
        children: [],
      },
    ],
  };

  const findings = validateKeyboardAccessible(node);
  const codes = findings.map((finding) => finding.code);

  assertEquals(codes.includes("LONE_KEYBOARD_NEGATIVE_TABINDEX"), true);
  assertEquals(codes.includes("LONE_KEYBOARD_NOT_FOCUSABLE"), true);
});

Deno.test("validateKeyboardAccessible - requires tabindex for custom interactive elements", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "button",
    props: { keyboardHandlers: ["Enter", "Space"] },
    children: [],
  };

  const findings = validateKeyboardAccessible(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_KEYBOARD_MISSING_TABINDEX");
});

Deno.test("validateKeyboardAccessible - validates keyboard activation keys", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "button",
    props: { tabIndex: 0, keyboardHandlers: ["Enter"] },
    children: [],
  };

  const findings = validateKeyboardAccessible(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_KEYBOARD_MISSING_KEYBOARD_HANDLER");
});

Deno.test("validateKeyboardAccessible - requires Escape to close modal", () => {
  const node: SemanticNodeType = {
    type: "dialog",
    role: "dialog",
    props: { "aria-modal": true, keyboardHandlers: ["Enter"] },
    children: [],
  };

  const findings = validateKeyboardAccessible(node);
  const codes = findings.map((finding) => finding.code);

  assertEquals(codes.includes("LONE_KEYBOARD_MISSING_ESCAPE_HANDLER"), true);
});

Deno.test("validateKeyboardAccessible - requires arrow keys for widgets", () => {
  const node: SemanticNodeType = {
    type: "listbox",
    role: "listbox",
    props: { keyboardHandlers: ["Enter"] },
    children: [],
  };

  const findings = validateKeyboardAccessible(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_KEYBOARD_MISSING_ARROW_KEY_SUPPORT");
});

Deno.test("validateKeyboardAccessible - flags keyboard traps without escape", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "region",
    props: { keyboardTrap: true, keyboardHandlers: ["Enter"] },
    children: [],
  };

  const findings = validateKeyboardAccessible(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_KEYBOARD_TRAP");
});

Deno.test("validateKeyboardAccessible - flags out-of-order tabindex", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "button",
        props: { tabIndex: 2 },
        children: [],
      },
      {
        type: "button",
        props: { tabIndex: 1 },
        children: [],
      },
    ],
  };

  const findings = validateKeyboardAccessible(node);
  const codes = findings.map((finding) => finding.code);

  assertEquals(codes.includes("LONE_KEYBOARD_TABINDEX_OUT_OF_ORDER"), true);
});

Deno.test("validateKeyboardAccessible - flags missing focus indicator", () => {
  const node: SemanticNodeType = {
    type: "button",
    props: { focusVisible: false, keyboardHandlers: ["Enter", "Space"] },
    children: [],
  };

  const findings = validateKeyboardAccessible(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_KEYBOARD_MISSING_FOCUS_INDICATOR");
});

Deno.test("simulateTabNavigation - orders by tabindex then document order", () => {
  const node: SemanticNodeType = {
    type: "div",
    props: {},
    children: [
      {
        type: "button",
        props: { tabIndex: 2 },
        children: [],
      },
      {
        type: "link",
        props: { tabIndex: 1 },
        children: [],
      },
      {
        type: "button",
        props: {},
        children: [],
      },
    ],
  };

  const order = simulateTabNavigation(node).map((item) => item.path);

  assertEquals(order, ["$.children[1]", "$.children[0]", "$.children[2]"]);
});
