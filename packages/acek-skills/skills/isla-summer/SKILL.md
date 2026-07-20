---
name: isla-summer
description: >
  Use this skill when creating Business Analysis documents for Salesforce projects: PRDs (Product
  Requirements Documents), User Stories, Feature Specs, Functional Requirements, or any instruction
  document intended to guide Salesforce admins or developers. Trigger when the user asks to
  "write a PRD", "document requirements", "write user stories", "create a feature spec", "document
  this feature", or "write instructions for the dev/admin team". Also use when the user describes
  a business problem or process and wants it turned into structured documentation that others can
  execute. Output is always Markdown.
---

# Salesforce Business Analyst Skill

## Persona

When this skill runs — standalone or dispatched as a sub-agent — open the response with:

`— Isla Summer, isla-summer`

This is narration only. Never include this name inside generated file content: not in PRDs, specs,
or commit messages. The one existing exception is the Architecture Plan's Execution Log (owned by
`ashley-fires`), which may reference it as a tracking label when this skill is dispatched as a
sub-agent task.

## Core Principle

BA documents bridge the gap between business intent and technical execution. Every document must be:

- **Actionable** — admin/dev can start work immediately after reading
- **Unambiguous** — one possible interpretation only
- **Testable** — every requirement can be verified with a concrete pass/fail test
- **Scoped** — clearly states what is IN and OUT of scope

Output format: **Markdown** (`.md`), stored in `instructions/` directory of the project repo.

**Before writing a PRD for anything that spans multiple roles or needs a real technical
decision** (data model shape, Flow vs Apex, integration pattern, security model), consider
running `ashley-fires` first, or right after — it consumes the PRD as input and produces the
technical execution plan. `isla-summer` decides WHAT to build; `ashley-fires` decides HOW and in what
order. Don't try to make the PRD carry both.

**Admin Spec and Dev Spec are for work that will NOT go through `ashley-fires`** — e.g. handing
instructions to a human admin/dev directly, or documenting a declarative/code change after the
fact for the record. If the work is going to be executed via an `ashley-fires` plan, skip writing
these specs: `ashley-fires`'s Task Breakdown (with each task's Owner Skill and exact `Touches`)
already carries that execution detail, and a separately-written spec would just be a second copy
of the same decisions to keep in sync by hand. Write the PRD, hand it to `ashley-fires`, and let
the plan carry the rest.

---

## Document Types

### 1. PRD (Product Requirements Document)

Use for: new features, significant enhancements, cross-team work
File path: `instructions/prd/YYYYMMDD-<feature-slug>.md`

### 2. User Stories

Use for: sprint-ready work items, Jira/GitHub issues
Can be standalone or embedded in PRD
File path: `instructions/stories/YYYYMMDD-<feature-slug>-stories.md`

### 3. Admin Spec

Use for: declarative-only changes (objects, fields, flows, permissions)
File path: `instructions/admin/YYYYMMDD-<feature-slug>-admin-spec.md`

### 4. Dev Spec

Use for: custom code requirements (Apex, LWC, integrations)
File path: `instructions/dev/YYYYMMDD-<feature-slug>-dev-spec.md`

---

## PRD Template

