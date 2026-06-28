# Accessibility Tree Fundamentals

This document provides foundational knowledge about accessibility trees, the 4
core properties every accessible node has, and how these concepts map to our
`SemanticNode` structure.

## Table of Contents

- [What is the Accessibility Tree?](#what-is-the-accessibility-tree)
- [How Browsers Construct the Accessibility Tree](#how-browsers-construct-the-accessibility-tree)
- [The 4 Core Properties](#the-4-core-properties)
  - [1. Name (Accessible Name)](#1-name-accessible-name)
  - [2. Description](#2-description)
  - [3. Role](#3-role)
  - [4. State](#4-state)
- [Semantic HTML vs ARIA](#semantic-html-vs-aria)
- [The Computed Name Algorithm](#the-computed-name-algorithm)
- [How This Maps to SemanticNode](#how-this-maps-to-semanticnode)
- [References](#references)

---

## What is the Accessibility Tree?

The **accessibility tree** is a hierarchical representation of a web page that
assistive technologies (like screen readers) use to understand and navigate
content. It's derived from the DOM tree but contains only semantically
meaningful information.

> "A great deal of web content can be made accessible just by making sure the
> correct HTML elements are used for the correct purpose at all times." —
> [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)

The accessibility tree serves as an **API between the DOM and assistive
technologies**, providing a structured way for screen readers, voice control
software, and other tools to consume web content.

---

## How Browsers Construct the Accessibility Tree

When a browser renders a web page:

1. **Parse HTML** → Build the DOM tree
2. **Apply CSS** → Compute styles and layout
3. **Extract semantics** → Build the accessibility tree from semantic HTML
   elements and ARIA attributes
4. **Expose to OS** → Make the tree available to assistive technologies via
   platform accessibility APIs (e.g., MSAA, IAccessible2, ATK, AX API)

### What Gets Included?

- **Semantic HTML elements**: `<button>`, `<nav>`, `<article>`, `<h1>`, etc.
- **Form controls**: `<input>`, `<select>`, `<textarea>`, etc.
- **Elements with ARIA roles/attributes**: `role="button"`, `aria-label="..."`,
  etc.
- **Images with alt text**: `<img alt="...">`, `<svg aria-label="...">`
- **Interactive elements**: Links, buttons, focusable elements

### What Gets Excluded?

- **Presentational elements**: `<div>`, `<span>` (unless they have ARIA roles or
  are focusable)
- **CSS-generated content**: `::before`, `::after` (unless explicitly made
  accessible)
- **Hidden content**: `display: none`, `visibility: hidden`,
  `aria-hidden="true"`
- **Decorative images**: `<img alt="">` (empty alt text signals decoration)

**Example:**

```html
<header>
  <h1>Welcome to My Site</h1>
  <nav>
    <ul>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
</header>
```

**Accessibility Tree (simplified):**

```
header
├─ heading (level 1)
│  └─ text: "Welcome to My Site"
└─ navigation
   └─ list
      ├─ listitem
      │  └─ link: "About"
      └─ listitem
         └─ link: "Contact"
```

---

## The 4 Core Properties

Every accessible node in the accessibility tree has **four fundamental
properties** that assistive technologies rely on:

### 1. Name (Accessible Name)

**What it is:** The primary label or identifier for an element, used to
reference or announce it.

**How it's computed:**

- `<label>` associated with form controls via `for` attribute
- `alt` attribute on images
- `aria-label` or `aria-labelledby` attributes
- Text content of buttons, links, headings
- `title` attribute (fallback, not recommended)

**Best practices:**

- ✅ Meaningful and distinctive (not just "Click here")
- ✅ Understandable in context and when read in isolation
- ✅ Describes the action or destination

**Examples:**

```html
<!-- Good: Label provides the accessible name -->
<label for="email">Email address:</label>
<input type="email" id="email" name="email" />
<!-- Accessible name: "Email address" -->

<!-- Good: Button text is the name -->
<button>Subscribe to newsletter</button>
<!-- Accessible name: "Subscribe to newsletter" -->

<!-- Good: Image alt text is the name -->
<img src="logo.png" alt="Acme Corporation" />
<!-- Accessible name: "Acme Corporation" -->

<!-- Good: aria-label provides name -->
<button aria-label="Close dialog">
  <span aria-hidden="true">×</span>
</button>
<!-- Accessible name: "Close dialog" -->

<!-- Bad: No accessible name -->
<button><span class="icon-download"></span></button>
<!-- Accessible name: "" (empty!) -->
```

### 2. Description

**What it is:** Additional context or supplementary information that extends the
name.

**How it's provided:**

- `aria-describedby` pointing to descriptive text
- `<figcaption>` for figures
- `title` attribute (supplementary, not primary)
- Placeholder text in form fields (weak pattern)

**Best practices:**

- ✅ Use for extended explanations, not primary labels
- ✅ Keep descriptions concise and relevant
- ❌ Don't duplicate the accessible name

**Examples:**

```html
<!-- Good: aria-describedby provides additional context -->
<label for="password">Password:</label>
<input
  type="password"
  id="password"
  aria-describedby="password-help"
/>
<p id="password-help">
  Must be at least 8 characters with one number and one symbol.
</p>
<!-- Name: "Password" -->
<!-- Description: "Must be at least 8 characters..." -->

<!-- Good: Figure caption provides description -->
<figure>
  <img
    src="chart.png"
    alt="Sales growth 2025"
    aria-describedby="chart-caption"
  />
  <figcaption id="chart-caption">
    Line chart showing 23% revenue increase from Q1 to Q4.
  </figcaption>
</figure>
<!-- Name: "Sales growth 2025" -->
<!-- Description: "Line chart showing..." -->
```

### 3. Role

**What it is:** The semantic type or purpose of an element (e.g., button, link,
heading, navigation).

**How it's determined:**

- **Implicit roles** from semantic HTML: `<button>` → `role="button"`, `<nav>` →
  `role="navigation"`
- **Explicit ARIA roles**: `<div role="button">` (use only when semantic HTML is
  unavailable)
- **ARIA role taxonomy**: See
  [WAI-ARIA 1.2 Role Definitions](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)

**Best practices:**

- ✅ Prefer semantic HTML over ARIA roles
- ✅ Use ARIA roles only when necessary (non-semantic elements)
- ❌ Don't override native semantics (e.g., `<button role="link">`)

**Examples:**

```html
<!-- Implicit role from semantic HTML (preferred) -->
<button>Save</button>
<!-- Role: "button" (implicit) -->

<nav>
  <a href="/home">Home</a>
</nav>
<!-- Role: "navigation" (implicit on <nav>) -->
<!-- Role: "link" (implicit on <a>) -->

<!-- Explicit ARIA role (use when semantic HTML unavailable) -->
<div role="button" tabindex="0">
  Custom styled button
</div>
<!-- Role: "button" (explicit) -->

<!-- Bad: Overriding native semantics -->
<button role="link">Don't do this</button>
<!-- Confusing: looks like button, acts like button, announced as link -->
```

**Common ARIA Roles:**

| Role Category          | Examples                                                                 |
| ---------------------- | ------------------------------------------------------------------------ |
| **Landmarks**          | `banner`, `navigation`, `main`, `contentinfo`, `search`, `complementary` |
| **Widgets**            | `button`, `checkbox`, `radio`, `textbox`, `slider`, `tab`, `menu`        |
| **Document Structure** | `article`, `heading`, `list`, `listitem`, `table`, `row`, `cell`         |
| **Live Regions**       | `alert`, `log`, `status`, `timer`, `marquee`                             |

### 4. State

**What it is:** The current condition or status of an element (enabled,
disabled, checked, expanded, etc.).

**How it's tracked:**

- **Native HTML attributes**: `disabled`, `required`, `checked`, `readonly`
- **ARIA states**: `aria-disabled`, `aria-checked`, `aria-expanded`,
  `aria-selected`, `aria-pressed`
- **CSS pseudo-classes** (for visual state): `:focus`, `:hover`, `:active`,
  `:disabled`

**Best practices:**

- ✅ Use native HTML state attributes when possible
- ✅ Update ARIA state attributes dynamically with JavaScript
- ✅ Ensure visual state matches ARIA state

**Examples:**

```html
<!-- Native state attributes (preferred) -->
<button disabled>Submit</button>
<!-- State: disabled (implicit) -->

<input type="checkbox" checked />
<!-- State: checked (implicit) -->

<!-- ARIA state attributes -->
<button aria-pressed="true">Bold</button>
<!-- State: pressed -->

<div role="tab" aria-selected="true">Tab 1</div>
<!-- State: selected -->

<!-- Expandable section (state changes with JS) -->
<button aria-expanded="false" aria-controls="details">
  Show details
</button>
<div id="details" hidden>
  Additional information...
</div>
<!-- State: collapsed (aria-expanded="false") -->
```

**Common ARIA States:**

| State Attribute | Purpose                           | Values                                 |
| --------------- | --------------------------------- | -------------------------------------- |
| `aria-disabled` | Element cannot be interacted with | `true`, `false`                        |
| `aria-checked`  | Checkbox/radio state              | `true`, `false`, `mixed`               |
| `aria-expanded` | Collapsible content state         | `true`, `false`                        |
| `aria-selected` | Selection state (tabs, options)   | `true`, `false`                        |
| `aria-pressed`  | Toggle button state               | `true`, `false`, `mixed`               |
| `aria-hidden`   | Visibility to assistive tech      | `true`, `false`                        |
| `aria-invalid`  | Form validation state             | `true`, `false`, `grammar`, `spelling` |
| `aria-required` | Required form field               | `true`, `false`                        |

---

## Semantic HTML vs ARIA

### The Golden Rule

> **"Use semantic HTML first; ARIA is for cases where semantic HTML is
> unavailable or insufficient."**

### Why Semantic HTML is Preferred

Semantic HTML elements provide **built-in accessibility** with zero extra
effort:

| Feature                   | Semantic HTML                   | Non-semantic + ARIA          |
| ------------------------- | ------------------------------- | ---------------------------- |
| **Keyboard support**      | ✅ Native (Tab, Enter, Space)   | ❌ Must implement with JS    |
| **Accessible name**       | ✅ Automatic from content/label | ⚠️ Must add `aria-label`     |
| **Role**                  | ✅ Implicit                     | ⚠️ Must add `role` attribute |
| **State**                 | ✅ Native attributes            | ⚠️ Must add ARIA states      |
| **Browser compatibility** | ✅ Universal                    | ⚠️ Varies by browser/AT      |
| **Developer effort**      | ✅ Minimal                      | ❌ Significant               |

### Comparison Examples

#### Example 1: Button

```html
<!-- ✅ GOOD: Semantic HTML -->
<button>Play video</button>
<!-- - Role: button (implicit) -->
<!-- - Keyboard: Tab, Enter, Space (native) -->
<!-- - Name: "Play video" (from text content) -->

<!-- ❌ BAD: Non-semantic with incomplete ARIA -->
<div onclick="playVideo()">Play video</div>
<!-- - Role: none (not announced to screen readers) -->
<!-- - Keyboard: none (not focusable) -->

<!-- ⚠️ ACCEPTABLE (if semantic HTML unavailable): Non-semantic with complete ARIA -->
<div
  role="button"
  tabindex="0"
  onclick="playVideo()"
  onkeydown='if (event.key === "Enter" || event.key === " ") playVideo()'
>
  Play video
</div>
<!-- - Role: button (explicit) -->
<!-- - Keyboard: Tab (via tabindex), Enter/Space (via JS) -->
<!-- - Name: "Play video" (from text content) -->
```

#### Example 2: Form Input

```html
<!-- ✅ GOOD: Semantic HTML with label -->
<label for="username">Username:</label>
<input type="text" id="username" name="username" required />
<!-- - Role: textbox (implicit) -->
<!-- - Name: "Username" (from <label>) -->
<!-- - State: required (native attribute) -->
<!-- - Keyboard: Tab, text input (native) -->

<!-- ❌ BAD: No label, placeholder as name (anti-pattern) -->
<input type="text" placeholder="Username" />
<!-- - Name: "Username" (from placeholder - weak pattern!) -->
<!-- - No associated label (screen reader context lost) -->

<!-- ⚠️ BETTER: Non-semantic with ARIA (still prefer semantic) -->
<span id="username-label">Username:</span>
<div
  role="textbox"
  contenteditable="true"
  aria-labelledby="username-label"
  aria-required="true"
></div>
<!-- - Role: textbox (explicit) -->
<!-- - Name: "Username" (from aria-labelledby) -->
<!-- - State: required (via aria-required) -->
<!-- - Keyboard: Tab, text input (via contenteditable) -->
```

### When to Use ARIA

ARIA is **necessary** in these situations:

1. **Custom widgets** (e.g., tree views, sliders, comboboxes with no semantic
   HTML equivalent)
2. **Dynamic content updates** (live regions: `aria-live`, `role="alert"`)
3. **Enhancing semantic HTML** (e.g., `aria-current="page"` on navigation links)
4. **Fixing legacy code** where rewriting with semantic HTML is infeasible

**Example: Custom Tree View (ARIA required)**

```html
<div role="tree" aria-label="File browser">
  <div role="treeitem" aria-expanded="true">
    Documents
    <div role="group">
      <div role="treeitem">resume.pdf</div>
      <div role="treeitem">cover-letter.docx</div>
    </div>
  </div>
</div>
```

**Example: Live Region (ARIA required)**

```html
<div role="status" aria-live="polite" aria-atomic="true">
  <p>5 new messages</p>
</div>
<!-- Screen reader announces: "5 new messages" when content updates -->
```

---

## The Computed Name Algorithm

The **Accessible Name and Description Computation** is a W3C specification that
defines how browsers calculate the accessible name for an element.

### Name Computation Priority (Simplified)

The browser checks these sources **in order** until it finds a name:

1. **`aria-labelledby`** (references other element(s))
2. **`aria-label`** (direct text string)
3. **Native HTML label**:
   - `<label>` associated via `for` attribute
   - `alt` attribute for images
   - `value` for buttons/inputs
4. **`title`** attribute (last resort, not ideal)
5. **Text content** (for links, buttons, headings)
6. **Placeholder** (weakest, not reliable)

### Examples

```html
<!-- Example 1: aria-labelledby (highest priority) -->
<span id="close-label">Close dialog</span>
<button aria-labelledby="close-label">×</button>
<!-- Computed name: "Close dialog" -->

<!-- Example 2: aria-label (second priority) -->
<button aria-label="Search">
  <span class="icon-search"></span>
</button>
<!-- Computed name: "Search" -->

<!-- Example 3: Native label (third priority) -->
<label for="email">Email:</label>
<input type="email" id="email" />
<!-- Computed name: "Email" -->

<!-- Example 4: Text content (for links/buttons) -->
<a href="/products">View all products</a>
<!-- Computed name: "View all products" -->

<!-- Example 5: Alt text (for images) -->
<img src="logo.png" alt="Acme Corp" />
<!-- Computed name: "Acme Corp" -->
```

### Description Computation

The accessible **description** is computed similarly:

1. **`aria-describedby`** (references other element(s))
2. **`title`** attribute (if not used for name)

**Note:** `aria-labelledby` and `aria-describedby` can reference **multiple
elements** (space-separated IDs), and their text content is concatenated.

```html
<label for="password">Password</label>
<input
  type="password"
  id="password"
  aria-describedby="hint error"
/>
<p id="hint">At least 8 characters</p>
<p id="error">Password is too short</p>
<!-- Name: "Password" -->
<!-- Description: "At least 8 characters Password is too short" -->
```

### Full Specification

For the complete algorithm, see:

- [W3C Accessible Name and Description Computation 1.2](https://w3c.github.io/accname/)

---

## How This Maps to SemanticNode

Our `SemanticNode` type (defined in
[`src/contracts/semantic_node.ts`](../src/contracts/semantic_node.ts)) is
designed to capture the essential semantic information from the accessibility
tree.

### SemanticNode Structure

```typescript
type SemanticNodeType = {
  type: string; // Element type (e.g., "button", "input", "div")
  name?: string; // Accessible name (optional)
  role?: string; // ARIA role (optional, validated against spec)
  props?: Record<string, unknown>; // Additional ARIA properties and state
  children: SemanticNodeType[]; // Child nodes (recursive tree)
};
```

### Mapping Accessibility Concepts to SemanticNode

| Accessibility Property | SemanticNode Field                                 | Notes                                                                                              |
| ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Accessible Name**    | `name`                                             | Computed from `aria-label`, `<label>`, text content, etc.                                          |
| **Description**        | `props.description` or `props['aria-describedby']` | Stored in `props` as additional metadata                                                           |
| **Role**               | `role`                                             | ARIA role (validated against [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)) |
| **State**              | `props`                                            | ARIA state attributes (`aria-disabled`, `aria-checked`, etc.)                                      |
| **Element Type**       | `type`                                             | HTML tag name or custom element type                                                               |
| **Children**           | `children`                                         | Recursive tree structure                                                                           |

### Why This Design?

1. **`type`**: Captures the HTML element or component type (e.g., `button`,
   `input`, `CustomButton`)
2. **`name`**: The **most critical** accessibility property — how users identify
   and reference the element
3. **`role`**: ARIA role for semantic meaning (optional because semantic HTML
   has implicit roles)
4. **`props`**: Flexible key-value store for all other ARIA attributes and state
   (e.g., `aria-disabled`, `aria-expanded`, `aria-describedby`)
5. **`children`**: Preserves the hierarchical structure of the accessibility
   tree

### Example: HTML to SemanticNode

**HTML:**

```html
<button
  id="submit-btn"
  aria-label="Submit form"
  aria-describedby="submit-hint"
  disabled
>
  Submit
</button>
<p id="submit-hint">This will send your data to the server.</p>
```

**Accessibility Tree Properties:**

- **Name**: "Submit form" (from `aria-label`)
- **Description**: "This will send your data to the server." (from
  `aria-describedby`)
- **Role**: `button` (implicit from `<button>`)
- **State**: `disabled` (from `disabled` attribute)

**SemanticNode Representation:**

```typescript
{
  type: "button",
  name: "Submit form",
  role: "button", // Could be omitted (implicit from <button>)
  props: {
    "aria-describedby": "submit-hint",
    "disabled": true,
    "id": "submit-btn"
  },
  children: [
    {
      type: "text",
      name: "Submit",
      children: []
    }
  ]
}
```

### Validator Use Cases

The `SemanticNode` structure enables validators to:

1. **Check accessible names**: Ensure all interactive elements have meaningful
   names
2. **Validate ARIA usage**: Verify roles and attributes are used correctly
3. **Detect state issues**: Find elements with conflicting or missing state
4. **Audit keyboard accessibility**: Check for focusable elements with proper
   roles
5. **Test text alternatives**: Ensure images and non-text content have
   appropriate names

**Example Validator Logic:**

```typescript
// Validator: All buttons must have an accessible name
function validateButtonNames(node: SemanticNodeType): Finding[] {
  const findings: Finding[] = [];

  if (node.role === "button" && !node.name) {
    findings.push({
      severity: "error",
      message: "Button missing accessible name",
      element: node,
    });
  }

  // Recursively check children
  node.children.forEach((child) => {
    findings.push(...validateButtonNames(child));
  });

  return findings;
}
```

### Keyboard Accessibility Validator

The keyboard validator uses `SemanticNode` props to reason about focus order and
keyboard interaction. It assumes native controls (`button`, `a`, `input`, etc.)
provide built-in keyboard behavior, and only enforces keyboard handlers for
custom widgets and roles.

```typescript
import { validateKeyboardAccessible } from "../src/validate/keyboard_accessible.ts";

const findings = validateKeyboardAccessible(node);
```

**Supported props**

- `tabIndex` / `tabindex`: explicit tab order and focusability
- `focusVisible`: boolean flag for visible focus ring
- `keyboardHandlers`: array or comma-separated string of supported keys
- `keyboardTrap` / `focusTrap`: boolean flag indicating a focus trap
- `escapeCloses`: boolean flag indicating Escape exits a trap or modal
- `focusable`: explicit focusability override

**Behavior highlights**

- Flags interactive elements that are not focusable
- Warns on positive `tabIndex` order regressions
- Requires Escape to exit declared focus traps or modals
- Ensures custom widgets support activation/arrow keys

### Text Alternatives Validator

The text alternatives validator checks non-text content for required labels and
fallbacks. It relies on `SemanticNode` props to identify where text alternatives
are supplied.

```typescript
import { validateTextAlternatives } from "../src/validate/text_alternatives.ts";

const findings = validateTextAlternatives(node);
```

**Supported props**

- `alt`: image alternative text
- `decorative`: boolean for decorative imagery
- `aria-label` / `aria-labelledby`: accessible labels
- `title` / `desc`: SVG title/description
- `captions` / `transcript`: media alternatives
- `iconOnly`: boolean for icon-only controls
- `fallbackText`: fallback content for `canvas`/`iframe`

**Behavior highlights**

- Images require non-empty `alt` unless decorative
- SVGs require a title/desc or ARIA label
- Audio/video require captions or transcripts
- Icon-only controls must provide an accessible label
- Canvas/iframe must include fallback content

### ARIA Usage Validator

The ARIA validator checks role usage, required attributes, and relationships
between ARIA labels and target IDs.

```typescript
import { validateARIAUsage } from "../src/validate/aria_usage.ts";

const findings = validateARIAUsage(node);
```

**Supported props**

- `aria-checked`, `aria-expanded`, `aria-valuenow`, `aria-valuemin`,
  `aria-valuemax`: required role attributes
- `aria-labelledby` / `aria-describedby`: relationship targets (must exist)
- `aria-live`: live region settings (`off`, `polite`, `assertive`)

**Behavior highlights**

- Missing required ARIA attributes are errors
- Invalid ARIA attribute values are errors
- Redundant role usage is warned (e.g., `role="button"` on `<button>`)
- Conflicting roles with native semantics are errors
- Missing relationship targets are errors

### Screen Reader Content Validator

The screen reader content validator flags content hidden from assistive
technology and detects misuse of `aria-hidden` on focusable elements.

```typescript
import { validateScreenReaderContent } from "../src/validate/screen_reader_content.ts";

const findings = validateScreenReaderContent(node);
```

**Supported props**

- `display`, `visibility`, `hidden`: visibility controls
- `class` / `className`: visually hidden class detection (`sr-only`,
  `visually-hidden`)
- `aria-hidden`: intentional screen-reader hiding
- `tabIndex` / `tabindex`, `focusable`: focusability checks

**Behavior highlights**

- Flags `display:none` and `visibility:hidden` content
- Errors on `aria-hidden` when the element is focusable
- Warns if visually hidden content has no meaningful text
- Flags hidden interactive elements

### Color Contrast Validator

The color contrast validator checks text and non-text contrast ratios based on
computed colors.

```typescript
import { validateColorContrast } from "../src/validate/color_contrast.ts";

const findings = validateColorContrast(node);
```

**Supported props**

- `color` / `textColor`: foreground color
- `backgroundColor` / `background`: background color
- `fontSize`, `fontWeight`, `largeText`: large text detection
- `nonText` / `contrastType`: non-text contrast checks

**Behavior highlights**

- Normal text requires 4.5:1 contrast ratio
- Large text requires 3:1 contrast ratio
- Non-text elements require 3:1 contrast ratio

---

## References

### W3C Specifications

- [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) — Core ARIA roles, states,
  and properties
- [WAI-ARIA 1.2 Role Definitions](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)
  — Complete role taxonomy
- [Accessible Name and Description Computation 1.2](https://w3c.github.io/accname/)
  — Name/description algorithm
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) —
  Design patterns and examples

### MDN Web Docs

- [Accessibility Tree (Glossary)](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree)
- [HTML and Accessibility](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
- [ARIA Basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/WAI-ARIA_basics)
- [Accessible Name](https://developer.mozilla.org/en-US/docs/Glossary/Accessible_name)

### Project Files

- [`src/contracts/semantic_node.ts`](../src/contracts/semantic_node.ts) —
  SemanticNode type definition
- [`src/adapters/cdp.ts`](../src/adapters/cdp.ts) — CDP AXNode to SemanticNode
  adapter
- [`src/validate/nameable.ts`](../src/validate/nameable.ts) — Accessible name
  validator

---

## Summary

1. **The accessibility tree** is a semantic representation of the DOM consumed
   by assistive technologies.
2. **Every accessible node has 4 core properties**: Name, Description, Role,
   State.
3. **Semantic HTML is preferred** over ARIA — it provides accessibility "for
   free."
4. **ARIA is used** when semantic HTML is unavailable or needs enhancement.
5. **The computed name algorithm** determines accessible names from multiple
   sources (labels, ARIA, text content).
6. **SemanticNode** captures these properties in a structured format for
   validation and testing.

By understanding these fundamentals, you can build validators that ensure web
content is accessible to all users, regardless of how they interact with the
web.
