/**
 * Platform detection utilities for Tauri v2 + Web compatibility.
 */

/** Returns true when running inside a Tauri desktop shell. */
export const isTauri = (): boolean =>
  typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

/** Returns true when running as a regular web app / PWA. */
export const isWeb = (): boolean => !isTauri();
