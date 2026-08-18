import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => null) as
      | { endpoint?: string; keys?: { p256dh?: string; auth?: string }; platform?: string; deviceName?: string }
      | null;

    const endpoint = body?.endpoint?.trim();
    const p256dh = body?.keys?.p256dh?.trim();
    const auth = body?.keys?.auth?.trim();

    if (!endpoint || !/^https:\/\//.test(endpoint) || endpoint.length > 2000 || !p256dh || !auth) {
      return json({ error: "Dados de inscrição inválidos" }, 400);
    }

    const { data: profile } = await admin
      .from("profiles").select("company_id").eq("id", user.id).maybeSingle();

    const { error } = await admin.from("user_push_devices").upsert({
      user_id: user.id,
      company_id: profile?.company_id ?? null,
      endpoint,
      p256dh,
      auth,
      platform: (body?.platform ?? "web").slice(0, 40),
      device_name: (body?.deviceName ?? "").slice(0, 120),
      enabled: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

    if (error) return json({ error: error.message }, 400);

    await admin.from("notification_preferences").upsert({
      user_id: user.id,
      company_id: profile?.company_id ?? null,
    }, { onConflict: "user_id", ignoreDuplicates: true });

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});