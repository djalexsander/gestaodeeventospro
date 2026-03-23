import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, QrCode, ArrowUpCircle, History, Package, CalendarDays, Infinity, Copy } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface HistoryRow {
  id: string;
  plan_name: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  price: number;
}

interface PixData {
  key_type: string;
  pix_key: string;
  receiver_name: string;
  city: string;
  bank: string;
}

export default function PlanoAssinatura() {
  const { activeCompanyId } = useCompany();
  const { subscription, plans, refreshSubscription } = useSubscription();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const fetchHistory = async () => {
    if (!activeCompanyId) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("company_subscriptions")
      .select("id, status, starts_at, expires_at, plans(name, price)")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false });
    if (data) {
      setHistory(data.map((s: any) => ({
        id: s.id,
        plan_name: s.plans?.name || "—",
        status: s.status,
        starts_at: s.starts_at,
        expires_at: s.expires_at,
        price: s.plans?.price || 0,
      })));
    }
    setLoadingHistory(false);
  };

  const fetchPix = async () => {
    const { data } = await supabase.from("pix_settings" as any).select("*").limit(1).single();
    if (data) setPixData(data as any);
  };

  useEffect(() => {
    fetchPix();
  }, []);

  const openHistory = () => {
    fetchHistory();
    setHistoryOpen(true);
  };

  const handleUpgrade = async (planId: string) => {
    if (!activeCompanyId) return;
    setUpgrading(true);
    // Cancel current active subscriptions
    await supabase
      .from("company_subscriptions")
      .update({ status: "cancelled" } as any)
      .eq("company_id", activeCompanyId)
      .eq("status", "active");

    const plan = plans.find(p => p.id === planId);
    let expiresAt: string | null = null;
    if (plan && plan.durationDays) {
      const exp = new Date();
      exp.setDate(exp.getDate() + plan.durationDays);
      expiresAt = exp.toISOString();
    }

    const { error } = await supabase.from("company_subscriptions").insert({
      company_id: activeCompanyId,
      plan_id: planId,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: "active",
    });

    if (error) toast.error("Erro ao alterar plano");
    else {
      toast.success("Plano atualizado com sucesso!");
      await refreshSubscription();
    }
    setUpgrading(false);
    setUpgradeOpen(false);
  };

  const statusLabel = (s: string) => {
    if (s === "active") return "Ativo";
    if (s === "expired") return "Expirado";
    return "Cancelado";
  };

  const statusVariant = (s: string): "default" | "secondary" | "destructive" => {
    if (s === "active") return "default";
    if (s === "expired") return "destructive";
    return "secondary";
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <h2 className="font-heading text-2xl font-bold">Plano & Assinatura</h2>
      </div>

      {/* Current Plan Card */}
      <Card className="bg-card border border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Plano Atual</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {subscription?.plan ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{subscription.plan.name}</p>
                  <p className="text-sm text-muted-foreground">{subscription.plan.description}</p>
                </div>
                <Badge variant={statusVariant(subscription.status)}>{statusLabel(subscription.status)}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Início: {formatDate(subscription.startsAt)}
                </span>
                {subscription.expiresAt ? (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Vencimento: {formatDate(subscription.expiresAt)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Infinity className="h-3.5 w-3.5" />
                    Vitalício
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-primary">
                R$ {subscription.plan.price.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum plano associado. Selecione um plano abaixo.</p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="default" onClick={() => setPixOpen(true)} className="gap-2">
          <QrCode className="h-4 w-4" />
          Pagar Mensalidade
        </Button>
        <Button variant="outline" onClick={() => setUpgradeOpen(true)} className="gap-2">
          <ArrowUpCircle className="h-4 w-4" />
          Fazer Upgrade de Plano
        </Button>
        <Button variant="outline" onClick={openHistory} className="gap-2">
          <History className="h-4 w-4" />
          Histórico de Pagamentos
        </Button>
      </div>

      {/* PIX Dialog */}
      <Dialog open={pixOpen} onOpenChange={setPixOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Pagar via PIX
            </DialogTitle>
          </DialogHeader>
          {pixData && pixData.pix_key ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Realize o pagamento via PIX com os dados abaixo:
              </p>
              {subscription?.plan && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Valor da mensalidade</p>
                  <p className="text-3xl font-bold text-primary">R$ {subscription.plan.price.toFixed(2)}</p>
                </div>
              )}
              <Tabs defaultValue="qrcode" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="qrcode" className="gap-2"><QrCode className="h-3.5 w-3.5" /> QR Code</TabsTrigger>
                  <TabsTrigger value="copiar" className="gap-2"><Copy className="h-3.5 w-3.5" /> Copiar Chave</TabsTrigger>
                </TabsList>
                <TabsContent value="qrcode" className="mt-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-xl border bg-white p-4">
                      <QRCodeSVG
                        value={pixPayload}
                        size={200}
                        level="M"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Escaneie o QR Code com o app do seu banco para pagar
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="copiar" className="mt-4 space-y-3">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between rounded-lg border p-3">
                      <span className="text-muted-foreground">Tipo da Chave</span>
                      <span className="font-medium capitalize">{pixData.key_type}</span>
                    </div>
                    <div className="flex justify-between rounded-lg border p-3">
                      <span className="text-muted-foreground">Chave PIX</span>
                      <span className="font-medium">{pixData.pix_key}</span>
                    </div>
                    <div className="flex justify-between rounded-lg border p-3">
                      <span className="text-muted-foreground">Recebedor</span>
                      <span className="font-medium">{pixData.receiver_name}</span>
                    </div>
                    <div className="flex justify-between rounded-lg border p-3">
                      <span className="text-muted-foreground">Banco</span>
                      <span className="font-medium">{pixData.bank}</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => {
                    navigator.clipboard.writeText(pixData.pix_key);
                    toast.success("Chave PIX copiada!");
                  }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Chave PIX
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Dados PIX não configurados. Entre em contato com o administrador.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Fazer Upgrade de Plano
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum plano disponível.</p>
            ) : plans.map(plan => (
              <div key={plan.id} className={`rounded-lg border p-4 flex items-center justify-between transition-colors ${subscription?.planId === plan.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{plan.name}</p>
                    {subscription?.planId === plan.id && <Badge variant="default" className="text-[10px]">Atual</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                  <p className="text-lg font-bold text-primary mt-1">R$ {plan.price.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                </div>
                {subscription?.planId !== plan.id && (
                  <Button size="sm" disabled={upgrading} onClick={() => handleUpgrade(plan.id)}>
                    {upgrading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Selecionar"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Pagamentos
            </DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.plan_name}</TableCell>
                      <TableCell>R$ {h.price.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(h.starts_at)}</TableCell>
                      <TableCell>{formatDate(h.expires_at)}</TableCell>
                      <TableCell><Badge variant={statusVariant(h.status)}>{statusLabel(h.status)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
