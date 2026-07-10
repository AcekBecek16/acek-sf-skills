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
- API Version: **61.0**
- Tooling: **SF CLI** (`sf` commands)
- Apex LSP: **offline** — never use compile-time SObject type references that require org metadata
- Version control: **GitHub** (branching: `main → staging → develop → feature/*`)

---

## Apex — Core Rules

### Governor Limits (non-negotiable)
- **No SOQL inside loops** — always bulkify; query outside the loop, store in Map/List
- **No DML inside loops** — collect records, DML once after loop
- **No callouts inside loops**
- Minimum test coverage: **85%** (aim for 90%+)

### Security Patterns
```apex
// ✅ CRUD check — use Schema.getGlobalDescribe() (LSP-safe)
if (!Schema.getGlobalDescribe().get('ObjectName').getDescribe().isCreateable()) {
    throw new AuraHandledException('Insufficient permissions.');
}

// ❌ NEVER use compile-time reference (LSP offline can't resolve)
// if (!ContentVersion.SObjectType.getDescribe().isCreateable()) { ... }
```

- `ContentDocumentLink`: skip explicit CRUD check — junction object protected by `with sharing` + try-catch
- FLS check via `evDescribe.fields` not available offline — use object-level `isUpdateable()` only
- All classes handling user data: use **`with sharing`**

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
- In test assertions: `System.assertEquals('Script-thrown exception', e.getMessage())` — **do not change this**

### Naming Conventions
| Type | Convention | Example |
|---|---|---|
| Apex Class | PascalCase | `AccountHelper`, `OpportunityTrigger` |
| Test Class | PascalCase + `Test` suffix | `AccountHelperTest` |
| Custom Field | PascalCase__c | `ProjectStatus__c` |
| Variable | camelCase | `accountList`, `oppMap` |

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
```apex
@isTest
private class AccountHelperTest {
    @TestSetup
    static void makeData() {
        // create test records once for all test methods
    }

    @isTest
    static void testPositivePath() {
        Test.startTest();
        // call method
        Test.stopTest();
        // assert
    }

    @isTest
    static void testNegativePath_insufficientPermission() {
        // test exception path
        try {
            AccountHelper.myMethod(null);
            System.assert(false, 'Expected exception not thrown');
        } catch (AuraHandledException e) {
            System.assertEquals('Script-thrown exception', e.getMessage());
        }
    }
}
```

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

- Selective WHERE clauses: always filter on indexed fields (Id, Name, ExternalId__c, lookup fields)
- Avoid `SELECT *` — always specify fields explicitly
- Use `LIMIT` on unbounded queries

---

## LWC — Core Rules

### File Structure
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

### Brand Theme — MANDATORY `:host` block
Every LWC CSS file must include this exact token block:

```css
:host {
    /* ── Brand ── */
    --brand:        #f37e20;
    --brand-hover:  #d86a13;
    --brand-light:  #ff9f4d;
    --brand-dim:    rgba(243, 126, 32, 0.08);
    --brand-border: rgba(243, 126, 32, 0.22);
    --brand-shadow: rgba(243, 126, 32, 0.2);

    /* ── User Accent ── */
    --user-color:   #0070d2;

    /* ── Text ── */
    --text-primary:   #1d1c1d;
    --text-secondary: #616061;
    --text-muted:     #9b9a9b;

    /* ── Surface ── */
    --surface:      #ffffff;
    --surface-dim:  #f8f8f8;
    --border:       #e8e8e8;
    --border-light: #f0f0f0;

    /* ── Typography ── */
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;

    /* ── Radius ── */
    --r-sm:  4px;
    --r-md:  8px;
    --r-lg:  12px;
    --r-xl:  18px;
    --r-pill: 999px;

    /* ── Transition ── */
    --t: 0.15s ease;
}
```

**Token rules:**
- ❌ Never hardcode `#f37e20` — always `var(--brand)`
- ❌ Never use `var(--lwc-colorTextDefault)` for brand colors
- ✅ Border-radius: always `var(--r-sm/md/lg/xl/r-pill)`
- ✅ Font: `var(--font)` for UI text, `var(--mono)` for code/IDs
- ✅ Transitions: `var(--t)` for hover/active

### Version Badge — MANDATORY on every LWC
Every LWC must display a version badge in its header/initiate screen.

**Format:** `vMAJOR.MINOR.PATCH+SEASON'YEAR` → e.g. `v2.1.0+S'26`
- SEASON codes: `S` = Summer, `Sp` = Spring, `W` = Winter
- YEAR: last 2 digits of Salesforce release year

```html
<!-- HTML pattern -->
<span class="myComponent-version-badge">v1.0.0<span class="badge-season">+S'26</span></span>
```

```css
/* CSS pattern */
.myComponent-version-badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    color: var(--brand);
    background: var(--brand-dim);
    border: 1px solid var(--brand-border);
    border-radius: var(--r-pill);
    padding: 1px 7px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
.myComponent-version-badge .badge-season {
    margin-left: 2px;
    font-weight: 800;
}
```

**Version increment rules:**
- New feature in a season → bump MINOR, reset PATCH to 0
- Bugfix same season → bump PATCH only
- Next Salesforce season → update SEASON+YEAR, evaluate MINOR bump

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
        return this.wiredItems.data?.filter(i => i.Active__c) ?? [];
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
- [ ] No SOQL/DML inside loops
- [ ] Test coverage ≥ 85%
- [ ] No `@wire` in loops (LWC)
- [ ] All public methods have ApexDoc/JSDoc
- [ ] No hardcoded IDs, credentials, or org-specific values
- [ ] `with sharing` declared on all Apex classes
- [ ] CRUD check present where applicable (using `Schema.getGlobalDescribe()`)
- [ ] All `@AuraEnabled` methods wrapped in try-catch → `AuraHandledException`
- [ ] LWC has `:host` brand token block
- [ ] LWC has version badge