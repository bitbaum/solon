# One account across OrangeCat, Loki and Solon

_Proposal, 2026-09-25. George: "we need a robust auth on orangecat, loki and
solon. we need uniformity … registration on solon should not require oc, just
like on loki. but one can log in or register with oc." Needs his go-ahead:
it changes how every OrangeCat user signs in._

## What exists (surveyed 2026-09-25)

| | OrangeCat | Loki | Solon |
|---|---|---|---|
| Library | Supabase GoTrue + its own OIDC provider | next-auth 5 beta + Drizzle adapter | next-auth 5 beta, no adapter |
| Sign in with | email+password, Google, GitHub, anonymous, optional TOTP | email+password, OrangeCat, GitHub, Google, X | OrangeCat only |
| Own users table | yes (the identity root) | yes (`users.orangecat_actor_id`) | no |
| Passwordless email | no | no | no |
| Passkeys | no | table exists, unused | no |

Frictions a person meets today: Solon has no sign-up of its own ("get an
OrangeCat account first"); an anonymous OrangeCat account hits a dead end on
Solon; OrangeCat asks for a captcha and may require email confirmation before
first login; Loki forces an onboarding step. Gaps: no rate limit on
OrangeCat's OIDC endpoints, on Loki's password sign-in, or anywhere in Solon.

## The options

**A — One identity, created from anywhere (recommended).** OrangeCat stays the
one identity provider (the fleet standard: `sub` = actor id is the only key
across products). What changes is that nobody has to *go to* OrangeCat:
Solon's and Loki's own "Create account" and "Sign in" screens start the same
OIDC flow with `prompt=create` and the email pre-filled, and OrangeCat renders
its sign-in and sign-up screens in the requesting product's name and look. The
person creates "a Solon account" and later finds it also works on OrangeCat
and Loki. One place to secure, one account to remember.

**B — Each product runs its own accounts, linked to OrangeCat optionally.**
Three user tables, three password resets, three places to add passkeys; the
fleet standard (STACK.md) forbids exactly this, and the drift it warns about
is already visible between Loki and OrangeCat.

**C — A shared login cookie across `*.orangecat.ch`.** Fragile across two
auth stacks (Supabase vs Auth.js), and Loki's identity-bridge doc already
calls it a stopgap.

## What A needs, in order

1. **OrangeCat, the identity root**
   - Passwordless sign-in by a six-digit email code (GoTrue supports OTP),
     alongside passwords, Google and GitHub.
   - Passkeys (WebAuthn) for returning users.
   - `prompt=create` and `login_hint` on `/oauth/authorize`, and client
     branding on the auth screens (name, logo, accent from the client row).
   - Anonymous → email upgrade inline in the flow, instead of the dead end.
   - Rate limits on `/oauth/*` (limitkit).
   - Captcha only when risk is detected, never by default (no-auth-friction rule).
2. **Solon**
   - `/sign-in` and `/sign-up` pages in Solon's design: email field first,
     then passkey / Google / GitHub / OrangeCat — all one flow underneath.
   - No more hard rejection of email-less accounts: ask for the email inline.
   - My Solon (`/me`), profile, and seats across organizations.
   - Rate limits on writes (limitkit).
3. **Loki**
   - Keep its users table for Loki-only data, keyed by `sub`; route new
     sign-ups through the shared flow; existing email+password users keep
     working and are offered a one-click link.

## What stays true

- `sub` is the only cross-product key; email never links accounts.
- No product stores another product's password or session.
- Every screen that stops a person shows the way forward (fleet rule: no dead ends).
