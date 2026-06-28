// Web-build conformance standard.
//
// A typed, multi-standard definition of "what it means for a web build to
// conform, and whether we can claim it". The whole point of this module is to
// PREVENT OVERCLAIM: the strong compact claim is emitted only when every gating
// criterion has passing evidence — the same honest-blessing bar the rest of
// lone enforces on a DOM subtree.
//
// Each criterion declares where its evidence comes from:
//   - "lone":     lone can check it STATICALLY from a DOM subtree (its existing
//                 validators map onto these criteria).
//   - "external": lone CANNOT measure it from a subtree (security posture, field
//                 Core Web Vitals, Baseline feature support, runtime reliability,
//                 the manual parts of WCAG / keyboard / screen-reader testing).
//                 lone ACCEPTS these as typed inputs and verifies their
//                 shape/thresholds — it never fabricates them.

import { z } from "zod";

/** The six conformance areas covered by the standard. */
export type ConformanceArea =
  | "html"
  | "accessibility"
  | "security"
  | "performance"
  | "compatibility"
  | "reliability";

/** Where a criterion's evidence comes from. */
export type EvidenceSource = "lone" | "external";

/** A single, independently-verifiable conformance criterion. */
export type Criterion = {
  /** Stable identifier, e.g. "a11y.wcag22-aa-auto". */
  readonly id: string;
  readonly area: ConformanceArea;
  /** Short human label used in honest partial summaries. */
  readonly label: string;
  /** The governing standard, e.g. "WCAG 2.2". */
  readonly standard: string;
  /** The bar this criterion sets. */
  readonly target: string;
  /** Standard-specific level, e.g. "AA", "L2", "Widely Available". */
  readonly level: string;
  readonly evidence: EvidenceSource;
  /**
   * Whether this criterion gates the compact claim. AAA is "selected" and
   * recommended, so it is reported but does not block the compact claim text.
   */
  readonly required: boolean;
  /**
   * For lone-checked criteria: the Finding code prefixes whose ABSENCE of
   * error-severity findings means the criterion is met. Empty for external.
   */
  readonly loneCodes?: readonly string[];
};

/** Core Web Vitals thresholds (good, at p75). */
export const CWV_THRESHOLDS = {
  /** Largest Contentful Paint, milliseconds. */
  lcpMs: 2500,
  /** Interaction to Next Paint, milliseconds. */
  inpMs: 200,
  /** Cumulative Layout Shift, unitless. */
  cls: 0.1,
  /** Percentile the field data must represent. */
  percentile: 75,
} as const;

/**
 * The strong compact claim. Emitted by `conformance()` ONLY when every gating
 * criterion is `met`. Never assemble this string by hand.
 */
export const COMPACT_CLAIM =
  "Conforms to WCAG 2.2 AA, HTML and WAI-ARIA author requirements, " +
  "OWASP ASVS 5.0 Level 2, passes Core Web Vitals at p75, and targets " +
  "Baseline Widely Available.";

/** Standard name + version. */
export const STANDARD_NAME = "Bounded Systems Web-Build Conformance Standard";
export const STANDARD_VERSION = "1.0.0";

/**
 * The criteria, as typed data. Ordered by area for stable reporting.
 *
 * lone-measurable (static, from the DOM subtree):
 *   - html.dom-author-requirements  ← semantic_html
 *   - a11y.aria-author              ← aria_usage
 *   - a11y.wcag22-aa-auto           ← nameable, text_alternatives,
 *                                     screen_reader_content, keyboard_accessible,
 *                                     color_contrast, reader_view
 * external (supplied + threshold-checked, never fabricated): everything else.
 */
