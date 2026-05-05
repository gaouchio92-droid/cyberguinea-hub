import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Radar, ShieldAlert, Bug, Globe, RefreshCw } from "lucide-react";
import { severityColor, severityLabel, Severity } from "@/lib/types";
import { TLPBadge, TLP_OPTIONS, TLP } from "@/components/TLPBadge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const catLabel: Record<string, string> = {
  cve: "CVE", apt: "APT", ransomware: "Ransomware", phishing_campaign: "Phishing", other: "Autre",
};
const catIcon: Record<string, any> = { cve: Bug, apt: ShieldAlert, ransomware: ShieldAlert, phishing_campaign: Globe, other: Radar };

export default function Intel() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "cve", severity: "medium" as Severity, region_impact: "", source: "", description: "", recommendations: "", cve_id: "", tlp: "green" as TLP });

  async function load() {
    const { data } = await supabase.from("intel_items").select("*").order("published_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.title.trim()) return;
    const { error } = await supabase.from("intel_items").insert(form as any);
    if (error) return toast.error(error.message);
    toast.success("Item ajouté");
    setOpen(false);
    setForm({ title: "", category: "cve", severity: "medium", region_impact: "", source: "", description: "", recommendations: "", cve_id: "", tlp: "green" });
    load();
  }

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threat Intelligence"
        description="CVEs, APTs, ransomware et menaces ciblant l'Afrique de l'Ouest"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => {
              const t = toast.loading("Synchronisation NVD…");
              const { data, error } = await supabase.functions.invoke("cve-feed");
              toast.dismiss(t);
              if (error) return toast.error(error.message);
              toast.success(`CVEs : ${data?.inserted ?? 0} nouveaux, ${data?.skipped ?? 0} déjà connus`);
              load();
            }}><RefreshCw className="h-4 w-4 mr-2" />Sync CVE</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Ajouter</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nouvel item de veille</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Catégorie</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(catLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Sévérité</Label>
                    <Select value={form.severity} onValueChange={(v: Severity) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(severityLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>CVE ID (si applicable)</Label><Input value={form.cve_id} onChange={e => setForm({ ...form, cve_id: e.target.value })} /></div>
                <div><Label>Région d'impact</Label><Input value={form.region_impact} onChange={e => setForm({ ...form, region_impact: e.target.value })} /></div>
                <div><Label>Source</Label><Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Recommandations</Label><Textarea value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} /></div>
                <Button onClick={create} className="w-full">Publier</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Tous</Button>
        {Object.entries(catLabel).map(([k, v]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{v}</Button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map(i => {
          const Icon = catIcon[i.category] ?? Radar;
          return (
            <Card key={i.id} className="p-5 gradient-card hover:border-primary/40 transition-smooth">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={severityColor[i.severity as Severity]}>{severityLabel[i.severity as Severity]}</Badge>
                    <Badge variant="outline">{catLabel[i.category]}</Badge>
                    {i.cve_id && <Badge variant="secondary" className="font-mono text-[10px]">{i.cve_id}</Badge>}
                  </div>
                  <h3 className="font-semibold leading-tight">{i.title}</h3>
                </div>
              </div>
              {i.description && <p className="text-sm text-muted-foreground mb-3">{i.description}</p>}
              {i.recommendations && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
                  <div className="text-xs font-semibold text-primary mb-1">📋 Recommandations</div>
                  <p className="text-sm">{i.recommendations}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {i.region_impact && <span>🌍 {i.region_impact}</span>}
                {i.source && <span>📡 {i.source}</span>}
                <span>📅 {format(new Date(i.published_at), "dd MMM yyyy", { locale: fr })}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
