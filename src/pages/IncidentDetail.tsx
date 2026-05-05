import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Calendar, Building2, User, Lock, FileText, AlertTriangle, MessageSquare, Send, UserCheck, Clock, Trash2 } from "lucide-react";
import { incidentStatusLabel, incidentTypeLabel, severityColor, severityLabel, taskPriorityLabel, IncidentStatus, IncidentType, Severity, TaskPriority } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isAnalyst } = useAuth();
  const canEdit = isAdmin || isAnalyst;
  const [incident, setIncident] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [closer, setCloser] = useState<any>(null);
  const [assignee, setAssignee] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [attachUrl, setAttachUrl] = useState("");

  async function loadAll() {
    if (!id) return;
    const { data } = await supabase
      .from("incidents")
      .select("*, operators(name, type, region)")
      .eq("id", id).maybeSingle();
    setIncident(data);
    if (data?.created_by) {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.created_by).maybeSingle();
      setCreator(p);
    }
    if (data?.closed_by) {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.closed_by).maybeSingle();
      setCloser(p);
    }
    if (data?.assignee_id) {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.assignee_id).maybeSingle();
      setAssignee(p);
    } else setAssignee(null);
    const { data: c } = await supabase.from("incident_comments").select("*").eq("incident_id", id).order("created_at");
    if (c?.length) {
      const ids = [...new Set(c.map((x: any) => x.author_id))];
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      const m: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { m[p.id] = p.full_name; });
      setComments(c.map((x: any) => ({ ...x, author_name: m[x.author_id] ?? "Utilisateur" })));
    } else setComments([]);
    const { data: ppl } = await supabase.from("profiles").select("id,full_name").order("full_name");
    setPeople(ppl ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);

  async function postComment() {
    if (!user || !newComment.trim()) return;
    const { error } = await supabase.from("incident_comments").insert({
      incident_id: id, author_id: user.id, body: newComment.trim(),
      attachment_url: attachUrl.trim() || null,
    });
    if (error) return toast.error(error.message);
    setNewComment(""); setAttachUrl("");
    loadAll();
  }

  async function deleteComment(cid: string) {
    const { error } = await supabase.from("incident_comments").delete().eq("id", cid);
    if (error) return toast.error(error.message);
    loadAll();
  }

  async function setAssignment(uid: string) {
    const { error } = await supabase.from("incidents").update({ assignee_id: uid || null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Assignation mise à jour");
    loadAll();
  }

  async function setPriority(p: TaskPriority) {
    const slaH = { urgent: 4, high: 12, medium: 48, low: 168 }[p];
    const sla = new Date(Date.now() + slaH * 3600 * 1000).toISOString();
    const { error } = await supabase.from("incidents").update({ priority: p, sla_due_at: sla }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Priorité ${p} — SLA ${slaH}h`);
    loadAll();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!incident) return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => navigate("/incidents")}><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>
      <Card className="p-8 text-center text-muted-foreground">Incident introuvable</Card>
    </div>
  );

  const slaOverdue = incident.sla_due_at && new Date(incident.sla_due_at) < new Date() && incident.status !== "closed" && incident.status !== "resolved";

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate("/incidents")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Retour aux incidents
      </Button>

      <PageHeader title={incident.title} description={`Incident #${incident.id.slice(0, 8)}`} />

      <div className="flex flex-wrap gap-2">
        <Badge className={severityColor[incident.severity as Severity]}>
          <AlertTriangle className="h-3 w-3 mr-1" />{severityLabel[incident.severity as Severity]}
        </Badge>
        <Badge variant="outline">{incidentTypeLabel[incident.type as IncidentType]}</Badge>
        <Badge variant="secondary">{incidentStatusLabel[incident.status as IncidentStatus]}</Badge>
        <Badge variant="outline">Priorité : {taskPriorityLabel[(incident.priority ?? "medium") as TaskPriority]}</Badge>
        {slaOverdue && <Badge className="bg-destructive/20 text-destructive border border-destructive/40 animate-pulse"><Clock className="h-3 w-3 mr-1" />SLA dépassé</Badge>}
      </div>

      {canEdit && (
        <Card className="p-4 gradient-card">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1"><UserCheck className="h-3 w-3" />Assigné à</Label>
              <Select value={incident.assignee_id ?? "none"} onValueChange={v => setAssignment(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Personne" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {people.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Priorité (auto-définit le SLA)</Label>
              <Select value={incident.priority ?? "medium"} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent — SLA 4h</SelectItem>
                  <SelectItem value="high">Haute — SLA 12h</SelectItem>
                  <SelectItem value="medium">Moyenne — SLA 48h</SelectItem>
                  <SelectItem value="low">Basse — SLA 7j</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {incident.sla_due_at && (
            <div className="text-xs text-muted-foreground mt-3">
              <Clock className="h-3 w-3 inline mr-1" />
              Échéance SLA : {format(new Date(incident.sla_due_at), "dd/MM/yyyy HH:mm")} ({formatDistanceToNow(new Date(incident.sla_due_at), { addSuffix: true, locale: fr })})
            </div>
          )}
          {assignee && <div className="text-xs text-muted-foreground mt-1">Pris en charge par <span className="font-medium text-foreground">{assignee.full_name}</span></div>}
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 gradient-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Calendar className="h-3 w-3" />Détecté le</div>
          <div className="font-semibold">{format(new Date(incident.detected_at), "dd/MM/yyyy HH:mm")}</div>
        </Card>
        <Card className="p-4 gradient-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><User className="h-3 w-3" />Créé par</div>
          <div className="font-semibold">{creator?.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">{format(new Date(incident.created_at), "dd/MM/yyyy HH:mm")}</div>
        </Card>
        <Card className="p-4 gradient-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Building2 className="h-3 w-3" />Opérateur</div>
          <div className="font-semibold">{incident.operators?.name ?? "—"}</div>
          {incident.operators?.region && <div className="text-xs text-muted-foreground mt-1">{incident.operators.region}</div>}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Description</h2>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{incident.description || "Aucune description fournie."}</p>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" />Échanges & pièces jointes</h2>
        <div className="space-y-3 mb-4">
          {comments.length === 0 && <div className="text-sm text-muted-foreground">Aucun commentaire</div>}
          {comments.map(c => (
            <div key={c.id} className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold">{c.author_name}</div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "dd/MM HH:mm")}</div>
                  {(c.author_id === user?.id || isAdmin) && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteComment(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap">{c.body}</div>
              {c.attachment_url && (
                <a href={c.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 inline-block">
                  📎 Pièce jointe
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Ajouter un commentaire…" rows={2} />
          <div className="flex gap-2">
            <Input value={attachUrl} onChange={e => setAttachUrl(e.target.value)} placeholder="URL pièce jointe (optionnel)" />
            <Button onClick={postComment} disabled={!newComment.trim()}><Send className="h-4 w-4 mr-2" />Envoyer</Button>
          </div>
        </div>
      </Card>

      {incident.notes && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Notes du créateur</h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{incident.notes}</p>
        </Card>
      )}

      {incident.closed_at && (
        <Card className="p-6 border-l-4 border-primary">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Clôture</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Clôturé le: </span><span className="font-medium">{format(new Date(incident.closed_at), "dd/MM/yyyy HH:mm")}</span></div>
            {closer && <div><span className="text-muted-foreground">Par: </span><span className="font-medium">{closer.full_name}</span></div>}
            {incident.closure_comment && (
              <div className="mt-3 p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">Commentaire de clôture</div>
                <p className="whitespace-pre-wrap">{incident.closure_comment}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
