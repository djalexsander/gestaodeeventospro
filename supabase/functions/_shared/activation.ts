export interface ActivationClaim {
  user_id: string;
}

export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
export const invalidInvitation = 'Convite inválido ou indisponível. Utilize o convite do administrador ou Esqueci minha senha.';

// Supabase bcrypt accepts at most 72 bytes; retain 256 bits of entropy below that limit.
export function temporaryInvitationPassword(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('') + 'Aa1!';
}

export async function hashInvitation(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function canInvite(roles: string[], callerCompany: string | null, targetCompany: string, role: string): boolean {
  return ['company_admin', 'user'].includes(role) &&
    (roles.includes('admin_master') ||
      (roles.some(r => ['company_admin', 'admin'].includes(r)) && callerCompany === targetCompany));
}

export function validActivationInput(body: unknown): body is { token: string; password: string } {
  if (!body || typeof body !== 'object') return false;
  const value = body as Record<string, unknown>;
  return typeof value.token === 'string' && /^[a-f0-9]{64}$/.test(value.token) &&
    typeof value.password === 'string' && value.password.length >= 8 && new TextEncoder().encode(value.password).length <= 72;
}

// Claim occurs atomically before changing credentials; failures remain locked, never reusable.
export async function activateInvitation(
  body: unknown,
  claim: (hash: string) => Promise<ActivationClaim | null>,
  setPassword: (userId: string, password: string) => Promise<boolean>,
): Promise<boolean> {
  if (!validActivationInput(body)) return false;
  const account = await claim(await hashInvitation(body.token));
  if (!account) return false;
  return await setPassword(account.user_id, body.password);
}