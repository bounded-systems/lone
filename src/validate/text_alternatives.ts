import type { SemanticNodeType } from "../contracts/semantic_node.ts";
import type { FindingType } from "../contracts/finding.ts";

export function validateTextAlternatives(
  root: SemanticNodeType,
  path = "$",
): FindingType[] {
  const findings: FindingType[] = [];

  walkTree(root, path, (node, currentPath) => {
    const props = node.props ?? {};
    const role = node.role;

    if (isImageNode(node)) {
      const isDecorative = props.decorative === true ||
        role === "presentation" || role === "none";
      // An image needs a NAME, and `alt` is only one way to carry one. It is a
      // content attribute of <img>/<area>/<input type=image> and exists nowhere
      // else, so demanding it of everything role="img" made that arm
      // unsatisfiable: the specified way to name a <div role="img"> is
      // aria-label/aria-labelledby, and the only ways out were invalid HTML, a
      // role="presentation" that discards the name, or dropping the role. Same
      // check the svg arm below already uses.
      const named = hasAccessibleLabel(node, props);

      if (node.type === "img") {
        // <img> keeps the stricter reading: alt="" is the documented way to say
        // "decorative", so an empty alt on an otherwise-unnamed image is still
        // the distinct EMPTY_ALT_MEANINGFUL finding rather than a missing one.
        const altProvided = Object.prototype.hasOwnProperty.call(props, "alt");
        const alt = getStringProp(props, "alt");

        if (!altProvided && !isDecorative && !named) {
          findings.push({
            code: "LONE_TEXT_MISSING_ALT",
            path: currentPath,
            message: "Image elements must provide alt text.",
            severity: "error",
          });
        } else if (alt === "" && !isDecorative && !named) {
          findings.push({
            code: "LONE_TEXT_EMPTY_ALT_MEANINGFUL",
            path: currentPath,
            message: "Meaningful images must not use empty alt text.",
            severity: "error",
          });
        }
      } else if (!isDecorative && !named) {
        findings.push({
          code: "LONE_TEXT_MISSING_ALT",
          path: currentPath,
          message: "Image elements must provide alt text.",
          severity: "error",
        });
      }
    }

    if (node.type === "svg") {
      if (!hasAccessibleLabel(node, props)) {
        findings.push({
          code: "LONE_TEXT_MISSING_SVG_ALT",
          path: currentPath,
          message: "SVG elements must have a title/desc or ARIA label.",
          severity: "error",
        });
      }
    }

    if (node.type === "video" || node.type === "audio") {
      if (!hasMediaAlternative(props, node)) {
        findings.push({
          code: "LONE_TEXT_MISSING_MEDIA_ALT",
          path: currentPath,
          message:
            "Audio and video elements must provide captions or transcripts.",
          severity: "error",
        });
      }
    }

    if (isIconOnlyControl(node, props)) {
      if (!hasAccessibleLabel(node, props)) {
        findings.push({
          code: "LONE_TEXT_ICON_BUTTON_MISSING_LABEL",
          path: currentPath,
          message: "Icon-only controls must include an accessible label.",
          severity: "error",
        });
      }
    }

    if (node.type === "canvas" || node.type === "iframe") {
      const hasFallback = node.children.length > 0 ||
        hasAccessibleLabel(node, props) ||
        Boolean(getStringProp(props, "fallbackText"));
      if (!hasFallback) {
        findings.push({
          code: "LONE_TEXT_MISSING_FALLBACK_CONTENT",
          path: currentPath,
          message: "Canvas and iframe elements must include fallback content.",
          severity: "error",
        });
      }
    }
  });

  return findings;
}

function isImageNode(node: SemanticNodeType): boolean {
  // "image" as well as "img": the ARIA role in a computed accessibility tree is
  // `image`, so a CDP-sourced tree named neither of the other two and every missing
  // alt went unreported. It also covers <svg> from that source — an unlabelled SVG
  // maps to role `image` there, so the svg arm below (which keys on a tag name the
  // tree cannot produce) is not the one that catches it.
  return node.type === "img" || node.type === "image" ||
    node.role === "img" || node.role === "image";
}

function isIconOnlyControl(
  node: SemanticNodeType,
  props: Record<string, unknown>,
): boolean {
  if (props.iconOnly !== true) {
    return false;
  }
  return node.type === "button" || node.role === "button" ||
    node.role === "link";
}

function hasAccessibleLabel(
  node: SemanticNodeType,
  props: Record<string, unknown>,
): boolean {
  if (node.name && node.name.trim().length > 0) {
    return true;
  }

  const ariaLabel = getStringProp(props, "aria-label");
  if (ariaLabel && ariaLabel.trim().length > 0) {
    return true;
  }

  const labelledBy = getStringProp(props, "aria-labelledby");
  if (labelledBy && labelledBy.trim().length > 0) {
    return true;
  }

  const title = getStringProp(props, "title");
  if (title && title.trim().length > 0) {
    return true;
  }

  const desc = getStringProp(props, "desc");
  if (desc && desc.trim().length > 0) {
    return true;
  }

  return false;
}

function hasMediaAlternative(
  props: Record<string, unknown>,
  node: SemanticNodeType,
): boolean {
  if (props.captions === true || props.transcript === true) {
    return true;
  }
  if (props.hasCaptions === true || props.hasTranscript === true) {
    return true;
  }
  return hasAccessibleLabel(node, props);
}

function getStringProp(
  props: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = props[key];
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function walkTree(
  root: SemanticNodeType,
  path: string,
  visit: (node: SemanticNodeType, path: string) => void,
) {
  visit(root, path);
  root.children.forEach((child, index) => {
    walkTree(child, `${path}.children[${index}]`, visit);
  });
}
