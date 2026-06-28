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

### Tier-2 — machine-readable structured content + technical SEO

Reported in `results` + `areaSummaries`; **never** widens the tier-1 compact
claim.

| Area         | Standard                          | Target                                                                      | Required    | Evidence |
| ------------ | --------------------------------- | --------------------------------------------------------------------------- | ----------- | -------- |
| **Semantic** | JSON-LD 1.1 / SHACL               | Structured data conforms to its SHACL shapes (`conforms`, `blocks: 0`)      | yes         | external |
| **SEO**      | technical / RFC 9309              | Canonical, unique titles, RFC 9309 robots, sitemap resolves, 0 broken links | yes         | external |
| **Semantic** | CommonMark                        | Markdown parses cleanly under CommonMark                                    | yes         | external |
| **Semantic** | llms.txt convention               | `llms.txt` present, links resolve, Markdown siblings exposed                | recommended | external |
| **Semantic** | OpenAPI 3.2 / JSON Schema 2020-12 | OpenAPI valid; responses match schemas — _only if an API is published_      | conditional | external |
| **Semantic** | RFC 4287                          | Atom feed valid                                                             | recommended | external |

### Tier-3 — integrity / provenance / reproducibility

| Area          | Standard                | Target                                    | Required    | Evidence  |
| ------------- | ----------------------- | ----------------------------------------- | ----------- | --------- |
| **Integrity** | SLSA / in-toto          | Provenance present, signed, and verified  | yes         | external  |
| **Integrity** | Reproducible Builds     | Build is byte-reproducible                | yes         | external  |
| **Integrity** | SPDX                    | SBOM present, valid, complete, and signed | yes         | external  |
| **Integrity** | RFC 9530                | Repr-Digest headers present               | recommended | external¹ |
| **Integrity** | Bounded Systems release | Release manifest present and signed       | yes         | external  |
| **Integrity** | IPFS / CIDv1            | A content-addressed IPFS CID is recorded  | recommended | external  |
| **Integrity** | RFC 9110                | HTTP semantics conform to RFC 9110        | recommended | external  |

¹ Content digests are an HTTP response-header concern (out of a DOM subtree's
reach today), so they are supplied as external evidence; they are
lone-measurable in principle at the transport layer in future.

### Cognitive accessibility — W3C COGA (new area)

> **Honest labelling:** `cognitive.complexity-budget` is an
> **interface-complexity budget (W3C COGA-derived)** — it is explicitly **NOT**
> a "cognitive-load measurement." It scores the rendered interface (choice
> density, primary-action count, heading depth, clear link purpose,
> interruptions, form/memory burden, motion, progressive disclosure), not a
> person's cognition.

| Area          | Standard           | Target                                                                         | Required    | Evidence  |
| ------------- | ------------------ | ------------------------------------------------------------------------------ | ----------- | --------- |
| **Cognitive** | W3C COGA (derived) | Rendered DOM within an interface-complexity budget                             | recommended | **lone**² |
| **Cognitive** | W3C COGA           | Usability testing with people with cognitive disabilities; critical tasks pass | recommended | external  |

² **Now lone-measurable** — the rendered-DOM validators landed in **0.4.0**
(`validate/cognitive_budget.ts`, `LONE_COGA_*`). The budget is scored statically
from the subtree; `met` when there is **no error-severity** `LONE_COGA_`
finding, `unmet` when there is. The criterion stays **recommended**
(`required: false`) and **never** widens the tier-1 compact claim. It remains an
**interface-complexity budget**, explicitly **NOT** a cognitive-load
measurement.

#### Interface-complexity budget rules (`LONE_COGA_*`)

Each rule is a named, documented budget over the rendered DOM subtree — not a
measure of anyone's cognition. The only **error**-severity findings are the two
genuine automatic on-load interruptions (autoplay, on-load modal); everything
else is a recommendation (warning/info), so the budget reports honestly without
silently failing a build.

