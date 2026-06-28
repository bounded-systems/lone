// Interface-complexity budget validator (W3C COGA-derived).
//
// HONEST LABELLING — READ THIS FIRST:
// This validator scores a RENDERED INTERFACE against a bounded
// **interface-complexity budget**. It is derived from W3C Cognitive and
// Learning Disabilities Accessibility (COGA) guidance — "Making Content Usable
// for People with Cognitive and Learning Disabilities" — but it is EXPLICITLY
// **NOT** a "cognitive-load measurement". It cannot, and does not, measure a
// person's cognition. It measures observable interface properties that COGA
// associates with avoidable complexity (how many choices a region presents, how
// many "primary" actions compete, how deep the heading nesting goes, whether
// links state their purpose, whether the page interrupts on load, how heavy a
// form is, whether motion is gated, and whether disclosure is progressive).
//
// Like every other validator in `src/validate/*`, it takes a DOM subtree
// (already adapted to a `SemanticNodeType`) and returns `FindingType[]`. The
// findings are matched by the `LONE_COGA_` prefix and feed the standard model's
// `cognitive.complexity-budget` criterion (see `src/standard/web_build.ts`).
//
// Thresholds are conservative, named, and documented below — they describe a
// budget, not a hard accessibility-conformance line. The only ERROR-severity
// findings are the two genuine "automatic, on-load interruptions" (autoplay
// media and a modal/dialog shown at load); everything else is a recommendation
// (warning/info) so it never silently fails a build.

import type { SemanticNodeType } from "../contracts/semantic_node.ts";
import type { FindingType } from "../contracts/finding.ts";

// ── Budget thresholds (named, documented constants) ──────────────────────────
// These describe an interface-complexity BUDGET, derived from COGA guidance.
// They are deliberately generous so a clean, well-structured page never trips
// them — a finding means "this region is past the budget", not "this is broken".

/** Max interactive controls attributed to a single region (choice density). */
export const CHOICE_DENSITY_MAX = 10;
/** Max visually-"primary" actions competing within a single region. */
export const COMPETING_PRIMARY_ACTIONS_MAX = 1;
/** Max words of leaf text attributed to a single content section. */
export const CONTENT_DENSITY_MAX_WORDS = 600;
/** Deepest heading level allowed before nesting is over budget (h1..h6). */
export const HEADING_DEPTH_MAX = 4;
/** A page should present a single top-level heading. */
export const MAX_H1 = 1;
/** Max form fields in one form before the form is over budget. */
export const FORM_FIELD_BURDEN_MAX = 12;
/** Max required fields in one form before it is over budget. */
export const FORM_REQUIRED_BURDEN_MAX = 8;
/** Max simultaneously-visible content sections in a region before progressive
 * disclosure (tabs/accordion/details/steps) is recommended. */
export const DISCLOSURE_MAX_SECTIONS = 10;

// ── Vocabulary ───────────────────────────────────────────────────────────────

/** Structural regions used to attribute choice/primary/disclosure budgets. */
const REGION_TYPES = new Set([
  "body",
  "main",
  "nav",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "form",
  "dialog",
]);
const REGION_ROLES = new Set([
  "region",
  "navigation",
  "main",
  "banner",
  "contentinfo",
  "complementary",
  "form",
  "search",
  "dialog",
]);

/** Content sections used to attribute the content-density (word) budget. */
const SECTION_TYPES = new Set(["section", "article", "main"]);
const SECTION_ROLES = new Set(["region", "article", "main"]);

/** Sections eligible for progressive disclosure. */
const DISCLOSURE_SECTION_TYPES = new Set(["section", "article", "fieldset"]);
const DISCLOSURE_SECTION_ROLES = new Set(["region", "group", "article"]);

const INTERACTIVE_TYPES = new Set([
  "button",
  "select",
  "textarea",
  "summary",
]);
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tab",
  "switch",
  "slider",
  "spinbutton",
  "combobox",
  "textbox",
  "searchbox",
  "option",
]);

