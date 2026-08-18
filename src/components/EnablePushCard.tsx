import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  disablePush,
  enablePush,
  getCurrentSubscription,
  isIOS,
  isPushSupported,
  isStandalonePWA,
  permissionStatus,
  sendTestPush,
} from "@/lib/push";

export function EnablePushCard({ compact = false }: { compact?: boolean }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let alive = true;
    void getCurrentSubscription().then((sub) => {
      if (alive) setSubscribed(!!sub && permissionStatus() === "granted");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!isPushSupported()) {
    if (compact) return null;
    return (
      <p className="text-xs text-muted-foreground">
        Este dispositivo não suporta notificações push.
      </p>
    );
  }

  const iosNeedsInstall = isIOS() && !isStandalonePWA();

  const handleEnable = async () => {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) {
      setSubscribed(true);
      toast.success("Notificações ativadas neste dispositivo.");
    } else {
      toast.error(res.error ?? "Não foi possível ativar as notificações.");
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    const res = await disablePush();
    setBusy(false);
    if (res.ok) {
      setSubscribed(false);
      toast.success("Notificações desativadas neste dispositivo.");
    } else {
      toast.error(res.error ?? "Não foi possível desativar.");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const res = await sendTestPush();
    setTesting(false);
    if (res.ok) toast.success(`Push de teste enviado (${res.sent} dispositivo(s)).`);
    else toast.error(res.error ?? "Falha ao enviar push de teste.");
  };

  if (subscribed === null) return null;

  if (subscribed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">Notificações ativas neste dispositivo</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Testar
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDisable} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
            Desativar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Ativar notificações de eventos</p>
      <p className="text-[11px] text-muted-foreground">
        {iosNeedsInstall
          ? "No iPhone/iPad, instale o app na tela de início (Compartilhar → Adicionar à Tela de Início) para receber avisos."
          : "Receba avisos de novos eventos, alterações e escalações mesmo com o app fechado."}
      </p>
      <Button size="sm" className="h-7 w-full text-xs gap-2" onClick={handleEnable} disabled={busy || iosNeedsInstall}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
        Ativar notificações
      </Button>
    </div>
  );
}