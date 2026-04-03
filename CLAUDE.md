# QualCard — Claude Code Rules

My name is Jonesy. Call me that, not "User". I'll often refer to you as CC.

---

## Always Do First

* Invoke the `frontend-design` skill before writing any frontend code, every session, no exceptions.

## Skill Usage Rules

* Always use the `debug-fixer` skill when handling errors or debugging.
* Always apply the `code-quality` skill when writing or modifying code.

---

## Commands

```
npm run dev
npm run build
npm run lint
```

---

## What This Project Is

QualCard is a SaaS credential management platform for the NZ construction and trades industry. i have a working model made in Zite by Fillout, which i can always get info from. Either screenshots or explanation of logic

---

## Stack

* Next.js App Router (JavaScript)
* Supabase
* Stripe (not yet implemented)
* AutoSend
* Vercel

---

## App Structure

| Area                   | Route                          |
| ---------------------- | ------------------------------ |
| Public card            | `/card/[slug]`                 |
| Dashboard              | `/dashboard`                   |
| Cardholders list       | `/dashboard/cardholders`       |
| Cardholder detail      | `/dashboard/cardholders/[id]`  |
| Superadmin             | `/superadmin`                  |
| Company detail         | `/superadmin/companies/[id]`   |
| Cardholder detail (QC) | `/superadmin/cardholders/[id]` |
| Login                  | `/login`                       |
| Register company       | `/register/company`            |
| Confirm                | `/register/confirm`            |
| OAuth callback         | `/auth/callback`               |
| Payment summary        | `/payment-summary` (NOT BUILT) |
| Payment success        | `/payment-success` (NOT BUILT) |

---

## Critical Business Rules

### Cardholder Activation

Allowed:

* QC Admin via API
* Future Stripe webhook

Rules:

* All activation MUST go through API routes
* Direct Supabase client mutations are NOT allowed

Licence dates:

* Automatically set when activating if missing or expired

---

## LICENCE STATUS (SINGLE SOURCE OF TRUTH)

`/lib/licenceStatus.js` is the ONLY source of truth.

Rules:

* Must be used everywhere licence status is shown
* Do not duplicate logic
* Do not reimplement in components/pages

Behaviour:

* null → Payment Pending
* past → Expired
* ≤30 → Expiring Soon
* ≤90 → Active (with renew)
* > 90 → Active

Licence status ≠ credential status

---

## Credential Status

Separate from licence logic.

Rules:

* Calculated from expiry_date
* Never stored
* Never use licenceStatus for credentials

---

## STATUS COLOURS (STRICT)

These are the ONLY valid status colours across the entire application:

Active → #16A34A  
Expiring → #F59E0B  
Expired → #EF4444  
Pending → #F97316  
Inactive → #4A5568  
Payment Pending → #0EA5E9  

Rules:
- No alternative shades allowed
- No context-based colour variations
- Do not introduce new status colours under any circumstance
- All status UI (badges, tables, cards) must use these values only

---

## DESIGN REFERENCE

This section is a visual reference only. It does not override system rules.

### Core Colours
Primary → #34495E  
Primary Deep → #2C3E50  
Accent → #2f6f6a  
Background → #D9DEE5  
Card → #FFFFFF  
Text → #333333  
Muted → #E5E7EB  

### Gradient
radial-gradient(circle, #34495E 0%, #2C3E50 100%)  
Used only for headers and structural elements, not buttons

### Cards
Light:
- white background
- subtle border
- soft layered shadow

Dark:
- dark teal background (#1f3f3c)
- subtle border
- deeper shadow

### Buttons
Primary:
- background #2f6f6a
- white text
- slight hover lift

Secondary:
- white background
- grey border
- darker text

Destructive:
- background #EF4444
- white text

### Tables
- uppercase headings
- muted heading colour (#6B7280)
- light row borders (#E5E7EB)
- subtle hover background

Important:
- Component system rules take priority over this section

## COMPONENT SYSTEM (MANDATORY)

The following MUST exist in `/app/components`:

* StatusBadge
* Button (primary, secondary, destructive)
* Card (light, dark)
* Table
* Input

Rules:

* No duplicated inline style blocks
* No per-page implementations
* No switch/case badge logic in pages
* If reused more than once → extract

Current duplication is technical debt and must be removed.

---

## Styling Rules

* Tailwind for layout only
* Brand colours only
* No default Tailwind colours

---

## Making Changes 

Do not many any changes until you have 95% confidence in what you need to build. Ask me follow up questions until you reach that confidence

## Hard Rules

* No TypeScript going forward (existing file must be converted)
* No magic link
* No automatic activation
* No status stored in DB
* No hardcoded URLs
* No transition-all

---

## Known Issues

* Company delete is a hard delete (should be soft-delete)
* UI duplication across components

---

## Next

* Stripe integration
* Build shared component system
* Fix company delete to soft-delete

---

## MODE SYSTEM

MODE: BUILD
MODE: DEBUG
MODE: ASK
