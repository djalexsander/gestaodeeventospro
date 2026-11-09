import { describe, expect, it, vi } from 'vitest';
import { activateInvitation, canInvite, hashInvitation, INVITATION_TTL_MS } from '../../supabase/functions/_shared/activation';

const token = 'ab'.repeat(32);
const validBody = { token, password: 'Valid-test-password-123!' };
const now = Date.now();

function pendingAccount(state = 'pending', expires = now + INVITATION_TTL_MS) {
  let currentState = state;
  return async (hash: string) => {
    if (hash !== await hashInvitation(token) || currentState !== 'pending' || expires <= now) return null;
    currentState = 'activated';
    return { user_id: 'invited-user' };
  };
}

describe('server initial activation', () => {
  it('activates a new account only after a valid individual invitation is claimed', async () => {
    const update = vi.fn(async () => true);
    expect(await activateInvitation(validBody, pendingAccount(), update)).toBe(true);
    expect(update).toHaveBeenCalledWith('invited-user', validBody.password);
  });
  it('does not change an existing legacy account password', async () => {
    const update = vi.fn(async () => true);
    expect(await activateInvitation(validBody, pendingAccount('legacy_locked'), update)).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects repeat activation permanently', async () => {
    const claim = pendingAccount();
    const update = vi.fn(async () => true);
    expect(await activateInvitation(validBody, claim, update)).toBe(true);
    expect(await activateInvitation(validBody, claim, update)).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid invitation tokens without changing passwords', async () => {
    const update = vi.fn(async () => true);
    expect(await activateInvitation({ ...validBody, token: 'cd'.repeat(32) }, pendingAccount(), update)).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects expired tokens', async () => {
    const update = vi.fn(async () => true);
    expect(await activateInvitation(validBody, pendingAccount('pending', now - 1), update)).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
  it('never authorizes activation using only email and password', async () => {
    const claim = vi.fn(); const update = vi.fn();
    expect(await activateInvitation({ email: 'existing@example.com', password: 'Password-123!' }, claim, update)).toBe(false);
    expect(claim).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
  it('keeps a claimed token consumed when password delivery fails', async () => {
    const claim = pendingAccount();
    const update = vi.fn(async () => false);
    expect(await activateInvitation(validBody, claim, update)).toBe(false);
    expect(await activateInvitation(validBody, claim, update)).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });
  it('rejects unauthorized and cross-company invitation creation', () => {
    expect(canInvite(['user'], 'company-a', 'company-a', 'user')).toBe(false);
    expect(canInvite(['company_admin'], 'company-a', 'company-b', 'user')).toBe(false);
    expect(canInvite(['admin'], 'company-a', 'company-b', 'user')).toBe(false);
  });
  it('allows an authorized company admin to invite within their own company', () => {
    expect(canInvite(['company_admin'], 'company-a', 'company-a', 'company_admin')).toBe(true);
  });
  it('does not permit inviting a master role', () => {
    expect(canInvite(['admin_master'], 'company-a', 'company-b', 'admin_master')).toBe(false);
  });
});