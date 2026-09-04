---
status: accepted
---

# Present username sign-in over verified email identities

Accounts require verified email identities in Supabase Auth while the application presents a
username-and-password sign-in form. A server-only bridge resolves the normalized username to the
underlying email before invoking Supabase password authentication. This preserves the requested
username experience without synthetic email identities or a permanently manual recovery system.

## Consequences

- Username-to-email mappings and privileged keys never reach the browser.
- Sign-in failures remain generic so the bridge does not become a username-enumeration endpoint;
  registration still explicitly reports a duplicate username as required.
- Supabase's email verification and password-recovery flows remain usable.
