---
name: sf-admin
description: >
  Use this skill for ANY Salesforce administration task that does not involve custom code.
  Triggers when the user asks about creating or modifying custom objects, custom fields, picklist
  values, page layouts, record types, profiles, permission sets, roles, sharing rules, validation
  rules, workflow rules, flows (Screen Flow, Record-Triggered Flow, Schedule-Triggered Flow),
  approval processes, reports, dashboards, email templates, app manager, or any declarative
  Salesforce configuration. Also use when the user asks about org setup, security model, OWD
  (Org-Wide Defaults), or data management tasks (import, export, data loader).
---

# Salesforce Administrator Skill

## Environment Context
- API Version: **61.0**
- Org Type: Enterprise (single org: sandbox + production)
- Tooling: **SF CLI** for metadata retrieval; most admin tasks done declaratively in Setup UI
- Any metadata changes intended for production must go through the DevOps deployment process

---

## Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Custom Object | PascalCase, singular | `Project__c`, `WorkOrder__c` |
| Custom Field | PascalCase__c | `ProjectStatus__c`, `DueDate__c` |
| Custom Tab | Match object label | — |
| Permission Set | Descriptive, Title Case | `Project Manager Access` |
| Flow | Action + Object, Title Case | `Create Project Record`, `Update Opportunity Stage` |
| Validation Rule | OBJECT_DescriptionOfRule | `ACCOUNT_RequireIndustry` |
| Report/Dashboard | Descriptive, audience-first | `Sales Team — Pipeline by Stage Q3` |

---

## Custom Objects

### Checklist when creating a Custom Object
- [ ] **Label**: singular (e.g. `Project`), plural auto-generated
- [ ] **API Name**: PascalCase + `__c` (e.g. `Project__c`)
- [ ] **Record Name field**: meaningful (not just "Project Name" — be specific)
- [ ] **Record Name type**: Text (most cases) or Auto Number if human-readable ID needed
- [ ] **Sharing model (OWD)**: decide upfront — Public Read/Write, Public Read Only, or Private
- [ ] **Allow Reports**: enable if business needs visibility
- [ ] **Allow Activities**: enable if users need Tasks/Events on this object
- [ ] **Track Field History**: enable for audit trail (select key fields)
- [ ] **Allow in Chatter**: based on collaboration needs
- [ ] Add to relevant **App** via App Manager after creation

### Relationships
| Type | Use When |
|---|---|
| Master-Detail | Child cannot exist without parent; sharing & rollup summary needed |
| Lookup | Loose coupling; child can exist independently |
| Many-to-Many | Use Junction Object with two Master-Detail fields |
| Hierarchical | Self-referential (User only) |

---

## Custom Fields

### Field Type Selection Guide
| Data | Recommended Type |
|---|---|
| Short text (<255 chars) | Text |
| Long text / notes | Long Text Area (set char limit intentionally) |
| Controlled list of values | Picklist |
| Currency amounts | Currency (respects org currency settings) |
| Calculated value | Formula |
| Running total from child | Roll-Up Summary (Master-Detail only) |
| True/False | Checkbox |
| Date only | Date |
| Date + Time | Date/Time |
| External system ID | Text, mark as External ID + Unique |
| Reference to another record | Lookup or Master-Detail |

### Field Creation Checklist
- [ ] API Name: PascalCase__c — **no spaces, no special characters**
- [ ] Help Text: always fill — explain purpose and expected format
- [ ] Field-Level Security (FLS): set explicitly per profile/permission set after creation
- [ ] Add to **Page Layout** after creation
- [ ] Add to relevant **List View** if needed
- [ ] Consider **Required** at field level vs. at Validation Rule level (VR gives better error messages)

---

## Security Model

### Layers (top to bottom)
1. **OWD** — baseline access for all users (most restrictive)
2. **Role Hierarchy** — opens access up the hierarchy
3. **Sharing Rules** — criteria-based or ownership-based exceptions to OWD
4. **Manual Sharing** — record-by-record sharing
5. **Profiles** — object/field/tab access + app access (legacy, prefer Permission Sets)
6. **Permission Sets** — additive permissions on top of Profile
7. **Permission Set Groups** — bundle multiple Permission Sets

### Best Practice
- Keep Profiles minimal (baseline access only)
- Use **Permission Sets** for feature/role-based access
- Group Permission Sets into **Permission Set Groups** for easy assignment
- Never grant "Modify All" or "View All" without documented business justification

