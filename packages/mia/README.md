<div align="center">

# mia

**Manager in Action.**
An installable [Claude Code](https://claude.com/claude-code) skill for Project Discovery,
Specification & Verification — a blunt, project-obsessed PM who grills stakeholders into a
`spec.md` before any feature work starts, then verifies the Architect's output actually delivers
on it.

[![npm version](https://img.shields.io/npm/v/%40nullbotdotexe%2Fmia.svg)](https://www.npmjs.com/package/@nullbotdotexe/mia)
[![license](https://img.shields.io/npm/l/%40nullbotdotexe%2Fmia.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/%40nullbotdotexe%2Fmia.svg)](https://nodejs.org)

</div>

---

## Contents

- [What mia is](#what-mia-is)
- [Quick start](#quick-start)
- [Command reference](#command-reference)
- [Discovery framework — 7 layers](#discovery-framework--7-layers)
- [Artifacts it manages](#artifacts-it-manages)
- [Install targets](#install-targets)
- [Relationship to acek-skills](#relationship-to-acek-skills)
- [FAQ](#faq)
- [License](#license)

## What mia is

Most Claude Code skills are static reference material. **Mia is an interrogation and
verification skill** — a stateful, multi-phase workflow that sits at both ends of a single
request's pipeline: before the Architect starts any technical work, and again right before
UAT/SIT are handed to real users.

```
Mia — GRILL (per request/feature, not per whole project)
   → .spec/<RequestName>/spec.md  (source of truth for this request)
      → Architect writes requirements.md + tasks.md
      → Mia — VERIFY: spec.md vs requirements.md/tasks.md, cross-conversation
         gate 1: every spec requirement traceable in the plan, no undisclosed scope creep
         gate 2: every task in tasks.md closed, build is ready for production
      → Mia generates uat.md (human language) + sit.md (light technical, integration-focused)
```

Mia isn't a note-taker — she's **blunt**: a change to an Approved spec is interrogated, not
accepted at face value; a mismatch during VERIFY is reported plainly, not softened. She is
single-agent by design — the whole interview and the whole verification pass each live in one
continuous thread, because every drill-down and every cross-check depends on remembering
everything already established. No sub-agents, no parallel interviewers.

Mia is Salesforce-*aware*, not Salesforce-exclusive — she runs the same 7 discovery layers
regardless of tech stack, but sharpens her questions (objects, flows, sharing model) when the
existing system turns out to be Salesforce.

> The npm package is scoped — `@nullbotdotexe/mia` — because the unscoped name `mia` is already
> taken on npm's registry by an unrelated package. The skill itself, its commands, and its files
> all use its real, unscoped name: **mia**.

## Quick start

```bash
npx @nullbotdotexe/mia install
```

Pick which IDE(s)/tool(s) to install into — no skill picker needed, there's only one skill in
this package.

```bash
# Install to Claude Code (project-level), no prompts
npx @nullbotdotexe/mia install --all
```

## Command reference

Mia is driven by five phases, each triggered by natural language or the literal command phrase
(there's no real `/mia` slash command registered — Claude matches these phrases via the skill's
trigger description):

| Command        | Purpose                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| `/mia grill`   | Start a new discovery interview for a request/feature, or resume an unfinished one          |
| `/mia status`  | Show coverage status of all 7 layers without triggering more questions                      |
| `/mia approve` | Run the final mutual-confirmation pass and promote `spec.md` to `Status: Approved`          |
| `/mia amend`   | Request a change to an already-Approved `spec.md`                                           |
| `/mia verify`  | Cross-check a finished architecture plan against its spec, then generate `uat.md`/`sit.md`  |

Every phase writes to disk immediately after something resolves — state is never held only in
conversation memory, because both the interview and the verification pass must survive being
resumed days later, possibly in an entirely different conversation.

<details>
<summary><strong>/mia grill</strong> — discovery interview</summary>

No `spec.md` yet → fresh start, created from `references/spec-template.md` with all 7 layers at
`Not Started`. Existing `Status: Draft` → resumes on the first `Unfinished` or `Not Started`
layer. Existing `Status: Approved` → redirects to `/mia amend` or `/mia verify`. Drilling follows
a small set of heuristics (named-but-unexplained terms, vague claims, unstated implications,
contradictions) with a hard stop after 2–3 rounds on any topic that stays abstract — logged as an
assumption rather than forced further. A topic-switch guard reflects back what's understood so
far before letting the user jump to a different layer mid-topic.
</details>

<details>
<summary><strong>/mia status</strong> — coverage report</summary>

Reads `spec.md`, outputs a table of all 7 layers and their status. No drilling happens in this
phase.
</details>

<details>
<summary><strong>/mia approve</strong> — promote Draft → Approved</summary>

Runs a final mutual-confirmation pass over every layer not already `Confirmed` — Mia's own
judgment that a layer is thorough enough is necessary but not sufficient, the user must
explicitly agree. Blocks promotion if any layer is still `Unfinished`. Once all 7 are `Confirmed`,
sets the header to `Status: Approved` and hands off to the Architect, which writes
`requirements.md` + `tasks.md` in the same folder.
</details>

<details>
<summary><strong>/mia amend</strong> — change an Approved spec</summary>

Refuses to run against a `Draft` spec (redirects to `/mia grill`). Interrogates the reason and
objective behind the change, weighs it against what's already written (replace / combine /
reject), applies the change, and appends a row to the Changelog. A substantial enough change
resets the affected layer to `Unfinished`, requiring re-confirmation through `/mia approve` before
the file can claim `Approved` again.
</details>

<details>
<summary><strong>/mia verify</strong> — cross-check the build against the spec</summary>

Explicitly **cross-conversation** — the user names both `spec.md` and the architecture plan
files, Mia reads them fresh every time, never assuming she wrote or saw them before. Two gates,
both required: a traceability cross-check (every Problem Statement / Success Criteria / Scope
Boundary item has plan coverage, no undisclosed scope creep, no contradictions) and a completion
check (every task in `tasks.md` closed). Blocked while either gate fails — no partial or
speculative UAT/SIT gets generated. Once both pass, generates `uat.md` (plain human/business
language, sourced from Customer Expectation & Success Criteria) and `sit.md` (integration-focused,
sourced from `requirements.md`/`tasks.md`), both written into the same `.spec/<RequestName>/`
folder.
</details>

## Discovery framework — 7 layers

An **internal coverage map**, never a fixed question script — every question comes from what the
user just said:

1. Business Context — why this request exists now, who asked for it, the strategic goal
2. As-Is Process — how it's done today, what systems are already in use
3. Problem Statement — what's actually broken, symptom vs. root cause
4. Stakeholders — who uses it, who decides, who's affected
5. Customer Expectation & Success Criteria — what "done" means to the customer
6. Scope Boundary — what's explicitly out of scope
7. Constraints & Risks — budget, timeline, technical, compliance

Once As-Is Process, Scope Boundary, and Stakeholders are `Confirmed`, Mia synthesizes a
**Solution Overview (Conceptual)** — two Mermaid diagrams (business process flow, conceptual
capability relationships) written straight into `spec.md`. This stays at "what's needed," never
"how it's built" — no sequence diagrams, no schemas, no system architecture; that's entirely the
Architect's territory.

## Artifacts it manages

Mia operates **per request/feature**, not per whole project, inside the project she's installed
into (not in this package):

```
project-root/
└── .spec/
    ├── PMT/
    │   ├── spec.md          ← Mia. Draft → Approved
    │   ├── requirements.md  ← Architect (not written by Mia — read-only during verify)
    │   ├── tasks.md          ← Architect (not written by Mia — read-only during verify)
    │   ├── uat.md            ← Mia, generated by /mia verify once both gates pass
    │   └── sit.md            ← Mia, generated by /mia verify once both gates pass
    └── AnotherFeature/
        └── spec.md
```

The skill ships the authoritative `spec.md` structure under
`skills/mia/references/spec-template.md` — `SKILL.md` points Claude to it at each generation
step rather than duplicating the full structure inline.

## Install targets

| Target                     | Destination                                                              | Notes                                                                          |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Claude Code** (project)   | `./.claude/skills/mia/`                                                  | Full skill, including `references/` — the only target with real multi-phase, stateful triggering |
| **Claude Code** (global)    | `~/.claude/skills/mia/`                                                  | Same, applies across every project                                              |
| **Cursor**                  | `./.cursor/rules/mia.mdc` + `./.cursor/rules/mia/references/`            | Converted to a project rule; Cursor decides relevance itself                    |
| **Windsurf**                | `./.windsurf/rules/mia.md` + `./.windsurf/rules/mia/references/`         | Converted to a Cascade rule                                                     |
| **GitHub Copilot**          | `./.github/instructions/mia.instructions.md` + `.../mia/references/`     | Applied repo-wide, no per-task trigger                                          |

Only Claude Code has a native concept of a multi-phase skill with commands and persistent state —
the other targets get the same content translated to a static rule file, with `references/`
mirrored alongside it, but without the phase-triggering behavior (`/mia verify` etc. work as
prompts, not as anything the tool recognizes natively).

## Relationship to acek-skills

Mia sits **upstream** of [`acek-skills`](https://www.npmjs.com/package/acek-skills)' `sf-architect`
(Salesforce's plan-mode orchestrator) — not a replacement for it. Mia owns discovery and
verification at the business/conceptual level; `sf-architect` owns technical Decisions and task
dispatch, internally using `sf-ba` for PRD/user-story writing. `spec.md` is the handoff point:
Mia produces it, the Architect consumes it to write `requirements.md`/`tasks.md`, and Mia reads
those back during `/mia verify`. Mia never writes a PRD, a technical architecture, or a solution
design — that would duplicate `sf-ba`/`sf-architect`'s job and create two competing sources of
truth.

Mia has no styling or code-convention opinions, so it does not conflict with any `acek-skills` or
`shaiden` convention — it can be installed alongside either without reconciliation.

## FAQ

**Why isn't `/mia grill` a real slash command?**
Claude Code skills trigger from natural language matching the `description` frontmatter, not
from registered slash commands. Typing `/mia grill` works because it's listed as a trigger
phrase, not because it's wired up as a command — same effect, different mechanism.

**Does mia touch my Salesforce org, or write code?**
No. It only reads/writes Markdown artifacts (`spec.md`, `uat.md`, `sit.md`) inside `.spec/` in
your repo, and reads (never writes) `requirements.md`/`tasks.md` produced by the Architect.

**Can I use mia on a non-Salesforce project?**
Yes — the 7 discovery layers are stack-agnostic. Salesforce-specific questions only surface when
the existing system being described turns out to be Salesforce.

**What happens if I skip `/mia verify` and go straight to building?**
Nothing stops you — Mia doesn't gate the Architect from running. But without an Approved
`spec.md` and a passed VERIFY, there's no traceability guarantee that what got built actually
matches what was asked for, and no `uat.md`/`sit.md` for real users to execute against.

## License

MIT
