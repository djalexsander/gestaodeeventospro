import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/context/AppContext";
import { EventItem } from "@/types";
import { EventCalendar } from "@/components/EventCalendar";
import { EventFormDrawer } from "@/components/EventFormDrawer";
import { EventDetailDrawer } from "@/components/EventDetailDrawer";
import { StatusBadge } from "@/components/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { events, artists, cities, getArtistById, getCityById } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventItem | null>(null);
  const [filterCity, setFilterCity] = useState("all");
  const [filterArtist, setFilterArtist] = useState("all");

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  let dayEvents = events.filter(e => e.date === dateStr);
  if (filterCity !== "all") dayEvents = dayEvents.filter(e => e.cityId === filterCity);
  if (filterArtist !== "all") dayEvents = dayEvents.filter(e => e.artistId === filterArtist);

  const handleEdit = (ev: EventItem) => {
    setEditingEvent(ev);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas cidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cidades</SelectItem>
            {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterArtist} onValueChange={setFilterArtist}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos artistas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos artistas</SelectItem>
            {artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => { setEditingEvent(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Evento
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <EventCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>

        {/* Daily Agenda */}
        <div className="bg-card rounded-xl border p-4 md:p-6">
          <h3 className="font-heading text-base font-bold mb-4 capitalize">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h3>

          {dayEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhum evento neste dia</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => { setEditingEvent(null); setFormOpen(true); }}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {dayEvents.map(ev => {
                  const artist = getArtistById(ev.artistId);
                  const city = getCityById(ev.cityId);
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg border bg-background cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setViewingEvent(ev); setDetailOpen(true); }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-semibold truncate">{ev.name}</h4>
                        <StatusBadge status={ev.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{artist?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{city?.name || "—"} • {ev.venue}</p>
                      <p className="text-xs text-muted-foreground mt-1">🕐 {ev.showTime || "—"}</p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <EventFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        defaultDate={dateStr}
      />
      <EventDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={viewingEvent}
        onEdit={handleEdit}
      />
    </div>
  );
}
