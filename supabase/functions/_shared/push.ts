import webpush from "npm:web-push@3.6.7";

const PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:suporte@example.com";

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
}

export interface PushDevice {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushResult {
  deviceId: string;
  status: "sent" | "failed" | "expired";
  error: string;
}

export async function sendPush(device: PushDevice, payload: unknown): Promise<PushResult> {
  try {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return { deviceId: device.id, status: "sent", error: "" };
  } catch (e) {
    const statusCode = (e as { statusCode?: number })?.statusCode;
    const message = (e as Error)?.message ?? String(e);
    if (statusCode === 404 || statusCode === 410) {
      return { deviceId: device.id, status: "expired", error: message };
    }
    return { deviceId: device.id, status: "failed", error: message };
  }
}