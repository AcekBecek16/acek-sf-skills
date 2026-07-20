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
  - [Sub-agents](#sub-agents)
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
  ◉ commatozze
  ◉ ashley-fires
  ◉ isla-summer
  ◉ britney-amber
  ◉ channel-preston
  ◉ eva-lovia
  ◉ asa-akira
  ◉ madison-ivy
  ◉ riley-reid

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
   `eva-lovia` and `britney-amber`). Leave blank to fill in later by hand.
4. **Sub-agents** — any selected skill that has a matching sub-agent (same technical id, e.g.
   `channel-preston`) installs it automatically to `.claude/agents/` on Claude Code targets — no separate
   prompt. See [Sub-agents](#sub-agents). Not installed for Cursor/Windsurf/Copilot targets, which
   have no subagent concept.
5. **Commands** — if `ashley-fires` is selected and at least one Claude Code target is chosen, its
   companion `/sf-init` slash command installs automatically to `.claude/commands/` — no separate
   prompt. Not installed for Cursor/Windsurf/Copilot targets, which have no slash-command concept.

## Non-interactive install

For scripting, CI, or dotfile setups:

```bash
# Install everything to Claude Code (project-level), no prompts
npx acek-skills install --all

# Install a single skill
npx acek-skills install eva-lovia

# List available skills
npx acek-skills list
```

Non-interactive installs always target Claude Code (project-level). For other tools, use the
interactive wizard.

## Org alias templating

`eva-lovia` and `britney-amber` reference your org setup (production alias, sandbox/dev
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

## Sub-agents

`ashley-fires` acts as Salesforce's plan-mode orchestrator: once a plan is approved, it dispatches
each task to the owner skill's own sub-agent (Claude Code's native `Agent` tool, `subagent_type:
<owner skill's technical id>`) instead of following that skill's conventions itself. Every owner skill has a
matching sub-agent under `agents/`, same technical id as its skill folder, each with a **fixed**
narrated persona:

| Owner skill (`subagent_type`) | Persona         |
| ------------------------------ | --------------- |
| `commatozze`                    | Commatozze      |
| `channel-preston`                | Channel Preston |
| `riley-reid`                    | Riley Reid      |
| `eva-lovia`                     | Eva Lovia       |
| `madison-ivy`                   | Madison Ivy     |
| `britney-amber`                 | Britney Amber   |
| `isla-summer`                   | Isla Summer     |
| `asa-akira`                     | Asa Akira       |

`ashley-fires` itself narrates as **Ashley Fires** and is never dispatched as a sub-agent of
itself — it only ever assigns work out. Personas are narration only (a response signature line);
they never appear inside generated file content (PRDs, code, commit messages) except as a tracking
label in the Architecture Plan's Execution Log.

Installing a skill that has a matching sub-agent installs both automatically, to
`.claude/agents/<name>.md` — Claude Code targets only, since Cursor/Windsurf/Copilot have no
subagent equivalent (same rule as `/sf-init`, see [Install targets](#install-targets)). A skill's
sub-agent works standalone too — dispatch it directly with the `Agent` tool — but it's designed to
be driven by `ashley-fires`'s plan-mode flow.

## Skills reference

<details>
<summary><strong>ashley-fires</strong> — technical architecture & plan mode</summary>

Salesforce's plan mode. Gates all work behind an approved Architecture Plan before any code or
metadata is touched: runs Discovery (project scan + choice-based clarifying questions, never open
text), proposes Decisions with trade-offs for data model / automation layer / integration pattern
/ security model / Permission Set strategy, then breaks approved work into tasks dispatched to the
right owner skill's **sub-agent** (`commatozze`, `channel-preston`, `riley-reid`, `eva-lovia`,
`madison-ivy`, `britney-amber` — see [Sub-agents](#sub-agents)) — always including a
`madison-ivy` task when the plan touches a PII-bearing object/field, an integration, or a
sharing/OWD change. Plans are saved to `instructions/architecture/` and are resumable across
sessions without re-scanning the project or re-reading chat history. Complements — does not
replace — `isla-summer` (PRDs) and `asa-akira` (open-ended brainstorming), and can consume either as
input.

Comes with a companion **`/sf-init`** slash command (installed automatically alongside it, Claude
Code targets only) that bootstraps `architecture.md` at the project root — a baseline of org
aliases, tech stack, data model, integrations, and Permission Set inventory that `ashley-fires`
reads on every plan instead of re-scanning the whole project each time. Re-running `/sf-init`
refreshes the baseline with a diff-and-confirm flow.

</details>

<details>
<summary><strong>commatozze</strong> — declarative configuration</summary>

Custom objects/fields, picklists, page layouts, record types, profiles, permission sets, roles,
sharing rules, validation rules, workflow rules, flows (Screen/Record-Triggered/Schedule),
approval processes, reports, dashboards, email templates, org setup, security model (OWD), and
data management (import/export/data loader) — anything declarative, no code involved.

</details>

<details>
<summary><strong>isla-summer</strong> — business analysis documentation</summary>

Writes PRDs, user stories, feature specs, and functional requirements — structured Markdown docs
intended to hand off to an admin or developer. Triggers on "write a PRD", "document requirements",
"write user stories", or when a business problem needs to become executable documentation. Its
Admin Spec / Dev Spec templates are for work that will **not** go through `ashley-fires`; for
open-ended brainstorming on a specific existing component instead of net-new requirements, it
hands off to `asa-akira`.

</details>

<details>
<summary><strong>britney-amber</strong> — bulk data operations</summary>

Import/export strategy, Data Loader automation, upsert with External IDs, bulk SOQL exports, data
cleansing, bulk delete/mass update, and error handling for large-volume loads between orgs or from
external systems.

</details>

<details>
<summary><strong>channel-preston</strong> — custom development</summary>

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
<summary><strong>eva-lovia</strong> — deployment & release process</summary>

Code review checklists, scoped `package.xml` manifests, dry-run validation, Change Requests,
deploy documentation, and the full sandbox-to-production pipeline via SF CLI. References your
production/sandbox [org aliases](#org-alias-templating).

</details>

<details>
<summary><strong>asa-akira</strong> — anchored enhancement brainstorming</summary>

Generates enhancement ideas for one specific, named Apex class, LWC component, or closed/approved
PRD — never in the abstract. Requires an anchor before doing anything: if the user doesn't name a
file, it scans the project and asks the user to pick from what actually exists (never invents
component names). Also used proactively when reviewing a specific component to spot improvement
opportunities.

</details>

<details>
<summary><strong>madison-ivy</strong> — security audits</summary>

CRUD/FLS checks, sharing model review, `with sharing` enforcement, SOQL injection, XSS in LWC,
hardcoded credential detection, and a production sign-off checklist. Also covers Shield,
encryption, audit trail, a dedicated PII & Data Privacy section — field classification, sandbox
data masking, and UU PDP-aware review practices — plus Guest User/Experience Cloud access review
and Connected App/External Client App (OAuth) review checklists.

</details>

<details>
<summary><strong>riley-reid</strong> — Apex test strategy</summary>

Test classes, `TestDataFactory` patterns, mocking HTTP callouts and platform events, test
assertions, coverage reports, debugging org-only test failures, and LWC Jest unit tests
(`@salesforce/sfdx-lwc-jest`). Enforces the 85% Apex coverage floor, `AuraHandledException`
assertion conventions, and a 3-scenario minimum (happy/empty/interaction) for every LWC component.

</details>

Each skill's full content — including code patterns, checklists, and exact trigger keywords —
lives in its `SKILL.md`.

## CLI reference

```
acek-skills install              Interactive: pick skills, target IDE(s)/tool(s), and org aliases
acek-skills install --all        Install all skills to Claude Code (project), no prompts
acek-skills install <name>       Install a single skill to Claude Code (project), no prompts
acek-skills list                 List available skills, commands, and sub-agents
```

Any installed skill with a matching **sub-agent** (`.claude/agents/<name>.md`) installs it
automatically alongside it — Claude Code targets only, since Cursor/Windsurf/Copilot have no
subagent equivalent. See [Sub-agents](#sub-agents).

Installing `ashley-fires` also installs its companion **`/sf-init`** slash command — Claude Code
targets only (`.claude/commands/`), since Cursor/Windsurf/Copilot have no slash-command
equivalent. Run `/sf-init` once per project after installing to bootstrap `architecture.md`;
`ashley-fires` reads it on every plan afterward instead of re-scanning the whole project each
time. Re-running `/sf-init` later refreshes the baseline with a diff-and-confirm flow rather than
silently overwriting it.

## Project structure

```
skills/
  commatozze/SKILL.md
  ashley-fires/SKILL.md
  isla-summer/SKILL.md
  britney-amber/SKILL.md
  channel-preston/SKILL.md
  eva-lovia/SKILL.md
  asa-akira/SKILL.md
  madison-ivy/SKILL.md
  riley-reid/SKILL.md
agents/
  commatozze.md         sub-agent dispatched by ashley-fires (subagent_type: commatozze) — Claude Code only
  isla-summer.md
  britney-amber.md
  channel-preston.md
  eva-lovia.md
  asa-akira.md
  madison-ivy.md
  riley-reid.md
commands/
  sf-init.md         /sf-init slash command — companion to ashley-fires, Claude Code only
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
4. Optional: to make the skill dispatchable as one of `ashley-fires`'s sub-agents, add
   `agents/<name>.md` with the same technical id as the skill folder — see [Sub-agents](#sub-agents)
   for the frontmatter shape and persona convention. Also no CLI changes needed; `install` matches
   agent files to skill names by filename.

## FAQ

**Does this modify my Salesforce org?**
No. Every skill is a Markdown instruction file — it shapes how Claude (or Cursor/Windsurf/Copilot)
responds, and doesn't touch any org, sandbox, or production data on its own.

**Can I install only some skills?**
Yes — deselect any skill in the interactive wizard, or use `install <name>` for a single one.

**Can I re-run install to update after a new version is published?**
Yes, `npx` always resolves the latest version unless you pin one (`npx acek-skills@1.4.0 install`).
Re-running overwrites previously installed files for the skills/targets you select.

**What are the sub-agents in `.claude/agents/`?**
Dispatch targets for `ashley-fires`'s plan-mode execution — one per owner skill, invoked via
Claude Code's `Agent` tool (`subagent_type: <owner skill's technical id>`) instead of `ashley-fires` following
that skill's conventions itself. See [Sub-agents](#sub-agents). Only installed for Claude Code
targets; Cursor/Windsurf/Copilot have no subagent concept.

**Why do only Claude Code skills auto-trigger?**
Claude Code has a native skill system that matches tasks against each skill's `description`
frontmatter. Cursor, Windsurf, and Copilot don't expose the same mechanism, so their versions are
converted to each tool's closest equivalent (project rules / custom instructions) — see
[Install targets](#install-targets).

## License

MIT
