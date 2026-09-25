# One account across OrangeCat, Loki and Solon

_Decided 2026-09-25: option A. George: "go with option A for auth, build it.
It should be easy for people to create accounts in any way they prefer … I
would really prefer not to pay for things and … to use open source." Status
at the end._

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

## Status (2026-09-25)

Everything below is free and self-hosted: GoTrue v2.189 and OrangeCat's own
OIDC provider on the box, no paid identity service.

**Shipped**

- OrangeCat (bitbaum/orangecat#1153): `/oauth/authorize` honours
  `prompt=create`, `login_hint` and `idp_hint`; `/auth` names the app that sent
  you (looked up server-side) and hides the anonymous lead there; Google/GitHub
  sign-in from another app now returns to it (it used to drop you on
  OrangeCat's welcome page); an anonymous account adds its email inline instead
  of hitting a dead end. Discovery advertises `prompt_values_supported`.
- Solon (#191): `/sign-up` and `/sign-in` in five languages, email first, then
  Google, GitHub or an existing OrangeCat account; the header remembers the
  page you were on; `/account` signed out goes to `/sign-in`.
- Already true before this work: email + password sign-up with no
  confirmation step (auto-confirm on), Google, GitHub and X enabled on GoTrue.

**Not done, on purpose**

- An IP rate limit on `/oauth/token`: every relying party calls it from the
  same box address, so a per-IP budget would throttle all sign-ins to Solon,
  Loki and Heidi together. Codes are single-use, PKCE-bound and need the client
  secret; there is nothing to brute-force there.

**Next**

1. Six-digit email code as a password-free option: GoTrue supports it; it needs
   the magic-link mail template to carry `{{ .Token }}` (box config) and a code
   field on `/auth`.
2. Passkeys for returning people.
3. Loki: send new sign-ups through the same flow; keep its users table keyed by
   `sub`.
4. Solon: `/me` with seats across organizations; limitkit on writes.
