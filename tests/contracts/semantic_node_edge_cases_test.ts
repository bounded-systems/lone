import { assertEquals, assertThrows } from "@std/assert";
import { SemanticNode } from "../../src/contracts/semantic_node.ts";
import { ZodError } from "zod";

// Edge case: whitespace handling
Deno.test("SemanticNode - rejects whitespace-only name", () => {
  assertThrows(
    () => {
      SemanticNode.parse({
        type: "button",
        name: "   ",
      });
    },
    ZodError,
    "Name cannot be empty or whitespace-only",
  );
});

Deno.test("SemanticNode - trims name whitespace", () => {
  const result = SemanticNode.parse({
    type: "button",
    name: "  Submit  ",
  });

  assertEquals(result.name, "Submit");
});

// Edge case: invalid ARIA roles
Deno.test("SemanticNode - rejects invalid ARIA role", () => {
  assertThrows(
    () => {
      SemanticNode.parse({
        type: "div",
        role: "invalid-role",
      });
    },
    ZodError,
    "Role must be a valid ARIA role",
  );
});

Deno.test("SemanticNode - accepts valid ARIA roles", () => {
  const validRoles = ["button", "alert", "navigation", "main", "dialog"];

  validRoles.forEach((role) => {
    const result = SemanticNode.parse({
      type: "div",
      role,
    });
    assertEquals(result.role, role);
  });
});

// Edge case: type validation
Deno.test("SemanticNode - rejects type with spaces", () => {
  assertThrows(
    () => {
      SemanticNode.parse({
        type: "my type",
      });
    },
    ZodError,
    "Type must be alphanumeric",
  );
});

Deno.test("SemanticNode - accepts type with hyphens and underscores", () => {
  const result = SemanticNode.parse({
    type: "custom-element_v2",
  });

  assertEquals(result.type, "custom-element_v2");
});

Deno.test("SemanticNode - rejects type starting with number", () => {
  assertThrows(
    () => {
      SemanticNode.parse({
        type: "123button",
      });
    },
    ZodError,
  );
});

// Edge case: very long strings
Deno.test("SemanticNode - rejects excessively long type", () => {
  assertThrows(
    () => {
      SemanticNode.parse({
        type: "a".repeat(101),
      });
    },
    ZodError,
  );
});

Deno.test("SemanticNode - rejects excessively long name", () => {
  assertThrows(
    () => {
      SemanticNode.parse({
        type: "button",
        name: "a".repeat(1001),
      });
    },
    ZodError,
  );
});

// Edge case: deeply nested structures
Deno.test("SemanticNode - handles deep nesting", () => {
  let node: Record<string, unknown> = { type: "innermost" };

  // Create 10 levels of nesting
  for (let i = 0; i < 10; i++) {
    node = {
      type: `level${i}`,
      children: [node],
    };
  }

  const result = SemanticNode.parse(node);
  assertEquals(result.type, "level9");
  assertEquals(result.children[0].type, "level8");
});

// Edge case: empty children array vs undefined
Deno.test("SemanticNode - defaults undefined children to empty array", () => {
  const result = SemanticNode.parse({
    type: "div",
  });

  assertEquals(result.children, []);
});

// Edge case: props with various types
Deno.test("SemanticNode - accepts props with mixed types", () => {
  const result = SemanticNode.parse({
    type: "button",
    props: {
      disabled: true,
      count: 42,
      label: "Click me",
      data: { nested: "object" },
      items: [1, 2, 3],
    },
  });

  assertEquals(result.props.disabled, true);
  assertEquals(result.props.count, 42);
  assertEquals(result.props.label, "Click me");
});

// Edge case: empty props object
Deno.test("SemanticNode - defaults undefined props to empty object", () => {
  const result = SemanticNode.parse({
    type: "div",
  });

  assertEquals(result.props, {});
});

// Edge case: special characters in name
Deno.test("SemanticNode - handles special characters in name", () => {
  const result = SemanticNode.parse({
    type: "button",
    name: "Submit & Continue →",
  });

  assertEquals(result.name, "Submit & Continue →");
});
