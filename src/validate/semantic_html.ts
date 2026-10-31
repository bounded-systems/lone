import type { SemanticNodeType } from "../contracts/semantic_node.ts";
import type { FindingType } from "../contracts/finding.ts";

/**
 * Validates semantic HTML correctness.
 * Checks:
 * 1. Heading hierarchy (h1->h2->h3, no skips)
 * 2. Button vs link usage (buttons for actions, links for navigation)
 * 3. List structure (ul/ol must contain li)
 * 4. Table semantics (proper use of thead, tbody, th)
 * 5. Form label associations (inputs should have associated labels)
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML
 */
export function validateSemanticHTML(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];

  findings.push(...validateHeadingHierarchy(root, path));
  findings.push(...validateButtonVsLink(root, path));
  findings.push(...validateListStructure(root, path));
  findings.push(...validateTableSemantics(root, path));
  findings.push(...validateFormLabels(root, path));

  return findings;
}

/**
 * Validates heading hierarchy (h1->h2->h3, no skips).
 * Headings should progress logically without skipping levels.
 */
function validateHeadingHierarchy(
  root: SemanticNodeType,
  rootPath = "$",
): FindingType[] {
  const findings: FindingType[] = [];
  const headingLevels: Array<{ level: number; path: string }> = [];

  // Collect all headings in document order
  function collectHeadings(node: SemanticNodeType, path: string) {
    if (node.role === "heading") {
      // Extract heading level from aria-level or type (h1, h2, etc.)
      const level = node.props?.["aria-level"] as number | undefined ??
        extractHeadingLevel(node.type);

      if (level !== null) {
        headingLevels.push({ level, path });
      }
    }

    node.children.forEach((child, index) => {
      collectHeadings(child, `${path}.children[${index}]`);
    });
  }

  collectHeadings(root, rootPath);

  // Check for level skips
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1];
    const curr = headingLevels[i];

    // Allow same level, one level down, or back to any previous level
    // Disallow skipping levels when going deeper (e.g., h1 -> h3)
    if (curr.level > prev.level + 1) {
      findings.push({
        code: "LONE_SEMANTIC_HEADING_LEVEL_SKIP",
        path: curr.path,
        message: `Heading level ${curr.level} skips level ${
          prev.level + 1
        }. Use h${prev.level + 1} before h${curr.level}.`,
        severity: "error",
      });
    }
  }

  // Check for missing h1
  if (headingLevels.length > 0 && !headingLevels.some((h) => h.level === 1)) {
    findings.push({
      code: "LONE_SEMANTIC_MISSING_H1",
      path: rootPath,
      message: "Document should have at least one h1 heading.",
      severity: "warning",
    });
  }

  return findings;
}

/**
 * Extracts heading level from type string (e.g., "h1" -> 1, "h2" -> 2).
 * Returns null if not a heading type.
 */
function extractHeadingLevel(type: string): number | null {
  const match = type.match(/^h([1-6])$/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Validates button vs link usage.
 * Buttons should be used for actions (onclick).
 * Links should be used for navigation (href).
 */
function validateButtonVsLink(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];

  function walk(node: SemanticNodeType, currentPath: string) {
    // Check for link with onclick (should be button)
    if (
      (node.type === "a" || node.role === "link") &&
      node.props?.["onclick"]
    ) {
      findings.push({
        code: "LONE_SEMANTIC_LINK_WITH_ONCLICK",
        path: currentPath,
        message:
          "Link has onclick handler. Use <button> for actions, <a> for navigation.",
        severity: "error",
      });
    }

    // Check for link without href (should be button)
    if (
      (node.type === "a" || node.role === "link") &&
      !node.props?.["href"]
    ) {
      findings.push({
        code: "LONE_SEMANTIC_LINK_WITHOUT_HREF",
        path: currentPath,
        message: "Link missing href attribute. Use <button> if not navigating.",
        severity: "error",
      });
    }

    // Check for button with href (should be link)
    if (
      (node.type === "button" || node.role === "button") &&
      node.props?.["href"]
    ) {
      findings.push({
        code: "LONE_SEMANTIC_BUTTON_WITH_HREF",
        path: currentPath,
        message:
          "Button has href attribute. Use <a> for navigation, <button> for actions.",
        severity: "error",
      });
    }

    node.children.forEach((child, index) => {
      walk(child, `${currentPath}.children[${index}]`);
    });
  }

  walk(root, path);
  return findings;
}

/**
 * Validates list structure (ul/ol must contain only li children at first level).
 */
function validateListStructure(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];

  function walk(node: SemanticNodeType, currentPath: string) {
    const isList = node.type === "ul" ||
      node.type === "ol" ||
      node.role === "list";

    if (isList) {
      // Check that all direct children are list items
      node.children.forEach((child, index) => {
        const isListItem = child.type === "li" || child.role === "listitem";

        if (!isListItem) {
          findings.push({
            code: "LONE_SEMANTIC_INVALID_LIST_CHILD",
            path: `${currentPath}.children[${index}]`,
            message:
              `List child must be <li> or role="listitem", found type="${child.type}".`,
            severity: "error",
          });
        }
      });
    }

    node.children.forEach((child, index) => {
      walk(child, `${currentPath}.children[${index}]`);
    });
  }

  walk(root, path);
  return findings;
}

