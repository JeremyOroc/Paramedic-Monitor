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
- Usernames are 3–30 characters, start and end alphanumerically, and permit only letters, numbers,
  periods, underscores, and hyphens; display case is preserved while comparison is case-insensitive.
- A Pending Account reserves its username until verification or operator deletion and may resend its
  verification message. The first release has no scheduled abandonment cleanup.
- Registration/profile creation must reject concurrent duplicate claims without leaving an
  authenticated identity that lacks its required Account profile.
- Registration ends on a Check-email/resend state; verification establishes a session and enters the
  Instructor home. Pending sign-in directs the user back to verification.
- If Auth identity creation outlives a failed profile write, the server removes it immediately. A
  cleanup failure quarantines the identity and alerts operations rather than granting access.
- An SMTP outage delays verification and recovery but never permits an operator-selected or revealed
  password.
