import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, FileText } from "lucide-react";
import { incidentStatusLabel, incidentTypeLabel, severityColor, severityLabel, IncidentStatus, IncidentType, Severity } from "@/lib/types";
import { TLPBadge, TLP_OPTIONS, TLP } from "@/components/TLPBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { incidentSchema, firstZodError } from "@/lib/validation";

export default function Incidents() {
  const { user, isAdmin, isAnalyst } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [closeDialog, setCloseDialog] = useState<any>(null);
  const [closureComment, setClosureComment] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", type: "phishing" as IncidentType,
    severity: "medium" as Severity, status: "open" as IncidentStatus, operator_id: "", notes: "",
    tlp: "amber" as TLP,
  });

  async function load() {
    const [{ data: i }, { data: o }] = await Promise.all([
      supabase.from("incidents").select("*, operators(name)").order("created_at", { ascending: false }),
      supabase.from("operators").select("id, name").order("name"),
    ]);
    setItems(i ?? []); setOperators(o ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!user) return;
    const parsed = incidentSchema.safeParse(form);
    if (!parsed.success) return toast.error(firstZodError(parsed.error));
    const v = parsed.data;
    const { error } = await supabase.from("incidents").insert({
      title: v.title,
      description: v.description || null,
      type: v.type as IncidentType,
      severity: v.severity as Severity,
      status: v.status as IncidentStatus,
      notes: v.notes || null,
      operator_id: v.operator_id || null,
      tlp: form.tlp,
      created_by: user.id,
      owner_id: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Incident créé");
    setOpen(false);
    setForm({ title: "", description: "", type: "phishing", severity: "medium", status: "open", operator_id: "", notes: "", tlp: "amber" });
    load();
  }

  async function confirmCloseValidated() {
    if (!closureComment.trim() || closureComment.trim().length < 5) {
      return toast.error("Commentaire de clôture min. 5 caractères");
    }
    return confirmClose();
  }

  async function updateStatus(id: string, status: IncidentStatus, incident?: any) {
    if (status === "closed") {
      if (incident?.status !== "resolved") {
        toast.error("L'incident doit être résolu avant la clôture");
        return;
      }
      setCloseDialog(incident);
      setClosureComment("");
      return;
    }
    await supabase.from("incidents").update({ status, ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) }).eq("id", id);
    load();
  }

  async function confirmClose() {
    if (!closeDialog || !user) return;
    if (!closureComment.trim()) return toast.error("Commentaire de clôture requis");
    const { error } = await supabase.from("incidents").update({
      status: "closed",
      closure_comment: closureComment.trim(),
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    }).eq("id", closeDialog.id);
    if (error) return toast.error(error.message);
    toast.success("Incident clôturé");
    setCloseDialog(null);
    setClosureComment("");
    load();
  }

  function exportPdf() {
    const html = `<html><head><meta charset="utf-8"><title>Rapport Incidents ARPT</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#222}h1{color:#0a8a4a}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:8px;border:1px solid #ccc;text-align:left;font-size:12px}th{background:#0a8a4a;color:#fff}</style>
      </head><body><h1>ARPT Guinée — Rapport d'incidents</h1>
      <p>Généré le ${new Date().toLocaleString("fr-FR")} par ${user?.email}</p>
      <table><thead><tr><th>Titre</th><th>Type</th><th>Sévérité</th><th>Statut</th><th>Opérateur</th><th>Détecté</th></tr></thead><tbody>
      ${items.map(i => `<tr><td>${i.title}</td><td>${incidentTypeLabel[i.type as IncidentType]}</td><td>${severityLabel[i.severity as Severity]}</td><td>${incidentStatusLabel[i.status as IncidentStatus]}</td><td>${i.operators?.name ?? "-"}</td><td>${format(new Date(i.detected_at), "dd/MM/yyyy HH:mm")}</td></tr>`).join("")}
      </tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  }

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des incidents"
        description="Création, suivi, classification et reporting des incidents cyber"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPdf}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouvel incident</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Déclarer un incident</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select value={form.type} onValueChange={(v: IncidentType) => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(incidentTypeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Sévérité</Label>
                      <Select value={form.severity} onValueChange={(v: Severity) => setForm({ ...form, severity: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(severityLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Opérateur concerné</Label>
                    <Select value={form.operator_id} onValueChange={(v) => setForm({ ...form, operator_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>{operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Classification TLP</Label>
                    <Select value={form.tlp} onValueChange={(v: TLP) => setForm({ ...form, tlp: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TLP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label} — {o.desc}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                  <Button onClick={create} className="w-full">Créer l'incident</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {["all", ...Object.keys(incidentStatusLabel)].map(s => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "all" ? "Tous" : incidentStatusLabel[s as IncidentStatus]}
          </Button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map(i => (
          <Card key={i.id} className="p-4 gradient-card hover:border-primary/40 transition-smooth cursor-pointer" onClick={() => navigate(`/incidents/${i.id}`)}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold">{i.title}</h3>
                  <Badge className={severityColor[i.severity as Severity]}>{severityLabel[i.severity as Severity]}</Badge>
                  <Badge variant="outline">{incidentTypeLabel[i.type as IncidentType]}</Badge>
                  <Badge variant="secondary">{incidentStatusLabel[i.status as IncidentStatus]}</Badge>
                </div>
                {i.description && <p className="text-sm text-muted-foreground mb-2">{i.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>📅 {format(new Date(i.detected_at), "dd/MM/yyyy HH:mm")}</span>
                  {i.operators?.name && <span>🏢 {i.operators.name}</span>}
                  {i.closed_at && <span>🔒 Clôturé le {format(new Date(i.closed_at), "dd/MM/yyyy HH:mm")}</span>}
                </div>
                {i.closure_comment && (
                  <div className="mt-2 p-2 rounded bg-muted/50 border-l-2 border-primary text-xs">
                    <span className="font-semibold">Commentaire de clôture: </span>{i.closure_comment}
                  </div>
                )}
                {(isAdmin || isAnalyst) && i.status !== "closed" && (
                  <div className="flex flex-wrap gap-1 mt-3" onClick={e => e.stopPropagation()}>
                    {Object.entries(incidentStatusLabel).filter(([k]) => k !== i.status).map(([k, v]) => (
                      <Button key={k} size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateStatus(i.id, k as IncidentStatus, i)}>→ {v}</Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Aucun incident</div>}
      </div>

      <Dialog open={!!closeDialog} onOpenChange={v => !v && setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clôturer l'incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{closeDialog?.title}</p>
            <div>
              <Label>Commentaire de clôture <span className="text-destructive">*</span></Label>
              <Textarea
                value={closureComment}
                onChange={e => setClosureComment(e.target.value)}
                placeholder="Résumé de la résolution, leçons apprises, actions de prévention..."
                rows={5}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCloseDialog(null)} className="flex-1">Annuler</Button>
              <Button onClick={confirmClose} className="flex-1">Confirmer la clôture</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
