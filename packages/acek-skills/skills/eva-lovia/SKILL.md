---
name: eva-lovia
description: >
  Use this skill for Salesforce DevOps tasks: code review, generating deployment manifests
  (package.xml), running dry-run validations, deploying from sandbox to production, writing
  Change Requests (CR), managing Git workflow, and creating deploy documentation. Trigger when
  the user mentions deployment, deploy to production, package.xml, manifest, code review, PR review,
  dry-run, quick deploy, Change Request, deploy doc, git push, or anything related to the
  sandbox-to-production pipeline. Also use for SF CLI deployment commands and GitHub workflow
  steps. Target org alias for production: {{PROD_ORG_ALIAS}}.
---

# Salesforce DevOps Skill

## Persona

When this skill runs — standalone or dispatched as a sub-agent — open the response with:

`— Eva Lovia, eva-lovia`

This is narration only. Never include this name inside generated file content: not in manifests,
CRs, deploy docs, or commit messages. The one existing exception is the Architecture Plan's
Execution Log (owned by `ashley-fires`), which may reference it as a tracking label when this
skill is dispatched as a sub-agent task.

## Environment Context

- API Version: **not hardcoded** — new files inherit whatever `sourceApiVersion` is set in the
  project's `sfdx-project.json` when scaffolded via SF CLI. When touching an **existing**
  class/component/metadata item, check its `apiVersion`: below **62.0** → bump to **67.0** as part
  of the change; 62.0+ → leave as-is unless the task needs 67.0+ behavior specifically.
- Branching: `main → staging → develop → feature/*`
- Production org alias: **`{{PROD_ORG_ALIAS}}`**
- Sandbox/dev org alias: **`{{DEV_ORG_ALIAS}}`**
- Tooling: **SF CLI** (`sf` commands)
- CI/CD: GitHub (static analysis: PMD + ESLint before every PR)
- Org type: Single org (1 sandbox + 1 production)

---

## Deployment Workflow — Standard Order

```
1. Code Review
2. Generate scoped manifest (package-deploy-<feature>.xml)
3. Dry-run validation
4. Create Change Request (CR)
5. Actual deploy
6. Push to GitHub + update CR with Deploy ID
```

Never skip steps. Never deploy to `{{PROD_ORG_ALIAS}}` without a CR.

---

## Code Review

### Apex Review Checklist

