---
name: shaiden
description: Shaiden (紫電) is a Salesforce LWC Design Precision skill — purple lightning. Activates for any LWC design task: building new components with brand identity, auditing existing components, enforcing design system consistency, and polishing to professional UI/UX standards. TRIGGER for: /shaiden init, /shaiden craft, /shaiden amend, /shaiden critique, /shaiden polish, /shaiden harmonize. Keywords: LWC design, SLDS 2, component design, design system, brand token, styling hooks, UI polish, component audit, design consistency, Salesforce component. DO NOT TRIGGER for pure Apex, Flow, or non-UI Salesforce tasks.
---

# SHAIDEN — 紫電 · LWC Design Precision

> _Purple lightning. Every component strikes with intent._

Shaiden is not a coding skill — it is a **design craft skill** that produces LWC components with a deliberate visual identity, SLDS 2 compliance, and professional UI/UX quality. Every decision is justified. Nothing is accidental. Nothing is template.

---

## Command Reference

| Command             | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `/shaiden init`      | Bootstrap design system for the project              |
| `/shaiden evolve`    | Amend `design.md` after a brand change, without a full re-init |
| `/shaiden craft`     | Build a new component from brand brief               |
| `/shaiden amend`     | Add or modify elements in an existing component      |
| `/shaiden critique`  | Audit a component and generate a scored critique     |
| `/shaiden polish`    | Resolve open critique issues                         |
| `/shaiden harmonize` | Align a target component to match a source component |

---

## File System

Shaiden manages three persistent artifacts in the project root:

```
project-root/
├── design.md              ← Brand tokens & design decisions (INIT)
├── product.md             ← Component registry, scores, critique links
├── .critique/
│   ├── opportunityCard/
│   │   ├── critique-001.md
│   │   └── critique-002.md
│   └── accountHeader/
│       └── critique-001.md
└── .gitignore             ← Auto-appended: .critique/
```

**Rules:**

- `design.md` and `product.md` live at project root, committed to git
- `.critique/` is always gitignored — it is a working scratchpad, not source of truth
- When all issues in a critique file are closed → delete the file, update score in `product.md`
- Shaiden generates and maintains all three artifacts automatically

**This skill's own reference templates** (bundled alongside this file, not part of the
project being worked on) live in `references/`: `design-template.md`,
`product-template.md`, and `critique-template.md`. Each is the authoritative,
complete structure for its artifact — the templates inlined in the phases below
are condensed previews. Read the relevant reference file before generating or
updating an artifact.

---

## Scoring System — Scale of 40

Every component scored across 5 aspects, each out of 8:

### 1. Visual Consistency (0–8)

Alignment with `design.md` tokens. Spacing rhythm, corner radius, color palette usage. Whether the component feels like part of the same family as other registered components.

### 2. SLDS 2 Compliance (0–8)

- No hardcoded hex or px values
- All styling via `--slds-g-*` hooks with proper fallbacks
- No direct `.slds-*` class overrides
- No private hooks (`--_slds-`, `--slds-s-`)
- `var()` always includes fallback value

### 3. Typography & Spacing Precision (0–8)

- Type scale intentional and consistent (`--slds-g-font-size-*`)
- Font weight and line-height deliberate (`--slds-g-font-weight-*`)
- Spacing from `--slds-g-spacing-*`, no magic numbers
- Whitespace feels designed, not accidental

### 4. UX & Accessibility (0–8)

- Empty state: present and directive (not "No data")
- Error state: clear, actionable
- Loading state: present with `lightning-spinner` and `alternative-text`
- All interactive elements have `aria-label` or visible label
- State not conveyed by color alone — icon or text accompanies
- Remains usable at narrow viewport widths (Salesforce mobile app, narrow Lightning panes) — no
  fixed pixel widths that break the layout below the component's minimum comfortable size

### 5. Human Touch & Distinctiveness (0–8)

- Does not feel AI-generated or template
- Has one intentional signature element specific to this component
- Motion (if present) is purposeful, not decorative
- Copy is functional and in active voice
- A professional Salesforce UI/UX designer would be satisfied

### Score Bands

| Score | Band         | Recommendation              |
| ----- | ------------ | --------------------------- |
| 35–40 | ✦ Polished   | Ship it                     |
| 28–34 | ◈ Good       | Minor polish needed         |
| 20–27 | ◇ Needs Work | Run POLISH before shipping  |
| 0–19  | ✕ Rebuild    | Consider CRAFT from scratch |

