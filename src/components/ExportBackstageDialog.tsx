import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Calendar as CalendarIcon, CheckCircle2, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  backstageAgendaFileName,
  buildBackstageAgenda,
  validatePeriod,
  type BuildResult,
  type RawEventRow,
} from "@/lib/backstageAgenda";
import { saveFile } from "@/lib/saveFile";

/**
 * Colunas lidas de `events` para a exportação. `cities`/`artists` são resolvidos
 * pelos recursos embutidos (não é preciso trazer city_id/artist_id). A RLS já
 * restringe a leitura à empresa do usuário; o `.eq('company_id', ...)` explícito
 * é uma segunda trava.
 */
const EVENT_SELECT =
  "id, name, date, venue, show_time, setup_time, departure_date, departure_time, status, notes, staff_notes, contratante_nome, contratante_cidade, contratante_telefone, company_id, cities(name, state), artists(name)";

/** "2026-09-01" → "01/09/2026" (exibição). */
const brDate = (iso: string) => iso.split("-").reverse().join("/");
/** "2026-09-01" → Date ao meio-dia local (evita deslocamento de fuso). */
const ymdToDate = (ymd: string) => new Date(`${ymd}T12:00:00`);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportBackstageDialog({ open, onOpenChange }: Props) {
  const { activeCompanyId, activeCompany } = useCompany();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setStart("");
      setEnd("");
      setRangeError(null);
      setChecking(false);
      setSaving(false);
      setResult(null);
      setStartOpen(false);
      setEndOpen(false);
    }
  }, [open]);

  const clearPreview = () => setResult(null);

  const handleCheck = async () => {
    const err = validatePeriod(start, end);
    setRangeError(err);
    setResult(null);
    if (err) return;

    if (!activeCompanyId) {
      toast.error("Nenhuma empresa ativa. Não é possível exportar a agenda.");
      return;
    }

    setChecking(true);
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("company_id", activeCompanyId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });
    setChecking(false);

    if (error) {
      toast.error(`Erro ao buscar eventos: ${error.message}`);
      return;
    }

    setResult(
      buildBackstageAgenda({
        rows: (data ?? []) as unknown as RawEventRow[],
        companyId: activeCompanyId,
        start,
        end,
      }),
    );
  };

  const handleDownload = async () => {
    if (result?.status !== "ok") return;
    setSaving(true);
    try {
      const json = JSON.stringify(result.payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const outcome = await saveFile({
        blob,
        suggestedName: backstageAgendaFileName(start, end),
        pickerTypes: [{ description: "Arquivo JSON", accept: { "application/json": [".json"] } }],
      });
      if (outcome === "cancelled") return;
      toast.success(`Agenda exportada: ${result.payload.event_count} evento(s).`);
      onOpenChange(false);
    } catch (e) {
      toast.error(`Falha ao salvar o arquivo: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const periodLabel = start && end ? `${brDate(start)} a ${brDate(end)}` : "";
  const canCheck = Boolean(start) && Boolean(end) && !checking;
  const ready = result?.status === "ok";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Exportar agenda para Backstage Pro</DialogTitle>
          <DialogDescription>
            Gera um arquivo JSON portátil da agenda
            {activeCompany ? ` de ${activeCompany.name}` : ""} para importar depois no Backstage Pro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !start && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {start ? brDate(start) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={start ? ymdToDate(start) : undefined}
                    defaultMonth={start ? ymdToDate(start) : end ? ymdToDate(end) : undefined}
                    disabled={end ? { after: ymdToDate(end) } : undefined}
                    onSelect={(picked) => {
                      setStart(picked ? format(picked, "yyyy-MM-dd") : "");
                      clearPreview();
                      setStartOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data final</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !end && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {end ? brDate(end) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={end ? ymdToDate(end) : undefined}
                    defaultMonth={end ? ymdToDate(end) : start ? ymdToDate(start) : undefined}
                    disabled={start ? { before: ymdToDate(start) } : undefined}
                    onSelect={(picked) => {
                      setEnd(picked ? format(picked, "yyyy-MM-dd") : "");
                      clearPreview();
                      setEndOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {rangeError && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {rangeError}
            </p>
          )}

          {result && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
              {periodLabel && (
                <p className="text-muted-foreground">
                  Período: <span className="font-medium text-foreground">{periodLabel}</span>
                </p>
              )}

              {result.status === "empty" && (
                <p className="text-foreground">
                  Nenhum evento encontrado neste período. Nenhum arquivo foi gerado.
                </p>
              )}

              {result.status === "inconsistent" && (
                <div className="space-y-1.5">
                  <p className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {result.inconsistencies.length} evento(s) com dados inconsistentes. Corrija os
                      cadastros antes de exportar — nenhum arquivo foi gerado.
                    </span>
                  </p>
                  <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-6 text-xs text-muted-foreground">
                    {result.inconsistencies.map((item) => (
                      <li key={item.source_event_id}>
                        <span className="text-foreground">
                          {item.name?.trim() || "(evento sem nome)"}
                        </span>
                        {item.date ? ` — ${brDate(item.date)}` : ""}
                        {": "}
                        {item.problems.join("; ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.status === "ok" && (
                <p className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-status-confirmed" />
                  <span>
                    <span className="font-semibold">{result.payload.event_count}</span> evento(s)
                    encontrado(s), prontos para exportar.
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ready ? "Cancelar" : "Fechar"}
          </Button>
          {ready ? (
            <Button onClick={handleDownload} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="mr-2 h-4 w-4" />
              )}
              Baixar JSON
            </Button>
          ) : (
            <Button onClick={handleCheck} disabled={!canCheck}>
              {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verificar período
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