/** Form fields counted toward the form-burden budget. */
const FORM_FIELD_TYPES = new Set(["select", "textarea"]);
const FORM_FIELD_ROLES = new Set([
  "textbox",
  "combobox",
  "searchbox",
  "listbox",
  "spinbutton",
  "slider",
  "checkbox",
  "radio",
]);
/** <input type=…> values that are not data-entry fields. */
const NON_FIELD_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
]);

/** Bare, purpose-free link phrases COGA calls out (normalised, punctuation
 * stripped). Flagged because they don't state where the link goes. */
const UNCLEAR_LINK_PHRASES = new Set([
  "click here",
  "here",
  "learn more",
  "read more",
  "more",
  "more info",
  "more information",
  "details",
  "this",
  "this link",
  "link",
  "go",
  "go here",
  "continue",
  "see more",
]);

const MOTION_CLASS_RE = /\b(animate|animation|animated|marquee|blink|pulse)\b/i;
const MOTION_STYLE_RE = /animation\s*:|@keyframes/i;
const REDUCED_MOTION_CLASS_RE = /\bmotion-(safe|reduce)\b/i;
const DISCLOSURE_AFFORDANCE_CLASS_RE =
  /\b(accordion|collapse|disclosure|stepper|wizard|carousel)\b/i;

// ── Public entry point ───────────────────────────────────────────────────────

export function validateCognitiveBudget(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];

  findings.push(...checkHeadings(root, path));
  walk(root, path, true, findings);

  return findings;
}

// ── Tree walk: per-node + per-region rules ───────────────────────────────────

function walk(
  node: SemanticNodeType,
  path: string,
  isRoot: boolean,
  findings: FindingType[],
): void {
  // Per-node interruption / link / motion / form rules.
  findings.push(...checkLinkPurpose(node, path));
  findings.push(...checkInterruptions(node, path));
  findings.push(...checkMotion(node, path));
  if (isForm(node)) findings.push(...checkFormBurden(node, path));

  // Per-region budgets. The root is treated as an implicit region so a page
  // whose subtree root is a plain <div> is still budgeted.
  if (isRoot || isRegion(node)) {
    findings.push(...checkRegionBudgets(node, path));
  }

  node.children.forEach((child, i) => {
    walk(child, `${path}.children[${i}]`, false, findings);
  });
}

// ── Heading rules (global over the subtree) ──────────────────────────────────

function checkHeadings(
  root: SemanticNodeType,
  rootPath: string,
): FindingType[] {
  const findings: FindingType[] = [];
  const headings: Array<{ level: number; path: string }> = [];

  const collect = (node: SemanticNodeType, path: string) => {
    const level = headingLevel(node);
    if (level !== null) headings.push({ level, path });
    node.children.forEach((c, i) => collect(c, `${path}.children[${i}]`));
  };
  collect(root, rootPath);

  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length > MAX_H1) {
    findings.push({
      code: "LONE_COGA_MULTIPLE_H1",
      path: rootPath,
      message:
        `Found ${h1s.length} level-1 headings; the interface-complexity budget ` +
        `recommends a single h1 so the page has one clear top-level heading. ` +
        `Use one h1 and demote the rest.`,
      severity: "warning",
    });
  }

  for (const h of headings) {
    if (h.level > HEADING_DEPTH_MAX) {
      findings.push({
        code: "LONE_COGA_HEADING_DEPTH",
        path: h.path,
        message: `Heading nests to level ${h.level}, past the budget of ` +
          `${HEADING_DEPTH_MAX}. Deep heading nesting adds structural ` +
          `complexity — flatten the outline or split the content.`,
        severity: "warning",
      });
    }
  }

  return findings;
}

// ── Link purpose ─────────────────────────────────────────────────────────────

