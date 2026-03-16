import { Badge } from "@/components/ui/badge";
import { EventStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<EventStatus, { className: string }> = {
  Confirmado: { className: "bg-status-confirmed text-white hover:bg-status-confirmed/90" },
  Pendente: { className: "bg-status-pending text-white hover:bg-status-pending/90" },
  Cancelado: { className: "bg-status-cancelled text-white hover:bg-status-cancelled/90" },
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge className={cn("text-xs", statusConfig[status].className)}>
      {status}
    </Badge>
  );
}
