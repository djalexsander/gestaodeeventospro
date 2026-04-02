import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, QrCode, ArrowUpCircle, History, Package, CalendarDays, Infinity, Copy, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface HistoryRow {
  id: string;
  plan_name: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  price: number;
  payment_status?: string;
}

interface PixData {
  key_type: string;
  pix_key: string;
  receiver_name: string;
  city: string;
  bank: string;
}

// Helper to get all admin_master user IDs
async function getMasterAdminIds(): Promise<string[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin_master");
  return data?.map((r: any) => r.user_id) || [];
}

async function notifyMasters(title: string, message: string, type: string, refId?: string, refType?: string) {
  const masterIds = await getMasterAdminIds();
  if (masterIds.length === 0) return;
  const rows = masterIds.map(uid => ({
    user_id: uid,
    type,
    title,
    message,
    reference_id: refId || null,
    reference_type: refType || null,
  }));
  await supabase.from("notifications").insert(rows);
}

export default function PlanoAssinatura() {
  const { activeCompanyId, activeCompany } = useCompany();
  const { subscription, plans, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSubId, setReceiptSubId] = useState<string | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    if (!activeCompanyId) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("company_subscriptions")
      .select("id, status, starts_at, expires_at, plans(name, price)")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch payment submissions for these subscriptions
      const subIds = data.map((s: any) => s.id);
      const { data: payments } = await supabase
        .from("payment_submissions")
        .select("subscription_id, status")
        .in("subscription_id", subIds);

      const paymentMap: Record<string, string> = {};
      payments?.forEach((p: any) => {
        paymentMap[p.subscription_id] = p.status;
      });

      setHistory(data.map((s: any) => ({
        id: s.id,
        plan_name: s.plans?.name || "—",
        status: s.status,
        starts_at: s.starts_at,
        expires_at: s.expires_at,
        price: s.plans?.price || 0,
        payment_status: paymentMap[s.id] || "none",
      })));
    }
    setLoadingHistory(false);
  };

  const fetchPix = async () => {
    const { data } = await supabase.from("pix_settings" as any).select("*").limit(1).single();
    if (data) setPixData(data as any);
  };

  useEffect(() => { fetchPix(); }, []);

  // Generate PIX BR Code payload
  const pixPayload = useMemo(() => {
    if (!pixData?.pix_key) return "";
    const amount = subscription?.plan?.price?.toFixed(2) || "0.00";
    const name = (pixData.receiver_name || "").substring(0, 25).toUpperCase();
    const city = (pixData.city || "").substring(0, 15).toUpperCase();
    const key = pixData.pix_key;
    const pad = (id: string, val: string) => id + String(val.length).padStart(2, "0") + val;
    const merchantAccount = pad("00", "br.gov.bcb.pix") + pad("01", key);
    let payload = "";
    payload += pad("00", "01");
    payload += pad("26", merchantAccount);
    payload += pad("52", "0000");
    payload += pad("53", "986");
    if (parseFloat(amount) > 0) payload += pad("54", amount);
    payload += pad("58", "BR");
    payload += pad("59", name);
    payload += pad("60", city);
    payload += pad("62", pad("05", "***"));
    payload += "6304";
    const crc16 = (str: string) => {
      let crc = 0xFFFF;
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
          else crc <<= 1;
          crc &= 0xFFFF;
        }
      }
      return crc.toString(16).toUpperCase().padStart(4, "0");
    };
    return payload + crc16(payload);
  }, [pixData, subscription]);

  const openHistory = () => { fetchHistory(); setHistoryOpen(true); };

  // Plan change REQUEST (instead of direct upgrade)
  const handleUpgrade = async (planId: string) => {
    if (!activeCompanyId || !user) return;
    setUpgrading(true);

    const { error } = await supabase.from("plan_change_requests").insert({
      company_id: activeCompanyId,
      current_plan_id: subscription?.planId || null,
      requested_plan_id: planId,
      requested_by: user.id,
      status: "pending",
    });

    if (error) {
      toast.error("Erro ao solicitar alteração de plano");
    } else {
      const plan = plans.find(p => p.id === planId);
      await notifyMasters(
        "Solicitação de Alteração de Plano",
        `${activeCompany?.name || "Empresa"} solicitou alteração para o plano ${plan?.name || ""}`,
        "plan_change",
      );
      toast.success("Solicitação enviada! O administrador irá analisar.");
    }
    setUpgrading(false);
    setUpgradeOpen(false);
  };

  // Submit payment receipt
  const handleSubmitReceipt = async (file: File) => {
    if (!activeCompanyId || !user || !receiptSubId) return;
    setSubmittingReceipt(true);

    const fileName = `${activeCompanyId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("payment-receipts")
      .upload(fileName, file);

    if (uploadErr) {
      toast.error("Erro ao enviar comprovante");
      setSubmittingReceipt(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(fileName);

    const { error } = await supabase.from("payment_submissions").insert({
      company_id: activeCompanyId,
      subscription_id: receiptSubId,
      submitted_by: user.id,
      receipt_url: urlData.publicUrl,
      receipt_file_name: file.name,
      status: "pending",
    });

    if (error) {
      toast.error("Erro ao enviar comprovante");
    } else {
      await notifyMasters(
        "Comprovante de Pagamento Enviado",
        `${activeCompany?.name || "Empresa"} enviou um comprovante de pagamento`,
        "payment",
      );

      // Notify the company user too
      await supabase.from("notifications").insert({
        user_id: user.id,
        company_id: activeCompanyId,
        type: "payment",
        title: "Comprovante Enviado",
        message: "Seu comprovante foi enviado e está aguardando aprovação do administrador.",
      });

      toast.success("Comprovante enviado! Aguarde a aprovação.");
      fetchHistory();
    }
    setSubmittingReceipt(false);
    setReceiptDialogOpen(false);
  };

  const paymentStatusLabel = (s: string) => {
    if (s === "pending") return "Aguardando Aprovação";
    if (s === "approved") return "Aprovado";
    if (s === "rejected") return "Rejeitado";
    return "Sem Comprovante";
  };

  const paymentStatusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "pending") return "secondary";
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "outline";
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
            <p className="text-muted-foreground">Nenhum plano associado. Entre em contato com o administrador.</p>
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
          Solicitar Alteração de Plano
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
                Realize o pagamento via PIX e depois envie o comprovante pelo Histórico de Pagamentos.
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
                      <QRCodeSVG value={pixPayload} size={200} level="M" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Escaneie o QR Code com o app do seu banco
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

      {/* Upgrade (Plan Change Request) Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
              Solicitar Alteração de Plano
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione o plano desejado. A solicitação será analisada pelo administrador.
          </p>
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
                    {upgrading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Solicitar"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog with payment status and receipt upload */}
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
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.plan_name}</TableCell>
                      <TableCell>R$ {h.price.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(h.expires_at)}</TableCell>
                      <TableCell><Badge variant={statusVariant(h.status)}>{statusLabel(h.status)}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={paymentStatusVariant(h.payment_status || "none")}>
                          {paymentStatusLabel(h.payment_status || "none")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(h.payment_status === "none" || h.payment_status === "rejected") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => {
                              setReceiptSubId(h.id);
                              setReceiptDialogOpen(true);
                            }}
                          >
                            <Upload className="h-3 w-3" />
                            Comprovante
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Upload Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Enviar Comprovante de Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o comprovante de pagamento (imagem ou PDF). O administrador irá analisar e dar baixa.
            </p>
            <div className="space-y-2">
              <Label>Comprovante</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                disabled={submittingReceipt}
              />
            </div>
            <Button
              className="w-full"
              disabled={submittingReceipt}
              onClick={() => {
                const file = fileInputRef.current?.files?.[0];
                if (!file) { toast.error("Selecione um arquivo"); return; }
                handleSubmitReceipt(file);
              }}
            >
              {submittingReceipt ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar Comprovante
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
