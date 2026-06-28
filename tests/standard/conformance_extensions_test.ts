// Tier-2 / tier-3 / cognitive-accessibility extensions to the conformance model.
//
// These are ADDITIVE: they extend `results` and `areaSummaries` but NEVER widen
// the tier-1 COMPACT_CLAIM. The tier-1 behavioural tests live in
// `conformance_test.ts` and remain unchanged.

import { assert, assertEquals } from "@std/assert";
import { validate } from "../../src/engine/mod.ts";
import type { Element } from "../../src/engine/mod.ts";
import type { ElementLike } from "../../src/adapters/dom.ts";
import {
  COMPACT_CLAIM,
  conformance,
  type ExternalEvidenceInput,
} from "../../src/standard/mod.ts";

const CLEAN_SUBJECT: ElementLike = {
  tagName: "div",
  attributes: [],
  children: [],
};

// Full TIER-1 evidence — enough to satisfy the compact-claim gate. It contains
// NO tier-2/tier-3/cognitive evidence on purpose.
const FULL_TIER1_EVIDENCE: ExternalEvidenceInput = {
  htmlValidator: { errors: 0 },
  axe: { serious: 0, critical: 0 },
  manualA11y: {
    wcag22AA: true,
    keyboardTested: true,
    screenReaderTested: true,
    completeFlows: true,
  },
  security: { achievedLevel: 2, knownCriticalOrHighVulns: 0 },
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

// Tier-2/tier-3/cognitive evidence that meets every threshold.
const FULL_EXTENSION_EVIDENCE: ExternalEvidenceInput = {
  jsonLdShacl: { conforms: true, blocks: 0 },
  seoTechnical: {
    canonicalOk: true,
    titlesUnique: true,
    robotsRfc9309Ok: true,
    sitemapResolves: true,
    brokenInternalLinks: 0,
  },
  commonMark: { conforms: true },
  aiReadability: {
    llmsTxtPresent: true,
    linksResolve: true,
    markdownSiblings: true,
  },
  openApi: { openapiValid: true, responsesMatchSchemas: true },
  feeds: { atomValid: true },
  slsaProvenance: { present: true, signed: true, verified: true },
  reproducibleBuild: { reproducible: true },
  sbom: { present: true, valid: true, complete: true, signed: true },
  contentDigests: { reprDigestHeaders: true },
  signedReleaseManifest: { present: true, signed: true },
  ipfsCid: { cidRecorded: true },
  httpRfc9110: { conforms: true },
  cogaUsability: {
    conducted: true,
    withCognitiveDisabilities: true,
    criticalTasksPassed: true,
  },
};

const NEW_EXTERNAL_IDS = [
  "semantic.jsonld-shacl",
  "seo.technical",
  "semantic.commonmark",
  "semantic.ai-readability",
  "semantic.openapi",
  "semantic.feeds",
  "integrity.slsa-provenance",
  "integrity.reproducible-build",
  "integrity.sbom",
  "integrity.content-digests",
  "integrity.signed-release-manifest",
  "integrity.ipfs-cid",
  "integrity.http-rfc9110",
  "cognitive.coga-usability-testing",
] as const;

async function loneOf(subject: ElementLike) {
  return await validate(subject as unknown as Element);
}

function statusOf(
  // deno-lint-ignore no-explicit-any
  report: any,
  id: string,
): string | undefined {
  // deno-lint-ignore no-explicit-any
  return report.results.find((r: any) => r.id === id)?.status;
}

Deno.test("ext - every new external criterion is not-assessed when evidence absent", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, FULL_TIER1_EVIDENCE);
  for (const id of NEW_EXTERNAL_IDS) {
    assertEquals(
      statusOf(report, id),
      "not-assessed",
      `${id} should be not-assessed`,
    );
  }
});

Deno.test("ext - tier-1 compact claim STILL emits though new required criteria are unassessed", async () => {
  // SHACL/SEO/CommonMark/SLSA/reproducible/SBOM/manifest are required:true, but
  // they are NOT on the tier-1 compact-claim gate, so an all-tier-1 build still
  // earns the exact compact claim.
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, FULL_TIER1_EVIDENCE);
  assertEquals(report.conformant, true);
  assertEquals(report.claim, COMPACT_CLAIM);
  // unmet stays 0: missing evidence is not-assessed, never unmet.
  assertEquals(report.summary.unmet, 0);
});

Deno.test("ext - every new criterion is met on full in-threshold evidence", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    ...FULL_EXTENSION_EVIDENCE,
  });
  for (const id of NEW_EXTERNAL_IDS) {
    assertEquals(statusOf(report, id), "met", `${id} should be met`);
  }
  // The compact claim is unchanged — it never grows to mention the new areas.
  assertEquals(report.claim, COMPACT_CLAIM);
});

Deno.test("ext - SHACL conforms:false is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    jsonLdShacl: { conforms: false, blocks: 3 },
  });
  assertEquals(statusOf(report, "semantic.jsonld-shacl"), "unmet");
  // ...and it does NOT pull down the tier-1 compact claim.
  assertEquals(report.conformant, true);
  assertEquals(report.claim, COMPACT_CLAIM);
});

Deno.test("ext - SHACL conforms:true but blocks>0 is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    jsonLdShacl: { conforms: true, blocks: 1 },
  });
  assertEquals(statusOf(report, "semantic.jsonld-shacl"), "unmet");
});

