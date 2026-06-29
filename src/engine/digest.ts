// The digest engine: a deterministic, content-addressed identity for every
// SemanticNode. Computed bottom-up so each subtree has a stable digest, turning the
// SemanticNode tree into a Merkle tree. Pure (no I/O); opt-in (validate()/bless() are
// untouched). Consumers bind assertions — findings, conformance verdicts — and
// provenance to the exact subtree they were proven over.
//
// The digest tracks MEANING, not markup: canonicalize() keeps only the semantic
// fields lone's validators read (type, resolved role, normalized accessible name,
// and a conservative, versioned allowlist of semantic props), so two builds that mean
// the same thing hash the same, while presentational/volatile noise (id, class,
// style, data-*, framework hashes, cache-busting URLs) is excluded by construction.

import { createHash } from "node:crypto";
import type { SemanticNodeType } from "../contracts/semantic_node.ts";

/**
 * Version of the canonicalization + hashing scheme. Digests are ONLY comparable
 * across builds that share this version — bump it on ANY change to `canonicalize`,
 * `SEMANTIC_PROP_KEYS`, `PRESENCE_ONLY_KEYS`, or the hashing construction, so a
 * change to the scheme is a visible, breaking event rather than silent digest drift.
 * Intended to move in lockstep with the web-build STANDARD_VERSION.
 */
export const DIGEST_VERSION = "1";

const DIGEST_ALGORITHM = "sha256";

/** A node digest, formatted `sha256:<64 hex>`. */
export type NodeDigest = string;

/** A SemanticNode tree with a `digest` populated on every node. */
export type DigestedNode = SemanticNodeType & {
  digest: NodeDigest;
  children: DigestedNode[];
};

/**
 * Native (non-`aria-*`) attributes that carry semantics lone's validators read.
 * Conservative and versioned: presentational/volatile attributes (id, class, style,
 * data-*, framework hashes) are intentionally absent so the digest tracks meaning,
 * not rendering. `role` is NOT here — the RESOLVED `node.role` is canonicalized
 * directly (see `canonicalize`), which already folds in native + explicit roles.
 * `aria-*` keys are always included via `isSemanticProp`.
 */
const SEMANTIC_PROP_KEYS = new Set<string>([
  "alt",
  "title",
  "lang",
  "dir",
  "href",
  "src",
  "type",
  "scope",
  "headers",
  "for",
  "name",
  "value",
  "placeholder",
  "required",
  "disabled",
  "readonly",
  "checked",
  "selected",
  "multiple",
  "open",
  "controls",
  "label",
  "datetime",
  "colspan",
  "rowspan",
]);

/**
 * Keys whose VALUE is volatile but whose PRESENCE is semantic (e.g. a link target
 * varies, but "this is a link" does not). Canonicalized to a presence marker so two
 * different hrefs hash the same while present-vs-absent still differs. This is a
 * deliberate, reviewable choice — flagged for maintainers as the main open question.
 */
const PRESENCE_ONLY_KEYS = new Set<string>(["href", "src"]);

function isSemanticProp(key: string): boolean {
  return key.startsWith("aria-") || SEMANTIC_PROP_KEYS.has(key);
}

/** Collapse internal whitespace runs and trim; empty → null (semantically absent). */
function normalizeName(name?: string): string | null {
  if (name == null) return null;
  const normalized = name.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

/** The semantic props, filtered + key-sorted, with presence-only values normalized. */
function canonicalProps(
  props: Record<string, unknown> | undefined,
): Array<[string, unknown]> {
  if (!props) return [];
  const out: Array<[string, unknown]> = [];
  for (const key of Object.keys(props).sort()) {
    if (!isSemanticProp(key)) continue;
    out.push([key, PRESENCE_ONLY_KEYS.has(key) ? true : props[key]]);
  }
  return out;
}

/** The canonical, JSON-stable view of a node's OWN semantic fields (no children). */
function canonicalize(node: SemanticNodeType): unknown {
  return {
    v: DIGEST_VERSION,
    type: node.type,
    role: node.role ?? null,
    name: normalizeName(node.name),
    props: canonicalProps(node.props),
  };
}

function sha256Hex(input: string): string {
  return createHash(DIGEST_ALGORITHM).update(input).digest("hex");
}

/**
 * Fold a node's own canonical view together with its already-computed child digests.
 * Child digests are fixed-length and order-significant, so the JSON tuple
 * `[canonical(node), [childDigest…]]` is an unambiguous, collision-resistant preimage.
 */
function combine(
  node: SemanticNodeType,
  childDigests: NodeDigest[],
): NodeDigest {
  const preimage = JSON.stringify([canonicalize(node), childDigests]);
  return `${DIGEST_ALGORITHM}:${sha256Hex(preimage)}`;
}

/**
 * Deterministic, bottom-up digest of a SemanticNode subtree. Same tree → same digest,
 * across processes and machines. Any semantic change to a node or its descendants
 * changes the digest; presentational/volatile changes do not.
 */
export function digestNode(node: SemanticNodeType): NodeDigest {
  return combine(node, (node.children ?? []).map(digestNode));
}

/**
 * Structural copy of the tree with `digest` populated on every node. The returned
 * root's `digest` is identical to `digestNode(node)`, and every node's `digest`
 * equals `digestNode` of the corresponding subtree — so a finding's JSONPath can be
 * resolved straight to the content address of the node it points at.
 */
export function withDigests(node: SemanticNodeType): DigestedNode {
  const children = (node.children ?? []).map(withDigests);
  return {
    ...node,
    children,
    digest: combine(node, children.map((c) => c.digest)),
  };
}
