import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, Plus, Target, Trophy, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const KIND_LABEL: Record<string, string> = {
  tabletop: "Table-top", simulation: "Simulation",
  pra_test: "Test PRA/PCA", phishing_drill: "Drill phishing", red_team: "Red Team",
};
const STATUS_LABEL: Record<string, string> = {
  planned: "Planifié", running: "En cours", completed: "Terminé", cancelled: "Annulé",
};
const STATUS_COLOR: Record<string, string> = {
  planned: "bg-secondary/20 text-secondary border-secondary/40",
  running: "bg-warning/20 text-warning border-warning/40",
  completed: "bg-success/20 text-success border-success/40",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function Exercises() {
  const { user, isAdmin, isAnalyst } = useAuth();
  const canEdit = isAdmin || isAnalyst;
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", kind: "tabletop", status: "planned",
    scheduled_at: new Date().toISOString().slice(0, 16),
    duration_minutes: 60, scenario: "", objectives: "", lessons_learned: "", score: 0,
  });

  async function load() {
    const { data } = await supabase.from("exercises").select("*").order("scheduled_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function reset() {
    setForm({
      title: "", kind: "tabletop", status: "planned",
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration_minutes: 60, scenario: "", objectives: "", lessons_learned: "", score: 0,
    });
    setEditing(null);
  }

  async function save() {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Titre requis");
    const payload: any = {
      title: form.title.trim(), kind: form.kind as any, status: form.status as any,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes) || 60,
      scenario: form.scenario || null, objectives: form.objectives || null,
      lessons_learned: form.lessons_learned || null,
      score: form.status === "completed" ? Number(form.score) || 0 : null,
    };
    const op = editing
      ? supabase.from("exercises").update(payload).eq("id", editing.id)
      : supabase.from("exercises").insert({ ...payload, created_by: user.id });
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success(editing ? "Exercice modifié" : "Exercice planifié");
    setOpen(false); reset(); load();
  }

  function edit(it: any) {
    setEditing(it);
    setForm({
      title: it.title, kind: it.kind, status: it.status,
      scheduled_at: new Date(it.scheduled_at).toISOString().slice(0, 16),
      duration_minutes: it.duration_minutes ?? 60,
      scenario: it.scenario ?? "", objectives: it.objectives ?? "",
      lessons_learned: it.lessons_learned ?? "", score: it.score ?? 0,
    });
    setOpen(true);
  }

  async function remove(it: any) {
    if (!confirm(`Supprimer définitivement l'exercice « ${it.title} » ?`)) return;
    const { error } = await supabase.from("exercises").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success("Exercice supprimé"); load();
  }

  const completed = items.filter(i => i.status === "completed");
  const avgScore = completed.length
    ? Math.round(completed.reduce((a, b) => a + (b.score ?? 0), 0) / completed.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercices & PCA"
        description="Planification, simulations et retours d'expérience"
        action={canEdit && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Planifier</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvel exercice"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Simulation rançongiciel opérateur Orange" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(KIND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Statut</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date & heure</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                  <div><Label>Durée (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Scénario</Label><Textarea value={form.scenario} onChange={e => setForm({ ...form, scenario: e.target.value })} rows={3} /></div>
                <div><Label>Objectifs</Label><Textarea value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} rows={2} /></div>
                {form.status === "completed" && (
                  <>
                    <div><Label>Retour d'expérience (REX)</Label><Textarea value={form.lessons_learned} onChange={e => setForm({ ...form, lessons_learned: e.target.value })} rows={3} /></div>
                    <div><Label>Score (0-100)</Label><Input type="number" min={0} max={100} value={form.score} onChange={e => setForm({ ...form, score: Number(e.target.value) })} /></div>
                  </>
                )}
                <Button onClick={save} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 gradient-card"><div className="text-xs text-muted-foreground">Total exercices</div><div className="text-2xl font-bold mt-1">{items.length}</div></Card>
        <Card className="p-4 gradient-card"><div className="text-xs text-muted-foreground">Terminés</div><div className="text-2xl font-bold mt-1 text-success">{completed.length}</div></Card>
        <Card className="p-4 gradient-card"><div className="text-xs text-muted-foreground">Planifiés</div><div className="text-2xl font-bold mt-1 text-secondary">{items.filter(i => i.status === "planned").length}</div></Card>
        <Card className="p-4 gradient-card"><div className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" />Score moyen</div><div className="text-2xl font-bold mt-1">{avgScore}/100</div></Card>
      </div>

      <div className="grid gap-3">
        {items.map(it => (
          <Card key={it.id} className="p-4 gradient-card hover:border-primary/40 transition-smooth">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${it.status === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                {it.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold">{it.title}</h3>
                  <Badge variant="outline">{KIND_LABEL[it.kind]}</Badge>
                  <Badge className={STATUS_COLOR[it.status]}>{STATUS_LABEL[it.status]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <CalendarClock className="h-3 w-3" />
                  {format(new Date(it.scheduled_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })} · {it.duration_minutes} min
                </div>
                {it.scenario && <div className="text-sm text-muted-foreground line-clamp-2 mb-2">{it.scenario}</div>}
                {it.status === "completed" && it.score !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-semibold">{it.score}/100</span>
                    </div>
                    <Progress value={it.score} className="h-1.5" />
                  </div>
                )}
                {it.lessons_learned && (
                  <div className="mt-2 p-2 rounded bg-muted/30 text-xs">
                    <div className="font-semibold mb-0.5">REX :</div>{it.lessons_learned}
                  </div>
                )}
              </div>
              {canEdit && <Button size="sm" variant="ghost" onClick={() => edit(it)}>Modifier</Button>}
            </div>
          </Card>
        ))}
        {items.length === 0 && <div className="text-center py-12 text-muted-foreground">Aucun exercice planifié</div>}
      </div>
    </div>
  );
}
