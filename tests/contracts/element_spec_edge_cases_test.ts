import { assertEquals, assertThrows } from "@std/assert";
import { ElementSpec } from "../../src/contracts/element_spec.ts";
import { ZodError } from "zod";

// Edge case: XSS prevention - script tags
Deno.test("ElementSpec - rejects script tag", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "script",
      });
    },
    ZodError,
    "Script and iframe tags are not allowed",
  );
});

Deno.test("ElementSpec - rejects iframe tag", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "iframe",
      });
    },
    ZodError,
    "Script and iframe tags are not allowed",
  );
});

// Edge case: XSS prevention - event handlers
Deno.test("ElementSpec - rejects onclick attribute", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "button",
        attrs: { onclick: "alert('xss')" },
      });
    },
    ZodError,
    "Event handler attributes are not allowed",
  );
});

Deno.test("ElementSpec - rejects onerror attribute", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "img",
        attrs: { onerror: "alert('xss')" },
      });
    },
    ZodError,
    "Event handler attributes are not allowed",
  );
});

// Edge case: tag format validation
Deno.test("ElementSpec - rejects uppercase tags", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "DIV",
      });
    },
    ZodError,
    "Tag must be lowercase",
  );
});

Deno.test("ElementSpec - rejects tags with spaces", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "my tag",
      });
    },
    ZodError,
  );
});

Deno.test("ElementSpec - accepts custom elements with hyphens", () => {
  const result = ElementSpec.parse({
    tag: "my-custom-element",
  });

  assertEquals(result.tag, "my-custom-element");
});

// Edge case: text and children mutual exclusivity
Deno.test("ElementSpec - rejects both text and children", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "div",
        text: "Some text",
        children: [{ tag: "span" }],
      });
    },
    ZodError,
    "Element cannot have both text content and children",
  );
});

Deno.test("ElementSpec - allows text without children", () => {
  const result = ElementSpec.parse({
    tag: "p",
    text: "Paragraph text",
  });

  assertEquals(result.text, "Paragraph text");
  assertEquals(result.children, []);
});

Deno.test("ElementSpec - allows children without text", () => {
  const result = ElementSpec.parse({
    tag: "div",
    children: [{ tag: "span" }],
  });

  assertEquals(result.children.length, 1);
  assertEquals(result.text, undefined);
});

// Edge case: attribute name validation
Deno.test("ElementSpec - rejects uppercase attribute names", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "div",
        attrs: { CLASS: "container" },
      });
    },
    ZodError,
    "Attribute names must be lowercase",
  );
});

Deno.test("ElementSpec - accepts namespaced attributes", () => {
  const result = ElementSpec.parse({
    tag: "svg",
    attrs: { "xlink:href": "#icon" },
  });

  assertEquals(result.attrs["xlink:href"], "#icon");
});

Deno.test("ElementSpec - accepts data attributes", () => {
  const result = ElementSpec.parse({
    tag: "div",
    attrs: { "data-id": "123", "data-test": "value" },
  });

  assertEquals(result.attrs["data-id"], "123");
});

// Edge case: very long content
Deno.test("ElementSpec - rejects excessively long tag name", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "a".repeat(101),
      });
    },
    ZodError,
  );
});

Deno.test("ElementSpec - accepts very long text content", () => {
  const longText = "a".repeat(1000);
  const result = ElementSpec.parse({
    tag: "p",
    text: longText,
  });

  assertEquals(result.text, longText);
});

Deno.test("ElementSpec - rejects extremely long text content", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "p",
        text: "a".repeat(100001),
      });
    },
    ZodError,
  );
});

Deno.test("ElementSpec - rejects excessively long attribute value", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "div",
        attrs: { id: "a".repeat(10001) },
      });
    },
    ZodError,
  );
});

// Edge case: deeply nested structures
Deno.test("ElementSpec - handles deep nesting", () => {
  let node: Record<string, unknown> = { tag: "span", text: "innermost" };

  // Create 10 levels of nesting
  for (let i = 0; i < 10; i++) {
    node = {
      tag: "div",
      children: [node],
    };
  }

  const result = ElementSpec.parse(node);
  assertEquals(result.tag, "div");
  assertEquals(result.children[0].tag, "div");
});

// Edge case: empty vs undefined handling
Deno.test("ElementSpec - distinguishes between empty text and undefined", () => {
  const withEmptyText = ElementSpec.parse({
    tag: "span",
    text: "",
  });

  const withUndefinedText = ElementSpec.parse({
    tag: "span",
  });

  assertEquals(withEmptyText.text, "");
  assertEquals(withUndefinedText.text, undefined);
});
