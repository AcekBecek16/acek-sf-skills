---
name: sf-data-migration
description: >
  Use this skill for Salesforce data migration, bulk data operations, and data management tasks:
  designing import/export strategies, writing Data Loader automation scripts, upsert operations
  with External IDs, bulk SOQL exports, data cleansing before migration, error handling for bulk
  loads, and generating data migration plans. Trigger when the user mentions "data migration",
  "bulk import", "data loader", "upsert", "external ID", "migrate records", "export data",
  "data cleansing", "bulk delete", "mass update", or asks how to move large volumes of records
  between orgs or from external systems into Salesforce.
---

# Salesforce Data Migration Skill

## Persona

When this skill runs — standalone or dispatched as a sub-agent — open the response with:

`— Britney Amber, sf-data-migration`

This is narration only. Never include this name inside generated file content: not in migration
plans, scripts, CRs, or commit messages. The one existing exception is the Architecture Plan's
Execution Log (owned by `sf-architect`), which may reference it as a tracking label when this
skill is dispatched as a sub-agent task.

## Environment Context

- API Version: **not hardcoded** — new files inherit whatever `sourceApiVersion` is set in the
  project's `sfdx-project.json` when scaffolded via SF CLI. When touching an **existing**
  class/component/metadata item, check its `apiVersion`: below **62.0** → bump to **67.0** as part
  of the change; 62.0+ → leave as-is unless the task needs 67.0+ behavior specifically.
- Tooling: **SF CLI** (`sf data` commands) for dev/test volumes; Data Loader for production volumes
- Always migrate to **sandbox first**, verify, then production
- Single org: sandbox → production

---

## Migration Planning — Before Touching Any Data

### Step 1: Discovery Checklist

- [ ] What objects and how many records? (run COUNT queries first)
- [ ] Are there required fields that source data may not have?
- [ ] Are there lookup/relationship fields? (parent records must exist first)
- [ ] Are there Record Types? (map source values to Salesforce Record Type IDs)
- [ ] Are there Validation Rules that will block import? (consider deactivating temporarily)
- [ ] Are there Triggers/Flows that fire on insert/update? (decide: bypass or let fire?)
- [ ] Does the source data have a unique identifier for upsert (External ID)?
- [ ] What is the target volume? (under 10K → SF CLI; over 10K → Data Loader / Bulk API)

### Step 2: Dependency Order

Always load in parent → child order:

```
1. Custom Metadata / Reference Data (e.g. picklist-driving records)
2. Accounts
3. Contacts (requires Account)
4. Opportunities (requires Account)
5. Opportunity Products (requires Opportunity + Pricebook Entry)
6. Cases (requires Account + Contact)
7. Custom Objects (based on lookup dependency)
```

### Step 3: External ID Strategy

Every migrated object should have an External ID field to enable upsert and relationship mapping.

```apex
// External ID field naming convention:
ExternalId__c         // generic
LegacySystemId__c     // named after source system
SapId__c, OracleId__c // system-specific
```

Field settings:

- Type: Text (or Number if IDs are numeric)
- Mark as: **External ID** ✓ and **Unique** ✓
- Max length: match source system ID length

---

## SF CLI Data Commands — Dev/Test Volumes (<50K records)

### Query & Export

```bash
# Basic query to CSV
sf data query \
  --query "SELECT Id, Name, Industry, Phone FROM Account WHERE CreatedDate = THIS_YEAR" \
  --target-org <alias> \
  --result-format csv > exports/accounts.csv

# Export with relationships
sf data query \
  --query "SELECT Id, Name, Account.Name, Email FROM Contact WHERE AccountId != null" \
  --target-org <alias> \
  --result-format csv > exports/contacts.csv

# Count records before migration
sf data query \
  --query "SELECT COUNT() FROM Account" \
  --target-org <alias>

# Export with Bulk API (for larger volumes)
sf data export bulk \
  --query "SELECT Id, Name, ExternalId__c FROM Account" \
  --output-file exports/accounts-bulk.csv \
  --target-org <alias>
```

### Import / Upsert

```bash
# Insert new records
sf data import bulk \
  --sobject Account \
  --file imports/accounts.csv \
  --target-org <alias>

# Upsert (insert + update based on External ID)
sf data upsert bulk \
  --sobject Account \
  --file imports/accounts.csv \
  --external-id ExternalId__c \
  --target-org <alias>

# Delete records
sf data delete bulk \
  --sobject Account \
  --file exports/accounts-to-delete.csv \
  --target-org <alias>
```

### Check Job Status

```bash
sf data bulk results \
  --job-id <JobId> \
  --target-org <alias>
```

---

## Data Loader — Production Volumes (>50K records)

Data Loader uses Bulk API 2.0 by default. Use for production migration.

### CSV Requirements

- UTF-8 encoding (no BOM)
- First row: field API names (e.g. `Name,ExternalId__c,Industry__c`)
- `null` to clear a field: leave cell empty OR use `#N/A` for some fields
- Date format: `YYYY-MM-DDThh:mm:ss.000Z` (ISO 8601)
- Boolean: `true` / `false` (lowercase)
- Currency: numeric only, no currency symbols

