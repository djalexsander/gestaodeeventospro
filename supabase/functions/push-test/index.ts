import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPush, type PushDevice } from "../_shared/push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Envia um push de teste para todos os dispositivos habilitados do usuário
 * autenticado. Não grava notificação no sino — serve só para provar o canal.
 */
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

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    if (!vapidPublic || !vapidPrivate) {
      return json({ error: "VAPID não configurado no servidor" }, 500);
    }

    const { data: devices } = await admin
      .from("user_push_devices")
      .select("id, endpoint, p256dh, auth, enabled, platform, device_name")
      .eq("user_id", user.id);

    const enabled = (devices ?? []).filter((d) => d.enabled);
    console.info(`[push-test] user=${user.id} devices=${devices?.length ?? 0} enabled=${enabled.length}`);

    if (enabled.length === 0) {
      return json({ success: false, reason: "sem_dispositivos", devices: devices?.length ?? 0 }, 200);
    }

    const results = await Promise.all(
      enabled.map(async (d) => {
        const res = await sendPush(d as PushDevice, {
          title: "Teste de notificação",
          body: "Se você está vendo isso, o canal push está funcionando.",
          type: "push_test",
          eventId: null,
          notificationId: null,
          url: "/#/eventos",
        });
        if (res.status !== "sent") {
          console.error(
            `[push-test] PUSH ERROR device=${d.id} platform=${d.platform} status=${res.status} body=${res.error}`,
          );
        } else {
          console.info(`[push-test] push success device=${d.id} platform=${d.platform}`);
        }
        return { ...res, platform: d.platform, deviceName: d.device_name };
      }),
    );

    const expired = results.filter((r) => r.status === "expired").map((r) => r.deviceId);
    if (expired.length > 0) {
      await admin.from("user_push_devices").update({ enabled: false }).in("id", expired);
    }

    return json({
      success: results.some((r) => r.status === "sent"),
      sent: results.filter((r) => r.status === "sent").length,
      results,
    });
  } catch (e) {
    console.error("[push-test]", e);
    return json({ error: (e as Error).message }, 500);
  }
});