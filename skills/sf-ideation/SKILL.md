---
name: sf-ideation
description: >
  Use this skill when the user wants to brainstorm, explore, or generate enhancement ideas for
  existing Salesforce components/features OR new feature concepts. Trigger when the user says
  "ide enhancement", "ada ide baru?", "kira-kira bisa ditambah apa?", "what can we improve?",
  "fitur baru", "improve this component", "enhancement ideas", or asks for creative suggestions
  about LWC components, Apex classes, flows, or the overall platform. Also use when reviewing
  a component and proactively spotting improvement opportunities.
---

# Salesforce Ideation Skill

## Purpose
Generate actionable, prioritized enhancement ideas — either for existing components/features
or as proposals for new features — grounded in the project's current codebase and tech stack.

---

## Existing Components in This Project

### LWC
| Component | Purpose |
|---|---|
| `caseAIAssistant` | AI chat interface for Case — async response via Platform Event |
| `projectAssetImport` | Form/modal UI for importing project assets |
| `activityHistoryEnhanced` | Enhanced activity timeline display |

### Apex
| Class | Purpose |
|---|---|
| `CaseAssistantController` | Backend for caseAIAssistant — handles AI callout, TXT attach |
| `AIAssistantWrapper` | Wrapper/model for AI response data |
| `AssetImportController` | Backend for projectAssetImport |

---

## Ideation Framework

### For Existing Components — 5 Lenses
When exploring enhancements for an existing component, evaluate through these lenses:

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

### For New Features — Discovery Questions
Before generating ideas for net-new features, consider:
- What pain point does this solve for the end user?
- Does Salesforce have a native feature that partially solves this? (avoid reinventing)
- Which existing components/objects would this touch?
- Is this declarative (Flow/admin) or requires custom code?
- What is the rough build complexity: S / M / L / XL?

---

## Output Format

### Enhancement Ideas Output
Always structure ideas in a prioritized table:

```
## Enhancement Ideas — [Component/Feature Name]

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
using the project's stack (LWC + Apex + SF CLI).

### New Feature Proposal Output
```
## Feature Proposal — [Feature Name]

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

- **Always ground ideas in the existing stack** — LWC + Apex + Salesforce declarative tools.
  Do not suggest third-party tools unless explicitly asked.
- **Reference existing components** where relevant — e.g. "extend `caseAIAssistant` to also..."
- **Follow project standards** — any LWC idea must include `:host` brand tokens + version badge.
  Any Apex idea must follow bulkification + try-catch + CRUD check patterns.
- **No gold-plating** — ideas should solve a real need, not add complexity for its own sake.
- **Be opinionated** — don't just list options, recommend the best one and explain why.
- **Think Salesforce seasons** — flag if an idea aligns with an upcoming Salesforce release
  feature (Summer '26, Winter '27) that could reduce build effort.

---

## Quick Triggers

| User says... | What to do |
|---|---|
| "ide untuk [component]" | Run all 5 lenses on that component, output enhancement table |
| "fitur baru apa yang bisa kita buat?" | Ask 2-3 discovery questions, then propose 3 feature ideas |
| "kira-kira [component] bisa ditambah apa?" | Focus on Functionality Gap + UX lenses first |
| "prioritas enhancement mana yang paling worth it?" | Rank by impact/effort ratio, recommend top 1 |
| "ada yang bisa diimprove dari sisi performance?" | Focus on Performance lens across all components |
