---
name: sf-dev
description: >
  Use this skill for ANY Salesforce custom development task: writing or reviewing Apex classes,
  triggers, batch jobs, test classes, SOQL queries, LWC components (HTML/JS/CSS), Aura components,
  and integration patterns. Trigger this skill whenever the user mentions Apex, LWC, SOQL, triggers,
  @AuraEnabled, @wire, REST/SOAP callouts, platform events, or asks to build/fix/refactor any
  Salesforce code. Also use when the user asks about governor limits, test coverage, or debugging
  Salesforce-specific runtime errors.
---

# Salesforce Developer Skill

## Environment Context

- API Version: **not hardcoded** — new files inherit whatever `sourceApiVersion` is set in the
  project's `sfdx-project.json` when scaffolded via SF CLI (see [File
  Creation](#-file-creation--always-via-sf-cli-never-manual) below — this is one more reason to
  always generate, never hand-create). When touching an **existing** class/component, check its
  `apiVersion`: below **62.0** → bump to **67.0** as part of the change; 62.0+ → leave as-is unless
  the task needs 67.0+ behavior specifically.
- Tooling: **SF CLI** (`sf` commands)
- Apex LSP: **offline** — never use compile-time SObject type references that require org metadata
- Version control: **GitHub** (branching: `main → staging → develop → feature/*`)

---

## ⚠️ File Creation — Always via SF CLI, Never Manual

**Every new Apex class, trigger, or LWC component is scaffolded with the SF CLI generate
commands — never created by hand-writing the files directly.** Manual creation is the #1 cause of
a missing/malformed `-meta.xml` companion file, which fails deployment or leaves the component
invisible in the org. The CLI generates the correct file set — including the meta.xml — every
time, so this class of bug is structurally prevented rather than caught in review.

```bash
# New Apex class (also use for test classes — e.g. MyClassTest)
sf apex generate class --name MyClass --output-dir force-app/main/default/classes

# New Apex trigger
sf apex generate trigger --name MyTrigger --sobject Account --event "before insert,before update" --output-dir force-app/main/default/triggers

# New LWC component — generates .html, .js, .css, and .js-meta.xml together
sf lightning generate component --name myComponent --type lwc --output-dir force-app/main/default/lwc

# New Aura component (only if the project still uses Aura)
sf lightning generate component --name myAuraCmp --type aura --output-dir force-app/main/default/aura
```

After generating, edit the generated file's content in place — don't delete and recreate it by
hand. This rule applies to brand-new files only; editing an existing class/component's content
uses normal file edits as usual.

