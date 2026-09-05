---
status: accepted
---

# Gate Instructor self-registration with one shared code

The single-college release requires one shared Instructor registration code in addition to a unique
username, verified email, and password. A valid code grants the ordinary Instructor role; it never
grants Administrator authority. This is a deliberately lightweight enrollment boundary while demand
for tenant membership, college domains, invitations, or enterprise SSO remains unproven. It is an
explicitly temporary first implementation and must be reconsidered before a second-college or broader
public rollout.

## Consequences

- Anyone who obtains the shared code may create an Instructor Account; the code does not prove
  identity or affiliation with the college.
- The code affects registration only. Existing Accounts keep their access if the code later changes.
- The high-entropy, case-sensitive value exists only in server-side deployment configuration. It is
  validated only as part of registration, is never exposed or preflighted, and produces a generic
  invalid-code response.
- Product operators rotate the value through deployment configuration.
- Application CAPTCHA and custom throttling remain deferred while Supabase's platform protections
  stay active.
- Administrators still do not manage Accounts in the application; Product operators use Supabase.
