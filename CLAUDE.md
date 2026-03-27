@AGENTS.md

---

# QualCard — Claude Code Rules

My name is Jonesy. Call me that, not "User". I'll often refer to you as CC.

---

## Always Do First
- Invoke the `frontend-design` skill before writing any frontend code, every session, no exceptions.

## Skill Usage Rules
- Always use the `debug-fixer` skill when handling errors or debugging.
- Always apply the `code-quality` skill when writing or modifying code.

---

## Commands

```
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
```

---

## What This Project Is

QualCard (qualcard.co.nz) is a SaaS credential management platform for the NZ construction and trades industry. Workers get a digital credential profile accessible via QR code. Site supervisors scan the QR on-site to verify qualifications. Employers manage credentials through an admin portal.

This is a production rebuild of a working prototype. Real users exist. Be careful with data logic.

Part of the MW Group family of products (MW Group is the parent brand — never "MAW Group" or "Men at Work Group").

---

## Stack

- **Framework:** Next.js App Router (JavaScript only — no TypeScript)
- **Database + Auth:** Supabase (Postgres, RLS, Auth, Storage)
- **Payments:** Stripe (native Next.js SDK)
- **Email:** AutoSend
- **Hosting:** Vercel
- **Domain:** qualcard.co.nz (single domain, single app)

---

## App Structure

| Area | Route | Auth Required |
|------|-------|--------------|
| Public worker card | `/card/[slug]` | No — mobile-first, must be fast |
| Company Admin portal | `/dashboard` | Yes — desktop-focused |
| QualCard Admin portal | `/superadmin` | Yes — desktop-focused |
| Login | `/login` | No |
| Register | `/register` | No |
| Company registration | `/register/company` | No |
| Payment summary | `/payment-summary` | Yes |
| Payment success | `/payment-success` | Yes — display only |

### Project Structure

```
app/
  card/[slug]/         # Public QR scan destination — mobile-first
  dashboard/           # Company Admin portal — desktop-focused
  superadmin/          # QualCard Admin portal — desktop-focused
  login/               # Login page
  register/            # Registration landing
  api/                 # API routes (Stripe webhook, Supabase helpers)
  components/          # Global reusable components
  globals.css          # Brand CSS variables
  layout.js            # Root layout
  page.js              # Root redirect
```

---

## Layout Approach by Area

- `/card/[slug]` — mobile-first. Primarily scanned on a construction site on a phone. Renders as a centred narrow card on desktop — that is intentional and correct.
- `/dashboard` and `/superadmin` — desktop-first. Company admins and QualCard staff work at a desk.
- `/login`, `/register`, `/register/company` — desktop-first, but must be responsive and fully functional on mobile.
- All other routes — desktop-first, responsive.

---

## Two Roles Only

| Role | Route | Access |
|------|-------|--------|
| `qc_admin` | `/superadmin` | Full access to everything |
| `company_admin` | `/dashboard` | Own company data only |

No other roles exist. If you see `self_managed` anywhere, it is legacy — remove it.

---

## Auth

- Email/password + Google OAuth only
- Supabase Auth handles sessions
- No magic link, no passwordless
- Post-login routing: `qc_admin` → `/superadmin`, `company_admin` → `/dashboard`
- Redirect to `/login` if no session or `account_status !== 'active'`

---

## Critical Business Rules

### Cardholder Activation
A cardholder becomes active in EXACTLY two ways:
1. QC Admin explicitly activates them in the superadmin portal
2. Stripe webhook fires after successful payment

Adding a credential NEVER activates a cardholder. There is no automatic activation.

### Stripe
- Annual subscriptions only — no monthly billing
- `/payment-success` is DISPLAY ONLY — never runs activation logic
- All activation handled exclusively by webhook at `/api/webhooks/stripe`
- Use raw body parsing for Stripe signature verification

### Credential Status — Never Stored, Always Calculated
Calculate from `expiry_date` at render time:
- `NULL` → Active (no expiry)
- More than 30 days away → Active
- Within 30 days → Expiring Soon (amber)
- In the past → Expired (red)

Never store credential status in the database.

### Credential Display Order
- `is_manually_ordered = true` → sorts first, ordered by `display_order`
- `is_manually_ordered = false` → qualifications by newest issue date; competencies/permits/inductions alphabetically
- Reordering via UI arrows sets `is_manually_ordered = true`

### Soft Delete
- Cardholders: soft delete only — set `status = 'deleted'`, never DELETE from DB
- Credentials: hard delete is fine
- Companies: hard delete — unlink cardholders and users first

### Slug Format
`{firstname}-{lastname}-{12randomdigits}` e.g. `lachie-anderson-806940008539`
Must be unique — check for collisions before saving.

### URLs
Always use `NEXT_PUBLIC_APP_URL` env var — never hardcode qualcard.co.nz or localhost.

---

## Brand & Design System

