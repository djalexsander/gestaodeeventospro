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

const TYPES = [
  "event_created",
  "event_updated",
  "event_cancelled",
  "event_date_changed",
  "event_time_changed",
  "event_location_changed",
  "event_artist_changed",
  "event_assignment_added",
  "event_assignment_removed",
] as const;
type NotifType = typeof TYPES[number];

const TITLES: Record<NotifType, string> = {
  event_created: "Novo evento na agenda",
  event_updated: "Evento atualizado",
  event_cancelled: "Evento cancelado",
  event_date_changed: "Data do evento alterada",
  event_time_changed: "Horário do evento alterado",
  event_location_changed: "Local do evento alterado",
  event_artist_changed: "Artista do evento alterado",
  event_assignment_added: "Você foi escalado",
  event_assignment_removed: "Você saiu da escala",
};

// Preferências existentes no banco (colunas booleanas). Tipos sem coluna própria
// caem no flag mais próximo.
const PREF_COLUMN: Record<NotifType, string> = {
  event_created: "event_created",
  event_updated: "event_updated",
  event_cancelled: "event_cancelled",
  event_date_changed: "event_date_changed",
  event_time_changed: "event_time_changed",
  event_location_changed: "event_location_changed",
  event_artist_changed: "event_updated",
  event_assignment_added: "event_assignment_added",
  event_assignment_removed: "event_assignment_removed",
};

interface Change { field: string; label?: string; from?: string | null; to?: string | null }