export const CRITERIA: readonly Criterion[] = [
  // ── HTML — HTML Living Standard ──────────────────────────────────────────
  {
    id: "html.dom-author-requirements",
    area: "html",
    label: "HTML author requirements",
    standard: "HTML Living Standard",
    target:
      "DOM subtree meets HTML author requirements (valid semantics & structure).",
    level: "author conformance",
    evidence: "lone",
    required: true,
    loneCodes: ["LONE_SEMANTIC_"],
  },
  {
    id: "html.validator-clean",
    area: "html",
    label: "Nu HTML Checker errors",
    standard: "Nu Html Checker",
    target: "Zero HTML validator (Nu) errors over the rendered page.",
    level: "zero errors",
    evidence: "external",
    required: true,
  },

  // ── Accessibility — WCAG 2.2 / WAI-ARIA 1.2 / axe ────────────────────────
  {
    id: "a11y.aria-author",
    area: "accessibility",
    label: "WAI-ARIA author requirements",
    standard: "WAI-ARIA 1.2",
    target:
      "Valid roles/states/properties/relationships; prefer native HTML semantics.",
    level: "author conformance",
    evidence: "lone",
    required: true,
    loneCodes: ["LONE_ARIA_"],
  },
  {
    id: "a11y.wcag22-aa-auto",
    area: "accessibility",
    label: "WCAG 2.2 AA (automated subset)",
    standard: "WCAG 2.2",
    target:
      "Automatable WCAG 2.2 AA checks pass (names, text alternatives, contrast, keyboard, SR content).",
    level: "AA (automated subset)",
    evidence: "lone",
    required: true,
    loneCodes: [
      "LONE_NAME_",
      "LONE_TEXT_",
      "LONE_SR_",
      "LONE_KEYBOARD_",
      "LONE_COLOR_",
      "LONE_READER_",
    ],
  },
  {
    id: "a11y.axe-serious-critical",
    area: "accessibility",
    label: "axe serious/critical violations",
    standard: "axe-core",
    target:
      "Zero serious/critical accessibility violations on the rendered page.",
    level: "serious/critical",
    evidence: "external",
    required: true,
  },
  {
    id: "a11y.wcag22-aa-manual",
    area: "accessibility",
    label: "WCAG 2.2 AA (manual audit)",
    standard: "WCAG 2.2",
    target:
      "Complete-flow manual audit incl. keyboard + screen-reader testing of critical flows.",
    level: "AA (manual)",
    evidence: "external",
    required: true,
  },
  {
    id: "a11y.wcag22-aaa-selected",
    area: "accessibility",
    label: "WCAG 2.2 AAA (selected)",
    standard: "WCAG 2.2",
    target: "Selected AAA success criteria met.",
    level: "AAA (selected)",
    evidence: "external",
    required: false,
  },

  // ── Security — OWASP ASVS 5.0.0 ──────────────────────────────────────────
  {
    id: "security.asvs",
    area: "security",
    label: "OWASP ASVS Level 2",
    standard: "OWASP ASVS 5.0.0",
    target: "Verified to Level 2 (Level 3 for highly sensitive applications).",
    level: "L2",
    evidence: "external",
    required: true,
  },
  {
    id: "security.no-critical-vulns",
    area: "security",
    label: "known critical/high vulns",
    standard: "OWASP ASVS 5.0.0",
    target: "Zero known critical/high exploitable vulnerabilities.",
    level: "zero critical/high",
    evidence: "external",
    required: true,
  },

  // ── Performance — Core Web Vitals ────────────────────────────────────────
  {
    id: "performance.core-web-vitals",
    area: "performance",
    label: "Core Web Vitals (p75)",
    standard: "Core Web Vitals",
    target:
      "LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 on mobile AND desktop (field data).",
    level: "p75 mobile + desktop",
    evidence: "external",
    required: true,
  },

  // ── Compatibility — Baseline ─────────────────────────────────────────────
  {
    id: "compatibility.baseline",
    area: "compatibility",
    label: "Baseline Widely Available",
    standard: "Baseline",
    target:
      "Baseline Widely Available (interoperable ≥30 months), or a tested fallback for newer features.",
    level: "Widely Available",
    evidence: "external",
    required: true,
  },

  // ── Reliability — runtime ────────────────────────────────────────────────
  {
    id: "reliability.runtime",
    area: "reliability",
    label: "runtime reliability",
    standard: "Bounded Systems reliability bar",
    target:
      "No uncaught browser errors; no broken internal links; critical journeys covered by e2e tests.",
    level: "—",
    evidence: "external",
    required: true,
  },
] as const;