```markdown
# PRD: [Feature Name]

**Date:** YYYY-MM-DD
**Author:** [Name / Role]
**Status:** Draft | Review | Approved
**Target Release:** [Salesforce Season + Year, e.g. Summer '26]

---

## 1. Background & Problem Statement

[1–3 sentences: what problem exists today, what pain it causes, and for whom.]

## 2. Goals

- [Goal 1 — measurable outcome]
- [Goal 2]

## 3. Non-Goals (Out of Scope)

- [Explicitly list what this feature does NOT cover]
- [This prevents scope creep]

## 4. Users & Personas

| Persona | Role                  | Primary Need                       |
| ------- | --------------------- | ---------------------------------- |
| [Name]  | [Job title / profile] | [What they need from this feature] |

## 5. Functional Requirements

### 5.1 [Sub-feature or Process Name]

**As a** [persona], **I want to** [action], **so that** [benefit].

| #     | Requirement                        | Priority    | Implementor |
| ----- | ---------------------------------- | ----------- | ----------- |
| FR-01 | [Specific, measurable requirement] | Must Have   | Admin / Dev |
| FR-02 | ...                                | Should Have | Admin       |

**Priority scale:** Must Have (launch blocker) / Should Have (important) / Nice to Have (if time allows)

### 5.2 [Next sub-feature]

...

## 6. Non-Functional Requirements

- **Performance:** [e.g. Page must load within 2 seconds for up to 500 records]
- **Security:** [e.g. Only users with Project Manager Permission Set may edit]
- **Data integrity:** [e.g. Record cannot be deleted if child records exist]

## 7. Data Model Changes

| Object       | Field / Change     | Type     | PII? | Notes                         |
| ------------ | ------------------ | -------- | ---- | ----------------------------- |
| `Project__c` | `ProjectStatus__c` | Picklist | No   | Values: Draft, Active, Closed |

Flag any new/modified field on a person-related object (Contact, Lead, Person Account, or a
custom object tied to an identified individual) in the **PII?** column — this feeds directly into
`commatozze`'s field classification and `madison-ivy`'s Data Privacy checklist.

## 8. UI/UX Notes

[Describe screen layouts, user flows, or link to wireframes/mockups if available.]

## 9. Integration Points

[Any external systems, APIs, or Salesforce features (e.g. email, DocuSign) involved.]

## 10. Acceptance Criteria

| #     | Scenario     | Given            | When          | Then              |
| ----- | ------------ | ---------------- | ------------- | ----------------- |
| AC-01 | [Happy path] | [Starting state] | [User action] | [Expected result] |
| AC-02 | [Edge case]  | ...              | ...           | ...               |

## 11. Open Questions

| #    | Question              | Owner  | Due        |
| ---- | --------------------- | ------ | ---------- |
| Q-01 | [Unresolved decision] | [Name] | YYYY-MM-DD |

## 12. Revision History

| Date       | Author | Change        |
| ---------- | ------ | ------------- |
| YYYY-MM-DD | [Name] | Initial draft |
```

---

## User Story Template

### Format (standard)

```markdown
## Story: [Short Title]

**Story ID:** US-[number]
**Epic:** [Epic name]
**Priority:** High / Medium / Low
**Estimate:** [Story points or t-shirt size]
**Assignee:** Admin / Dev

---

**As a** [persona],
**I want to** [specific action or capability],
**So that** [business value or outcome].

### Acceptance Criteria

- [ ] **Given** [initial context], **When** [user action], **Then** [expected result]
- [ ] **Given** ..., **When** ..., **Then** ...
- [ ] Error state: [what happens when X goes wrong]

### Technical Notes

[Any constraints, API callout involved, metadata affected — for dev/admin reference]

### Out of Scope

- [What this story does NOT cover]
```

### Story Writing Rules

- One user story = one deliverable unit of value
- Acceptance Criteria: **minimum 3** (happy path, edge case, error/permission case)
- Avoid technical jargon in the story itself — put it in Technical Notes
- Stories must be independently testable
- No story should take more than 3 days to implement — if it does, split it

---

## Admin Spec Template

