import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, Plus, Download, Calendar, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const typeLabel: Record<string, string> = { weekly: "Hebdomadaire", monthly: "Mensuel", incident: "Incident", audit: "Audit" };

export default function Reports() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", type: "weekly" });

  async function load() {
    const { data } = await supabase.from("reports").select("*").order("generated_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    if (!user) return;
    setBusy(true);
    const since = new Date(); since.setDate(since.getDate() - (form.type === "monthly" ? 30 : 7));
    const [{ data: inc }, { data: ops }, { data: kp }] = await Promise.all([
      supabase.from("incidents").select("*").gte("created_at", since.toISOString()),
      supabase.from("operators").select("name, compliance_score").order("compliance_score", { ascending: true }).limit(5),
      supabase.from("kpi_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(1),
    ]);
    const k = kp?.[0];
    const content = `# ${form.title}\n\n**Période:** depuis le ${format(since, "dd/MM/yyyy")}\n**Auteur:** ${user.email}\n\n## Synthèse\n- Incidents période: ${inc?.length ?? 0}\n- Critiques: ${inc?.filter((i: any) => i.severity === "critical").length ?? 0}\n- MTTD: ${k?.mttd_minutes ?? 0} min · MTTR: ${Math.round((k?.mttr_minutes ?? 0)/60)} h\n- Conformité moyenne opérateurs: ${k?.operator_compliance_avg ?? 0}%\n\n## Top opérateurs à risque\n${(ops ?? []).map((o: any) => `- ${o.name} (${o.compliance_score}/100)`).join("\n")}\n\n## Recommandations\n- Renforcer les audits sur les opérateurs en zone rouge\n- Maintenir la veille active sur les CVEs critiques publiées cette semaine\n- Coordonner avec opérateurs sur campagnes de phishing actives`;
    const { error } = await supabase.from("reports").insert({ title: form.title, type: form.type as any, content, generated_by: user.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Rapport généré");
    setOpen(false); setForm({ title: "", type: "weekly" });
    load();
  }

  function exportPdf(r: any) {
    const html = `<html><head><meta charset="utf-8"><title>${r.title}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#222;max-width:800px;margin:auto}h1,h2{color:#0a8a4a}pre{white-space:pre-wrap;font-family:inherit;background:#f5f5f5;padding:20px;border-radius:8px}</style>
      </head><body><h1>${r.title}</h1><p><em>Généré le ${format(new Date(r.generated_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</em></p><pre>${r.content}</pre>
      <hr><p style="text-align:center;color:#888;font-size:11px">ARPT Guinée — CERT National · Document confidentiel</p></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  }

  async function exportIncidentsCsv() {
    const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
    const rows = [["ID","Titre","Type","Sévérité","Statut","Détecté","Résolu","Description"]];
    (data ?? []).forEach((i: any) => {
      rows.push([i.id, i.title, i.type, i.severity, i.status, i.detected_at ?? "", i.resolved_at ?? "", (i.description ?? "").replace(/\n/g, " ")]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `incidents-${format(new Date(),"yyyyMMdd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre de Reporting"
        description="Rapports DG hebdomadaires, mensuels et exports d'incidents"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Sparkles className="h-4 w-4 mr-2" />Générer un rapport</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau rapport</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Rapport hebdomadaire CERT — Semaine 17" /></div>
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(typeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={generate} disabled={busy || !form.title} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />{busy ? "Génération..." : "Générer automatiquement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3">
        {items.map(r => (
          <Card key={r.id} className="p-4 gradient-card hover:border-primary/40 transition-smooth">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileBarChart className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{r.title}</h3>
                  <Badge variant="outline">{typeLabel[r.type]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(r.generated_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</div>
                {r.content && <p className="text-sm text-muted-foreground mt-2 line-clamp-2 whitespace-pre-line">{r.content.slice(0, 200)}…</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => exportPdf(r)}><Download className="h-3 w-3 mr-1" />PDF</Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <div className="text-center py-12 text-muted-foreground">Aucun rapport — générez le premier</div>}
      </div>
    </div>
  );
}
