import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, MinusCircle, Download, Pencil } from "lucide-react";
import { toast } from "sonner";

type Req = { id: string; framework: string; code: string; title: string; description: string | null; category: string | null; weight: number };
type Ass = { id: string; operator_id: string; requirement_id: string; status: "compliant" | "partial" | "non_compliant" | "not_applicable"; evidence: string | null; remediation_due: string | null };
type Op = { id: string; name: string; type: string };

const STATUS_LABEL: Record<string, string> = {
  compliant: "Conforme", partial: "Partiel", non_compliant: "Non conforme", not_applicable: "N/A",
};
const STATUS_WEIGHT: Record<string, number> = { compliant: 1, partial: 0.5, non_compliant: 0, not_applicable: 0 };
const STATUS_COLOR: Record<string, string> = {
  compliant: "bg-success/20 text-success border-success/40",
  partial: "bg-warning/20 text-warning border-warning/40",
  non_compliant: "bg-destructive/20 text-destructive border-destructive/40",
  not_applicable: "bg-muted text-muted-foreground border-border",
};
const STATUS_ICON: Record<string, any> = {
  compliant: CheckCircle2, partial: AlertTriangle, non_compliant: XCircle, not_applicable: MinusCircle,
};

export default function Compliance() {
  const { user, isAdmin, isAnalyst } = useAuth();
  const canEdit = isAdmin || isAnalyst;
  const [ops, setOps] = useState<Op[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [assess, setAssess] = useState<Ass[]>([]);
  const [opId, setOpId] = useState<string>("");
  const [framework, setFramework] = useState<string>("ANSSI");
  const [editing, setEditing] = useState<{ req: Req; ass?: Ass } | null>(null);
  const [form, setForm] = useState({ status: "non_compliant", evidence: "", remediation_due: "" });

  async function load() {
    const [{ data: o }, { data: r }, { data: a }] = await Promise.all([
      supabase.from("operators").select("id,name,type").order("name"),
      supabase.from("compliance_requirements").select("*").order("framework").order("code"),
      supabase.from("compliance_assessments").select("*"),
    ]);
    setOps(o ?? []);
    setReqs((r ?? []) as Req[]);
    setAssess((a ?? []) as Ass[]);
    if (!opId && o && o.length) setOpId(o[0].id);
  }
  useEffect(() => { load(); }, []);

  const filteredReqs = useMemo(() => reqs.filter(r => r.framework === framework), [reqs, framework]);
  const opAssess = useMemo(() => {
    const m = new Map<string, Ass>();
    assess.filter(a => a.operator_id === opId).forEach(a => m.set(a.requirement_id, a));
    return m;
  }, [assess, opId]);

  const score = useMemo(() => {
    let total = 0, got = 0;
    filteredReqs.forEach(r => {
      const a = opAssess.get(r.id);
      if (a?.status === "not_applicable") return;
      total += r.weight;
      if (a) got += r.weight * STATUS_WEIGHT[a.status];
    });
    return total ? Math.round((got / total) * 100) : 0;
  }, [filteredReqs, opAssess]);

  const stats = useMemo(() => {
    const s = { compliant: 0, partial: 0, non_compliant: 0, not_applicable: 0, missing: 0 };
    filteredReqs.forEach(r => {
      const a = opAssess.get(r.id);
      if (!a) s.missing++; else (s as any)[a.status]++;
    });
    return s;
  }, [filteredReqs, opAssess]);

  function openEdit(req: Req) {
    const a = opAssess.get(req.id);
    setEditing({ req, ass: a });
    setForm({
      status: a?.status ?? "non_compliant",
      evidence: a?.evidence ?? "",
      remediation_due: a?.remediation_due ?? "",
    });
  }

  async function saveAssessment() {
    if (!editing || !user) return;
    const payload: any = {
      operator_id: opId, requirement_id: editing.req.id,
      status: form.status, evidence: form.evidence || null,
      remediation_due: form.remediation_due || null, assessed_by: user.id,
    };
    const { error } = await supabase.from("compliance_assessments")
      .upsert(payload, { onConflict: "operator_id,requirement_id" });
    if (error) return toast.error(error.message);
    toast.success("Évaluation enregistrée");
    setEditing(null);
    if (Object.keys(stats).length) {
      // Update operator compliance score on framework change too
      await supabase.from("operators").update({ compliance_score: score }).eq("id", opId);
    }
    load();
  }

  function exportCsv() {
    const op = ops.find(o => o.id === opId);
    const rows = [["Framework","Code","Exigence","Catégorie","Statut","Preuves","Échéance"]];
    filteredReqs.forEach(r => {
      const a = opAssess.get(r.id);
      rows.push([r.framework, r.code, r.title, r.category ?? "", a ? STATUS_LABEL[a.status] : "Non évalué", a?.evidence ?? "", a?.remediation_due ?? ""]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `conformite-${op?.name ?? "operateur"}-${framework}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conformité ANSSI / NIS2"
        description="Évaluation des exigences réglementaires par opérateur"
        action={<Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Exporter CSV</Button>}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Opérateur</Label>
          <Select value={opId} onValueChange={setOpId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>{ops.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Référentiel</Label>
          <Tabs value={framework} onValueChange={setFramework}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="ANSSI">ANSSI</TabsTrigger>
              <TabsTrigger value="NIS2">NIS2</TabsTrigger>
              <TabsTrigger value="ISO27001">ISO</TabsTrigger>
              <TabsTrigger value="PCIDSS">PCI</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="p-5 gradient-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase">Score de conformité</div>
            <div className="text-4xl font-bold mt-1">{score}<span className="text-lg text-muted-foreground">/100</span></div>
          </div>
          <ShieldCheck className={`h-10 w-10 ${score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive"}`} />
        </div>
        <Progress value={score} className="h-2" />
        <div className="grid grid-cols-5 gap-2 mt-4 text-center">
          <div><div className="text-lg font-bold text-success">{stats.compliant}</div><div className="text-[10px] text-muted-foreground">Conformes</div></div>
          <div><div className="text-lg font-bold text-warning">{stats.partial}</div><div className="text-[10px] text-muted-foreground">Partiels</div></div>
          <div><div className="text-lg font-bold text-destructive">{stats.non_compliant}</div><div className="text-[10px] text-muted-foreground">Non conformes</div></div>
          <div><div className="text-lg font-bold">{stats.not_applicable}</div><div className="text-[10px] text-muted-foreground">N/A</div></div>
          <div><div className="text-lg font-bold text-muted-foreground">{stats.missing}</div><div className="text-[10px] text-muted-foreground">Non évalués</div></div>
        </div>
      </Card>

      <div className="grid gap-2">
        {filteredReqs.map(r => {
          const a = opAssess.get(r.id);
          const Icon = a ? STATUS_ICON[a.status] : MinusCircle;
          return (
            <Card key={r.id} className="p-4 gradient-card hover:border-primary/40 transition-smooth">
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 shrink-0 mt-1 ${a?.status === "compliant" ? "text-success" : a?.status === "partial" ? "text-warning" : a?.status === "non_compliant" ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{r.code}</Badge>
                    {r.category && <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>}
                    <span className="text-[10px] text-muted-foreground">Poids {r.weight}</span>
                    {a && <Badge className={`${STATUS_COLOR[a.status]} text-[10px]`}>{STATUS_LABEL[a.status]}</Badge>}
                  </div>
                  <div className="font-medium text-sm mt-1">{r.title}</div>
                  {r.description && <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>}
                  {a?.evidence && <div className="text-xs mt-2 p-2 rounded bg-muted/30">{a.evidence}</div>}
                  {a?.remediation_due && <div className="text-[10px] text-warning mt-1">Échéance remédiation : {a.remediation_due}</div>}
                </div>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                )}
              </div>
            </Card>
          );
        })}
        {filteredReqs.length === 0 && <div className="text-center py-12 text-muted-foreground">Aucune exigence dans ce référentiel</div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Évaluer — {editing?.req.code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">{editing?.req.title}</div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preuves / commentaires</Label>
              <Textarea value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Échéance de remédiation</Label>
              <Input type="date" value={form.remediation_due} onChange={e => setForm({ ...form, remediation_due: e.target.value })} />
            </div>
            <Button onClick={saveAssessment} className="w-full">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