**Font:** Inter (Helvetica Neue / system sans-serif fallbacks)
**Border Radius:** 1rem (rounded/pill-style buttons)

### Core Colours

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#34495E` | Headers, active tabs, structural chrome |
| Primary Deep | `#2C3E50` | Gradient end point |
| Accent | `#2f6f6a` | Action buttons, focus ring, active badges, highlights |
| Secondary | `#374151` | Muted text, secondary elements |
| Table Headings | `#6B7280` | Table column headers |
| Background | `#D9DEE5` | Page background |
| Foreground | `#333333` | Body text |
| Card | `#FFFFFF` | Card backgrounds |
| Muted | `#E5E7EB` | Borders, muted backgrounds |
| Destructive | `#EF4444` | Delete/error actions |
| Focus Ring | `#2f6f6a` | Teal focus ring |

### Primary Gradient
`radial-gradient(circle, #34495E 0%, #2C3E50 100%)`
Used on: headers, active tabs, structural chrome only. NOT on action buttons.

### Action Buttons
All primary action buttons use solid `#2f6f6a` (teal). Not the gradient.

### Status Badge Colours

| Status | Hex |
|--------|-----|
| Active | `#2f6f6a` |
| Inactive | `#4A5568` |
| Pending | `#F97316` |
| Company Managed | `#0EA5E9` |
| Expiring Soon | `#F59E0B` |
| Expired | `#EF4444` |

### Chart Colours
- Chart 1: `#2f6f6a` (Teal)
- Chart 2: `#374151` (Slate)

---

## Styling Rules

- Tailwind for layout and spacing — brand colours via CSS variables in `globals.css`
- Never use default Tailwind palette as primary branding (no `blue-600`, `indigo-500` etc.)
- `/card/[slug]` is mobile-first (centred narrow card on desktop is intentional). All other routes are desktop-first, responsive.
- Use `next/image` for all images — always include `width`, `height`, and `alt`

---

## Anti-Generic Guardrails

- **Shadows:** Never flat `shadow-md`. Use layered, colour-tinted shadows with low opacity.
- **Typography:** Clear hierarchy between headings and body. Tight tracking (`-0.03em`) on large headings. Generous body line-height (`~1.7`).
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Subtle easing only.
- **Interactive states:** Every clickable element must have `hover`, `focus-visible`, and `active` states.
- **Spacing:** Consistent spacing tokens — avoid arbitrary Tailwind steps.

### Layout Containers

```
max-w-7xl
mx-auto
px-6 (mobile) / px-8 (desktop)
py-20 (mobile) / py-28 (desktop)
```

---

## Output Rules

- Always return full file contents when modifying a file — never partial snippets.
- All outputs must be copy-paste ready.
- Never explain changes unless explicitly asked.
- Keep responses concise and structured.

When modifying files, always use this format:

```
FILE: /app/example/page.js

// full updated file content
```

---

## Debug Rules

When an error is provided:
- Identify the root cause first
- Do not provide theory without a fix
- Provide the exact fix immediately
- Reference the exact file and line where possible
- If multiple fixes are possible, choose the simplest
- Do not suggest broad refactors unless explicitly requested

---

## Hard Rules

- No TypeScript — JavaScript only
- No em dashes (—) anywhere — use commas or rewrite the sentence
- No magic link or passwordless auth
- No `self_managed` role — remove it if found
- No hardcoded URLs — always use `NEXT_PUBLIC_APP_URL`
- No automatic cardholder activation — always explicit
- No credential status stored in DB — always calculated from `expiry_date`
- No monthly Stripe billing — annual only
- No activation logic in `/payment-success` — webhook only
- Do not start background processes
- Do not run multiple dev servers
- Do not push to GitHub until explicitly instructed
- Do not add features or sections not requested
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary brand colour

---

## Environment Variables

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://qualcard.co.nz
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTOSEND_API_KEY=
```

---

## Current Build State

### Done
- Public card page `/card/[slug]` — complete, mobile-first
- Supabase schema — complete with RLS policies
- Auth — login page built, Supabase email/password + Google OAuth working, role-based routing confirmed
- RLS policies on `users` table — 4 clean non-recursive policies in place
- Company registration form `/register/company` — complete, saves to registration_drafts table
- Registration confirmation page `/register/confirm` — complete
- RLS policy on `registration_drafts` — anonymous insert allowed for public registration
- `/superadmin` portal — Overview, Pending Approvals, Users, Companies tabs complete
- All superadmin API routes using service role key to bypass RLS

### Next
- `/superadmin` Cardholders tab
- `/dashboard` portal
- Cardholder management
- Credential management
- Stripe integration
- AutoSend email digests

---

## MODE SYSTEM

All responses must end with one of:

```
MODE: BUILD   # creating or modifying code
MODE: DEBUG   # fixing errors
MODE: ASK     # asking for clarification
```

Do not omit this.
