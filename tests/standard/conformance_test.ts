import { assert, assertEquals } from "@std/assert";
import { validate } from "../../src/engine/mod.ts";
import type { Element } from "../../src/engine/mod.ts";
import type { ElementLike } from "../../src/adapters/dom.ts";
import {
  COMPACT_CLAIM,
  conformance,
  type ExternalEvidenceInput,
} from "../../src/standard/mod.ts";

// A DOM subtree that passes every lone validator (zero findings).
const CLEAN_SUBJECT: ElementLike = {
  tagName: "div",
  attributes: [],
  children: [],
};

// A DOM subtree that trips semantic validators (error-severity findings).
const BAD_SUBJECT: ElementLike = {
  tagName: "a",
  attributes: [{ name: "onclick", value: "doThing()" }],
  children: [],
};

// Full external evidence that meets every gating threshold. AAA is omitted on
// purpose: it is recommended (non-gating) so the compact claim must still hold.
const FULL_EVIDENCE: ExternalEvidenceInput = {
  htmlValidator: { errors: 0 },
  axe: { serious: 0, critical: 0 },
  manualA11y: {
    wcag22AA: true,
    keyboardTested: true,
    screenReaderTested: true,
    completeFlows: true,
    verifiedBy: "Acme Accessibility Auditors",
  },
  asvs: { achievedLevel: 2, verifiedBy: "Acme Security Labs" },
  vulns: { knownCriticalOrHighVulns: 0 },
  coreWebVitals: [
    {
      formFactor: "mobile",
      percentile: 75,
      lcpMs: 2000,
      inpMs: 150,
      cls: 0.05,
    },
    {
      formFactor: "desktop",
      percentile: 75,
      lcpMs: 1500,
      inpMs: 100,
      cls: 0.02,
    },
  ],
  baseline: { status: "widely" },
  reliability: {
    uncaughtErrors: 0,
    brokenInternalLinks: 0,
    e2eCriticalJourneys: true,
  },
};

async function loneOf(subject: ElementLike) {
  return await validate(subject as unknown as Element);
}

Deno.test("conformance - full compact claim only when all gating criteria met", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, FULL_EVIDENCE);

  assertEquals(report.conformant, true);
  assertEquals(report.claim, COMPACT_CLAIM);
  assertEquals(report.summary.unmet, 0);
});

Deno.test("conformance - claim WITHHELD when no external evidence supplied", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone);

  assertEquals(report.conformant, false);
  assert(report.claim !== COMPACT_CLAIM);
  assert(report.claim.startsWith("Partial conformance:"));
  // lone checks are clean even though external evidence is missing.
  assert(report.claim.includes("automated DOM checks clean"));
  assert(report.claim.includes("not supplied"));
});

Deno.test("conformance - claim WITHHELD when a lone criterion is unmet", async () => {
  const lone = await loneOf(BAD_SUBJECT);
  const report = conformance(lone, FULL_EVIDENCE);

  assertEquals(report.conformant, false);
  assert(report.claim !== COMPACT_CLAIM);
  const html = report.results.find((r) =>
    r.id === "html.dom-author-requirements"
  );
  assertEquals(html?.status, "unmet");
  assert((html?.findings?.length ?? 0) > 0);
});

Deno.test("conformance - AAA omitted is not-assessed but does NOT block the claim", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, FULL_EVIDENCE);

  const aaa = report.results.find((r) => r.id === "a11y.wcag22-aaa-selected");
  assertEquals(aaa?.status, "not-assessed");
  assertEquals(aaa?.required, false);
  assertEquals(report.conformant, true);
});

Deno.test("conformance - CLS 0.11 fails the Core Web Vitals criterion", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_EVIDENCE,
    coreWebVitals: [
      {
        formFactor: "mobile",
        percentile: 75,
        lcpMs: 2000,
        inpMs: 150,
        cls: 0.11,
      },
      {
        formFactor: "desktop",
        percentile: 75,
        lcpMs: 1500,
        inpMs: 100,
        cls: 0.02,
      },
    ],
  });

  const cwv = report.results.find((r) =>
    r.id === "performance.core-web-vitals"
  );
  assertEquals(cwv?.status, "unmet");
  assertEquals(report.conformant, false);
});

Deno.test("conformance - INP 250ms fails the Core Web Vitals criterion", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_EVIDENCE,
    coreWebVitals: [
      {
        formFactor: "mobile",
        percentile: 75,
        lcpMs: 2000,
        inpMs: 250,
        cls: 0.05,
      },
      {
        formFactor: "desktop",
        percentile: 75,
        lcpMs: 1500,
        inpMs: 100,
        cls: 0.02,
      },
    ],
  });

  const cwv = report.results.find((r) =>
    r.id === "performance.core-web-vitals"
  );
  assertEquals(cwv?.status, "unmet");
  assertEquals(report.conformant, false);
});

