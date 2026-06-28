import { assert, assertEquals } from "@std/assert";
import {
  COMPACT_CLAIM,
  CRITERIA,
  CWV_THRESHOLDS,
  ExternalEvidence,
} from "../../src/standard/web_build.ts";

Deno.test("standard - compact claim text is the canonical string", () => {
  assertEquals(
    COMPACT_CLAIM,
    "Conforms to WCAG 2.2 AA, HTML and WAI-ARIA author requirements, " +
      "OWASP ASVS 5.0 Level 2, passes Core Web Vitals at p75, and targets " +
      "Baseline Widely Available.",
  );
});

Deno.test("standard - covers the six tier-1 areas", () => {
  // The six original (tier-1) areas must always be present. Tier-2/tier-3/
  // cognitive add further areas; this asserts the tier-1 floor, not an exact set.
  const areas = new Set(CRITERIA.map((c) => c.area));
  for (
    const a of [
      "html",
      "accessibility",
      "security",
      "performance",
      "compatibility",
      "reliability",
    ] as const
  ) {
    assert(areas.has(a), `missing tier-1 area ${a}`);
  }
});

Deno.test("standard - adds the tier-2/tier-3/cognitive areas", () => {
  const areas = new Set(CRITERIA.map((c) => c.area));
  for (const a of ["semantic", "seo", "integrity", "cognitive"] as const) {
    assert(areas.has(a), `missing extension area ${a}`);
  }
});

Deno.test("standard - criterion ids are unique", () => {
  const ids = CRITERIA.map((c) => c.id);
  assertEquals(new Set(ids).size, ids.length);
});

Deno.test("standard - lone criteria declare finding-code prefixes", () => {
  const lone = CRITERIA.filter((c) => c.evidence === "lone");
  assert(lone.length >= 3);
  for (const c of lone) {
    assert(c.loneCodes && c.loneCodes.length > 0, `${c.id} missing loneCodes`);
    for (const code of c.loneCodes) {
      assert(code.startsWith("LONE_"), `${c.id} prefix ${code} not LONE_`);
    }
  }
});

Deno.test("standard - external criteria carry no lone codes", () => {
  for (const c of CRITERIA.filter((c) => c.evidence === "external")) {
    assertEquals(c.loneCodes, undefined, `${c.id} should not have loneCodes`);
  }
});

Deno.test("standard - tier-1 non-gating criteria are the recommended set", () => {
  // Within tier-1 (the compact-claim gate), the recommended (non-gating) criteria
  // are selected-AAA plus the HSTS-preload external grader. Tier-2/tier-3/cognitive
  // criteria are excluded here because they never gate regardless of `required`.
  const nonGating = CRITERIA
    .filter((c) => (c.tier ?? 1) === 1 && !c.required)
    .map((c) => c.id);
  assertEquals(nonGating, [
    "a11y.wcag22-aaa-selected",
    "security.hsts-preload",
  ]);
});

Deno.test("standard - only tier-1 required criteria gate the compact claim", () => {
  // No tier-2/tier-3/cognitive criterion may be on the compact-claim gate.
  const gating = CRITERIA.filter((c) => c.required && (c.tier ?? 1) === 1);
  const tieredGating = CRITERIA.filter((c) =>
    c.required && (c.tier ?? 1) !== 1
  );
  assert(gating.length > 0, "expected tier-1 gating criteria");
  assertEquals(
    tieredGating.every((c) => c.tier !== 1),
    true,
    "tier-2/3/cognitive must not be tier-1",
  );
  for (const c of CRITERIA) {
    if ((c.tier ?? 1) !== 1) {
      assert(
        !gating.includes(c),
        `${c.id} (tier ${c.tier}) must not gate the compact claim`,
      );
    }
  }
});

Deno.test("standard - CWV thresholds are the documented good values", () => {
  assertEquals(CWV_THRESHOLDS.lcpMs, 2500);
  assertEquals(CWV_THRESHOLDS.inpMs, 200);
  assertEquals(CWV_THRESHOLDS.cls, 0.1);
  assertEquals(CWV_THRESHOLDS.percentile, 75);
});

Deno.test("standard - empty evidence envelope parses to {}", () => {
  assertEquals(ExternalEvidence.parse({}), {});
});

Deno.test("standard - malformed evidence shape throws", () => {
  let threw = false;
  try {
    ExternalEvidence.parse({ htmlValidator: { errors: "lots" } });
  } catch {
    threw = true;
  }
  assert(threw, "expected malformed evidence to throw");
});