function checkLinkPurpose(
  node: SemanticNodeType,
  path: string,
): FindingType[] {
  if (!isLink(node)) return [];

  const name = typeof node.name === "string" ? node.name.trim() : "";
  if (name.length === 0) {
    // Icon-only / image-only link with no accessible name: its destination is
    // unknowable without sight + context.
    return [{
      code: "LONE_COGA_ICON_ONLY_LINK_UNLABELED",
      path,
      message:
        "Link has no discernible text. Add visible link text or an aria-label " +
        "so its purpose is clear (an icon alone does not state where it goes).",
      severity: "warning",
    }];
  }

  if (UNCLEAR_LINK_PHRASES.has(normalisePhrase(name))) {
    return [{
      code: "LONE_COGA_UNCLEAR_LINK_PURPOSE",
      path,
      message:
        `Link text "${name}" does not state its purpose. Use descriptive link ` +
        `text (e.g. "Read the install guide") instead of generic phrases like ` +
        `"click here" or "learn more".`,
      severity: "warning",
    }];
  }

  return [];
}

// ── Interruptions (autoplay / modal-on-load / focus theft) ───────────────────

function checkInterruptions(
  node: SemanticNodeType,
  path: string,
): FindingType[] {
  const findings: FindingType[] = [];

  // Autoplay media — an automatic, attention-grabbing interruption on load.
  if (
    (node.type === "video" || node.type === "audio") &&
    truthy(node.props?.["autoplay"])
  ) {
    findings.push({
      code: "LONE_COGA_AUTOPLAY_MEDIA",
      path,
      message:
        `<${node.type}> autoplays on load. Autoplaying media interrupts and ` +
        `competes for attention — remove autoplay and let the user start it.`,
      severity: "error",
    });
  }

  // Modal / dialog presented at load — a forced context change before the user
  // has acted.
  const modal = (node.type === "dialog" && truthy(node.props?.["open"])) ||
    truthy(node.props?.["aria-modal"]);
  if (modal) {
    findings.push({
      code: "LONE_COGA_MODAL_ON_LOAD",
      path,
      message:
        "A modal/dialog is open in the initial render. An on-load modal forces " +
        "a context change before the user has acted — avoid presenting it " +
        "automatically.",
      severity: "error",
    });
  }

  // Focus theft — autofocus moves focus without user intent.
  if (truthy(node.props?.["autofocus"])) {
    findings.push({
      code: "LONE_COGA_FOCUS_THEFT",
      path,
      message:
        "Element uses autofocus, which moves focus on load without user " +
        "intent. Avoid stealing focus — let the user choose where to start.",
      severity: "warning",
    });
  }

  return findings;
}

// ── Motion ───────────────────────────────────────────────────────────────────
//
// HEURISTIC: a DOM subtree cannot see CSS `@media (prefers-reduced-motion)`
// guards, so this flags only EXPLICIT motion markers in the markup and treats a
// recognised reduced-motion utility on the same node as a guard. Reported as a
// recommendation (warning), never an error.

function checkMotion(node: SemanticNodeType, path: string): FindingType[] {
  if (!hasMotionMarker(node) || hasReducedMotionGuard(node)) return [];
  return [{
    code: "LONE_COGA_MOTION_NO_REDUCED_GUARD",
    path,
    message: "Element carries an animation/motion marker with no detectable " +
      "reduced-motion guard. Gate motion behind prefers-reduced-motion (or a " +
      "motion-safe utility) so it can be turned off.",
    severity: "warning",
  }];
}

// ── Form burden ──────────────────────────────────────────────────────────────

function checkFormBurden(form: SemanticNodeType, path: string): FindingType[] {
  const findings: FindingType[] = [];
  const fields = countOwnScope(form, isFormField, isForm);
  const required = countOwnScope(form, isRequiredField, isForm);

  if (fields > FORM_FIELD_BURDEN_MAX) {
    findings.push({
      code: "LONE_COGA_FORM_BURDEN",
      path,
      message: `Form presents ${fields} fields, past the budget of ` +
        `${FORM_FIELD_BURDEN_MAX}. Long forms raise the memory/effort burden — ` +
        `split into steps, defer optional fields, or remove fields.`,
      severity: "warning",
    });
  }

  if (required > FORM_REQUIRED_BURDEN_MAX) {
    findings.push({
      code: "LONE_COGA_FORM_REQUIRED_BURDEN",
      path,
      message: `Form has ${required} required fields, past the budget of ` +
        `${FORM_REQUIRED_BURDEN_MAX}. Reduce what is mandatory — make fields ` +
        `optional where possible to lower the completion burden.`,
      severity: "info",
    });
  }

  return findings;
}

