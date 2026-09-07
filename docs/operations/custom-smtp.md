# Custom Auth SMTP Runbook

Supabase's default mail service is for development and limited team-address testing. Classroom
invitations and password recovery require a custom SMTP provider and a verified sending domain.

## Configure

1. Select an SMTP provider approved for the college deployment and record its privacy, residency,
   retention, support, and breach-notification terms privately.
2. Use a dedicated authentication subdomain and sender, for example
   `no-reply@auth.your-approved-domain.ca`. Do not mix Auth and marketing mail.
3. Publish and verify SPF, DKIM, and DMARC for the sending domain.
4. Disable link tracking and URL rewriting for Auth messages; modified invitation and recovery URLs can
   invalidate the security flow.
5. In **Supabase → Authentication → Emails → SMTP Settings**, enable custom SMTP and enter the provider
   host, port, username, password, sender address, and `Paramedic Monitor` sender name.
6. Keep email/password enabled, public signup disabled, email confirmation enabled, and OTP/invitation
   expiry at one hour or less.
7. Review **Authentication → Rate Limits**. The initial custom-SMTP limit is typically 30 Auth emails
   per hour; increase it only to the documented enrollment need.
8. Keep provider credentials in Supabase/provider secret storage. Never place them in Vercel public
   variables, `.env` templates, source control, screenshots, or support tickets.
9. Record a fallback provider or escalation contact. Operational failure alerts should use a separate
   channel so a primary Auth-mail outage cannot suppress its own alert.

## Acceptance tests

Run these with approved test addresses on the production domain configuration:

1. Send a Supabase Dashboard invitation to a new test Instructor.
2. Confirm sender alignment, TLS delivery, no spam warning, and an unchanged application URL.
3. Accept the invitation, choose a unique username and password, sign out, then sign in by username.
4. Request **Forgot password?**, open the newest message, change the password, and sign in with it.
5. Confirm an expired or reused link fails generically and can be resolved by an operator resend.
6. Confirm delivery failure never creates a password bypass or reveals whether a username exists.
7. Review provider logs for delivery metadata only; do not copy recipient addresses into repository
   evidence. Record pass/fail, timestamp, provider incident ID if applicable, and tester privately.

Repeated invitation or recovery delivery failures trigger the incident runbook and a sanitized alert to
both developers. Normal password sign-in remains available; operators never reveal, choose, or manually
reset an Instructor password.
