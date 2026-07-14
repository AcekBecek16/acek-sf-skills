# Multi-tenant RLS pattern

Used by **isla** when building schema/migrations, and by **channel** as the checklist for
auditing them. This is the project-specific layer on top of Supabase's own official
`supabase-postgres-best-practices` skill — that skill covers general Postgres/RLS technique,
this file covers the tenant-isolation convention this project actually uses.

Only applies when the plan's Tenancy Decision resolved to **multi-tenant**. Skip entirely on a
single-tenant/generic plan.

## Schema convention

Every tenant-scoped table gets:

```sql
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  -- ...feature columns...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.contacts (org_id);
```

`org_id` is never nullable on a tenant-scoped table. If a table genuinely has no tenant owner
(e.g. a global lookup table), that's a signal it doesn't belong to this pattern — flag it in the
plan's Decisions rather than adding a nullable `org_id` as a workaround.

## RLS policy convention

```sql
alter table public.contacts enable row level security;

create policy "contacts_tenant_isolation_select"
  on public.contacts for select
  using (org_id = (select org_id from public.memberships where user_id = auth.uid()));

create policy "contacts_tenant_isolation_write"
  on public.contacts for insert with check (
    org_id = (select org_id from public.memberships where user_id = auth.uid())
  );
```

Split policies by operation (`select` / `insert` / `update` / `delete`) rather than one
catch-all `for all` policy — it's easier for channel to audit each operation independently, and
easier to reason about when only some operations need extra restriction (e.g. delete restricted
to a specific role).

**isla writes a test for every RLS policy she creates** — at minimum: a query as tenant A cannot
see tenant B's rows, and a query as tenant A can see tenant A's own rows. This is not optional
per her own working style, not just a house rule.

## API key tier scoping

For endpoints exposed per the plan's API Exposure Decision, keys carry a live/test prefix and a
tier that maps to a Postgres role or a claim checked in the Route Handler:

```
Authorization: Bearer sk_live_<random>
Authorization: Bearer sk_test_<random>
```

- `sk_test_*` keys only ever resolve against seed/sandbox data, never production tenant rows.
- Tier (e.g. free / pro / enterprise) gates which fields or endpoints are reachable — this check
  happens in the Route Handler before the Supabase query runs, not as an RLS policy, since tier
  is a product/billing concept rather than a data-ownership one.

## channel's audit checklist against this file

- [ ] `org_id` present and non-nullable on every new tenant-scoped table
- [ ] RLS enabled on every new table — no table ships with RLS off "temporarily"
- [ ] Policies split by operation, each one testable independently
- [ ] Every policy references `auth.uid()` or an equivalent — never a client-supplied `org_id`
      trusted at face value
- [ ] At least one negative test exists (tenant A cannot read tenant B's row)
- [ ] Service-role key never used in a code path reachable from the client
- [ ] If an endpoint exists for this module, tier scoping happens before the query runs, not
      after
