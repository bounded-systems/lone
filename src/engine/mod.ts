import type { FindingType } from "../contracts/finding.ts";
import { sortFindings } from "../contracts/finding.ts";
import type { SemanticNodeType } from "../contracts/semantic_node.ts";
import { Graph } from "../contracts/graph_node.ts";
import { Ontology } from "../contracts/ontology.ts";
import { validateGraphIntegrity } from "../validate/graph_integrity.ts";
import { validateOntology } from "../validate/graph_ontology.ts";
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

// Validate a graph (lone's non-DOM input) for structural soundness — distinct
// identities, resolvable references, reachability. Parses the input against the
// Graph contract first; a shape that isn't a graph yields a single
// LONE_GRAPH_INVALID_INPUT finding. Mirrors validate() for the DOM path.
// When an ontology is supplied it is parsed and the typed-conformance family is
// run after the structural one (structure first, then type). A malformed
// ontology yields a single LONE_ONTOLOGY_INVALID_INPUT and the structural
// findings still stand.
// deno-lint-ignore require-await -- async public API, mirrors validate(); validators may become async
export async function validateGraph(
  input: unknown,
  ontology?: unknown,
): Promise<{ findings: FindingType[] }> {
  const parsed = Graph.safeParse(input);
  if (!parsed.success) {
    return {
      findings: [{
        code: "LONE_GRAPH_INVALID_INPUT",
        path: "$",
        message: `Input is not a valid graph: ${parsed.error.issues[0].message}`
          .slice(0, 1000),
        severity: "error",
      }],
    };
  }

  const findings: FindingType[] = [...validateGraphIntegrity(parsed.data)];

  if (ontology !== undefined) {
    const ont = Ontology.safeParse(ontology);
    if (!ont.success) {
      findings.push({
        code: "LONE_ONTOLOGY_INVALID_INPUT",
        path: "$",
        message: `Ontology is not valid: ${ont.error.issues[0].message}`
          .slice(0, 1000),
        severity: "error",
      });
    } else {
      findings.push(...validateOntology(parsed.data, ont.data));
    }
  }

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
