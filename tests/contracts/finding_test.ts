import { assertEquals, assertThrows } from "@std/assert";
import { Finding } from "../../src/contracts/finding.ts";
import { ZodError } from "zod";

Deno.test("Finding - parses valid finding", () => {
  const result = Finding.parse({
    code: "LONE_SEMANTIC_HEADING_ORDER",
    path: "$.root",
    message: "Heading order is invalid",
    severity: "error",
  });

  assertEquals(result.code, "LONE_SEMANTIC_HEADING_ORDER");
  assertEquals(result.path, "$.root");
  assertEquals(result.message, "Heading order is invalid");
  assertEquals(result.severity, "error");
});

Deno.test("Finding - rejects empty code", () => {
  assertThrows(
    () => {
      Finding.parse({
        code: "",
        path: "$.root",
        message: "Missing code",
      });
    },
    ZodError,
  );
});

Deno.test("Finding - rejects empty path", () => {
  assertThrows(
    () => {
      Finding.parse({
        code: "LONE_PATH_MISSING",
        path: "",
        message: "Missing path",
      });
    },
    ZodError,
  );
});

Deno.test("Finding - rejects empty message", () => {
  assertThrows(
    () => {
      Finding.parse({
        code: "LONE_MESSAGE_MISSING",
        path: "$.root",
        message: "",
      });
    },
    ZodError,
  );
});

Deno.test("Finding - rejects missing fields", () => {
  assertThrows(
    () => {
      Finding.parse({
        code: "LONE_MISSING_FIELDS",
      } as unknown);
    },
    ZodError,
  );
});

Deno.test("Finding - handles complex JSONPath", () => {
  const result = Finding.parse({
    code: "LONE_PATH_COMPLEX",
    path: "$.root['child-name'][0].grandChild",
    message: "Complex path",
  });

  assertEquals(result.path, "$.root['child-name'][0].grandChild");
});
