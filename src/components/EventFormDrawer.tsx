import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { EventItem, EventStatus } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EventFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventItem | null;
  defaultDate?: string;
}

export function EventFormDrawer({ open, onOpenChange, event, defaultDate }: EventFormDrawerProps) {
  const { artists, cities, riders, addEvent, updateEvent, getRiderByArtistId, getArtistById } = useAppContext();

  const [form, setForm] = useState({
    date: "",
    name: "",
    cityId: "",
    venue: "",
    artistId: "",
    riderId: "",
    setupTime: "",
    showTime: "",
    notes: "",
    status: "Pendente" as EventStatus,
  });

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
        notes: event.notes,
        status: event.status,
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
        notes: "",
        status: "Pendente",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (event) {
      updateEvent({ ...form, id: event.id, riderId: form.riderId || null });
    } else {
      addEvent({ ...form, riderId: form.riderId || null });
    }
    onOpenChange(false);
  };

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
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
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
            <Select value={form.artistId} onValueChange={handleArtistChange}>
              <SelectTrigger><SelectValue placeholder="Selecione um artista" /></SelectTrigger>
              <SelectContent>
                {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select value={form.cityId} onValueChange={v => setForm(p => ({ ...p, cityId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione uma cidade" /></SelectTrigger>
              <SelectContent>
                {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.state}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Local</Label>
            <Input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} required />
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

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">{event ? "Salvar" : "Criar Evento"}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
