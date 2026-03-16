import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function QuickAddArtistDialog({ open, onOpenChange, onCreated }: Props) {
  const { addArtist, artists } = useAppContext();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await addArtist({
      name: name.trim(),
      musicalStyle: "",
      contact: "",
      defaultRiderId: null,
      riderFileName: null,
      riderFileUrl: null,
      notes: "",
    });
    setLoading(false);
    setName("");
    // Find newly created artist
    // We need to wait for context update, so use a small timeout
    setTimeout(() => {
      // The latest artist with this name
      const found = artists.find(a => a.name === name.trim());
      if (found && onCreated) onCreated(found.id);
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Artista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Artista</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
