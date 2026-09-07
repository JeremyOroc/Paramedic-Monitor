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
  invitation acceptance still explicitly reports a duplicate username as required.
- Supabase's email verification and password-recovery flows remain usable.
- Usernames are 3–30 characters, start and end alphanumerically, and permit only letters, numbers,
  periods, underscores, and hyphens; display case is preserved while comparison is case-insensitive.
- An Invited Account claims its username only while accepting a verified Supabase invitation;
  concurrent duplicate claims are resolved by the protected database uniqueness constraint.
- Invitation acceptance establishes the password and Account profile before entering the Instructor
  home. A profile-write failure leaves the verified invited identity outside ordinary product areas
  and allows the acceptance step to be retried.
- An SMTP outage delays verification and recovery but never permits an operator-selected or revealed
  password.
