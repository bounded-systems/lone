import { assert, assertEquals } from "@std/assert";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";
import type { FindingType } from "../../src/contracts/finding.ts";
import {
  CHOICE_DENSITY_MAX,
  CONTENT_DENSITY_MAX_WORDS,
  DISCLOSURE_MAX_SECTIONS,
  FORM_FIELD_BURDEN_MAX,
  validateCognitiveBudget,
} from "../../src/validate/cognitive_budget.ts";

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

function codes(findings: FindingType[]): string[] {
  return findings.map((f) => f.code);
}

function repeat(node: SemanticNodeType, count: number): SemanticNodeType[] {
  return Array.from({ length: count }, () => node);
}

// ── Clean subtrees produce no findings ───────────────────────────────────────

Deno.test("cognitive budget - empty element is clean", () => {
  assertEquals(validateCognitiveBudget(n("div")).length, 0);
});

Deno.test("cognitive budget - small well-structured page is clean", () => {
  const root = n("body", {
    role: "banner",
    children: [
      n("h1", { name: "Accessible Page" }),
      n("nav", {
        role: "navigation",
        children: [
          n("a", { name: "Home", props: { href: "/home" } }),
          n("a", { name: "About", props: { href: "/about" } }),
        ],
      }),
      n("main", {
        role: "main",
        children: [
          n("button", { name: "Save" }),
          n("p", { name: "A short paragraph of content." }),
        ],
      }),
    ],
  });
  assertEquals(validateCognitiveBudget(root).length, 0);
});

// ── Clear link purpose ───────────────────────────────────────────────────────

Deno.test("cognitive budget - 'click here' link is flagged", () => {
  const root = n("main", {
    role: "main",
    children: [n("a", { name: "Click here", props: { href: "/docs" } })],
  });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_UNCLEAR_LINK_PURPOSE",
    ),
  );
});

Deno.test("cognitive budget - bare 'Learn more' link is flagged", () => {
  const root = n("a", { name: "Learn more", props: { href: "/x" } });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_UNCLEAR_LINK_PURPOSE",
    ),
  );
});

Deno.test("cognitive budget - descriptive link is NOT flagged", () => {
  const root = n("a", {
    name: "Read the install guide",
    props: { href: "/install" },
  });
  assertEquals(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_UNCLEAR_LINK_PURPOSE",
    ),
    false,
  );
});

Deno.test("cognitive budget - icon-only link with no name is flagged", () => {
  const root = n("a", { props: { href: "/settings", class: "icon" } });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_ICON_ONLY_LINK_UNLABELED",
    ),
  );
});

// ── Interruptions ────────────────────────────────────────────────────────────

Deno.test("cognitive budget - autoplay media is an error-severity finding", () => {
  const root = n("video", { props: { autoplay: true } });
  const findings = validateCognitiveBudget(root);
  const f = findings.find((x) => x.code === "LONE_COGA_AUTOPLAY_MEDIA");
  assert(f, "expected autoplay finding");
  assertEquals(f.severity, "error");
});

Deno.test("cognitive budget - open dialog on load is an error-severity finding", () => {
  const root = n("dialog", { props: { open: true } });
  const f = validateCognitiveBudget(root).find((x) =>
    x.code === "LONE_COGA_MODAL_ON_LOAD"
  );
  assert(f, "expected modal-on-load finding");
  assertEquals(f.severity, "error");
});

Deno.test("cognitive budget - aria-modal marks a modal on load", () => {
  const root = n("div", { role: "dialog", props: { "aria-modal": "true" } });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_MODAL_ON_LOAD",
    ),
  );
});

Deno.test("cognitive budget - autofocus is flagged as focus theft", () => {
  const root = n("input", { props: { autofocus: true, type: "text" } });
  assert(
    codes(validateCognitiveBudget(root)).includes("LONE_COGA_FOCUS_THEFT"),
  );
});

// ── Headings ─────────────────────────────────────────────────────────────────

Deno.test("cognitive budget - multiple h1 is flagged", () => {
  const root = n("body", {
    role: "banner",
    children: [n("h1", { name: "One" }), n("h1", { name: "Two" })],
  });
  assert(
    codes(validateCognitiveBudget(root)).includes("LONE_COGA_MULTIPLE_H1"),
  );
});

Deno.test("cognitive budget - heading nested past the depth budget is flagged", () => {
  const root = n("section", {
    children: [n("h5", { name: "Too deep" })],
  });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_HEADING_DEPTH",
    ),
  );
});

// ── Region budgets ───────────────────────────────────────────────────────────

