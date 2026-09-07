---
status: accepted
---

# Build for one college before introducing tenancy

The first account release treats its one college as implicit and does not introduce institution
records, tenant memberships, tenant switching, college-specific administration, or per-college SSO.
Multi-college SaaS is possible but unconfirmed, so the system will preserve a clean authorization and
ownership seam without paying the implementation and product cost of speculative tenancy now.

## Consequences

- Personal data belongs directly to an Account in the first release.
- A later multi-college release can add an institution boundary and migrate the initial college's
  records without exposing tenant concepts in today's interface.
