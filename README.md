# Lone — a blessing boundary

Lone turns an **untrusted DOM subtree** into a **`Blessed<T>`** — a branded value
you can render, cache, or publish with a type- and CI-level guarantee — or a
deterministic **`Finding[]`** explaining why it can't be. One boundary, two exits.

```ts
const result = await lone.bless(rootEl, policy);

if (result.ok) {
  renderBlessed(result.value);     // Blessed<T>: the contract held
  cacheBlessed(result.value);
  publishBlessed(result.value);
} else {
  reportFindings(result.findings); // Finding[]: typed, sorted, actionable
}
```

`Blessed<T>` is `T & { __loneBlessed: true }` — the proof rides the type. Downstream
code can *require* a `Blessed<Element>`, so "is this subtree semantically safe?"
stops being a runtime hope and becomes a signature.

## Why it's in Bounded Systems

The thesis of this org is **bounded authority through contracts** — draw the
boundary, verify at it, let typed proof flow across. Lone is the **runtime** member
of that family:

| Boundary | Build-time | Runtime |
|---|---|---|
| Design / copy / a11y → `@bounded-systems/brand` checkers | ✅ | — |
| DOM semantics → **Lone** | (CI) | ✅ `bless()` |

Brand enforces contracts on the *source* (tokens, content, contrast) before ship.
Lone enforces them on the *artifact* (a real DOM subtree) at the moment it crosses
into render/cache/publish. Same shape — untrusted in, `Blessed<T>` or `Finding[]`
out — at the other end of the pipeline.

## The pattern generalizes

`bless` isn't really about the DOM. It's a **verification boundary**: an untrusted
artifact becomes a branded, trusted value *iff* it satisfies a policy, otherwise a
structured `Finding[]`. DOM semantics is the first domain. The same move applies
anywhere there's an untrusted artifact and a verification step — most naturally to
**supply-chain provenance**:

```ts
// the same boundary, over an in-toto / SLSA attestation
const r = await bless(attestation, provenancePolicy);
//  r.ok  → Blessed<Attestation>   verified provenance; safe to promote
//  else  → Finding[]              LONE_PROVENANCE_* : what failed verification
```

`Blessed<Attestation>` is exactly what a deploy gate wants: a type that *can't*
exist unless the provenance verified. A DOM engine and a provenance engine differ
only in their validators — the boundary, the branding, and the `Finding` contract
are identical. (in-toto interop is a direction, not a v0 promise.)

## Contracts

Everything crossing the boundary is a Zod-validated contract — read top-to-bottom in
`src/contracts/`:

- **`Finding`** — `{ code: LONE_<DOMAIN>_<RULE>, path: <JSONPath>, message, severity }`,
  with a total order (`compareFindings`) so output is deterministic.
- **`ElementSpec` / `SemanticNode` / `ValidatorSpec`** — the shape validators consume.

Validators are small and composable (`src/validate/`): `semantic_html`,
`aria_usage`, `nameable`, `text_alternatives`, `screen_reader_content`,
`keyboard_accessible`, `color_contrast`. Adapters (`src/adapters/`) read a subtree
from the live **DOM** or over the **Chrome DevTools Protocol**.

## API (v0)

```ts
export type BlessPolicy = {
  profile: "mdn" | "wcag-lite" | "project";
  allowCodes?: string[];
  denyCodes?: string[];
  failOn?: "error" | "warn";
};

export type Blessed<T extends Element> = T & { __loneBlessed: true };

export type BlessResult<T extends Element> =
  | { ok: true; value: Blessed<T>; findings: Finding[] }
  | { ok: false; findings: Finding[] };

export function bless<T extends Element>(
  subject: T,
  policy?: BlessPolicy,
): Promise<BlessResult<T>>;
```

## What Lone is / isn't

- ✅ A small library that validates a DOM subtree and returns deterministic
  `Finding[]` or a branded `Blessed<T>`.
- ✅ A contract boundary for semantic safety — think SafeHtml, for the DOM.
- ✅ Contract-first, TDD: schema → tests → minimal implementation.
- ❌ Not a design system or CSS framework (that's `@bounded-systems/brand`).
- ❌ Not a re-implementation of axe-core or full WCAG coverage — it delegates rule
  breadth to existing tools and owns the *boundary*.
- ❌ Not a DOM-mutation or custom-elements requirement.

## Develop

```sh
deno task test     # contract-first test suite
deno task check    # types + lint
```
