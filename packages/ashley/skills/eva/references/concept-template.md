# Concept template — `.ashley/concept.md`

Eva writes this file only after all seven lenses are concrete and the user has explicitly
confirmed the summary. A brand-new conversation — Eva's, or later ashley's — must be able to
pick up from this file alone.

```markdown
# Concept: [Product name / working title]

**Created:** YYYY-MM-DD
**Status:** In Progress | Confirmed

---

## 1. Problem & Why Now

[The pain point, for whom, and why it hasn't been solved well already. Stated without the
solution baked into it — "X is hard to track" not "we need a dashboard for X."]

## 2. Target User (ICP)

[Specific enough to picture one real person or one real company profile — not "businesses" or
"teams." How do they cope today without this?]

## 3. Value Proposition

[One sentence. Why this, why now, why them.]

## 4. MVP Scope

- [Feature — smallest slice that's genuinely usable on its own]
- [Feature]
- [Feature]

_If this list feels like it needs more than a handful of items to be "usable," it probably
hasn't been cut enough yet._

## 5. Non-Goals

- [Explicitly excluded from v1 — especially the obvious adjacent features someone would
  reflexively ask for]

## 6. Feasibility Signal

[Light sanity check against Next.js + Supabase — not a technical design. Flag anything that
looks like a stack mismatch (heavy real-time, video processing, massive compute) without trying
to solve it here.]

## 7. Tenancy Signal

[Early hint only, e.g. "likely multi-tenant, B2B, org-based." The final Tenancy Decision still
belongs to ashley, asked formally during Bootstrap — this is context for that conversation, not
a substitute for it.]

---

## Open Questions Carried Forward

- [Anything Eva flagged but couldn't fully resolve — for ashley or the user to pick up later]

## Handoff Note

[One line: what should ashley plan first — the very first MVP feature from section 4 that makes
sense as the initial build.]
```

## Notes for Eva

- **Don't pad this file with process narrative.** Every section is the answer itself, not a
  transcript of how the answer was reached.
- **Status: In Progress** means the grill is still open — don't let a partially-filled file sit
  as if it were final; either keep going in the same session or say plainly that it's paused.
- **Status: Confirmed** only after the user has explicitly approved the summarized concept —
  never flip this on an implied yes.