async function sha1(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user: caller } } = await admin.auth.getUser(token);
    if (!caller) return json({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => null) as
      | {
          event_id?: string;
          type?: string;
          audience?: string;
          message?: string;
          staff_user_ids?: string[];
          changes?: Change[];
        }
      | null;

    const eventId = body?.event_id?.trim();
    const type = body?.type as NotifType | undefined;
    if (!eventId || !type || !TYPES.includes(type)) {
      return json({ error: "event_id e type válidos são obrigatórios" }, 400);
    }

    // Evento + validação de empresa do chamador
    const { data: event } = await admin
      .from("events")
      .select("id, name, date, show_time, venue, company_id, city_id, status")
      .eq("id", eventId)
      .maybeSingle();
    if (!event) return json({ error: "Evento não encontrado" }, 404);

    const { data: callerProfile } = await admin
      .from("profiles").select("company_id").eq("id", caller.id).maybeSingle();
    const { data: callerRoles } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id);
    const isMaster = (callerRoles ?? []).some((r) => r.role === "admin_master");

    if (!isMaster && callerProfile?.company_id !== event.company_id) {
      return json({ error: "Acesso negado a este evento" }, 403);
    }
    if (!event.company_id) return json({ success: true, recipients: 0 });

    // Destinatários
    const audience = body?.audience === "team" ? "team" : "company";
    let recipientIds: string[] = [];

    if (Array.isArray(body?.staff_user_ids) && body!.staff_user_ids!.length > 0) {
      recipientIds = body!.staff_user_ids!.filter((id) => typeof id === "string");
    } else if (audience === "team") {
      const { data: assigned } = await admin
        .from("event_staff")
        .select("staff_members!inner(user_id)")
        .eq("event_id", eventId);
      recipientIds = (assigned ?? [])
        .map((r) => (r as unknown as { staff_members: { user_id: string | null } }).staff_members?.user_id)
        .filter((id): id is string => !!id);
    } else {
      const { data: members } = await admin
        .from("profiles").select("id").eq("company_id", event.company_id);
      recipientIds = (members ?? []).map((m) => m.id);
    }

    recipientIds = [...new Set(recipientIds)].filter((id) => id !== caller.id);

    // Usuários comuns só recebem avisos de eventos confirmados
    if (event.status !== "Confirmado" && type !== "event_cancelled") {
      const { data: roles } = await admin
        .from("user_roles").select("user_id, role").in("user_id", recipientIds);
      const privileged = new Set(
        (roles ?? []).filter((r) => r.role !== "user").map((r) => r.user_id),
      );
      recipientIds = recipientIds.filter((id) => privileged.has(id));
    }

    if (recipientIds.length === 0) return json({ success: true, recipients: 0 });

    // Preferências
    const { data: prefs } = await admin
      .from("notification_preferences").select("*").in("user_id", recipientIds);
    const prefMap = new Map((prefs ?? []).map((p) => [p.user_id, p as Record<string, boolean>]));
    recipientIds = recipientIds.filter((id) => {
      const p = prefMap.get(id);
      return !p || p[PREF_COLUMN[type]] !== false;
    });
    if (recipientIds.length === 0) return json({ success: true, recipients: 0 });

    const changes: Change[] = Array.isArray(body?.changes) ? body!.changes!.slice(0, 10) : [];

    const title = TITLES[type];
    const dateLabel = event.date
      ? new Date(`${event.date}T12:00:00`).toLocaleDateString("pt-BR")
      : "";
    const base = `${event.name}${dateLabel ? ` — ${dateLabel}` : ""}`;
    const changeSummary = changes.length > 0
      ? changes
          .map((c) =>
            c.from && c.to
              ? `${c.label ?? c.field}: ${c.from} → ${c.to}`
              : (c.label ?? c.field)
          )
          .join(" • ")
      : "";
    const message = (body?.message?.trim() ||
      (changeSummary
        ? `${base}\n${changeSummary}`
        : `${base}${event.venue ? ` • ${event.venue}` : ""}`)).slice(0, 400);

    // Idempotência: mesma ocorrência (tipo + evento + campos alterados) dentro do
    // mesmo minuto nunca gera duas notificações, mesmo em retry da função.
    const stamp = new Date().toISOString().slice(0, 16);
    const fingerprint = await sha1(
      JSON.stringify({ t: type, e: event.id, c: changes.map((c) => `${c.field}:${c.from}>${c.to}`).sort(), s: stamp }),
    );
    const rows = recipientIds.map((uid) => ({
      user_id: uid,
      company_id: event.company_id,
      type,
      title,
      message,
      event_id: event.id,
      reference_id: event.id,
      reference_type: "event",
      dedupe_key: `${type}:${event.id}:${fingerprint}`,
      metadata: {
        changed_fields: changes.map((c) => c.field),
        changes,
        event_name: event.name,
        event_date: event.date,
      },
    }));

    const { data: inserted, error: insertError } = await admin
      .from("notifications")
      .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
      .select("id, user_id");

    if (insertError) {
      console.error("[notify-event] falha ao gravar notificações:", insertError);
      return json({ error: `Falha ao registrar notificações: ${insertError.message}` }, 500);
    }

    let notifByUser = new Map((inserted ?? []).map((n) => [n.user_id, n.id]));

    // Linhas ignoradas por duplicidade: recupera os ids existentes para que o
    // push aponte para a mesma ocorrência já persistida.
    if (notifByUser.size < recipientIds.length) {
      const { data: existing } = await admin
        .from("notifications")
        .select("id, user_id")
        .eq("dedupe_key", `${type}:${event.id}:${fingerprint}`)
        .in("user_id", recipientIds);
      notifByUser = new Map([
        ...(existing ?? []).map((n) => [n.user_id, n.id] as [string, string]),
        ...notifByUser,
      ]);
    }

    // Push
    const { data: devices } = await admin
      .from("user_push_devices")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", recipientIds)
      .eq("enabled", true);

    const payloadFor = (uid: string) => ({
      title,
      body: message,
      type,
      eventId: event.id,
      url: `/#/eventos/${event.id}`,
      notificationId: notifByUser.get(uid) ?? null,
    });

    const results = await Promise.all(
      (devices ?? []).map(async (d) => {
        const res = await sendPush(d as PushDevice, payloadFor(d.user_id));
        return { ...res, userId: d.user_id };
      }),
    );

    if (results.length > 0) {
      await admin.from("notification_deliveries").insert(
        results.map((r) => ({
          notification_id: notifByUser.get(r.userId) ?? null,
          device_id: r.deviceId,
          user_id: r.userId,
          company_id: event.company_id,
          status: r.status,
          error: r.error.slice(0, 500),
        })),
      );
      const expired = results.filter((r) => r.status === "expired").map((r) => r.deviceId);
      if (expired.length > 0) {
        await admin.from("user_push_devices").update({ enabled: false }).in("id", expired);
      }
    }

    return json({
      success: true,
      recipients: recipientIds.length,
      pushed: results.filter((r) => r.status === "sent").length,
    });
  } catch (e) {
    console.error("[notify-event]", e);
    return json({ error: (e as Error).message }, 500);
  }
});