Deno.test("ext - SEO broken internal links is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    seoTechnical: {
      canonicalOk: true,
      titlesUnique: true,
      robotsRfc9309Ok: true,
      sitemapResolves: true,
      brokenInternalLinks: 2,
    },
  });
  assertEquals(statusOf(report, "seo.technical"), "unmet");
});

Deno.test("ext - SBOM incomplete is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    sbom: { present: true, valid: true, complete: false, signed: true },
  });
  assertEquals(statusOf(report, "integrity.sbom"), "unmet");
});

Deno.test("ext - SLSA provenance not verified is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    slsaProvenance: { present: true, signed: true, verified: false },
  });
  assertEquals(statusOf(report, "integrity.slsa-provenance"), "unmet");
});

Deno.test("ext - signed release manifest unsigned is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    signedReleaseManifest: { present: true, signed: false },
  });
  assertEquals(statusOf(report, "integrity.signed-release-manifest"), "unmet");
});

Deno.test("ext - reproducible build false is unmet", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    reproducibleBuild: { reproducible: false },
  });
  assertEquals(statusOf(report, "integrity.reproducible-build"), "unmet");
});

Deno.test("ext - recommended AI-readability gap is unmet but never gates", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    aiReadability: {
      llmsTxtPresent: true,
      linksResolve: false,
      markdownSiblings: true,
    },
  });
  assertEquals(statusOf(report, "semantic.ai-readability"), "unmet");
  assertEquals(report.conformant, true);
});

Deno.test("ext - cognitive interface-complexity budget is now ASSESSED (validators landed)", async () => {
  // The DOM validators now exist, so the budget is measured from the subtree
  // instead of being reported not-assessed. A clean subject has no LONE_COGA_
  // findings, so the criterion is `met` (it stays recommended, non-gating).
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    ...FULL_EXTENSION_EVIDENCE,
  });
  const coga = report.results.find((r) =>
    r.id === "cognitive.complexity-budget"
  );
  assertEquals(coga?.status, "met");
  assertEquals(coga?.required, false);
  assertEquals(coga?.evidence, "lone");
  // It assesses now — it must not fall back to the pending-validators message.
  assert(!coga?.detail.includes("not yet implemented"));
  // Non-gating: it never widens the tier-1 compact claim.
  assertEquals(report.conformant, true);
  assertEquals(report.claim, COMPACT_CLAIM);
  // Honest labelling: a budget, NOT a cognitive-load measurement.
  assert(coga?.label.toLowerCase().includes("interface-complexity budget"));
  assert(!coga?.label.toLowerCase().includes("cognitive-load"));
});

Deno.test("ext - cognitive budget goes UNMET on an error-severity COGA finding (autoplay)", async () => {
  // An autoplaying <video> is an on-load interruption: an error-severity
  // LONE_COGA_ finding, which flips the (still non-gating) budget to unmet.
  const AUTOPLAY_SUBJECT: ElementLike = {
    tagName: "main",
    attributes: [],
    children: [
      {
        tagName: "video",
        attributes: [{ name: "autoplay", value: "" }],
        children: [],
      },
    ],
  };
  const lone = await loneOf(AUTOPLAY_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    ...FULL_EXTENSION_EVIDENCE,
  });
  const coga = report.results.find((r) =>
    r.id === "cognitive.complexity-budget"
  );
  assertEquals(coga?.status, "unmet");
  // Recommended + non-gating by construction: it is required:false and lives in
  // the "cognitive" tier, so it never sits on the tier-1 compact-claim gate.
  assertEquals(coga?.required, false);
  assertEquals(coga?.tier, "cognitive");
});

Deno.test("ext - areaSummaries report each area's met/total honestly", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    ...FULL_EXTENSION_EVIDENCE,
  });

  const areas = new Set(report.areaSummaries.map((a) => a.area));
  for (const a of ["semantic", "seo", "integrity", "cognitive"] as const) {
    assert(areas.has(a), `missing area summary for ${a}`);
  }
  // Counts in each area summary are internally consistent.
  for (const a of report.areaSummaries) {
    assertEquals(a.met + a.unmet + a.notAssessed, a.total);
    assert(a.summary.startsWith(`${a.area}: `));
  }
  // Cognitive: on a clean subject the interface-complexity budget is met and
  // the manual COGA usability test is met (evidence supplied) → 2/2 met.
  const cognitive = report.areaSummaries.find((a) => a.area === "cognitive");
  assertEquals(cognitive?.total, 2);
  assertEquals(cognitive?.met, 2);
  assertEquals(cognitive?.notAssessed, 0);
});

Deno.test("ext - areaSummaries totals reconcile with the overall summary", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  const report = conformance(lone, {
    ...FULL_TIER1_EVIDENCE,
    ...FULL_EXTENSION_EVIDENCE,
  });
  const sum = (k: "met" | "unmet" | "notAssessed") =>
    report.areaSummaries.reduce((n, a) => n + a[k], 0);
  assertEquals(sum("met"), report.summary.met);
  assertEquals(sum("unmet"), report.summary.unmet);
  assertEquals(sum("notAssessed"), report.summary.notAssessed);
});

Deno.test("ext - malformed new evidence shape throws (lone never guesses)", async () => {
  const lone = await loneOf(CLEAN_SUBJECT);
  let threw = false;
  try {
    // deno-lint-ignore no-explicit-any
    conformance(lone, { jsonLdShacl: { conforms: true, blocks: -1 } } as any);
  } catch {
    threw = true;
  }
  assert(threw, "expected malformed tier-2 evidence to throw");
});
