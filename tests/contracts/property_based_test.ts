import { assert } from "@std/assert";
import fc from "fast-check";
import { ElementSpec } from "../../src/contracts/element_spec.ts";
import { SemanticNode } from "../../src/contracts/semantic_node.ts";
import { ValidatorSpec } from "../../src/contracts/validator_spec.ts";

const tagRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const attrNameRegex = /^[a-z:][a-z0-9:_-]*$/;
const dangerousAttrs = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onfocus",
  "onblur",
  "onchange",
  "onsubmit",
];

const ariaRoles = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "button",
  "cell",
  "checkbox",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "dialog",
  "directory",
  "document",
  "feed",
  "figure",
  "form",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem",
] as const;

const maxRuns = 200;

const tagArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((tag) => tagRegex.test(tag) && tag !== "script" && tag !== "iframe");
const attrNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((name) =>
    attrNameRegex.test(name) &&
    !dangerousAttrs.includes(name.toLowerCase())
  );
const attrsArb = fc.dictionary(attrNameArb, fc.string({ maxLength: 50 }));
const textArb = fc.string({ maxLength: 200 });

const elementSpecArb = fc.letrec((tie) => ({
  node: fc.record({
    tag: tagArb,
    attrs: fc.option(attrsArb, { nil: undefined }),
    text: fc.option(textArb, { nil: undefined }),
    children: fc.option(fc.array(tie("node"), { maxLength: 3 }), {
      nil: undefined,
    }),
  }).map((node) => {
    if (node.text && node.children && node.children.length > 0) {
      return { ...node, children: [] };
    }
    return node;
  }),
})).node;

Deno.test("ElementSpec - property: valid generated inputs parse", () => {
  fc.assert(
    fc.property(elementSpecArb, (node) => {
      const result = ElementSpec.safeParse(node);
      return result.success;
    }),
    { numRuns: maxRuns },
  );
});

const invalidTagArb = fc.oneof(
  fc.constantFrom("script", "iframe", "DIV", "my tag"),
  fc.string({ minLength: 1, maxLength: 10 }).filter((tag) =>
    /^[A-Z][A-Za-z0-9_-]*$/.test(tag)
  ),
);

Deno.test("ElementSpec - property: invalid tags are rejected", () => {
  fc.assert(
    fc.property(invalidTagArb, (tag) => {
      const result = ElementSpec.safeParse({ tag });
      return !result.success;
    }),
    { numRuns: maxRuns },
  );
});

const invalidAttrNameArb = fc.oneof(
  fc.constantFrom("onclick", "onerror", "onload"),
  fc.string({ minLength: 1, maxLength: 10 }).filter((name) =>
    /^[A-Z][A-Za-z0-9_-]*$/.test(name)
  ),
);

Deno.test("ElementSpec - property: invalid attribute names are rejected", () => {
  fc.assert(
    fc.property(invalidAttrNameArb, (attrName) => {
      const result = ElementSpec.safeParse({
        tag: "div",
        attrs: { [attrName]: "value" },
      });
      return !result.success;
    }),
    { numRuns: maxRuns },
  );
});

const typeRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const semanticTypeArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((value) => typeRegex.test(value));
const semanticNameArb = fc.option(
  fc.string({ maxLength: 50 }).filter((name) => name.trim().length > 0),
  { nil: undefined },
);
const semanticRoleArb = fc.option(fc.constantFrom(...ariaRoles), {
  nil: undefined,
});
const propsArb = fc.dictionary(fc.string({ maxLength: 20 }), fc.anything());

const semanticNodeArb = fc.letrec((tie) => ({
  node: fc.record({
    type: semanticTypeArb,
    name: semanticNameArb,
    role: semanticRoleArb,
    props: fc.option(propsArb, { nil: undefined }),
    children: fc.option(fc.array(tie("node"), { maxLength: 3 }), {
      nil: undefined,
    }),
  }),
})).node;

Deno.test("SemanticNode - property: valid generated inputs parse", () => {
  fc.assert(
    fc.property(semanticNodeArb, (node) => {
      const result = SemanticNode.safeParse(node);
      return result.success;
    }),
    { numRuns: maxRuns },
  );
});

const whitespaceOnlyNameArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((name) => name.trim().length === 0);

Deno.test("SemanticNode - property: whitespace-only names are rejected", () => {
  fc.assert(
    fc.property(whitespaceOnlyNameArb, (name) => {
      const result = SemanticNode.safeParse({ type: "div", name });
      return !result.success;
    }),
    { numRuns: maxRuns },
  );
});

const invalidRoleArb = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((role) =>
    /^[a-z][a-z-]*$/.test(role) &&
    !ariaRoles.includes(role as typeof ariaRoles[number])
  );

Deno.test("SemanticNode - property: invalid roles are rejected", () => {
  fc.assert(
    fc.property(invalidRoleArb, (role) => {
      const result = SemanticNode.safeParse({ type: "div", role });
      return !result.success;
    }),
    { numRuns: maxRuns },
  );
});

const kebabIdArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((value) => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value));
const semverArb = fc
  .tuple(
    fc.integer({ min: 0, max: 20 }),
    fc.integer({ min: 0, max: 20 }),
    fc.integer({ min: 0, max: 20 }),
  )
  .map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

Deno.test("ValidatorSpec - property: valid generated inputs parse", () => {
  fc.assert(
    fc.property(kebabIdArb, semverArb, (id, version) => {
      const result = ValidatorSpec.safeParse({ id, version });
      return result.success;
    }),
    { numRuns: maxRuns },
  );
});

const invalidIdArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 10 }).filter((value) =>
    /^[A-Z][A-Za-z0-9_-]*$/.test(value)
  ),
  fc.string({ minLength: 1, maxLength: 10 }).filter((value) =>
    /^[0-9][a-z0-9-]*$/.test(value)
  ),
  fc.string({ minLength: 1, maxLength: 10 }).filter((value) =>
    /^[a-z]+_[a-z0-9_]*$/.test(value)
  ),
);

const invalidSemverArb = fc.oneof(
  fc.constantFrom("1", "1.0", "v1.0.0", "1.0.0.0"),
  fc.string({ minLength: 1, maxLength: 10 }).filter((value) =>
    /^[a-z]+$/.test(value)
  ),
);

Deno.test("ValidatorSpec - property: invalid ids are rejected", () => {
  fc.assert(
    fc.property(invalidIdArb, semverArb, (id, version) => {
      const result = ValidatorSpec.safeParse({ id, version });
      return !result.success;
    }),
    { numRuns: maxRuns },
  );
});

Deno.test("ValidatorSpec - property: invalid versions are rejected", () => {
  fc.assert(
    fc.property(kebabIdArb, invalidSemverArb, (id, version) => {
      const result = ValidatorSpec.safeParse({ id, version });
      return !result.success;
    }),
    { numRuns: maxRuns },
  );
});

Deno.test("SemanticNode - property: names are trimmed", () => {
  fc.assert(
    fc.property(
      semanticTypeArb,
      fc.string({ minLength: 1, maxLength: 20 }).filter((value) =>
        value.trim().length > 0
      ),
      (type, name) => {
        const padded = `  ${name}  `;
        const result = SemanticNode.parse({ type, name: padded });
        assert(result.name === name.trim());
      },
    ),
    { numRuns: maxRuns },
  );
});
