import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Copy, Radio, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const VENDOR_LABELS: Record<string, string> = {
  wazuh: "Wazuh", splunk: "Splunk", sentinel: "Microsoft Sentinel",
  crowdstrike: "CrowdStrike Falcon", generic: "Webhook générique",
};

export default function SiemSources() {
  const { isAdmin } = useAuth();
  const [sources, setSources] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", vendor: "wazuh", operator_id: "", severity_threshold: "high", endpoint_url: "" });
  const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const ingestUrl = `https://${projectRef}.supabase.co/functions/v1/siem-ingest`;

  async function load() {
    const [{ data: s }, { data: a }, { data: o }] = await Promise.all([
      supabase.from("siem_sources").select("*").order("created_at", { ascending: false }),
      supabase.from("siem_alerts").select("*, siem_sources(name, vendor)").order("occurred_at", { ascending: false }).limit(50),
      supabase.from("operators").select("id, name").order("name"),
    ]);
    setSources(s ?? []); setAlerts(a ?? []); setOperators(o ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.name.trim()) return toast.error("Nom requis");
    const { error } = await supabase.from("siem_sources").insert({
      name: form.name, vendor: form.vendor as any,
      operator_id: form.operator_id || null,
      severity_threshold: form.severity_threshold as any,
      endpoint_url: form.endpoint_url || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Source créée");
    setOpen(false);
    setForm({ name: "", vendor: "wazuh", operator_id: "", severity_threshold: "high", endpoint_url: "" });
    load();
  }

  async function toggle(s: any) {
    await supabase.from("siem_sources").update({ enabled: !s.enabled }).eq("id", s.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette source et toutes ses alertes ?")) return;
    const { error } = await supabase.from("siem_sources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Source supprimée"); load();
  }

  async function rotate(id: string) {
    // simple client-side rotation via crypto
    const buf = new Uint8Array(24); crypto.getRandomValues(buf);
    const token = Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("siem_sources").update({ ingest_token: token }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Token régénéré"); load();
  }

  function copyEndpoint(s: any) {
    const url = `${ingestUrl}?source_id=${s.id}`;
    navigator.clipboard.writeText(`curl -X POST "${url}" \\\n  -H "x-ingest-token: ${s.ingest_token}" \\\n  -H "content-type: application/json" \\\n  -d '{"events":[{...}]}'`);
    toast.success("Commande cURL copiée");
  }

  if (!isAdmin) return <Card className="p-6 text-center text-muted-foreground">Accès réservé aux administrateurs.</Card>;

  return (
    <div className="space-y-6">
      <PageHeader title="Sources SIEM / EDR" description="Connecteurs entrants Wazuh, Splunk, Microsoft Sentinel, CrowdStrike. Les alertes au-delà du seuil créent automatiquement un incident." />

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
          <TabsTrigger value="alerts">Alertes récentes ({alerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Nouvelle source</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvelle source SIEM/EDR</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ex: Wazuh-DMZ-Conakry" /></div>
                  <div><Label>Connecteur</Label>
                    <Select value={form.vendor} onValueChange={v => setForm({ ...form, vendor: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(VENDOR_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Opérateur (optionnel)</Label>
                    <Select value={form.operator_id || "none"} onValueChange={v => setForm({ ...form, operator_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucun —</SelectItem>
                        {operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Seuil création incident</Label>
                    <Select value={form.severity_threshold} onValueChange={v => setForm({ ...form, severity_threshold: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (toutes)</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={create} className="w-full">Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sources.map(s => (
              <Card key={s.id} className="p-5 gradient-card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Radio className={`h-4 w-4 ${s.enabled ? "text-success" : "text-muted-foreground"}`} />
                      {s.name}
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{VENDOR_LABELS[s.vendor]}</Badge>
                      <Badge variant="secondary" className="text-[10px]">Seuil: {s.severity_threshold}</Badge>
                    </div>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={() => toggle(s)} />
                </div>
                <div className="text-xs space-y-1 text-muted-foreground mb-3">
                  <div>Événements: <span className="text-foreground font-medium">{s.events_count}</span></div>
                  <div>Dernier: {s.last_event_at ? format(new Date(s.last_event_at), "dd/MM HH:mm") : "—"}</div>
                </div>
                <div className="rounded bg-muted/40 p-2 text-[10px] font-mono break-all mb-3">
                  <div className="opacity-70">URL d'ingestion :</div>
                  <div>{ingestUrl}?source_id={s.id}</div>
                  <div className="opacity-70 mt-1">Token :</div>
                  <div>{s.ingest_token}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => copyEndpoint(s)}>
                    <Copy className="h-3 w-3 mr-1" />cURL
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rotate(s.id)}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
            {sources.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2">Aucune source configurée. Créez-en une pour recevoir des alertes.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-2">
          {alerts.map(a => (
            <Card key={a.id} className="p-3 flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${a.severity === "critical" ? "text-destructive" : a.severity === "high" ? "text-warning" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{a.title}</span>
                  <Badge variant="outline" className="text-[10px]">{a.severity}</Badge>
                  {a.incident_id && <Badge className="text-[10px] bg-success/20 text-success">→ Incident</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.siem_sources?.name} · {a.host || "—"} · {a.source_ip || "—"} · {format(new Date(a.occurred_at), "dd/MM HH:mm")}
                </div>
              </div>
            </Card>
          ))}
          {alerts.length === 0 && <Card className="p-8 text-center text-muted-foreground">Aucune alerte reçue.</Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
