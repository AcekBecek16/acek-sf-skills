---
description: Start (or resume) Eva's product concept grill — the seven-lens interrogation that turns a raw SaaS idea into a validated concept, written to .ashley/concept.md.
---

# /eva — Product Concept Grill

This command starts (or resumes) the `eva` skill directly, for when the user wants to invoke it
explicitly rather than relying on natural-language trigger phrases.

**This command follows Eva's own conventions exactly:** patient, adaptive grilling across the
seven lenses (Problem & Why Now, Target User, Value Proposition, MVP Scope, Non-Goals,
Feasibility Signal, Tenancy Signal) — open-ended where a menu of options can't yet be
enumerated, converging to choice-format once there's enough material to offer real options.
Never writes code, never dispatches to isla/asa/commatoze/channel.

## Step 1 — Check for an existing concept

Look for `.ashley/concept.md` at the project root.

- **Not found** → start the grill from lens 1, per Eva's `SKILL.md`.
- **Found, `Status: In Progress`** → resume from wherever the file left off — read it, identify
  which lens is still vague, continue from there rather than restarting.
- **Found, `Status: Confirmed`** → don't re-open it. Tell the user a confirmed concept already
  exists, summarize it in one line, and ask whether they want to (A) revisit the core concept
  anyway [rare — only if the idea itself is changing] or (B) hand off to ashley to plan a
  feature against the existing concept instead.

## Step 2 — Run the grill

Follow `SKILL.md` exactly: seven lenses, loop back on vague answers, converge to choice-format
once enough material exists, don't rush the exit criteria.

## Step 3 — Confirm and write

Summarize the full concept in plain language, get explicit confirmation, then write
`.ashley/concept.md` using `references/concept-template.md`. Set `Status: Confirmed` only once
approved.

## Step 4 — Hand off

State plainly that the next step is inviting ashley to read `concept.md` and start Bootstrap
(if the project is empty) or Discovery on the first MVP feature named in the Handoff Note.
