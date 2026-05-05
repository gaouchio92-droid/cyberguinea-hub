import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { TLPBadge, TLP_OPTIONS, TLP } from "@/components/TLPBadge";
import { Plus, Search, Download, Trash2, Crosshair, Hash, Globe, Mail, Bug, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type IocType = "ipv4"|"ipv6"|"domain"|"url"|"md5"|"sha1"|"sha256"|"email"|"cve"|"filename"|"mutex"|"other";

const IOC_TYPES: { v: IocType; label: string; icon: any }[] = [
  { v: "ipv4", label: "IPv4", icon: Globe }, { v: "ipv6", label: "IPv6", icon: Globe },
  { v: "domain", label: "Domaine", icon: Globe }, { v: "url", label: "URL", icon: Globe },
  { v: "md5", label: "MD5", icon: Hash }, { v: "sha1", label: "SHA1", icon: Hash }, { v: "sha256", label: "SHA256", icon: Hash },
  { v: "email", label: "Email", icon: Mail }, { v: "cve", label: "CVE", icon: Bug },
  { v: "filename", label: "Fichier", icon: FileText }, { v: "mutex", label: "Mutex", icon: Crosshair },
  { v: "other", label: "Autre", icon: Crosshair },
];

export default function Iocs() {
  const { user, isAdmin, isAnalyst } = useAuth();
  const canWrite = isAdmin || isAnalyst;
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tlpFilter, setTlpFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "ipv4" as IocType, value: "", confidence: 70, tlp: "amber" as TLP, tags: "", source: "", description: "" });

  async function load() {
    const { data } = await supabase.from("iocs").select("*").order("created_at", { ascending: false }).limit(500);
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(i => {
    if (typeFilter !== "all" && i.type !== typeFilter) return false;
    if (tlpFilter !== "all" && i.tlp !== tlpFilter) return false;
    if (q && !`${i.value} ${i.source ?? ""} ${(i.tags ?? []).join(" ")} ${i.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, q, typeFilter, tlpFilter]);

  async function create() {
    if (!user || !form.value.trim()) return;
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const { error } = await supabase.from("iocs").insert({
      type: form.type, value: form.value.trim(), confidence: form.confidence, tlp: form.tlp,
      tags, source: form.source || null, description: form.description || null, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("IoC ajouté");
    setOpen(false);
    setForm({ type: "ipv4", value: "", confidence: 70, tlp: "amber", tags: "", source: "", description: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet IoC ?")) return;
    const { error } = await supabase.from("iocs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé"); load();
  }

  function exportMisp() {
    const event = {
      Event: {
        info: `ARPT-CERT export ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
        date: format(new Date(), "yyyy-MM-dd"),
        threat_level_id: "2",
        analysis: "2",
        distribution: "1",
        Attribute: filtered.map(i => ({
          type: misPType(i.type), category: misPCategory(i.type),
          value: i.value, to_ids: true, comment: i.description ?? "",
          Tag: [{ name: `tlp:${i.tlp.replace("_", "-")}` }, ...((i.tags ?? []).map((t: string) => ({ name: t })))],
        })),
      }
    };
    download(JSON.stringify(event, null, 2), `misp-export-${format(new Date(), "yyyyMMdd-HHmm")}.json`, "application/json");
  }

  function exportStix() {
    const objects = filtered.map(i => ({
      type: "indicator", spec_version: "2.1", id: `indicator--${i.id}`,
      created: i.created_at, modified: i.updated_at,
      name: `${i.type}:${i.value}`, indicator_types: ["malicious-activity"],
      pattern: stixPattern(i.type, i.value), pattern_type: "stix",
      valid_from: i.first_seen, confidence: i.confidence,
      labels: i.tags, object_marking_refs: [`marking-definition--tlp-${i.tlp.replace("_", "-")}`],
    }));
    const bundle = { type: "bundle", id: `bundle--${crypto.randomUUID()}`, objects };
    download(JSON.stringify(bundle, null, 2), `stix-export-${format(new Date(), "yyyyMMdd-HHmm")}.json`, "application/json");
  }

  function exportCsv() {
    const rows = [["Type","Valeur","Confidence","TLP","Tags","Source","Description","Premier vu","Dernier vu"]];
    filtered.forEach(i => rows.push([i.type, i.value, String(i.confidence), i.tlp, (i.tags ?? []).join("|"), i.source ?? "", i.description ?? "", i.first_seen, i.last_seen]));
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    download("\uFEFF" + csv, `iocs-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicateurs de compromission (IoCs)"
        description="Gestion centralisée des IoCs · export MISP / STIX 2.1 / CSV"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3 w-3 mr-1" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportMisp}><Download className="h-3 w-3 mr-1" />MISP</Button>
            <Button variant="outline" size="sm" onClick={exportStix}><Download className="h-3 w-3 mr-1" />STIX</Button>
            {canWrite && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nouvel IoC</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nouvel indicateur</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as IocType }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{IOC_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>TLP</Label>
                        <Select value={form.tlp} onValueChange={(v) => setForm(f => ({ ...f, tlp: v as TLP }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TLP_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Valeur</Label><Input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="ex: 185.220.101.5" /></div>
                    <div>
                      <Label>Confidence : {form.confidence}%</Label>
                      <Slider value={[form.confidence]} onValueChange={([v]) => setForm(f => ({ ...f, confidence: v }))} min={0} max={100} step={5} />
                    </div>
                    <div><Label>Tags (séparés par virgule)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="apt29,cobaltstrike" /></div>
                    <div><Label>Source</Label><Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="ex: ANSSI bulletin CERTFR-2026-AVI-042" /></div>
                    <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                    <Button onClick={create} className="w-full">Enregistrer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher valeur, tag, source…" className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {IOC_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tlpFilter} onValueChange={setTlpFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous TLP</SelectItem>
            {TLP_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="gradient-card">
        <div className="p-4 border-b text-sm text-muted-foreground">{filtered.length} IoC{filtered.length > 1 ? "s" : ""}</div>
        <div className="divide-y divide-border">
          {filtered.map(i => {
            const TypeIcon = IOC_TYPES.find(t => t.v === i.type)?.icon ?? Crosshair;
            return (
              <div key={i.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <TypeIcon className="h-4 w-4 text-primary shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">{i.type}</Badge>
                    <code className="text-sm font-mono break-all">{i.value}</code>
                    <TLPBadge tlp={i.tlp} />
                    <Badge variant="secondary" className="text-[10px]">{i.confidence}%</Badge>
                  </div>
                  {(i.tags ?? []).length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {i.tags.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}
                    </div>
                  )}
                  {i.description && <div className="text-xs text-muted-foreground mt-1">{i.description}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {i.source && <span>Source : {i.source} · </span>}
                    Vu le {format(new Date(i.first_seen), "dd/MM/yyyy")}
                  </div>
                </div>
                {canWrite && (
                  <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">Aucun IoC</div>}
        </div>
      </Card>
    </div>
  );
}

function misPType(t: string) {
  const map: Record<string, string> = { ipv4: "ip-dst", ipv6: "ip-dst", domain: "domain", url: "url", md5: "md5", sha1: "sha1", sha256: "sha256", email: "email-src", cve: "vulnerability", filename: "filename", mutex: "mutex" };
  return map[t] ?? "other";
}
function misPCategory(t: string) {
  if (["md5","sha1","sha256","filename"].includes(t)) return "Payload delivery";
  if (["ipv4","ipv6","domain","url"].includes(t)) return "Network activity";
  if (t === "cve") return "External analysis";
  return "Other";
}
function stixPattern(t: string, v: string) {
  const e = v.replace(/'/g, "\\'");
  if (t === "ipv4" || t === "ipv6") return `[ipv${t === "ipv6" ? 6 : 4}-addr:value = '${e}']`;
  if (t === "domain") return `[domain-name:value = '${e}']`;
  if (t === "url") return `[url:value = '${e}']`;
  if (["md5","sha1","sha256"].includes(t)) return `[file:hashes.'${t.toUpperCase()}' = '${e}']`;
  if (t === "email") return `[email-addr:value = '${e}']`;
  return `[x-custom:value = '${e}']`;
}
function download(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
