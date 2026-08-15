# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What Is Lone

Lone is a semantic blessing engine for DOM subtrees. It validates DOM element
trees and returns either a branded `Blessed<T>` type (safe) or structured
`Finding[]` (violations found). It serves as a contract boundary for
semantic/accessibility safety — like SafeHtml but for DOM structure.

The project is in POC phase. The execution queue is: Finding schema → bless() →
one backend → MDN fixture runner.

## Build & Test Commands

```bash
# Run all tests
deno test -A --fail-fast tests

# Run a single test file
deno test -A --fail-fast tests/validate/keyboard_accessible_test.ts

# Watch mode
deno task test:watch

# Full CI gate (fmt + lint + typecheck + tests)
deno task ci

# Individual checks
deno fmt --check    # format check
deno lint           # lint
deno check **/*.ts  # typecheck

# Benchmarks
deno bench -A tests/bench
```

**Container-based execution** (canonical for pre-PR):

```bash
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . deno test -A --fail-fast tests
deno task test:docker  # shortcut
```

## Architecture

### Pipeline Flow

```
DOM Element → domToSemanticNode() → SemanticNode → validators[] → Finding[] → bless/fail
```

1. **Contracts** (`src/contracts/`) — Zod schemas that define the core data
   types. These are the source of truth.
   - `Finding` — validation result with `code` (LONE_DOMAIN_RULE format), `path`
     (JSONPath), `message`, `severity`
   - `SemanticNode` — intermediate representation of a DOM element (type, name,
     role, props, children)
   - `ElementSpec` — safe HTML element specification (rejects `<script>`,
     `<iframe>`, event handlers)
   - `ValidatorSpec` — validator metadata (kebab-case id, semver version)

2. **Adapters** (`src/adapters/`) — Convert external representations into
   `SemanticNode`.
   - `dom.ts` — Converts DOM `Element` (or linkedom) to `SemanticNode` tree.
     Uses `ElementLike` interface for DOM-agnostic operation.
   - `cdp.ts` — Converts Chrome DevTools Protocol accessibility tree nodes to
     `SemanticNode`.

3. **Validators** (`src/validate/`) — Each validator takes a `SemanticNode` tree
   and returns `FindingType[]`.
   - `semantic_html.ts` — Checks for proper HTML element usage (headings,
     landmarks, lists, tables, forms)
   - `nameable.ts` — Ensures interactive/landmark elements have accessible names
   - `keyboard_accessible.ts` — Tab navigation, focus order, keyboard trap
     detection
   - `aria_usage.ts` — Valid ARIA roles, required attributes, role-attribute
     compatibility
   - `text_alternatives.ts` — Images need alt text, decorative images need empty
     alt
   - `screen_reader_content.ts` — aria-hidden misuse, empty interactive elements
   - `color_contrast.ts` — Style-based contrast ratio checks

4. **Engine** (`src/engine/mod.ts`) — Orchestrates the pipeline: runs all
   validators, sorts findings deterministically, returns `BlessResult<T>`.

### Key Types

- `bless(element, policy?) → BlessResult<T>` — Main entry point. Returns
  `{ ok: true, value: Blessed<T> }` or `{ ok: false, findings }`.
- `validate(element, policy?) → { findings }` — Validate without blessing.
- `BlessPolicy` — Controls profile (`mdn`/`wcag-lite`/`project`), allow/deny
  codes, failure threshold.
- Findings sort deterministically: severity → code → path → message.

### Test Structure

- `tests/contracts/` — Schema validation tests including property-based tests
  (fast-check)
- `tests/validate/` — Per-validator tests, plus cross-cutting
  `message_quality_test.ts`
- `tests/fixtures/mdn/` — Good/bad HTML fixtures with
  `mdn_fixture_runner_test.ts`
- `tests/engine/` — Pipeline integration tests
- Tests use `linkedom` for DOM parsing (no browser needed)

### Dependencies

- **Runtime**: Deno (TypeScript, no Node.js)
- **Schemas**: Zod for all contract validation
- **DOM**: linkedom for server-side DOM parsing in tests
- **Testing**: Deno standard library (`jsr:@std/assert`), fast-check for
  property-based tests

## Conventions

- Contract-first, TDD-first: define the schema, write tests, then implement.
- Finding codes follow `LONE_<DOMAIN>_<RULE>` uppercase snake_case format.
- Finding paths use JSONPath format starting with `$`.
- All validators are pure functions: `(SemanticNode) → FindingType[]`.
- The `ElementLike` interface in `dom.ts` enables DOM-library-agnostic
  operation.

## Issue Tracking

This project uses `bd` (beads) for all issue tracking. Do not use markdown TODOs
or other tracking. See `AGENTS.md` for the full workflow.

<!-- bounded-systems-org:begin — managed by adopt-claude-harness; do not hand-edit this block -->
## bounded-systems sessions — before anything else

1. **Bootstrap**: run `bash .claude/org-repair.sh` — pre-approved where this
   repo's settings carry the org floor; generator-owned repos may still prompt.
   Its only trust anchor is the dialog-recorded `$ORG_BOOT_SHA256` (typed by a
   human in the environment dialog, never fetched): it executes a local or
   fetched copy ONLY if the bytes hash to that value, and refuses otherwise.
   `bootstrap in effect` → continue. `REFUSED` or a permission denial → stop
   and report; do not work around it.
2. **Claim before working**: dispatch `claim-ticket.yml` in
   `bounded-systems/.github` (workflow_dispatch: `repo`, `issue`, `claimant`),
   then confirm the claim comment ON THE ISSUE names your claimant. Any
   assignee or `claimed` label → someone else's. Window unreachable → claim by
   hand (assign + comment) and say the window was down. No issue → open one.
3. **Degraded mode**: no "bounded-systems — Claude context" block in your
   session context means the org context did not load. You may claim and work
   THIS repo only — no org-level `[settings]`/`[org]` changes, no cross-repo
   work.
<!-- bounded-systems-org:end -->