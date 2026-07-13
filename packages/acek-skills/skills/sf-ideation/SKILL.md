---
name: sf-ideation
description: >
  Use this skill when the user wants enhancement ideas for a SPECIFIC existing Apex class, LWC
  component, or a closed/approved PRD. Trigger when the user says "ide enhancement untuk
  [component]", "ada ide baru buat [class]?", "kira-kira [component] bisa ditambah apa?", "what
  can we improve about [file]?", "improve this component", or asks for suggestions tied to a
  named file, class, or component. Also use when reviewing a specific component and proactively
  spotting improvement opportunities for it. This skill ALWAYS requires an anchor — the exact
  file, component, or PRD path to ground ideas in — and will scan the project and ask the user to
  pick one via a choice-based question before generating anything if no anchor was given. It
  never brainstorms in the abstract or invents component names.
---

# Salesforce Ideation Skill

## Purpose

Generate actionable, prioritized enhancement ideas for one concrete, named thing — an existing
Apex class, an existing LWC component, or a closed/approved PRD — grounded in what that thing
actually contains, not in assumption or invented examples.

---

## Anchor Requirement — Read This First

**sf-ideation never runs without an anchor.** An anchor is one of:

| Anchor Type   | What it is                                                     | Where to find it                  |
| ------------- | -------------------------------------------------------------- | --------------------------------- |
| Apex class    | An existing `.cls` file                                        | `force-app/main/default/classes/` |
| LWC component | An existing component folder                                   | `force-app/main/default/lwc/`     |
| Closed PRD    | A PRD with `Status: Approved` or `Done` (i.e. already shipped) | `instructions/prd/`               |

A closed PRD as anchor is for exploring **what's next** after a feature has already shipped —
read its Non-Goals and Functional Requirements to find logical follow-on ideas, rather than
re-litigating what it already covers.

### If the user's request has no anchor

Requests like "ada ide baru?", "fitur baru apa yang bisa kita buat?", or "apa yang bisa
diimprove?" do not name anything — **do not generate ideas yet.** Instead:

1. Scan the project once:
   - List `.cls` files in `force-app/main/default/classes/`
   - List component folders in `force-app/main/default/lwc/`
   - List PRDs in `instructions/prd/` with `Status: Approved` or `Done`
2. Present what was actually found as a choice-based question — never invent or assume a name
   that wasn't found in the scan. If a category is empty, omit it entirely rather than showing a
   placeholder.
3. Include an "Other — type the file/component name" option for anything not surfaced by the scan
   (e.g. something not yet committed).
4. If the environment provides a structured choice/button tool, use it so the user taps instead
   of types. Otherwise present the same options as a lettered list.

**Never fabricate a component or class name.** If the scan finds nothing, say so plainly and ask
the user to name the file directly — do not fall back to a generic or hypothetical example.

Once an anchor is confirmed, **read its actual content** (the real `.cls`/LWC files, or the real
PRD file) before applying the framework below — ideas must be grounded in what the file actually
does, not in what a component with that name would typically do.

---

## Ideation Framework

### For an Anchored Component (Apex class or LWC) — 5 Lenses

Applied to the specific anchor's real code, after reading it:

1. **UX / Interaction** — Is the user flow intuitive? Can loading states, empty states, or error
   messages be improved? Can interactions be made faster or more delightful?

2. **Performance** — Are there unnecessary re-renders, redundant wire calls, or heavy SOQL that
   could be optimized? Can we lazy-load data or paginate?

3. **Functionality Gap** — What can users NOT do today that they logically would want to? What
   edge cases are unhandled?

4. **Integration Opportunity** — Can this component connect to another object, system, or
   Salesforce feature (e.g. Einstein, Flows, Platform Events) to add value?

5. **Observability / Admin Control** — Can admins configure behavior without code? Are there
   useful metrics or logs missing?

### For an Anchored Closed PRD — Extension Questions

Applied after reading the PRD's actual sections (especially Non-Goals and Functional
Requirements):

