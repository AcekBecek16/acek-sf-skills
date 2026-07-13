---
name: sf-architect
description: >
  Use this skill when a Salesforce feature or system needs a technical architecture decision
  BEFORE any code, metadata, or config is touched — data model choices, Flow vs Apex, integration
  pattern, security model, or multi-object trade-offs. Acts as a Salesforce-specific plan mode:
  gates all work behind an approved Architecture Plan, then dispatches each task to the right
  skill (sf-admin, sf-dev, sf-testing, sf-devops, sf-security-review, sf-data-migration) in
  sequence. Trigger on "plan this architecture", "how should we build this", "design the data
  model for", "architect this feature", "what's the best approach for", or when a request clearly
  spans multiple roles/skills and needs a decision before execution starts. Also trigger to
  RESUME an existing plan: "continue the architecture plan", "lanjutkan plan", "where did we leave
  off", or when the user references a plan file under instructions/architecture/. Not for
  brainstorming open-ended ideas (use sf-ideation) or writing business requirements (use sf-ba) —
  sf-architect turns a decided problem into a technical plan and executes it.
---

# Salesforce Architect Skill (sf-architect)

## Core Principle

sf-architect is Salesforce's plan mode. It never touches an org, writes code, or creates metadata
until a human has approved a written plan. Its job is to turn "we need to build X" into a decided,
sequenced, resumable set of tasks — each one owned by the right skill.

Three rules govern everything below:

1. **No execution before approval.** Discovery and Decisions are read-only phases. Nothing is
   created, modified, or deployed until the user explicitly approves the plan.
2. **Every clarification is a choice, not a blank field.** Never ask an open-ended question the
   user has to type an answer to. Always present concrete options with a recommendation, plus an
   "Other" choice for anything not listed.
3. **The plan file is the memory.** A new conversation must be able to resume from the plan file
   alone — never by re-reading full chat history, and never by re-scanning the whole project from
   scratch.

---

## Relationship to Other Skills

sf-architect does not replace any existing skill — it decides, sequences, and dispatches to them.

| Skill                | sf-architect's relationship to it                                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sf-ideation`        | Optional **input**. If open-ended brainstorming already happened, architect can consume its output as a starting point. Architect itself does not brainstorm — it decides between already-surfaced options.                                                                   |
| `sf-ba`              | Optional **input**. If a PRD exists (`instructions/prd/...`), architect reads it for business requirements. Architect does **not** write PRDs, user stories, or acceptance criteria — that stays sf-ba's job. The plan links to the PRD path rather than copying its content. |
| `sf-admin`           | **Owner skill** for declarative tasks: objects, fields, flows, permission sets, validation rules, page layouts.                                                                                                                                                               |
| `sf-dev`             | **Owner skill** for custom code tasks: Apex, LWC, triggers, integrations.                                                                                                                                                                                                     |
| `sf-testing`         | **Owner skill** for test class tasks and coverage verification.                                                                                                                                                                                                               |
| `sf-devops`          | **Owner skill** for deployment tasks: manifest, dry-run, CR, actual deploy.                                                                                                                                                                                                   |
| `sf-security-review` | **Owner skill** for CRUD/FLS audits, sharing model review, production sign-off.                                                                                                                                                                                               |
| `sf-data-migration`  | **Owner skill** for bulk data load/migration tasks tied to the feature.                                                                                                                                                                                                       |

When executing a task, sf-architect explicitly states which owner skill's conventions it is
following for that task, then follows that skill's rules for the duration of the task.

---

## The Plan File

**Path:** `instructions/architecture/YYYYMMDD-<feature-slug>-plan.md`