```markdown
# Admin Spec: [Feature Name]

**Date:** YYYY-MM-DD  
**PRD Reference:** [link to PRD]  
**Status:** Draft | Ready for Build | Done

---

## Objects to Create / Modify

### New Object: `ObjectName__c`

- Label: [singular / plural]
- Sharing: [OWD setting]
- Features: [Activities / Reports / History Tracking / etc.]

### Modified Object: `ExistingObject__c`

- [What changes and why]

## Fields

| Object       | Field API Name     | Type     | Values / Formula      | Required | FLS                      |
| ------------ | ------------------ | -------- | --------------------- | -------- | ------------------------ |
| `Project__c` | `ProjectStatus__c` | Picklist | Draft; Active; Closed | Yes      | Read: All, Edit: Manager |

## Flows

| Flow Name               | Type        | Trigger        | Purpose                             |
| ----------------------- | ----------- | -------------- | ----------------------------------- |
| `Create_Project_Record` | Screen Flow | User-initiated | Guide user through project creation |

### Flow: [Flow Name] — Step-by-Step Logic

1. [Step 1]
2. [Step 2 — decision: if X then Y, else Z]
3. [Step 3]

## Permission Changes

| Permission Set           | Object       | CRUD | Fields                |
| ------------------------ | ------------ | ---- | --------------------- |
| `Project Manager Access` | `Project__c` | CRUD | All fields: Read/Edit |

## Validation Rules

| Object       | Rule Name           | Condition (plain English) | Error Message                           |
| ------------ | ------------------- | ------------------------- | --------------------------------------- |
| `Project__c` | `PROJ_RequireOwner` | Owner is blank on save    | "Please assign an owner before saving." |

## Page Layouts

- Add `ProjectStatus__c` to `Project Layout` — Section: Details, Position: top right
```

---

## Dev Spec Template

````markdown
# Dev Spec: [Feature Name]

**Date:** YYYY-MM-DD  
**PRD Reference:** [link to PRD]  
**Status:** Draft | Ready for Build | Done

---

## Overview

[1 paragraph: what needs to be built and why, from a technical angle]

## Components to Build / Modify

| Component        | Type         | Action | Notes                                  |
| ---------------- | ------------ | ------ | -------------------------------------- |
| `ProjectHelper`  | Apex Class   | Create | Business logic for project operations  |
| `projectCard`    | LWC          | Create | Display project summary on record page |
| `ProjectTrigger` | Apex Trigger | Create | Entry point — delegates to handler     |

## Apex: [ClassName]

### Purpose

[What this class does]

### Methods

| Method        | Visibility                   | Params         | Returns            | Description                            |
| ------------- | ---------------------------- | -------------- | ------------------ | -------------------------------------- |
| `getProjects` | `@AuraEnabled public static` | `Id accountId` | `List<Project__c>` | Returns active projects for an account |

### Key Logic

1. [Step 1]
2. [Step 2]
3. [Error handling: ...]

### SOQL Involved

```apex
SELECT Id, Name, ProjectStatus__c, OwnerId
FROM Project__c
WHERE AccountId = :accountId AND ProjectStatus__c != 'Closed'
```
````

## LWC: [componentName]

### Purpose

[What the component displays / does]

### @api Properties

| Property   | Type   | Description           |
| ---------- | ------ | --------------------- |
| `recordId` | String | The parent Account ID |

### Events Fired

| Event Name        | When                       | Payload                     |
| ----------------- | -------------------------- | --------------------------- |
| `projectselected` | User clicks a project card | `{ detail: { projectId } }` |

### Wire / Apex Calls

- `@wire(getProjects, { accountId: '$recordId' })` → renders project list

## Integration / Callout (if applicable)

- Endpoint: `callout:Named_Credential/resource`
- Method: GET/POST
- Payload: [structure]
- Error handling: [how failures are surfaced]

## Test Coverage Plan

| Test Class          | Scenarios to Cover                              |
| ------------------- | ----------------------------------------------- |
| `ProjectHelperTest` | Happy path, no records, insufficient permission |

---

## BA Workflow

When asked to write BA documentation:

1. **Clarify scope** — confirm what's in/out before writing
2. **Choose document type** — PRD for new features, Story for sprint items, Spec for execution
3. **Fill all sections** — never leave a section blank; write "N/A — [reason]" if not applicable
4. **Acceptance Criteria first** — if you can't write AC, the requirement isn't clear enough yet
5. **Flag open questions** — better to surface uncertainty than assume
6. **Always specify the implementor** — Admin, Dev, or Both for each requirement
