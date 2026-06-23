import { z } from "zod";

// Validate kebab-case format (lowercase letters, numbers, hyphens)
const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Validate semantic versioning (major.minor.patch with optional pre-release)
const semverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export type ValidatorSpecType = {
  id: string;
  version: string;
};

export const ValidatorSpec = z.object({
  id: z.string()
    .min(1)
    .max(100)
    .regex(kebabCaseRegex, "ID must be in kebab-case format"),
  version: z.string()
    .regex(
      semverRegex,
      "Version must follow semantic versioning (e.g., 1.0.0)",
    ),
});
