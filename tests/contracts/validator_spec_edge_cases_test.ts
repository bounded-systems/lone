import { assertEquals, assertThrows } from "@std/assert";
import { ValidatorSpec } from "../../src/contracts/validator_spec.ts";
import { ZodError } from "zod";

// Edge case: ID format validation
Deno.test("ValidatorSpec - rejects uppercase in ID", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "Name-Required",
        version: "1.0.0",
      });
    },
    ZodError,
    "ID must be in kebab-case",
  );
});

Deno.test("ValidatorSpec - rejects snake_case ID", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "name_required",
        version: "1.0.0",
      });
    },
    ZodError,
    "ID must be in kebab-case",
  );
});

Deno.test("ValidatorSpec - rejects ID starting with hyphen", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "-name-required",
        version: "1.0.0",
      });
    },
    ZodError,
    "ID must be in kebab-case",
  );
});

Deno.test("ValidatorSpec - rejects ID ending with hyphen", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "name-required-",
        version: "1.0.0",
      });
    },
    ZodError,
  );
});

Deno.test("ValidatorSpec - rejects ID with consecutive hyphens", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "name--required",
        version: "1.0.0",
      });
    },
    ZodError,
  );
});

Deno.test("ValidatorSpec - accepts single word ID", () => {
  const result = ValidatorSpec.parse({
    id: "validator",
    version: "1.0.0",
  });

  assertEquals(result.id, "validator");
});

Deno.test("ValidatorSpec - accepts ID with numbers", () => {
  const result = ValidatorSpec.parse({
    id: "validator-v2",
    version: "1.0.0",
  });

  assertEquals(result.id, "validator-v2");
});

Deno.test("ValidatorSpec - accepts multi-part kebab-case ID", () => {
  const result = ValidatorSpec.parse({
    id: "aria-role-validator-v2",
    version: "1.0.0",
  });

  assertEquals(result.id, "aria-role-validator-v2");
});

// Edge case: version format validation
Deno.test("ValidatorSpec - rejects version without patch", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "validator",
        version: "1.0",
      });
    },
    ZodError,
    "Version must follow semantic versioning",
  );
});

Deno.test("ValidatorSpec - rejects version with v prefix", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "validator",
        version: "v1.0.0",
      });
    },
    ZodError,
    "Version must follow semantic versioning",
  );
});

Deno.test("ValidatorSpec - accepts version with pre-release", () => {
  const result = ValidatorSpec.parse({
    id: "validator",
    version: "1.0.0-alpha",
  });

  assertEquals(result.version, "1.0.0-alpha");
});

Deno.test("ValidatorSpec - accepts version with pre-release and build", () => {
  const result = ValidatorSpec.parse({
    id: "validator",
    version: "1.0.0-alpha.1+build.123",
  });

  assertEquals(result.version, "1.0.0-alpha.1+build.123");
});

Deno.test("ValidatorSpec - accepts version with build metadata", () => {
  const result = ValidatorSpec.parse({
    id: "validator",
    version: "1.0.0+20230101",
  });

  assertEquals(result.version, "1.0.0+20230101");
});

Deno.test("ValidatorSpec - accepts 0.0.0 version", () => {
  const result = ValidatorSpec.parse({
    id: "validator",
    version: "0.0.0",
  });

  assertEquals(result.version, "0.0.0");
});

Deno.test("ValidatorSpec - accepts large version numbers", () => {
  const result = ValidatorSpec.parse({
    id: "validator",
    version: "999.999.999",
  });

  assertEquals(result.version, "999.999.999");
});

Deno.test("ValidatorSpec - rejects version with leading zeros", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "validator",
        version: "01.0.0",
      });
    },
    ZodError,
  );
});

// Edge case: length limits
Deno.test("ValidatorSpec - rejects excessively long ID", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "a".repeat(101),
        version: "1.0.0",
      });
    },
    ZodError,
  );
});

Deno.test("ValidatorSpec - accepts ID at max length", () => {
  const longId = "a" + "-a".repeat(49); // 99 chars
  const result = ValidatorSpec.parse({
    id: longId,
    version: "1.0.0",
  });

  assertEquals(result.id, longId);
});

// Edge case: special characters
Deno.test("ValidatorSpec - rejects ID with spaces", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "name required",
        version: "1.0.0",
      });
    },
    ZodError,
  );
});

Deno.test("ValidatorSpec - rejects ID with dots", () => {
  assertThrows(
    () => {
      ValidatorSpec.parse({
        id: "name.required",
        version: "1.0.0",
      });
    },
    ZodError,
  );
});

// Edge case: realistic validator IDs
Deno.test("ValidatorSpec - accepts realistic ARIA validator ID", () => {
  const result = ValidatorSpec.parse({
    id: "aria-role-required",
    version: "2.1.0",
  });

  assertEquals(result.id, "aria-role-required");
  assertEquals(result.version, "2.1.0");
});

Deno.test("ValidatorSpec - accepts realistic WCAG validator ID", () => {
  const result = ValidatorSpec.parse({
    id: "wcag21-aa-compliant",
    version: "3.0.0",
  });

  assertEquals(result.id, "wcag21-aa-compliant");
  assertEquals(result.version, "3.0.0");
});
