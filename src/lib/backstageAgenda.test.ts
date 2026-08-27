import { describe, it, expect } from "vitest";
import {
  buildBackstageAgenda,
  backstageAgendaFileName,
  validatePeriod,
  BACKSTAGE_FORMAT,
  BACKSTAGE_VERSION,
  BACKSTAGE_SOURCE,
  type BuildParams,
  type BuildResult,
  type RawEventRow,
} from "./backstageAgenda";

const COMPANY = "company-aaa";
const OTHER_COMPANY = "company-zzz";

function makeRow(overrides: Partial<RawEventRow> = {}): RawEventRow {
  return {
    id: "src-1",
    name: "Show de Aniversário da Cidade",
    date: "2026-09-15",
    venue: "Ginásio Municipal",
    show_time: "22:00",
    setup_time: "13:00",
    departure_date: "2026-09-16",
    departure_time: "09:30",
    status: "Confirmado",
    notes: "Levar 4 caixas de retorno",
    staff_notes: "Van da equipe às 8h no galpão",
    contratante_nome: "Prefeitura de Cianorte",
    contratante_cidade: "Cianorte",
    contratante_telefone: "(44) 3619-0000",
    company_id: COMPANY,
    city_id: "city-uuid-1",
    artist_id: "artist-uuid-1",
    rider_id: null,
    cities: { name: "Cianorte", state: "PR" },
    artists: { name: "Trio Serra Azul" },
    ...overrides,
  };
}

function params(overrides: Partial<BuildParams> = {}): BuildParams {
  return {
    rows: [makeRow()],
    companyId: COMPANY,
    start: "2026-09-01",
    end: "2026-09-30",
    exportedAt: "2026-08-27T10:00:00.000Z",
    ...overrides,
  };
}

function expectOk(result: BuildResult) {
  if (result.status !== "ok") {
    throw new Error(`esperava status "ok", veio "${result.status}"`);
  }
  return result.payload;
}

// ── 16. intervalo inválido ────────────────────────────────────────────────────
describe("validatePeriod", () => {
  it("exige data inicial", () => {
    expect(validatePeriod("", "2026-09-30")).toMatch(/inicial/i);
    expect(validatePeriod(null, "2026-09-30")).toMatch(/inicial/i);
  });
  it("exige data final", () => {
    expect(validatePeriod("2026-09-01", "")).toMatch(/final/i);
    expect(validatePeriod("2026-09-01", undefined)).toMatch(/final/i);
  });
  it("rejeita data inicial maior que a final", () => {
    expect(validatePeriod("2026-10-01", "2026-09-01")).toMatch(/anterior ou igual/i);
  });
  it("aceita data inicial igual à final", () => {
    expect(validatePeriod("2026-09-01", "2026-09-01")).toBeNull();
  });
  it("aceita um período válido", () => {
    expect(validatePeriod("2026-09-01", "2026-09-30")).toBeNull();
  });
  it("rejeita formato fora de AAAA-MM-DD", () => {
    expect(validatePeriod("01/09/2026", "2026-09-30")).toMatch(/formato/i);
  });
});

// ── 11. nome do arquivo ───────────────────────────────────────────────────────
describe("backstageAgendaFileName", () => {
  it("usa o padrão agenda-backstage-INICIO-a-FIM.json", () => {
    expect(backstageAgendaFileName("2026-08-01", "2026-10-31")).toBe(
      "agenda-backstage-2026-08-01-a-2026-10-31.json",
    );
  });
  it("sanitiza qualquer caractere inesperado", () => {
    expect(backstageAgendaFileName("2026-08-01", "2026-10-31/../etc")).toBe(
      "agenda-backstage-2026-08-01-a-2026-10-31.json",
    );
  });
});

