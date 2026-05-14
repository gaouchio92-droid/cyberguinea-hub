import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, Clock, Activity, Building2, AlertTriangle, TrendingUp, Radar, ShieldCheck,
  FileText, Crosshair, Target, Map as MapIcon, Sparkles, ArrowRight, Calendar, Users,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { incidentTypeLabel, severityColor, severityLabel } from "@/lib/types";
import { format, formatDistanceToNow, isAfter, subDays } from "date-fns";
import { fr } from "date-fns/locale";

function KpiCard({ icon: Icon, label, value, sub, accent, onClick, trend }: any) {
  return (
    <Card
      onClick={onClick}
      className={`p-4 gradient-card border-border hover:border-primary/40 hover:shadow-glow transition-smooth shadow-card ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</div>
          <div className="text-2xl font-bold mt-1.5 leading-tight">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
          {trend !== undefined && (
            <div className={`text-[10px] mt-1 font-medium ${trend >= 0 ? "text-destructive" : "text-emerald-500"}`}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% / 7j
            </div>
          )}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
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
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [topOperators, setTopOperators] = useState<any[]>([]);
  const [counts, setCounts] = useState({ ops: 0, iocs: 0, bulletins: 0, fiber: 0, markers: 0, users: 0, incidents7: 0, incidentsPrev7: 0 });
  const [heatmap, setHeatmap] = useState<number[][]>(() => Array.from({ length: 7 }, () => Array(24).fill(0)));

  useEffect(() => { (async () => {
    const since7 = subDays(new Date(), 7).toISOString();
    const since14 = subDays(new Date(), 14).toISOString();
    const [
      { data: kpis }, { data: ic }, { data: ops }, { data: it },
      { data: bls }, { data: exs }, { data: opns },
      { count: iocsCount }, { count: bulletinsCount }, { count: fiberCount },
      { count: markersCount }, { count: usersCount },
    ] = await Promise.all([
      supabase.from("kpi_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(14),
      supabase.from("incidents").select("*").order("created_at", { ascending: false }),
      supabase.from("operators").select("id,name,compliance_score,region"),
      supabase.from("intel_items").select("*").order("published_at", { ascending: false }).limit(5),
      supabase.from("bulletins").select("id,title,reference,type,tlp,status,published_at,created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("exercises").select("id,title,kind,status,scheduled_at").gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(5),
      supabase.from("operations").select("id,title,type,status,priority,started_at").in("status", ["planned","ongoing","in_progress"] as any).order("created_at", { ascending: false }).limit(5),
      supabase.from("iocs").select("id", { count: "exact", head: true }),
      supabase.from("bulletins").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("fiber_links").select("id", { count: "exact", head: true }),
      supabase.from("map_markers").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    if (kpis && kpis.length) setKpi(kpis[0]);
    const threatScore: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    setTrend((kpis ?? []).slice().reverse().map(k => ({
      date: format(new Date(k.snapshot_date), "dd/MM"),
      ouverts: k.incidents_open,
      résolus: k.incidents_resolved,
      volume: (k.incidents_open ?? 0) + (k.incidents_resolved ?? 0),
      mttd: k.mttd_minutes ?? 0,
      mttr: Math.round((k.mttr_minutes ?? 0) / 60),
      menace: threatScore[k.threat_level ?? "medium"] ?? 2,
    })));

    const ti: Record<string, number> = {}; const sv: Record<string, number> = {};
    const opIncidents: Record<string, number> = {};
    let inc7 = 0, incPrev7 = 0;
    (ic ?? []).forEach((i: any) => {
      ti[i.type] = (ti[i.type] ?? 0) + 1;
      sv[i.severity] = (sv[i.severity] ?? 0) + 1;
      if (i.operator_id) opIncidents[i.operator_id] = (opIncidents[i.operator_id] ?? 0) + 1;
      const d = new Date(i.created_at);
      if (isAfter(d, new Date(since7))) inc7++;
      else if (isAfter(d, new Date(since14))) incPrev7++;
    });
    setByType(Object.entries(ti).map(([k, v]) => ({ name: incidentTypeLabel[k as keyof typeof incidentTypeLabel] ?? k, value: v })));
    setBySeverity(Object.entries(sv).map(([k, v]) => ({ name: severityLabel[k as keyof typeof severityLabel] ?? k, value: v })));
    setRecent((ic ?? []).slice(0, 5));
    setIntel(it ?? []);
    setBulletins(bls ?? []);
    setExercises(exs ?? []);
    setOperations(opns ?? []);

    const opMap = new Map((ops ?? []).map((o: any) => [o.id, o]));
    setTopOperators(
      Object.entries(opIncidents)
        .map(([id, n]) => ({ id, name: (opMap.get(id) as any)?.name ?? "—", region: (opMap.get(id) as any)?.region, count: n }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );

    const hm = Array.from({ length: 7 }, () => Array(24).fill(0));
    (ic ?? []).forEach((i: any) => {
      const d = new Date(i.created_at);
      hm[(d.getDay() + 6) % 7][d.getHours()]++;
    });
    setHeatmap(hm);

    const avg = ops && ops.length ? Math.round(ops.reduce((a: number, b: any) => a + (b.compliance_score ?? 0), 0) / ops.length) : 0;
    if (kpis && kpis.length) setKpi((k: any) => ({ ...(k ?? kpis[0]), operator_compliance_avg: avg }));

    setCounts({
      ops: (ops ?? []).length,
      iocs: iocsCount ?? 0,
      bulletins: bulletinsCount ?? 0,
      fiber: fiberCount ?? 0,
      markers: markersCount ?? 0,
      users: usersCount ?? 0,
      incidents7: inc7,
      incidentsPrev7: incPrev7,
    });
  })(); }, []);

  const [openCount, setOpenCount] = useState(0);
  useEffect(() => {
    supabase.from("incidents").select("id", { count: "exact", head: true })
      .not("status", "in", "(resolved,closed)")
      .then(({ count }) => setOpenCount(count ?? 0));
  }, []);

  const incidentTrendPct = useMemo(() => {
    if (counts.incidentsPrev7 === 0) return counts.incidents7 > 0 ? 100 : 0;
    return Math.round(((counts.incidents7 - counts.incidentsPrev7) / counts.incidentsPrev7) * 100);
  }, [counts]);

  const tlpColor: Record<string, string> = {
    red: "bg-destructive/15 text-destructive border-destructive/30",
    amber: "bg-warning/15 text-warning border-warning/30",
    green: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    clear: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord exécutif"
        description={`Vue d'ensemble cybersécurité — ARPT Guinée / CERT National · ${format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}`}
      />

      {/* KPIs ligne 1 — opérationnel */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={ShieldAlert} label="Incidents ouverts" value={kpi?.incidents_open ?? openCount} sub={`${counts.incidents7} sur 7 j`} trend={incidentTrendPct} accent="bg-destructive/10 text-destructive" onClick={() => navigate("/incidents")} />
        <KpiCard icon={Clock} label="MTTD" value={`${kpi?.mttd_minutes ?? 0} min`} sub="Détection" accent="bg-secondary/10 text-secondary" onClick={() => navigate("/reports")} />
        <KpiCard icon={Activity} label="MTTR" value={`${Math.round((kpi?.mttr_minutes ?? 0) / 60)}h`} sub="Remédiation" accent="bg-primary/10 text-primary" onClick={() => navigate("/reports")} />
        <KpiCard icon={Building2} label="Conformité" value={`${kpi?.operator_compliance_avg ?? 0}%`} sub={`${counts.ops} opérateurs`} accent="bg-primary/10 text-primary" onClick={() => navigate("/operators")} />
        <KpiCard icon={AlertTriangle} label="Niveau menace" value={(kpi?.threat_level ?? "medium").toUpperCase()} sub="Évaluation CERT" accent="bg-warning/10 text-warning" onClick={() => navigate("/intel")} />
      </div>

      {/* KPIs ligne 2 — production */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={FileText} label="Bulletins publiés" value={counts.bulletins} sub="CERT-GN" accent="bg-secondary/10 text-secondary" onClick={() => navigate("/bulletins")} />
        <KpiCard icon={Crosshair} label="IoCs en base" value={counts.iocs} sub="MISP / STIX" accent="bg-primary/10 text-primary" onClick={() => navigate("/iocs")} />
        <KpiCard icon={Target} label="Exercices à venir" value={exercises.length} sub="PCA / Tabletop" accent="bg-warning/10 text-warning" onClick={() => navigate("/exercises")} />
        <KpiCard icon={MapIcon} label="Cartographie" value={`${counts.fiber}+${counts.markers}`} sub="Liens fibre · signalements" accent="bg-secondary/10 text-secondary" onClick={() => navigate("/map")} />
        <KpiCard icon={Users} label="Utilisateurs" value={counts.users} sub="Comptes actifs" accent="bg-primary/10 text-primary" onClick={() => navigate("/users")} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Tendance des incidents (14 j)</h3>
            <Badge variant="outline" className="text-[10px]">snapshots KPI</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gOuv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Area type="monotone" dataKey="ouverts" stroke="hsl(var(--destructive))" fill="url(#gOuv)" strokeWidth={2} />
              <Area type="monotone" dataKey="résolus" stroke="hsl(var(--primary))" fill="url(#gRes)" strokeWidth={2} />
            </AreaChart>
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
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={60} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 gradient-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Top opérateurs impactés</h3>
          {topOperators.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Aucun incident rattaché à un opérateur</div>
          ) : (
            <div className="space-y-2">
              {topOperators.map((o, i) => {
                const max = topOperators[0].count;
                return (
                  <div key={o.id} onClick={() => navigate("/operators")} className="cursor-pointer group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                        <span className="font-medium truncate group-hover:text-primary transition-smooth">{o.name}</span>
                        {o.region && <span className="text-[10px] text-muted-foreground">· {o.region}</span>}
                      </div>
                      <span className="font-semibold text-destructive">{o.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-destructive to-warning" style={{ width: `${(o.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Renseignement & production */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 gradient-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Radar className="h-4 w-4 text-secondary" /> Threat Intel</h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/intel")}>Voir <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
          <div className="space-y-2">
            {intel.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">Aucun élément récent</div>}
            {intel.map(i => (
              <div key={i.id} onClick={() => navigate("/intel")} className="cursor-pointer flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth">
                <Badge className={`${severityColor[i.severity as keyof typeof severityColor]} shrink-0 text-[9px]`}>{severityLabel[i.severity as keyof typeof severityLabel]}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">{i.title}</div>
                  <div className="text-[10px] text-muted-foreground">{i.region_impact || "—"} · {formatDistanceToNow(new Date(i.published_at), { locale: fr, addSuffix: true })}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 gradient-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Bulletins récents</h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/bulletins")}>Voir <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
          <div className="space-y-2">
            {bulletins.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">Aucun bulletin</div>}
            {bulletins.map(b => (
              <div key={b.id} onClick={() => navigate("/bulletins")} className="cursor-pointer flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth">
                <Badge variant="outline" className={`${tlpColor[b.tlp] ?? ""} shrink-0 text-[9px] uppercase`}>TLP:{b.tlp}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">{b.title}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{b.reference} · {b.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 gradient-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-warning" /> Exercices & opérations</h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/exercises")}>Voir <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
          <div className="space-y-2">
            {exercises.length === 0 && operations.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">Aucune activité planifiée</div>
            )}
            {exercises.map(e => (
              <div key={e.id} onClick={() => navigate("/exercises")} className="cursor-pointer flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth">
                <Target className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">{e.title}</div>
                  <div className="text-[10px] text-muted-foreground">{e.kind} · {format(new Date(e.scheduled_at), "dd MMM HH:mm", { locale: fr })}</div>
                </div>
              </div>
            ))}
            {operations.map(o => (
              <div key={o.id} onClick={() => navigate("/operations")} className="cursor-pointer flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-smooth">
                <Activity className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">{o.title}</div>
                  <div className="text-[10px] text-muted-foreground">{o.type} · {o.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="p-5 gradient-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Heatmap incidents (jour × heure)</h3>
        <div className="overflow-x-auto">
          <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "60px repeat(24, 1fr)" }}>
            <div />
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="text-[9px] text-center text-muted-foreground">{h}</div>
            ))}
            {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map((d, di) => {
              const max = Math.max(1, ...heatmap.flat());
              return (
                <div key={d} className="contents">
                  <div className="text-[10px] text-muted-foreground pr-2 self-center">{d}</div>
                  {heatmap[di].map((v, hi) => {
                    const intensity = v / max;
                    return (
                      <div key={hi} title={`${d} ${hi}h : ${v}`}
                        className="h-5 rounded-sm border border-border/40"
                        style={{ background: v === 0 ? "hsl(var(--muted) / 0.2)" : `hsl(var(--destructive) / ${0.2 + intensity * 0.8})` }} />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Incidents récents + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 gradient-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Incidents récents</h3>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/incidents")}>Tous <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
          <div className="space-y-2">
            {recent.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Aucun incident</div>}
            {recent.map(i => (
              <div key={i.id} onClick={() => navigate(`/incidents/${i.id}`)} className="cursor-pointer flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                <Badge className={severityColor[i.severity as keyof typeof severityColor]}>{severityLabel[i.severity as keyof typeof severityLabel]}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{i.title}</div>
                  <div className="text-xs text-muted-foreground">{incidentTypeLabel[i.type as keyof typeof incidentTypeLabel]} · {i.status}</div>
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">{format(new Date(i.created_at), "dd/MM HH:mm")}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 gradient-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-secondary" /> Actions rapides</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/incidents")}>
              <ShieldAlert className="h-4 w-4" /><span className="text-[11px]">Incident</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/bulletins")}>
              <FileText className="h-4 w-4" /><span className="text-[11px]">Bulletin</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/iocs")}>
              <Crosshair className="h-4 w-4" /><span className="text-[11px]">IoC</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/exercises")}>
              <Target className="h-4 w-4" /><span className="text-[11px]">Exercice</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/map")}>
              <MapIcon className="h-4 w-4" /><span className="text-[11px]">Carte</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/assistant")}>
              <Sparkles className="h-4 w-4" /><span className="text-[11px]">Assistant</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
