import { assertEquals, assertThrows } from "@std/assert";
import { SemanticNode } from "../../src/contracts/semantic_node.ts";
import { ZodError } from "zod";

Deno.test("SemanticNode - parses minimal node", () => {
  const result = SemanticNode.parse({
    type: "div",
  });

  assertEquals(result.type, "div");
  assertEquals(result.props, {});
  assertEquals(result.children, []);
  assertEquals(result.name, undefined);
  assertEquals(result.role, undefined);
});

Deno.test("SemanticNode - rejects empty type", () => {
  assertThrows(
    () => {
      SemanticNode.parse({
        type: "",
      });
    },
    ZodError,
    "String must contain at least 1 character(s)",
  );
});

Deno.test("SemanticNode - handles nested children", () => {
  const result = SemanticNode.parse({
    type: "container",
    name: "root",
    role: "main",
    children: [
      {
        type: "section",
        name: "child1",
        children: [
          {
            type: "item",
            props: { id: "nested" },
          },
        ],
      },
      {
        type: "section",
        name: "child2",
      },
    ],
  });

  assertEquals(result.type, "container");
  assertEquals(result.name, "root");
  assertEquals(result.role, "main");
  assertEquals(result.children.length, 2);
  assertEquals(result.children[0].type, "section");
  assertEquals(result.children[0].children.length, 1);
  assertEquals(result.children[0].children[0].type, "item");
  assertEquals(result.children[0].children[0].props, { id: "nested" });
});

Deno.test("SemanticNode - handles optional fields", () => {
  const result = SemanticNode.parse({
    type: "button",
    name: "submit",
    role: "button",
    props: { disabled: true, "aria-label": "Submit form" },
  });

  assertEquals(result.type, "button");
  assertEquals(result.name, "submit");
  assertEquals(result.role, "button");
  assertEquals(result.props, { disabled: true, "aria-label": "Submit form" });
  assertEquals(result.children, []);
});
