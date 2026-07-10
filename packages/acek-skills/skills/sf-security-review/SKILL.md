---
name: sf-security-review
description: >
  Use this skill for Salesforce security reviews, vulnerability analysis, and security pattern
  enforcement. Trigger when the user asks to "review security", "check for vulnerabilities",
  "security audit", "CRUD check", "FLS check", "sharing model", "with sharing", "SOQL injection",
  "XSS in LWC", "hardcoded credentials", "permission check", or when preparing code for
  production deployment and needing a security sign-off checklist. Also use when the user asks
  about Salesforce Shield, encryption, audit trail, or data visibility concerns.
---

# Salesforce Security Review Skill

## Environment Context
- API Version: **61.0**
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

// ⚠️ Field-level via evDescribe.fields NOT available with offline LSP
// Use object-level check only; document the limitation in code comment
```

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
String endpoint = 'https://api.myorg.salesforce.com/services/data/v61.0';
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
<p lwc:text={userGeneratedContent}></p>

<!-- ❌ DANGEROUS — renders raw HTML, XSS risk -->
<div innerHTML={userGeneratedContent}></div>
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

## Security Review Checklist

### Apex
- [ ] All classes declare `with sharing` (or documented `without sharing` with reason)
- [ ] CRUD check present on all DML operations in `@AuraEnabled` methods
- [ ] CRUD check uses `Schema.getGlobalDescribe()` (not compile-time SObject reference)
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

### Git / Source
- [ ] No Salesforce IDs in committed code
- [ ] No credentials, API keys, or session tokens in any file
- [ ] No org-specific URLs hardcoded
- [ ] `.gitignore` covers `.sf/`, `.sfdx/`, `config/user/`

---

## Common Vulnerabilities — Quick Reference

| Vulnerability | Where | Detection | Fix |
|---|---|---|---|
| SOQL Injection | Dynamic SOQL | String concat with user input | Bind variables / `escapeSingleQuotes()` |
| Missing CRUD check | `@AuraEnabled` DML | No `isCreateable()` before insert | Add `Schema.getGlobalDescribe()` check |
| XSS | LWC | `innerHTML` with user data | Use `lwc:text` or `textContent` |
| Hardcoded credential | Apex / JS | `apiKey = '...'` literal | Named Credential / Custom Metadata |
| `without sharing` abuse | Service class | No business justification | Change to `with sharing`; document if needed |
| Recursive trigger | Trigger | No recursion guard | Static Boolean flag in handler |
| Exposed Record IDs | LWC URL params | `recordId` passed in URL | Validate on server side, check access |
| Insecure callout | HTTP callout | Endpoint hardcoded, no Named Cred | Use Named Credentials |

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
- SOQL injection risk: [none — bind variables used ✓]
- Hardcoded values: [none ✓]

### LWC
- XSS risk: [none — lwc:text used ✓]
- Sensitive data in JS: [none ✓]

### Exceptions & Justifications
- [ClassName] uses `without sharing` because: [reason]

### Sign-Off
- [ ] All checklist items passed
- [ ] Exceptions documented and accepted
```