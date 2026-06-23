import { assertEquals } from "@std/assert";
import { parseHTML } from "linkedom";
import { type Element, validate } from "../../src/engine/mod.ts";

async function loadFixture(name: string): Promise<Element> {
  const url = new URL(`./mdn/${name}.html`, import.meta.url);
  const html = await Deno.readTextFile(url);
  const parsed = parseHTML(html) as unknown as {
    document: { body?: unknown; documentElement?: unknown };
  };
  const root = parsed.document.body ?? parsed.document.documentElement;
  return root as unknown as Element;
}

Deno.test("mdn fixtures - good-1 passes with no findings", async () => {
  const root = await loadFixture("good-1");
  const result = await validate(root);

  console.log("good-1 findings", result.findings);
  assertEquals(result.findings.length, 0);
});

Deno.test("mdn fixtures - good-2 passes with no findings", async () => {
  const root = await loadFixture("good-2");
  const result = await validate(root);

  assertEquals(result.findings.length, 0);
});

Deno.test("mdn fixtures - bad-1 triggers link findings", async () => {
  const root = await loadFixture("bad-1");
  const result = await validate(root);
  const codes = result.findings.map((f) => f.code);

  assertEquals(codes.includes("LONE_SEMANTIC_LINK_WITH_ONCLICK"), true);
  assertEquals(codes.includes("LONE_SEMANTIC_LINK_WITHOUT_HREF"), true);
});

Deno.test("mdn fixtures - bad-2 triggers alt and label findings", async () => {
  const root = await loadFixture("bad-2");
  const result = await validate(root);
  const codes = result.findings.map((f) => f.code);

  assertEquals(codes.includes("LONE_TEXT_MISSING_ALT"), true);
  assertEquals(codes.includes("LONE_SEMANTIC_FORM_CONTROL_UNLABELED"), true);
});
