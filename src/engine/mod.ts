import type { FindingType } from "../contracts/finding.ts";
import { sortFindings } from "../contracts/finding.ts";
import type { SemanticNodeType } from "../contracts/semantic_node.ts";
import { domToSemanticNode } from "../adapters/dom.ts";
import { validateSemanticHTML } from "../validate/semantic_html.ts";
import { validateNameRequired } from "../validate/nameable.ts";
import { validateKeyboardAccessible } from "../validate/keyboard_accessible.ts";
import { validateARIAUsage } from "../validate/aria_usage.ts";
import { validateTextAlternatives } from "../validate/text_alternatives.ts";
import { validateScreenReaderContent } from "../validate/screen_reader_content.ts";
import { validateColorContrast } from "../validate/color_contrast.ts";
import { validateReaderView } from "../validate/reader_view.ts";
import { validateCognitiveBudget } from "../validate/cognitive_budget.ts";

export { unfoldElement, unfoldNode, type UnfoldResult } from "./unfold.ts";
export {
  DIGEST_VERSION,
  type DigestedNode,
  digestNode,
  type NodeDigest,
  withDigests,
} from "./digest.ts";

export type Element = typeof globalThis extends { Element: infer E } ? E
  : unknown;

export type BlessPolicy = {
  profile: "mdn" | "wcag-lite" | "project";
  allowCodes?: string[];
  denyCodes?: string[];
  failOn?: "error" | "warn";
};

export type Blessed<T extends Element> = T & { __loneBlessed: true };

export type BlessResult<T extends Element> =
  | { ok: true; value: Blessed<T>; findings: FindingType[] }
  | { ok: false; findings: FindingType[] };

const invalidSubjectFinding: FindingType = {
  code: "LONE_ENGINE_INVALID_SUBJECT",
  path: "$",
  message:
    "Subject is not a DOM element. Provide an Element for DOM-based validation.",
  severity: "error",
};

function blessValue<T extends Element>(subject: T): Blessed<T> {
  return subject as Blessed<T>;
}

// deno-lint-ignore require-await -- async public API, mirrors bless(); validators may become async
export async function validate<T extends Element>(
  subject: T,
  _policy?: BlessPolicy,
): Promise<{ findings: FindingType[] }> {
  const root = domToSemanticNode(subject) as SemanticNodeType | null;
  if (!root) return { findings: [invalidSubjectFinding] };

  const findings: FindingType[] = [];
  findings.push(...validateSemanticHTML(root));
  findings.push(...validateNameRequired(root));
  findings.push(...validateKeyboardAccessible(root));
  findings.push(...validateARIAUsage(root));
  findings.push(...validateTextAlternatives(root));
  findings.push(...validateScreenReaderContent(root));
  findings.push(...validateColorContrast(root));
  findings.push(...validateReaderView(root));
  findings.push(...validateCognitiveBudget(root));

  return { findings: sortFindings(findings) };
}

export async function bless<T extends Element>(
  subject: T,
  policy?: BlessPolicy,
): Promise<BlessResult<T>> {
  const { findings } = await validate(subject, policy);

  if (findings.length > 0) {
    return { ok: false, findings };
  }

  return { ok: true, value: blessValue(subject), findings };
}
