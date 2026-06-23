import { assertEquals } from "@std/assert";
import { AXNode, cdpToSemanticNode } from "../../src/adapters/cdp.ts";
import type { AXNodeType } from "../../src/adapters/cdp.ts";

Deno.test("cdpToSemanticNode - converts simple AXNode", () => {
  const nodes: AXNodeType[] = [
    {
      nodeId: "1",
      ignored: false,
      role: { type: "role", value: "button" },
      name: { type: "computedString", value: "Submit" },
    },
  ];

  const result = cdpToSemanticNode(nodes);

  assertEquals(result, {
    type: "button",
    name: "Submit",
    role: "button",
    props: {},
    children: [],
  });
});

Deno.test("cdpToSemanticNode - handles empty array", () => {
  const result = cdpToSemanticNode([]);
  assertEquals(result, null);
});

Deno.test("cdpToSemanticNode - converts nested structure", () => {
  const nodes: AXNodeType[] = [
    {
      nodeId: "1",
      ignored: false,
      role: { type: "role", value: "main" },
      name: { type: "computedString", value: "Main content" },
      childIds: ["2", "3"],
    },
    {
      nodeId: "2",
      ignored: false,
      parentId: "1",
      role: { type: "role", value: "heading" },
      name: { type: "computedString", value: "Page Title" },
    },
    {
      nodeId: "3",
      ignored: false,
      parentId: "1",
      role: { type: "role", value: "paragraph" },
      name: { type: "computedString", value: "Some text" },
    },
  ];

  const result = cdpToSemanticNode(nodes);

  assertEquals(result, {
    type: "main",
    name: "Main content",
    role: "main",
    props: {},
    children: [
      {
        type: "heading",
        name: "Page Title",
        role: "heading",
        props: {},
        children: [],
      },
      {
        type: "paragraph",
        name: "Some text",
        role: "paragraph",
        props: {},
        children: [],
      },
    ],
  });
});

Deno.test("cdpToSemanticNode - skips ignored nodes", () => {
  const nodes: AXNodeType[] = [
    {
      nodeId: "1",
      ignored: false,
      role: { type: "role", value: "main" },
      childIds: ["2", "3"],
    },
    {
      nodeId: "2",
      ignored: true, // This node should be skipped
      parentId: "1",
      role: { type: "role", value: "generic" },
    },
    {
      nodeId: "3",
      ignored: false,
      parentId: "1",
      role: { type: "role", value: "button" },
      name: { type: "computedString", value: "Click me" },
    },
  ];

  const result = cdpToSemanticNode(nodes);

  assertEquals(result, {
    type: "main",
    name: undefined,
    role: "main",
    props: {},
    children: [
      {
        type: "button",
        name: "Click me",
        role: "button",
        props: {},
        children: [],
      },
    ],
  });
});

Deno.test("cdpToSemanticNode - includes description and value in props", () => {
  const nodes: AXNodeType[] = [
    {
      nodeId: "1",
      ignored: false,
      role: { type: "role", value: "textbox" },
      name: { type: "computedString", value: "Email" },
      description: { type: "computedString", value: "Enter your email" },
      value: { type: "string", value: "user@example.com" },
      backendDOMNodeId: 42,
    },
  ];

  const result = cdpToSemanticNode(nodes);

  assertEquals(result, {
    type: "textbox",
    name: "Email",
    role: "textbox",
    props: {
      description: "Enter your email",
      value: "user@example.com",
      backendDOMNodeId: 42,
    },
    children: [],
  });
});

Deno.test("cdpToSemanticNode - validates AXNode schema", () => {
  const validNode = {
    nodeId: "1",
    ignored: false,
    role: { type: "role", value: "button" },
  };

  // Should not throw
  const parsed = AXNode.parse(validNode);
  assertEquals(parsed.nodeId, "1");
  assertEquals(parsed.ignored, false);
});

Deno.test("cdpToSemanticNode - includes custom properties", () => {
  const nodes: AXNodeType[] = [
    {
      nodeId: "1",
      ignored: false,
      role: { type: "role", value: "checkbox" },
      name: { type: "computedString", value: "Accept terms" },
      properties: [
        { name: "checked", value: { type: "boolean", value: true } },
        { name: "disabled", value: { type: "boolean", value: false } },
      ],
    },
  ];

  const result = cdpToSemanticNode(nodes);

  assertEquals(result, {
    type: "checkbox",
    name: "Accept terms",
    role: "checkbox",
    props: {
      checked: true,
      disabled: false,
    },
    children: [],
  });
});
