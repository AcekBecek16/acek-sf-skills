# Plan template — `.ashley/plan-<feature-slug>.md`

This is the authoritative structure. Ashley writes this file only after the user approves the
plan in Phase 3. Every section must contain enough for a brand-new conversation to resume from
this file alone.

```markdown
# Plan: [Feature Name]

**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD HH:MM
**Status:** Discovery | Decisions | Planned | In Progress | Blocked | Done

---

## Resume Briefing

_Read this section only when resuming — it must be sufficient on its own._

[3–6 lines: what is being built, the biggest decisions already made (one line each), what's
done so far, and exactly what the next task is.]

---

## Project Context

_Captured once during Discovery. Do not re-derive unless explicitly marked stale below._

**Scan status:** Fresh as of YYYY-MM-DD | Stale — [reason]

- Product concept (`.ashley/concept.md`, from eva): [one-line reference — Value Prop, MVP Scope —
  or "none, prototype/sandbox" if Bootstrap was explicitly run without eva]
- Technical baseline (`.ashley/architecture.md`, from Bootstrap): [one-line reference, or "not
  yet bootstrapped" if this is the very first plan]
- Tenancy model: [Multi-tenant | Single-tenant/generic — resolved once per project, reused
  across every plan in this repo]
- Existing tables touched: [list]
- Existing routes touched: [list, e.g. `/api/v1/...`]
- Existing components touched: [list]
- Constraints: [list]
- Scale expectations: [numbers]
- Security/visibility notes: [summary from channel's early involvement]

---

## Decisions

### Decision 1: Tenancy model

_Only asked once per project — skip re-asking if Project Context already has this resolved._

**Options considered:** (A) Multi-tenant, `org_id` on every table [Recommended] / (B)
Single-tenant / generic / (C) Other
**Decision:** [chosen option]
**Rationale:** [1 sentence]

### Decision 2: API exposure — [module name]

_One of these per data module touched by this plan. Never skip — the answer determines whether
an endpoint task exists at all._

**Options considered:** (A) Public endpoint `/api/v1/[module]`, Bearer + tier scope / (B)
Internal-only, Server Action / (C) No endpoint needed / (D) Other
**Decision:** [chosen option]
**Rationale:** [1 sentence]
**channel's early questions on this decision:** [1–2 lines — what she flagged before the
decision was made, e.g. cross-tenant read risk, rate limit need]

### Decision 3: [e.g. Data model shape, automation approach]

**Options considered:** [A, B, C — one line each with trade-off]
**Decision:** [chosen option]
**Rationale:** [1 sentence]

---

## Task Breakdown

| ID | Description | Owner Agent | Touches | Depends On | Status |
| --- | --- | --- | --- | --- | --- |
| TASK-01 | [what] | isla | `[table]` + RLS policy | — | P |
| TASK-02 | [what] | commatoze | design brief for `[module]` UI | — | P |
| TASK-03 | [what — only if Decision 2 = A or B] | isla | `/api/v1/[module]` route | TASK-01 | P |
| TASK-04 | [what] | asa | `[Component]` | TASK-01, TASK-02 | P |
| TASK-05 | [what — only if Decision 2 = A or B] | channel | audit `/api/v1/[module]` auth + RLS | TASK-03 | P |

**Status codes:** `P` Pending · `IP` In Progress · `B` Blocked · `D` Done

**Touches** is what makes parallel dispatch safe: two ready tasks with non-overlapping `Touches`
can run in the same batch. Be specific — "the API layer" is too vague, `/api/v1/contacts/route.ts`
is not.

---

## Execution Log

_One line per completed or blocked task. No narrative._

- YYYY-MM-DD HH:MM — TASK-01 done (agent: isla) — created `contacts` table, RLS scoped to
  `org_id`, migration `0007_contacts.sql`
- YYYY-MM-DD HH:MM — TASK-02 done (agent: commatoze) — design brief via `/impeccable shape`,
  saved to `.impeccable` context
- YYYY-MM-DD HH:MM — TASK-03 blocked (agent: isla) — needs Decision 2 clarified for the
  `contacts.notes` field, asked user
```

## Notes on maintaining this file

- **Never duplicate Discovery scan results into every Decision** — Project Context is captured
  once and referenced, not restated.
- **Resolve the Tenancy decision once per project**, not once per plan — if `Project Context`
  already has it, skip re-asking on the next feature's plan.
- **A task with an empty or vague `Touches` is not parallel-safe** — treat it as solo.
- **Delete nothing from the Execution Log** — it's the audit trail for what each agent actually
  did, including nested-subagent work that never reached Ashley's own context.