---

## Phase 1 — INIT

**Trigger:** `/shaiden init`

**Goal:** Establish the project's design identity and generate `design.md`.

### Step 1 — Scan (if project has existing components)

Before any discussion, scan the project for existing LWC components:

- Collect all `*.css` files
- Extract all `--slds-g-*` hooks in use
- Identify any hardcoded values (flag as tech debt)
- Summarize the implicit "design language" of what already exists

Present findings to the user as context for the discussion.

### Step 2 — Brand Discovery Discussion

Conduct an interactive discussion covering:

```
1. Brand personality — 3 adjectives that describe the org's UI feel
   (e.g., "clean, confident, modern" vs "warm, approachable, structured")

2. Primary brand color — hex or description
   → Map to nearest --slds-g-color-brand-* hook

3. Surface hierarchy — how many surface levels needed
   (card > page > modal > tooltip)

4. Corner radius personality — sharp (0), subtle (4px), rounded (8px+)
   → Map to --slds-g-radius-border-* hooks

5. Typography stance — compact & dense vs spacious & airy
   → Define type scale roles: display, heading, body, label, caption

6. Motion stance — none, subtle only, expressive
   → Define when animation is allowed

7. Spacing unit — base spacing rhythm
   → Anchor to --slds-g-spacing-4 (16px) or --slds-g-spacing-3 (12px)

8. Signature direction — one recurring design detail that will
   appear across all components (e.g., left accent border on cards,
   subtle gradient on headers, icon treatment style)
```

### Step 3 — Generate design.md

After discussion, generate `design.md` at project root. Use
`references/design-template.md` as the authoritative structure — it includes
the Shadow System, Component Naming Convention, and Tech Debt Log sections
omitted from the condensed preview below:

```markdown
# design.md — [Project Name] Design System

_Generated by /shaiden init — [date]_

## Brand Personality

[3 adjectives + 1-sentence design philosophy]

## Color Palette

| Role           | Hook                               | Fallback | Usage               |
| -------------- | ---------------------------------- | -------- | ------------------- |
| Brand Primary  | --slds-g-color-brand-base-50       | #0176d3  | CTAs, active states |
| Surface 1      | --slds-g-color-surface-container-1 | #ffffff  | Card backgrounds    |
| Surface 2      | --slds-g-color-surface-container-2 | #f3f3f3  | Page backgrounds    |
| Border         | --slds-g-color-border-1            | #e5e5e5  | Dividers, outlines  |
| Text Primary   | --slds-g-color-on-surface-1        | #181818  | Body text           |
| Text Secondary | --slds-g-color-on-surface-2        | #444444  | Labels, captions    |
| Accent         | --slds-g-color-accent-1            | [hex]    | Signature elements  |
| Error          | --slds-g-color-error-1             | #ba0517  | Error states        |
| Success        | --slds-g-color-success-1           | #2e844a  | Success states      |

## Typography Scale

| Role    | Hook                 | Fallback | Weight                        |
| ------- | -------------------- | -------- | ----------------------------- |
| Display | --slds-g-font-size-9 | 1.875rem | --slds-g-font-weight-bold     |
| Heading | --slds-g-font-size-6 | 1.25rem  | --slds-g-font-weight-bold     |
| Body    | --slds-g-font-size-4 | 0.875rem | --slds-g-font-weight-regular  |
| Label   | --slds-g-font-size-3 | 0.75rem  | --slds-g-font-weight-semibold |
| Caption | --slds-g-font-size-2 | 0.625rem | --slds-g-font-weight-regular  |

## Spacing Rhythm

Base unit: --slds-g-spacing-4 (16px)
| Scale | Hook | Value |
|---|---|---|
| XS | --slds-g-spacing-1 | 4px |
| SM | --slds-g-spacing-2 | 8px |
| MD | --slds-g-spacing-4 | 16px |
| LG | --slds-g-spacing-6 | 24px |
| XL | --slds-g-spacing-8 | 32px |

## Border Radius

| Context    | Hook                     | Fallback |
| ---------- | ------------------------ | -------- |
| Card       | --slds-g-radius-border-2 | 0.25rem  |
| Button     | --slds-g-radius-border-2 | 0.25rem  |
| Badge/Pill | --slds-g-radius-border-4 | 1rem     |
| Modal      | --slds-g-radius-border-3 | 0.5rem   |

## Motion Stance

[none / subtle / expressive]
Allowed contexts: [list when animation is permitted]
Duration: --slds-g-duration-quickly (100ms) for micro, --slds-g-duration-slowly (300ms) for transitions

## Signature Element

[Description of the one recurring design detail across all components]

## Tech Debt (found during scan)

[List of hardcoded values found in existing components]
```

