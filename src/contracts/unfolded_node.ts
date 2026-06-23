import { z } from "zod";

// The reader-view content types that survive CSS stripping.
// Each variant maps to one semantic block a browser reader mode keeps.

export type UnfoldedNodeType =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; text: string; preFormatted: boolean }
  | { kind: "list"; ordered: boolean; items: string[] };

const HeadingNode = z.object({
  kind: z.literal("heading"),
  level: z.number().int().min(1).max(6),
  text: z.string().min(1),
});

const ParagraphNode = z.object({
  kind: z.literal("paragraph"),
  text: z.string().min(1),
});

const CodeNode = z.object({
  kind: z.literal("code"),
  text: z.string(),
  preFormatted: z.boolean(),
});

const ListNode = z.object({
  kind: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(z.string()),
});

export const UnfoldedNode = z.discriminatedUnion("kind", [
  HeadingNode,
  ParagraphNode,
  CodeNode,
  ListNode,
]);
