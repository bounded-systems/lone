// Validates content is browser reader-view compatible.
// Reader view strips CSS — code blocks must use <pre>/<code> to be recognized.
// Also flags decorative images that lack aria-hidden (appear as noise in reader mode).

import type { SemanticNodeType } from "../contracts/semantic_node.ts";
import type { FindingType } from "../contracts/finding.ts";

const CODE_CLASS_RE = /\bcode\b/;

export function validateReaderView(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];
  walk(root, path, findings);
  return findings;
}

function walk(
  node: SemanticNodeType,
  path: string,
  findings: FindingType[],
): void {
  findings.push(...checkNode(node, path));
  node.children.forEach((child, i) => {
    walk(child, `${path}.children[${i}]`, findings);
  });
}

function checkNode(node: SemanticNodeType, path: string): FindingType[] {
  const findings: FindingType[] = [];

  // Code-like div/span that won't survive reader view stripping CSS
  if (
    (node.type === "div" || node.type === "span") &&
    hasCodeClass(node)
  ) {
    findings.push({
      code: "LONE_READER_CODE_NOT_PRE",
      path,
      message:
        `Element type="${node.type}" carries a code-like class but is not <pre> or <code>. ` +
        "Reader view won't recognize it as a code block — use <pre> instead.",
      severity: "warning",
    });
  }

  // Decorative image (alt="") without aria-hidden appears in reader view as a broken image slot
  if (node.type === "img") {
    const alt = node.props?.["alt"];
    const ariaHidden = node.props?.["aria-hidden"];
    if (
      alt === "" &&
      ariaHidden !== true &&
      ariaHidden !== "true"
    ) {
      findings.push({
        code: "LONE_READER_DECORATIVE_IMG_NOT_HIDDEN",
        path,
        message: 'Decorative image (alt="") is missing aria-hidden="true". ' +
          "Reader view may still render it as a broken image slot.",
        severity: "info",
      });
    }
  }

  return findings;
}

function hasCodeClass(node: SemanticNodeType): boolean {
  const cls = node.props?.["class"] ?? node.props?.["className"] ?? "";
  return typeof cls === "string" && CODE_CLASS_RE.test(cls);
}
