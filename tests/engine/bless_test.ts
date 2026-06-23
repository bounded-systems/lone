import { assertEquals } from "@std/assert";
import { bless, type Element, validate } from "../../src/engine/mod.ts";
import type { ElementLike } from "../../src/adapters/dom.ts";

Deno.test("validate - returns invalid subject finding", async () => {
  const subject = {} as unknown as Element;
  const result = await validate(subject);

  assertEquals(result.findings.length, 1);
  assertEquals(result.findings[0].code, "LONE_ENGINE_INVALID_SUBJECT");
  assertEquals(result.findings[0].severity, "error");
});

Deno.test("bless - returns ok for valid element with no findings", async () => {
  const subject: ElementLike = {
    tagName: "div",
    attributes: [],
    children: [],
  };
  const result = await bless(subject as unknown as Element);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.findings.length, 0);
  }
});

Deno.test("validate - DOM backend produces semantic findings", async () => {
  const subject: ElementLike = {
    tagName: "a",
    attributes: [{ name: "onclick", value: "doThing()" }],
    children: [],
  };

  const result = await validate(subject as unknown as Element);
  const codes = result.findings.map((f) => f.code);

  assertEquals(codes.includes("LONE_SEMANTIC_LINK_WITH_ONCLICK"), true);
  assertEquals(codes.includes("LONE_SEMANTIC_LINK_WITHOUT_HREF"), true);
});
