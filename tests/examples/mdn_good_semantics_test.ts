import { assertEquals } from "@std/assert";
import { ElementSpec } from "../../src/contracts/element_spec.ts";
import { SemanticNode } from "../../src/contracts/semantic_node.ts";
import { validateNameRequired } from "../../src/validate/nameable.ts";
import {
  goodSemanticsElementSpec,
  goodSemanticsSemanticNode,
} from "../../examples/mdn-good-semantics/good_semantics.ts";

Deno.test("mdn good-semantics - ElementSpec parses", () => {
  const result = ElementSpec.parse(goodSemanticsElementSpec);

  assertEquals(result.tag, "article");
  assertEquals(result.children.length, 11);
  assertEquals(result.children[0].tag, "h1");
  assertEquals(result.children[6].tag, "h2");
  assertEquals(result.children[9].tag, "h2");
});

Deno.test("mdn good-semantics - SemanticNode parses", () => {
  const result = SemanticNode.parse(goodSemanticsSemanticNode);

  assertEquals(result.type, "article");
  assertEquals(result.children.length, 11);
  assertEquals(result.children[0].type, "h1");
  assertEquals(result.children[6].type, "h2");
  assertEquals(result.children[9].type, "h2");
});

Deno.test("mdn good-semantics - validateNameRequired passes", () => {
  const findings = validateNameRequired(goodSemanticsSemanticNode);

  assertEquals(findings.length, 0);
});
