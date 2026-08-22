import { assertEquals } from "@std/assert";
import { validateTextAlternatives } from "../../src/validate/text_alternatives.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

Deno.test("validateTextAlternatives - flags img without alt", () => {
  const node: SemanticNodeType = {
    type: "img",
    props: {},
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_MISSING_ALT");
});

Deno.test("validateTextAlternatives - flags empty alt on meaningful image", () => {
  const node: SemanticNodeType = {
    type: "img",
    props: { alt: "" },
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_EMPTY_ALT_MEANINGFUL");
});

Deno.test("validateTextAlternatives - allows decorative image with empty alt", () => {
  const node: SemanticNodeType = {
    type: "img",
    role: "presentation",
    props: { alt: "" },
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateTextAlternatives - flags svg without label", () => {
  const node: SemanticNodeType = {
    type: "svg",
    props: {},
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_MISSING_SVG_ALT");
});

Deno.test("validateTextAlternatives - passes svg with title", () => {
  const node: SemanticNodeType = {
    type: "svg",
    props: { title: "Logo" },
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateTextAlternatives - flags icon-only button without label", () => {
  const node: SemanticNodeType = {
    type: "button",
    props: { iconOnly: true },
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_ICON_BUTTON_MISSING_LABEL");
});

Deno.test("validateTextAlternatives - passes icon-only button with aria-label", () => {
  const node: SemanticNodeType = {
    type: "button",
    props: { iconOnly: true, "aria-label": "Search" },
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateTextAlternatives - flags canvas without fallback", () => {
  const node: SemanticNodeType = {
    type: "canvas",
    props: {},
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_MISSING_FALLBACK_CONTENT");
});

Deno.test("validateTextAlternatives - passes canvas with fallback child", () => {
  const node: SemanticNodeType = {
    type: "canvas",
    props: {},
    children: [
      {
        type: "text",
        name: "Chart data",
        props: {},
        children: [],
      },
    ],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 0);
});

Deno.test("validateTextAlternatives - flags media without captions", () => {
  const node: SemanticNodeType = {
    type: "video",
    props: {},
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_MISSING_MEDIA_ALT");
});

Deno.test("validateTextAlternatives - passes media with transcript", () => {
  const node: SemanticNodeType = {
    type: "audio",
    props: { transcript: true },
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 0);
});

// ── role="img" is named by ARIA, not by an alt attribute (#33) ────────────────
// `alt` is a content attribute of <img>/<area>/<input type=image> and exists on
// nothing else, so requiring it of every role="img" made the rule unsatisfiable
// for its own primary case — a graphic composed of other elements. Reported from
// a real consumer: a segmented progress bar, correctly named with aria-label,
// flagged LONE_TEXT_MISSING_ALT with no legal way to satisfy it.

Deno.test("validateTextAlternatives - passes role=img named by aria-label", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "img",
    name: "22 met, 1 unmet, 14 not assessed of 37",
    props: { "aria-label": "22 met, 1 unmet, 14 not assessed of 37" },
    children: [],
  };

  assertEquals(validateTextAlternatives(node), []);
});

Deno.test("validateTextAlternatives - passes role=img named by aria-labelledby", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "img",
    props: { "aria-labelledby": "chart-caption" },
    children: [],
  };

  assertEquals(validateTextAlternatives(node), []);
});

Deno.test("validateTextAlternatives - still flags an unnamed role=img", () => {
  const node: SemanticNodeType = {
    type: "div",
    role: "img",
    props: {},
    children: [],
  };

  const findings = validateTextAlternatives(node);

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_MISSING_ALT");
});

// The same principle applied to a real <img>: aria-label names it too, and the
// accessible-name computation prefers it over alt. Matches axe's image-alt rule,
// which accepts aria-label/aria-labelledby/title in alt's place.
Deno.test("validateTextAlternatives - passes img named by aria-label", () => {
  const node: SemanticNodeType = {
    type: "img",
    props: { "aria-label": "Quarterly revenue" },
    children: [],
  };

  assertEquals(validateTextAlternatives(node), []);
});

// ...but an <img> with no name at all is untouched by this change, and an empty
// alt still reports as the distinct "you said decorative, but you are not" case.
Deno.test("validateTextAlternatives - unnamed img is still missing alt", () => {
  const findings = validateTextAlternatives({
    type: "img",
    props: {},
    children: [],
  });

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_MISSING_ALT");
});

Deno.test("validateTextAlternatives - unnamed img with empty alt still reports empty-alt", () => {
  const findings = validateTextAlternatives({
    type: "img",
    props: { alt: "" },
    children: [],
  });

  assertEquals(findings.length, 1);
  assertEquals(findings[0].code, "LONE_TEXT_EMPTY_ALT_MEANINGFUL");
});
