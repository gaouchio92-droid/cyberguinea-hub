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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { taskPriorityLabel, taskStatusLabel, TaskPriority, TaskStatus } from "@/lib/types";
import { toast } from "sonner";
import { format } from "date-fns";

const cols: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "À faire", color: "border-muted-foreground/30" },
  { key: "in_progress", label: "En cours", color: "border-secondary/40" },
  { key: "done", label: "Terminé", color: "border-primary/40" },
];

const prioColor: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary/20 text-secondary",
  high: "bg-warning/20 text-warning",
  urgent: "bg-destructive/20 text-destructive",
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as TaskPriority, due_date: "", category: "" });

  async function load() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.title.trim() || !user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: form.title, description: form.description || null,
      priority: form.priority, category: form.category || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Tâche créée");
    setOpen(false);
    setForm({ title: "", description: "", priority: "medium", due_date: "", category: "" });
    load();
  }

  async function move(id: string, status: TaskStatus) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning & Tâches"
        description="Organisez votre journée d'analyste cybersécurité"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouvelle tâche</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Priorité</Label>
                    <Select value={form.priority} onValueChange={(v: TaskPriority) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(taskPriorityLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Échéance</Label><Input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
                <div><Label>Catégorie</Label><Input placeholder="Ex: SOC, Audit, Reporting" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                <Button onClick={create} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map(col => (
          <div key={col.key} className={`rounded-xl border-2 ${col.color} bg-card/40 p-3 min-h-[400px]`}>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-semibold text-sm">{col.label}</h3>
              <Badge variant="outline">{tasks.filter(t => t.status === col.key).length}</Badge>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => t.status === col.key).map(t => (
                <Card key={t.id} className="p-3 gradient-card hover:border-primary/30 transition-smooth group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm">{t.title}</div>
                    <Badge className={prioColor[t.priority as TaskPriority] + " text-[10px] shrink-0"}>{taskPriorityLabel[t.priority as TaskPriority]}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                  {t.due_date && <div className="text-[10px] text-muted-foreground mt-2">📅 {format(new Date(t.due_date), "dd/MM HH:mm")}</div>}
                  {t.category && <Badge variant="outline" className="text-[10px] mt-2">{t.category}</Badge>}
                  <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-smooth">
                    {cols.filter(c => c.key !== t.status).map(c => (
                      <Button key={c.key} size="sm" variant="ghost" className="h-6 text-[10px] flex-1" onClick={() => move(t.id, c.key)}>→ {c.label}</Button>
                    ))}
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => remove(t.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </Card>
              ))}
              {tasks.filter(t => t.status === col.key).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 opacity-30" />
                  Aucune tâche
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