### Permission Set Creation Checklist
- [ ] Name: descriptive, audience-clear (`Project Manager Access`)
- [ ] Object permissions: only what role needs (CRUD individually)
- [ ] FLS: explicitly set for each relevant field
- [ ] Assigned Apps: if needed
- [ ] System Permissions: minimal — document any elevated permissions

---

## Flows

### Flow Type Selection
| Scenario | Flow Type |
|---|---|
| User-facing guided process | Screen Flow |
| Trigger on record create/update/delete | Record-Triggered Flow |
| Run on a schedule | Schedule-Triggered Flow |
| Called from another flow or Apex | Autolaunched Flow (No Trigger) |
| Triggered by platform event | Platform Event-Triggered Flow |

### Flow Best Practices
- **Bulkification**: avoid SOQL/DML elements inside loops — use Collection variables + Loop
- **Error handling**: add Fault paths on every DML element; log or notify on failure
- **Governor limits**: one Flow can do max 150 DML + 100 SOQL per transaction
- Label all elements clearly — what it does, not just the element type
- Use **Constants** for hardcoded values (labels, thresholds) — never hardcode in element properties
- **Test before activating**: use Flow's built-in debug tool + write test coverage if invoked from Apex

### Record-Triggered Flow — Run Order Awareness
- Fast Field Updates run before triggers
- Actions and Related Records run after triggers (same transaction)
- Async paths run in new transaction — cannot roll back

---

## Validation Rules

### Pattern
```
/* Rule Name: OBJECT_DescriptionOfRule */
/* Error Message: user-friendly, actionable */

/* Example: Require Close Date in future for new Opportunities */
AND(
    ISNEW(),
    CloseDate <= TODAY()
)
/* Error: "Close Date must be in the future for new opportunities." */
/* Error Location: CloseDate field */
```

- Always set **Error Location** to the specific field (not top of page) when possible
- Error message: tell user **what to do**, not just what went wrong
- Test with both positive (should save) and negative (should be blocked) scenarios

---

## Reports & Dashboards

### Report Types to Know
| Type | Use |
|---|---|
| Tabular | Simple lists, exports |
| Summary | Grouped data with subtotals |
| Matrix | Cross-tabulation (rows + columns grouping) |
| Joined | Multiple report blocks in one |

### Dashboard Checklist
- [ ] Meaningful title that says what decision it helps make
- [ ] Running User set appropriately (dynamic dashboards for self-service)
- [ ] Refresh schedule configured
- [ ] Filters exposed for end-user flexibility
- [ ] Each component has a clear label — no "Count of Records" without context

---

## Data Management

### Import Options
| Tool | Best For |
|---|---|
| Data Import Wizard | Standard objects, <50K records, no relationships |
| Data Loader | Any object, large volumes, automation, relationships |
| `sf data import tree` | Dev/test JSON datasets |

### SOQL via CLI (for admin queries)
```bash
# Query via SF CLI
sf data query --query "SELECT Id, Name, CreatedDate FROM Account LIMIT 10" --target-org <alias>

# Export to CSV
sf data export bulk --query "SELECT Id, Name FROM Contact" --output-file contacts.csv --target-org <alias>
```

---

## Metadata Retrieval for Admin Artifacts

When an admin config needs to be deployed (e.g. to production via DevOps), retrieve it first:

```bash
# Retrieve specific metadata
sf project retrieve start \
  --metadata CustomObject:Project__c \
  --metadata CustomField:Project__c.ProjectStatus__c \
  --target-org <sandbox-alias>

# Then hand off to DevOps skill for deployment
```

### Common Metadata Type Names
| Artifact | Metadata Type |
|---|---|
| Custom Object | `CustomObject` |
| Custom Field | `CustomField` |
| Permission Set | `PermissionSet` |
| Profile | `Profile` |
| Flow | `Flow` |
| Validation Rule | `ValidationRule` |
| Page Layout | `Layout` |
| Compact Layout | `CompactLayout` |
| Custom Tab | `CustomTab` |
| App | `CustomApplication` |

---

## Admin Task Quick Reference

```bash
# List all orgs
sf org list

# Open Setup in sandbox
sf org open --target-org <sandbox-alias>

# Retrieve Flow metadata
sf project retrieve start --metadata Flow:Create_Project_Record --target-org <alias>

# Retrieve full object (all fields, layouts, etc.)
sf project retrieve start --metadata CustomObject:Project__c --target-org <alias>
```