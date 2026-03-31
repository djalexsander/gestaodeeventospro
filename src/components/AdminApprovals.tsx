import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, XCircle, FileText, Eye, ArrowUpCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentRow {
  id: string;
  company_id: string;
  subscription_id: string;
  submitted_by: string;
  receipt_url: string | null;
  receipt_file_name: string | null;
  status: string;
  created_at: string;
  notes: string;
  companies: { name: string } | null;
  profiles: { name: string; email: string } | null;
}

interface PlanChangeRow {
  id: string;
  company_id: string;
  current_plan_id: string | null;
  requested_plan_id: string;
  requested_by: string;
  status: string;
  created_at: string;
  notes: string;
  companies: { name: string } | null;
  current_plan: { name: string } | null;
  requested_plan: { name: string; duration_days: number | null } | null;
  profiles: { name: string; email: string } | null;
}

export default function AdminApprovals() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [planChanges, setPlanChanges] = useState<PlanChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [paymentsRes, changesRes] = await Promise.all([
      supabase
        .from("payment_submissions")
        .select("*, companies(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("plan_change_requests")
        .select("*, companies(name), current_plan:plans!plan_change_requests_current_plan_id_fkey(name), requested_plan:plans!plan_change_requests_requested_plan_id_fkey(name, duration_days)")
        .order("created_at", { ascending: false }),
    ]);
    if (paymentsRes.data) setPayments(paymentsRes.data as any);
    if (changesRes.data) setPlanChanges(changesRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handlePaymentAction = async (id: string, action: "approved" | "rejected", payment: PaymentRow) => {
    setProcessing(id);

    const { error } = await supabase
      .from("payment_submissions")
      .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao processar");
      setProcessing(null);
      return;
    }

    if (action === "approved") {
      // Extend subscription by getting current plan's duration
      const { data: sub } = await supabase
        .from("company_subscriptions")
        .select("*, plans(duration_days)")
        .eq("id", payment.subscription_id)
        .single();

      if (sub) {
        const durationDays = (sub.plans as any)?.duration_days || 30;
        const currentExpires = sub.expires_at ? new Date(sub.expires_at) : new Date();
        const baseDate = currentExpires > new Date() ? currentExpires : new Date();
        baseDate.setDate(baseDate.getDate() + durationDays);

        await supabase
          .from("company_subscriptions")
          .update({ expires_at: baseDate.toISOString(), status: "active" } as any)
          .eq("id", payment.subscription_id);
      }
    }

    // Notify the submitter
    await supabase.from("notifications").insert({
      user_id: payment.submitted_by,
      company_id: payment.company_id,
      type: "payment",
      title: action === "approved" ? "Pagamento Aprovado ✅" : "Pagamento Rejeitado ❌",
      message: action === "approved"
        ? "Seu pagamento foi aprovado e o plano foi renovado."
        : "Seu comprovante foi rejeitado. Envie um novo comprovante.",
    });

    toast.success(action === "approved" ? "Pagamento aprovado e plano renovado!" : "Pagamento rejeitado.");
    setProcessing(null);
    fetchAll();
  };

  const handlePlanChangeAction = async (id: string, action: "approved" | "rejected", req: PlanChangeRow) => {
    setProcessing(id);

    const { error } = await supabase
      .from("plan_change_requests")
      .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao processar");
      setProcessing(null);
      return;
    }

    if (action === "approved") {
      // Cancel current active subscriptions
      await supabase
        .from("company_subscriptions")
        .update({ status: "cancelled" } as any)
        .eq("company_id", req.company_id)
        .eq("status", "active");

      // Create new subscription
      let expiresAt: string | null = null;
      if (req.requested_plan?.duration_days) {
        const exp = new Date();
        exp.setDate(exp.getDate() + req.requested_plan.duration_days);
        expiresAt = exp.toISOString();
      }

      await supabase.from("company_subscriptions").insert({
        company_id: req.company_id,
        plan_id: req.requested_plan_id,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: "active",
      });
    }

    // Notify the requester
    await supabase.from("notifications").insert({
      user_id: req.requested_by,
      company_id: req.company_id,
      type: "plan_change",
      title: action === "approved" ? "Alteração de Plano Aprovada ✅" : "Alteração de Plano Rejeitada ❌",
      message: action === "approved"
        ? `Seu plano foi alterado para ${req.requested_plan?.name || ""}.`
        : "Sua solicitação de alteração de plano foi negada.",
    });

    toast.success(action === "approved" ? "Plano alterado com sucesso!" : "Solicitação rejeitada.");
    setProcessing(null);
    fetchAll();
  };

  const statusLabel = (s: string) => {
    if (s === "pending") return "Pendente";
    if (s === "approved") return "Aprovado";
    return "Rejeitado";
  };

  const statusVariant = (s: string): "default" | "secondary" | "destructive" => {
    if (s === "approved") return "default";
    if (s === "pending") return "secondary";
    return "destructive";
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pendingPayments = payments.filter(p => p.status === "pending");
  const pendingChanges = planChanges.filter(p => p.status === "pending");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="payments" className="w-full">
        <TabsList>
          <TabsTrigger value="payments" className="gap-2">
            <FileText className="h-4 w-4" />
            Comprovantes {pendingPayments.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-5 w-5 p-0 flex items-center justify-center">{pendingPayments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="plan-changes" className="gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Alterações de Plano {pendingChanges.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-5 w-5 p-0 flex items-center justify-center">{pendingChanges.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <Card className="bg-card border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Comprovantes de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum comprovante enviado.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Comprovante</TableHead>
                          <TableHead className="w-[150px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.companies?.name || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                            <TableCell><Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge></TableCell>
                            <TableCell>
                              {p.receipt_url && (
                                <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setPreviewUrl(p.receipt_url)}>
                                  <Eye className="h-3 w-3" />
                                  Ver
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              {p.status === "pending" && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="default" className="gap-1 text-xs h-7" disabled={processing === p.id} onClick={() => handlePaymentAction(p.id, "approved", p)}>
                                    {processing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                    Aprovar
                                  </Button>
                                  <Button size="sm" variant="destructive" className="gap-1 text-xs h-7" disabled={processing === p.id} onClick={() => handlePaymentAction(p.id, "rejected", p)}>
                                    <XCircle className="h-3 w-3" />
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {payments.map(p => (
                      <div key={p.id} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{p.companies?.name || "—"}</span>
                          <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                        <div className="flex flex-wrap gap-2">
                          {p.receipt_url && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPreviewUrl(p.receipt_url)}>
                              <Eye className="h-3 w-3" />
                              Ver Comprovante
                            </Button>
                          )}
                          {p.status === "pending" && (
                            <>
                              <Button size="sm" variant="default" className="gap-1 text-xs" disabled={processing === p.id} onClick={() => handlePaymentAction(p.id, "approved", p)}>
                                {processing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1 text-xs" disabled={processing === p.id} onClick={() => handlePaymentAction(p.id, "rejected", p)}>
                                <XCircle className="h-3 w-3" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan-changes" className="mt-4">
          <Card className="bg-card border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-primary" />
                Solicitações de Alteração de Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Plano Atual</TableHead>
                          <TableHead>Plano Solicitado</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[150px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planChanges.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.companies?.name || "—"}</TableCell>
                            <TableCell>{r.current_plan?.name || "—"}</TableCell>
                            <TableCell className="font-semibold text-primary">{r.requested_plan?.name || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                            <TableCell><Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge></TableCell>
                            <TableCell>
                              {r.status === "pending" && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="default" className="gap-1 text-xs h-7" disabled={processing === r.id} onClick={() => handlePlanChangeAction(r.id, "approved", r)}>
                                    {processing === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                    Aprovar
                                  </Button>
                                  <Button size="sm" variant="destructive" className="gap-1 text-xs h-7" disabled={processing === r.id} onClick={() => handlePlanChangeAction(r.id, "rejected", r)}>
                                    <XCircle className="h-3 w-3" />
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {planChanges.map(r => (
                      <div key={r.id} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{r.companies?.name || "—"}</span>
                          <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground">Atual: {r.current_plan?.name || "—"}</p>
                          <p className="font-semibold text-primary">Solicitado: {r.requested_plan?.name || "—"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                        {r.status === "pending" && (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="default" className="gap-1 text-xs" disabled={processing === r.id} onClick={() => handlePlanChangeAction(r.id, "approved", r)}>
                              {processing === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1 text-xs" disabled={processing === r.id} onClick={() => handlePlanChangeAction(r.id, "rejected", r)}>
                              <XCircle className="h-3 w-3" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            previewUrl.endsWith(".pdf") ? (
              <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg border" />
            ) : (
              <img src={previewUrl} alt="Comprovante" className="w-full max-h-[60vh] object-contain rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
