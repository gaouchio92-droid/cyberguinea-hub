import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Plus, FileCheck, RefreshCw, Link as LinkIcon, Pencil, Phone, Trash2, Edit, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { auditSchema, firstZodError } from "@/lib/validation";
import { OperatorContactsDialog } from "@/components/OperatorContactsDialog";

export default function Operators() {
  const nav = useNavigate();
  const { user, isAdmin, isAnalyst } = useAuth();
  const [ops, setOps] = useState<any[]>([]);
  const [audits, setAudits] = useState<Record<string, any[]>>({});
  const [filter, setFilter] = useState("all");
  const [auditOpen, setAuditOpen] = useState<string | null>(null);
  const [urlDialog, setUrlDialog] = useState<any>(null);
  const [urlInput, setUrlInput] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [form, setForm] = useState({ framework: "ISO27001", score: 70, findings: "", remediation_plan: "" });
  const [contactsOp, setContactsOp] = useState<{ id: string; name: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSel(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  async function deleteOne(o: any) {
    if (!confirm(`Supprimer "${o.name}" ?`)) return;
    const { error } = await supabase.from("operators").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Opérateur supprimé");
    setSelected(prev => { const n = new Set(prev); n.delete(o.id); return n; });
    load();
  }
  async function deleteBatch() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Supprimer ${ids.length} opérateur(s) sélectionné(s) ? Cette action est irréversible.`)) return;
    const { error } = await supabase.from("operators").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} opérateur(s) supprimé(s)`);
    setSelected(new Set());
    load();
  }

  async function load() {
    const [{ data: o }, { data: a }] = await Promise.all([
      supabase.from("operators").select("*").order("name"),
      supabase.from("audits").select("*").order("audit_date", { ascending: false }),
    ]);
    setOps(o ?? []);
    const map: Record<string, any[]> = {};
    (a ?? []).forEach((x: any) => { (map[x.operator_id] ??= []).push(x); });
    setAudits(map);
  }
  useEffect(() => { load(); }, []);

  async function createAudit(operator_id: string) {
    if (!user) return;
    const parsed = auditSchema.safeParse(form);
    if (!parsed.success) return toast.error(firstZodError(parsed.error));
    const v = parsed.data;
    const { error } = await supabase.from("audits").insert({
      operator_id, framework: v.framework as any, score: v.score,
      findings: v.findings || null, remediation_plan: v.remediation_plan || null,
      auditor_id: user.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("operators").update({ compliance_score: v.score }).eq("id", operator_id);
    toast.success("Audit enregistré");
    setAuditOpen(null);
    setForm({ framework: "ISO27001", score: 70, findings: "", remediation_plan: "" });
    load();
  }

  async function saveUrl() {
    if (!urlDialog) return;
    const url = urlInput.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) return toast.error("URL invalide (http:// ou https://)");
    const { error } = await supabase.from("operators").update({ source_url: url }).eq("id", urlDialog.id);
    if (error) return toast.error(error.message);
    toast.success("URL enregistrée");
    setUrlDialog(null);
    setUrlInput("");
    load();
  }

  async function syncOperator(op: any) {
    if (!op.source_url) {
      setUrlDialog(op);
      setUrlInput("");
      return toast.error("Configurez d'abord une URL source");
    }
    setSyncing(op.id);
    try {
      const { data, error } = await supabase.functions.invoke("sync-operator", { body: { operator_id: op.id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Opérateur synchronisé");
      load();
    } catch (e: any) {
      toast.error(e.message || "Échec synchronisation");
    } finally {
      setSyncing(null);
    }
  }

  const filtered = filter === "all" ? ops : ops.filter(o => o.type === filter);

  function scoreColor(s: number) {
    if (s >= 80) return "text-success";
    if (s >= 60) return "text-warning";
    return "text-destructive";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Opérateurs & Audits de conformité" description={`${ops.length} entités · Référentiels ISO 27001 / NIST CSF / ARPT`} />

      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          {[["all", "Tous"], ["telecom", "Télécoms"], ["isp", "FAI / ISP"]].map(([k, v]) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{v}</Button>
          ))}
          {isAdmin && filtered.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => {
              const allIds = filtered.map(o => o.id);
              const allSel = allIds.every(id => selected.has(id));
              setSelected(allSel ? new Set() : new Set(allIds));
            }}>
              {filtered.every(o => selected.has(o.id)) ? "Tout désélectionner" : "Tout sélectionner"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {isAdmin && selected.size > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                <X className="h-4 w-4 mr-1" />{selected.size} sélectionné(s)
              </Button>
              <Button size="sm" variant="destructive" onClick={deleteBatch}>
                <Trash2 className="h-4 w-4 mr-1" />Supprimer la sélection
              </Button>
            </>
          )}
          {(isAdmin || isAnalyst) && (
            <Button size="sm" onClick={() => nav("/operators/new")}><Plus className="h-4 w-4 mr-1" />Nouvel opérateur</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(o => {
          const oas = audits[o.id] ?? [];
          return (
            <Card key={o.id} className="p-5 gradient-card hover:border-primary/40 transition-smooth">
              <div className="flex items-start gap-3 mb-3">
                {isAdmin && (
                  <Checkbox
                    checked={selected.has(o.id)}
                    onCheckedChange={() => toggleSel(o.id)}
                    aria-label={`Sélectionner ${o.name}`}
                    className="mt-1"
                  />
                )}
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{o.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{o.type === "telecom" ? "Télécom" : "ISP"}</Badge>
                    {o.region && <Badge variant="secondary" className="text-[10px]">{o.region}</Badge>}
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Score conformité</span>
                  <span className={`font-bold ${scoreColor(o.compliance_score ?? 0)}`}>{o.compliance_score ?? 0}/100</span>
                </div>
                <Progress value={o.compliance_score ?? 0} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground mb-3 space-y-1">
                <div>{oas.length} audit(s) · Dernier: {oas[0] ? format(new Date(oas[0].audit_date), "dd/MM/yyyy") : "—"}</div>
                {o.source_url && (
                  <div className="flex items-center gap-1 truncate">
                    <LinkIcon className="h-3 w-3 shrink-0" />
                    <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{o.source_url}</a>
                  </div>
                )}
                {o.last_synced_at && <div>🔄 Sync: {format(new Date(o.last_synced_at), "dd/MM/yyyy HH:mm")}</div>}
              </div>
              {o.last_sync_summary && (
                <div className="mb-3 p-2 rounded bg-muted/40 border-l-2 border-primary/40 text-xs text-muted-foreground line-clamp-3">
                  {o.last_sync_summary}
                </div>
              )}
              {(isAdmin || isAnalyst) && (
                <div className="flex gap-2 mb-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => nav(`/operators/${o.id}/edit`)}>
                    <Edit className="h-3 w-3 mr-1" />Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled={syncing === o.id} onClick={() => syncOperator(o)}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncing === o.id ? "animate-spin" : ""}`} />
                    {syncing === o.id ? "Sync..." : "Synchroniser"}
                  </Button>
                </div>
              )}
              {isAdmin && (
                <Button
                  size="sm" variant="ghost" className="w-full mb-2 text-destructive hover:text-destructive"
                  onClick={() => deleteOne(o)}
                ><Trash2 className="h-3 w-3 mr-1" />Supprimer</Button>
              )}
              <Button size="sm" variant="outline" className="w-full mb-2" onClick={() => setContactsOp({ id: o.id, name: o.name })}>
                <Phone className="h-3 w-3 mr-2" />Contacts 24/7
              </Button>
              <Dialog open={auditOpen === o.id} onOpenChange={v => setAuditOpen(v ? o.id : null)}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full"><FileCheck className="h-3 w-3 mr-2" />Nouvel audit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Audit — {o.name}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Référentiel</Label>
                      <Select value={form.framework} onValueChange={v => setForm({ ...form, framework: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ISO27001">ISO 27001</SelectItem>
                          <SelectItem value="NIST">NIST CSF</SelectItem>
                          <SelectItem value="ARPT">ARPT Guinée</SelectItem>
                          <SelectItem value="PCI_DSS">PCI DSS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Score (0-100)</Label><Input type="number" min={0} max={100} value={form.score} onChange={e => setForm({ ...form, score: +e.target.value })} /></div>
                    <div><Label>Constats</Label><Textarea value={form.findings} onChange={e => setForm({ ...form, findings: e.target.value })} /></div>
                    <div><Label>Plan de remédiation</Label><Textarea value={form.remediation_plan} onChange={e => setForm({ ...form, remediation_plan: e.target.value })} /></div>
                    <Button onClick={() => createAudit(o.id)} className="w-full">Enregistrer l'audit</Button>
                  </div>
                </DialogContent>
              </Dialog>
              {oas.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  {oas.slice(0, 2).map(a => (
                    <div key={a.id} className="text-xs flex justify-between">
                      <span>{a.framework} — {format(new Date(a.audit_date), "dd/MM/yy")}</span>
                      <span className={scoreColor(a.score)}>{a.score}/100</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!urlDialog} onOpenChange={v => !v && setUrlDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Source de synchronisation — {urlDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>URL du site officiel</Label>
              <Input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://www.operateur.gn"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cette URL sera utilisée pour synchroniser automatiquement les informations publiques de l'opérateur (contacts, services, région) via analyse IA.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setUrlDialog(null)} className="flex-1">Annuler</Button>
              <Button onClick={saveUrl} className="flex-1">Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OperatorContactsDialog operator={contactsOp} open={!!contactsOp} onOpenChange={v => !v && setContactsOp(null)} />
    </div>
  );
}
