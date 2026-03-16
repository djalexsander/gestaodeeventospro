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

export function QuickAddCityDialog({ open, onOpenChange, onCreated }: Props) {
  const { addCity } = useAppContext();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !state.trim()) return;
    setLoading(true);
    const newId = await addCity({ name: name.trim(), state: state.trim().toUpperCase() });
    setLoading(false);
    if (newId && onCreated) onCreated(newId);
    setName("");
    setState("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Cidade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Cidade</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Estado (UF)</Label>
            <Input value={state} onChange={e => setState(e.target.value)} required maxLength={2} placeholder="SP" />
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
