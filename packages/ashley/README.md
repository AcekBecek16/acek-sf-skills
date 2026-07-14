<div align="center">

# ashley + eva

**Idea to plan, for Next.js + Supabase SaaS.**
Two installable [Claude Code](https://claude.com/claude-code) skills: **eva** shapes a raw idea
into a validated product concept, **ashley** turns that concept into a gated technical plan and
dispatches it to four dedicated role agents — each of which can spawn its own nested subagents.

[![npm version](https://img.shields.io/npm/v/%40nullbotdotexe%2Fashley.svg)](https://www.npmjs.com/package/@nullbotdotexe/ashley)
[![license](https://img.shields.io/npm/l/%40nullbotdotexe%2Fashley.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/%40nullbotdotexe%2Fashley.svg)](https://nodejs.org)

</div>

---

## Contents

- [What this package is](#what-this-package-is)
- [Quick start](#quick-start)
- [The pipeline](#the-pipeline)
- [Eva — product concept grill](#eva--product-concept-grill)
- [Ashley — plan-mode orchestrator](#ashley--plan-mode-orchestrator)
- [The role roster](#the-role-roster)
- [The files this produces](#the-files-this-produces)
- [Dependencies this skill assumes](#dependencies-this-skill-assumes)
- [Install targets](#install-targets)
- [Relationship to acek-skills](#relationship-to-acek-skills)
- [FAQ](#faq)
- [License](#license)

## What this package is

Most Claude Code skills are static reference material. **Eva and ashley are a stateful,
multi-phase pipeline**: eva turns "I have an idea for a SaaS" into a validated concept through
patient, adaptive interrogation; ashley turns that concept into a decided, sequenced, resumable
technical plan and dispatches each task to the agent who owns that kind of work. Nothing gets
built until a human has explicitly approved it — twice: once on the concept, once on the plan.

## Quick start

```bash
npx @nullbotdotexe/ashley install
```

Pick which IDE(s)/tool(s) to install into. On Claude Code targets this installs both skills, all
four agents, and the `/eva` command shortcut; on other targets (Cursor, Windsurf, Copilot) only
each skill's own workflow is mirrored as a flattened rule file — those tools have no subagent or
custom-command concept, so commatoze, isla, asa, channel, and `/eva` don't have an equivalent
there.

```bash
# Install to Claude Code (project-level), no prompts
npx @nullbotdotexe/ashley install --all
```

This also appends `.ashley/` to `.gitignore` automatically — concept, plan, and architecture
documents are never committed.

## The pipeline

```
EVA (raw idea -> validated concept, can take a while) -> .ashley/concept.md
        |
ASHLEY Phase 0 -- Bootstrap (empty project only): scaffold from concept.md
        |
ASHLEY Phase 1 -- Discovery (technical grill, reads concept.md + architecture.md as baseline)
        |
ASHLEY Phase 2 -- Decisions (Tenancy, API Exposure -- gated, never auto-generated)
        |
ASHLEY Phase 3 -- Plan (approval gate) -> .ashley/plan-<feature>.md
        |
ASHLEY Phase 4 -- Execute -> dispatch to commatoze / isla / asa / channel
        |
ASHLEY Phase 5 -- Resume (new session)
```

Eva and ashley are sequential peers, not a dispatch relationship. Eva never touches code and
never invokes an agent; ashley never invents a product concept — if a request looks like a raw
idea rather than a concrete feature, she defers to eva instead of guessing.

## Eva — product concept grill

Interrogates a raw idea across seven lenses — Problem & Why Now, Target User, Value Proposition,
MVP Scope, Non-Goals, Feasibility Signal, Tenancy Signal — looping back on any lens that stays
vague, for as many rounds as it takes. Early lenses can be open-ended (a menu of options can't
be enumerated for something genuinely new); once there's enough material, questions converge to
the same choice-with-recommendation format ashley uses everywhere. Writes `.ashley/concept.md`
only after every lens is concrete and the user has explicitly confirmed the summary.

Invoke naturally ("saya punya ide untuk...", "bantu develop ide ini jadi produk") or explicitly
via `/eva`.

## Ashley — plan-mode orchestrator

Three rules: no execution before approval, every clarification is a choice not a blank field,
and the plan file is the memory a new conversation resumes from. Two decisions are mandatory on
every plan touching a data module and are never silently assumed: the **Tenancy model** (default
recommendation: multi-tenant) and **API exposure** per module (public / internal-only / none —
the Task Breakdown only gets an endpoint task once this has an answer).

## The role roster

| Agent | Role | Working style |
| --- | --- | --- |
| **commatoze** | UI/UX — operates [impeccable.style](https://impeccable.style) rather than reinventing design critique | Self-aware she isn't producing generic AI-generated design |
| **isla** | Backend/Supabase — schema, migrations, RLS, API route handlers | Methodical; writes a test for every RLS policy she creates |
| **asa** | Frontend — Next.js pages, components, client-side data fetching | Pragmatic and fast, but never silently deviates from commatoze's brief |
| **channel** | Security review — grills the request early, audits the implementation late | Skeptical by default, checks the actual policy/code, not the summary |

As of Claude Code v2.1.172, subagents can spawn their own subagents up to 5 levels deep — all
four agents carry `tools: Agent` specifically so they can fan out further on their own dispatched
task, without ashley needing to manage that layer herself.

## The files this produces

All under `.ashley/`, all gitignored:

| File | Written by | When |
| --- | --- | --- |
| `concept.md` | eva | Once per product, before any technical work |
| `architecture.md` | ashley (Bootstrap) | Once per project, on the very first Bootstrap |
| `plan-<feature-slug>.md` | ashley | Once per feature |

> The npm package is scoped — `@nullbotdotexe/ashley` — for the same reason `shaiden` is: npm
> registry name collisions with existing packages. The skills themselves, the agents, and every
> file they manage use the real, unscoped names: **ashley**, **eva**, **commatoze**, **isla**,
> **asa**, **channel**.

## Dependencies this skill assumes

Neither skill bundles these — install them separately in the target project:

- **[impeccable](https://impeccable.style)** (`npx impeccable install`) — commatoze operates
  this rather than reimplementing it.
- **Supabase's official AI coding agent plugin** — gives isla and channel the `supabase` and
  `supabase-postgres-best-practices` skills preloaded via their `skills:` frontmatter field. See
  [supabase.com/docs/guides/ai-tools/plugins](https://supabase.com/docs/guides/ai-tools/plugins).

## Install targets

| Target | What you get |
| --- | --- |
| Claude Code — project (`./.claude`) | Both skills + all 4 agents + `/eva` command + `.gitignore` entry |
| Claude Code — global (`~/.claude`) | Same, available in every project |
| Cursor / Windsurf / Copilot | Both skills' workflows only, flattened — no subagent/command equivalent |

## Relationship to acek-skills

Ashley + eva is a standalone package, same as `shaiden` — it doesn't depend on the
Salesforce-oriented `acek-skills` package, but follows the same install pattern and lives in the
same monorepo.

## FAQ

**Why is eva separate from ashley instead of one skill?**
Different trigger conditions ("I have an idea" vs "plan this feature"), different output cadence
(concept.md once per product vs plan-*.md once per feature), and different question style (eva
can be open-ended early, ashley is always choice-format). Folding them into one description would
make Claude Code's own trigger-matching worse at picking the right one.

**Why isn't the API-exposure task auto-generated when I add a module?**
Because it shouldn't be assumed. Whether a module needs a public endpoint, an internal-only
action, or nothing at all is a real product decision — ashley asks it explicitly every time and
gates the task breakdown on the answer, the same way she gates the tenancy model.

**What if I want to skip eva and just prototype something?**
Ashley's Bootstrap phase asks explicitly — "no concept.md found: run eva first, or skip, this is
a prototype/sandbox." Skipping is a real, supported choice, not a dead end.

**Can I rename the agents?**
Yes, but update the `Owner Agent` references in `ashley`'s `SKILL.md` and the plan template to
match — they reference `commatoze` / `isla` / `asa` / `channel` by name.

**What happens past nesting depth 5?**
Claude Code's own hard limit — an agent at depth 5 doesn't receive the `Agent` tool and can't
spawn further. This is Claude Code's own constraint, not something ashley enforces.

## License

MIT — see [LICENSE](./LICENSE).
