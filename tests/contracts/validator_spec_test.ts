import { assertEquals, assertThrows } from "@std/assert";
import { ValidatorSpec } from "../../src/contracts/validator_spec.ts";
import { ZodError } from "zod";

Deno.test("ValidatorSpec - parses valid spec", () => {
  const result = ValidatorSpec.parse({
    id: "name-required",
    version: "0.1.0",
  });

  assertEquals(result.id, "name-required");
  assertEquals(result.version, "0.1.0");
});

Deno.test("ValidatorSpec - rejects empty id", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "",
        version: "0.1",
      });
    },
    ZodError,
    "String must contain at least 1 character(s)",
  );
});

Deno.test("ValidatorSpec - rejects empty version", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "name-required",
        version: "",
      });
    },
    ZodError,
    "Version must follow semantic versioning",
  );
});

Deno.test("ValidatorSpec - handles semantic versions", () => {
  const result = ValidatorSpec.parse({
    id: "aria-roles",
    version: "1.2.3",
  });

  assertEquals(result.version, "1.2.3");
});

Deno.test("ValidatorSpec - requires both fields", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "name-required",
      });
    },
    ZodError,
  );
});
