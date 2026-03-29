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
