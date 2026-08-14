# Solon

@~/.claude/CLAUDE.md

---

## Overview

**Solon** is a Bitcoin-native governance platform for transparent treasury management and democratic decision-making through cryptographic voting.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2.5 (App Router) |
| Language | TypeScript 5.5.3 |
| Styling | Tailwind CSS 3.4.9 |
| Database | PostgreSQL with Prisma |
| Testing | Playwright + Puppeteer |
| Bitcoin | BTCPay/Bitcoin Core |

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/       # Dashboard routes
│   ├── (marketing)/       # Landing pages
│   ├── governance/        # Voting, decisions
│   └── treasury/          # Bitcoin treasury
├── components/
│   ├── ui/               # Core UI
│   ├── dashboard/        # Dashboard components
│   └── bitcoin/          # Bitcoin components
├── lib/
│   ├── solon/           # Core Solon logic
│   └── bitcoin/         # Bitcoin integration
└── i18n/                 # Internationalization
```

---

## Four Pillars

1. **Transparent Treasury** - Bitcoin wallet + transaction history
2. **Democratic Voting** - Cryptographic vote verification
3. **Decision Making** - Proposal creation and management
4. **Audit Trail** - Complete transparency

---

## Design System

### Token SSOT: `src/app/globals.css`

All design tokens are CSS custom properties in `globals.css`. `tailwind.config.js` maps Tailwind classes → CSS vars (no literal values).

```css
:root {
  --background:        #ffffff;
  --foreground:        #1e293b;
  --navy:              #1e293b;
  --navy-light:        #334155;
  --navy-dark:         #0f172a;
  --accent:            #f1f5f9;
  --accent-dark:       #e2e8f0;
  --solon-orange:      #f97316;
  --solon-orange-dark: #ea580c;
  --solon-dark:        #0f172a;
  --solon-bitcoin:     #f7931a;
  --solon-light:       #f8fafc;
  --solon-gray:        #64748b;
  --solon-green:       #10b981;
  --solon-blue:        #3b82f6;
}
```

**Tailwind config (`tailwind.config.js`) — all reference CSS vars:**
```js
'solon-orange':      'var(--solon-orange)'
'solon-orange-dark': 'var(--solon-orange-dark)'
'solon-bitcoin':     'var(--solon-bitcoin)'
'solon-dark':        'var(--solon-dark)'
'solon-light':       'var(--solon-light)'
'solon-gray':        'var(--solon-gray)'
'solon-green':       'var(--solon-green)'
'solon-blue':        'var(--solon-blue)'
```

**Custom utility classes (`globals.css`):**
- `.solon-gradient` — navy-to-navy-light linear gradient
- `.solon-text-gradient` — gradient applied as text clip
- `.text-solon-primary` — `color: var(--navy)`
- `.text-solon-orange` — `color: var(--solon-orange)`
- `.bg-solon-orange` — `background-color: var(--solon-orange)`
- `.bg-solon-orange-dark` — `background-color: var(--solon-orange-dark)`
- `.bg-solon-dark` — `background-color: var(--solon-dark)`
- `.btn-primary` — navy background with hover navy-light

### SSOT Rule

All design tokens live in `src/app/globals.css` only. Tailwind config references CSS vars (`'var(--name)'`), never literal values. Components use semantic Tailwind classes, never `bg-[#hex]`.

**Violations to fix when touching UI:**
- `bg-[#hex]` / `text-[#hex]` in className → CSS var + semantic class
- `style={{ color: '#hex' }}` → CSS var + className
- Literal hex in tailwind.config → `'var(--color-name)'`

**Audit:** `grep -r '\[#' src/` — every result is a violation.

---

## Ecosystem

Solon is the governance pillar of a three-product stack (SSOT: `src/lib/config/ecosystem.ts`):
- **OrangeCat** (economy) — orangecat.ch; its allocation policy is governed in Solon, its agent "The Cat" is a voting member
- **FleetCrown** (engineering) — fleetcrown.orangecat.ch; its agent "Loki" is a voting member, its shared deploy workflow ships Solon
- **Solon** (governance) — this repo; `/ecosystem` renders the live governed state

## Navigation Structure

### Platform
- Overview → `/`
- Features → `/features`
- Security → `/security`
- Integration → `/integration`

### Governance
- Voting System → `/governance/voting`
- Decision Making → `/governance/decisions`
- Transparency → `/governance/transparency`
- Audit Trail → `/governance/audit`

### Treasury
- Bitcoin Treasury → `/treasury/bitcoin`
- Transaction History → `/treasury/transactions`
- Budget Tracking → `/treasury/budget`
- Financial Reports → `/treasury/reports`

---

## API Structure

```typescript
// Treasury
GET /api/treasury/balance
GET /api/treasury/transactions
POST /api/treasury/proposal

// Voting
GET /api/voting/active
POST /api/voting/cast
GET /api/voting/results

// Governance
GET /api/governance/decisions
POST /api/governance/decision
GET /api/governance/audit
```

---

## Quick Start

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

---

## Testing

```bash
npm run test:e2e           # Playwright tests
npm run test:puppeteer     # Smoke tests
npm run test:puppeteer:mega  # Mega menu tests
```

---

## Don't

- Skip cryptographic verification for votes
- Expose private keys or wallet secrets
- Hardcode Bitcoin addresses
- Commit .env files

---

**Last Updated**: 2026-01-23
