import { supabase } from "@/integrations/supabase/client";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function permissionStatus(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (isIOS()) return "iPhone/iPad";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "Mac";
  return "Navegador";
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await getRegistration();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

function sameServerKey(sub: PushSubscription, publicKey: string): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return false;
  const expected = urlBase64ToUint8Array(publicKey);
  const actual = new Uint8Array(current as ArrayBuffer);
  if (actual.length !== expected.length) return false;
  return actual.every((b, i) => b === expected[i]);
}

async function fetchPublicKey(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("push-public-key");
  if (error) return null;
  return (data as { publicKey?: string } | null)?.publicKey ?? null;
}

/** Envia um push de teste para os dispositivos deste usuário. */
export async function sendTestPush(): Promise<{ ok: boolean; sent?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke("push-test");
  if (error) return { ok: false, error: error.message };
  const res = data as { success?: boolean; sent?: number; reason?: string } | null;
  if (!res?.success) {
    return {
      ok: false,
      error:
        res?.reason === "sem_dispositivos"
          ? "Nenhum dispositivo inscrito. Ative as notificações novamente."
          : "O servidor não conseguiu entregar o push.",
    };
  }
  return { ok: true, sent: res.sent };
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: "Este dispositivo/navegador não suporta notificações push." };
  }
  if (isIOS() && !isStandalonePWA()) {
    return {
      ok: false,
      error: "No iPhone/iPad é preciso instalar o app na tela de início (Compartilhar → Adicionar à Tela de Início) para receber notificações.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Permissão de notificações negada." };
  }

  const reg = await getRegistration();
  if (!reg) return { ok: false, error: "Service worker indisponível." };

  const publicKey = await fetchPublicKey();
  if (!publicKey) {
    return { ok: false, error: "Não foi possível obter a chave de notificações." };
  }

  let sub = await reg.pushManager.getSubscription();
  // Inscrição criada com outra chave VAPID nunca receberá push: recria.
  if (sub && !sameServerKey(sub, publicKey)) {
    try {
      await sub.unsubscribe();
    } catch {
      /* ignora */
    }
    sub = null;
  }
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: {
      endpoint: json.endpoint,
      keys: json.keys,
      platform: isStandalonePWA() ? "pwa" : "web",
      deviceName: deviceLabel(),
    },
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function disablePush(): Promise<{ ok: boolean; error?: string }> {
  const sub = await getCurrentSubscription();
  if (!sub) return { ok: true };
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignora */
  }
  const { error } = await supabase.functions.invoke("push-unsubscribe", { body: { endpoint } });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type NotifyType =
  | "event_created"
  | "event_updated"
  | "event_cancelled"
  | "event_date_changed"
  | "event_time_changed"
  | "event_location_changed"
  | "event_artist_changed"
  | "event_assignment_added"
  | "event_assignment_removed";

export interface EventChange {
  field: string;
  label?: string;
  from?: string | null;
  to?: string | null;
}

/** Dispara notificação sem bloquear o fluxo de salvamento. */
export function notifyEvent(params: {
  eventId: string;
  type: NotifyType;
  audience?: "company" | "team";
  message?: string;
  staffUserIds?: string[];
  changes?: EventChange[];
}): void {
  void supabase.functions
    .invoke("notify-event", {
      body: {
        event_id: params.eventId,
        type: params.type,
        audience: params.audience ?? "company",
        message: params.message,
        staff_user_ids: params.staffUserIds,
        changes: params.changes ?? [],
      },
    })
    .then(({ error }) => {
      if (error) console.warn("[notify-event] falha ao notificar:", error.message);
    })
    .catch((e) => console.warn("[notify-event] erro:", e));
}