**If the SF CLI isn't available in the environment**, fall back to creating the full file set by
hand — but then explicitly double-check the `-meta.xml` exists and is correctly formed before
considering the file created (see [File Structure](#file-structure) below for the required set).

---

## Apex — Core Rules

### ⚠️ API 67.0+ Default Security Model (Summer '26) — read this before writing DML/SOQL

Starting API version 67.0, **Apex database operations run in user mode by default** — SOQL,
SOSL, DML, and `Database.*` methods automatically enforce the running user's object permissions,
field-level security, and sharing rules, unless the code explicitly opts into system mode.
`WITH SECURITY_ENFORCED` has been **removed** — it's redundant now, delete it if migrating older
code.

This changes what manual CRUD/FLS checks are _for_, but does not eliminate the need for them:

| Situation                                                                                        | What happens                                                                     |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Class has no explicit `AccessLevel` on DML/SOQL, API ≥ 67.0                                      | User mode — platform enforces CRUD/FLS/sharing automatically                     |
| Class needs to bypass user permissions intentionally (e.g. system job, aggregation across users) | Must **opt in explicitly** to system mode — see below                            |
| Class targets an org/component still on API < 67.0                                               | Old system-mode-by-default behavior still applies — manual checks still required |

**Opt in to system mode when genuinely needed:**

```apex
// Explicit system mode — bypasses user's CRUD/FLS/sharing for this operation only
List<Account> accts = Database.query(
    'SELECT Id, Name FROM Account',
    AccessLevel.SYSTEM_MODE
);

Database.insert(newRecords, AccessLevel.SYSTEM_MODE);
```

**Why you still write explicit checks even under user mode:**

- Default enforcement throws a generic platform error — an explicit `isCreateable()`/`isUpdateable()`
  check lets you throw a clear, custom `AuraHandledException` message instead
- `without sharing` classes still bypass **record-level** sharing even in user mode — object/field
  permissions are enforced, sharing is not, so record-level guard logic is still your job
- Batch/Queueable/Schedulable/Trigger context still defaults to **system mode regardless of API
  version** (this hasn't changed) — any of those touching user-supplied data still need manual
  CRUD/FLS checks

**Field-level checks — use `Security.stripInaccessible()` instead of manual per-field loops:**

```apex
// ✅ Strips inaccessible fields from records before returning/using them — no compile-time
// SObject reference needed, works fine with offline LSP
SObjectAccessDecision decision = Security.stripInaccessible(
    AccessType.READABLE,
    [SELECT Id, Name, SensitiveField__c FROM Account]
);
List<Account> safeRecords = decision.getRecords();

// Also works for CREATABLE / UPDATABLE before DML
SObjectAccessDecision writeDecision = Security.stripInaccessible(
    AccessType.CREATABLE,
    newAccountList
);
insert writeDecision.getRecords();
```

Prefer this over manual `fields.getMap()` loops — one call covers the whole field set and it's the
platform-recommended pattern since API 48.0.

---

### Governor Limits (non-negotiable)

- **No SOQL inside loops** — always bulkify; query outside the loop, store in Map/List
- **No DML inside loops** — collect records, DML once after loop
- **No callouts inside loops**
- Minimum test coverage: **85%** (aim for 90%+)

### Security Patterns

> See [API 67.0+ Default Security Model](#-api-670-default-security-model-summer-26--read-this-before-writing-dmlsoql)
> above — object/field permissions are enforced by default now. The checks below are still good
> practice for custom error messages and for code paths that must run in system mode.

```apex
// ✅ CRUD check — use Schema.getGlobalDescribe() (LSP-safe)
if (!Schema.getGlobalDescribe().get('ObjectName').getDescribe().isCreateable()) {
    throw new AuraHandledException('Insufficient permissions.');
}

// ❌ NEVER use compile-time reference (LSP offline can't resolve)
// if (!ContentVersion.SObjectType.getDescribe().isCreateable()) { ... }
```

- `ContentDocumentLink`: skip explicit CRUD check — junction object protected by `with sharing` + try-catch
- For field-level checks, prefer `Security.stripInaccessible()` (see above) over manual per-field
  `fields.getMap()` loops — it needs no compile-time SObject reference either
- All classes handling user data: use **`with sharing`** — note this still governs record-level
  sharing even under API 67.0's user-mode-by-default; it is not made redundant by the version bump
- Never `System.debug()` full PII values (full name + email + phone together, national ID,
  financial identifiers) — truncate or mask before logging (`'***' + phone.right(4)`); debug logs
  are exportable and often over-retained. See `sf-security-review`'s PII & Data Privacy section.

### @AuraEnabled Methods

```apex
@AuraEnabled
public static Result myMethod(String param) {
    try {
        // business logic
    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}
```

- Always wrap DML in try-catch → re-throw as `AuraHandledException`
- Private helper methods: throw `CalloutException` (caller wraps it)

### Exception Behavior (Salesforce by design)

- `AuraHandledException.getMessage()` in test context **always** returns `'Script-thrown exception'`
- In test assertions: `Assert.areEqual('Script-thrown exception', e.getMessage())` — **the expected
  string itself never changes, regardless of which assertion API you use**

### Naming Conventions

| Type         | Convention                 | Example                               |
| ------------ | -------------------------- | ------------------------------------- |
| Apex Class   | PascalCase                       | `AccountHelper`, `OpportunityService` |
| Test Class   | PascalCase + `Test` suffix       | `AccountHelperTest`                   |
| Apex Trigger | `<Object>Trigger`, one per object | `AccountTrigger`, `OpportunityTrigger` |
| Custom Field | PascalCase\_\_c                  | `ProjectStatus__c`                    |
| Variable     | camelCase                        | `accountList`, `oppMap`               |

### ApexDoc (required on all public methods)

```apex
/**
 * @description Brief description of what this method does
 * @param recordId The ID of the record to process
 * @return List of processed results
 * @throws AuraHandledException if user lacks required permissions
 */
@AuraEnabled
public static List<Result__c> processRecord(Id recordId) { ... }
```

### Test Class Pattern

Full test class structure, `TestDataFactory` usage, callout/platform-event mocking, and assertion
conventions are owned by `sf-testing` — follow that skill's pattern exactly rather than
improvising a competing one here. Two things worth remembering while writing the code being
tested:

- `AuraHandledException.getMessage()` always returns `'Script-thrown exception'` in test context
  (Salesforce by design) — the test asserting your exception path is expected to check this exact
  string, not your real error message
- Structure the method so `Test.startTest()` / `Test.stopTest()` around the call actually resets
  governor limits and forces async paths (Queueable, `@future`, Platform Events) to run — don't
  write logic that fights that boundary

---

## SOQL — Best Practices

```apex
// ✅ Bulkified pattern
Map<Id, Account> accountMap = new Map<Id, Account>(
    [SELECT Id, Name, OwnerId FROM Account WHERE Id IN :accountIds]
);

// ✅ Aggregate query
List<AggregateResult> results = [
    SELECT StageName, COUNT(Id) total
    FROM Opportunity
    WHERE CloseDate = THIS_YEAR
    GROUP BY StageName
];

// ❌ Never SOQL in loop
for (Account acc : accounts) {
    List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :acc.Id]; // WRONG
}
```

- Selective WHERE clauses: always filter on indexed fields (Id, Name, ExternalId\_\_c, lookup fields)
- Avoid `SELECT *` — always specify fields explicitly
- Use `LIMIT` on unbounded queries

---

## LWC — Core Rules

### File Structure

Generated via `sf lightning generate component` (see
[File Creation rule](#-file-creation--always-via-sf-cli-never-manual) above) — never assembled by
hand:

```
force-app/main/default/lwc/
└── myComponent/
    ├── myComponent.html
    ├── myComponent.js
    ├── myComponent.css
    └── myComponent.js-meta.xml
```

### Naming

- Component folder: **camelCase** (`accountCard`, `opportunityList`)
- Never PascalCase for LWC folders

### Standard Styling — SLDS 2 Global Hooks

LWC styling in this skill uses **SLDS 2 global hooks directly** — no custom token block, no
project-specific brand variables. This is the baseline/standard approach for straightforward
component work.

> **For full brand-identity design work** — a defined token system, typography scale, signature
> elements, and cross-component consistency scoring — use the **`shaiden`** skill instead. It's a
> separate, more thorough design workflow. Don't mix the two conventions on the same component.

**Rules:**

- Always `var(--slds-g-*, fallback)` — never hardcode hex, px, or rem
- Never override `.slds-*` classes directly — use custom classes with BEM naming
  (`.myComponent__header`)
- Fallback value is mandatory on every `var()` call

**Common hooks — quick reference (baseline subset):**

```css
/* Surface & text */
background-color: var(--slds-g-color-surface-container-1, #ffffff);
color: var(--slds-g-color-on-surface-1, #181818);
border: 1px solid var(--slds-g-color-border-1, #e5e5e5);

/* Brand accent */
color: var(--slds-g-color-brand-base-50, #0176d3);

/* Spacing */
padding: var(--slds-g-spacing-4, 1rem);
gap: var(--slds-g-spacing-2, 0.5rem);

/* Typography */
font-size: var(--slds-g-font-size-4, 0.875rem);
font-weight: var(--slds-g-font-weight-bold, 700);

/* Radius */
border-radius: var(--slds-g-radius-border-2, 0.25rem);
```

For the full hook reference (color, spacing, typography, radius, shadow, motion) and a proper
design/critique workflow, use `shaiden`.

### Version Badge — optional, project convention

Some projects display a version + release-season badge on a component's header for support/debug
purposes (`v2.1.0+S'26`). This is not required by this skill — apply it only if the project has
adopted the convention, and style it with the same SLDS 2 hooks above rather than custom variables:

```html
<span class="myComponent__version-badge"
	>v1.0.0<span class="myComponent__version-badge-season">+S'26</span></span
>
```

```css
.myComponent__version-badge {
	display: inline-block;
	font-size: var(--slds-g-font-size-1, 0.625rem);
	font-weight: var(--slds-g-font-weight-bold, 700);
	color: var(--slds-g-color-brand-base-50, #0176d3);
	background: var(--slds-g-color-brand-base-95, #e8f4ff);
	border: 1px solid var(--slds-g-color-border-1, #e5e5e5);
	border-radius: var(--slds-g-radius-border-4, 1rem);
	padding: 1px 7px;
	letter-spacing: 0.5px;
	text-transform: uppercase;
}
```

If used, version increment rules: new feature in a season → bump MINOR, reset PATCH to 0; bugfix
same season → bump PATCH only; next Salesforce season → update SEASON+YEAR, evaluate MINOR bump.

### JS Best Practices

```javascript
import { LightningElement, api, wire, track } from 'lwc';

export default class MyComponent extends LightningElement {
	// @api for public properties (parent → child)
	@api recordId;

	// @track only needed for nested object/array mutation detection
	// primitives are reactive by default

	// ❌ Never use @wire adapter inside a loop
	// ✅ Wire at component level, filter in getter
	@wire(getRelatedItems, { recordId: '$recordId' })
	wiredItems;

	get processedItems() {
		return this.wiredItems.data?.filter((i) => i.Active__c) ?? [];
	}
}
```

- JSDoc required on all public methods and `@api` properties
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safety
- Fire events upward with `CustomEvent`, never call parent methods directly

---

## Integration Patterns

### REST Callout

```apex
HttpRequest req = new HttpRequest();
req.setEndpoint('callout:My_Named_Credential/api/endpoint');
req.setMethod('GET');
req.setTimeout(10000);

HttpResponse res = new Http().send(req);
if (res.getStatusCode() != 200) {
    throw new CalloutException('HTTP ' + res.getStatusCode() + ': ' + res.getBody());
}
```

- Always use Named Credentials — never hardcode URLs or tokens
- Set timeout explicitly
- Throw `CalloutException` in helper; let `@AuraEnabled` caller wrap as `AuraHandledException`

---

## SF CLI — Common Dev Commands

```bash
# Generate new files — see the mandatory rule near the top of this doc
sf apex generate class --name MyClass --output-dir force-app/main/default/classes
sf lightning generate component --name myComponent --type lwc --output-dir force-app/main/default/lwc

# Pull metadata from org
sf project retrieve start --metadata ApexClass:MyClass --target-org <alias>

# Push local source to scratch org
sf project deploy start --target-org <alias>

# Run specific test
sf apex run test --class-names MyClassTest --target-org <alias> --result-format human

# Run all tests
sf apex run test --test-level RunAllTestsInOrg --target-org <alias>

# Open org in browser
sf org open --target-org <alias>

# Execute anonymous Apex
sf apex run --target-org <alias> --file scripts/apex/myScript.apex
```

---

## Code Review Checklist (before every PR)

- [ ] New Apex/LWC/trigger files were scaffolded via SF CLI generate commands, not hand-created
- [ ] Every new Apex class/trigger has a matching `-meta.xml`; every new LWC has `.js-meta.xml`
- [ ] No SOQL/DML inside loops
- [ ] Test coverage ≥ 85%
- [ ] No `@wire` in loops (LWC)
- [ ] All public methods have ApexDoc/JSDoc
- [ ] No hardcoded IDs, credentials, or org-specific values
- [ ] `with sharing` declared on all Apex classes
- [ ] CRUD check present where applicable (using `Schema.getGlobalDescribe()`)
- [ ] Field-level checks use `Security.stripInaccessible()`, not manual per-field loops
- [ ] No `WITH SECURITY_ENFORCED` in SOQL — removed in API 67.0
- [ ] All `@AuraEnabled` methods wrapped in try-catch → `AuraHandledException`
- [ ] LWC uses SLDS 2 hooks (`var(--slds-g-*, fallback)`) — no hardcoded hex/px, no `.slds-*` overrides
- [ ] New/modified LWC has a Jest test file under `__tests__/` — see `sf-testing`'s LWC Jest
      Testing section for the pattern; don't improvise a competing one
- [ ] Version badge present _if the project has adopted that convention_ (not required by default)
