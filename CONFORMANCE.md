# Web-Build Conformance Standard

> The typed, multi-standard home for **"what it means for a web build to
> conform, and whether we can claim it."**

This module is lone's answer to overclaim. A green Lighthouse run is **not**
conformance. An automated axe pass is **not** conformance. The strong compact
claim is emitted **only** when every gating criterion has passing evidence — the
same honest-blessing bar the rest of lone (and this ecosystem's copy-review /
string-audit tooling) enforces.

```ts
import { conformance } from "@bounded-systems/lone";

const lone = await validate(rootEl); // lone's static DOM findings
const report = conformance(lone, externalEvidence);

report.conformant; // true iff every gating criterion is `met`
report.claim; // the compact claim string, OR an honest partial summary
report.results; // per-criterion: met | unmet | not-assessed (+ detail)
```

## The compact claim (only when everything passes)

> Conforms to WCAG 2.2 AA, HTML and WAI-ARIA author requirements, OWASP ASVS 5.0
> Level 2, passes Core Web Vitals at p75, and targets Baseline Widely Available.

`conformance()` returns this exact string **only** when every gating criterion
is `met`. Never assemble it by hand — that is precisely the overclaim this
module exists to prevent.

## The standard

| Area              | Standard             | Target                                                                               | Evidence |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------ | -------- |
| **HTML**          | HTML Living Standard | DOM meets HTML author requirements                                                   | **lone** |
| **HTML**          | Nu Html Checker      | Zero validator errors                                                                | external |
| **Accessibility** | WAI-ARIA 1.2         | Valid roles/states/properties/relationships; prefer native HTML                      | **lone** |
| **Accessibility** | WCAG 2.2             | Automatable AA checks (names, text alternatives, contrast, keyboard, SR content)     | **lone** |
| **Accessibility** | axe-core             | Zero serious/critical violations on the rendered page                                | external |
| **Accessibility** | WCAG 2.2             | Complete-flow manual audit incl. keyboard + screen-reader testing                    | external |
| **Accessibility** | WCAG 2.2             | Selected AAA criteria _(recommended — does **not** gate the claim)_                  | external |
| **Security**      | OWASP ASVS 5.0.0     | Level 2 (Level 3 for highly sensitive)                                               | external |
| **Security**      | OWASP ASVS 5.0.0     | Zero known critical/high exploitable vulns                                           | external |
| **Performance**   | Core Web Vitals      | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 on mobile **and** desktop (field data)     | external |
| **Compatibility** | Baseline             | Baseline Widely Available (≥30 months interop), or a tested fallback                 | external |
| **Reliability**   | runtime bar          | No uncaught errors; no broken internal links; critical journeys covered by e2e tests | external |

## Evidence source: lone-measurable vs external

This split is the heart of the design, and it is honest in the types.

### lone-measurable (static, from a DOM subtree)

lone's existing validators map directly onto these criteria. The blessing you
already run feeds the report — no extra inputs.

| Criterion                      | Fed by validators                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `html.dom-author-requirements` | `semantic_html` (`LONE_SEMANTIC_*`)                                                                              |
| `a11y.aria-author`             | `aria_usage` (`LONE_ARIA_*`)                                                                                     |
| `a11y.wcag22-aa-auto`          | `nameable`, `text_alternatives`, `screen_reader_content`, `keyboard_accessible`, `color_contrast`, `reader_view` |

A lone criterion is `met` when its matching findings contain **no
error-severity** finding, `unmet` when they do, and `not-assessed` when the
subject was not a DOM element (`LONE_ENGINE_INVALID_SUBJECT`).

### external (lone verifies shape + thresholds; it never fabricates)

lone **cannot** measure these from a subtree: security posture, field/lab Core
Web Vitals, Baseline feature support, runtime reliability, and the **manual**
parts of WCAG / keyboard / screen-reader testing. So it accepts them as **typed
inputs** and checks their shape and thresholds. Absent evidence is reported as
`not-assessed` — **never silently treated as passing**. A malformed evidence
envelope **throws**: lone refuses to guess.

```ts
const evidence = {
  htmlValidator: { errors: 0 },
  axe: { serious: 0, critical: 0 },
  manualA11y: {
    wcag22AA: true,
    keyboardTested: true,
    screenReaderTested: true,
    completeFlows: true,
  },
  security: { achievedLevel: 2, knownCriticalOrHighVulns: 0 }, // targetLevel defaults to 2
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
```

#### External thresholds

- **Core Web Vitals** — both `mobile` and `desktop` must be present; each sample
  must satisfy LCP ≤ 2500ms, INP ≤ 200ms, CLS ≤ 0.1 at `percentile ≥ 75`. Field
  data is preferred over a single Lighthouse/lab run. (`CLS 0.11` → fail;
  `INP 250` → fail; missing `desktop` → unmet.)
- **OWASP ASVS** — `achievedLevel ≥ targetLevel` (target defaults to L2) **and**
  zero known critical/high vulns.
- **Baseline** — `status: "widely"`, or a newer feature with `fallbackTested`.
- **Reliability** — zero uncaught errors, zero broken internal links, critical
  journeys e2e-covered.

## Claim-gating

```
conformant = every criterion with `required: true` is `met`
claim      = conformant ? COMPACT_CLAIM : honest partial summary
```

- AAA (`a11y.wcag22-aaa-selected`) is **recommended** (`required: false`): it is
  reported, but it does **not** block the compact claim — matching the claim
  text, which mentions AA, not AAA.
- When not conformant, the claim is an honest partial summary, e.g.:

  > Partial conformance: automated DOM checks clean; WCAG 2.2 AA (manual audit)
  > not supplied; OWASP ASVS Level 2 not supplied; Core Web Vitals (p75) not
  > supplied.

## The honest-reporting rule

1. **An automated/Lighthouse/axe pass is a _regression signal_, not
   conformance.** The lone-measurable criteria are a floor — a clean static
   check means "no known automatable defect", not "accessible".
2. **The compact claim needs _all_ evidence, including the manual parts.** WCAG
   2.2 AA conformance requires complete-flow keyboard and screen-reader testing
   that no static tool can perform; ASVS, CWV, Baseline, and reliability are
   external by nature.
3. **lone never fabricates.** Missing evidence is `not-assessed`; malformed
   evidence throws. The only way to the compact claim is real, supplied,
   in-threshold evidence for every gating criterion.

## API

```ts
import {
  COMPACT_CLAIM, // the canonical claim string
  conformance, // (lone, evidence?) => ConformanceReport
  CRITERIA, // readonly Criterion[]
  CWV_THRESHOLDS, // { lcpMs, inpMs, cls, percentile }
  ExternalEvidence, // Zod schema for the evidence envelope
} from "@bounded-systems/lone";
```

`conformance(lone, evidence?)` accepts anything with a `findings` array (the
output of `validate()` or a `BlessResult`) plus the optional external evidence,
and returns a `ConformanceReport`
(`{ standard, version, results, summary,
conformant, claim }`).

## Versioning

This API ships in **0.2.0** (additive — no change to `Blessed<T>`,
`FindingType`, `bless()`, or `validate()`). Consumers pinned to `^0.1` will
**not** auto-pull it; adopting the conformance standard is intentional and
opt-in (bump to `^0.2`).