- What did the PRD explicitly exclude (Non-Goals) that is now worth revisiting?
- Which "Should Have" or "Nice to Have" requirements were deprioritized and never built?
- What logical next phase would build on what shipped, without duplicating it?
- Does Salesforce have a native feature (possibly new since the PRD was written) that could now
  partially solve a former Non-Goal? (avoid reinventing)
- What is the rough build complexity: S / M / L / XL?

---

## Output Format

### Enhancement Ideas Output

Always name the anchor at the top, then structure ideas in a prioritized table:

```
## Enhancement Ideas — [exact anchor file/component/PRD path]

### Quick Wins (Low effort, High impact)
| # | Idea | Why | Effort | Impact |
|---|------|-----|--------|--------|
| 1 | ... | ... | S | High |

### Medium Term
| # | Idea | Why | Effort | Impact |
|---|------|-----|--------|--------|

### Big Bets (High effort, transformative)
| # | Idea | Why | Effort | Impact |
|---|------|-----|--------|--------|

### Effort Scale: S=hours, M=days, L=week+, XL=sprint+
```

After the table, pick the **top 1-2 ideas** and write a short paragraph on how to implement them
using the project's actual stack, referencing the anchor by name.

### Extension Proposal Output (from a closed PRD anchor)

```
## Extension Proposal — [Feature Name]

**Base PRD:** [path to the closed PRD this extends]
**Problem:** one sentence
**Solution:** one sentence
**Target Users:** who benefits
**Key Capabilities:** 3-5 bullet points
**Tech Approach:** LWC / Apex / Flow / Platform Event / etc.
**Complexity:** S / M / L / XL
**Dependencies:** existing components or objects it touches
```

---

## Ideation Rules

- **Never run without a confirmed anchor** — see [Anchor Requirement](#anchor-requirement--read-this-first) above
- **Never fabricate a component, class, or file name** — only reference what the project scan or
  the user actually confirmed exists
- **Always ground ideas in the existing stack** — LWC + Apex + Salesforce declarative tools.
  Do not suggest third-party tools unless explicitly asked.
- **Follow whichever LWC styling convention the project actually uses** — check whether the
  component follows `sf-dev`'s `:host` brand-token pattern or `shaiden`'s SLDS 2 global hooks, and
  match that convention rather than assuming one. Any Apex idea must follow bulkification +
  try-catch + CRUD check patterns.
- **No gold-plating** — ideas should solve a real need, not add complexity for its own sake.
- **Data minimization** — if an idea captures or exposes new PII (new field on a person-related
  object, new integration surfacing personal data), flag it explicitly in the idea's "Why" column
  and note the minimal field set actually needed. Don't propose collecting more personal data
  than the stated need requires.
- **Be opinionated** — don't just list options, recommend the best one and explain why.
- **Think Salesforce seasons** — flag if an idea aligns with an upcoming Salesforce release
  feature that could reduce build effort.

---

## Quick Triggers

| User says...                                                     | What to do                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| "ide untuk [component]"                                          | Anchor = that component. Read its code, run all 5 lenses, output enhancement table                                     |
| "ada ide baru?" (no name given)                                  | No anchor — scan project, present real options via choice question, wait for selection                                 |
| "fitur baru apa yang bisa kita buat?" (no name given)            | No anchor — ask whether to anchor on a closed PRD (list found ones) or describe a new area first                       |
| "kira-kira [component] bisa ditambah apa?"                       | Anchor = that component. Focus on Functionality Gap + UX lenses first                                                  |
| "apa next step dari PRD [name]?"                                 | Anchor = that PRD (confirm it's closed/approved). Run Extension Questions                                              |
| "prioritas enhancement mana yang paling worth it?"               | Requires a prior anchored ideation output in this conversation to rank — if none exists, ask which anchor to run first |
| "ada yang bisa diimprove dari sisi performance?" (no name given) | No anchor — scan project, ask which component to focus the Performance lens on                                         |
