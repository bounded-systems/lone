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

/**
 * The conformance areas covered by the standard.
 *
 * Tier-1 (the original standard): html, accessibility, security, performance,
 * compatibility, reliability.
 *
 * Added in tier-2/tier-3 + cognitive accessibility (all ADDITIVE — they extend
 * the report and the area summaries but never widen the tier-1 compact claim):
 *   - "semantic"  — machine-readable structured content (JSON-LD/SHACL,
 *                   CommonMark, AI-readability, OpenAPI, feeds).
 *   - "seo"       — technical SEO correctness.
 *   - "integrity" — supply-chain / provenance / reproducibility.
 *   - "cognitive" — interface-complexity budget (W3C COGA-derived) + COGA
 *                   usability testing. NOTE: this is an interface-complexity
 *                   budget, explicitly NOT a "cognitive-load measurement".
 */
export type ConformanceArea =
  | "html"
  | "accessibility"
  | "security"
  | "performance"
  | "compatibility"
  | "reliability"
  | "semantic"
  | "seo"
  | "integrity"
  | "cognitive";

/**
 * The standard "tier" a criterion belongs to.
 *
 *   1            — the original web-build conformance standard (tier-1). ONLY
 *                  tier-1 `required` criteria gate the COMPACT_CLAIM.
 *   2            — machine-readable structured content + technical SEO.
 *   3            — integrity / provenance / reproducibility.
 *   "cognitive"  — cognitive-accessibility (interface-complexity budget +
 *                  COGA usability testing).
 *
 * Criteria added in tier-2/tier-3/cognitive are reported in `results` and in the
 * per-area `areaSummaries`, but they NEVER widen the headline compact claim —
 * overclaim-avoidance is the whole point of this module.
 */
