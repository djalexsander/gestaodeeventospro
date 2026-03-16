import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Artist } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Music, FileUp, FileText, X } from "lucide-react";

export default function Artistas() {
  const { artists, riders, addArtist, updateArtist, deleteArtist } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ name: "", musicalStyle: "", contact: "", defaultRiderId: "", notes: "" });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", musicalStyle: "", contact: "", defaultRiderId: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (a: Artist) => {
    setEditing(a);
    setForm({ name: a.name, musicalStyle: a.musicalStyle, contact: a.contact, defaultRiderId: a.defaultRiderId || "", notes: a.notes });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateArtist({ ...editing, ...form, defaultRiderId: form.defaultRiderId || null });
    } else {
      addArtist({ ...form, defaultRiderId: form.defaultRiderId || null });
    }
    setDialogOpen(false);
  };

  const filtered = artists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Music className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Artistas</h2>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Artista</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar artista..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Estilo</TableHead>
              <TableHead className="hidden md:table-cell">Contato</TableHead>
              <TableHead className="hidden lg:table-cell">Rider Padrão</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum artista cadastrado</TableCell></TableRow>
            ) : filtered.map(a => {
              const rider = riders.find(r => r.id === a.defaultRiderId);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{a.musicalStyle}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{a.contact}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{rider?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteArtist(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Artista" : "Novo Artista"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Estilo Musical</Label><Input value={form.musicalStyle} onChange={e => setForm(p => ({ ...p, musicalStyle: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Contato</Label><Input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Rider Técnico Padrão</Label>
              <Select value={form.defaultRiderId} onValueChange={v => setForm(p => ({ ...p, defaultRiderId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um rider" /></SelectTrigger>
                <SelectContent>
                  {riders.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
            <div className="flex gap-3"><Button type="submit" className="flex-1">{editing ? "Salvar" : "Criar"}</Button><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
