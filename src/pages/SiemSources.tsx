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
import { Plus, Trash2, Copy, Radio, AlertTriangle, RefreshCw, PlayCircle } from "lucide-react";
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

  function samplePayload(vendor: string, severity: string) {
    switch (vendor) {
      case "wazuh": {
        const lvl = severity === "critical" ? 14 : severity === "high" ? 11 : severity === "medium" ? 7 : 3;
        return { id: `test-${Date.now()}`, timestamp: new Date().toISOString(), rule: { level: lvl, description: `Test Wazuh ${severity}`, groups: ["test", "simulated"] }, agent: { name: "test-agent-01" }, data: { srcip: "10.0.0.42" }, full_log: "Simulated test event from Lovable" };
      }
      case "splunk":
        return { sid: `test-${Date.now()}`, result: { search_name: `Test Splunk ${severity}`, severity, _raw: "Simulated Splunk alert", host: "test-host", src_ip: "10.0.0.43", _time: new Date().toISOString() } };
      case "sentinel":
        return { id: `test-${Date.now()}`, properties: { incidentNumber: 9999, title: `Test Sentinel ${severity}`, description: "Simulated Sentinel incident", severity: severity.charAt(0).toUpperCase() + severity.slice(1), createdTimeUtc: new Date().toISOString(), entities: [{ HostName: "test-host" }, { Address: "10.0.0.44" }] } };
      case "crowdstrike": {
        const n = severity === "critical" ? 5 : severity === "high" ? 3 : severity === "medium" ? 2 : 1;
        return { detection_id: `test-${Date.now()}`, name: `Test CrowdStrike ${severity}`, severity: n, tactic: "Execution", description: "Simulated Falcon detection", device: { hostname: "test-host" }, network: { local_ip: "10.0.0.45" }, timestamp: new Date().toISOString() };
      }
      default:
        return { id: `test-${Date.now()}`, title: `Test ${severity}`, description: "Simulated event", severity, host: "test-host", source_ip: "10.0.0.46", timestamp: new Date().toISOString() };
    }
  }

  async function testSource(s: any) {
    const sev = s.severity_threshold;
    const payload = samplePayload(s.vendor, sev);
    toast.loading("Envoi du payload de test...", { id: `test-${s.id}` });
    try {
      const res = await fetch(`${ingestUrl}?source_id=${s.id}`, {
        method: "POST",
        headers: { "x-ingest-token": s.ingest_token, "content-type": "application/json" },
        body: JSON.stringify({ events: [payload] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const alert = json.alerts?.[0];
      if (alert?.incident_id) {
        toast.success(`Alerte ingérée + incident créé (sév: ${alert.severity})`, { id: `test-${s.id}` });
      } else {
        toast.success(`Alerte ingérée (sév: ${alert?.severity}) — pas d'incident (sous le seuil)`, { id: `test-${s.id}` });
      }
      load();
    } catch (e: any) {
      toast.error(`Échec du test : ${e.message}`, { id: `test-${s.id}` });
    }
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
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="default" className="flex-1" onClick={() => testSource(s)} disabled={!s.enabled}>
                    <PlayCircle className="h-3 w-3 mr-1" />Tester
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyEndpoint(s)}>
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
