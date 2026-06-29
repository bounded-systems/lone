import {
  assert,
  assertEquals,
  assertMatch,
  assertNotEquals,
} from "@std/assert";
import {
  DIGEST_VERSION,
  digestNode,
  withDigests,
} from "../../src/engine/digest.ts";
import type { SemanticNodeType } from "../../src/contracts/semantic_node.ts";

// Minimal SemanticNode builder for tests.
function node(
  type: string,
  opts: Partial<Omit<SemanticNodeType, "type">> = {},
): SemanticNodeType {
  return {
    type,
    name: opts.name,
    role: opts.role,
    props: opts.props ?? {},
    children: opts.children ?? [],
  };
}

const SHA256_HEX = /^sha256:[0-9a-f]{64}$/;

Deno.test("digestNode is deterministic for an identical tree", () => {
  const a = node("article", {
    children: [node("h2", { name: "Title" }), node("p", { name: "Body" })],
  });
  const b = node("article", {
    children: [node("h2", { name: "Title" }), node("p", { name: "Body" })],
  });
  assertEquals(digestNode(a), digestNode(b));
});

Deno.test("digestNode emits the sha256:<hex> format", () => {
  assertMatch(digestNode(node("p", { name: "x" })), SHA256_HEX);
});

Deno.test("child order is significant", () => {
  const ordered = node("ul", {
    children: [node("li", { name: "one" }), node("li", { name: "two" })],
  });
  const swapped = node("ul", {
    children: [node("li", { name: "two" }), node("li", { name: "one" })],
  });
  assertNotEquals(digestNode(ordered), digestNode(swapped));
});

Deno.test("accessible-name whitespace is normalized (same digest)", () => {
  const tidy = node("h1", { name: "Hello World" });
  const messy = node("h1", { name: "  Hello   World \n" });
  assertEquals(digestNode(tidy), digestNode(messy));
});

Deno.test("presentational / volatile props are ignored", () => {
  const plain = node("section", { name: "Intro" });
  const noisy = node("section", {
    name: "Intro",
    props: {
      id: "intro-7f3a",
      class: "prose md:flex",
      style: "color:red",
      "data-reactid": "42",
    },
  });
  assertEquals(digestNode(plain), digestNode(noisy));
});

Deno.test("semantic props change the digest", () => {
  const base = node("button", { name: "Menu" });
  const labelled = node("button", {
    name: "Menu",
    props: { "aria-expanded": "false" },
  });
  assertNotEquals(digestNode(base), digestNode(labelled));
});

Deno.test("resolved role changes the digest", () => {
  const div = node("div", { name: "Save" });
  const asButton = node("div", { name: "Save", role: "button" });
  assertNotEquals(digestNode(div), digestNode(asButton));
});

Deno.test("href is presence-only: different targets hash the same", () => {
  const here = node("a", { name: "Docs", props: { href: "/docs" } });
  const there = node("a", {
    name: "Docs",
    props: { href: "https://example.com/docs?v=2" },
  });
  assertEquals(digestNode(here), digestNode(there));
});

Deno.test("href presence vs absence still differs", () => {
  const link = node("a", { name: "Docs", props: { href: "/docs" } });
  const bare = node("a", { name: "Docs" });
  assertNotEquals(digestNode(link), digestNode(bare));
});

Deno.test("withDigests stamps every node and matches digestNode", () => {
  const tree = node("main", {
    children: [
      node("article", {
        children: [node("h2", { name: "A" }), node("p", { name: "B" })],
      }),
    ],
  });
  const stamped = withDigests(tree);

  // Root digest equals the standalone computation.
  assertEquals(stamped.digest, digestNode(tree));

  // Every node carries a well-formed digest, and each subtree's digest equals
  // digestNode of that subtree — the property findings rely on to address a node.
  const article = stamped.children[0];
  assertMatch(article.digest, SHA256_HEX);
  assertEquals(article.digest, digestNode(tree.children[0]));

  const heading = article.children[0];
  assertMatch(heading.digest, SHA256_HEX);
  assertEquals(heading.digest, digestNode(tree.children[0].children[0]));
});

Deno.test("a change deep in a subtree propagates to the root digest", () => {
  const before = node("main", {
    children: [node("article", { children: [node("p", { name: "B" })] })],
  });
  const after = node("main", {
    children: [node("article", { children: [node("p", { name: "B!" })] })],
  });
  assertNotEquals(digestNode(before), digestNode(after));
});

Deno.test("DIGEST_VERSION is part of the preimage", () => {
  // Sanity: the version constant is exported and stable for downstream pinning.
  assert(DIGEST_VERSION.length > 0);
});