// ── Region budgets (choice density / competing primaries / content / disclosure) ──

function checkRegionBudgets(
  region: SemanticNodeType,
  path: string,
): FindingType[] {
  const findings: FindingType[] = [];

  const choices = countOwnScope(region, isInteractive, isRegion);
  if (choices > CHOICE_DENSITY_MAX) {
    findings.push({
      code: "LONE_COGA_CHOICE_DENSITY",
      path,
      message:
        `Region presents ${choices} interactive controls, past the budget of ` +
        `${CHOICE_DENSITY_MAX}. Too many choices at once increases complexity — ` +
        `group, prioritise, or progressively disclose them.`,
      severity: "warning",
    });
  }

  const primaries = countOwnScope(region, isPrimaryAction, isRegion);
  if (primaries > COMPETING_PRIMARY_ACTIONS_MAX) {
    findings.push({
      code: "LONE_COGA_COMPETING_PRIMARY_ACTIONS",
      path,
      message:
        `Region has ${primaries} visually-primary actions competing for ` +
        `attention; the budget allows ${COMPETING_PRIMARY_ACTIONS_MAX}. Keep a ` +
        `single primary action per region and demote the others to secondary.`,
      severity: "warning",
    });
  }

  if (isSection(region) || isImplicitContentRoot(region, path)) {
    const words = countWords(region, isSection);
    if (words > CONTENT_DENSITY_MAX_WORDS) {
      findings.push({
        code: "LONE_COGA_CONTENT_DENSITY",
        path,
        message: `Section holds ~${words} words, past the budget of ` +
          `${CONTENT_DENSITY_MAX_WORDS}. Dense, unbroken content is hard to ` +
          `process — break it into shorter sections with clear headings.`,
        severity: "info",
      });
    }
  }

  const sections = countOwnScope(region, isDisclosureSection, isRegion);
  if (sections > DISCLOSURE_MAX_SECTIONS && !hasDisclosureAffordance(region)) {
    findings.push({
      code: "LONE_COGA_PROGRESSIVE_DISCLOSURE",
      path,
      message:
        `Region shows ${sections} sections at once, past the budget of ` +
        `${DISCLOSURE_MAX_SECTIONS}, with no progressive-disclosure affordance ` +
        `(tabs, accordion, <details>, or steps). Reveal content progressively.`,
      severity: "info",
    });
  }

  return findings;
}

// ── Predicates & helpers ─────────────────────────────────────────────────────

function isRegion(node: SemanticNodeType): boolean {
  return REGION_TYPES.has(node.type) ||
    (typeof node.role === "string" && REGION_ROLES.has(node.role));
}

function isSection(node: SemanticNodeType): boolean {
  return SECTION_TYPES.has(node.type) ||
    (typeof node.role === "string" && SECTION_ROLES.has(node.role));
}

/** The root counts as a content section only when nothing more specific does,
 * so a plain <div> root still gets a content-density budget. */
function isImplicitContentRoot(
  node: SemanticNodeType,
  path: string,
): boolean {
  return path === "$" && !isSection(node);
}

function isDisclosureSection(node: SemanticNodeType): boolean {
  return DISCLOSURE_SECTION_TYPES.has(node.type) ||
    (typeof node.role === "string" && DISCLOSURE_SECTION_ROLES.has(node.role));
}

function isForm(node: SemanticNodeType): boolean {
  return node.type === "form" || node.role === "form";
}

function isLink(node: SemanticNodeType): boolean {
  if (node.role === "link") return true;
  return node.type === "a" && truthy(node.props?.["href"]);
}

function isInteractive(node: SemanticNodeType): boolean {
  if (isLink(node)) return true;
  if (INTERACTIVE_TYPES.has(node.type)) return true;
  if (node.type === "input") {
    return !NON_FIELD_INPUT_TYPES.has(inputType(node));
  }
  return typeof node.role === "string" && INTERACTIVE_ROLES.has(node.role);
}

function isPrimaryAction(node: SemanticNodeType): boolean {
  return isInteractive(node) && isVisuallyPrimary(node);
}