export type ConformanceTier = 1 | 2 | 3 | "cognitive";

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
  /**
   * The standard tier. Absent === tier-1 (the original standard). Only tier-1
   * `required` criteria gate the COMPACT_CLAIM; tier-2/tier-3/cognitive criteria
   * are reported but never widen the headline claim.
   */
  readonly tier?: ConformanceTier;
  /**
   * For criteria that are lone-measurable IN PRINCIPLE but whose DOM validators
   * are not yet implemented (a deliberate follow-on). When true, the aggregator
   * reports `not-assessed` rather than running findings — it would be overclaim
   * to call an uninstrumented criterion "met" just because there are no findings.
   */
  readonly pendingValidators?: boolean;
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

  // ══ TIER 2 — machine-readable structured content + technical SEO ═══════════
  // Reported + summarised per-area; NEVER widens the tier-1 compact claim.

  // ── Semantic — JSON-LD 1.1 + SHACL ───────────────────────────────────────
  {
    id: "semantic.jsonld-shacl",
    area: "semantic",
    label: "JSON-LD 1.1 + SHACL conformance",
    standard: "JSON-LD 1.1 / SHACL",
    target:
      "Structured data parses as JSON-LD 1.1 and conforms to its SHACL shapes (zero violating blocks).",
    level: "conforms",
    evidence: "external",
    required: true,
    tier: 2,
  },
  // ── SEO — technical correctness ──────────────────────────────────────────
  {
    id: "seo.technical",
    area: "seo",
    label: "Technical SEO",
    standard: "Search-engine technical guidelines / RFC 9309",
    target:
      "Canonical URLs correct, titles unique, robots.txt RFC 9309-valid, sitemap resolves, zero broken internal links.",
    level: "clean",
    evidence: "external",
    required: true,
    tier: 2,
  },
  // ── Semantic — CommonMark ────────────────────────────────────────────────
  {
    id: "semantic.commonmark",
    area: "semantic",
    label: "CommonMark conformance",
    standard: "CommonMark",
    target: "Authored Markdown parses cleanly under the CommonMark spec.",
    level: "conforms",
    evidence: "external",
    required: true,
    tier: 2,
  },
  // ── Semantic — AI-readability (llms.txt + markdown siblings) ──────────────
  {
    id: "semantic.ai-readability",
    area: "semantic",
    label: "AI-readability",
    standard: "llms.txt convention",
    target:
      "llms.txt present, its links resolve, and HTML pages expose Markdown siblings for machine consumption.",
    level: "recommended",
    evidence: "external",
    required: false,
    tier: 2,
  },
  // ── Semantic — OpenAPI 3.2 + JSON Schema 2020-12 (only if an API exists) ──
  {
    id: "semantic.openapi",
    area: "semantic",
    label: "OpenAPI 3.2 + JSON Schema 2020-12",
    standard: "OpenAPI 3.2 / JSON Schema 2020-12",
    target:
      "Published OpenAPI document is valid and responses match their declared JSON Schemas. Only applies if an API is published.",
    level: "conditional",
    evidence: "external",
    required: false,
    tier: 2,
  },
  // ── Semantic — Feeds (Atom RFC 4287) ─────────────────────────────────────
  {
    id: "semantic.feeds",
    area: "semantic",
    label: "Atom feed (RFC 4287)",
    standard: "RFC 4287",
    target: "Published feed is a valid Atom 1.0 document.",
    level: "recommended",
    evidence: "external",
    required: false,
    tier: 2,
  },

  // ══ TIER 3 — integrity / provenance / reproducibility ══════════════════════
  // Reported + summarised per-area; NEVER widens the tier-1 compact claim.

  // ── Integrity — SLSA provenance + in-toto ────────────────────────────────
  {
    id: "integrity.slsa-provenance",
    area: "integrity",
    label: "SLSA provenance + in-toto",
    standard: "SLSA / in-toto",
    target:
      "Build emits in-toto/SLSA provenance that is present, signed, and verifies against the artifact.",
    level: "present + signed + verified",
    evidence: "external",
    required: true,
    tier: 3,
  },
  // ── Integrity — reproducible build ───────────────────────────────────────
  {
    id: "integrity.reproducible-build",
    area: "integrity",
    label: "Reproducible build",
    standard: "Reproducible Builds",
    target: "Re-running the build from source yields byte-identical artifacts.",
    level: "reproducible",
    evidence: "external",
    required: true,
    tier: 3,
  },
  // ── Integrity — SPDX SBOM ────────────────────────────────────────────────
  {
    id: "integrity.sbom",
    area: "integrity",
    label: "SPDX SBOM",
    standard: "SPDX",
    target:
      "An SPDX SBOM is present, valid, complete (covers all components), and signed.",
    level: "present + valid + complete + signed",
    evidence: "external",
    required: true,
    tier: 3,
  },
  // ── Integrity — content digests (RFC 9530) ───────────────────────────────
  // external/lone-measurable: Repr-Digest is an HTTP response header (out of a
  // DOM subtree's reach today), so it is supplied as external evidence; it could
  // become lone-measurable at the transport layer in future.
  {
    id: "integrity.content-digests",
    area: "integrity",
    label: "Content digests (RFC 9530)",
    standard: "RFC 9530",
    target: "Responses carry Repr-Digest (RFC 9530) representation digests.",
    level: "recommended",
    evidence: "external",
    required: false,
    tier: 3,
  },
  // ── Integrity — signed release manifest ──────────────────────────────────
  {
    id: "integrity.signed-release-manifest",
    area: "integrity",
    label: "Signed release manifest",
    standard: "Bounded Systems release bar",
    target:
      "Each release ships a manifest of artifact digests that is present and signed.",
    level: "present + signed",
    evidence: "external",
    required: true,
    tier: 3,
  },
  // ── Integrity — IPFS CID recorded ────────────────────────────────────────
  {
    id: "integrity.ipfs-cid",
    area: "integrity",
    label: "IPFS CID recorded",
    standard: "IPFS / CIDv1",
    target:
      "The release records a content-addressed IPFS CID for the artifact.",
    level: "recommended",
    evidence: "external",
    required: false,
    tier: 3,
  },
  // ── Integrity — HTTP correctness (RFC 9110) ──────────────────────────────
  {
    id: "integrity.http-rfc9110",
    area: "integrity",
    label: "HTTP correctness (RFC 9110)",
    standard: "RFC 9110",
    target: "Responses are semantically correct per RFC 9110 HTTP semantics.",
    level: "recommended",
    evidence: "external",
    required: false,
    tier: 3,
  },

  // ══ COGNITIVE ACCESSIBILITY — W3C COGA (NEW AREA) ══════════════════════════
  // HONEST LABELING: this is an INTERFACE-COMPLEXITY BUDGET (W3C COGA-derived),
  // explicitly NOT a "cognitive-load measurement". Reported + summarised but
  // non-gating until the DOM validators land.

  // ── Cognitive — interface-complexity budget (lone-measurable) ─────────────
  {
    id: "cognitive.complexity-budget",
    area: "cognitive",
    label: "Interface-complexity budget (W3C COGA-derived)",
    standard: "W3C COGA (derived)",
    target:
      "Rendered DOM stays within an interface-complexity budget: choice density, " +
      "primary-action count, heading depth, clear link purpose, interruptions, " +
      "form/memory burden, motion, progressive disclosure. " +
      "This is an interface-complexity budget, NOT a cognitive-load measurement.",
    level: "budget (recommended)",
    evidence: "lone",
    required: false,
    tier: "cognitive",
    // Fed by `validate/cognitive_budget.ts` (LONE_COGA_* findings). The
    // budget is measured statically from the DOM subtree; `met` when no
    // error-severity COGA finding (autoplay / on-load modal), else `unmet`.
    // It stays recommended (`required: false`) and NEVER widens the tier-1
    // compact claim. Honest labelling: an interface-complexity budget, NOT a
    // cognitive-load measurement.
    loneCodes: ["LONE_COGA_"],
  },
  // ── Cognitive — COGA usability testing (manual, like the WCAG audit) ──────
  {
    id: "cognitive.coga-usability-testing",
    area: "cognitive",
    label: "COGA usability testing",
    standard: "W3C COGA",
    target:
      "Usability testing conducted with people with cognitive disabilities; critical tasks pass.",
    level: "manual (recommended)",
    evidence: "external",
    required: false,
    tier: "cognitive",
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

/**
 * Manual WCAG 2.2 AA audit attestation. `verifiedBy` (an independent assessor) is
 * REQUIRED for `a11y.wcag22-aa-manual` to reach `met`; absent it the criterion is
 * `not-assessed` — a self-attested manual audit never gates the compact claim.
 */
export const ManualA11yEvidence = z.object({
  wcag22AA: z.boolean(),
  keyboardTested: z.boolean(),
  screenReaderTested: z.boolean(),
  completeFlows: z.boolean(),
  verifiedBy: z.string().optional(),
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

/**
 * OWASP ASVS verification attestation — the self-graded part. `verifiedBy` (an
 * independent assessor) is REQUIRED for `security.asvs` to reach `met`; absent it
 * the criterion is `not-assessed` (self-attestation never gates the compact claim).
 */
export const AsvsEvidence = z.object({
  standard: z.literal("OWASP ASVS").default("OWASP ASVS"),
  version: z.string().default("5.0.0"),
  achievedLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  targetLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  verifiedBy: z.string().optional(),
});

/**
 * Known critical/high vulnerabilities — the TOOL-measured part (e.g. `npm audit`,
 * OSV). Decoupled from {@link AsvsEvidence} so an objective vuln count can be
 * supplied WITHOUT also self-grading an ASVS level.
 */
export const VulnsEvidence = z.object({
  knownCriticalOrHighVulns: z.number().int().min(0),
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

// ── Tier-2 external evidence (machine-readable structured content + SEO) ─────

/** JSON-LD 1.1 + SHACL validation result. */
export const JsonLdShaclEvidence = z.object({
  conforms: z.boolean(),
  blocks: z.number().int().min(0),
});

/** Technical-SEO crawl result. */
export const SeoTechnicalEvidence = z.object({
  canonicalOk: z.boolean(),
  titlesUnique: z.boolean(),
  robotsRfc9309Ok: z.boolean(),
  sitemapResolves: z.boolean(),
  brokenInternalLinks: z.number().int().min(0),
});

/** CommonMark parse result. */
export const CommonMarkEvidence = z.object({
  conforms: z.boolean(),
});

/** AI-readability (llms.txt + markdown siblings) result. */
export const AiReadabilityEvidence = z.object({
  llmsTxtPresent: z.boolean(),
  linksResolve: z.boolean(),
  markdownSiblings: z.boolean(),
});

/** OpenAPI 3.2 + JSON Schema 2020-12 validation (only if an API is published). */
export const OpenApiEvidence = z.object({
  openapiValid: z.boolean(),
  responsesMatchSchemas: z.boolean(),
});

/** Atom feed (RFC 4287) validation result. */
export const FeedsEvidence = z.object({
  atomValid: z.boolean(),
});

// ── Tier-3 external evidence (integrity / provenance / reproducibility) ──────

/** SLSA provenance + in-toto attestation result. */
export const SlsaProvenanceEvidence = z.object({
  present: z.boolean(),
  signed: z.boolean(),
  verified: z.boolean(),
});

/** Reproducible-build result. */
export const ReproducibleBuildEvidence = z.object({
  reproducible: z.boolean(),
});

/** SPDX SBOM result. */
export const SbomEvidence = z.object({
  present: z.boolean(),
  valid: z.boolean(),
  complete: z.boolean(),
  signed: z.boolean(),
});

/** Content digests (RFC 9530 Repr-Digest) result. */
export const ContentDigestsEvidence = z.object({
  reprDigestHeaders: z.boolean(),
});

/** Signed release-manifest result. */
export const SignedReleaseManifestEvidence = z.object({
  present: z.boolean(),
  signed: z.boolean(),
});

/** IPFS CID-recorded result. */
export const IpfsCidEvidence = z.object({
  cidRecorded: z.boolean(),
});

/** RFC 9110 HTTP-correctness result. */
export const HttpRfc9110Evidence = z.object({
  conforms: z.boolean(),
});

// ── Cognitive-accessibility external evidence (W3C COGA) ─────────────────────

/**
 * COGA usability-testing attestation. Manual, like the WCAG 2.2 AA audit.
 * NOTE: this attests that usability testing happened — it is NOT a cognitive-load
 * measurement.
 */
export const CogaUsabilityEvidence = z.object({
  conducted: z.boolean(),
  withCognitiveDisabilities: z.boolean(),
  criticalTasksPassed: z.boolean(),
});

/** The full external-evidence envelope. Every field is optional. */
export const ExternalEvidence = z.object({
  // tier-1
  htmlValidator: HtmlValidatorEvidence.optional(),
  manualA11y: ManualA11yEvidence.optional(),
  wcag22AAA: AaaEvidence.optional(),
  axe: AxeEvidence.optional(),
  asvs: AsvsEvidence.optional(),
  vulns: VulnsEvidence.optional(),
  coreWebVitals: CoreWebVitalsEvidence.optional(),
  baseline: BaselineEvidence.optional(),
  reliability: ReliabilityEvidence.optional(),
  // tier-2
  jsonLdShacl: JsonLdShaclEvidence.optional(),
  seoTechnical: SeoTechnicalEvidence.optional(),
  commonMark: CommonMarkEvidence.optional(),
  aiReadability: AiReadabilityEvidence.optional(),
  openApi: OpenApiEvidence.optional(),
  feeds: FeedsEvidence.optional(),
  // tier-3
  slsaProvenance: SlsaProvenanceEvidence.optional(),
  reproducibleBuild: ReproducibleBuildEvidence.optional(),
  sbom: SbomEvidence.optional(),
  contentDigests: ContentDigestsEvidence.optional(),
  signedReleaseManifest: SignedReleaseManifestEvidence.optional(),
  ipfsCid: IpfsCidEvidence.optional(),
  httpRfc9110: HttpRfc9110Evidence.optional(),
  // cognitive
  cogaUsability: CogaUsabilityEvidence.optional(),
});

export type HtmlValidatorEvidenceType = z.infer<typeof HtmlValidatorEvidence>;
export type ManualA11yEvidenceType = z.infer<typeof ManualA11yEvidence>;
export type AaaEvidenceType = z.infer<typeof AaaEvidence>;
export type AxeEvidenceType = z.infer<typeof AxeEvidence>;
export type AsvsEvidenceType = z.infer<typeof AsvsEvidence>;
export type VulnsEvidenceType = z.infer<typeof VulnsEvidence>;
export type CoreWebVitalSampleType = z.infer<typeof CoreWebVitalSample>;
export type CoreWebVitalsEvidenceType = z.infer<typeof CoreWebVitalsEvidence>;
export type BaselineEvidenceType = z.infer<typeof BaselineEvidence>;
export type ReliabilityEvidenceType = z.infer<typeof ReliabilityEvidence>;
// tier-2
export type JsonLdShaclEvidenceType = z.infer<typeof JsonLdShaclEvidence>;
export type SeoTechnicalEvidenceType = z.infer<typeof SeoTechnicalEvidence>;
export type CommonMarkEvidenceType = z.infer<typeof CommonMarkEvidence>;
export type AiReadabilityEvidenceType = z.infer<typeof AiReadabilityEvidence>;
export type OpenApiEvidenceType = z.infer<typeof OpenApiEvidence>;
export type FeedsEvidenceType = z.infer<typeof FeedsEvidence>;
// tier-3
export type SlsaProvenanceEvidenceType = z.infer<typeof SlsaProvenanceEvidence>;
export type ReproducibleBuildEvidenceType = z.infer<
  typeof ReproducibleBuildEvidence
>;
export type SbomEvidenceType = z.infer<typeof SbomEvidence>;
export type ContentDigestsEvidenceType = z.infer<typeof ContentDigestsEvidence>;
export type SignedReleaseManifestEvidenceType = z.infer<
  typeof SignedReleaseManifestEvidence
>;
export type IpfsCidEvidenceType = z.infer<typeof IpfsCidEvidence>;
export type HttpRfc9110EvidenceType = z.infer<typeof HttpRfc9110Evidence>;
// cognitive
export type CogaUsabilityEvidenceType = z.infer<typeof CogaUsabilityEvidence>;
export type ExternalEvidenceType = z.infer<typeof ExternalEvidence>;
/** Caller-facing shape: defaulted fields (e.g. ASVS targetLevel) may be omitted. */
export type ExternalEvidenceInput = z.input<typeof ExternalEvidence>;
