---
name: sf-security-review
description: >
  Use this skill for Salesforce security reviews, vulnerability analysis, and security pattern
  enforcement. Trigger when the user asks to "review security", "check for vulnerabilities",
  "security audit", "CRUD check", "FLS check", "sharing model", "with sharing", "SOQL injection",
  "XSS in LWC", "hardcoded credentials", "permission check", "PII", "data privacy", "sandbox
  masking", "UU PDP", or when preparing code for production deployment and needing a security
  sign-off checklist. Also use when the user asks about Salesforce Shield, encryption, audit
  trail, data masking, or data visibility concerns.
---

# Salesforce Security Review Skill

## Persona

When this skill runs — standalone or dispatched as a sub-agent — open the response with:

`— Madison Ivy, sf-security-review`

This is narration only. Never include this name inside generated file content: not in CRs, audit
reports, code comments, or commit messages. The one existing exception is the Architecture Plan's
Execution Log (owned by `sf-architect`), which may reference it as a tracking label when this
skill is dispatched as a sub-agent task.

## Environment Context

- API Version: **not hardcoded** — new files inherit whatever `sourceApiVersion` is set in the
  project's `sfdx-project.json` when scaffolded via SF CLI. When reviewing an **existing**
  class/component, check its `apiVersion`: below **62.0** → recommend bumping to **67.0** as part
  of the change; 62.0+ → confirm whether the [API 67.0+ Default Security
  Model](#-api-670-default-security-model-summer-26) applies before deciding whether a missing
  manual check is a real gap.
- Apex LSP: **offline** — use `Schema.getGlobalDescribe()` pattern (not compile-time SObject reference)
- All security decisions must be documented in the relevant CR before production deploy

---

## Security Layers — Salesforce Model

```
1. Org-Level          → Login IP ranges, MFA, session settings
2. Object-Level       → Profiles + Permission Sets (CRUD)
3. Field-Level        → FLS per Profile/Permission Set
4. Record-Level       → OWD + Role Hierarchy + Sharing Rules + Manual Sharing
5. Code-Level         → with sharing, CRUD/FLS checks, no injection
```

All five layers must be considered. Code-level checks (layer 5) cannot compensate for misconfigured org-level settings (layers 1–4).

---

## ⚠️ API 67.0+ Default Security Model (Summer '26)

This is a platform behavior change, not just a version bump — review it before auditing any
class targeting API 67.0+.

**What changed:** Apex database operations (SOQL, SOSL, DML, `Database.*`) now run in **user
mode by default**. Object permissions, field-level security, and sharing are enforced
automatically unless the code explicitly opts into system mode via `AccessLevel.SYSTEM_MODE`.
`WITH SECURITY_ENFORCED` is **removed** — flag it as dead syntax if found in code being reviewed.

**What this means for a security review:**

- Layer 2 and 3 (object/field-level) are now platform-enforced by default for classes on API
  67.0+ — a missing manual CRUD/FLS check on such a class is a **lower-severity finding** than it
  used to be, but still worth flagging for error-message quality (see below)
- Layer 4 (record-level sharing) is **unaffected** — `with sharing` / `without sharing` still
  matters exactly as before, at every API version
- **Batch, Queueable, Schedulable, and Trigger context still default to system mode regardless of
  API version** — this has not changed. Manual CRUD/FLS checks remain necessary there.
- Any `Database.query()` / `Database.insert()` etc. call using `AccessLevel.SYSTEM_MODE` is an
  **intentional bypass** — it must be reviewed like a `without sharing` class: is there a
  documented business reason?
- `Security.stripInaccessible()` (API 48.0+) is the platform-recommended way to enforce
  field-level access on a record set — prefer it over manual per-field checks when reviewing new
  code, since it needs no compile-time SObject reference and covers the whole field set in one call

**Reviewing legacy code (API < 67.0):** the old system-mode-by-default behavior still applies —
manual CRUD/FLS checks are not optional there. Confirm the class's API version before deciding
whether a missing check is a real gap or now platform-covered.

---

## Apex Security — Core Patterns

### 1. Sharing Keywords (mandatory)

```apex
// ✅ Use on all classes — enforces record-level security
public with sharing class AccountService { }

// Only acceptable on service classes called by other with sharing classes
// AND where cross-user data access is explicitly required by business logic
public without sharing class SystemEventLogger { }

// Inherited — use for inner/helper classes that delegate sharing to caller
public inherited sharing class AccountSelector { }
```

**Rule:** Default to `with sharing`. Document every `without sharing` with a comment explaining why.

### 2. CRUD Check — LSP-Safe Pattern

```apex
// ✅ CORRECT — works with offline LSP (no org metadata needed)
if (!Schema.getGlobalDescribe().get('Account').getDescribe().isCreateable()) {
    throw new AuraHandledException('Insufficient access to create Account records.');
}

// ✅ For update
if (!Schema.getGlobalDescribe().get('Account').getDescribe().isUpdateable()) {
    throw new AuraHandledException('Insufficient access to update Account records.');
}

// ✅ For delete
if (!Schema.getGlobalDescribe().get('Account').getDescribe().isDeletable()) {
    throw new AuraHandledException('Insufficient access to delete Account records.');
}

// ❌ NEVER — compile-time reference, fails with offline LSP
if (!Account.SObjectType.getDescribe().isCreateable()) { ... }
```

**Exception — `ContentDocumentLink`:**
Skip explicit CRUD check for this junction object — it cannot be resolved by offline LSP.
Protect via `with sharing` + try-catch wrapper instead.

### 3. FLS Check

```apex
// ✅ Object-level isUpdateable() — safe with offline LSP
if (!Schema.getGlobalDescribe().get('Account').getDescribe().isUpdateable()) {
    throw new AuraHandledException('Insufficient access.');
}

// ✅ PREFERRED — Security.stripInaccessible() for field-level enforcement (API 48.0+)
// No compile-time SObject reference needed, covers the full field set in one call
SObjectAccessDecision decision = Security.stripInaccessible(
    AccessType.READABLE,
    [SELECT Id, Name, SensitiveField__c FROM Account]
);
List<Account> safeRecords = decision.getRecords();

// Also available for writes:
SObjectAccessDecision writeDecision = Security.stripInaccessible(AccessType.UPDATABLE, recordsToUpdate);
update writeDecision.getRecords();
```

**Note:** manual per-field `fields.getMap()` loops are unnecessary — `Security.stripInaccessible()`
does not require a compile-time SObject reference either, so it works fine with an offline LSP and
should be the default pattern for field-level enforcement on any record set.

Under API 67.0+, both object- and field-level checks are also enforced automatically in user
mode — see [API 67.0+ Default Security Model](#-api-670-default-security-model-summer-26) above.
These explicit checks are still worth keeping for custom error messaging and for any code that
runs in system mode (Batch/Queueable/Schedulable/Trigger context, or explicit
`AccessLevel.SYSTEM_MODE`).

### 4. Exception Wrapping

```apex
// ✅ @AuraEnabled methods — always wrap, re-throw as AuraHandledException
@AuraEnabled
public static Result processRecord(Id recordId) {
    try {
        validateAccess();
        return doWork(recordId);
    } catch (AuraHandledException e) {
        throw e; // re-throw as-is
    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}

// ✅ Private helper / callout methods — throw CalloutException
// Caller (@AuraEnabled method) wraps it
private static String callExternalSystem(String payload) {
    HttpResponse res = new Http().send(buildRequest(payload));
    if (res.getStatusCode() != 200) {
        throw new CalloutException('HTTP ' + res.getStatusCode() + ': ' + res.getBody());
    }
    return res.getBody();
}
```

### 5. SOQL Injection Prevention

```apex
// ❌ VULNERABLE — string concatenation in dynamic SOQL
String query = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';
List<Account> results = Database.query(query);

// ✅ SAFE — bind variables (preferred for all cases)
List<Account> results = [SELECT Id FROM Account WHERE Name = :userInput];

// ✅ SAFE — if dynamic SOQL required, escape the input
String safeInput = String.escapeSingleQuotes(userInput);
String query = 'SELECT Id FROM Account WHERE Name = \'' + safeInput + '\'';
List<Account> results = Database.query(query);
```

**Rule:** Always prefer bind variables (`:variable`) in SOQL. Dynamic SOQL only when absolutely necessary (dynamic field names, dynamic object names). Always `escapeSingleQuotes()` on any user-supplied string in dynamic SOQL.

### 6. No Hardcoded Values

```apex
// ❌ NEVER — hardcoded ID, credential, or org-specific value
String endpoint = 'https://api.myorg.salesforce.com/services/data/v67.0';
Id recordTypeId = '012000000000XXXAAA';

// ✅ Named Credentials for endpoints
req.setEndpoint('callout:My_Named_Credential/resource');

// ✅ Query for Record Type ID at runtime
Id recordTypeId = Schema.getGlobalDescribe()
    .get('Opportunity')
    .getDescribe()
    .getRecordTypeInfosByDeveloperName()
    .get('Enterprise')
    .getRecordTypeId();

// ✅ Custom Metadata / Custom Settings for configurable values
My_Config__mdt config = [SELECT Endpoint_URL__c FROM My_Config__mdt LIMIT 1];
```

---

## LWC Security

### 1. XSS Prevention

```html
<!-- ✅ SAFE — lwc:text auto-escapes output -->
<p lwc:text="{userGeneratedContent}"></p>

<!-- ❌ DANGEROUS — renders raw HTML, XSS risk -->
<div innerHTML="{userGeneratedContent}"></div>
```

```javascript
// ❌ NEVER use innerHTML with user data
this.template.querySelector('.container').innerHTML = untrustedData;

// ✅ Use lwc:text or set textContent
element.textContent = untrustedData;
```

### 2. No Sensitive Data in JS / HTML

```javascript
// ❌ NEVER — credentials, tokens, or org-specific IDs in component
const API_KEY = 'sk-1234567890abcdef';
const RECORD_TYPE_ID = '012000000000XXXAAA';

// ✅ Fetch from Apex / Custom Metadata at runtime
@wire(getConfig)
config;
```

### 3. Event Handling — Validate Data from Events

```javascript
handleCustomEvent(event) {
    // ✅ Validate before using event data
    const { recordId } = event.detail;
    if (!recordId || typeof recordId !== 'string') return;
    // proceed
}
```

---

## Trigger Architecture — Security Pattern

Enforce one consistent pattern to prevent logic bypass:

```
MyObjectTrigger.trigger          → entry point only, 1-3 lines
    └── MyObjectTriggerHandler.cls   → routes to methods, with sharing
            └── MyObjectService.cls  → business logic, with sharing
                    └── MyObjectSelector.cls  → SOQL only, inherited sharing
```

```apex
// Trigger — entry point only
trigger AccountTrigger on Account (before insert, before update, after insert, after update) {
    AccountTriggerHandler.handle(Trigger.operationType, Trigger.new, Trigger.oldMap);
}

// Handler — with sharing, routes by operation
public with sharing class AccountTriggerHandler {
    public static void handle(
        TriggerOperation op,
        List<Account> newRecords,
        Map<Id, Account> oldMap
    ) {
        if (op == TriggerOperation.BEFORE_INSERT) {
            AccountService.beforeInsert(newRecords);
        } else if (op == TriggerOperation.AFTER_UPDATE) {
            AccountService.afterUpdate(newRecords, oldMap);
        }
    }
}
```

---

## PII & Data Privacy

Salesforce orgs are inherently full of personal data — `Contact`, `Lead`, `Person Account`, and
most custom objects touching real people. Security review must cover data privacy, not just
code-level vulnerabilities. **This section is technical guidance, not legal advice** — for
formal compliance sign-off, involve legal counsel; treat the below as engineering practice
aligned with common data-protection principles (including Indonesia's UU PDP / Law No. 27 of
2022, in force since October 2024).

### What counts as PII in a typical Salesforce org

| Category                   | Examples                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Direct identifiers         | Full name, NIK/national ID, passport number, email, phone                              |
| Location data              | Mailing/shipping address, geolocation fields                                           |
| Financial                  | Bank account, credit card (should never be stored raw — use a PCI-compliant processor) |
| Sensitive/special category | Religion, health data, biometric data — extra caution required                         |
| Behavioral                 | Purchase history, activity timeline, case history tied to an identified person         |

### Field Classification

Every new field on a person-related object should be classified during creation (in `sf-admin`'s
field checklist) as one of: **Public** / **Internal** / **Confidential** / **Restricted**. Fields
classified Confidential or Restricted are candidates for:

- Field-Level Security locked down to only the roles that need it (least privilege, not just
  "everyone who happens to have object access")
- **Shield Platform Encryption** for data-at-rest protection on Restricted fields (NIK, health
  data, financial identifiers) — note this protects at-rest storage and is transparent to most
  declarative features, but does **not** replace FLS: an authorized user with field access still
  sees decrypted data. Encryption and access control are separate layers.
- Exclusion from integrations/exports unless the destination has an equivalent protection level

### Data Masking for Non-Production Environments

**The most common real-world PII risk is not code — it's sandbox refreshes.** Pulling full
production data (including real customer PII) into a Developer or Partial/Full sandbox for
testing, without masking, means every developer, QA tester, and demo user now has raw access to
real people's data in an environment with weaker controls than production.

- Prefer **Salesforce Data Mask** (Shield feature) for automated masking on sandbox refresh —
  scrambles/shuffles/nulls PII fields while preserving referential integrity and data shape for
  testing
- If Data Mask isn't licensed, mask manually post-refresh: scripted anonymization (see
  `sf-data-migration`'s cleansing patterns) that replaces names/emails/phones with synthetic
  values before the sandbox is opened up for general dev/QA use
- **Never** use a full unmasked production copy as a long-lived, broadly-accessible dev sandbox
- Scratch orgs and test data via `TestDataFactory` (see `sf-testing`) should never be seeded from
  a production export — always synthetic data

### Audit Trail & Monitoring

- **Field History Tracking** — enable on Restricted/Confidential fields so access-adjacent
  changes are logged (note: tracks field _value changes_, not _views_ — for view-level audit,
  Shield Event Monitoring is required)
- **Shield Event Monitoring** — if licensed, use for logging actual read access to sensitive
  records/reports, especially for objects holding Restricted-classified fields
- Document who has "View All Data" / "Modify All Data" — these bypass all record-level
  protections and should be rare, named, and justified

### Data Retention

- Don't treat Salesforce as indefinite storage for PII that no longer serves a business purpose
  — stale Lead/Contact records with no activity are a growing liability, not just clutter
- If a retention policy exists (check with the org's data protection/compliance function), any
  new automation (Flow/Batch) that creates person-related records should account for it —
  flag this in `sf-architect`'s Decisions phase when a new data model touches personal data

### Adding This to a Security Review

When PII-bearing objects/fields are part of the change being reviewed, add to the sign-off:

- Data classification confirmed for new/modified fields
- FLS matches classification (Restricted → narrowest access)
- If sandbox testing was involved, confirm masked data was used
- If Shield Platform Encryption is warranted, confirm it's applied
- No PII appears in debug logs, exception messages surfaced to users, or committed code/tests

---

## Guest User & Experience Cloud Access

Guest User (unauthenticated Experience Cloud / site visitor) access is one of the highest-risk
misconfigurations in Salesforce — a single overly-broad Guest User sharing rule or OWD setting can
expose record data to anyone on the internet, no login required.

### Review Checklist

- [ ] Guest User profile has **no** object permissions beyond what the public-facing page
      genuinely needs to render — verify against the actual Experience Cloud page, not assumption
- [ ] No Guest User sharing rule or "Public Read/Write" OWD grants access to a PII-bearing object
      (see [PII & Data Privacy](#pii--data-privacy)) unless explicitly required and documented
- [ ] "Secure Guest User Record Access" org setting is enabled (Setup → Sharing Settings) — this
      caps Guest User access to explicit sharing rules rather than the older default-access model
- [ ] Guest User cannot create/edit/delete records unless the page's actual function requires it
      (e.g. a public intake form) — CRUD checked per object, not granted broadly
- [ ] No Apex class exposed to Guest User (`without sharing` + `global`/`@AuraEnabled` reachable
      from a public page) returns fields beyond what the page displays — treat any Guest-reachable
      Apex method as a public API surface, not an internal helper
- [ ] Community/site URLs referencing record IDs are validated server-side, not trusted as proof
      of access — a guessable/enumerable ID in a public URL is not an access control

Treat any change that touches a Guest User profile, an Experience Cloud page, or a
Guest-reachable Apex method as requiring this checklist, in addition to the standard Apex/LWC
review above.

---

## Connected App & External Client App Review

Relevant whenever a change introduces or modifies a Connected App, External Client App, or any
OAuth-based integration.

### Review Checklist

- [ ] OAuth scopes requested are the **minimum** needed for the integration's actual purpose —
      flag broad scopes (`full`, `api` when something narrower would do) without a documented
      reason
- [ ] Refresh token policy is explicit (expire on inactivity / never expire) — "never expire" needs
      a documented justification, not a default
- [ ] IP restriction is "Enforce IP restrictions" + Trusted IP Ranges unless the integration
      genuinely runs from unpredictable IPs
- [ ] Callback URL(s) are exact, not wildcarded, unless the integration pattern requires it
- [ ] The integration/running user for the app has the minimum Permission Set needed — never
      "System Administrator" as a convenience default
- [ ] Client secret / certificate lives in a secrets manager or Named Credential — never committed
      to source control or hardcoded in an integration script

---

## Security Review Checklist

### Apex

- [ ] All classes declare `with sharing` (or documented `without sharing` with reason)
- [ ] CRUD check present on all DML operations in `@AuraEnabled` methods (still recommended for
      error-message quality even where API 67.0+ enforces it by default)
- [ ] CRUD check uses `Schema.getGlobalDescribe()` (not compile-time SObject reference)
- [ ] Field-level checks use `Security.stripInaccessible()`, not manual per-field loops
- [ ] No `WITH SECURITY_ENFORCED` in SOQL — removed in API 67.0, flag as dead syntax if found
- [ ] Any explicit `AccessLevel.SYSTEM_MODE` usage has a documented business reason
- [ ] Batch/Queueable/Schedulable/Trigger code has manual CRUD/FLS checks (still system-mode by
      default regardless of API version)
- [ ] No SOQL injection — bind variables used; `escapeSingleQuotes()` on dynamic SOQL
- [ ] No hardcoded IDs, credentials, URLs, or org-specific values
- [ ] Named Credentials used for all external callouts
- [ ] All `@AuraEnabled` methods wrapped in try-catch → `AuraHandledException`
- [ ] Private helper methods throw `CalloutException`, not `AuraHandledException`
- [ ] `ContentDocumentLink` DML: no explicit CRUD check, protected by `with sharing` + try-catch
- [ ] Trigger follows Handler → Service → Selector architecture
- [ ] No recursive trigger execution (use static flag or Trigger Handler pattern)

### LWC

- [ ] `lwc:text` used for dynamic content (not `innerHTML`)
- [ ] No sensitive data (API keys, IDs, credentials) in JS/HTML
- [ ] Event data validated before use
- [ ] `@api` properties documented and typed
- [ ] No direct DOM manipulation with user-supplied data

### Org / Deployment

- [ ] Profiles: minimal baseline permissions only
- [ ] Permission Sets: additive, role-specific
- [ ] OWD: most restrictive setting that satisfies business need
- [ ] Sharing Rules: criteria documented and reviewed
- [ ] No guest user access to sensitive objects
- [ ] Named Credentials: configured in target org before deploy
- [ ] Custom Metadata: values verified in production before activation

### Data Privacy

- [ ] New/modified fields on person-related objects classified (Public/Internal/Confidential/Restricted)
- [ ] FLS on Confidential/Restricted fields limited to roles that need it
- [ ] Shield Platform Encryption applied where warranted (NIK, health, financial identifiers)
- [ ] If sandbox testing occurred, confirm masked/synthetic data was used — not raw production PII
- [ ] No PII in debug logs, exception messages, or committed test data

### Git / Source

- [ ] No Salesforce IDs in committed code
- [ ] No credentials, API keys, or session tokens in any file
- [ ] No org-specific URLs hardcoded
- [ ] `.gitignore` covers `.sf/`, `.sfdx/`, `config/user/`

---

## Common Vulnerabilities — Quick Reference

| Vulnerability           | Where              | Detection                         | Fix                                          |
| ----------------------- | ------------------ | --------------------------------- | -------------------------------------------- |
| SOQL Injection          | Dynamic SOQL       | String concat with user input     | Bind variables / `escapeSingleQuotes()`      |
| Missing CRUD check      | `@AuraEnabled` DML | No `isCreateable()` before insert | Add `Schema.getGlobalDescribe()` check       |
| XSS                     | LWC                | `innerHTML` with user data        | Use `lwc:text` or `textContent`              |
| Hardcoded credential    | Apex / JS          | `apiKey = '...'` literal          | Named Credential / Custom Metadata           |
| `without sharing` abuse | Service class      | No business justification         | Change to `with sharing`; document if needed |
| Recursive trigger       | Trigger            | No recursion guard                | Static Boolean flag in handler               |
| Exposed Record IDs      | LWC URL params     | `recordId` passed in URL          | Validate on server side, check access        |
| Insecure callout        | HTTP callout       | Endpoint hardcoded, no Named Cred | Use Named Credentials                        |

---

## Security Review Sign-Off Template

Before every production deploy, add to CR:

```markdown
## Security Review

**Reviewer:** [Name]
**Date:** YYYY-MM-DD

### Apex

- Sharing model: [with sharing on all classes ✓ / exceptions documented below]
- CRUD checks: [present on all DML ✓]
- API version: [confirm 67.0+ user-mode-by-default applies, or note if legacy version reviewed]
- SOQL injection risk: [none — bind variables used ✓]
- Hardcoded values: [none ✓]

### LWC

- XSS risk: [none — lwc:text used ✓]
- Sensitive data in JS: [none ✓]

### Data Privacy

- PII fields classified: [confirmed ✓ / N/A — no PII involved]
- Sandbox data masking: [confirmed masked ✓ / N/A — no sandbox testing involved]
- Shield encryption applied where warranted: [confirmed ✓ / N/A]

### Exceptions & Justifications

- [ClassName] uses `without sharing` because: [reason]

### Sign-Off

- [ ] All checklist items passed
- [ ] Exceptions documented and accepted
```
