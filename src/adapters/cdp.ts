import { z } from "zod";
import type { SemanticNodeType } from "../contracts/semantic_node.ts";

/**
 * Chrome DevTools Protocol Accessibility types
 * Based on: https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/
 */

// AXNodeId - Unique accessibility node identifier (string)
// deno-lint-ignore no-slow-types
const AXNodeId = z.string();

// AXValueType enum
// deno-lint-ignore no-slow-types
const AXValueType = z.enum([
  "boolean",
  "tristate",
  "booleanOrUndefined",
  "idref",
  "idrefList",
  "integer",
  "node",
  "nodeList",
  "number",
  "string",
  "computedString",
  "token",
  "tokenList",
  "domRelation",
  "role",
  "internalRole",
  "valueUndefined",
]);

// AXValueSourceType enum
// deno-lint-ignore no-slow-types
const AXValueSourceType = z.enum([
  "attribute",
  "implicit",
  "style",
  "contents",
  "placeholder",
  "relatedElement",
]);

// AXValueNativeSourceType enum
// deno-lint-ignore no-slow-types
const AXValueNativeSourceType = z.enum([
  "description",
  "figcaption",
  "label",
  "labelfor",
  "labelwrapped",
  "legend",
  "rubyannotation",
  "tablecaption",
  "title",
  "other",
]);

// AXRelatedNode
// deno-lint-ignore no-slow-types
const AXRelatedNode = z.object({
  backendDOMNodeId: z.number().optional(),
  idref: z.string().optional(),
  text: z.string().optional(),
});

// Forward declaration for AXValue (recursive)
type AXValueDataType = {
  type: z.infer<typeof AXValueType>;
  value?: unknown;
  relatedNodes?: z.infer<typeof AXRelatedNode>[];
  sources?: AXValueSourceDataType[];
};

// AXValueSource (recursive with AXValue)
type AXValueSourceDataType = {
  type: z.infer<typeof AXValueSourceType>;
  value?: AXValueDataType;
  attribute?: string;
  attributeValue?: AXValueDataType;
  superseded?: boolean;
  nativeSource?: z.infer<typeof AXValueNativeSourceType>;
  nativeSourceValue?: AXValueDataType;
  invalid?: boolean;
  invalidReason?: string;
};

const AXValueSource: z.ZodType<AXValueSourceDataType> = z.lazy(() =>
  z.object({
    type: AXValueSourceType,
    value: AXValue.optional(),
    attribute: z.string().optional(),
    attributeValue: AXValue.optional(),
    superseded: z.boolean().optional(),
    nativeSource: AXValueNativeSourceType.optional(),
    nativeSourceValue: AXValue.optional(),
    invalid: z.boolean().optional(),
    invalidReason: z.string().optional(),
  })
);

// AXValue - A single computed AX property
const AXValue: z.ZodType<AXValueDataType> = z.lazy(() =>
  z.object({
    type: AXValueType,
    value: z.unknown().optional(),
    relatedNodes: z.array(AXRelatedNode).optional(),
    sources: z.array(AXValueSource).optional(),
  })
);

// AXPropertyName - String enum for accessibility properties
// deno-lint-ignore no-slow-types
const AXPropertyName = z.string();

// AXProperty - Name/value pair
// deno-lint-ignore no-slow-types
const AXProperty = z.object({
  name: AXPropertyName,
  value: AXValue,
});

// AXNode - A node in the accessibility tree
export type AXNodeType = {
  nodeId: string;
  ignored: boolean;
  ignoredReasons?: { name: string; value: AXValueDataType }[];
  role?: AXValueDataType;
  chromeRole?: AXValueDataType;
  name?: AXValueDataType;
  description?: AXValueDataType;
  value?: AXValueDataType;
  properties?: { name: string; value: AXValueDataType }[];
  parentId?: string;
  childIds?: string[];
  backendDOMNodeId?: number;
  frameId?: string;
};

