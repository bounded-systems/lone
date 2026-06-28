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

Deno.test("standard - covers all six areas", () => {
  const areas = new Set(CRITERIA.map((c) => c.area));
  assertEquals(
    areas,
    new Set([
      "html",
      "accessibility",
      "security",
      "performance",
      "compatibility",
      "reliability",
    ]),
  );
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

Deno.test("standard - AAA is the only non-gating criterion", () => {
  const nonGating = CRITERIA.filter((c) => !c.required).map((c) => c.id);
  assertEquals(nonGating, ["a11y.wcag22-aaa-selected"]);
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
