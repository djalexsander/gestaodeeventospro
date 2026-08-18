/**
 * Registro global e leve de "trabalho não salvo".
 * Usado pela política de atualização do PWA para nunca recarregar
 * enquanto o usuário tem formulário/drawer/modal aberto ou alterações pendentes.
 */
const dirtyKeys = new Set<string>();

export function markDirty(key: string): void {
  dirtyKeys.add(key);
}

export function clearDirty(key: string): void {
  dirtyKeys.delete(key);
}

/** Existe algum diálogo/drawer aberto no DOM? (Radix mantém data-state="open") */
function hasOpenOverlay(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
}

/** Existe algum input/textarea focado com conteúdo digitado? */
function hasActiveEditing(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/** Seguro para aplicar atualização (recarregar) agora? */
export function isSafeToReload(): boolean {
  return dirtyKeys.size === 0 && !hasOpenOverlay() && !hasActiveEditing();
}