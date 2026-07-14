# API conventions

Applies only to modules where the plan's API Exposure Decision resolved to **(A) public
endpoint**. Internal-only (Decision B) work uses Server Actions directly and doesn't need this
file — no versioned route, no Bearer scheme.

## Route shape

```
app/api/v1/[module]/route.ts        GET (list), POST (create)
app/api/v1/[module]/[id]/route.ts   GET (one), PATCH (update), DELETE
```

Versioned from the start (`/v1/`) even on a brand-new project — bumping later without a version
in the path breaks every existing integration silently.

## Auth

```
Authorization: Bearer sk_live_<random>   # production
Authorization: Bearer sk_test_<random>   # sandbox, never touches real tenant data
```

Route Handler responsibilities, in order, before touching Supabase:

1. Validate the Bearer key format and prefix.
2. Resolve the key to an `org_id` and tier — reject with `401` if it doesn't resolve.
3. Check the tier against what this endpoint/field requires — reject with `403` if insufficient.
4. Only then query Supabase, using the resolved `org_id` (RLS is the second line of defense, not
   the first — the endpoint should never rely on RLS alone to catch a wrong-tenant request it
   could have rejected earlier).

## Response shape

```json
{
  "data": { },
  "error": null
}
```

```json
{
  "data": null,
  "error": { "code": "invalid_scope", "message": "..." }
}
```

Consistent envelope across every endpoint — a caller shouldn't need to know which module they're
hitting to know how to check for an error.

## Rate limiting

Every public endpoint needs a stated limit before it ships, even a generous one — "no limit yet"
is not a valid answer at plan time. channel flags a missing rate-limit decision the same way she
flags a missing RLS policy.

## channel's audit checklist against this file

- [ ] Route is versioned (`/v1/`)
- [ ] Auth check happens before any Supabase query, not interleaved with it
- [ ] Tier/scope check happens before the query runs, not filtered out of the response after
- [ ] Error responses never leak whether a resource exists for a different tenant (same `404`
      shape whether the row doesn't exist or belongs to someone else)
- [ ] A rate limit is stated, even if generous
- [ ] `sk_test_*` keys are provably incapable of reaching production tenant rows
