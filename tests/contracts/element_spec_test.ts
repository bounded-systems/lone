import { assertEquals, assertThrows } from "@std/assert";
import { ElementSpec } from "../../src/contracts/element_spec.ts";
import { ZodError } from "zod";

Deno.test("ElementSpec - parses minimal element", () => {
  const result = ElementSpec.parse({
    tag: "div",
  });

  assertEquals(result.tag, "div");
  assertEquals(result.attrs, {});
  assertEquals(result.children, []);
  assertEquals(result.text, undefined);
});

Deno.test("ElementSpec - rejects empty tag", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "",
      });
    },
    ZodError,
    "String must contain at least 1 character(s)",
  );
});

Deno.test("ElementSpec - defaults attrs and children", () => {
  const result = ElementSpec.parse({
    tag: "span",
    text: "Hello",
  });

  assertEquals(result.tag, "span");
  assertEquals(result.text, "Hello");
  assertEquals(result.attrs, {});
  assertEquals(result.children, []);
});

Deno.test("ElementSpec - handles nested children", () => {
  const result = ElementSpec.parse({
    tag: "div",
    attrs: { class: "container", id: "main" },
    children: [
      {
        tag: "p",
        text: "Paragraph text",
        attrs: { class: "text" },
      },
      {
        tag: "ul",
        children: [
          { tag: "li", text: "Item 1" },
          { tag: "li", text: "Item 2" },
        ],
      },
    ],
  });

  assertEquals(result.tag, "div");
  assertEquals(result.attrs, { class: "container", id: "main" });
  assertEquals(result.children.length, 2);
  assertEquals(result.children[0].tag, "p");
  assertEquals(result.children[0].text, "Paragraph text");
  assertEquals(result.children[1].tag, "ul");
  assertEquals(result.children[1].children.length, 2);
  assertEquals(result.children[1].children[0].text, "Item 1");
});

Deno.test("ElementSpec - validates attrs are strings", () => {
  assertThrows(
    () => {
      ElementSpec.parse({
        tag: "div",
        attrs: { id: "valid", count: 123 },
      });
    },
    ZodError,
  );
});
