// Conformance aggregator.
//
// Folds (a) lone's static DOM findings and (b) supplied external evidence into a
// single typed report. The contract that matters: the strong compact claim is
// emitted ONLY when every gating criterion is `met`. Anything less yields an
// honest partial summary that names what is clean, what is unmet, and what was
// never assessed. lone never fabricates evidence — absent external evidence is
// reported as `not-assessed`, never silently treated as passing.

import type { FindingType } from "../contracts/finding.ts";
import {
  COMPACT_CLAIM,
  CRITERIA,
  type Criterion,
  CWV_THRESHOLDS,
  ExternalEvidence,
  type ExternalEvidenceInput,
  type ExternalEvidenceType,
  STANDARD_NAME,
  STANDARD_VERSION,
} from "./web_build.ts";

/** Whether lone could not even read the subtree. */
const INVALID_SUBJECT_CODE = "LONE_ENGINE_INVALID_SUBJECT";

export type CriterionStatus = "met" | "unmet" | "not-assessed";

/** A criterion plus the verdict reached for it. */
export type CriterionResult = Criterion & {
  status: CriterionStatus;
  /** Human-readable explanation of the verdict. */
  detail: string;
  /** For lone criteria: the matching findings that drove the verdict. */
  findings?: FindingType[];
};

export type ConformanceSummary = {
  met: number;
  unmet: number;
  notAssessed: number;
  total: number;
};

export type ConformanceReport = {
  standard: string;
  version: string;
  results: CriterionResult[];
  summary: ConformanceSummary;
  /** True iff every `required` criterion is `met`. */
  conformant: boolean;
  /**
   * The compact claim string iff `conformant`, otherwise an honest partial
   * summary. Never the compact claim unless every gating criterion passed.
   */
  claim: string;
};

/** Minimal shape accepted from `validate()` or a `BlessResult`. */
export type LoneFindings = { findings: FindingType[] };

/** An external-evidence verdict (no findings). */
type ExternalVerdict = { status: CriterionStatus; detail: string };

/**
 * Per-criterion evaluator for external evidence. Returns `not-assessed` when the
 * relevant evidence field is absent; otherwise checks shape/thresholds.
 */
const EXTERNAL_EVALUATORS: Record<
  string,
  (e: ExternalEvidenceType) => ExternalVerdict
> = {
  "html.validator-clean": (e) => {
    const v = e.htmlValidator;
    if (!v) return notAssessed("no Nu HTML Checker report supplied");
    return v.errors === 0
      ? met("0 validator errors")
      : unmet(`${v.errors} validator error(s)`);
  },

  "a11y.axe-serious-critical": (e) => {
    const v = e.axe;
    if (!v) return notAssessed("no axe-core scan supplied");
    const bad = v.serious + v.critical;
    return bad === 0
      ? met("0 serious/critical violations")
      : unmet(`${v.critical} critical, ${v.serious} serious violation(s)`);
  },

  "a11y.wcag22-aa-manual": (e) => {
    const v = e.manualA11y;
    if (!v) return notAssessed("no manual WCAG 2.2 AA audit supplied");
    const ok = v.wcag22AA && v.keyboardTested && v.screenReaderTested &&
      v.completeFlows;
    if (ok) return met("manual AA audit attested across complete flows");
    const gaps: string[] = [];
    if (!v.wcag22AA) gaps.push("AA not attested");
    if (!v.keyboardTested) gaps.push("keyboard not tested");
    if (!v.screenReaderTested) gaps.push("screen reader not tested");
    if (!v.completeFlows) gaps.push("flows incomplete");
    return unmet(gaps.join(", "));
  },

  "a11y.wcag22-aaa-selected": (e) => {
    const v = e.wcag22AAA;
    if (!v) return notAssessed("no AAA attestation supplied (optional)");
    return v.met
      ? met(`selected AAA met (${v.criteria.length} criteria)`)
      : unmet("selected AAA not met");
  },

  "security.asvs": (e) => {
    const v = e.security;
    if (!v) return notAssessed("no OWASP ASVS attestation supplied");
    return v.achievedLevel >= v.targetLevel
      ? met(
        `ASVS ${v.version} Level ${v.achievedLevel} (target L${v.targetLevel})`,
      )
      : unmet(
        `ASVS Level ${v.achievedLevel} below target L${v.targetLevel}`,
      );
  },

  "security.no-critical-vulns": (e) => {
    const v = e.security;
    if (!v) return notAssessed("no vulnerability report supplied");
    return v.knownCriticalOrHighVulns === 0
      ? met("0 known critical/high vulns")
      : unmet(`${v.knownCriticalOrHighVulns} known critical/high vuln(s)`);
  },

  "performance.core-web-vitals": (e) => {
    const samples = e.coreWebVitals;
    if (!samples || samples.length === 0) {
      return notAssessed("no Core Web Vitals field data supplied");
    }
    const factors = new Set(samples.map((s) => s.formFactor));
    const missing = (["mobile", "desktop"] as const).filter(
      (f) => !factors.has(f),
    );
    if (missing.length > 0) {
      return unmet(`missing ${missing.join(" + ")} field data`);
    }
    const failures: string[] = [];
    for (const s of samples) {
      if (s.percentile < CWV_THRESHOLDS.percentile) {
        failures.push(`${s.formFactor} below p${CWV_THRESHOLDS.percentile}`);
      }
      if (s.lcpMs > CWV_THRESHOLDS.lcpMs) {
        failures.push(`${s.formFactor} LCP ${s.lcpMs}ms`);
      }
      if (s.inpMs > CWV_THRESHOLDS.inpMs) {
        failures.push(`${s.formFactor} INP ${s.inpMs}ms`);
      }
      if (s.cls > CWV_THRESHOLDS.cls) {
        failures.push(`${s.formFactor} CLS ${s.cls}`);
      }
    }
    return failures.length === 0
      ? met("LCP/INP/CLS within thresholds at p75, mobile + desktop")
      : unmet(failures.join("; "));
  },

  "compatibility.baseline": (e) => {
    const v = e.baseline;
    if (!v) return notAssessed("no Baseline result supplied");
    if (v.status === "widely") return met("Baseline Widely Available");
    return v.fallbackTested
      ? met(`Baseline ${v.status}, with a tested fallback`)
      : unmet(`Baseline ${v.status} and no tested fallback`);
  },

  "reliability.runtime": (e) => {
    const v = e.reliability;
    if (!v) return notAssessed("no runtime reliability report supplied");
    const gaps: string[] = [];
    if (v.uncaughtErrors !== 0) {
      gaps.push(`${v.uncaughtErrors} uncaught error(s)`);
    }
    if (v.brokenInternalLinks !== 0) {
      gaps.push(`${v.brokenInternalLinks} broken link(s)`);
    }
    if (!v.e2eCriticalJourneys) gaps.push("critical journeys not e2e-covered");
    return gaps.length === 0
      ? met("no runtime errors, no broken links, critical journeys e2e-covered")
      : unmet(gaps.join(", "));
  },
};

