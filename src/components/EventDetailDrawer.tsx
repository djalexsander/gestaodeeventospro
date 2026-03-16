import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { EventItem } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Clock, MapPin, Music, Mic2, Wrench, FileText, Trash2, Pencil, LogOut, Users } from "lucide-react";

interface EventDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventItem | null;
  onEdit: (event: EventItem) => void;
}

export function EventDetailDrawer({ open, onOpenChange, event, onEdit }: EventDetailDrawerProps) {
  const { getArtistById, getCityById, getRiderById, deleteEvent } = useAppContext();
  const { isAdmin } = useAuth();

  if (!event) return null;

  const artist = getArtistById(event.artistId);
  const city = getCityById(event.cityId);
  const rider = event.riderId ? getRiderById(event.riderId) : null;

  const handleDelete = () => {
    deleteEvent(event.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-xl">{event.name}</SheetTitle>
            <StatusBadge status={event.status} />
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <DetailRow icon={Music} label="Artista" value={artist?.name || "—"} />
          <DetailRow icon={MapPin} label="Cidade" value={city ? `${city.name} - ${city.state}` : "—"} />
          <DetailRow icon={MapPin} label="Local" value={event.venue || "—"} />
          <DetailRow icon={Mic2} label="Rider Técnico" value={rider?.name || "—"} />
          <DetailRow icon={Wrench} label="Montagem" value={event.setupTime || "—"} />
          <DetailRow icon={Clock} label="Show" value={event.showTime || "—"} />

          {rider && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-heading text-sm font-semibold">Detalhes do Rider</h4>
              <p className="text-xs text-muted-foreground"><strong>Equipamentos:</strong> {rider.equipment || "—"}</p>
              <p className="text-xs text-muted-foreground"><strong>Som:</strong> {rider.soundSystem || "—"}</p>
              <p className="text-xs text-muted-foreground"><strong>Microfones:</strong> {rider.microphones || "—"}</p>
              <p className="text-xs text-muted-foreground"><strong>Monitores:</strong> {rider.monitors || "—"}</p>
            </div>
          )}

          {(event.departureDate || event.departureTime) && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-heading text-sm font-semibold flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Saída / Logística
              </h4>
              {event.departureDate && (
                <p className="text-xs text-muted-foreground"><strong>Data de Saída:</strong> {event.departureDate.split('-').reverse().join('/')}</p>
              )}
              {event.departureTime && (
                <p className="text-xs text-muted-foreground"><strong>Horário de Saída:</strong> {event.departureTime}</p>
              )}
            </div>
          )}

          {event.notes && (
            <DetailRow icon={FileText} label="Observações" value={event.notes} />
          )}

          {event.staffNotes && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <h4 className="font-heading text-sm font-semibold text-primary flex items-center gap-2">
                <Users className="h-4 w-4" /> Informações para Funcionários
              </h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{event.staffNotes}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => { onOpenChange(false); onEdit(event); }} className="flex-1">
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
