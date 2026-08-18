import { supabase } from "@/integrations/supabase/client";

export const RECOVERY_FLAG = "password_recovery_required";

export function isRecoveryPending() {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG) === "1";
  } catch {
    return false;
  }
}

export function setRecoveryPending(value: boolean) {
  try {
    if (value) sessionStorage.setItem(RECOVERY_FLAG, "1");
    else sessionStorage.removeItem(RECOVERY_FLAG);
  } catch { /* noop */ }
}

/**
 * Supabase appends the recovery payload to the URL. With HashRouter the payload
 * can land as a SECOND fragment (`#/reset-password#access_token=...`) which the
 * router cannot match and the Supabase client does not auto-detect.
 * This normalizes every shape (hash tokens, query tokens, PKCE `code`, errors)
 * and forces the app onto `#/reset-password`.
 */
export async function bootstrapRecovery(): Promise<void> {
  const rawHash = window.location.hash || "";
  const search = window.location.search || "";

  // Collect every candidate param bag from the URL.
  const bags: URLSearchParams[] = [];
  if (search.length > 1) bags.push(new URLSearchParams(search.slice(1)));
  for (const part of rawHash.split("#")) {
    if (!part || !part.includes("=")) continue;
    bags.push(new URLSearchParams(part.replace(/^\/?\??/, "")));
  }

  const get = (key: string) => {
    for (const b of bags) {
      const v = b.get(key);
      if (v) return v;
    }
    return null;
  };

  const type = get("type");
  const accessToken = get("access_token");
  const refreshToken = get("refresh_token");
  const code = get("code");
  const errorCode = get("error_code") || get("error");
  const errorDescription = get("error_description");

  const looksLikeRecovery =
    type === "recovery" ||
    (rawHash.includes("reset-password") && (accessToken || code || errorCode));

  if (!looksLikeRecovery) return;

  setRecoveryPending(true);

  let failure: string | null = null;

  if (errorCode) {
    failure = errorDescription || errorCode;
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) failure = error.message;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) failure = error.message;
  }

  try {
    sessionStorage.setItem("password_recovery_error", failure ?? "");
  } catch { /* noop */ }

  // Clean the URL and force the reset route (HashRouter friendly).
  const clean = `${window.location.origin}${window.location.pathname}#/reset-password`;
  window.history.replaceState({}, document.title, clean);
}

export function consumeRecoveryError(): string | null {
  try {
    const v = sessionStorage.getItem("password_recovery_error");
    sessionStorage.removeItem("password_recovery_error");
    return v || null;
  } catch {
    return null;
  }
}