// ── 4. estrutura do arquivo / 13. event_count ─────────────────────────────────
describe("buildBackstageAgenda — envelope do arquivo", () => {
  it("grava format/version/source fixos e versionados", () => {
    const payload = expectOk(buildBackstageAgenda(params()));
    expect(payload.format).toBe(BACKSTAGE_FORMAT);
    expect(payload.format).toBe("gestao-eventos-backstage");
    expect(payload.version).toBe(BACKSTAGE_VERSION);
    expect(payload.version).toBe(1);
    expect(payload.source).toBe(BACKSTAGE_SOURCE);
    expect(payload.source).toBe("Gestão de Eventos Pro");
  });

  it("ecoa o período e usa o exported_at injetado", () => {
    const payload = expectOk(buildBackstageAgenda(params()));
    expect(payload.period).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(payload.exported_at).toBe("2026-08-27T10:00:00.000Z");
  });

  it("exported_at cai para o ISO de agora quando não injetado", () => {
    const payload = expectOk(buildBackstageAgenda({ ...params(), exportedAt: undefined }));
    expect(payload.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("event_count corresponde exatamente ao tamanho de events (1)", () => {
    const payload = expectOk(buildBackstageAgenda(params()));
    expect(payload.event_count).toBe(1);
    expect(payload.event_count).toBe(payload.events.length);
  });

  it("event_count corresponde exatamente ao tamanho de events (vários)", () => {
    const rows = [
      makeRow({ id: "a", date: "2026-09-02" }),
      makeRow({ id: "b", date: "2026-09-10" }),
      makeRow({ id: "c", date: "2026-09-20" }),
      makeRow({ id: "d", date: "2026-09-28" }),
    ];
    const payload = expectOk(buildBackstageAgenda(params({ rows })));
    expect(payload.event_count).toBe(4);
    expect(payload.event_count).toBe(payload.events.length);
  });

  it("preserva a ordem das linhas recebidas", () => {
    const rows = [
      makeRow({ id: "primeiro", date: "2026-09-03" }),
      makeRow({ id: "segundo", date: "2026-09-09" }),
      makeRow({ id: "terceiro", date: "2026-09-27" }),
    ];
    const payload = expectOk(buildBackstageAgenda(params({ rows })));
    expect(payload.events.map((e) => e.source_event_id)).toEqual(["primeiro", "segundo", "terceiro"]);
  });

  it("o payload é serializável e re-parseável como JSON", () => {
    const payload = expectOk(buildBackstageAgenda(params()));
    const roundTrip = JSON.parse(JSON.stringify(payload));
    expect(roundTrip).toEqual(payload);
  });
});

// ── 1. evento normal / 12. source_event_id ────────────────────────────────────
describe("buildBackstageAgenda — evento normal", () => {
  it("mapeia todos os campos exatamente no formato esperado", () => {
    const payload = expectOk(buildBackstageAgenda(params()));
    expect(payload.events[0]).toEqual({
      source_event_id: "src-1",
      name: "Show de Aniversário da Cidade",
      date: "2026-09-15",
      artist: "Trio Serra Azul",
      city: "Cianorte",
      state: "PR",
      venue: "Ginásio Municipal",
      show_time: "22:00",
      setup_time: "13:00",
      departure_date: "2026-09-16",
      departure_time: "09:30",
      status: "Confirmado",
      notes: "Levar 4 caixas de retorno",
      staff_notes: "Van da equipe às 8h no galpão",
      contratante_nome: "Prefeitura de Cianorte",
      contratante_cidade: "Cianorte",
      contratante_telefone: "(44) 3619-0000",
    });
  });

  it("source_event_id é o id de origem, sem transformação", () => {
    const payload = expectOk(
      buildBackstageAgenda(params({ rows: [makeRow({ id: "e3b0c442-98fc-1c14-9afb-4c8996fb9242" })] })),
    );
    expect(payload.events[0].source_event_id).toBe("e3b0c442-98fc-1c14-9afb-4c8996fb9242");
  });
});

// ── 3. filtro por período / 4. limites inclusivos ─────────────────────────────
describe("buildBackstageAgenda — filtro de período", () => {
  it("inclui eventos exatamente nos limites e exclui os de fora", () => {
    const rows = [
      makeRow({ id: "antes", date: "2026-08-31" }),
      makeRow({ id: "limite-inicio", date: "2026-09-01" }),
      makeRow({ id: "meio", date: "2026-09-15" }),
      makeRow({ id: "limite-fim", date: "2026-09-30" }),
      makeRow({ id: "depois", date: "2026-10-01" }),
    ];
    const payload = expectOk(
      buildBackstageAgenda(params({ rows, start: "2026-09-01", end: "2026-09-30" })),
    );
    expect(payload.events.map((e) => e.source_event_id)).toEqual([
      "limite-inicio",
      "meio",
      "limite-fim",
    ]);
    expect(payload.event_count).toBe(3);
  });

  it("aceita período de um único dia (inclusivo)", () => {
    const rows = [
      makeRow({ id: "no-dia", date: "2026-09-15" }),
      makeRow({ id: "vespera", date: "2026-09-14" }),
      makeRow({ id: "seguinte", date: "2026-09-16" }),
    ];
    const payload = expectOk(
      buildBackstageAgenda(params({ rows, start: "2026-09-15", end: "2026-09-15" })),
    );
    expect(payload.events.map((e) => e.source_event_id)).toEqual(["no-dia"]);
  });
});

// ── 5. cidade + UF / 6. artista ───────────────────────────────────────────────
describe("buildBackstageAgenda — resolução de FK para texto", () => {
  it("mantém cidade e UF em campos separados", () => {
    const payload = expectOk(
      buildBackstageAgenda(params({ rows: [makeRow({ cities: { name: "Cianorte", state: "PR" } })] })),
    );
    expect(payload.events[0].city).toBe("Cianorte");
    expect(payload.events[0].state).toBe("PR");
    expect(JSON.stringify(payload.events[0])).not.toContain("Cianorte - PR");
  });

  it("resolve o artista para texto", () => {
    const payload = expectOk(
      buildBackstageAgenda(params({ rows: [makeRow({ artists: { name: "Banda do Zé" } })] })),
    );
    expect(payload.events[0].artist).toBe("Banda do Zé");
  });

  it("aceita a relação embutida também na forma de array (PostgREST)", () => {
    const row = makeRow();
    row.cities = [{ name: "Londrina", state: "PR" }];
    row.artists = [{ name: "Coral Vozes" }];
    const payload = expectOk(buildBackstageAgenda(params({ rows: [row] })));
    expect(payload.events[0].city).toBe("Londrina");
    expect(payload.events[0].state).toBe("PR");
    expect(payload.events[0].artist).toBe("Coral Vozes");
  });
});

// ── 7. contratante preenchido / 8. contratante null ───────────────────────────
describe("buildBackstageAgenda — contratante", () => {
  it("preserva o contratante quando preenchido", () => {
    const payload = expectOk(buildBackstageAgenda(params()));
    expect(payload.events[0].contratante_nome).toBe("Prefeitura de Cianorte");
    expect(payload.events[0].contratante_cidade).toBe("Cianorte");
    expect(payload.events[0].contratante_telefone).toBe("(44) 3619-0000");
  });

  it("contratante ausente/vazio vira null (nunca string vazia)", () => {
    const payload = expectOk(
      buildBackstageAgenda(
        params({
          rows: [
            makeRow({
              contratante_nome: null,
              contratante_cidade: "",
              contratante_telefone: "   ",
            }),
          ],
        }),
      ),
    );
    expect(payload.events[0].contratante_nome).toBeNull();
    expect(payload.events[0].contratante_cidade).toBeNull();
    expect(payload.events[0].contratante_telefone).toBeNull();
  });
});

// ── 9. departure_date null / 10. horários vazios / datas sem timezone ─────────
describe("buildBackstageAgenda — datas e horários", () => {
  it("preserva departure_date null", () => {
    const payload = expectOk(
      buildBackstageAgenda(params({ rows: [makeRow({ departure_date: null })] })),
    );
    expect(payload.events[0].departure_date).toBeNull();
  });

  it("mantém date e departure_date como YYYY-MM-DD, sem conversão de timezone", () => {
    const payload = expectOk(
      buildBackstageAgenda(
        params({
          rows: [makeRow({ date: "2026-09-01", departure_date: "2026-12-31" })],
          start: "2026-01-01",
          end: "2026-12-31",
        }),
      ),
    );
    expect(payload.events[0].date).toBe("2026-09-01");
    expect(payload.events[0].departure_date).toBe("2026-12-31");
  });

  it("horários vazios ou só com espaços viram null", () => {
    const payload = expectOk(
      buildBackstageAgenda(
        params({ rows: [makeRow({ show_time: "", setup_time: "   ", departure_time: "" })] }),
      ),
    );
    expect(payload.events[0].show_time).toBeNull();
    expect(payload.events[0].setup_time).toBeNull();
    expect(payload.events[0].departure_time).toBeNull();
  });

  it("horários preenchidos são preservados sem conversão", () => {
    const payload = expectOk(
      buildBackstageAgenda(
        params({
          rows: [makeRow({ show_time: "22:30", setup_time: "8h da manhã", departure_time: "23:00" })],
        }),
      ),
    );
    expect(payload.events[0].show_time).toBe("22:30");
    expect(payload.events[0].setup_time).toBe("8h da manhã");
    expect(payload.events[0].departure_time).toBe("23:00");
  });
});

// ── status ────────────────────────────────────────────────────────────────────
describe("buildBackstageAgenda — status", () => {
  it.each(["Confirmado", "Pendente", "Cancelado"])(
    "preserva o status %s exatamente como veio (sem minúsculas)",
    (status) => {
      const payload = expectOk(buildBackstageAgenda(params({ rows: [makeRow({ status })] })));
      expect(payload.events[0].status).toBe(status);
    },
  );
});

// ── 2. escopo multi-tenant ────────────────────────────────────────────────────
describe("buildBackstageAgenda — isolamento multi-tenant", () => {
  it("descarta eventos de outra empresa mesmo se vierem na lista", () => {
    const rows = [
      makeRow({ id: "meu", company_id: COMPANY }),
      makeRow({ id: "alheio", company_id: OTHER_COMPANY }),
    ];
    const payload = expectOk(buildBackstageAgenda(params({ rows })));
    expect(payload.events.map((e) => e.source_event_id)).toEqual(["meu"]);
  });

  it("retorna empty quando todos os eventos são de outra empresa", () => {
    const rows = [makeRow({ id: "alheio", company_id: OTHER_COMPANY })];
    expect(buildBackstageAgenda(params({ rows })).status).toBe("empty");
  });
});

// ── 14. nenhum vazamento de identificadores internos ──────────────────────────
describe("buildBackstageAgenda — nenhum vazamento de dados internos", () => {
  it("os eventos não têm chaves internas (company_id, city_id, artist_id, rider_id, id, *_at)", () => {
    const payload = expectOk(buildBackstageAgenda(params()));
    for (const event of payload.events) {
      const keys = Object.keys(event);
      expect(keys).not.toContain("id");
      expect(keys).not.toContain("company_id");
      expect(keys).not.toContain("city_id");
      expect(keys).not.toContain("artist_id");
      expect(keys).not.toContain("rider_id");
      expect(keys).not.toContain("created_at");
      expect(keys).not.toContain("updated_at");
    }
  });

  it("os UUIDs internos não aparecem no JSON serializado", () => {
    const row = makeRow({
      company_id: COMPANY,
      city_id: "CITY-UUID-NAO-VAZAR",
      artist_id: "ARTIST-UUID-NAO-VAZAR",
      rider_id: "RIDER-UUID-NAO-VAZAR",
    });
    const payload = expectOk(buildBackstageAgenda(params({ rows: [row] })));
    const json = JSON.stringify(payload);
    expect(json).not.toContain("CITY-UUID-NAO-VAZAR");
    expect(json).not.toContain("ARTIST-UUID-NAO-VAZAR");
    expect(json).not.toContain("RIDER-UUID-NAO-VAZAR");
    expect(json).not.toContain(COMPANY);
  });

  it("ignora created_at/updated_at mesmo se vierem na linha", () => {
    const row = makeRow() as RawEventRow & Record<string, unknown>;
    row.created_at = "2020-01-01T00:00:00Z";
    row.updated_at = "2020-02-02T00:00:00Z";
    const payload = expectOk(buildBackstageAgenda(params({ rows: [row] })));
    const json = JSON.stringify(payload);
    expect(json).not.toContain("2020-01-01");
    expect(json).not.toContain("2020-02-02");
  });
});

// ── 15. nenhum evento encontrado ─────────────────────────────────────────────
describe("buildBackstageAgenda — nenhum evento encontrado", () => {
  it("lista vazia → empty (nenhum arquivo)", () => {
    expect(buildBackstageAgenda(params({ rows: [] })).status).toBe("empty");
  });
  it("todos fora do período → empty", () => {
    const rows = [makeRow({ date: "2025-01-01" }), makeRow({ date: "2027-01-01" })];
    expect(buildBackstageAgenda(params({ rows })).status).toBe("empty");
  });
});

// ── 17. FK de cidade inexistente / 18. FK de artista inexistente ──────────────
describe("buildBackstageAgenda — inconsistências bloqueiam a exportação", () => {
  it("cidade não resolvida (cities null) → inconsistent, sem payload", () => {
    const result = buildBackstageAgenda(params({ rows: [makeRow({ cities: null })] }));
    expect(result.status).toBe("inconsistent");
    if (result.status !== "inconsistent") return;
    expect(result.inconsistencies).toHaveLength(1);
    expect(result.inconsistencies[0].source_event_id).toBe("src-1");
    expect(result.inconsistencies[0].problems.join(" ")).toMatch(/cidade/i);
  });

  it("UF ausente (state vazio) → inconsistent", () => {
    const result = buildBackstageAgenda(
      params({ rows: [makeRow({ cities: { name: "Cianorte", state: "" } })] }),
    );
    expect(result.status).toBe("inconsistent");
    if (result.status !== "inconsistent") return;
    expect(result.inconsistencies[0].problems.join(" ")).toMatch(/uf|estado/i);
  });

  it("artista não resolvido (artists null) → inconsistent", () => {
    const result = buildBackstageAgenda(params({ rows: [makeRow({ artists: null })] }));
    expect(result.status).toBe("inconsistent");
    if (result.status !== "inconsistent") return;
    expect(result.inconsistencies[0].problems.join(" ")).toMatch(/artista/i);
  });

  it("nome do evento em branco → inconsistent", () => {
    const result = buildBackstageAgenda(params({ rows: [makeRow({ name: "   " })] }));
    expect(result.status).toBe("inconsistent");
  });

  it("um evento válido + um inconsistente → bloqueia tudo (não exporta parcial)", () => {
    const rows = [makeRow({ id: "ok" }), makeRow({ id: "quebrado", artists: null })];
    const result = buildBackstageAgenda(params({ rows }));
    expect(result.status).toBe("inconsistent");
    if (result.status !== "inconsistent") return;
    expect(result.inconsistencies.map((i) => i.source_event_id)).toEqual(["quebrado"]);
  });

  it("não inventa valores quando a FK falta — não há payload", () => {
    const result = buildBackstageAgenda(
      params({ rows: [makeRow({ cities: null, artists: null })] }),
    ) as { status: string; payload?: unknown };
    expect(result.status).toBe("inconsistent");
    expect(result.payload).toBeUndefined();
  });

  it("data ausente nunca produz um arquivo (status diferente de ok)", () => {
    const result = buildBackstageAgenda(params({ rows: [makeRow({ date: null })] }));
    expect(result.status).not.toBe("ok");
  });
});

// ── venue/notes/staff_notes preservados ──────────────────────────────────────
describe("buildBackstageAgenda — campos de texto livres", () => {
  it("preserva venue, notes e staff_notes; vazios ficam string vazia", () => {
    const payload = expectOk(
      buildBackstageAgenda(params({ rows: [makeRow({ venue: "", notes: "", staff_notes: "" })] })),
    );
    expect(payload.events[0].venue).toBe("");
    expect(payload.events[0].notes).toBe("");
    expect(payload.events[0].staff_notes).toBe("");
  });
});
