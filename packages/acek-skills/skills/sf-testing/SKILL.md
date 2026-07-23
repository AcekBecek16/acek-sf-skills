---
name: sf-testing
description: >
  Use this skill for ANY Salesforce test-related task: writing Apex test classes, building
  TestDataFactory, mocking HTTP callouts, mocking platform events, writing test assertions,
  generating test coverage reports, debugging test failures, designing test strategies, and
  writing LWC Jest unit tests. Trigger when the user asks to "write a test class", "fix test
  coverage", "mock a callout", "write a TestDataFactory", "test fails in org but passes locally",
  "assert this method", "write a jest test", "test this component", or anything about Apex unit
  testing, LWC unit testing, test data, or code coverage. Also use when coverage drops below 85%
  or when AuraHandledException assertions are involved.
---

# Salesforce Testing Skill

## Persona

When this skill runs — standalone or dispatched as a sub-agent — open the response with:

`— Riley Reid, sf-testing`

This is narration only. Never include this name inside generated file content: not in PRDs, CRs,
Apex/LWC test code, code comments, or commit messages. The one existing exception is the
Architecture Plan's Execution Log (owned by `sf-architect`), which may reference it as a tracking
label when this skill is dispatched as a sub-agent task.

## Environment Context

- Minimum coverage: **85%** (aim for 90%+)
- API Version: **not hardcoded** — new files inherit whatever `sourceApiVersion` is set in the
  project's `sfdx-project.json` when scaffolded via SF CLI. When touching an **existing** test
  class, check its `apiVersion`: below **62.0** → bump to **67.0** as part of the change; 62.0+ →
  leave as-is unless the task needs 67.0+ behavior specifically.
- Assertions: prefer the **`Assert` class** (`Assert.areEqual`, `Assert.isTrue`, etc. — API 56.0+)
  over legacy `System.assertEquals`/`System.assert` in new tests
- `AuraHandledException.getMessage()` in test context **always** returns `'Script-thrown exception'` — this is Salesforce by design, not a bug

---

## Test Class Structure — Standard Pattern

```apex
@isTest
private class AccountHelperTest {

    // ─── Test Data Setup ───────────────────────────────────────────────────────
    @TestSetup
    static void makeData() {
        // Use TestDataFactory for all record creation
        List<Account> accounts = TestDataFactory.createAccounts(10, true);
        TestDataFactory.createContacts(accounts, 2, true);
    }

    // ─── Happy Path ────────────────────────────────────────────────────────────
    @isTest
    static void testGetAccounts_returnsActiveRecords() {
        List<Account> accounts = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        List<Account> result = AccountHelper.getAccounts(accounts[0].Id);
        Test.stopTest();

        Assert.isNotNull(result, 'Result should not be null');
        Assert.areNotEqual(0, result.size(), 'Result should contain records');
    }

    // ─── Edge Case ─────────────────────────────────────────────────────────────
    @isTest
    static void testGetAccounts_noRecords_returnsEmptyList() {
        Test.startTest();
        List<Account> result = AccountHelper.getAccounts(null);
        Test.stopTest();

        Assert.isNotNull(result, 'Should return empty list, not null');
        Assert.areEqual(0, result.size(), 'Should return empty list for null Id');
    }

    // ─── Exception / Permission Path ───────────────────────────────────────────
    @isTest
    static void testGetAccounts_insufficientPermission_throwsException() {
        // Simulate restricted user if needed
        // System.runAs(TestDataFactory.createRestrictedUser()) { ... }
        try {
            AccountHelper.restrictedMethod(null);
            Assert.fail('Expected AuraHandledException was not thrown');
        } catch (AuraHandledException e) {
            // Salesforce by design: getMessage() always returns this in test context
            Assert.areEqual('Script-thrown exception', e.getMessage(), 'AuraHandledException message is masked in test context by design');
        }
    }

    // ─── Bulk / Governor Limit Test ────────────────────────────────────────────
    @isTest
    static void testGetAccounts_bulk_200Records() {
        List<Account> bulk = TestDataFactory.createAccounts(200, true);

        Test.startTest();
        List<Account> result = AccountHelper.processAccounts(
            new Map<Id, Account>(bulk).keySet()
        );
        Test.stopTest();

        Assert.areEqual(200, result.size(), 'Should process all 200 records');
    }
}
```

### Rules