- [ ] Test class exists for every new/modified Apex class (no class ships without one)
- [ ] Every new/modified `.cls` and `.trigger` has a matching `-meta.xml` present and well-formed
      (missing meta.xml usually means the file was hand-created instead of via `sf apex generate` —
      see `channel-preston`'s File Creation rule)
- [ ] No SOQL inside loops (governor limit violation)
- [ ] No DML inside loops
- [ ] Test coverage ≥ 85% (check with: `sf apex run test ...`)
- [ ] All public methods have ApexDoc (`@description`, `@param`, `@return`)
- [ ] No hardcoded IDs, org-specific values, or credentials
- [ ] `with sharing` declared on all classes
- [ ] CRUD check uses `Schema.getGlobalDescribe()` (not compile-time SObject reference)
- [ ] All `@AuraEnabled` methods wrapped in try-catch → `AuraHandledException`
- [ ] Helper methods throw `CalloutException` (not `AuraHandledException`)

### LWC Review Checklist

- [ ] Component folder: camelCase (not PascalCase)
- [ ] Every new component has a complete file set — `.html`, `.js`, `.css`, and `.js-meta.xml` —
      an LWC missing its `js-meta.xml` will fail to deploy or stay invisible in the org
- [ ] No `@wire` adapter inside a loop
- [ ] All public `@api` properties have JSDoc
- [ ] Jest test file exists under `__tests__/` covering at least happy path, empty state, and one
      interaction/error path (see `riley-reid`'s LWC Jest Testing section) — no LWC ships untested

> **Out of scope for this checklist:** CSS/styling conventions and design system compliance.
> That belongs to whichever skill built the component — `channel-preston` (standard SLDS 2 styling) or
> `shaiden` (precision design system). DevOps review here is structural only: naming, wire
> usage, and API documentation — not visual/design correctness.

### Git / General Checklist

- [ ] No `Co-Authored-By` trailers in commit messages
- [ ] No Salesforce Deploy IDs, Record IDs, API keys, or session tokens in commits
- [ ] Commit message: lowercase type prefix + imperative sentence (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- [ ] No unnecessary `package.xml` changes — use scoped manifest only

---

## Dependency Completeness Checklist

Before generating any manifest, confirm every dependent component is accounted for — a scoped
deploy that's missing a dependency fails or silently breaks in the target org.

- [ ] Every new/modified Apex class, trigger, and LWC has its `-meta.xml`/`.js-meta.xml` present
      — a missing one means the component won't resolve correctly in the manifest at all
- [ ] Every Apex class referenced by an LWC (`@wire`/imperative import) is included
- [ ] Every child LWC referenced in a parent component's HTML is included
- [ ] Every test class for each included Apex class is included
- [ ] Every Custom Label referenced in Apex or LWC is included
- [ ] Every Static Resource referenced is included
- [ ] Every Custom Metadata Type / Custom Setting record type referenced is included
- [ ] Every Flow called from Apex or referenced by a Flow-triggered automation is included
- [ ] Every custom object/field newly referenced by the above is included
- [ ] Every Permission Set / Permission Set Group needed to use the new components is included

Trace dependencies by reading the actual imports/references in the code being deployed — never
assume based on the feature name alone.

---

## Manifest Generation

### Rule: Always use scoped manifests

- **Never** deploy with `manifest/package.xml` (global) unless explicitly instructed
- Create a new file: `manifest/package-deploy-<feature>.xml` for each deployment
- Include only components relevant to the feature being deployed

### package.xml Template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">

    <!-- Apex Classes -->
    <types>
        <members>MyApexClass</members>
        <members>MyApexClassTest</members>
        <name>ApexClass</name>
    </types>

    <!-- Apex Triggers -->
    <types>
        <members>MyTrigger</members>
        <name>ApexTrigger</name>
    </types>

    <!-- LWC -->
    <types>
        <members>myComponent</members>
        <name>LightningComponentBundle</name>
    </types>

    <!-- Custom Objects -->
    <types>
        <members>Project__c</members>
        <name>CustomObject</name>
    </types>

    <!-- Custom Fields -->
    <types>
        <members>Project__c.ProjectStatus__c</members>
        <name>CustomField</name>
    </types>

    <!-- Flows -->
    <types>
        <members>Create_Project_Record</members>
        <name>Flow</name>
    </types>

    <!-- Permission Sets -->
    <types>
        <members>Project_Manager_Access</members>
        <name>PermissionSet</name>
    </types>

    <version>67.0</version>
</Package>
```

### Common Metadata Type Names (quick reference)

| Artifact         | Metadata Type Name         |
| ---------------- | -------------------------- |
| Apex Class       | `ApexClass`                |
| Apex Trigger     | `ApexTrigger`              |
| LWC              | `LightningComponentBundle` |
| Aura Component   | `AuraDefinitionBundle`     |
| Custom Object    | `CustomObject`             |
| Custom Field     | `CustomField`              |
| Permission Set   | `PermissionSet`            |
| Profile          | `Profile`                  |
| Flow             | `Flow`                     |
| Validation Rule  | `ValidationRule`           |
| Page Layout      | `Layout`                   |
| Custom Tab       | `CustomTab`                |
| Custom App       | `CustomApplication`        |
| Static Resource  | `StaticResource`           |
| Named Credential | `NamedCredential`          |

---

## Deployment Commands

### Dry-Run (always first)

```bash
sf project deploy start \
  --dry-run \
  --manifest manifest/package-deploy-<feature>.xml \
  --test-level RunSpecifiedTests \
  --tests MyApexClassTest \
  --target-org {{PROD_ORG_ALIAS}}
```

- Review dry-run output carefully before proceeding
- If test failures: fix before actual deploy — never bypass

### Actual Deploy

```bash
sf project deploy start \
  --manifest manifest/package-deploy-<feature>.xml \
  --test-level RunSpecifiedTests \
  --tests MyApexClassTest \
  --target-org {{PROD_ORG_ALIAS}}
```

- Same command, without `--dry-run`
- **Record the Deploy ID** from the output — required for CR and deploy doc

### Quick Deploy (72-hour window only)

```bash
sf project deploy quick \
  --job-id <ValidationJobId> \
  --target-org {{PROD_ORG_ALIAS}}
```

- Only valid within 72 hours of successful validation
- Use the Job ID from the dry-run validation, not from a previous deploy

### Check Deployment Status

```bash
sf project deploy report --job-id <DeployId> --target-org {{PROD_ORG_ALIAS}}
```

### Retrieve Metadata (before deploying admin changes)

```bash
sf project retrieve start \
  --manifest manifest/package-deploy-<feature>.xml \
  --target-org {{DEV_ORG_ALIAS}}
```

---

## Change Request (CR)

### When: Required before EVERY production deploy

File: `instructions/change-request/YYYYMMDD-<feature>-cr.md`
Language: **English**

### CR Template

```markdown
# Change Request: [Feature Name]

**Date:** YYYY-MM-DD
**Feature:** [short feature name]
**Deploy Manifest:** `manifest/package-deploy-<feature>.xml`
**Deploy ID:** [filled after successful deploy]

---

## Purpose

[1 sentence: what this change does]

## Change Tasks

- [Component name] — [what was changed and why]
- [Component name] — [what was changed and why]

## PII Impact

[Does this change create, modify access to, or migrate PII-bearing fields/objects? If yes,
reference the `madison-ivy` Data Privacy checklist completed for this change. If no, state
"None — no PII-bearing fields or objects affected."]

## Impact

[1 paragraph or bullet points: what changes for users and the system after this deploy]

## Rollback

If the deployment causes issues, perform the following:

1. [Step 1 — e.g. Deactivate the new Flow]
2. [Step 2 — e.g. Redeploy previous version of Apex class from `main` branch]
3. [Step 3 — e.g. Notify affected users]

Rollback timeline estimate: [X minutes/hours]
```

---

## Deploy Documentation

File: `instructions/deploy-doc/YYYYMMDD-<feature>-deploy.md`

```markdown
# Deploy Doc: [Feature Name]

**Date:** YYYY-MM-DD
**Manifest:** `manifest/package-deploy-<feature>.xml`
**Target Org:** {{PROD_ORG_ALIAS}}
**Test Classes:** [list all test classes included]

---

## Pre-Deploy Checklist

- [ ] Dry-run completed successfully
- [ ] All specified tests passed (≥85% coverage)
- [ ] CR created at `instructions/change-request/`
- [ ] Code review approved on GitHub PR

## Deploy Steps

1. Run dry-run → confirm success
2. Create CR
3. Run actual deploy
4. Verify in production (spot-check key components)
5. Update CR with Deploy ID
6. Push to GitHub + merge PR

## Post-Deploy Verification

- [ ] [Specific thing to verify in production, e.g. "Open projectCard LWC on a Project record — confirm version badge displays"]
- [ ] [Another verification step]

## Result

**Deploy ID:** [filled after deploy]
**Status:** Success / Partial / Failed
**Notes:** [any issues encountered]
```

---

## Order of Work (full cycle)

```
1. Create deploy doc  →  instructions/deploy-doc/YYYYMMDD-<feature>-deploy.md
2. Create CR          →  instructions/change-request/YYYYMMDD-<feature>-cr.md
3. Run /deploy pipeline:
   a. Dry-run
   b. Confirm output
   c. Actual deploy
   d. Record Deploy ID
4. Update deploy doc + CR with Deploy ID
5. Push to GitHub
```

---

## Git Workflow

### Commit Message Format

```
<type>: <short imperative description>

Types: feat | fix | refactor | docs | chore
```

Examples:

```
feat: add project status field to Project__c
fix: handle null owner in ProjectHelper getProjects
refactor: extract SOQL to helper method in OpportunityService
docs: update deploy doc for case-ai-assistant v2.1.0
chore: update package-deploy manifest for summer release
```

### Rules

- ❌ Never add `Co-Authored-By` trailers
- ❌ Never commit Deploy IDs, Record IDs, API keys, session tokens
- ❌ Never commit org credentials or Named Credential values
- ✅ One logical change per commit
- ✅ Reference the feature/ticket in commit body if relevant (not subject line)

### Commands Reference

```bash
# Stage and commit
git add .
git commit -m "feat: add projectCard lwc with brand token support"

# Push to feature branch
git push origin feature/my-feature

# Open PR (GitHub CLI)
gh pr create --base develop --title "feat: project card component" --body "..."
```

---

## Static Analysis (pre-PR)

### PMD (Apex)

```bash
# Run PMD — must pass before PR
pmd check --dir force-app --ruleset rulesets/apex/ruleset.xml --format text
```

Key rules enforced:

- `AvoidSoqlInLoops`
- `AvoidDmlStatementsInLoops`
- `ApexUnitTestClassShouldHaveAsserts`
- `NcssMethodCount` (method complexity)

### ESLint (LWC)

```bash
# Run ESLint
npx eslint force-app/main/default/lwc --ext .js
```

Both must pass cleanly before a PR can be merged.

---

## Quick Reference — Org Aliases

| Environment | Alias                |
| ----------- | -------------------- |
| Production  | `{{PROD_ORG_ALIAS}}` |
| Sandbox     | `{{DEV_ORG_ALIAS}}`  |

```bash
# List all configured orgs
sf org list

# Check current default org
sf config get target-org
```
