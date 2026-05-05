import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Building2, Users, Wrench, ListChecks, Download } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RadarShape, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = [
  { key: "Organisation", icon: Building2, color: "text-primary" },
  { key: "Humain", icon: Users, color: "text-secondary" },
  { key: "Outils", icon: Wrench, color: "text-warning" },
  { key: "Processus", icon: ListChecks, color: "text-success" },
];

const SCORE_LABEL: Record<number, string> = {
  0: "Inexistant", 1: "Implicite", 2: "Documenté", 3: "Audité", 4: "Optimisé",
};

export default function Maturity() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState("Organisation");
  const [drafts, setDrafts] = useState<Record<string, { score: number; evidence: string }>>({});

  async function load() {
    const { data } = await supabase.from("csirt_maturity").select("*").order("item_code");
    setItems(data ?? []);
    const d: Record<string, any> = {};
    (data ?? []).forEach((i: any) => { d[i.id] = { score: i.score, evidence: i.evidence ?? "" }; });
    setDrafts(d);
  }
  useEffect(() => { load(); }, []);

  const byCategory = useMemo(() => {
    const m: Record<string, any[]> = {};
    items.forEach(i => { (m[i.category] ??= []).push(i); });
    return m;
  }, [items]);

  const radarData = CATEGORIES.map(c => {
    const arr = byCategory[c.key] ?? [];
    const avg = arr.length ? arr.reduce((a, b) => a + b.score, 0) / arr.length : 0;
    return { category: c.key, score: Number(avg.toFixed(2)), fullMark: 4 };
  });

  const globalScore = items.length ? Math.round((items.reduce((a, b) => a + b.score, 0) / (items.length * 4)) * 100) : 0;

  async function save(id: string) {
    if (!user || !isAdmin) return;
    const d = drafts[id];
    const { error } = await supabase.from("csirt_maturity").update({
      score: d.score, evidence: d.evidence || null, assessed_by: user.id, assessed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Évaluation enregistrée");
    load();
  }

  function exportCsv() {
    const rows = [["Code","Catégorie","Item","Score","Niveau","Preuves"]];
    items.forEach(i => rows.push([i.item_code, i.category, i.title, String(i.score), SCORE_LABEL[i.score], i.evidence ?? ""]));
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `maturite-csirt-${format(new Date(),"yyyyMMdd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin) {
    return (
      <Card className="p-12 text-center">
        <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-semibold">Accès réservé aux administrateurs</h2>
        <p className="text-sm text-muted-foreground mt-1">Le module d'auto-évaluation SIM3 est restreint à l'administration du CERT.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maturité CERT — SIM3 light"
        description="Auto-évaluation selon le modèle SIM3 (ENISA / Trusted Introducer) — 24 items, 4 quadrants"
        action={<Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 gradient-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Score global de maturité</div>
              <div className="text-4xl font-bold mt-1">{globalScore}<span className="text-lg text-muted-foreground">/100</span></div>
            </div>
            <Award className={`h-10 w-10 ${globalScore >= 75 ? "text-success" : globalScore >= 50 ? "text-warning" : "text-destructive"}`} />
          </div>
          <Progress value={globalScore} className="h-2" />
          <div className="grid grid-cols-4 gap-2 mt-4">
            {CATEGORIES.map(c => {
              const arr = byCategory[c.key] ?? [];
              const avg = arr.length ? arr.reduce((a, b) => a + b.score, 0) / arr.length : 0;
              const Icon = c.icon;
              return (
                <div key={c.key} className="text-center p-2 rounded bg-muted/30">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${c.color}`} />
                  <div className="text-lg font-bold">{avg.toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground">{c.key}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 gradient-card">
          <h3 className="font-semibold mb-3">Radar de maturité</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <RadarShape name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          {CATEGORIES.map(c => <TabsTrigger key={c.key} value={c.key}>{c.key}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="grid gap-3">
        {(byCategory[tab] ?? []).map(i => {
          const d = drafts[i.id] ?? { score: i.score, evidence: i.evidence ?? "" };
          return (
            <Card key={i.id} className="p-4 gradient-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-[10px]">{i.item_code}</Badge>
                    <h4 className="font-medium text-sm">{i.title}</h4>
                  </div>
                  {i.description && <p className="text-xs text-muted-foreground">{i.description}</p>}
                </div>
                <Badge className={`text-[10px] ${d.score >= 3 ? "bg-success/15 text-success border-success/40" : d.score >= 2 ? "bg-warning/15 text-warning border-warning/40" : "bg-destructive/15 text-destructive border-destructive/40"}`}>
                  {d.score}/4 · {SCORE_LABEL[d.score]}
                </Badge>
              </div>
              <div className="mt-3">
                <Slider
                  value={[d.score]} min={0} max={4} step={1}
                  onValueChange={([v]) => setDrafts(prev => ({ ...prev, [i.id]: { ...prev[i.id], score: v } }))}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  {[0,1,2,3,4].map(n => <span key={n}>{SCORE_LABEL[n]}</span>)}
                </div>
              </div>
              <Textarea
                value={d.evidence}
                onChange={(e) => setDrafts(prev => ({ ...prev, [i.id]: { ...prev[i.id], evidence: e.target.value } }))}
                placeholder="Preuves, justifications, références documentaires…"
                rows={2}
                className="mt-3 text-xs"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={() => save(i.id)}>Enregistrer</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
