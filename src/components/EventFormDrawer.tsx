import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { EventItem, EventStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/SearchableSelect";
import { QuickAddArtistDialog } from "@/components/QuickAddArtistDialog";
import { QuickAddCityDialog } from "@/components/QuickAddCityDialog";
import { Users } from "lucide-react";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  type: string;
}

interface EventFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventItem | null;
  defaultDate?: string;
}

export function EventFormDrawer({ open, onOpenChange, event, defaultDate }: EventFormDrawerProps) {
  const { artists, cities, riders, addEvent, updateEvent, getRiderByArtistId, getArtistById } = useAppContext();
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [showAddCity, setShowAddCity] = useState(false);
  const [pendingArtistName, setPendingArtistName] = useState("");
  const [pendingCityName, setPendingCityName] = useState("");
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    date: "",
    name: "",
    cityId: "",
    venue: "",
    artistId: "",
    riderId: "",
    setupTime: "",
    showTime: "",
    departureDate: "",
    departureTime: "",
    notes: "",
    staffNotes: "",
    status: "Pendente" as EventStatus,
    contratanteNome: "",
    contratanteCidade: "",
    contratanteTelefone: "",
  });

  // Load all staff members
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase.from("staff_members").select("id, name, role, type").order("name");
      if (data) setAllStaff(data);
    };
    if (open) fetchStaff();
  }, [open]);

  // Load assigned staff when editing
  useEffect(() => {
    const fetchAssigned = async () => {
      if (!event) { setSelectedStaffIds([]); return; }
      const { data } = await supabase
        .from("event_staff")
        .select("staff_member_id")
        .eq("event_id", event.id);
      if (data) setSelectedStaffIds(data.map(d => d.staff_member_id));
    };
    if (open) fetchAssigned();
  }, [event, open]);

  useEffect(() => {
    if (event) {
      setForm({
        date: event.date,
        name: event.name,
        cityId: event.cityId,
        venue: event.venue,
        artistId: event.artistId,
        riderId: event.riderId || "",
        setupTime: event.setupTime,
        showTime: event.showTime,
        departureDate: event.departureDate || "",
        departureTime: event.departureTime || "",
        notes: event.notes,
        staffNotes: event.staffNotes || "",
        status: event.status,
        contratanteNome: event.contratanteNome || "",
        contratanteCidade: event.contratanteCidade || "",
        contratanteTelefone: event.contratanteTelefone || "",
      });
    } else {
      setForm({
        date: defaultDate || "",
        name: "",
        cityId: "",
        venue: "",
        artistId: "",
        riderId: "",
        setupTime: "",
        showTime: "",
        departureDate: "",
        departureTime: "",
        notes: "",
        staffNotes: "",
        status: "Pendente",
        contratanteNome: "",
        contratanteCidade: "",
        contratanteTelefone: "",
      });
    }
  }, [event, defaultDate, open]);

  const handleArtistChange = (artistId: string) => {
    setForm(prev => {
      const rider = getRiderByArtistId(artistId);
      const artist = getArtistById(artistId);
      return {
        ...prev,
        artistId,
        riderId: artist?.defaultRiderId || rider?.id || prev.riderId,
      };
    });
  };

  const toggleStaff = (staffId: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validação client-side antes de tentar salvar
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('nome do evento');
    if (!form.date) missing.push('data');
    if (!form.cityId) missing.push('cidade');
    if (!form.artistId) missing.push('artista');
    if (missing.length > 0) {
      toast.error(`Preencha: ${missing.join(', ')}.`);
      return;
    }

    const payload = {
      ...form,
      riderId: form.riderId || null,
      departureDate: form.departureDate || null,
      contratanteNome: form.contratanteNome.trim() || null,
      contratanteCidade: form.contratanteCidade.trim() || null,
      contratanteTelefone: form.contratanteTelefone.trim() || null,
    };

    let eventId: string | undefined;
    if (event) {
      await updateEvent({ ...payload, id: event.id });
      eventId = event.id;
    } else {
      eventId = await addEvent(payload);
      if (!eventId) {
        // addEvent já mostrou o toast com a causa real
        return;
      }
    }

    // Save staff assignments
    if (eventId) {
      const { error: delErr } = await supabase.from("event_staff").delete().eq("event_id", eventId);
      if (delErr) console.error('[event_staff] erro ao remover antigos:', delErr);
      if (selectedStaffIds.length > 0) {
        const { error: insErr } = await supabase.from("event_staff").insert(
          selectedStaffIds.map(sid => ({ event_id: eventId, staff_member_id: sid }))
        );
        if (insErr) {
          console.error('[event_staff] erro ao vincular equipe:', insErr);
          toast.warning(`Evento salvo, mas houve falha ao vincular a equipe: ${insErr.message}`);
        }
      }
    }

    onOpenChange(false);
  };

  const equipe = allStaff.filter(s => s.type === "equipe");
  const freelancers = allStaff.filter(s => s.type === "freelancer");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading">{event ? "Editar Evento" : "Novo Evento"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as EventStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome do Evento</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>

          <div className="space-y-2">
            <Label>Artista</Label>
            <SearchableSelect
              value={form.artistId}
              onValueChange={handleArtistChange}
              options={artists.map(a => ({ value: a.id, label: a.name }))}
              placeholder="Digite o nome do artista"
              onAddNew={(text) => { setPendingArtistName(text); setShowAddArtist(true); }}
              addNewLabel="Cadastrar"
            />
          </div>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <SearchableSelect
              value={form.cityId}
              onValueChange={v => setForm(p => ({ ...p, cityId: v }))}
              options={cities.map(c => ({ value: c.id, label: `${c.name} - ${c.state}` }))}
              placeholder="Digite o nome da cidade"
              onAddNew={(text) => { setPendingCityName(text); setShowAddCity(true); }}
              addNewLabel="Cadastrar"
            />
          </div>

          <div className="space-y-2">
            <Label>Local</Label>
            <Input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-heading font-semibold text-foreground">Contratante</h4>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.contratanteNome}
                onChange={e => setForm(p => ({ ...p, contratanteNome: e.target.value }))}
                placeholder="Ex: Produtora, empresa, cliente..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.contratanteCidade}
                  onChange={e => setForm(p => ({ ...p, contratanteCidade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.contratanteTelefone}
                  onChange={e => setForm(p => ({ ...p, contratanteTelefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rider Técnico</Label>
            <Select value={form.riderId} onValueChange={v => setForm(p => ({ ...p, riderId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione um rider" /></SelectTrigger>
              <SelectContent>
                {riders.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horário Montagem</Label>
              <Input type="time" value={form.setupTime} onChange={e => setForm(p => ({ ...p, setupTime: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Horário Show</Label>
              <Input type="time" value={form.showTime} onChange={e => setForm(p => ({ ...p, showTime: e.target.value }))} />
            </div>
          </div>

          {/* Saída */}
          <Separator />
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-heading font-semibold text-foreground">Saída / Logística</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Saída</Label>
                <Input type="date" value={form.departureDate} onChange={e => setForm(p => ({ ...p, departureDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Horário de Saída</Label>
                <Input type="time" value={form.departureTime} onChange={e => setForm(p => ({ ...p, departureTime: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Funcionários */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Funcionários
            </h4>
            {allStaff.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum funcionário cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {equipe.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Equipe</p>
                    <div className="space-y-1.5">
                      {equipe.map(s => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedStaffIds.includes(s.id)}
                            onCheckedChange={() => toggleStaff(s.id)}
                          />
                          <span className="text-foreground">{s.name}</span>
                          {s.role && <span className="text-xs text-muted-foreground">({s.role})</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {freelancers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Freelancer</p>
                    <div className="space-y-1.5">
                      {freelancers.map(s => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedStaffIds.includes(s.id)}
                            onCheckedChange={() => toggleStaff(s.id)}
                          />
                          <span className="text-foreground">{s.name}</span>
                          {s.role && <span className="text-xs text-muted-foreground">({s.role})</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
          </div>

          {/* Info para funcionários */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
            <h4 className="text-sm font-heading font-semibold text-primary">Informações para Funcionários</h4>
            <Textarea
              value={form.staffNotes}
              onChange={e => setForm(p => ({ ...p, staffNotes: e.target.value }))}
              rows={3}
              placeholder="Instruções internas, contatos, logística..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">{event ? "Salvar" : "Criar Evento"}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </form>
      </SheetContent>

      <QuickAddArtistDialog
        open={showAddArtist}
        onOpenChange={setShowAddArtist}
        onCreated={(id) => handleArtistChange(id)}
        initialName={pendingArtistName}
      />
      <QuickAddCityDialog
        open={showAddCity}
        onOpenChange={setShowAddCity}
        onCreated={(id) => setForm(p => ({ ...p, cityId: id }))}
        initialName={pendingCityName}
      />
    </Sheet>
  );
}