---

## Phase 1b — EVOLVE

**Trigger:** `/shaiden evolve`

**Goal:** Update one or more sections of an existing `design.md` when the brand changes, without
discarding history or forcing a full re-init.

### Step 1 — Load & Scope

Read the current `design.md`. Ask which section(s) are changing (color palette, typography,
spacing, radius, motion, signature element) — present as a choice, not open text.

### Step 2 — Discuss the Change

Run only the relevant slice of the [Brand Discovery Discussion](#step-2--brand-discovery-discussion)
for the section(s) being changed — don't re-ask about sections that aren't changing.

### Step 3 — Update design.md

Apply the change. Update `Last updated: [date] via /shaiden evolve` at the top of the file. Leave
every other section untouched.

### Step 4 — Flag Stale Components

Any component in `product.md` scored while the old token value was in effect is now potentially
inconsistent with the new one. Mark every row that used the changed token category with `*` (the
same staleness convention AMEND uses) and tell the user:

> "design.md updated — [N] components may now be inconsistent with the new [token category]. Run
> `/shaiden critique` on them when convenient."

Don't auto-run critique on every affected component — that re-scoring decision belongs to the
user, not this command.

---

## Phase 2 — CRAFT

**Trigger:** `/shaiden craft`

**Goal:** Build a new LWC component grounded in `design.md`.

### Step 1 — Gather

If not provided, ask:

1. Component name (camelCase)
2. Purpose — what does it do, who uses it
3. Context — Record Page / App Page / Home Page / standalone / Experience Cloud

### Step 2 — Read design.md

Load the project's design system before proposing anything.

### Step 3 — DESIGN BRIEF

Present a design brief for user approval before writing any code:

```
## DESIGN BRIEF: [ComponentName]

**Purpose:** [one sentence]
**Context:** [where it lives]

**Palette selection:**
- Background: [hook + fallback]
- Primary text: [hook + fallback]
- Accent: [hook + fallback]
- Border: [hook + fallback]

**Type roles:**
- Heading: [hook]
- Body: [hook]
- Label: [hook]

**Layout concept:**
[2–3 sentence description of the layout + ASCII wireframe]

**Signature element:**
[The one thing that makes this component memorable and consistent
with the design system's signature direction]

**Motion:**
[none / what and when]

**Responsive behavior:**
[How it adapts at narrow widths — Salesforce mobile app, narrow Lightning panes, split-view
record pages. No fixed pixel widths that break layout below a card's minimum comfortable size.]

**States to handle:**
- Loading: [approach]
- Empty: [copy]
- Error: [copy]
```

Wait for user approval. If user requests changes, revise the brief before proceeding.

### Step 4 — BUILD

**Scaffold first, via SF CLI — never hand-assemble the file set.** Before writing any content,
generate the component skeleton with:

```bash
sf lightning generate component --name <componentName> --type lwc --output-dir force-app/main/default/lwc
```

This is the same rule `sf-dev` enforces under its "File Creation — Always via SF CLI" section —
the CLI is what guarantees `.js-meta.xml` exists and is well-formed, which is the #1 cause of a
component failing to deploy or staying invisible in the org. Shaiden then edits the generated
files in place; it never deletes or recreates them by hand. If the SF CLI isn't available in the
environment, fall back to hand-creating the full file set and explicitly verify `.js-meta.xml`
exists before considering the component built.

After scaffolding, generate the component content:

**Non-negotiables:**

- Every color via `var(--slds-g-*, fallback)`
- Every spacing via `var(--slds-g-spacing-*, fallback)`
- Every font size via `var(--slds-g-font-size-*, fallback)`
- No hardcoded hex, rem, px, or em
- No `.slds-*` class overrides
- Custom classes use component-name prefix (e.g., `.opportunity-card__header`)
- BEM naming for custom classes
- All three states (loading, empty, error) implemented
- `lwc:if` not `if:true` (API v59+)

**File output:** `.html`, `.js`, `.css`, and `.js-meta.xml` — scaffolded via SF CLI above,
wire/imperative logic in `.js` based on context. A Jest test file under `__tests__/` follows
`sf-testing`'s LWC Jest pattern — not this skill's job to write, but flag it as outstanding if the
user wants the component shippable, not just designed.

### Step 5 — Register

After BUILD, automatically add to `product.md`:

```markdown
| opportunityCard | — | No critiques yet | [CRAFT date] |
```

Then tell the user:

> "Component registered. Run `/shaiden critique opportunityCard` to get your first score."

---

## Phase 3 — AMEND

**Trigger:** `/shaiden amend [componentName]`

**Goal:** Add or modify elements in an existing component while preserving design system alignment.

### Step 1 — Clarify

Ask:

1. What needs to be added or changed? (be specific)
2. Is this a UI addition (new step, new field, new section) or a behavioral change?

### Step 2 — Read

Load `design.md` + read the existing component's HTML and CSS.

### Step 3 — AMENDMENT BRIEF

Present what will change and how it aligns with the design system:

```
## AMENDMENT BRIEF: [ComponentName]

**Change requested:** [description]

**Impact on existing design:**
- Additions: [new elements + which hooks they use]
- Modifications: [what changes and why]
- Preserved: [what stays untouched]

**Design system alignment:**
[Confirm the amendment uses tokens from design.md]

**States affected:**
[Any new loading/empty/error states introduced]
```

Wait for approval.

### Step 4 — EXECUTE

Apply the amendment. Do not touch unrelated parts of the component.

### Step 5 — Reset Score

Update `product.md` — mark score as stale (append `*` to score):

```markdown
| opportunityCard | 34\* | critique-001.md (open) | [AMEND date] |
```

Then tell the user:

> "Amendment applied. Score marked stale — run `/shaiden critique opportunityCard` to re-evaluate."

---

## Phase 4 — CRITIQUE

**Trigger:** `/shaiden critique [componentName]`

**Goal:** Audit a component, generate a scored critique file, update product.md.

### Step 1 — Setup

Check if `.critique/[componentName]/` exists:

- If not → create the folder, create `critique-001.md`
- If yes → determine next number (e.g., `critique-002.md`)

Check `.gitignore` — if `.critique/` is not present, append it automatically.

### Step 2 — Analyze

Read the component's HTML, CSS, and JS. Read `design.md`. Evaluate against all 5 scoring aspects.

### Step 3 — Generate critique-NNN.md

Use `references/critique-template.md` as the authoritative structure,
including the Closed Issues and Resolution Log sections used by POLISH:

```markdown
# Critique: [ComponentName]

_/shaiden critique — [date] — [critique-NNN]_

## Score

| Aspect               | Score | Max    |
| -------------------- | ----- | ------ |
| Visual Consistency   | X     | 8      |
| SLDS 2 Compliance    | X     | 8      |
| Typography & Spacing | X     | 8      |
| UX & Accessibility   | X     | 8      |
| Human Touch          | X     | 8      |
| **Total**            | **X** | **40** |

**Band:** [Polished / Good / Needs Work / Rebuild]

## Issues

### [ISSUE-001] · Aspect: SLDS 2 Compliance · Severity: High

**Found:** `background-color: #ffffff` hardcoded in `.card__header`
**Fix:** Replace with `var(--slds-g-color-surface-container-1, #ffffff)`
**Status:** OPEN

### [ISSUE-002] · Aspect: UX & Accessibility · Severity: Medium

**Found:** Empty state shows "No records" — not directive
**Fix:** Replace with "No opportunities found. Create one to get started." + action button
**Status:** OPEN

### [ISSUE-003] · Aspect: Human Touch · Severity: Low

**Found:** No signature element — component feels generic
**Fix:** Add left accent border (4px, brand color) to card header per design.md signature direction
**Status:** OPEN

## Summary

[2–3 sentence overall assessment]
```

### Step 4 — Update product.md

Add or update the component's row with new score, band, and critique file link.

---

## Phase 5 — POLISH

**Trigger:** `/shaiden polish [componentName?] [critique-NNN?]`

**Goal:** Resolve open issues from a critique file.

### Step 1 — Resolve Target

If component not specified → read `product.md`, list components with open critiques, ask user to choose.

If component specified but critique not specified:

- Check how many critique files exist for that component
- If one → use it
- If multiple → recommend oldest (critique-001), list all options, let user choose

If component is new (not in product.md) → tell user to run `/shaiden critique` first.

### Step 2 — Load

Read the target critique file. List all OPEN issues to user.

### Step 3 — EXECUTE

Resolve each issue one by one. For each:

1. Show what change is being made
2. Apply the fix
3. Mark issue as CLOSED in the critique file with resolution note:

```markdown
### [ISSUE-001] · Aspect: SLDS 2 Compliance · Severity: High

**Found:** `background-color: #ffffff` hardcoded
**Fix:** `var(--slds-g-color-surface-container-1, #ffffff)`
**Status:** CLOSED — fixed in `.card__header` CSS
```

### Step 4 — Post-Polish

After all issues resolved:

- If all issues CLOSED → delete the critique file, update `product.md` with new score
- If partial → update `product.md` with current open count, keep file

Tell user final state:

> "3 of 3 issues resolved. Score updated to 38/40 (Polished). critique-001.md removed."

---

## Phase 6 — HARMONIZE

**Trigger:** `/shaiden harmonize`

**Goal:** Align a target component to match the design identity of a source component.

### Step 1 — Establish Source & Target

Ask if not provided:

- **Source** — the component that serves as the design reference
- **Target** — the component that needs to be aligned

Both must exist in the project. Source does not need to be in `product.md` but target will be registered if not already.

### Step 1.5 — Validate the Source First

Before treating the source as the reference, check it against `design.md` (same checks as
CRITIQUE's SLDS 2 Compliance and Visual Consistency aspects — hardcoded values, missing fallbacks,
non-hook spacing/typography). If the source itself has meaningful violations, surface them before
proceeding:

> "Source component [name] has [N] design-system violations of its own (e.g. hardcoded
> `background-color: #fff`). Harmonizing the target to match it will copy these violations too.
> Fix the source first, harmonize anyway, or pick a different source?"

Only proceed to Gap Analysis once the user confirms which path to take.

### Step 2 — Gap Analysis

Read both components' HTML and CSS. Read `design.md`. Produce a gap report:

```
## HARMONIZE GAP REPORT: [Target] → [Source]

**Spacing gaps:**
- Target uses margin: 12px, Source uses --slds-g-spacing-3

**Color gaps:**
- Target uses #0176d3 hardcoded, Source uses --slds-g-color-brand-base-50

**Typography gaps:**
- Target heading: font-size: 1rem, Source: --slds-g-font-size-5

**Structure gaps:**
- Source has signature left accent border, Target does not

**Total gaps found:** [N]
```

Present to user. Confirm before proceeding.

### Step 3 — ALIGN

Apply changes to target component only. Do not modify source. Preserve target's functional logic and unique content — only align visual tokens and structure.

### Step 4 — Register & Recommend

If target was not in `product.md` → add it without score.
Tell user:

> "Target aligned to source. Run `/shaiden critique [target]` to score the result."

---

## SLDS 2 Token Quick Reference

Always use `var(hook, fallback)` syntax. Never omit the fallback.

### Color — Global Hooks

```css
/* Surfaces */
var(--slds-g-color-surface-container-1, #ffffff)   /* card bg */
var(--slds-g-color-surface-container-2, #f3f3f3)   /* page bg */
var(--slds-g-color-surface-container-3, #e5e5e5)   /* subtle bg */

/* Brand */
var(--slds-g-color-brand-base-50, #0176d3)         /* primary */
var(--slds-g-color-brand-base-10, #032d60)         /* dark brand */
var(--slds-g-color-brand-base-95, #e8f4ff)         /* light brand tint */

/* Text */
var(--slds-g-color-on-surface-1, #181818)          /* primary text */
var(--slds-g-color-on-surface-2, #444444)          /* secondary text */
var(--slds-g-color-on-surface-3, #747474)          /* placeholder/caption */

/* Borders */
var(--slds-g-color-border-1, #e5e5e5)              /* default border */
var(--slds-g-color-border-2, #c9c9c9)              /* stronger border */

/* Semantic */
var(--slds-g-color-error-1, #ba0517)               /* error */
var(--slds-g-color-success-1, #2e844a)             /* success */
var(--slds-g-color-warning-1, #dd7a01)             /* warning */
```

### Spacing

```css
var(--slds-g-spacing-1, 0.25rem)   /* 4px */
var(--slds-g-spacing-2, 0.5rem)    /* 8px */
var(--slds-g-spacing-3, 0.75rem)   /* 12px */
var(--slds-g-spacing-4, 1rem)      /* 16px — base unit */
var(--slds-g-spacing-5, 1.25rem)   /* 20px */
var(--slds-g-spacing-6, 1.5rem)    /* 24px */
var(--slds-g-spacing-8, 2rem)      /* 32px */
var(--slds-g-spacing-10, 2.5rem)   /* 40px */
```

### Typography

```css
/* Size */
var(--slds-g-font-size-2, 0.625rem)   /* caption */
var(--slds-g-font-size-3, 0.75rem)    /* label */
var(--slds-g-font-size-4, 0.875rem)   /* body */
var(--slds-g-font-size-5, 1rem)       /* body large */
var(--slds-g-font-size-6, 1.125rem)   /* heading sm */
var(--slds-g-font-size-7, 1.25rem)    /* heading */
var(--slds-g-font-size-8, 1.5rem)     /* heading lg */
var(--slds-g-font-size-9, 1.875rem)   /* display */

/* Weight */
var(--slds-g-font-weight-regular, 400)
var(--slds-g-font-weight-semibold, 600)
var(--slds-g-font-weight-bold, 700)
```

### Border Radius

```css
var(--slds-g-radius-border-1, 0.125rem)   /* 2px — sharp */
var(--slds-g-radius-border-2, 0.25rem)    /* 4px — subtle */
var(--slds-g-radius-border-3, 0.5rem)     /* 8px — rounded */
var(--slds-g-radius-border-4, 1rem)       /* 16px — pill */
```

### Shadow

```css
var(--slds-g-shadow-1, 0 1px 2px rgba(0,0,0,0.1))    /* card resting */
var(--slds-g-shadow-2, 0 2px 4px rgba(0,0,0,0.15))   /* card hover */
var(--slds-g-shadow-4, 0 4px 8px rgba(0,0,0,0.2))    /* modal */
```

### Duration (Motion)

```css
var(--slds-g-duration-quickly, 0.1s)    /* micro-interactions */
var(--slds-g-duration-slowly, 0.3s)     /* transitions */
```

---

## Anti-Patterns — Never Do These

```css
/* ✕ Hardcoded values */
background-color: #ffffff;
padding: 16px;
font-size: 0.875rem;

/* ✕ Override SLDS classes */
.slds-card { padding: 0; }
.slds-button { background: red; }

/* ✕ Private hooks */
var(--_slds-something)
var(--slds-s-something)

/* ✕ Missing fallback */
var(--slds-g-color-brand-base-50)   /* no fallback = broken outside Cosmos */

/* ✕ !important unless absolutely necessary and documented */
color: red !important;
```

```html
<!-- ✕ Old directive syntax -->
<template if:true="{isLoading}">
	<!-- ✓ Modern syntax (API v59+) -->
	<template lwc:if="{isLoading}"></template
></template>
```

---

## product.md Schema

Use `references/product-template.md` as the authoritative structure — it also
includes the Score Legend and Open Critique Index sections used by POLISH:

```markdown
# product.md — [Project Name] Component Registry

_Managed by /shaiden_

## Components

| Component       | Score | Band         | Open Critiques  | Last Action         |
| --------------- | ----- | ------------ | --------------- | ------------------- |
| opportunityCard | 38/40 | ✦ Polished   | —               | POLISH 2026-07-10   |
| accountHeader   | 24/40 | ◇ Needs Work | critique-001.md | CRITIQUE 2026-07-10 |
| contactTimeline | —     | —            | —               | CRAFT 2026-07-10    |

## Legend

- Score with `*` = stale (component amended since last critique)
- `—` score = not yet critiqued
- Open Critiques = filename(s) with at least one OPEN issue
```

---

## Design Principles Shaiden Enforces

**1. One signature, everything else quiet.**
Each component has one memorable element. Everything around it is disciplined and restrained. Decoration that doesn't serve the brief gets cut.

**2. Typography is personality.**
Font size, weight, and spacing are not defaults — they are deliberate choices from the type scale in `design.md`. If two text elements look the same, one of them is wrong.

**3. States are not afterthoughts.**
Loading, empty, and error states are designed with the same care as the default state. Empty states direct action. Error states explain and guide. Loading states confirm the system is working.

**4. Copy is a design material.**
Labels, empty states, and error messages are written in active voice, sentence case, and functional language. "No records found" is not a design. "No opportunities yet — create one to start tracking." is a design.

**5. SLDS hooks are the grammar.**
Global styling hooks are not optional syntax — they are how the component speaks the same language as the platform. A component that hardcodes values is a component that will break when the theme changes.

**6. Every decision can be justified.**
If a spacing, color, or type choice cannot be traced back to `design.md` or a deliberate rationale, it should not exist in the component.