| Code                                  | Rule (default threshold)                                                                                                                        | Severity |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `LONE_COGA_CHOICE_DENSITY`            | Interactive controls attributed to one region `> 10` (`CHOICE_DENSITY_MAX`)                                                                     | warning  |
| `LONE_COGA_COMPETING_PRIMARY_ACTIONS` | More than one visually-"primary" action competing in a region (`COMPETING_PRIMARY_ACTIONS_MAX = 1`)                                             | warning  |
| `LONE_COGA_CONTENT_DENSITY`           | Leaf-text words in one content section `> 600` (`CONTENT_DENSITY_MAX_WORDS`)                                                                    | info     |
| `LONE_COGA_HEADING_DEPTH`             | Heading nested past level `4` (`HEADING_DEPTH_MAX`)                                                                                             | warning  |
| `LONE_COGA_MULTIPLE_H1`               | More than one `h1` — one clear top-level heading (`MAX_H1 = 1`)                                                                                 | warning  |
| `LONE_COGA_UNCLEAR_LINK_PURPOSE`      | Bare link text ("click here", "learn more", "read more", …) that doesn't state its purpose                                                      | warning  |
| `LONE_COGA_ICON_ONLY_LINK_UNLABELED`  | Link with no discernible accessible name (icon/image only)                                                                                      | warning  |
| `LONE_COGA_AUTOPLAY_MEDIA`            | `<video>`/`<audio>` with `autoplay` — an on-load interruption                                                                                   | error    |
| `LONE_COGA_MODAL_ON_LOAD`             | `dialog[open]` / `[aria-modal]` shown in the initial render — a forced context change                                                           | error    |
| `LONE_COGA_FOCUS_THEFT`               | `autofocus` moves focus on load without user intent                                                                                             | warning  |
| `LONE_COGA_FORM_BURDEN`               | Form fields `> 12` (`FORM_FIELD_BURDEN_MAX`)                                                                                                    | warning  |
| `LONE_COGA_FORM_REQUIRED_BURDEN`      | Required fields `> 8` (`FORM_REQUIRED_BURDEN_MAX`)                                                                                              | info     |
| `LONE_COGA_MOTION_NO_REDUCED_GUARD`   | Animation/motion marker with no detectable reduced-motion guard (heuristic — a subtree can't see `@media (prefers-reduced-motion)`)             | warning  |
| `LONE_COGA_PROGRESSIVE_DISCLOSURE`    | Simultaneously-visible sections in a region `> 10` (`DISCLOSURE_MAX_SECTIONS`) with no disclosure affordance (tabs/accordion/`<details>`/steps) | info     |

Thresholds are exported named constants (`CHOICE_DENSITY_MAX`, `MAX_H1`, …) and
deliberately generous: a finding means "this region is past the budget", not
"this is broken". The validator runs as part of `validate()`, so a normal
blessing already feeds the criterion.

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
| `cognitive.complexity-budget`  | `cognitive_budget` (`LONE_COGA_*`) — interface-complexity budget; recommended, non-gating                        |

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
    verifiedBy: "Acme Accessibility Auditors", // required for `met`; self-attested → not-assessed
  },
  asvs: { achievedLevel: 2, verifiedBy: "Acme Security Labs" }, // targetLevel defaults to 2; verifiedBy required for `met`
  vulns: { knownCriticalOrHighVulns: 0 }, // tool-measured (e.g. npm audit), decoupled from asvs
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
- **OWASP ASVS** (`asvs`) — `achievedLevel ≥ targetLevel` (target defaults to
  L2) **and** an independent `verifiedBy` is named. A self-attested ASVS level
  (no `verifiedBy`) is `not-assessed`, never `met` — self-grading does not gate
  the claim.
- **Known vulns** (`vulns`) — zero known critical/high vulns. Tool-measured
  (e.g. `npm audit`) and decoupled from `asvs`, so the count stands alone.
- **Manual WCAG 2.2 AA** (`manualA11y`) — all flows attested **and** an
  independent `verifiedBy` is named; self-attested without a verifier is
  `not-assessed`.
- **Baseline** — `status: "widely"`, or a newer feature with `fallbackTested`.
- **Reliability** — zero uncaught errors, zero broken internal links, critical
  journeys e2e-covered.

## Claim-gating

```
conformant = every TIER-1 `required: true` criterion is `met`
claim      = conformant ? COMPACT_CLAIM : honest partial summary
```

- **The compact claim stays tier-1-only.** The `COMPACT_CLAIM` string is
  unchanged and is gated **only** on the original tier-1 required set. Tier-2,
  tier-3, and cognitive criteria are reported in `results` and rolled up in
  `areaSummaries`, but they **never** widen the headline claim — even when they
  are `required: true` within their own tier.
  (`conformant = c.required && (c.tier
  ?? 1) === 1`; criteria with no explicit
  `tier` are tier-1.) **Overclaim-avoidance is the whole point** — we do **not**
  invent a longer compact claim string.
- This is the **(b)-lite design**: one compact claim PLUS honest per-area
  summaries. Each `areaSummary` is
  `{ area, met, unmet, notAssessed, total,
  summary }`, where `summary` is an
  honest one-liner like `"integrity: 5/7 met (2
  not assessed)"`.
- AAA (`a11y.wcag22-aaa-selected`) is **recommended** (`required: false`): it is
  reported, but it does **not** block the compact claim — matching the claim
  text, which mentions AA, not AAA.
- A new required tier-2/tier-3 criterion with **no evidence** is `not-assessed`
  (never `unmet`), so an all-tier-1 build still earns the exact compact claim.
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

The conformance standard first shipped in **0.2.0**. The tier-2/tier-3 +
cognitive-accessibility extension shipped in **0.3.0**.

**0.4.0** lands the cognitive interface-complexity-budget DOM validators —
purely **additive**:

- new `validate/cognitive_budget.ts` (`LONE_COGA_*` findings) wired into
  `validate()`, exported from `mod.ts` (the validator + its named threshold
  constants);
- `cognitive.complexity-budget` is no longer `pendingValidators` — it is now fed
  by those findings and reports `met`/`unmet`/`not-assessed` like the other lone
  criteria. It stays `required: false` (recommended) and **never** widens the
  tier-1 compact claim;
- **no change** to `Blessed<T>`, `FindingType`, `bless()`'s signature, the
  `COMPACT_CLAIM` string, or any tier-1 evaluator/threshold. (`validate()` now
  emits additional recommendation-level `LONE_COGA_*` findings on interfaces
  that exceed the budget — a clean, well-structured subtree is unaffected.)

Because the bump is a minor under `0.x`, consumers pinned to **`^0.3` will NOT
auto-pull `0.4`** (`^0.x.y` is treated as `~0.x` — patch-only — until 1.0). Opt
in explicitly by widening to `^0.4` (or `>=0.3 <0.5`). Adopting the budget
validators is intentional and opt-in.
