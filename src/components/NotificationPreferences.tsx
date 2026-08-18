import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const FIELDS: Array<{ key: string; label: string }> = [
  { key: "event_created", label: "Novo evento" },
  { key: "event_updated", label: "Evento alterado" },
  { key: "event_cancelled", label: "Evento cancelado" },
  { key: "event_date_changed", label: "Mudança de data" },
  { key: "event_time_changed", label: "Mudança de horário" },
  { key: "event_location_changed", label: "Mudança de local" },
  { key: "event_assignment_added", label: "Fui escalado" },
  { key: "event_assignment_removed", label: "Saí da escala" },
];

export function NotificationPreferences() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const base: Record<string, boolean> = {};
      FIELDS.forEach((f) => {
        base[f.key] = data ? (data as Record<string, unknown>)[f.key] !== false : true;
      });
      setPrefs(base);
      setLoaded(true);
    })();
  }, [user]);

  const toggle = async (key: string, value: boolean) => {
    if (!user) return;
    setPrefs((p) => ({ ...p, [key]: value }));
    const { error } = await supabase.from("notification_preferences").upsert(
      { user_id: user.id, company_id: activeCompanyId ?? null, [key]: value },
      { onConflict: "user_id" },
    );
    if (error) {
      toast.error("Erro ao salvar preferência");
      setPrefs((p) => ({ ...p, [key]: !value }));
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-2">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{f.label}</span>
          <Switch checked={prefs[f.key]} onCheckedChange={(v) => toggle(f.key, v)} />
        </div>
      ))}
    </div>
  );
}