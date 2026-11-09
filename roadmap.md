# First-access security correction
- [x] Block email-only password changes on the deployed server.
- [x] Add server-enforced expiring, single-use invitations; lock all legacy accounts.
- [x] Update activation and administrator invitation screens without changing other modules.
- [x] Test activation rules and deployed unauthorized requests; report limitations.
- [x] Validate a newly invited test account end-to-end with a recipient-controlled test email.
- [ ] Verify recovery delivery and link on the test account without changing existing passwords. Blocker: recipient must confirm email receipt and open it from the preview/production; no mailbox session is available.
- [x] Verify existing-account authenticated access, preserve the 12 legacy accounts, and report publication readiness without publishing.
- [ ] Verify existing-account password login. Blocker: account owner must sign in with their unchanged password; only managed session restoration was tested.