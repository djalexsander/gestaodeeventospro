import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { canInvite, hashInvitation, INVITATION_TTL_MS, temporaryInvitationPassword } from './activation.ts';

const schema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(255),
  role: z.enum(['company_admin', 'user']).default('user'),
  company_id: z.string().uuid(),
});

export async function provisionInvitation(req: Request): Promise<Response> {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method === 'OPTIONS') return reply({});
  if (req.method !== 'POST') return reply({ error: 'Não autorizado' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'Serviço indisponível' }, 503);
    const admin = createClient(url, key);
    const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!bearer) return reply({ error: 'Não autorizado' }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !user) return reply({ error: 'Não autorizado' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return reply({ error: 'Dados inválidos' }, 400);
    const body = parsed.data;
    const [{ data: roles, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
      admin.from('user_roles').select('role').eq('user_id', user.id),
      admin.from('profiles').select('company_id').eq('id', user.id).single(),
    ]);
    if (roleError || profileError || !canInvite(roles?.map(r => r.role) ?? [], profile?.company_id ?? null, body.company_id, body.role)) {
      return reply({ error: 'Não autorizado' }, 403);
    }
    const { data: company, error: companyError } = await admin.from('companies').select('id').eq('id', body.company_id).single();
    if (companyError || !company) return reply({ error: 'Não autorizado' }, 403);

    // Existing accounts are never modified or issued a first-access invitation.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: temporaryInvitationPassword(),
      email_confirm: true,
      user_metadata: { name: body.name },
    });
    if (createError || !created.user) {
      console.error('Invitation account creation failed', { code: createError?.code, status: createError?.status });
      return reply({ error: 'Não foi possível emitir o convite. Para uma conta existente, utilize Esqueci minha senha.' }, 400);
    }
    const id = created.user.id;
    const { error: linkError } = await admin.from('profiles').update({ company_id: body.company_id }).eq('id', id);
    const { error: assignmentError } = await admin.from('user_roles').update({ role: body.role }).eq('user_id', id);
    if (linkError || assignmentError) return reply({ error: 'Não foi possível concluir o convite. Contate o administrador.' }, 500);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    const expires = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    const { error: invitationError } = await admin.from('account_activations').insert({
      user_id: id, company_id: body.company_id, state: 'pending', token_hash: await hashInvitation(token), expires_at: expires,
    });
    if (invitationError) return reply({ error: 'Não foi possível concluir o convite. Contate o administrador.' }, 500);
    return reply({ user: { id }, invitation_url: `https://gestaodeeventospro.lovable.app/#/primeiro-acesso?token=${token}`, expires_at: expires });
  } catch {
    return reply({ error: 'Não foi possível emitir o convite' }, 400);
  }
}