### Batch Size Recommendations

| Volume     | Batch Size | Concurrency                   |
| ---------- | ---------- | ----------------------------- |
| < 10K      | 200        | Serial                        |
| 10K – 100K | 2,000      | Parallel                      |
| 100K – 1M  | 10,000     | Parallel                      |
| > 1M       | 10,000     | Parallel + schedule overnight |

### Error Handling

- Always save the **success file** and **error file** per run
- Error file contains failed rows + error message — fix and re-run only errors
- Common errors and fixes:

| Error                                  | Cause                          | Fix                                                        |
| -------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `REQUIRED_FIELD_MISSING`               | Required field empty in CSV    | Fill required fields; check validation rules               |
| `INVALID_FIELD`                        | Field API name wrong           | Check with `sf sobject describe --sobject <Object>`        |
| `FIELD_INTEGRITY_EXCEPTION`            | Lookup ID doesn't exist in org | Load parent records first                                  |
| `DUPLICATE_VALUE`                      | Unique field already exists    | Switch from insert to upsert with External ID              |
| `STRING_TOO_LONG`                      | Value exceeds field length     | Truncate or increase field length                          |
| `CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY` | Trigger/validation blocking    | Check trigger logic; may need to deactivate VR temporarily |

---

## Upsert Pattern — External ID Relationship Mapping

When loading child records and parent exists via External ID (not Salesforce ID):

### CSV Format

Instead of using Salesforce `AccountId`, reference the parent's External ID:

```csv
Name,Email,Account.ExternalId__c
John Doe,john@example.com,ACC-12345
Jane Smith,jane@example.com,ACC-67890
```

Salesforce resolves `Account.ExternalId__c` to the Account's Salesforce ID automatically during upsert.

### Upsert Command

```bash
sf data upsert bulk \
  --sobject Contact \
  --file imports/contacts-with-account-ref.csv \
  --external-id ExternalId__c \
  --target-org <alias>
```

---

## Data Cleansing — Before Migration

### Common Issues to Fix in Source Data

```python
# Python script example — clean CSV before Salesforce import

import pandas as pd

df = pd.read_csv('raw_export.csv')

# Remove duplicates on External ID
df = df.drop_duplicates(subset=['external_id'])

# Truncate strings to Salesforce field limits
df['name'] = df['name'].str[:255]           # Text field max
df['description'] = df['description'].str[:32000]  # Long Text max

# Normalize phone numbers
df['phone'] = df['phone'].str.replace(r'\D', '', regex=True)

# Map picklist values to Salesforce API values
industry_map = {
    'Tech': 'Technology',
    'Fin': 'Finance',
    'Health': 'Healthcare'
}
df['industry'] = df['industry'].map(industry_map)

# Convert date format to ISO 8601
df['created_date'] = pd.to_datetime(df['created_date']).dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')

# Replace NaN with empty string
df = df.fillna('')

df.to_csv('cleaned_export.csv', index=False, encoding='utf-8')
print(f"Cleaned: {len(df)} records")
```

### Masking PII for Non-Production Loads

When the target is a sandbox/dev org rather than production, mask identifying fields before
loading — never load a raw production-PII export into a shared sandbox:

```python
import hashlib

def mask_email(email, seed):
    h = hashlib.sha256((email + seed).encode()).hexdigest()[:8]
    return f"user_{h}@example-masked.com"

def mask_phone(phone, seed):
    h = hashlib.sha256((str(phone) + seed).encode()).hexdigest()[:8]
    return f"0800{int(h, 16) % 10000000:07d}"

SEED = "sandbox-rehearsal-2026"  # constant per run so relationships stay consistent

df['email'] = df['email'].apply(lambda e: mask_email(e, SEED) if pd.notna(e) else e)
df['phone'] = df['phone'].apply(lambda p: mask_phone(p, SEED) if pd.notna(p) else p)
df['name'] = 'Test User ' + df.index.astype(str)  # or use a Faker library for realistic-looking names

df.to_csv('masked_for_sandbox.csv', index=False, encoding='utf-8')
```

Hashing with a fixed seed keeps the same source record mapping to the same masked value across
re-runs, which preserves referential testing behavior without exposing the real value.

### SOQL-Based Deduplication Check

```bash
# Find duplicates in Salesforce by External ID
sf data query \
  --query "SELECT ExternalId__c, COUNT(Id) total FROM Account GROUP BY ExternalId__c HAVING COUNT(Id) > 1" \
  --target-org <alias>

# Find records without External ID (not upsert-safe)
sf data query \
  --query "SELECT Id, Name FROM Account WHERE ExternalId__c = null LIMIT 200" \
  --target-org <alias>
```

---

## Apex Batch for Large-Scale Updates

When you need to transform/update data already in Salesforce at scale:

