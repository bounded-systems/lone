// Validator exports
export { validateNameRequired } from "./nameable.ts";
export { validateSemanticHTML } from "./semantic_html.ts";
export {
  simulateTabNavigation,
  validateFocusOrder,
  validateKeyboardAccessible,
  validateKeyboardTraps,
} from "./keyboard_accessible.ts";
export { validateARIAUsage } from "./aria_usage.ts";
export { validateScreenReaderContent } from "./screen_reader_content.ts";
export { validateColorContrast } from "./color_contrast.ts";
export { validateTextAlternatives } from "./text_alternatives.ts";
export { validateReaderView } from "./reader_view.ts";
export {
  validateGraphIntegrity,
  validateNoDanglingRef,
  validateNoDuplicateId,
  validateNoOrphan,
} from "./graph_integrity.ts";
export {
  CHOICE_DENSITY_MAX,
  COMPETING_PRIMARY_ACTIONS_MAX,
  CONTENT_DENSITY_MAX_WORDS,
  DISCLOSURE_MAX_SECTIONS,
  FORM_FIELD_BURDEN_MAX,
  FORM_REQUIRED_BURDEN_MAX,
  HEADING_DEPTH_MAX,
  MAX_H1,
  validateCognitiveBudget,
} from "./cognitive_budget.ts";
