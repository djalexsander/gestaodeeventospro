# Security architecture
- Initial activation uses a service-only activation ledger and hashed, expiring, single-use bearer invitations; legacy accounts are permanently locked to prevent email-based account takeover.
- Administrator provisioning validates roles and company scope server-side and assigns privileges explicitly after creation; signup metadata never grants roles or company access.
- Invitation links use the fixed production origin with HashRouter fragments and are disclosed only to the authorized inviting administrator for private delivery.