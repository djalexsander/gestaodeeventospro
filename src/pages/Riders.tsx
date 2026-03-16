import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { TechnicalRider } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Mic2 } from "lucide-react";

export default function Riders() {
  const { riders, artists, addRider, updateRider, deleteRider } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TechnicalRider | null>(null);
  const [search, setSearch] = useState("");

  const empty = { name: "", artistId: "", equipment: "", soundSystem: "", microphones: "", monitors: "", notes: "" };
  const [form, setForm] = useState(empty);

  const openNew = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (r: TechnicalRider) => {
    setEditing(r);
    setForm({ name: r.name, artistId: r.artistId || "", equipment: r.equipment, soundSystem: r.soundSystem, microphones: r.microphones, monitors: r.monitors, notes: r.notes });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateRider({ ...editing, ...form, artistId: form.artistId || null });
    } else {
      addRider({ ...form, artistId: form.artistId || null });
    }
    setDialogOpen(false);
  };

  const filtered = riders.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mic2 className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Riders Técnicos</h2>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Rider</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar rider..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Artista</TableHead>
              <TableHead className="hidden lg:table-cell">Som</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum rider cadastrado</TableCell></TableRow>
            ) : filtered.map(r => {
              const artist = artists.find(a => a.id === r.artistId);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{artist?.name || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{r.soundSystem || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRider(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Rider" : "Novo Rider"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div className="space-y-2">
              <Label>Artista Vinculado</Label>
              <Select value={form.artistId} onValueChange={v => setForm(p => ({ ...p, artistId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um artista" /></SelectTrigger>
                <SelectContent>
                  {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Equipamentos</Label><Textarea value={form.equipment} onChange={e => setForm(p => ({ ...p, equipment: e.target.value }))} rows={2} /></div>
            <div className="space-y-2"><Label>Sistema de Som</Label><Input value={form.soundSystem} onChange={e => setForm(p => ({ ...p, soundSystem: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Microfones</Label><Input value={form.microphones} onChange={e => setForm(p => ({ ...p, microphones: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Monitores</Label><Input value={form.monitors} onChange={e => setForm(p => ({ ...p, monitors: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="flex gap-3"><Button type="submit" className="flex-1">{editing ? "Salvar" : "Criar"}</Button><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
