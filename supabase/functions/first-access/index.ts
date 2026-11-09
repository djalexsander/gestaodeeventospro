import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { activateInvitation, hashInvitation, invalidInvitation } from '../_shared/activation.ts';

Deno.serve(async req => {
  const reply = (body: unknown, status: number) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method === 'OPTIONS') return reply({}, 200);
  if (req.method !== 'POST') return reply({ error: invalidInvitation }, 403);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: invalidInvitation }, 503);
    const admin = createClient(url, key);
    const body = await req.json();
    if (body?.action === 'validate' && typeof body.token === 'string' && /^[a-f0-9]{64}$/.test(body.token)) {
      const { data, error } = await admin.from('account_activations').select('user_id')
        .eq('token_hash', await hashInvitation(body.token)).eq('state', 'pending')
        .gt('expires_at', new Date().toISOString()).maybeSingle();
      return data && !error ? reply({ valid: true }, 200) : reply({ error: invalidInvitation }, 403);
    }
    const success = await activateInvitation(body, async hash => {
      const { data, error } = await admin.rpc('claim_initial_activation', { _token_hash: hash });
      if (error) return null;
      return data?.[0] ?? null;
    }, async (id, password) => {
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) console.error('Activation password update failed', { code: error.code });
      return !error;
    });
    return success ? reply({ success: true }, 200) : reply({ error: invalidInvitation }, 403);
  } catch {
    return reply({ error: invalidInvitation }, 403);
  }
});