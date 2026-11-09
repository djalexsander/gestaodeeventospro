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
- [ ] Confirm a successful current production build. Blocker: current build telemetry is empty; prior successful build is documented but not a fresh confirmation.
- [ ] Publish the correction after the owner decides how to handle the eight active critical findings outside first access. Blocker: security decision required before publication.
- [ ] Verify the published frontend and production invitation protection after deployment completes. Blocker: publication has not yet been requested.