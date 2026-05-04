import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Activity, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusLabel: Record<string, string> = {
  planned: "Planifiée", ongoing: "En cours", paused: "En pause", completed: "Terminée", cancelled: "Annulée",
};
const statusColor: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  ongoing: "bg-secondary/20 text-secondary border border-secondary/40",
  paused: "bg-warning/20 text-warning border border-warning/40",
  completed: "bg-primary/20 text-primary border border-primary/40",
  cancelled: "bg-destructive/20 text-destructive border border-destructive/40",
};
const typeLabel: Record<string, string> = {
  investigation: "Investigation", response: "Réponse", audit: "Audit",
  monitoring: "Surveillance", exercise: "Exercice", other: "Autre",
};

export default function Operations() {
  const { user, isAdmin, isAnalyst } = useAuth();
  const canWrite = isAdmin || isAnalyst;
  const [items, setItems] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", type: "investigation", status: "planned",
    priority: "medium", operator_id: "", started_at: "", ended_at: "",
  });

  async function load() {
    const { data } = await supabase.from("operations").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    const { data: ops } = await supabase.from("operators").select("id,name").order("name");
    setOperators(ops ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.title.trim()) return toast.error("Titre requis");
    const payload: any = {
      title: form.title, description: form.description || null,
      type: form.type, status: form.status, priority: form.priority,
      operator_id: form.operator_id || null,
      started_at: form.started_at || null, ended_at: form.ended_at || null,
      owner_id: user?.id, created_by: user?.id,
    };
    const { error } = await supabase.from("operations").insert(payload);
    if (error) return toast.error(error.message);
    await supabase.from("system_logs").insert({
      actor_id: user?.id, actor_email: user?.email, action: "operation.create", target: form.title, level: "info",
    });
    toast.success("Opération créée");
    setOpen(false);
    setForm({ title: "", description: "", type: "investigation", status: "planned", priority: "medium", operator_id: "", started_at: "", ended_at: "" });
    load();
  }

  async function updateStatus(id: string, status: string, title: string) {
    const { error } = await supabase.from("operations").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("system_logs").insert({
      actor_id: user?.id, actor_email: user?.email, action: `operation.status.${status}`, target: title, level: "info",
    });
    load();
  }

  async function remove(id: string, title: string) {
    if (!confirm("Supprimer cette opération ?")) return;
    const { error } = await supabase.from("operations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("system_logs").insert({
      actor_id: user?.id, actor_email: user?.email, action: "operation.delete", target: title, level: "warning",
    });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Opérations"
        description="Suivi des opérations cyber : investigations, réponses, audits et exercices"
        action={canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nouvelle opération</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Créer une opération</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(typeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Priorité</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem><SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Haute</SelectItem><SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Opérateur lié</Label>
                  <Select value={form.operator_id} onValueChange={v => setForm({ ...form, operator_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>{operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Début</Label><Input type="datetime-local" value={form.started_at} onChange={e => setForm({ ...form, started_at: e.target.value })} /></div>
                  <div><Label>Fin prévue</Label><Input type="datetime-local" value={form.ended_at} onChange={e => setForm({ ...form, ended_at: e.target.value })} /></div>
                </div>
                <Button onClick={save} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid gap-4">
        {items.length === 0 && (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            Aucune opération. {canWrite && "Créez-en une pour commencer."}
          </CardContent></Card>
        )}
        {items.map(op => (
          <Card key={op.id} className="glass">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg">{op.title}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={statusColor[op.status]}>{statusLabel[op.status]}</Badge>
                  <Badge variant="outline">{typeLabel[op.type]}</Badge>
                  <Badge variant="secondary">{op.priority}</Badge>
                </div>
              </div>
              {isAdmin && (
                <Button size="icon" variant="ghost" onClick={() => remove(op.id, op.title)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {op.description && <p className="text-sm text-muted-foreground">{op.description}</p>}
              <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                <span>Créée : {format(new Date(op.created_at), "dd/MM/yyyy HH:mm")}</span>
                {op.started_at && <span>Début : {format(new Date(op.started_at), "dd/MM/yyyy HH:mm")}</span>}
                {op.ended_at && <span>Fin : {format(new Date(op.ended_at), "dd/MM/yyyy HH:mm")}</span>}
              </div>
              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  {["planned", "ongoing", "paused", "completed", "cancelled"].filter(s => s !== op.status).map(s => (
                    <Button key={s} size="sm" variant="outline" onClick={() => updateStatus(op.id, s, op.title)}>
                      → {statusLabel[s]}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
