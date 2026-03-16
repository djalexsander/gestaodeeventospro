import { useState } from "react";
import { downloadRiderPdf } from "@/lib/downloadPdf";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Artist } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Music, FileUp, FileText, X, Loader2 } from "lucide-react";

export default function Artistas() {
  const { artists, addArtist, updateArtist, deleteArtist, uploadRiderFile } = useAppContext();
  const { isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({ name: "", musicalStyle: "", contact: "", defaultRiderId: "", riderFileName: "" as string | null, riderFileUrl: "" as string | null, notes: "" });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", musicalStyle: "", contact: "", defaultRiderId: "", riderFileName: null, riderFileUrl: null, notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (a: Artist) => {
    setEditing(a);
    setForm({ name: a.name, musicalStyle: a.musicalStyle, contact: a.contact, defaultRiderId: a.defaultRiderId || "", riderFileName: a.riderFileName, riderFileUrl: a.riderFileUrl, notes: a.notes });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, defaultRiderId: form.defaultRiderId || null, riderFileName: form.riderFileName || null, riderFileUrl: form.riderFileUrl || null };
    if (editing) {
      await updateArtist({ ...editing, ...data });
    } else {
      await addArtist(data);
    }
    setDialogOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploading(true);
      const result = await uploadRiderFile(file);
      if (result) {
        setForm(p => ({ ...p, riderFileName: result.fileName, riderFileUrl: result.fileUrl }));
      }
      setUploading(false);
    }
  };

  const removeFile = () => {
    setForm(p => ({ ...p, riderFileName: null, riderFileUrl: null }));
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
              <TableHead className="hidden lg:table-cell">Rider (PDF)</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum artista cadastrado</TableCell></TableRow>
            ) : filtered.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{a.musicalStyle}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{a.contact}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {a.riderFileName ? (
                    <button onClick={() => downloadRiderPdf(a.riderFileUrl!, a.riderFileName!)} className="text-primary hover:underline flex items-center gap-1 text-sm">
                      <FileText className="h-3 w-3" />{a.riderFileName}
                    </button>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteArtist(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
              <Label>Rider Técnico (PDF)</Label>
              {uploading ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Enviando PDF...</span>
                </div>
              ) : form.riderFileName ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{form.riderFileName}</span>
                  <div className="flex gap-1 shrink-0">
                    {form.riderFileUrl && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => downloadRiderPdf(form.riderFileUrl!, form.riderFileName!)}>
                        <FileText className="h-3 w-3" />
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" onClick={removeFile}><X className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                  <FileUp className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para enviar PDF do rider</span>
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
            <div className="flex gap-3"><Button type="submit" className="flex-1" disabled={uploading}>{editing ? "Salvar" : "Criar"}</Button><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