function isVisuallyPrimary(node: SemanticNodeType): boolean {
  const cls = classOf(node);
  if (/\b(primary|cta|btn-primary|button--primary|is-primary)\b/i.test(cls)) {
    return true;
  }
  return truthy(node.props?.["data-primary"]) ||
    truthy(node.props?.["aria-primary"]);
}

function isFormField(node: SemanticNodeType): boolean {
  if (FORM_FIELD_TYPES.has(node.type)) return true;
  if (node.type === "input") {
    return !NON_FIELD_INPUT_TYPES.has(inputType(node));
  }
  return typeof node.role === "string" && FORM_FIELD_ROLES.has(node.role);
}

function isRequiredField(node: SemanticNodeType): boolean {
  return isFormField(node) &&
    (truthy(node.props?.["required"]) ||
      truthy(node.props?.["aria-required"]));
}

function hasMotionMarker(node: SemanticNodeType): boolean {
  if (node.type === "marquee" || node.type === "blink") return true;
  if (MOTION_CLASS_RE.test(classOf(node))) return true;
  const style = node.props?.["style"];
  if (typeof style === "string" && MOTION_STYLE_RE.test(style)) return true;
  return node.props?.["data-aos"] !== undefined ||
    truthy(node.props?.["data-animate"]);
}

function hasReducedMotionGuard(node: SemanticNodeType): boolean {
  if (REDUCED_MOTION_CLASS_RE.test(classOf(node))) return true;
  return truthy(node.props?.["data-reduced-motion"]) ||
    truthy(node.props?.["data-respect-motion-preference"]) ||
    node.props?.["data-motion"] === "reduce";
}

function hasDisclosureAffordance(region: SemanticNodeType): boolean {
  let found = false;
  const visit = (node: SemanticNodeType) => {
    if (found) return;
    if (node.type === "details" || node.type === "summary") found = true;
    else if (node.role === "tab" || node.role === "tablist") found = true;
    else if (DISCLOSURE_AFFORDANCE_CLASS_RE.test(classOf(node))) found = true;
    if (!found) node.children.forEach(visit);
  };
  region.children.forEach(visit);
  return found;
}

/** Count descendants matching `predicate` within a node's OWN scope: descent
 * stops at a nested boundary (a nested region/section/form owns its own scope),
 * so each match is attributed to exactly one container. */
function countOwnScope(
  node: SemanticNodeType,
  predicate: (n: SemanticNodeType) => boolean,
  isBoundary: (n: SemanticNodeType) => boolean,
): number {
  let count = 0;
  for (const child of node.children) {
    if (predicate(child)) count++;
    if (!isBoundary(child)) {
      count += countOwnScope(child, predicate, isBoundary);
    }
  }
  return count;
}

/** Words of LEAF text within a section's own scope. Only leaf nodes (no element
 * children) contribute, so cumulative parent text is not double-counted. */
function countWords(
  node: SemanticNodeType,
  isBoundary: (n: SemanticNodeType) => boolean,
): number {
  let words = 0;
  for (const child of node.children) {
    if (child.children.length === 0 && typeof child.name === "string") {
      words += wordCount(child.name);
    }
    if (!isBoundary(child)) words += countWords(child, isBoundary);
  }
  return words;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function headingLevel(node: SemanticNodeType): number | null {
  const aria = node.props?.["aria-level"];
  if (typeof aria === "number" && aria >= 1) return aria;
  const m = node.type.match(/^h([1-6])$/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

function inputType(node: SemanticNodeType): string {
  const t = node.props?.["type"];
  return typeof t === "string" ? t.toLowerCase() : "text";
}

function classOf(node: SemanticNodeType): string {
  const cls = node.props?.["class"] ?? node.props?.["className"] ?? "";
  return typeof cls === "string" ? cls : "";
}

function normalisePhrase(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ")
    .trim();
}

/** Truthy for boolean DOM attributes: the adapter maps a bare attribute to
 * `true`, an explicit value to its string. Treats "false"/"" as not set. */
function truthy(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v !== "" && v !== "false";
  }
  return false;
}
