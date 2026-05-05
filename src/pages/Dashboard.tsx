import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Clock, Activity, Building2, AlertTriangle, TrendingUp, Radar, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar } from "recharts";
import { incidentTypeLabel, severityColor, severityLabel } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function KpiCard({ icon: Icon, label, value, sub, accent, onClick }: any) {
  return (
    <Card
      onClick={onClick}
      className={`p-5 gradient-card border-border hover:border-primary/40 transition-smooth shadow-card ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-3xl font-bold mt-2">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [byType, setByType] = useState<any[]>([]);
  const [bySeverity, setBySeverity] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [intel, setIntel] = useState<any[]>([]);
  const [opCount, setOpCount] = useState(0);
  const [heatmap, setHeatmap] = useState<number[][]>(() => Array.from({ length: 7 }, () => Array(24).fill(0)));

  useEffect(() => { (async () => {
    const [{ data: kpis }, { data: ic }, { data: ops }, { data: it }] = await Promise.all([
      supabase.from("kpi_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(14),
      supabase.from("incidents").select("*").order("created_at", { ascending: false }),
      supabase.from("operators").select("compliance_score"),
      supabase.from("intel_items").select("*").order("published_at", { ascending: false }).limit(5),
    ]);
    if (kpis && kpis.length) setKpi(kpis[0]);
    setTrend((kpis ?? []).slice().reverse().map(k => ({
      date: format(new Date(k.snapshot_date), "dd/MM"),
      ouverts: k.incidents_open, résolus: k.incidents_resolved,
    })));
    const ti: Record<string, number> = {}; const sv: Record<string, number> = {};
    (ic ?? []).forEach((i: any) => {
      ti[i.type] = (ti[i.type] ?? 0) + 1;
      sv[i.severity] = (sv[i.severity] ?? 0) + 1;
    });
    setByType(Object.entries(ti).map(([k, v]) => ({ name: incidentTypeLabel[k as keyof typeof incidentTypeLabel] ?? k, value: v })));
    setBySeverity(Object.entries(sv).map(([k, v]) => ({ name: severityLabel[k as keyof typeof severityLabel] ?? k, value: v })));
    setRecent((ic ?? []).slice(0, 5));
    setIntel(it ?? []);
    setOpCount((ops ?? []).length);
    const hm = Array.from({ length: 7 }, () => Array(24).fill(0));
    (ic ?? []).forEach((i: any) => {
      const d = new Date(i.created_at);
      hm[(d.getDay() + 6) % 7][d.getHours()]++;
    });
    setHeatmap(hm);
    const avg = ops && ops.length ? Math.round(ops.reduce((a: number, b: any) => a + (b.compliance_score ?? 0), 0) / ops.length) : 0;
    if (kpis && kpis.length) setKpi((k: any) => ({ ...(k ?? kpis[0]), operator_compliance_avg: avg }));
  })(); }, []);

  const open = recent.filter(i => i.status !== "resolved" && i.status !== "closed").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord exécutif" description="Vue d'ensemble cybersécurité — ARPT Guinée / CERT National" />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={ShieldAlert} label="Incidents ouverts" value={kpi?.incidents_open ?? open} sub="Cumul actuel" accent="bg-destructive/10 text-destructive" onClick={() => navigate("/incidents")} />
        <KpiCard icon={Clock} label="MTTD" value={`${kpi?.mttd_minutes ?? 0} min`} sub="Délai de détection" accent="bg-secondary/10 text-secondary" onClick={() => navigate("/reports")} />
        <KpiCard icon={Activity} label="MTTR" value={`${Math.round((kpi?.mttr_minutes ?? 0) / 60)}h`} sub="Délai de remédiation" accent="bg-primary/10 text-primary" onClick={() => navigate("/reports")} />
        <KpiCard icon={Building2} label="Conformité opérateurs" value={`${kpi?.operator_compliance_avg ?? 0}%`} sub={`${opCount} entités`} accent="bg-primary/10 text-primary" onClick={() => navigate("/operators")} />
        <KpiCard icon={AlertTriangle} label="Niveau de menace" value={(kpi?.threat_level ?? "medium").toUpperCase()} sub="Évaluation CERT" accent="bg-warning/10 text-warning" onClick={() => navigate("/intel")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Tendance des incidents (14 j)</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="ouverts" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="résolus" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 gradient-card">
          <h3 className="font-semibold mb-4">Répartition par sévérité</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} isAnimationActive={false}>
                {bySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 gradient-card">
          <h3 className="font-semibold mb-4">Incidents par type</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byType}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 gradient-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Radar className="h-4 w-4 text-secondary" /> Threat Intelligence récent</h3>
          <div className="space-y-3">
            {intel.map(i => (
              <div key={i.id} onClick={() => navigate("/intel")} className="cursor-pointer flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth">
                <Badge className={severityColor[i.severity as keyof typeof severityColor]}>{severityLabel[i.severity as keyof typeof severityLabel]}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{i.title}</div>
                  <div className="text-xs text-muted-foreground">{i.region_impact} · {format(new Date(i.published_at), "dd MMM yyyy", { locale: fr })}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 gradient-card">
        <h3 className="font-semibold mb-4">Incidents récents</h3>
        <div className="space-y-2">
          {recent.map(i => (
            <div key={i.id} onClick={() => navigate(`/incidents/${i.id}`)} className="cursor-pointer flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
              <Badge className={severityColor[i.severity as keyof typeof severityColor]}>{severityLabel[i.severity as keyof typeof severityLabel]}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{i.title}</div>
                <div className="text-xs text-muted-foreground">{incidentTypeLabel[i.type as keyof typeof incidentTypeLabel]} · {i.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">{format(new Date(i.created_at), "dd/MM HH:mm")}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
