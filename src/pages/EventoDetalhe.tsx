import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { EventDetailDrawer } from "@/components/EventDetailDrawer";
import { EventFormDrawer } from "@/components/EventFormDrawer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { EventItem } from "@/types";

export default function EventoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, loading } = useAppContext();
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const event = events.find((e) => e.id === id) ?? null;

  useEffect(() => {
    document.title = event ? `${event.name} | Gestão de Eventos Pro` : "Evento | Gestão de Eventos Pro";
  }, [event]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-20">
        <h1 className="font-heading text-xl font-bold text-foreground">Evento não encontrado</h1>
        <p className="text-sm text-muted-foreground">
          Este evento pode ter sido removido ou você não tem acesso a ele.
        </p>
        <Button onClick={() => navigate("/eventos")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a agenda
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/eventos")}>
          <ArrowLeft className="h-4 w-4" />
          Agenda
        </Button>
      </div>
      <EventDetailDrawer
        open
        onOpenChange={(o) => { if (!o) navigate("/eventos"); }}
        event={event}
        onEdit={(ev) => { setEditing(ev); setFormOpen(true); }}
      />
      <EventFormDrawer open={formOpen} onOpenChange={setFormOpen} event={editing} />
    </>
  );
}