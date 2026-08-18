import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { EnablePushCard } from "@/components/EnablePushCard";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  reference_id: string | null;
  reference_type: string | null;
  event_id: string | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [limit, setLimit] = useState(30);
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = async (size = limit) => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(size + 1);
    if (data) {
      setHasMore(data.length > size);
      setNotifications(data.slice(0, size) as any);
    }
  };

  useEffect(() => {
    fetchNotifications(limit);

    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications(limit))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, limit]);

  // Refetch ao abrir o sino e ao voltar do background (cobre push recebido com o app fechado)
  useEffect(() => {
    if (open) fetchNotifications(limit);
  }, [open]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchNotifications(limit); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [limit, user]);

  // Navegação vinda do clique na notificação do sistema (service worker)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type === "NAVIGATE" && data.url) {
        navigate(data.url.replace(/^\/#/, ""));
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [navigate]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("id", id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id);
    const eventId = n.event_id || (n.reference_type === "event" ? n.reference_id : null);
    setOpen(false);
    if (eventId) navigate(`/eventos/${eventId}`);
  };

  const typeColor = (type: string) => {
    if (type === "payment" || type === "event_created") return "text-emerald-500";
    if (type === "plan_change" || type.startsWith("event_")) return "text-blue-500";
    if (type === "warning" || type === "event_cancelled") return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Notificações</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={markAllRead}>
                Marcar todas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowPrefs(v => !v)}
              aria-label="Preferências de notificação"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="px-3 py-3 border-b space-y-3">
          <EnablePushCard />
          {showPrefs && <NotificationPreferences />}
        </div>

        <Tabs defaultValue="unread">
          <TabsList className="grid w-full grid-cols-2 rounded-none">
            <TabsTrigger value="unread" className="text-xs">Não lidas ({unreadCount})</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
          </TabsList>
          {(["unread", "all"] as const).map(tab => {
            const list = tab === "unread" ? notifications.filter(n => !n.is_read) : notifications;
            return (
              <TabsContent key={tab} value={tab} className="m-0">
                <ScrollArea className="max-h-[300px]">
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
                  ) : (
                    list.map(n => (
                      <button
                        type="button"
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`w-full text-left px-4 py-3 border-b last:border-0 transition-colors hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`}
                      >
                        <p className={`text-xs font-semibold ${typeColor(n.type)}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </button>
                    ))
                  )}
                  {tab === "all" && hasMore && (
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setLimit(l => l + 30)}
                      >
                        Carregar mais
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            );
          })}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