export const AXNode: z.ZodType<AXNodeType> = z.object({
  nodeId: AXNodeId,
  ignored: z.boolean(),
  ignoredReasons: z.array(AXProperty).optional(),
  role: AXValue.optional(),
  chromeRole: AXValue.optional(),
  name: AXValue.optional(),
  description: AXValue.optional(),
  value: AXValue.optional(),
  properties: z.array(AXProperty).optional(),
  parentId: AXNodeId.optional(),
  childIds: z.array(AXNodeId).optional(),
  backendDOMNodeId: z.number().optional(),
  frameId: z.string().optional(),
});

/**
 * Convert CDP AXNode array to SemanticNode tree
 *
 * @param nodes - Array of AXNode objects from CDP Accessibility.getFullAXTree
 * @returns SemanticNode tree representing the accessibility structure
 */
export function cdpToSemanticNode(
  nodes: AXNodeType[],
): SemanticNodeType | null {
  if (nodes.length === 0) {
    return null;
  }

  // Build node map for quick lookup
  const nodeMap = new Map<string, AXNodeType>();
  for (const node of nodes) {
    nodeMap.set(node.nodeId, node);
  }

  // Find root node (node without parentId or first node)
  const rootNode = nodes.find((node) => !node.parentId) || nodes[0];

  // The visible descendants of an ignored node, hoisted to take its place.
  function collapse(axNode: AXNodeType): SemanticNodeType[] {
    const out: SemanticNodeType[] = [];
    for (const childId of axNode.childIds ?? []) {
      const child = nodeMap.get(childId);
      if (!child) continue;
      if (child.ignored) out.push(...collapse(child));
      else out.push(convertNode(child));
    }
    return out;
  }

  function convertNode(axNode: AXNodeType): SemanticNodeType {
    const role = axNode.role?.value ? String(axNode.role.value) : undefined;
    const name = axNode.name?.value ? String(axNode.name.value) : undefined;
    const type = role ||
      (axNode.chromeRole?.value ? String(axNode.chromeRole.value) : "unknown");

    const children: SemanticNodeType[] = [];
    if (axNode.childIds) {
      for (const childId of axNode.childIds) {
        const childNode = nodeMap.get(childId);
        if (!childNode) continue;
        // An IGNORED node is transparent, not absent: skip the node, keep its
        // subtree. Real Accessibility.getFullAXTree output is full of ignored
        // wrappers — the <html>/<body> shells and generic containers — and the
        // document hangs BELOW them. Pruning one discarded everything under it,
        // which in practice meant the entire page: a 22-node tree converted to a
        // lone root with zero children.
        if (childNode.ignored) children.push(...collapse(childNode));
        else children.push(convertNode(childNode));
      }
    }

    const props: Record<string, unknown> = {};
    if (axNode.description?.value !== undefined) {
      props.description = axNode.description.value;
    }
    if (axNode.value?.value !== undefined) props.value = axNode.value.value;
    if (axNode.backendDOMNodeId !== undefined) {
      props.backendDOMNodeId = axNode.backendDOMNodeId;
    }
    if (axNode.ignored) props.ignored = true;
    if (axNode.properties) {
      for (const prop of axNode.properties) {
        props[prop.name] = prop.value.value;
      }
    }
    // CDP names three things differently from the props the validators read. The
    // values are already here — this is a rename, not new data — and without it
    // three checks are silently unreachable on an accessibility tree:
    //
    //   level → aria-level   validateHeadingHierarchy reads aria-level first, then
    //                        falls back to parsing "h1".."h6" out of node.type. An
    //                        AX tree has role "heading" and a numeric level, so the
    //                        fallback can never match and HEADING_LEVEL_SKIP is dead.
    //   url   → href         validateButtonVsLink flags a link with no href. An AX
    //                        tree has no href at all, so LINK_WITHOUT_HREF fired on
    //                        EVERY link on EVERY page — a false positive, and the
    //                        loudest possible one.
    if (props.level !== undefined && props["aria-level"] === undefined) {
      props["aria-level"] = props.level;
    }
    if (props.url !== undefined && props.href === undefined) {
      props.href = props.url;
    }

    return { type, name, role, props, children };
  }

  return convertNode(rootNode);
}
