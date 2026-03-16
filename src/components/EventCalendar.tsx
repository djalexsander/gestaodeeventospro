import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

interface EventCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function EventCalendar({ selectedDate, onSelectDate }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { events } = useAppContext();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getEventsForDay = (d: Date) => {
    const dateStr = format(d, "yyyy-MM-dd");
    return events.filter((e) => e.date === dateStr);
  };

  return (
    <div className="bg-card rounded-xl border p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-heading text-lg font-bold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-2">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dayEvents = getEventsForDay(d);
          const inMonth = isSameMonth(d, currentMonth);
          const selected = isSameDay(d, selectedDate);
          const today = isToday(d);

          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(d)}
              className={cn(
                "relative flex flex-col items-center justify-center p-1 md:p-2 rounded-lg min-h-[48px] md:min-h-[64px] transition-all text-sm",
                !inMonth && "opacity-30",
                selected && "bg-primary/10 ring-2 ring-primary",
                today && !selected && !hasEvents && "bg-accent/30",
                !selected && inMonth && !hasEvents && "hover:bg-muted",
                hasEvents && !selected && "hover:bg-status-confirmed/20"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center text-xs md:text-sm font-medium rounded-full w-8 h-8 md:w-9 md:h-9 transition-all",
                  selected && "text-primary font-bold",
                  hasEvents && !selected && "bg-status-confirmed/20 text-status-confirmed font-bold ring-2 ring-status-confirmed/50",
                  hasEvents && selected && "bg-primary/20 text-primary font-bold"
                )}
              >
                {format(d, "d")}
              </span>
              {hasEvents && (
                <span className="text-[10px] text-status-confirmed font-semibold mt-0.5">
                  {dayEvents.length} {dayEvents.length === 1 ? "evt" : "evts"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