This single file is the entire state of the work. It must always contain enough for a brand-new
conversation to resume without any other context. See [Plan Template](#plan-template) below for
the exact structure.

**One plan file per feature.** Multiple features in flight = multiple plan files. Never merge
unrelated features into one plan.

---

## Workflow

```
DISCOVERY (grill me) → DECISIONS → PLAN (gate) → EXECUTE in batches (parallel where safe) → RESUME (new session)
```

### Phase 1 — Discovery ("Grill Me")

Goal: understand the problem deeply enough to make real trade-off decisions, without wasting the
user's typing effort.

0. **Check for `architecture.md` at the project root first.** This is the baseline created by
   `/sf-init` — if it exists, read it and reuse its Tech Stack Baseline, Data Model Overview,
   Permission Set/PSG Inventory, and Org Aliases directly instead of re-scanning the whole
   project. Only scan for what's specific to this feature and not already covered by the
   baseline. If it doesn't exist, proceed with the full scan below as normal, and mention to the
   user that running `/sf-init` once would make future plans faster.
1. **Scan first, ask second.** Before asking anything, scan the project once for relevant existing
   objects, LWC, Apex classes, flows, and **Permission Sets / Permission Set Groups** that touch
   the feature area. Never ask the user to describe something you can find yourself, and never
   invent a Permission Set name that wasn't actually found.
2. **Check for existing input docs.** Look for a PRD in `instructions/prd/` or ideation output
   matching the feature. If found, read it and skip any question it already answers.
3. **Ask in batches, always as choices.** Every clarifying question uses the structured
   choice-with-options format (see [Question Format Rules](#question-format-rules)) — never a bare
   open text prompt. Batch 2–3 related questions together instead of one round-trip per question.
4. **Cover, at minimum:**
   - Problem context and who is affected
   - Hard constraints (must integrate with X, must not touch Y, deadline/release train)
   - Scale expectations (record volume, concurrent users, callout frequency)
   - Security/visibility sensitivity (who must NOT see this data)
   - Existing touchpoints found during scan — confirm or correct what was found
   - Which existing Permission Set(s), if any, already grant access to the objects/fields this
     feature touches — surface these as candidates before assuming a new one is needed

Discovery output is stored as the **Project Context** section of the plan file — written once,
never re-derived.

### Phase 2 — Decisions

For each architecturally significant choice (data model shape, automation layer, integration
pattern, security model, and any other fork with real trade-offs):

1. Generate 2–4 concrete options.
2. State the trade-off of each in one line (governor limits, maintainability, speed to build,
   future flexibility).
3. Give a clear recommendation with a one-sentence reason.
4. Present as a structured choice via the question format — never a wall of prose the user has to
   parse and respond to in freeform text.

**Permission Set Strategy is always one of the decisions** when the feature grants access to any
new object, field, Apex class, or LWC — never skip it, even on otherwise simple features. Base it
on what Discovery's scan actually found:

- If an existing Permission Set already covers the access needed → **(A) Extend existing PS**
  (name it explicitly)
- If existing PSs are close but not a clean fit → **(B) Create a new PS** scoped to this feature
- If the feature is one of several that a role needs bundled together → **(C) Create/extend a
  Permission Set Group**

Never assume a new Permission Set is needed without having actually scanned for one first, and
never invent a Permission Set name that wasn't found in the scan.

Nothing is built yet. This phase only produces decisions with rationale.

### Phase 3 — Plan (Gate)

1. Compile Discovery + Decisions into the full plan file using the [Plan Template](#plan-template).
2. Break the work into tasks. Every task gets an ID, a description, an **Owner Skill**, a
   **Touches** list (exact file(s)/component(s) it will create or modify), a dependency list, and
   status `P` (Pending). `Touches` is what Phase 4 uses to decide which tasks are safe to run in
   parallel — be specific and accurate here, not vague.
3. **If any task's Owner Skill is `sf-devops` or `sf-data-migration`, resolve org aliases before
   finalizing** — see [Org Alias Resolution](#org-alias-resolution) below. Skip this step
   entirely if no task touches those two skills; don't ask about aliases a plan doesn't need.
4. Present the plan summary to the user and ask for explicit approval — options: **Approve**,
   **Revise a section**, **Cancel**. Do not proceed on silence or an ambiguous reply.
5. Only after explicit approval: write the plan file to
   `instructions/architecture/YYYYMMDD-<feature-slug>-plan.md`.

This is the hard gate. Nothing before this point touches the org or the repo's buildable code.

### Org Alias Resolution

Only runs when the plan has at least one task owned by `sf-devops` or `sf-data-migration` — both
reference `{{PROD_ORG_ALIAS}}` / `{{DEV_ORG_ALIAS}}` and need real values to produce usable
commands.

1. **Check `architecture.md` first.** If the project baseline (from `/sf-init`) already has Org
   Aliases resolved, reuse those directly — this is almost always the case if `/sf-init` has been
   run, and skips every step below.
2. **Otherwise, check for an already-resolved value in installed skills.** If the installed
   `sf-devops`/`sf-data-migration` skill files already have real alias values substituted in (not
   the literal placeholder text `<PROD_ORG_ALIAS>` / `<DEV_ORG_ALIAS>`), reuse those — don't ask
   again.
3. **If still unresolved, scan instead of asking the user to type.** Run `sf org list` to get the
   actual orgs configured on this machine. Never ask the user to type an alias from memory when
   it can be read directly.
4. **Present the scanned orgs as a choice**, not a text prompt — map each result to "which one is
   Production" / "which one is Sandbox/Dev" (include an "Other — type it" option in case the
   right org isn't authenticated locally yet).
5. **Store the resolution in the plan's Project Context** once confirmed — it's reused for every
   task in this plan without re-asking, including on resume in a new session.
6. If `sf org list` returns nothing or the CLI isn't available, fall back to asking directly via
   the choice format, with an "Other — type it" option.

---

### Phase 4 — Execute

Tasks run in **batches**, not strictly one at a time. Within a batch, independent tasks are
dispatched to parallel subagents; tasks that depend on each other still run in sequence.

1. **Compute the ready set.** A task is ready when every task in its `Depends On` list is `D`.
2. **Split the ready set into parallel-safe groups.** Two ready tasks can run in the same batch
   only if their `Touches` values don't overlap (no shared file/component). If a task's `Touches`
   is unclear or ambiguous, treat it as not parallel-safe — run it alone.
3. **Dispatch the batch:**
   - **Batch of 1** → run directly in the main thread, exactly as before (no subagent overhead
     for solo work).
   - **Batch of 2+** → dispatch each task to a separate subagent via the Task tool, in the same
     turn. Each subagent prompt must state explicitly: the task description, the exact file(s) in
     `Touches`, and "follow `sf-[owner skill]`'s conventions exactly as if that skill were invoked
     directly" — never duplicate that skill's rules into the prompt, just name it and let it
     trigger in the subagent's own context.
   - **Assign each subagent in a batch a random name from the pool below, unique within that
     batch** — used only as a tracking label in the orchestrator's own narration and Execution Log
     ("Dispatched to Sasha"), never written into code, commits, or file content.
4. **Only the orchestrator (main thread) writes to the plan file.** Subagents report their result
   back; they never edit `instructions/architecture/*.md` directly. Once every subagent in the
   batch has reported back, the orchestrator updates each task's status serially — this is what
   prevents concurrent writes to the same plan file.
5. **Per task, on completion:** set status to `D` (Done) and append **one line** to the Execution
   Log — no narrative, just what changed, where, and (if dispatched in a batch) which agent name
   handled it.
6. **Per task, if it can't proceed** (missing decision, blocked dependency, discovered conflict):
   set status to `B` (Blocked), write a one-line reason, and surface it to the user — a Blocked
   task in a batch does not stop the other tasks in that same batch from completing.
7. **Recompute and repeat.** After a batch finishes, recompute the ready set (newly-unblocked
   tasks may now qualify) and dispatch the next batch. Continue until every task is `D`, or every
   remaining task is `B` — in which case stop and ask the user how to proceed via the choice
   format.

**Subagent name pool** (pick unique names within a batch; reuse across different batches is fine):
Maya, Sasha, Nadia, Kirana, Alya, Cinta, Bunga, Dewi, Farah, Gita, Intan, Laras, Mira, Nita,
Putri, Rani, Sari, Tantri, Vina, Wulan

### Phase 5 — Resume

Triggered by phrases like "lanjutkan plan", "continue the architecture plan", "resume", or a
direct reference to a plan file.

1. **Do not re-scan the project and do not re-read full chat history.**
2. List plan files under `instructions/architecture/` where at least one task is not `D`.
3. If more than one match, ask the user which one via the choice format (include each plan's
   feature name and last-updated date as the option label).
4. Read only that plan file. The **Resume Briefing** section is sufficient to continue — if it
   isn't, that's a defect in how the plan was written, not a reason to re-derive context elsewhere.
5. Find every task that is not `D`. **Any task still marked `IP` from a previous session means
   its batch was interrupted mid-flight** — don't assume it actually finished or actually failed;
   treat it as `P` again and re-verify its `Touches` before re-dispatching (check whether the file
   actually reflects the change described in the task, since the interruption could have happened
   before or after the underlying work landed). Recompute the ready/parallel-safe batch from
   there and continue Phase 4 normally.

---

## Plan Template

```markdown
# Architecture Plan: [Feature Name]

**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD HH:MM
**Status:** Discovery | Decisions | Planned | In Progress | Blocked | Done
**PRD Reference:** [path to instructions/prd/... if one exists, else "None"]

---

## Resume Briefing

_Read this section only when resuming — it must be sufficient on its own._

[3–6 lines: what is being built, the biggest architectural decisions already made (one line
each), what's done so far, and exactly what the next task is.]

---

## Project Context

_Captured once during Discovery. Do not re-derive unless explicitly marked stale below._

**Scan status:** Fresh as of YYYY-MM-DD | Stale — [reason]

- Existing objects touched: [list]
- Existing components touched: [list]
- Existing Apex touched: [list]
- Existing Permission Sets/Groups found relevant to this feature: [list, or "None found"]
- Org aliases: [only filled if a task touches sf-devops/sf-data-migration — Production = `[alias]`,
  Sandbox/Dev = `[alias]` — resolved once, reused for every task in this plan]
- Constraints: [list]
- Scale expectations: [numbers]
- Security/visibility notes: [summary]

---

## Architecture Decisions

### Decision 1: [e.g. Data Model Shape]

**Options considered:** [A, B, C — one line each with trade-off]
**Decision:** [chosen option]
**Rationale:** [1 sentence]

### Decision 2: [e.g. Automation Layer]

**Options considered:** [...]
**Decision:** [...]
**Rationale:** [...]

### Decision 3: Permission Set Strategy

**Found during scan:** [existing PS names relevant to this feature, or "None found"]
**Options considered:** (A) Extend `[PS Name]` / (B) Create new `[PS Name]` / (C) Create/extend
Permission Set Group `[PSG Name]`
**Decision:** [chosen option, exact PS/PSG name]
**Rationale:** [1 sentence]

---

## Task Breakdown

| ID      | Description                                                                 | Owner Skill | Touches                     | Depends On       | Status |
| ------- | --------------------------------------------------------------------------- | ----------- | --------------------------- | ---------------- | ------ |
| TASK-01 | [what]                                                                      | sf-admin    | `Project__c` (object)       | —                | D      |
| TASK-02 | Grant access via `[PS/PSG name from Decision 3]` — extend/create as decided | sf-admin    | `[PS/PSG name]`             | TASK-01          | P      |
| TASK-03 | [what]                                                                      | sf-dev      | `ProjectController.cls`     | TASK-01          | P      |
| TASK-04 | [what]                                                                      | sf-dev      | `projectCard` (LWC)         | TASK-01          | P      |
| TASK-05 | [what]                                                                      | sf-testing  | `ProjectControllerTest.cls` | TASK-03          | P      |
| TASK-06 | [what]                                                                      | sf-devops   | manifest + deploy           | TASK-04, TASK-05 | P      |

**Status codes:** `P` Pending · `IP` In Progress · `B` Blocked · `D` Done

**Touches** is what makes parallel dispatch safe: TASK-02, TASK-03, and TASK-04 all depend only on
TASK-01 and touch different things — they're a valid parallel batch. TASK-05 depends on TASK-03
and must wait for it. TASK-06 depends on both TASK-04 and TASK-05, so it waits for the slower of
the two.

---

## Execution Log

_One line per completed or blocked task. No narrative. Include the agent name if the task was
dispatched as part of a parallel batch — omit it for solo/main-thread tasks._

- YYYY-MM-DD HH:MM — TASK-01 done — Created `Project__c` fields per Decision 1
- YYYY-MM-DD HH:MM — TASK-02 done (agent: Nadia) — Extended `Project Manager Access` PS
- YYYY-MM-DD HH:MM — TASK-03 done (agent: Sasha) — Added `getProjects()` to `ProjectController.cls`
- YYYY-MM-DD HH:MM — TASK-04 blocked (agent: Kirana) — needs Decision on empty-state copy, asked user
```

---

## Question Format Rules

Every clarification, at every phase, follows this shape — no exceptions:

- Present the question with **concrete, mutually exclusive options** (2–4 choices)
- Include a recommended option, clearly marked, with a one-line reason
- Always include an **"Other"** option so the user can supply something not listed
- Batch related questions together rather than one at a time when they don't depend on each
  other's answers
- If the environment provides a structured choice/button tool (e.g. Claude Code's interactive
  question tool, or the ask-user-input tool in Claude.ai), use it so the user taps instead of
  types. If no such tool is available, present the same options as a lettered list in plain text —
  never as an open "what do you think?" prompt.

**Bad:** "What automation approach do you want to use for this?"

**Good:** "Automation layer for the approval step — (A) Record-Triggered Flow: fastest to build,
fine for current volume [Recommended — simple approval logic, no complex branching] (B) Apex
Trigger + Queueable: more control, better for >5k records/day (C) Screen Flow with manual submit:
best if users need to review before submitting (D) Other — describe your own approach"

---

## Token Efficiency Rules

1. **Resume Briefing is the only context loaded on resume.** Never re-read the full Execution Log,
   full chat history, or re-scan the project unless Project Context is explicitly marked stale.
2. **Execution Log stays terse.** One line per task: what changed, where. Full reasoning belongs
   in the code/metadata itself (comments, ApexDoc), not duplicated into the log.
3. **Load owner-skill conventions per task, not all at once.** When starting a task owned by
   `sf-testing`, apply only what's relevant to that task — don't re-load or restate every other
   owner skill's full rule set.
4. **Scan once.** Project Context is captured during Discovery and reused for the life of the
   plan. Only re-scan if the user flags something changed, or the plan is explicitly marked stale.
5. **Never duplicate a PRD.** Link to its file path. Do not copy PRD sections into the plan file.
6. **Batch discovery questions.** Group 2–3 non-dependent questions into a single round-trip
   instead of asking them one by one.
7. **Use status codes, not words.** `P` / `IP` / `B` / `D` in the task table — the table gets
   re-read often, and full words add up.
8. **Resolve org aliases once, only when needed.** Skip alias resolution entirely if no task
   touches `sf-devops`/`sf-data-migration`. When it is needed, scan `sf org list` rather than
   asking the user to type from memory, and store the result in Project Context so it's never
   re-resolved for the rest of that plan.
9. **Read `architecture.md` instead of re-scanning the whole project.** If the project baseline
   exists (from `/sf-init`), it already has the tech stack, data model, Permission Set inventory,
   and org aliases — reuse it. Only scan for what's specific to the current feature.
10. **Don't parallelize trivial batches.** A batch of 2+ is only worth subagent overhead when the
    tasks are substantial (real file edits, not one-liners). If a "parallel-safe" batch is tiny,
    running it directly in the main thread is often cheaper than the dispatch overhead.

---

## Anti-Patterns

- ✕ Writing or modifying any file before the plan is approved
- ✕ Asking an open-ended question when a choice-with-options would work
- ✕ Re-scanning the whole project on every resume
- ✕ Copying a PRD's full content into the plan file instead of linking it
- ✕ Skipping the Owner Skill's conventions when executing its task (e.g. writing Apex without
  following sf-dev's CRUD/FLS and governor-limit rules)
- ✕ Marking a task `D` without a corresponding Execution Log line
- ✕ Producing a "PRD" — that document belongs to sf-ba; sf-architect produces a plan
- ✕ Continuing to the next task when the current one is `B` (Blocked) without surfacing it first
- ✕ Skipping the Permission Set Strategy decision because the feature "seems simple" — access
  control is part of every feature that touches an object, field, Apex class, or LWC
- ✕ Assuming a new Permission Set is needed without first scanning for an existing one that fits
- ✕ Dispatching two tasks in parallel when their `Touches` overlap, or when either one's
  `Touches` is too vague to be sure it doesn't
- ✕ Letting a subagent write directly to the plan file — only the orchestrator writes status/log
  updates, and only after the batch reports back
- ✕ Reusing the same agent name for two subagents within the same batch
- ✕ Treating an `IP` task found on resume as already finished — it means the batch was
  interrupted, not that the work landed; re-verify before re-dispatching
- ✕ Asking the user to type an org alias from memory when `sf org list` can just be run
- ✕ Resolving org aliases for a plan that has no `sf-devops`/`sf-data-migration` task at all
