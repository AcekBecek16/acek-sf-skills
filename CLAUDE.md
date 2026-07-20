# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

An npm monorepo (workspaces) of **installable Claude Code skill packages** — not application
code. Each package under `packages/*` is an independent npm-publishable CLI (`npx <pkg> install`)
that copies Markdown skill/agent/command files into a target project's `.claude/` (or Cursor /
Windsurf / Copilot equivalent). There is no build step, no test suite, and no lint config anywhere
in the repo — the "product" is the Markdown content plus the small installer script that moves it
around.

## Commands

```bash
npm install                                   # installs deps for all workspaces (root)

# Per-package CLI, run from repo root or inside the package dir:
node packages/<pkg>/bin/cli.js install        # interactive wizard
node packages/<pkg>/bin/cli.js install --all  # non-interactive, installs everything to Claude Code (project)
node packages/<pkg>/bin/cli.js install <name> # (acek-skills only) install a single skill
node packages/<pkg>/bin/cli.js list           # list available skills/commands

npm publish -w packages/<pkg>                 # publish one package independently
```

There are no `test`/`build`/`lint` npm scripts in any package.json — validate changes by running
the CLI against a scratch directory and inspecting the files it writes (see below).

## Repo structure

```
packages/
  acek-skills/   Salesforce role skills (unscoped npm name: acek-skills)
  shaiden/       LWC design-system skill (scoped: @nullbotdotexe/shaiden)
  ashley/        eva + ashley planning pipeline (scoped: @nullbotdotexe/ashley)
```

Each package is self-contained: its own `bin/cli.js`, `skills/`, `package.json`, README. They are
kept as **separate packages on purpose** because some of their skills give Claude mutually
incompatible instructions if installed together (see "Cross-package conflicts" below) — do not
merge them or add cross-package `require`s.

## The install-CLI pattern (shared shape across packages)

Every `bin/cli.js` is a single-file, dependency-light installer (only `prompts` as a runtime dep)
that follows the same shape — when editing one, check whether the same fix applies to the others,
since logic is duplicated rather than shared from a common lib:

- `TARGETS` map: `claude-project` (`.claude/`), `claude-global` (`~/.claude/`), `cursor`
  (`.cursor/rules`), `windsurf` (`.windsurf/rules`), `copilot` (`.github/instructions`). Only the
  `claude` format preserves native skill directories/subagents/slash-commands; the other three get
  a flattened, format-converted single file (via `FORMATTERS` + `EXT`) with any `references/`
  mirrored alongside it.
- `parseSkill()` regex-parses YAML frontmatter (`name`/`description`) out of each `SKILL.md` —
  this is hand-rolled, not a real YAML parser, so frontmatter must stay in the two shapes it
  expects: single-line `description: ...` or folded-scalar `description: >` followed by indented
  lines.
- Skills/agents/commands are plain Markdown files under `skills/<name>/SKILL.md`,
  `agents/<name>.md` (ashley only), `commands/<name>.md` — the CLI copies these into the target
  directory, applying any placeholder substitution along the way (see below). Adding a new skill
  requires no CLI changes — `list`/`install` discover folders under `skills/` automatically.
- `install` (no args) runs the interactive `prompts`-based wizard; `install --all` and
  `install <name>` are non-interactive and always target `claude-project`.
- Placeholder substitution: `acek-skills` resolves `{{PROD_ORG_ALIAS}}` / `{{DEV_ORG_ALIAS}}` from
  wizard prompts or `ACEK_PROD_ORG_ALIAS`/`ACEK_DEV_ORG_ALIAS` env vars, falling back to literal
  `<PROD_ORG_ALIAS>` / `<DEV_ORG_ALIAS>` if unset. `ashley` instead appends `.ashley/` to the
  target project's `.gitignore` on install (concept/plan/architecture docs it generates are never
  committed).

## Skill content conventions

- Every `SKILL.md` needs YAML frontmatter with `name` and `description` — Claude Code (and the
  Cursor/Windsurf/Copilot converters) match on `description` to decide when to trigger the skill,
  so it must state the exact task/keywords that should invoke it, not just a category label.
- Slash commands (`commands/*.md`) and subagents (`agents/*.md`, ashley only) are Claude-Code-only
  concepts — the installer never converts these for Cursor/Windsurf/Copilot targets, since those
  tools have no equivalent mechanism.
- Multi-phase/stateful skills (shaiden's craft/critique/polish, ashley's Discovery/Decisions/Plan/
  Execute) persist their state as Markdown artifacts written into the *installed-into* project
  (e.g. `design.md`, `product.md`, `.critique/`, `.ashley/concept.md`, `plan-<feature>.md`), never
  inside this repo.

## Cross-package conflicts (do not silently resolve — flag instead)

- `acek-skills`' `channel-preston`/`eva-lovia`/`asa-akira` skills mandate a custom `:host` brand-token LWC
  styling convention (`--brand`, `--r-sm`, plus a mandatory version badge). `shaiden` mandates
  native SLDS 2 global hooks (`--slds-g-*`) only, no custom token block. Installing both against
  the same LWC task hands Claude contradictory styling instructions — this is intentional
  separation, not a bug to fix by merging the two conventions.
- `ashley`'s four role agents (commatoze, isla, asa, channel) are referenced by name from
  `ashley`'s `SKILL.md` and its plan template — renaming an agent file requires updating those
  references too.
