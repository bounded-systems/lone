// The unfold engine: projects a DOM subtree into the reader-view content sequence.
// "Unfolding" strips visual scaffolding and retains only what browser reader modes keep —
// headings, paragraphs, code blocks, and lists. aria-hidden subtrees are skipped.

import type { SemanticNodeType } from "../contracts/semantic_node.ts";
import type { FindingType } from "../contracts/finding.ts";
import type { UnfoldedNodeType } from "../contracts/unfolded_node.ts";
import { domToSemanticNode } from "../adapters/dom.ts";
import { validateReaderView } from "../validate/reader_view.ts";

export type Element = typeof globalThis extends { Element: infer E } ? E
  : unknown;

export type UnfoldResult = {
  nodes: UnfoldedNodeType[];
  findings: FindingType[];
};

const invalidSubjectFinding: FindingType = {
  code: "LONE_ENGINE_INVALID_SUBJECT",
  path: "$",
  message:
    "Subject is not a DOM element. Provide an Element for DOM-based unfold.",
  severity: "error",
};

// Entry point over a live DOM element.
// deno-lint-ignore require-await -- async public API; validators may become async
export async function unfoldElement<T extends Element>(
  subject: T,
): Promise<UnfoldResult> {
  const root = domToSemanticNode(subject) as SemanticNodeType | null;
  if (!root) return { nodes: [], findings: [invalidSubjectFinding] };
  return unfoldNode(root);
}

// Entry point over a SemanticNode tree (useful for testing without a live DOM).
export function unfoldNode(root: SemanticNodeType): UnfoldResult {
  const findings = validateReaderView(root);
  const nodes: UnfoldedNodeType[] = [];
  extractNodes(root, nodes);
  return { nodes, findings };
}

const HEADING_RE = /^h([1-6])$/;

function extractNodes(node: SemanticNodeType, out: UnfoldedNodeType[]): void {
  const { type } = node;
  const text = node.name ?? "";

  // Skip aria-hidden subtrees — invisible to reader view
  const ariaHidden = node.props?.["aria-hidden"];
  if (ariaHidden === true || ariaHidden === "true") return;

  // Code blocks: pre is preformatted; <code> is inline but still code
  if (type === "pre" || type === "code") {
    if (text.trim()) {
      out.push({
        kind: "code",
        text: text.trim(),
        preFormatted: type === "pre",
      });
    }
    return;
  }

  // Headings h1–h6
  const headingMatch = HEADING_RE.exec(type);
  if (headingMatch) {
    if (text.trim()) {
      out.push({
        kind: "heading",
        level: parseInt(headingMatch[1], 10),
        text: text.trim(),
      });
    }
    return;
  }

  // Paragraphs
  if (type === "p") {
    if (text.trim()) out.push({ kind: "paragraph", text: text.trim() });
    return;
  }

  // Lists
  if (type === "ul" || type === "ol") {
    const items = node.children
      .filter((c) => c.type === "li")
      .map((li) => (li.name ?? "").trim())
      .filter(Boolean);
    if (items.length) {
      out.push({ kind: "list", ordered: type === "ol", items });
    }
    return;
  }

  // Recurse into block containers (div, section, article, main, etc.)
  node.children.forEach((child) => extractNodes(child, out));
}