function met(detail: string): ExternalVerdict {
  return { status: "met", detail };
}
function unmet(detail: string): ExternalVerdict {
  return { status: "unmet", detail };
}
function notAssessed(detail: string): ExternalVerdict {
  return { status: "not-assessed", detail };
}

/** Findings whose code starts with any of the criterion's prefixes. */
function matchFindings(
  findings: FindingType[],
  prefixes: readonly string[],
): FindingType[] {
  return findings.filter((f) => prefixes.some((p) => f.code.startsWith(p)));
}

function evaluateLone(
  c: Criterion,
  findings: FindingType[],
  subjectInvalid: boolean,
): CriterionResult {
  if (subjectInvalid) {
    return {
      ...c,
      status: "not-assessed",
      detail: "subject is not a DOM element; lone could not assess it",
      findings: [],
    };
  }
  const matched = matchFindings(findings, c.loneCodes ?? []);
  const errors = matched.filter((f) => f.severity === "error");
  if (errors.length === 0) {
    const note = matched.length === 0
      ? "no findings"
      : `${matched.length} non-error finding(s)`;
    return {
      ...c,
      status: "met",
      detail: `lone static checks clean (${note})`,
      findings: matched,
    };
  }
  return {
    ...c,
    status: "unmet",
    detail: `${errors.length} error-severity finding(s)`,
    findings: matched,
  };
}

/**
 * Aggregate lone findings + external evidence into a conformance report.
 *
 * @param lone Output of `validate()` or a `BlessResult` (anything with
 *   `findings`). Drives the lone-measurable criteria.
 * @param evidence Typed external evidence. Validated for shape (throws on a
 *   malformed envelope — lone refuses to guess). Absent fields → `not-assessed`.
 */
export function conformance(
  lone: LoneFindings,
  evidence?: ExternalEvidenceInput,
): ConformanceReport {
  const parsed = ExternalEvidence.parse(evidence ?? {});
  const findings = lone.findings ?? [];
  const subjectInvalid = findings.some((f) => f.code === INVALID_SUBJECT_CODE);

  const results: CriterionResult[] = CRITERIA.map((c) => {
    if (c.evidence === "lone") {
      return evaluateLone(c, findings, subjectInvalid);
    }
    const evaluator = EXTERNAL_EVALUATORS[c.id];
    const verdict = evaluator
      ? evaluator(parsed)
      : notAssessed("no evaluator registered");
    return { ...c, status: verdict.status, detail: verdict.detail };
  });

  const summary: ConformanceSummary = {
    met: results.filter((r) => r.status === "met").length,
    unmet: results.filter((r) => r.status === "unmet").length,
    notAssessed: results.filter((r) => r.status === "not-assessed").length,
    total: results.length,
  };

  const gating = results.filter((r) => r.required);
  const conformant = gating.every((r) => r.status === "met");

  return {
    standard: STANDARD_NAME,
    version: STANDARD_VERSION,
    results,
    summary,
    conformant,
    claim: conformant ? COMPACT_CLAIM : partialSummary(results),
  };
}

/** Build an honest partial summary naming what is clean, unmet, and unassessed. */
function partialSummary(results: CriterionResult[]): string {
  const parts: string[] = [];

  const loneResults = results.filter((r) => r.evidence === "lone");
  const loneNotAssessed = loneResults.some((r) => r.status === "not-assessed");
  const loneUnmet = loneResults.filter((r) => r.status === "unmet");
  if (loneNotAssessed) {
    parts.push("DOM not assessed (invalid subject)");
  } else if (loneUnmet.length === 0) {
    parts.push("automated DOM checks clean");
  } else {
    parts.push(
      `automated DOM checks found issues in ${
        loneUnmet.map((r) => r.label).join(", ")
      }`,
    );
  }

  const gating = results.filter((r) => r.required && r.evidence === "external");
  const unmet = gating.filter((r) => r.status === "unmet");
  const unassessed = gating.filter((r) => r.status === "not-assessed");
  for (const r of unmet) parts.push(`${r.label} unmet`);
  for (const r of unassessed) parts.push(`${r.label} not supplied`);

  return `Partial conformance: ${parts.join("; ")}.`;
}
