/**
 * Construção do payload JSON portátil da agenda: Gestão de Eventos Pro → Backstage Pro.
 *
 * Este módulo é PURO (sem rede, DOM ou Supabase) para ser testável isoladamente.
 * Quem chama (ExportBackstageDialog) faz a consulta ao Supabase — já escopada por
 * empresa e período, respeitando a RLS — e passa as linhas cruas para cá.
 *
 * V1 — apenas a agenda. NÃO inclui: equipe (event_staff), riders, arquivos do
 * Storage, notificações, dados financeiros, nem auditoria (created_at/updated_at).
 * O Backstage Pro gerará seus próprios id/created_at/updated_at na importação.
 */

export const BACKSTAGE_FORMAT = "gestao-eventos-backstage" as const;
export const BACKSTAGE_VERSION = 1 as const;
export const BACKSTAGE_SOURCE = "Gestão de Eventos Pro" as const;

/** Relação "to-one" embutida numa consulta PostgREST: objeto, array de 1, ou nulo. */
type Embedded<T> = T | T[] | null | undefined;

/**
 * Linha crua de `events` com `cities` e `artists` resolvidos via `select`.
 * Os campos `*_id` são opcionais aqui: a consulta real não precisa trazê-los
 * (a resolução vem pelos recursos embutidos), mas o tipo os aceita para que os
 * testes possam provar que eles nunca vazam para o arquivo exportado.
 */
export interface RawEventRow {
  id: string;
  name: string | null;
  date: string | null;
  venue: string | null;
  show_time: string | null;
  setup_time: string | null;
  departure_date: string | null;
  departure_time: string | null;
  status: string | null;
  notes: string | null;
  staff_notes: string | null;
  contratante_nome: string | null;
  contratante_cidade: string | null;
  contratante_telefone: string | null;
  company_id: string | null;
  city_id?: string | null;
  artist_id?: string | null;
  rider_id?: string | null;
  cities: Embedded<{ name: string | null; state: string | null }>;
  artists: Embedded<{ name: string | null }>;
}

/** Um evento no arquivo exportado. A ordem das chaves segue a especificação. */
export interface BackstageEvent {
  source_event_id: string;
  name: string;
  date: string;
  artist: string;
  city: string;
  state: string;
  venue: string;
  show_time: string | null;
  setup_time: string | null;
  departure_date: string | null;
  departure_time: string | null;
  status: string;
  notes: string;
  staff_notes: string;
  contratante_nome: string | null;
  contratante_cidade: string | null;
  contratante_telefone: string | null;
}

export interface BackstageAgendaFile {
  format: typeof BACKSTAGE_FORMAT;
  version: typeof BACKSTAGE_VERSION;
  source: typeof BACKSTAGE_SOURCE;
  exported_at: string;
  period: { start: string; end: string };
  event_count: number;
  events: BackstageEvent[];
}

export interface EventInconsistency {
  source_event_id: string;
  name: string | null;
  date: string | null;
  problems: string[];
}

export type BuildResult =
  | { status: "ok"; payload: BackstageAgendaFile }
  | { status: "empty" }
  | { status: "inconsistent"; inconsistencies: EventInconsistency[] };

export interface BuildParams {
  rows: RawEventRow[];
  /** Empresa ativa. Toda linha precisa pertencer a ela — trava anti-vazamento. */
  companyId: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  /** ISO-8601. Default: agora. Injetável para testes determinísticos. */
  exportedAt?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida o período escolhido na UI. Retorna a mensagem de erro (pt-BR) ou `null`.
 * Comparação textual: datas `YYYY-MM-DD` ordenam lexicograficamente — sem timezone.
 */
export function validatePeriod(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start) return "Informe a data inicial.";
  if (!end) return "Informe a data final.";
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) return "Data em formato inválido (use AAAA-MM-DD).";
  if (start > end) return "A data inicial deve ser anterior ou igual à data final.";
  return null;
}

/** Nome do arquivo: `agenda-backstage-AAAA-MM-DD-a-AAAA-MM-DD.json`. */
export function backstageAgendaFileName(start: string, end: string): string {
  const digits = (value: string) => value.replace(/[^0-9-]/g, "");
  return `agenda-backstage-${digits(start)}-a-${digits(end)}.json`;
}

function unwrap<T>(relation: Embedded<T>): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

/** String vazia / só espaços = ausência de valor → `null`. Não converte formato. */
function blankToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Monta o payload da agenda a partir das linhas cruas.
 *
 * - Filtra por período (limites **inclusivos**) e por empresa (trava de segurança
 *   multi-tenant: linha de outra empresa jamais entra no arquivo).
 * - Resolve `city_id` → nome + UF e `artist_id` → nome via recursos embutidos.
 * - Se algum evento tiver FK obrigatória não resolvida (cidade/UF/artista) ou
 *   campo essencial ausente (nome/data), NÃO gera arquivo: retorna
 *   `inconsistent` com a lista para o usuário corrigir os cadastros. Nunca
 *   inventa valores nem exporta parcialmente em silêncio.
 */
export function buildBackstageAgenda(params: BuildParams): BuildResult {
  const { rows, companyId, start, end } = params;
  const exportedAt = params.exportedAt ?? new Date().toISOString();

  const scoped = rows.filter((row) => {
    const sameCompany = row.company_id === companyId; // trava multi-tenant
    const inPeriod = typeof row.date === "string" && row.date >= start && row.date <= end;
    return sameCompany && inPeriod;
  });

  if (scoped.length === 0) return { status: "empty" };

  const events: BackstageEvent[] = [];
  const inconsistencies: EventInconsistency[] = [];

  for (const row of scoped) {
    const city = unwrap(row.cities);
    const artist = unwrap(row.artists);

    const name = (row.name ?? "").trim();
    const cityName = (city?.name ?? "").trim();
    const stateName = (city?.state ?? "").trim();
    const artistName = (artist?.name ?? "").trim();

    const problems: string[] = [];
    if (!name) problems.push("nome do evento ausente");
    if (!row.date) problems.push("data do evento ausente");
    if (!cityName) problems.push("cidade não encontrada (city_id sem correspondência acessível)");
    if (!stateName) problems.push("UF/estado da cidade ausente");
    if (!artistName) problems.push("artista não encontrado (artist_id sem correspondência acessível)");

    if (problems.length > 0) {
      inconsistencies.push({
        source_event_id: row.id,
        name: row.name ?? null,
        date: row.date ?? null,
        problems,
      });
      continue;
    }

    events.push({
      source_event_id: row.id,
      name,
      date: row.date as string,
      artist: artistName,
      city: cityName,
      state: stateName,
      venue: row.venue ?? "",
      show_time: blankToNull(row.show_time),
      setup_time: blankToNull(row.setup_time),
      departure_date: row.departure_date ?? null,
      departure_time: blankToNull(row.departure_time),
      status: (row.status ?? "").trim(),
      notes: row.notes ?? "",
      staff_notes: row.staff_notes ?? "",
      contratante_nome: blankToNull(row.contratante_nome),
      contratante_cidade: blankToNull(row.contratante_cidade),
      contratante_telefone: blankToNull(row.contratante_telefone),
    });
  }

  if (inconsistencies.length > 0) return { status: "inconsistent", inconsistencies };

  const payload: BackstageAgendaFile = {
    format: BACKSTAGE_FORMAT,
    version: BACKSTAGE_VERSION,
    source: BACKSTAGE_SOURCE,
    exported_at: exportedAt,
    period: { start, end },
    event_count: events.length,
    events,
  };

  return { status: "ok", payload };
}