Deno.test("conformance - CWV missing a form factor is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_EVIDENCE,
    coreWebVitals: [
      {
        formFactor: "mobile",
        percentile: 75,
        lcpMs: 2000,
        inpMs: 150,
        cls: 0.05,
      },
    ],
  });

  const cwv = report.results.find((r) =>
    r.id === "performance.core-web-vitals"
  );
  assertEquals(cwv?.status, "unmet");
  assert(cwv?.detail.includes("desktop"));
});

Deno.test("conformance - ASVS below target level is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_EVIDENCE,
    asvs: { achievedLevel: 1, verifiedBy: "Acme Security Labs" },
  });

  const asvs = report.results.find((r) => r.id === "security.asvs");
  assertEquals(asvs?.status, "unmet");
  assertEquals(report.conformant, false);
});

Deno.test("conformance - known critical vuln fails the no-vulns criterion", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_EVIDENCE,
    vulns: { knownCriticalOrHighVulns: 1 },
  });

  const vulns = report.results.find((r) =>
    r.id === "security.no-critical-vulns"
  );
  assertEquals(vulns?.status, "unmet");
});

Deno.test("conformance - self-attested ASVS (no verifiedBy) is not-assessed, not met", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_EVIDENCE,
    asvs: { achievedLevel: 2 }, // level reached, but no independent verifier
  });

  const asvs = report.results.find((r) => r.id === "security.asvs");
  assertEquals(asvs?.status, "not-assessed");
  assert(asvs?.detail.includes("self-attested"));
  // A self-graded level alone must NOT yield the compact claim.
  assertEquals(report.conformant, false);
});

Deno.test("conformance - self-attested manual WCAG (no verifiedBy) is not-assessed, not met", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_EVIDENCE,
    manualA11y: {
      wcag22AA: true,
      keyboardTested: true,
      screenReaderTested: true,
      completeFlows: true,
    }, // attested clean, but no independent verifier
  });

  const manual = report.results.find((r) => r.id === "a11y.wcag22-aa-manual");
  assertEquals(manual?.status, "not-assessed");
  assert(manual?.detail.includes("self-attested"));
  assertEquals(report.conformant, false);
});

Deno.test("conformance - vulns are assessable with no asvs object present", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, { vulns: { knownCriticalOrHighVulns: 3 } });

  const vulns = report.results.find((r) =>
    r.id === "security.no-critical-vulns"
  );
  assertEquals(vulns?.status, "unmet"); // 3 vulns, no asvs object needed
  const asvs = report.results.find((r) => r.id === "security.asvs");
  assertEquals(asvs?.status, "not-assessed"); // absent asvs → not-assessed
});

Deno.test("conformance - Baseline newly available needs a tested fallback", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);

  const withoutFallback = conformance(lone, {
    ...FULL_EVIDENCE,
    baseline: { status: "newly" },
  });
  assertEquals(
    withoutFallback.results.find((r) => r.id === "compatibility.baseline")
      ?.status,
    "unmet",
  );

  const withFallback = conformance(lone, {
    ...FULL_EVIDENCE,
    baseline: { status: "newly", fallbackTested: true },
  });
  assertEquals(
    withFallback.results.find((r) => r.id === "compatibility.baseline")?.status,
    "met",
  );
});

Deno.test("conformance - invalid subject leaves lone criteria not-assessed", async () => {
  const lone = await loneOf({} as ElementLike); // no tagName -> invalid subject
  const report = conformance(lone, FULL_EVIDENCE);

  const loneResults = report.results.filter((r) => r.evidence === "lone");
  for (const r of loneResults) {
    assertEquals(r.status, "not-assessed");
  }
  assertEquals(report.conformant, false);
  assert(report.claim.includes("DOM not assessed"));
});

Deno.test("conformance - malformed evidence shape throws (lone never guesses)", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  let threw = false;
  try {
    // deno-lint-ignore no-explicit-any
    conformance(lone, { axe: { serious: -1 } } as any);
  } catch {
    threw = true;
  }
  assert(threw, "expected malformed evidence to throw");
});

Deno.test("conformance - report summary counts add up to total criteria", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, FULL_EVIDENCE);
  const { met, unmet, notAssessed, total } = report.summary;
  assertEquals(met + unmet + notAssessed, total);
  assertEquals(total, report.results.length);
});
