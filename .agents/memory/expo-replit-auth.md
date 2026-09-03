---
name: Replit Auth on Expo apps
description: How to handle login/signup/Google OAuth requests on Expo apps that use Replit Auth (not Supabase)
---

When a user request assumes a Supabase-style auth stack (separate email/password
forms, a "Sign in with Google" button, password reset flow) but the project
actually uses Replit Auth (OIDC via `expo-auth-session` + a `/api/mobile-auth/*`
token-exchange backend), do not build those custom pieces.

**Why:** Replit's hosted OIDC login page already offers email/password, Google,
and other providers on a single consent screen. A custom login/signup form has
no backend to validate against, and a custom "Google button" would duplicate a
provider already available for free at `promptAsync()` time.

**How to apply:** Build one branded `/auth` screen with "Se connecter" /
"Créer un compte" buttons that both call the existing `login()` from
`useAuth()` (which calls `promptAsync()`). Route all `onPress={login}` call
sites in tab screens through `router.push("/auth")` instead of calling
`login()` directly, so the branded screen always shows first.

Do not mention "Replit" in user-facing copy on this screen — the client
explicitly asked for it to look like a first-party WapiGarage auth page, not
a Replit-branded one. Describe the login options (email, Google, etc.) in
generic terms without naming the underlying provider.

The hosted OIDC consent screen itself opens in an in-app browser session
(ASWebAuthenticationSession/Custom Tabs via `expo-auth-session`), not the
external system browser — this is the secure/standard behavior and isn't a
bug to "fix" by building inline native forms (there's no backend to validate
custom email/password without Supabase).

For account-type selection (Client vs Garage Pro) that a Supabase signup flow
would normally collect via a custom form field, thread an `isNewUser` flag
through the OIDC token-exchange response (compare pre-insert vs post-insert
user row) and show a native post-login picker screen instead of trying to
add custom fields to the hosted login form.
