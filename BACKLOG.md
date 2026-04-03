# QualCard Backlog

## Credential Deduplication
- Add fuzzy match warning when a Company Admin adds an "Other / Not Listed" credential that closely matches an existing global credential
- Add a QC Admin merge tool in the Credentials Catalogue to merge duplicate credentials
- On merge: update all cardholder_credentials records to the canonical ID, delete duplicate, notify QC Admin by email
- Flagging system: if a company saves a "new" credential that closely matches an existing one, flag it for QC Admin review

## Credential Info View Modal
- Clicking on a credential row on the cardholder detail page should open a read-only modal showing: credential name, code/number, training provider, issue date, expiry date, status badge

## Reassign Company
- Currently built but needs testing end to end

## Coming Soon action card on Company detail page
- Candidates: Add company admin user, View Stripe billing info, Impersonate/login as company

## IMPERSONATE MODE## FOR QC ADMIN?

## QC Admin - when i add a person and select active it shows as payment pending on the cardhodlers page, it should go to active and show todays date in one year in the susbcription exipry field

## Tech Debt / Production Readiness
- Create `.env.example` with required environment variables documented
- Add `robots.txt` and sitemap for public pages
- Add OG meta tags for public card pages (`/card/[slug]`)
- Centralise duplicated status colour logic (`getStatusColour`, `getCardTint`, `getStatusBarColor`) into shared utility
- Add `loading.js` files for key route segments
- Add caching strategy (React Query/SWR) for Supabase queries
- Move single-add credential modal to use API route instead of direct Supabase