```apex
public class AccountMigrationBatch implements Database.Batchable<SObject>, Database.Stateful {
    private Integer successCount = 0;
    private Integer errorCount = 0;
    private List<String> errors = new List<String>();

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator(
            'SELECT Id, Name, LegacyStatus__c, Status__c ' +
            'FROM Account WHERE MigrationComplete__c = false'
        );
    }

    public void execute(Database.BatchableContext bc, List<Account> scope) {
        List<Account> toUpdate = new List<Account>();

        for (Account acc : scope) {
            // Transform logic
            acc.Status__c = mapStatus(acc.LegacyStatus__c);
            acc.MigrationComplete__c = true;
            toUpdate.add(acc);
        }

        Database.SaveResult[] results = Database.update(toUpdate, false); // allOrNone=false
        for (Integer i = 0; i < results.size(); i++) {
            if (results[i].isSuccess()) {
                successCount++;
            } else {
                errorCount++;
                errors.add(toUpdate[i].Id + ': ' + results[i].getErrors()[0].getMessage());
            }
        }
    }

    public void finish(Database.BatchableContext bc) {
        // Send summary email or create log record
        System.debug('Migration complete. Success: ' + successCount + ', Errors: ' + errorCount);
        for (String err : errors) {
            System.debug('ERROR: ' + err);
        }
    }

    private String mapStatus(String legacyStatus) {
        Map<String, String> statusMap = new Map<String, String>{
            'A' => 'Active',
            'I' => 'Inactive',
            'P' => 'Pending'
        };
        return statusMap.containsKey(legacyStatus) ? statusMap.get(legacyStatus) : 'Unknown';
    }
}
```

### Execute Batch

```apex
// In Anonymous Apex
Database.executeBatch(new AccountMigrationBatch(), 200); // 200 records per batch
```

---

## PII Handling During Migration

The most common real-world privacy risk in data migration isn't the migration itself — it's
**where the data ends up afterward.** Apply this alongside `sf-security-review`'s PII & Data
Privacy section.

- **Never load unmasked production PII into a sandbox** for testing/QA purposes without a
  documented reason and masking plan. A migration rehearsal in sandbox should use masked or
  synthetic data, not a raw production export.
- If the migration source itself is an external system with real customer PII (names, emails,
  phone numbers, national ID), treat the exported CSV/file as sensitive from the moment it's
  created — don't leave it in a shared drive, temp folder, or commit it to version control.
- For sandbox rehearsal specifically: run the same load against **masked** data first (see the
  Data Cleansing script pattern below — extend it with name/email/phone scrambling for
  non-production runs), confirm the load logic works, then run the real load against production
  only.
- Delete local export/import files after the migration is verified — don't leave PII-bearing CSVs
  sitting in `exports/`/`imports/` folders longer than the migration window requires.

---

## Migration Runbook Template

File: `instructions/migration/YYYYMMDD-<migration-name>-runbook.md`

```markdown
# Migration Runbook: [Migration Name]

**Date:** YYYY-MM-DD
**Target Org:** [{{DEV_ORG_ALIAS}} / {{PROD_ORG_ALIAS}}]
**Estimated Volume:** [X records across Y objects]
**Estimated Duration:** [X hours]

---

## Pre-Migration Checklist

- [ ] Backup current data (export all affected objects)
- [ ] Verify External ID field exists on all target objects
- [ ] Test migration in sandbox with 10% sample — confirm success rate > 99%
- [ ] **If target is non-production: confirm PII fields are masked/synthetic, not raw production data**
- [ ] Identify Validation Rules to deactivate temporarily (list below)
- [ ] Identify Triggers/Flows that will fire — confirm acceptable behavior
- [ ] Communicate downtime window to affected users (if any)
- [ ] Confirm Data Loader / SF CLI version is current

## Validation Rules to Deactivate During Migration

| Object  | Validation Rule         | Reason to Deactivate              |
| ------- | ----------------------- | --------------------------------- |
| Account | ACCOUNT_RequireIndustry | Source data may not have Industry |

## Load Order

1. [Object 1] — [file name] — [estimated records]
2. [Object 2] — [file name] — [estimated records]

## Rollback Plan

If error rate > 5% or critical data issue found:

1. Stop migration immediately
2. Export all records inserted this session (filter by CreatedDate = TODAY)
3. Delete inserted records using error-free export CSV + sf data delete bulk
4. Restore Validation Rules
5. Investigate root cause before re-attempting

## Post-Migration Verification

- [ ] Record counts match source system
- [ ] Sample 10 records manually — verify all fields correct
- [ ] Lookup relationships intact (spot-check Contacts → Accounts)
- [ ] Validation Rules re-activated
- [ ] Users notified migration complete

## Results

| Object  | Inserted | Updated | Failed | Notes |
| ------- | -------- | ------- | ------ | ----- |
| Account |          |         |        |       |
| Contact |          |         |        |       |
```

---

## SF CLI Quick Reference — Data Commands

```bash
# Describe object fields (use to verify API names before import)
sf sobject describe --sobject Account --target-org <alias>

# Query to verify post-migration counts
sf data query --query "SELECT COUNT() FROM Account WHERE ExternalId__c != null" --target-org <alias>

# Get Bulk API job results
sf data bulk results --job-id <JobId> --target-org <alias>

# List all Bulk API jobs (recent)
sf data bulk status --target-org <alias>
```
