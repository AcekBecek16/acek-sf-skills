<div align="center">

# acek-skills

**Installable [Claude Code](https://claude.com/claude-code) skills for Salesforce work.**
Admin • Development • Testing • DevOps • Security Review • Data Migration • Business Analysis • Ideation • Architecture

[![npm version](https://img.shields.io/npm/v/acek-skills.svg)](https://www.npmjs.com/package/acek-skills)
[![license](https://img.shields.io/npm/l/acek-skills.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/acek-skills.svg)](https://nodejs.org)

</div>

---

## Contents

- [acek-skills](#acek-skills)
  - [Contents](#contents)
  - [Why this exists](#why-this-exists)
  - [Quick start](#quick-start)
  - [How the wizard works](#how-the-wizard-works)
  - [Non-interactive install](#non-interactive-install)
  - [Org alias templating](#org-alias-templating)
  - [Install targets](#install-targets)
  - [Skills reference](#skills-reference)
  - [CLI reference](#cli-reference)
  - [Project structure](#project-structure)
  - [Adding a new skill](#adding-a-new-skill)
  - [FAQ](#faq)
  - [License](#license)

---

## Why this exists

Every Salesforce engagement re-derives the same rules — governor limits, CRUD/FLS checks, deploy
checklists, test coverage thresholds — usually from memory, tribal knowledge, or a wiki page
nobody opens. **acek-skills** packages that knowledge as installable [Claude Code
skills](https://docs.claude.com/en/docs/claude-code/skills): Markdown files with trigger
conditions that Claude reads automatically and applies only when the task actually calls for them.

One package, nine roles, install only what you need, into whichever tool you actually use.

## Quick start

```bash
npx acek-skills install
```

That's it — no global install, no cloning. `npx` fetches the package, runs the wizard, and exits.

## How the wizard works

Running `install` with no arguments walks you through three prompts:

```
? Select the skills to install
  - Space to select, Enter to confirm, a to toggle all
  ◉ sf-admin
  ◉ sf-architect
  ◉ sf-ba
  ◉ sf-data-migration
  ◉ sf-dev
  ◉ sf-devops
  ◉ sf-ideation
  ◉ sf-security-review
  ◉ sf-testing

? Select the target IDE(s) / tool(s)
  ◉ Claude Code — project (./.claude/skills)
  ◯ Claude Code — global (~/.claude/skills)
  ◯ Cursor (./.cursor/rules)
  ◯ Windsurf (./.windsurf/rules)
  ◯ GitHub Copilot (./.github/instructions)

? Production org alias (e.g. Acme_Production) — leave blank to fill in later
? Sandbox / dev org alias (e.g. Acme_Dev) — leave blank to fill in later
```

1. **Skills** — all selected by default; deselect anything you don't need.
2. **Targets** — pick one or more. Each selected skill is installed to _every_ selected target,
   converted into that tool's native rule format.
3. **Org aliases** — only asked if one of the selected skills references them (currently
   `sf-devops` and `sf-data-migration`). Leave blank to fill in later by hand.
4. **Commands** — if `sf-architect` is selected and at least one Claude Code target is chosen, its
   companion `/sf-init` slash command installs automatically to `.claude/commands/` — no separate
   prompt. Not installed for Cursor/Windsurf/Copilot targets, which have no slash-command concept.

## Non-interactive install

For scripting, CI, or dotfile setups:

```bash
# Install everything to Claude Code (project-level), no prompts
npx acek-skills install --all

# Install a single skill
npx acek-skills install sf-devops

# List available skills
npx acek-skills list
```

Non-interactive installs always target Claude Code (project-level). For other tools, use the
interactive wizard.

## Org alias templating

`sf-devops` and `sf-data-migration` reference your org setup (production alias, sandbox/dev
alias) instead of hardcoding one. Internally these are placeholders —
`{{PROD_ORG_ALIAS}}` / `{{DEV_ORG_ALIAS}}` — resolved at install time so the package never ships
with a real client or org name baked in.

| How you install                    | What fills the placeholder                                              |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Interactive wizard                 | Whatever you type at the alias prompts                                  |
| `install --all` / `install <name>` | `ACEK_PROD_ORG_ALIAS` / `ACEK_DEV_ORG_ALIAS` env vars, if set           |
| Left blank / not set               | Literal `<PROD_ORG_ALIAS>` / `<DEV_ORG_ALIAS>` — find-and-replace later |

```bash
ACEK_PROD_ORG_ALIAS=Acme_Production ACEK_DEV_ORG_ALIAS=Acme_Dev npx acek-skills install --all
```

The CLI prints a reminder after install if any placeholder was left unresolved.

## Install targets

| Target                    | Destination                                      | Trigger behavior                                                                                             |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Claude Code** (project) | `./.claude/skills/<skill>/SKILL.md`              | Auto-triggered — Claude reads the `description` frontmatter and invokes the skill only when the task matches |
| **Claude Code** (global)  | `~/.claude/skills/<skill>/SKILL.md`              | Same as above, applies across every project on your machine                                                  |
| **Cursor**                | `./.cursor/rules/<skill>.mdc`                    | Project rule (`alwaysApply: false`) — Cursor decides relevance from the `description` field                  |
| **Windsurf**              | `./.windsurf/rules/<skill>.md`                   | Cascade rule (`trigger: model_decision`) — same idea, Windsurf's own matching                                |
| **GitHub Copilot**        | `./.github/instructions/<skill>.instructions.md` | Custom instructions (`applyTo: "**"`) — applied repo-wide, no per-task trigger                               |

Only Claude Code has a purpose-built skill system with dynamic, description-based triggering.
Cursor and Windsurf approximate it with their own rule-matching; Copilot's custom instructions
apply more broadly since it has no equivalent trigger mechanism. Check each tool's docs if the
matching behavior matters for your workflow.

## Skills reference

<details>
<summary><strong>sf-architect</strong> — technical architecture & plan mode</summary>

Salesforce's plan mode. Gates all work behind an approved Architecture Plan before any code or
metadata is touched: runs Discovery (project scan + choice-based clarifying questions, never open
text), proposes Decisions with trade-offs for data model / automation layer / integration pattern
/ security model / Permission Set strategy, then breaks approved work into tasks dispatched to the
right skill (`sf-admin`, `sf-dev`, `sf-testing`, `sf-devops`, `sf-security-review`,
`sf-data-migration`). Plans are saved to `instructions/architecture/` and are resumable across
sessions without re-scanning the project or re-reading chat history. Complements — does not
replace — `sf-ba` (PRDs) and `sf-ideation` (open-ended brainstorming), and can consume either as
input.

Comes with a companion **`/sf-init`** slash command (installed automatically alongside it, Claude
Code targets only) that bootstraps `architecture.md` at the project root — a baseline of org
aliases, tech stack, data model, integrations, and Permission Set inventory that `sf-architect`
reads on every plan instead of re-scanning the whole project each time. Re-running `/sf-init`
refreshes the baseline with a diff-and-confirm flow.

</details>

<details>
<summary><strong>sf-admin</strong> — declarative configuration</summary>

Custom objects/fields, picklists, page layouts, record types, profiles, permission sets, roles,
sharing rules, validation rules, workflow rules, flows (Screen/Record-Triggered/Schedule),
approval processes, reports, dashboards, email templates, org setup, security model (OWD), and
data management (import/export/data loader) — anything declarative, no code involved.

</details>

<details>
<summary><strong>sf-ba</strong> — business analysis documentation</summary>

Writes PRDs, user stories, feature specs, and functional requirements — structured Markdown docs
intended to hand off to an admin or developer. Triggers on "write a PRD", "document requirements",
"write user stories", or when a business problem needs to become executable documentation.

</details>

<details>
<summary><strong>sf-data-migration</strong> — bulk data operations</summary>

Import/export strategy, Data Loader automation, upsert with External IDs, bulk SOQL exports, data
cleansing, bulk delete/mass update, and error handling for large-volume loads between orgs or from
external systems.

</details>

<details>
<summary><strong>sf-dev</strong> — custom development</summary>

Apex classes, triggers, batch jobs, test classes, SOQL, LWC (HTML/JS/CSS), Aura components, and
integration patterns. Covers governor limits, CRUD/FLS patterns (including the API 67.0+
user-mode-by-default security model), `@AuraEnabled` conventions, and REST/SOAP callout patterns.

> **LWC styling:** uses SLDS 2 global hooks directly (`var(--slds-g-*, fallback)`) as the
> baseline/standard approach — no custom brand token block. For a full design-system workflow
> (token system, typography scale, signature elements, cross-component consistency scoring), use
> [`shaiden`](https://www.npmjs.com/package/shaiden) instead. Both use the same SLDS 2 hook
> vocabulary, so they no longer conflict — `shaiden` is just more thorough.

</details>

<details>
<summary><strong>sf-devops</strong> — deployment & release process</summary>

Code review checklists, scoped `package.xml` manifests, dry-run validation, Change Requests,
deploy documentation, and the full sandbox-to-production pipeline via SF CLI. References your
production/sandbox [org aliases](#org-alias-templating).

</details>

<details>
<summary><strong>sf-ideation</strong> — anchored enhancement brainstorming</summary>

Generates enhancement ideas for one specific, named Apex class, LWC component, or closed/approved
PRD — never in the abstract. Requires an anchor before doing anything: if the user doesn't name a
file, it scans the project and asks the user to pick from what actually exists (never invents
component names). Also used proactively when reviewing a specific component to spot improvement
opportunities.

</details>

<details>
<summary><strong>sf-security-review</strong> — security audits</summary>

CRUD/FLS checks, sharing model review, `with sharing` enforcement, SOQL injection, XSS in LWC,
hardcoded credential detection, and a production sign-off checklist. Also covers Shield,
encryption, audit trail, and a dedicated PII & Data Privacy section — field classification,
sandbox data masking, and UU PDP-aware review practices.

</details>

<details>
<summary><strong>sf-testing</strong> — Apex test strategy</summary>

Test classes, `TestDataFactory` patterns, mocking HTTP callouts and platform events, test
assertions, coverage reports, and debugging org-only test failures. Enforces the 85% coverage
floor and `AuraHandledException` assertion conventions.

</details>

Each skill's full content — including code patterns, checklists, and exact trigger keywords —
lives in its `SKILL.md`.

## CLI reference

```
acek-skills install              Interactive: pick skills, target IDE(s)/tool(s), and org aliases
acek-skills install --all        Install all skills to Claude Code (project), no prompts
acek-skills install <name>       Install a single skill to Claude Code (project), no prompts
acek-skills list                 List available skills and commands
```

Installing `sf-architect` also installs its companion **`/sf-init`** slash command — Claude Code
targets only (`.claude/commands/`), since Cursor/Windsurf/Copilot have no slash-command
equivalent. Run `/sf-init` once per project after installing to bootstrap `architecture.md`;
`sf-architect` reads it on every plan afterward instead of re-scanning the whole project each
time. Re-running `/sf-init` later refreshes the baseline with a diff-and-confirm flow rather than
silently overwriting it.

## Project structure

```
skills/
  sf-admin/SKILL.md
  sf-architect/SKILL.md
  sf-ba/SKILL.md
  sf-data-migration/SKILL.md
  sf-dev/SKILL.md
  sf-devops/SKILL.md
  sf-ideation/SKILL.md
  sf-security-review/SKILL.md
  sf-testing/SKILL.md
commands/
  sf-init.md         /sf-init slash command — companion to sf-architect, Claude Code only
bin/
  cli.js            install wizard / CLI entry point (acek-skills)
```

## Adding a new skill

1. Create `skills/<name>/SKILL.md` with YAML frontmatter:

   ```markdown
   ---
   name: <name>
   description: >
     What this skill covers and the exact phrases/keywords that should trigger it.
   ---

   # Skill content — rules, checklists, code patterns
   ```

2. No CLI changes needed — `list` and `install` pick up any folder under `skills/` automatically.
3. If the skill needs org-specific values, use the `{{PROD_ORG_ALIAS}}` / `{{DEV_ORG_ALIAS}}`
   placeholders (see [Org alias templating](#org-alias-templating)) rather than hardcoding one.

## FAQ

**Does this modify my Salesforce org?**
No. Every skill is a Markdown instruction file — it shapes how Claude (or Cursor/Windsurf/Copilot)
responds, and doesn't touch any org, sandbox, or production data on its own.

**Can I install only some skills?**
Yes — deselect any skill in the interactive wizard, or use `install <name>` for a single one.

**Can I re-run install to update after a new version is published?**
Yes, `npx` always resolves the latest version unless you pin one (`npx acek-skills@1.2.0 install`).
Re-running overwrites previously installed files for the skills/targets you select.

**Why do only Claude Code skills auto-trigger?**
Claude Code has a native skill system that matches tasks against each skill's `description`
frontmatter. Cursor, Windsurf, and Copilot don't expose the same mechanism, so their versions are
converted to each tool's closest equivalent (project rules / custom instructions) — see
[Install targets](#install-targets).

## License

MIT