/**
 * Validates table semantics (proper use of thead, tbody, th with scope).
 */
function validateTableSemantics(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];

  function checkRowsForHeaderCells(
    container: SemanticNodeType,
    containerPath: string,
  ): boolean {
    let hasHeaderCells = false;

    // Recursively check for rows in this container and its children
    function findRows(node: SemanticNodeType, nodePath: string) {
      if (node.type === "tr" || node.role === "row") {
        // Check cells in this row
        node.children.forEach((cell) => {
          if (
            cell.type === "th" || cell.role === "columnheader" ||
            cell.role === "rowheader"
          ) {
            hasHeaderCells = true;

            // Check that th has scope attribute
            if (
              cell.type === "th" &&
              !cell.props?.["scope"]
            ) {
              findings.push({
                code: "LONE_SEMANTIC_TH_MISSING_SCOPE",
                path: containerPath,
                message:
                  "Header cells (<th>) should have scope attribute (row, col, rowgroup, colgroup).",
                severity: "warning",
              });
            }
          }
        });
      }

      // Recurse into children (to handle thead > tr, tbody > tr, etc.)
      node.children.forEach((child, index) => {
        findRows(child, `${nodePath}.children[${index}]`);
      });
    }

    findRows(container, containerPath);
    return hasHeaderCells;
  }

  function walk(node: SemanticNodeType, currentPath: string) {
    const isTable = node.type === "table" || node.role === "table";

    if (isTable) {
      let hasTheadOrTbody = false;

      // Check for thead/tbody structure
      node.children.forEach((child) => {
        if (child.type === "thead" || child.type === "tbody") {
          hasTheadOrTbody = true;
        }
      });

      // Check for header cells (recursively searches all rows)
      const hasHeaderCells = checkRowsForHeaderCells(node, currentPath);

      // Recommend thead/tbody for complex tables
      if (!hasTheadOrTbody && node.children.length > 3) {
        findings.push({
          code: "LONE_SEMANTIC_TABLE_MISSING_THEAD_TBODY",
          path: currentPath,
          message:
            "Complex tables should use <thead> and <tbody> for better structure.",
          severity: "info",
        });
      }

      // Recommend header cells for all tables
      if (!hasHeaderCells) {
        findings.push({
          code: "LONE_SEMANTIC_TABLE_MISSING_HEADERS",
          path: currentPath,
          message:
            "Tables should have header cells (<th> or role='columnheader/rowheader').",
          severity: "warning",
        });
      }
    }

    node.children.forEach((child, index) => {
      walk(child, `${currentPath}.children[${index}]`);
    });
  }

  walk(root, path);
  return findings;
}

/**
 * Validates form label associations (inputs should have associated labels).
 */
function validateFormLabels(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];

  // Collect all label "for" attributes
  const labeledIds = new Set<string>();

  function collectLabels(node: SemanticNodeType) {
    if (node.type === "label") {
      const forAttr = node.props?.["for"] as string | undefined;
      if (forAttr) {
        labeledIds.add(forAttr);
      }
    }

    node.children.forEach((child) => collectLabels(child));
  }

  collectLabels(root);

  // Check form inputs for label association
  function walk(node: SemanticNodeType, currentPath: string) {
    // <input type="hidden"> has no UI and is never in the accessibility tree, so it needs no label
    const isHiddenInput = node.type === "input" &&
      String(node.props?.["type"] ?? "").toLowerCase() === "hidden";
    const isFormControl = (node.type === "input" && !isHiddenInput) ||
      node.type === "select" ||
      node.type === "textarea" ||
      node.role === "textbox" ||
      node.role === "combobox" ||
      node.role === "searchbox";

    if (isFormControl) {
      const id = node.props?.["id"] as string | undefined;
      const ariaLabel = node.props?.["aria-label"] as string | undefined;
      const ariaLabelledby = node.props?.["aria-labelledby"] as
        | string
        | undefined;

      const hasName = !!node.name;
      const hasLabelAssociation = id && labeledIds.has(id);
      const hasAriaLabel = !!ariaLabel || !!ariaLabelledby;

      // Form controls should have a label via <label for>, aria-label, or aria-labelledby
      if (!hasName && !hasLabelAssociation && !hasAriaLabel) {
        findings.push({
          code: "LONE_SEMANTIC_FORM_CONTROL_UNLABELED",
          path: currentPath,
          message:
            "Form control should have associated <label>, aria-label, or aria-labelledby.",
          severity: "error",
        });
      }
    }

    node.children.forEach((child, index) => {
      walk(child, `${currentPath}.children[${index}]`);
    });
  }

  walk(root, path);
  return findings;
}