Deno.test("cognitive budget - choice density over budget is flagged", () => {
  const root = n("main", {
    role: "main",
    children: repeat(n("button", { name: "Act" }), CHOICE_DENSITY_MAX + 1),
  });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_CHOICE_DENSITY",
    ),
  );
});

Deno.test("cognitive budget - competing primary actions are flagged", () => {
  const root = n("section", {
    children: [
      n("button", { name: "Save", props: { class: "btn primary" } }),
      n("button", { name: "Publish", props: { class: "cta" } }),
    ],
  });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_COMPETING_PRIMARY_ACTIONS",
    ),
  );
});

Deno.test("cognitive budget - a single primary action is NOT flagged", () => {
  const root = n("section", {
    children: [
      n("button", { name: "Save", props: { class: "btn primary" } }),
      n("button", { name: "Cancel", props: { class: "btn secondary" } }),
    ],
  });
  assertEquals(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_COMPETING_PRIMARY_ACTIONS",
    ),
    false,
  );
});

Deno.test("cognitive budget - content density over budget is flagged", () => {
  const words = Array.from({ length: CONTENT_DENSITY_MAX_WORDS + 1 }, () => "w")
    .join(" ");
  const root = n("section", { children: [n("p", { name: words })] });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_CONTENT_DENSITY",
    ),
  );
});

Deno.test("cognitive budget - many sections without disclosure are flagged", () => {
  const root = n("main", {
    role: "main",
    children: repeat(n("section"), DISCLOSURE_MAX_SECTIONS + 1),
  });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_PROGRESSIVE_DISCLOSURE",
    ),
  );
});

Deno.test("cognitive budget - disclosure affordance suppresses the section finding", () => {
  const root = n("main", {
    role: "main",
    children: [
      n("details", { children: [n("summary", { name: "More" })] }),
      ...repeat(n("section"), DISCLOSURE_MAX_SECTIONS + 1),
    ],
  });
  assertEquals(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_PROGRESSIVE_DISCLOSURE",
    ),
    false,
  );
});

// ── Form burden ──────────────────────────────────────────────────────────────

Deno.test("cognitive budget - heavy form is over budget", () => {
  const root = n("form", {
    role: "form",
    children: repeat(
      n("input", { props: { type: "text" } }),
      FORM_FIELD_BURDEN_MAX + 1,
    ),
  });
  assert(
    codes(validateCognitiveBudget(root)).includes("LONE_COGA_FORM_BURDEN"),
  );
});

Deno.test("cognitive budget - hidden/submit inputs do not count toward burden", () => {
  const root = n("form", {
    role: "form",
    children: [
      n("input", { props: { type: "text" } }),
      ...repeat(n("input", { props: { type: "hidden" } }), 20),
      n("input", { props: { type: "submit" } }),
    ],
  });
  assertEquals(
    codes(validateCognitiveBudget(root)).includes("LONE_COGA_FORM_BURDEN"),
    false,
  );
});

// ── Motion ───────────────────────────────────────────────────────────────────

Deno.test("cognitive budget - animation marker without a guard is flagged", () => {
  const root = n("div", { props: { class: "animate fade-in" } });
  assert(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_MOTION_NO_REDUCED_GUARD",
    ),
  );
});

Deno.test("cognitive budget - reduced-motion guard suppresses the motion finding", () => {
  const root = n("div", { props: { class: "animate motion-safe:animate" } });
  assertEquals(
    codes(validateCognitiveBudget(root)).includes(
      "LONE_COGA_MOTION_NO_REDUCED_GUARD",
    ),
    false,
  );
});

// ── All codes carry the LONE_COGA_ prefix + actionable messages ──────────────

Deno.test("cognitive budget - findings are LONE_COGA_ coded and actionable", () => {
  const root = n("main", {
    role: "main",
    children: [
      n("a", { name: "Click here", props: { href: "/x" } }),
      n("video", { props: { autoplay: true } }),
      n("div", { props: { class: "animate" } }),
    ],
  });
  const findings = validateCognitiveBudget(root);
  assert(findings.length > 0);
  const actionRegex =
    /(must|should|use|add|provide|include|remove|ensure|avoid|reduce|gate|split|keep|group|reveal|let|break|flatten|demote)/i;
  for (const f of findings) {
    assert(f.code.startsWith("LONE_COGA_"), `${f.code} missing prefix`);
    assertEquals(f.message, f.message.trim());
    assert(/^[A-Z<]/.test(f.message), `message not capitalised: ${f.message}`);
    assert(/[.]$/.test(f.message), `message not ended: ${f.message}`);
    assert(actionRegex.test(f.message), `message not actionable: ${f.message}`);
    assert(f.path.startsWith("$"), `path not JSONPath: ${f.path}`);
  }
});