- **Always** use `Test.startTest()` / `Test.stopTest()` — resets governor limits and forces async execution
- **Never** use `seeAllData = true` — always create test data explicitly
- **Always** assert something — no test without an `Assert` call
- **Prefer the `Assert` class** (`Assert.areEqual`, `Assert.isTrue`, `Assert.isNotNull`, `Assert.fail`,
  etc. — API 56.0+) over legacy `System.assertEquals`/`System.assert`. Same contract, clearer
  failure messages, and it's the platform-recommended class going forward. Only reach for the
  legacy `System.assert*` methods if targeting an API version below 56.0.
- **3 minimum scenarios** per class: happy path, edge case, exception/permission
- `@TestSetup` for shared data across methods; method-level setup only when data differs per test

---

## TestDataFactory — Standard Pattern

Create once, reuse everywhere. File: `force-app/main/default/classes/TestDataFactory.cls`

```apex
@isTest
public class TestDataFactory {

    // ─── Accounts ──────────────────────────────────────────────────────────────
    public static List<Account> createAccounts(Integer count, Boolean doInsert) {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < count; i++) {
            accounts.add(new Account(
                Name = 'Test Account ' + i,
                Industry = 'Technology',
                Phone = '021000000' + i
            ));
        }
        if (doInsert) insert accounts;
        return accounts;
    }

    // ─── Contacts ──────────────────────────────────────────────────────────────
    public static List<Contact> createContacts(
        List<Account> accounts, Integer perAccount, Boolean doInsert
    ) {
        List<Contact> contacts = new List<Contact>();
        for (Account acc : accounts) {
            for (Integer i = 0; i < perAccount; i++) {
                contacts.add(new Contact(
                    FirstName = 'Test',
                    LastName = 'Contact ' + i,
                    AccountId = acc.Id,
                    Email = 'test' + i + '@' + acc.Id + '.com'
                ));
            }
        }
        if (doInsert) insert contacts;
        return contacts;
    }

    // ─── Users ─────────────────────────────────────────────────────────────────
    public static User createUser(String profileName, Boolean doInsert) {
        Profile p = [SELECT Id FROM Profile WHERE Name = :profileName LIMIT 1];
        User u = new User(
            FirstName     = 'Test',
            LastName      = 'User ' + profileName,
            Email         = 'testuser_' + profileName.replace(' ', '') + '@test.com',
            Username      = 'testuser_' + profileName.replace(' ', '')
                            + Datetime.now().getTime() + '@test.com',
            Alias         = 'tuser',
            TimeZoneSidKey    = 'Asia/Jakarta',
            LocaleSidKey      = 'id_ID',
            EmailEncodingKey  = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId         = p.Id
        );
        if (doInsert) insert u;
        return u;
    }

    // ─── Custom Objects ────────────────────────────────────────────────────────
    // Add your org-specific objects here following the same pattern:
    // public static List<Project__c> createProjects(Integer count, Boolean doInsert) { ... }
}
```

### Factory Rules

- `doInsert` parameter on every method — caller decides whether to insert
- Unique field values: use loop index + timestamp/Id to avoid duplicate errors
- **Never** hardcode record IDs
- **Never seed test data from a production export** — `TestDataFactory` values must always be
  synthetic (`'Test Account ' + i`, `'test' + i + '@test.com'`), never real customer PII copied
  from production for convenience
- Add org-specific objects in the `Custom Objects` section
- Username must be globally unique — always append `Datetime.now().getTime()`

---

## Mocking HTTP Callouts

### Step 1 — Create Mock Implementation

```apex
@isTest
global class MyCalloutMock implements HttpCalloutMock {
    global HTTPResponse respond(HTTPRequest req) {
        HttpResponse res = new HttpResponse();
        res.setHeader('Content-Type', 'application/json');
        res.setStatusCode(200);
        res.setBody('{"status":"success","id":"12345"}');
        return res;
    }
}

// For error scenarios:
@isTest
global class MyCalloutMockError implements HttpCalloutMock {
    global HTTPResponse respond(HTTPRequest req) {
        HttpResponse res = new HttpResponse();
        res.setStatusCode(500);
        res.setBody('{"error":"Internal Server Error"}');
        return res;
    }
}
```

### Step 2 — Use in Test

