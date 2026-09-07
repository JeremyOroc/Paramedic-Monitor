# Supabase Account Invitations

The single-college release admits Instructor Accounts only through Supabase invitations. There is no
public registration page or shared registration code. Product operators perform these steps; ordinary
Administrators do not manage Accounts inside the application.

## One-time hosted-project configuration

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to `https://YOUR-DOMAIN/auth/invite`.
3. Add `https://YOUR-DOMAIN/auth/callback` and `https://YOUR-DOMAIN/auth/invite` to the allowed
   redirect URLs. Add the equivalent Preview URL only while intentionally testing a Preview deployment.
4. Open **Authentication → Providers → Email** and turn **Allow new users to sign up** off.
5. Keep email/password authentication enabled.

The standard Supabase invitation template can remain unchanged. Its confirmation link returns to the
Site URL, where the application validates the invitation session and opens account setup. A customized
token-hash template that calls `/auth/callback?token_hash={{ .TokenHash }}&type=invite` is also
supported, but it is not required.

## Invite an ordinary Instructor

1. Open **Authentication → Users**.
2. Select **Add user → Send invitation**.
3. Enter the approved instructor's email and send the invitation.
4. The recipient opens the email link, chooses a unique username and password, and selects
   **Finish setup**.
5. The application creates an enabled Instructor profile. The recipient signs out and signs back in
   with the chosen username and password to complete the acceptance check.

Do not manually create an `account_profiles` row for an ordinary Instructor; invitation acceptance
creates it with the fixed Instructor role.

## Provision `Zoid`, `Branden`, or `Jeremy` as an Administrator

1. Send the Supabase invitation first.
2. Copy the new user's immutable UUID from **Authentication → Users**.
3. Before the recipient finishes setup, insert the matching protected profile through the Supabase SQL
   Editor, substituting the exact UUID and one reserved username:

```sql
insert into public.account_profiles (user_id, username, role, status)
values ('AUTH-USER-UUID', 'Jeremy', 'administrator', 'enabled');
```

4. The recipient opens the invitation and chooses a password. The application displays the
   pre-provisioned username without allowing it to be changed and preserves the Administrator role.
5. Verify the Account page shows the intended username and Administrator role.

Never assign Administrator authority from Auth user metadata or username matching. The role belongs
only to the protected profile attached to the immutable Auth UUID.

## Legacy-key retirement gate

Before deactivating legacy Supabase keys, deploy the invite-only revision with the new publishable and
secret key values, complete one real invitation, sign out, sign back in by username/password, exercise
one protected workflow, and confirm `/api/health` returns HTTP 200 with `database: ok`. Repeat those
checks immediately after deactivation and reactivate the legacy keys if any check fails.