// ── External evidence contracts (Zod) ───────────────────────────────────────
// lone verifies the SHAPE and THRESHOLDS of supplied evidence; it never invents
// it. Absent fields are reported as `not-assessed`, never silently "met".

/** Nu HTML Checker result. */
export const HtmlValidatorEvidence = z.object({
  errors: z.number().int().min(0),
  warnings: z.number().int().min(0).optional(),
});

/** Manual WCAG 2.2 AA audit attestation. */
export const ManualA11yEvidence = z.object({
  wcag22AA: z.boolean(),
  keyboardTested: z.boolean(),
  screenReaderTested: z.boolean(),
  completeFlows: z.boolean(),
});

/** Selected WCAG 2.2 AAA attestation. */
export const AaaEvidence = z.object({
  criteria: z.array(z.string()).default([]),
  met: z.boolean(),
});

/** Full axe-core scan of the rendered page (broader than lone's static subset). */
export const AxeEvidence = z.object({
  serious: z.number().int().min(0),
  critical: z.number().int().min(0),
});

/** OWASP ASVS verification attestation + known-vuln count. */
export const SecurityEvidence = z.object({
  standard: z.literal("OWASP ASVS").default("OWASP ASVS"),
  version: z.string().default("5.0.0"),
  achievedLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  targetLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  knownCriticalOrHighVulns: z.number().int().min(0),
  verifiedBy: z.string().optional(),
});

/** One Core Web Vitals sample for a given form factor. */
export const CoreWebVitalSample = z.object({
  formFactor: z.enum(["mobile", "desktop"]),
  percentile: z.number().min(0).max(100),
  lcpMs: z.number().min(0),
  inpMs: z.number().min(0),
  cls: z.number().min(0),
  source: z.enum(["field", "lab"]).default("field"),
});

/** Core Web Vitals field data — must cover BOTH mobile and desktop. */
export const CoreWebVitalsEvidence = z.array(CoreWebVitalSample);

/** Baseline feature-support result. */
export const BaselineEvidence = z.object({
  status: z.enum(["widely", "newly", "limited"]),
  fallbackTested: z.boolean().default(false),
});

/** Runtime reliability signals. */
export const ReliabilityEvidence = z.object({
  uncaughtErrors: z.number().int().min(0),
  brokenInternalLinks: z.number().int().min(0),
  e2eCriticalJourneys: z.boolean(),
});

/** The full external-evidence envelope. Every field is optional. */
export const ExternalEvidence = z.object({
  htmlValidator: HtmlValidatorEvidence.optional(),
  manualA11y: ManualA11yEvidence.optional(),
  wcag22AAA: AaaEvidence.optional(),
  axe: AxeEvidence.optional(),
  security: SecurityEvidence.optional(),
  coreWebVitals: CoreWebVitalsEvidence.optional(),
  baseline: BaselineEvidence.optional(),
  reliability: ReliabilityEvidence.optional(),
});

export type HtmlValidatorEvidenceType = z.infer<typeof HtmlValidatorEvidence>;
export type ManualA11yEvidenceType = z.infer<typeof ManualA11yEvidence>;
export type AaaEvidenceType = z.infer<typeof AaaEvidence>;
export type AxeEvidenceType = z.infer<typeof AxeEvidence>;
export type SecurityEvidenceType = z.infer<typeof SecurityEvidence>;
export type CoreWebVitalSampleType = z.infer<typeof CoreWebVitalSample>;
export type CoreWebVitalsEvidenceType = z.infer<typeof CoreWebVitalsEvidence>;
export type BaselineEvidenceType = z.infer<typeof BaselineEvidence>;
export type ReliabilityEvidenceType = z.infer<typeof ReliabilityEvidence>;
export type ExternalEvidenceType = z.infer<typeof ExternalEvidence>;
/** Caller-facing shape: defaulted fields (e.g. ASVS targetLevel) may be omitted. */
export type ExternalEvidenceInput = z.input<typeof ExternalEvidence>;