```apex
@isTest
static void testCallout_success() {
    Test.setMock(HttpCalloutMock.class, new MyCalloutMock());

    Test.startTest();
    String result = MyService.callExternalSystem('payload');
    Test.stopTest();

    Assert.areEqual('12345', result, 'Should return ID from mock response');
}

@isTest
static void testCallout_serverError_throwsException() {
    Test.setMock(HttpCalloutMock.class, new MyCalloutMockError());

    Test.startTest();
    try {
        MyService.callExternalSystem('payload');
        Assert.fail('Expected exception not thrown');
    } catch (CalloutException e) {
        Assert.isTrue(e.getMessage().contains('500'), 'Should surface HTTP 500 error');
    }
    Test.stopTest();
}
```

### Rules

- `Test.setMock()` must be called **before** `Test.startTest()`
- Always test both success and failure mock paths
- For multiple endpoints, use `StaticResourceCalloutMock` or a routing mock that checks `req.getEndpoint()`

---

## Mocking Platform Events

```apex
@isTest
static void testPlatformEventPublish() {
    Test.startTest();
    MyService.publishEvent('payload');
    // Fire platform event delivery
    Test.getEventBus().deliver();
    Test.stopTest();

    // Assert downstream effect (e.g. record created by subscriber trigger)
    List<MyLog__c> logs = [SELECT Id FROM MyLog__c];
    Assert.areEqual(1, logs.size(), 'Event subscriber should have created a log');
}
```

---

## System.runAs — Testing Permission Boundaries

```apex
@isTest
static void testRestrictedUser_cannotDelete() {
    User restrictedUser = TestDataFactory.createUser('Standard User', true);
    Account acc = TestDataFactory.createAccounts(1, true)[0];

    System.runAs(restrictedUser) {
        Test.startTest();
        try {
            delete acc;
            Assert.fail('Standard user should not be able to delete Account');
        } catch (DmlException e) {
            Assert.isTrue(
                e.getMessage().contains('insufficient access'),
                'Should throw insufficient access error'
            );
        }
        Test.stopTest();
    }
}
```

---

## Assertion Best Practices

```apex
// ✅ Prefer the Assert class (API 56.0+) — clearer failure messages, platform-recommended
Assert.areEqual(expected, actual, 'Descriptive message of what was expected');
Assert.isNotNull(result, 'Result should not be null');
Assert.isTrue(result.size() > 0, 'List should not be empty after processing');

// ✅ Always include a descriptive message (last param)
Assert.areEqual('Active', result[0].Status__c, 'Status should be Active after processing');

// ✅ For AuraHandledException — always expect 'Script-thrown exception'
Assert.areEqual('Script-thrown exception', e.getMessage(), 'AuraHandledException message is masked in test context by design');

// ⚠️ Legacy System.assert* still works and is acceptable in existing code — only required for
// API versions below 56.0. Prefer Assert class in new tests; no need to mass-migrate old ones
// just for this.
System.assertEquals(expected, actual, 'Still valid, just superseded going forward');

// ❌ Never assert without a message
Assert.areEqual(5, result.size()); // Bad — no context when it fails

// ❌ Never test with catch-all that swallows the error
try {
    SomeClass.method();
} catch (Exception e) {
    // empty catch — useless
}
```

---

## Coverage Strategy

### Minimum per component

| Component                       | Required | Target |
| ------------------------------- | -------- | ------ |
| Apex Class (`@AuraEnabled`)     | 85%      | 90%+   |
| Apex Trigger                    | 85%      | 95%+   |
| Batch / Schedulable / Queueable | 85%      | 90%+   |

### Run tests via SF CLI

```bash
# Run specific test class
sf apex run test \
  --class-names AccountHelperTest \
  --target-org <alias> \
  --result-format human \
  --code-coverage

# Run multiple test classes (deployment-style)
sf apex run test \
  --class-names AccountHelperTest,OpportunityServiceTest \
  --target-org <alias> \
  --result-format json \
  --code-coverage

# Check coverage of specific class
sf apex run test \
  --class-names AccountHelperTest \
  --target-org <alias> \
  --result-format human \
  --code-coverage \
  | grep -A 5 "AccountHelper"
```

### When coverage is below 85%

1. Identify uncovered lines: run test with `--code-coverage` and review output
2. Check: are there `if/else` branches not tested?
3. Check: are there exception paths not triggered?
4. Add targeted test methods — do **not** reduce test quality just to hit the number
5. Never use `@SuppressWarnings` to bypass coverage requirements

