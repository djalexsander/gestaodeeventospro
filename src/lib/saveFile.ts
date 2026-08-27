/**
 * Salvamento genérico de um Blob em arquivo, com degradação graciosa:
 *
 *   1. showSaveFilePicker (Chromium / Windows 11) → diálogo nativo "Salvar como"
 *   2. fallback: link <a download> temporário (navegadores mais antigos / Win 10)
 *
 * Não exibe nenhuma UI própria (sem toasts) — quem chama decide o feedback.
 * O padrão foi extraído de `savePdf.ts` para ser reutilizado por outros
 * formatos de exportação (ex.: agenda em JSON) sem duplicar a lógica de picker.
 */

export type SaveFileOutcome = "saved" | "downloaded" | "cancelled";

interface PickerAcceptType {
  description: string;
  accept: Record<string, string[]>;
}

export interface SaveFileOptions {
  blob: Blob;
  /** Nome sugerido do arquivo, já com extensão. Sanitização é responsabilidade de quem chama. */
  suggestedName: string;
  /** Tipos aceitos no diálogo nativo (File System Access API). */
  pickerTypes?: PickerAcceptType[];
}

type SaveFilePickerWindow = typeof window & {
  showSaveFilePicker: (options: {
    suggestedName?: string;
    types?: PickerAcceptType[];
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

/**
 * Retorna:
 *  - `"saved"`     quando gravado pelo diálogo nativo
 *  - `"downloaded"` quando gravado pelo link de fallback
 *  - `"cancelled"` apenas quando o usuário fecha o diálogo nativo
 */
export async function saveFile({ blob, suggestedName, pickerTypes }: SaveFileOptions): Promise<SaveFileOutcome> {
  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const handle = await (window as SaveFilePickerWindow).showSaveFilePicker({
        suggestedName,
        types: pickerTypes,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (err) {
      // Usuário cancelou o diálogo — não é erro.
      if ((err as { name?: string } | null)?.name === "AbortError") return "cancelled";
      // Qualquer outra falha do picker → cai para o método de download.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}
