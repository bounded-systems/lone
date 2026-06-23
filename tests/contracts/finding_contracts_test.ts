import { assertEquals } from "@std/assert";
import {
  compareFindings,
  type FindingType,
  sortFindings,
} from "../../src/contracts/finding.ts";

Deno.test("compareFindings - stable and total ordering", () => {
  const a: FindingType = {
    code: "LONE_SEMANTIC_A",
    path: "$.b",
    message: "Z",
    severity: "warning",
  };
  const b: FindingType = {
    code: "LONE_SEMANTIC_A",
    path: "$.a",
    message: "A",
    severity: "warning",
  };
  const c: FindingType = {
    code: "LONE_SEMANTIC_B",
    path: "$.a",
    message: "A",
    severity: "warning",
  };
  const d: FindingType = {
    code: "LONE_SEMANTIC_B",
    path: "$.a",
    message: "A",
    severity: "error",
  };

  assertEquals(compareFindings(d, a) < 0, true);
  assertEquals(compareFindings(b, a) < 0, true);
  assertEquals(compareFindings(b, c) < 0, true);
  assertEquals(compareFindings(a, b) > 0, true);
});

Deno.test("sortFindings - deterministic ordering", () => {
  const findings: FindingType[] = [
    {
      code: "LONE_SEMANTIC_B",
      path: "$.b",
      message: "Z",
      severity: "warning",
    },
    {
      code: "LONE_SEMANTIC_A",
      path: "$.b",
      message: "Z",
      severity: "info",
    },
    {
      code: "LONE_SEMANTIC_A",
      path: "$.a",
      message: "A",
      severity: "warning",
    },
    {
      code: "LONE_SEMANTIC_A",
      path: "$.a",
      message: "A",
      severity: "error",
    },
  ];

  const sorted = sortFindings(findings);
  assertEquals(sorted.map((f) => f.severity), [
    "error",
    "warning",
    "warning",
    "info",
  ]);
  assertEquals(sorted.map((f) => f.code), [
    "LONE_SEMANTIC_A",
    "LONE_SEMANTIC_A",
    "LONE_SEMANTIC_B",
    "LONE_SEMANTIC_A",
  ]);
  assertEquals(sorted.map((f) => f.path), [
    "$.a",
    "$.a",
    "$.b",
    "$.b",
  ]);
});