---

## LWC Jest Testing

Every new or modified LWC component needs a Jest test file — same discipline as Apex coverage,
just not gated by a governor limit. This is separate from `sf-devops`'s LWC review checklist
(structural: naming, wire usage, JSDoc) and from `shaiden`'s design critique (visual/SLDS
compliance) — this section owns whether the component's _behavior_ is actually tested.

### File Location

```
force-app/main/default/lwc/myComponent/
├── myComponent.html
├── myComponent.js
├── myComponent.css
├── myComponent.js-meta.xml
└── __tests__/
    └── myComponent.test.js
```

Uses `@salesforce/sfdx-lwc-jest` — run via `npm run test:unit` (or the project's configured Jest
script), not SF CLI.

### Test Structure — Standard Pattern

```javascript
import { createElement } from 'lwc';
import MyComponent from 'c/myComponent';
import getRelatedItems from '@salesforce/apex/MyController.getRelatedItems';

// Mock the wired Apex method — never let a Jest test hit a real Apex method
jest.mock(
	'@salesforce/apex/MyController.getRelatedItems',
	() => ({ default: jest.fn() }),
	{ virtual: true },
);

describe('c-my-component', () => {
	afterEach(() => {
		while (document.body.firstChild) {
			document.body.removeChild(document.body.firstChild);
		}
		jest.clearAllMocks();
	});

	// ─── Happy Path ────────────────────────────────────────────────────────
	it('renders items after the wire resolves', async () => {
		const element = createElement('c-my-component', { is: MyComponent });
		document.body.appendChild(element);

		getRelatedItems.emit([{ Id: '001', Name: 'Test Item' }]);
		await Promise.resolve();

		const items = element.shadowRoot.querySelectorAll('.my-component__item');
		expect(items.length).toBe(1);
	});

	// ─── Empty State ───────────────────────────────────────────────────────
	it('shows the empty state when there is no data', async () => {
		const element = createElement('c-my-component', { is: MyComponent });
		document.body.appendChild(element);

		getRelatedItems.emit([]);
		await Promise.resolve();

		expect(
			element.shadowRoot.querySelector('.my-component__empty'),
		).not.toBeNull();
	});

	// ─── Interaction / Error Path ──────────────────────────────────────────
	it('fires the itemselected event on click', () => {
		const element = createElement('c-my-component', { is: MyComponent });
		document.body.appendChild(element);

		const handler = jest.fn();
		element.addEventListener('itemselected', handler);
		element.shadowRoot.querySelector('button')?.click();

		expect(handler).toHaveBeenCalled();
	});
});
```

### Rules

- **Minimum 3 scenarios** per component — same bar as Apex: happy/rendered path, empty state, one
  interaction or error path
- Mock every `@wire`/imperative Apex import — a Jest test that reaches a real Apex method is broken
- Query only through `element.shadowRoot` — never reach into the component's internals directly
- Assert on rendered output (DOM nodes, text, fired events), not on private component state
- Run `npm run test:unit` before every PR — same gate as Apex coverage, checked in `sf-devops`'s
  review

### Run Commands

```bash
# Run all LWC Jest tests
npm run test:unit

# Run a single component's tests
npx sfdx-lwc-jest -- myComponent

# Watch mode during development
npx sfdx-lwc-jest --watch
```

---

## Common Test Failures & Fixes

| Error                                       | Cause                                                              | Fix                                            |
| ------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| `MIXED_DML_OPERATION`                       | Inserting Setup object (User) and non-Setup object in same context | Wrap User insert in `System.runAs(new User())` |
| `UNABLE_TO_LOCK_ROW`                        | Parallel tests updating same record                                | Use `@TestSetup` + unique records per test     |
| `Too many SOQL queries: 101`                | SOQL in loop not caught by test                                    | Add bulk test (200 records), fix the source    |
| `Script-thrown exception` in `getMessage()` | `AuraHandledException` — expected behavior                         | Assert this exact string — it's correct        |
| Test passes locally, fails in org           | `seeAllData=true` dependency or hardcoded IDs                      | Remove `seeAllData`, use `TestDataFactory`     |
| `Callout not allowed`                       | HTTP callout without `Test.setMock()`                              | Add mock before `Test.startTest()`             |
