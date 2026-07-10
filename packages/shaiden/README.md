<div align="center">

# shaiden

**紫電 · Purple Lightning.**
An installable [Claude Code](https://claude.com/claude-code) skill for LWC Design Precision — SLDS 2 tokens, a craft/critique/polish workflow, and component-level design system consistency.

[![npm version](https://img.shields.io/npm/v/%40nullbotdotexe%2Fshaiden.svg)](https://www.npmjs.com/package/@nullbotdotexe/shaiden)
[![license](https://img.shields.io/npm/l/%40nullbotdotexe%2Fshaiden.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/%40nullbotdotexe%2Fshaiden.svg)](https://nodejs.org)

</div>

---

## Contents

- [What shaiden is](#what-shaiden-is)
- [Quick start](#quick-start)
- [Command reference](#command-reference)
- [Scoring system](#scoring-system)
- [Artifacts it manages](#artifacts-it-manages)
- [Install targets](#install-targets)
- [Relationship to acek-skills](#relationship-to-acek-skills)
- [FAQ](#faq)
- [License](#license)

## What shaiden is

Most Claude Code skills are static reference material — rules Claude reads and applies.
**Shaiden is a design *craft* skill**: a stateful, multi-phase workflow for building, auditing,
and polishing Lightning Web Components with a deliberate visual identity. It doesn't just
suggest a fix — it runs a discovery discussion, produces a scored critique, and tracks every
component's design maturity over time in a registry it maintains itself.

Every component gets a **1–40 score** across five aspects (visual consistency, SLDS 2
compliance, typography/spacing precision, UX/accessibility, and human touch), backed by
`--slds-g-*` global styling hooks — never hardcoded values, never private hooks.

> The npm package is scoped — `@nullbotdotexe/shaiden` — because npm's registry blocks
> unscoped names it considers too similar to an existing popular package (in this case,
> `shadcn`). The skill itself, its commands, and its files all use its real, unscoped name:
> **shaiden**.

## Quick start

```bash
npx @nullbotdotexe/shaiden install
```

Pick which IDE(s)/tool(s) to install into — no skill picker needed, there's only one skill in
this package.

```bash
# Install to Claude Code (project-level), no prompts
npx @nullbotdotexe/shaiden install --all
```

## Command reference

Shaiden is driven by six phases, each triggered by natural language or the literal command
phrase (there's no real `/shaiden` slash command registered — Claude matches these phrases via
the skill's trigger description):

| Command | Purpose |
|---|---|
| `/shaiden init` | Scan existing components (if any) and establish the project's design identity → generates `design.md` |
| `/shaiden craft` | Build a new component from a design brief, grounded in `design.md` |
| `/shaiden amend` | Add or modify elements in an existing component, preserving design alignment |
| `/shaiden critique` | Audit a component against the scoring system, generate a critique file |
| `/shaiden polish` | Resolve open issues from a critique, one at a time |
| `/shaiden harmonize` | Align a target component's design to match a source component |

Every phase presents a brief (design brief, amendment brief, gap report) for your approval
**before** writing any code.

<details>
<summary><strong>/shaiden init</strong> — establish the design system</summary>

Run once per project, before any component work. If existing LWC components are present, Shaiden
scans every `*.css` file first, extracts `--slds-g-*` hooks already in use, flags hardcoded values
as tech debt, and summarizes the implicit design language it found — so the discussion below
starts from what's real, not a blank slate.

Then it runs an interactive discovery discussion covering brand personality, primary color,
surface hierarchy, corner radius, typography stance, motion stance, spacing unit, and a
"signature direction" (one recurring visual detail every component will share). The output is
`design.md` at the project root — the single source of truth every other phase reads from.
</details>

<details>
<summary><strong>/shaiden craft</strong> — build a new component</summary>

Asks for the component name, purpose, and context (Record Page / App Page / Home Page /
standalone / Experience Cloud) if not given, reads `design.md`, then presents a **design brief**
(palette selection, type roles, an ASCII wireframe, the signature element, motion, and the
loading/empty/error states) for approval before writing anything. Once approved, it generates
HTML/CSS/JS with every value traced to an SLDS 2 hook (never hardcoded), then registers the
component in `product.md` with no score yet — you run `critique` next to get one.
</details>

<details>
<summary><strong>/shaiden amend</strong> — modify an existing component</summary>

For adding or changing elements in a component that's already built. Clarifies what's changing
and whether it's a UI addition or a behavioral change, reads `design.md` plus the component's
current HTML/CSS, then presents an **amendment brief** (additions, modifications, what's
preserved, design-system alignment) before touching anything. Unrelated parts of the component
are left untouched. Afterward, the component's score in `product.md` is marked stale (`34*`)
until you re-run `critique`.
</details>

<details>
<summary><strong>/shaiden critique</strong> — score a component</summary>

Reads the component's HTML/CSS/JS against `design.md` and scores it across all 5 aspects (see
[Scoring system](#scoring-system)), writing a numbered `critique-NNN.md` file under
`.critique/<component>/` — each issue gets a severity (High/Medium/Low), what was found, why it
matters, and the exact fix. `product.md` is updated with the new score, band, and a link to the
critique file. Re-running `critique` on the same component creates a new numbered file rather
than overwriting the last one.
</details>

<details>
<summary><strong>/shaiden polish</strong> — resolve an open critique</summary>

If no component is specified, lists everything in `product.md` with open critiques and asks you
to choose. Loads the target critique file, resolves each OPEN issue one at a time (shows the
change, applies it, marks it CLOSED with a resolution note), then — once every issue in the file
is closed — deletes the critique file and updates the score in `product.md`. Partial resolution
just updates the open-issue count and keeps the file.
</details>

<details>
<summary><strong>/shaiden harmonize</strong> — align one component to another</summary>

Takes a source component (the design reference) and a target component (the one that needs to
match), reads both plus `design.md`, and produces a **gap report**: spacing, color, typography,
and structural differences between them. After your confirmation, it applies changes to the
target only — the source is never touched, and the target's functional logic and content are
preserved, only its visual tokens and structure are aligned. Useful for bringing an older
component up to the current design system without a full rebuild.
</details>

## Scoring system

Five aspects, 8 points each, 40 total:

| Aspect | What it checks |
|---|---|
| Visual Consistency | Alignment with `design.md` tokens — spacing rhythm, radius, palette |
| SLDS 2 Compliance | `--slds-g-*` hooks only, always with a fallback, no private hooks, no `.slds-*` overrides |
| Typography & Spacing Precision | Intentional type scale, no magic numbers |
| UX & Accessibility | Loading/empty/error states present and directive, `aria-label`s, no color-only signaling |
| Human Touch & Distinctiveness | Doesn't feel templated; has one deliberate signature element |

| Score | Band | Recommendation |
|---|---|---|
| 35–40 | ✦ Polished | Ship it |
| 28–34 | ◈ Good | Minor polish needed |
| 20–27 | ◇ Needs Work | Run `/shaiden polish` before shipping |
| 0–19 | ✕ Rebuild | Consider `/shaiden craft` from scratch |

## Artifacts it manages

Shaiden maintains three files **in the project it's working on** (not in this package):

```
project-root/
├── design.md       ← Brand tokens & design decisions (from INIT)
├── product.md       ← Component registry: scores, bands, critique links
└── .critique/
    └── <component>/critique-NNN.md   ← auto-gitignored working scratchpad
```

The skill itself ships three authoritative templates for these artifacts under
`skills/shaiden/references/` (`design-template.md`, `product-template.md`,
`critique-template.md`) — `SKILL.md` points Claude to them at each generation step, so the
inline examples in the phase descriptions stay short while the full structure (Shadow System,
Component Naming Convention, Resolution Log, etc.) lives in the reference files.

## Install targets

| Target | Destination | Notes |
|---|---|---|
| **Claude Code** (project) | `./.claude/skills/shaiden/` | Full skill, including `references/` — the only target with real multi-phase, stateful triggering |
| **Claude Code** (global) | `~/.claude/skills/shaiden/` | Same, applies across every project |
| **Cursor** | `./.cursor/rules/shaiden.mdc` + `./.cursor/rules/shaiden/references/` | Converted to a project rule; Cursor decides relevance itself |
| **Windsurf** | `./.windsurf/rules/shaiden.md` + `./.windsurf/rules/shaiden/references/` | Converted to a Cascade rule |
| **GitHub Copilot** | `./.github/instructions/shaiden.instructions.md` + `./.github/instructions/shaiden/references/` | Applied repo-wide, no per-task trigger |

Only Claude Code has a native concept of a multi-phase skill with commands and persistent
state — the other targets get the same content translated to a static rule file, with
`references/` mirrored alongside it so nothing is lost, but without the phase-triggering
behavior (`/shaiden critique` etc. work as prompts, not as anything the tool recognizes
natively).

## Relationship to acek-skills

Shaiden used to live inside [`acek-skills`](https://www.npmjs.com/package/acek-skills) (the
Salesforce role-skill package from the same repo) and was split out on purpose: `acek-skills`'
`sf-dev`/`sf-devops`/`sf-ideation` skills mandate a **different, incompatible** LWC styling
convention — a custom `:host` brand-token block (`--brand`, `--r-sm`, etc.) plus a mandatory
version badge — whereas shaiden is built entirely around native SLDS 2 global hooks and doesn't
use either. Installing both against the same LWC task would hand Claude contradictory
instructions. Keeping them as separate installs means you opt into shaiden's design system
deliberately, instead of it silently colliding with `sf-dev`.

If your project already follows the `acek-skills` brand-token convention, don't install shaiden
without reconciling the two first — either drop the `:host` token block requirement from your
own copy of `sf-dev`, or adapt shaiden's `design.md` to layer on top of it instead of replacing
it.

## FAQ

**Why isn't `/shaiden craft` a real slash command?**
Claude Code skills trigger from natural language matching the `description` frontmatter, not
from registered slash commands. Typing `/shaiden craft` works because it's listed as a trigger
phrase, not because it's wired up as a command — same effect, different mechanism.

**Does shaiden touch my Salesforce org?**
No. It only reads/writes LWC component files and its own Markdown artifacts in your repo.

**Can I use shaiden on an existing set of components?**
Yes — `/shaiden init` starts with a scan step that extracts existing `--slds-g-*` usage and
flags hardcoded values as tech debt before the brand discovery discussion.

## License

MIT
