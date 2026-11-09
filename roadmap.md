# First-access security correction
- [x] Block email-only password changes on the deployed server.
- [x] Add server-enforced expiring, single-use invitations; lock all legacy accounts.
- [x] Update activation and administrator invitation screens without changing other modules.
- [x] Test activation rules and deployed unauthorized requests; report limitations.
- [x] Validate a newly invited test account end-to-end with a recipient-controlled test email.
- [ ] Verify recovery delivery and link on the test account without changing existing passwords. Blocker: recipient must confirm email receipt and open it from the preview/production; no mailbox session is available.
- [x] Verify existing-account authenticated access, preserve the 12 legacy accounts, and report publication readiness without publishing.
- [ ] Verify existing-account password login. Blocker: account owner must sign in with their unchanged password; only managed session restoration was tested.

# Production publication of the first-access correction
- [x] Re-run the 64 existing tests and verify deployed invitation rejection, service-only activation permissions, and preservation of all 12 original accounts.
- [x] Confirm the current build completed without errors: harness recorded `build OK` at 2026-11-09 19:03:27 UTC.
- [x] Summarize the eight pre-existing critical findings and assess their relationship to first-access protection without changing application behavior.
- [x] Publish only the first-access correction after renewed explicit authorization; platform scheduled publication without requiring changes to pre-existing findings.
- [x] Verify production serves the corrected frontend (HTTP 200), rejects the real consumed invitation and the authenticated legacy activation route, and allows original-account session access and test-account password login.