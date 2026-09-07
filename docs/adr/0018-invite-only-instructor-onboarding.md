---
status: accepted
---

# Admit Instructor Accounts through Supabase invitations only

The single-college release has no public Account registration or shared registration code. Product
operators invite approved instructors through Supabase; the verified recipient completes a unique
username and password in the application, after which the server creates a fixed Instructor profile.
This keeps enrollment operator-controlled without introducing college tenancy or in-app Account
administration.

## Consequences

- Supabase public signups are disabled, and the application exposes no registration page or API.
- Invitation email links must terminate at the application callback and then the invitation-acceptance
  page; only a server-verified invited identity may create its profile.
- Username uniqueness and reserved-name rules remain database-authoritative. Ordinary acceptance
  always creates an Instructor and never derives authorization from username or Auth user metadata.
- `Zoid`, `Branden`, and `Jeremy` remain manually provisioned Administrator profiles bound to immutable
  Auth user IDs; Product operators perform the rare role assignment directly through Supabase.
- Product operators resend expired invitations through Supabase. The application keeps self-service
  password recovery for Accounts that have completed onboarding.
