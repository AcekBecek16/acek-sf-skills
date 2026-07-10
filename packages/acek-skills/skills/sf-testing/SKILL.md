---
name: sf-testing
description: >
  Use this skill for ANY Salesforce test-related task: writing Apex test classes, building
  TestDataFactory, mocking HTTP callouts, mocking platform events, writing test assertions,
  generating test coverage reports, debugging test failures, and designing test strategies.
  Trigger when the user asks to "write a test class", "fix test coverage", "mock a callout",
  "write a TestDataFactory", "test fails in org but passes locally", "assert this method",
  or anything about Apex unit testing, test data, or code coverage. Also use when coverage
  drops below 85% or when AuraHandledException assertions are involved.
---

# Salesforce Testing Skill

## Environment Context
- Minimum coverage: **85%** (aim for 90%+)
- API Version: **61.0**
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

        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertNotEquals(0, result.size(), 'Result should contain records');
    }

    // ─── Edge Case ─────────────────────────────────────────────────────────────
    @isTest
    static void testGetAccounts_noRecords_returnsEmptyList() {
        Test.startTest();
        List<Account> result = AccountHelper.getAccounts(null);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Should return empty list, not null');
        System.assertEquals(0, result.size(), 'Should return empty list for null Id');
    }

    // ─── Exception / Permission Path ───────────────────────────────────────────
    @isTest
    static void testGetAccounts_insufficientPermission_throwsException() {
        // Simulate restricted user if needed
        // System.runAs(TestDataFactory.createRestrictedUser()) { ... }
        try {
            AccountHelper.restrictedMethod(null);
            System.assert(false, 'Expected AuraHandledException was not thrown');
        } catch (AuraHandledException e) {
            // Salesforce by design: getMessage() always returns this in test context
            System.assertEquals('Script-thrown exception', e.getMessage());
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

        System.assertEquals(200, result.size(), 'Should process all 200 records');
    }
}
```

### Rules
- **Always** use `Test.startTest()` / `Test.stopTest()` — resets governor limits and forces async execution
- **Never** use `seeAllData = true` — always create test data explicitly
- **Always** assert something — no test without `System.assert*`
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

    System.assertEquals('12345', result, 'Should return ID from mock response');
}

@isTest
static void testCallout_serverError_throwsException() {
    Test.setMock(HttpCalloutMock.class, new MyCalloutMockError());

    Test.startTest();
    try {
        MyService.callExternalSystem('payload');
        System.assert(false, 'Expected exception not thrown');
    } catch (CalloutException e) {
        System.assert(e.getMessage().contains('500'), 'Should surface HTTP 500 error');
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
    System.assertEquals(1, logs.size(), 'Event subscriber should have created a log');
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
            System.assert(false, 'Standard user should not be able to delete Account');
        } catch (DmlException e) {
            System.assert(
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
// ✅ Always include a descriptive message (3rd param)
System.assertEquals(expected, actual, 'Descriptive message of what was expected');
System.assertNotEquals(null, result, 'Result should not be null');
System.assert(result.size() > 0, 'List should not be empty after processing');

// ✅ For AuraHandledException — always expect 'Script-thrown exception'
System.assertEquals('Script-thrown exception', e.getMessage());

// ✅ Assert specific fields, not just count
System.assertEquals('Active', result[0].Status__c, 'Status should be Active after processing');

// ❌ Never assert without message
System.assertEquals(5, result.size()); // Bad — no context when it fails

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
| Component | Required | Target |
|---|---|---|
| Apex Class (`@AuraEnabled`) | 85% | 90%+ |
| Apex Trigger | 85% | 95%+ |
| Batch / Schedulable / Queueable | 85% | 90%+ |

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

## Common Test Failures & Fixes

| Error | Cause | Fix |
|---|---|---|
| `MIXED_DML_OPERATION` | Inserting Setup object (User) and non-Setup object in same context | Wrap User insert in `System.runAs(new User())` |
| `UNABLE_TO_LOCK_ROW` | Parallel tests updating same record | Use `@TestSetup` + unique records per test |
| `Too many SOQL queries: 101` | SOQL in loop not caught by test | Add bulk test (200 records), fix the source |
| `Script-thrown exception` in `getMessage()` | `AuraHandledException` — expected behavior | Assert this exact string — it's correct |
| Test passes locally, fails in org | `seeAllData=true` dependency or hardcoded IDs | Remove `seeAllData`, use `TestDataFactory` |
| `Callout not allowed` | HTTP callout without `Test.setMock()` | Add mock before `Test.startTest()` |