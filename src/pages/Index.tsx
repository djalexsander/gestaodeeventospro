import { useState, useMemo } from "react";
import { format, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Filter, FileDown, X, MapPin, Music, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppContext } from "@/context/AppContext";
import { useCompany } from "@/context/CompanyContext";
import { useAuth } from "@/context/AuthContext";
import { EventItem } from "@/types";
import { EventCalendar } from "@/components/EventCalendar";
import { EventFormDrawer } from "@/components/EventFormDrawer";
import { EventDetailDrawer } from "@/components/EventDetailDrawer";
import { StatusBadge } from "@/components/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import { exportMonthlyPdf } from "@/lib/exportPdf";

export default function Dashboard() {
  const { events, artists, cities, getArtistById, getCityById } = useAppContext();
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventItem | null>(null);
  const [filterCity, setFilterCity] = useState("all");
  const [filterArtist, setFilterArtist] = useState("all");
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth()));
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const hasActiveFilter = filterCity !== "all" || filterArtist !== "all";

  // Filtered events across ALL dates (for the filter results panel)
  const filteredEvents = useMemo(() => {
    let result = [...events];
    if (filterCity !== "all") result = result.filter(e => e.cityId === filterCity);
    if (filterArtist !== "all") result = result.filter(e => e.artistId === filterArtist);
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, filterCity, filterArtist]);

  // Day events for the daily agenda (no filter, shows all for selected day)
  let dayEvents = events.filter(e => e.date === dateStr);
  if (filterCity !== "all") dayEvents = dayEvents.filter(e => e.cityId === filterCity);
  if (filterArtist !== "all") dayEvents = dayEvents.filter(e => e.artistId === filterArtist);

  const handleEdit = (ev: EventItem) => {
    setEditingEvent(ev);
    setFormOpen(true);
  };

  const clearFilters = () => {
    setFilterCity("all");
    setFilterArtist("all");
  };

  const selectedCityName = filterCity !== "all" ? getCityById(filterCity)?.name : null;
  const selectedArtistName = filterArtist !== "all" ? getArtistById(filterArtist)?.name : null;

  // Group filtered events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, EventItem[]> = {};
    filteredEvents.forEach(ev => {
      if (!groups[ev.date]) groups[ev.date] = [];
      groups[ev.date].push(ev);
    });
    return groups;
  }, [filteredEvents]);

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

        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-3">
                <h4 className="font-heading text-sm font-semibold">Exportar Agenda Mensal</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Mês</label>
                    <Select value={exportMonth} onValueChange={setExportMonth}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[
                          "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                          "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
                        ].map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Ano</label>
                    <Select value={exportYear} onValueChange={setExportYear}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => {
                          const y = new Date().getFullYear() - 1 + i;
                          return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={async () => {
                    const exportDate = setYear(setMonth(new Date(), Number(exportMonth)), Number(exportYear));
                    await exportMonthlyPdf({ events, month: exportDate, getArtistById, getCityById });
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" /> Gerar PDF
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {isAdmin && (
            <Button onClick={() => { setEditingEvent(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Evento
            </Button>
          )}
        </div>
      </div>

      {/* Filter Results Panel */}
      <AnimatePresence>
        {hasActiveFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {selectedCityName && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedCityName}
                    </span>
                  )}
                  {selectedArtistName && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                      <Music className="h-3.5 w-3.5" />
                      {selectedArtistName}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""} encontrado{filteredEvents.length !== 1 ? "s" : ""}
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum evento encontrado para este filtro.
                </p>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {Object.entries(groupedEvents).map(([date, evts]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {format(new Date(date + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {evts.map(ev => {
                          const artist = getArtistById(ev.artistId);
                          const city = getCityById(ev.cityId);
                          return (
                            <motion.div
                              key={ev.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-3 rounded-lg border bg-background cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => { setEditingEvent(null); setFormOpen(true); }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              )}
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
