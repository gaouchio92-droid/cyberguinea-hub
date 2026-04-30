import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Calendar, Building2, User, Lock, FileText, AlertTriangle } from "lucide-react";
import { incidentStatusLabel, incidentTypeLabel, severityColor, severityLabel, IncidentStatus, IncidentType, Severity } from "@/lib/types";
import { format } from "date-fns";

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [closer, setCloser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from("incidents")
        .select("*, operators(name, type, region, contact_email)")
        .eq("id", id)
        .maybeSingle();
      setIncident(data);
      if (data?.created_by) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.created_by).maybeSingle();
        setCreator(p);
      }
      if (data?.closed_by) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.closed_by).maybeSingle();
        setCloser(p);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!incident) return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => navigate("/incidents")}><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>
      <Card className="p-8 text-center text-muted-foreground">Incident introuvable</Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate("/incidents")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Retour aux incidents
      </Button>

      <PageHeader
        title={incident.title}
        description={`Incident #${incident.id.slice(0, 8)}`}
      />

      <div className="flex flex-wrap gap-2">
        <Badge className={severityColor[incident.severity as Severity]}>
          <AlertTriangle className="h-3 w-3 mr-1" />{severityLabel[incident.severity as Severity]}
        </Badge>
        <Badge variant="outline">{incidentTypeLabel[incident.type as IncidentType]}</Badge>
        <Badge variant="secondary">{incidentStatusLabel[incident.status as IncidentStatus]}</Badge>
      </div>

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

      {incident.notes && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Notes du créateur</h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{incident.notes}</p>
        </Card>
      )}

      {incident.operators && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Opérateur concerné</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Nom: </span><span className="font-medium">{incident.operators.name}</span></div>
            {incident.operators.type && <div><span className="text-muted-foreground">Type: </span><span className="font-medium">{incident.operators.type}</span></div>}
            {incident.operators.region && <div><span className="text-muted-foreground">Région: </span><span className="font-medium">{incident.operators.region}</span></div>}
            {incident.operators.contact_email && <div><span className="text-muted-foreground">Contact: </span><span className="font-medium">{incident.operators.contact_email}</span></div>}
          </div>
        </Card>
      )}

      {incident.resolved_at && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Résolution</h2>
          <div className="text-sm">Résolu le <span className="font-medium">{format(new Date(incident.resolved_at), "dd/MM/yyyy HH:mm")}</span></div>
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

      {Array.isArray(incident.timeline) && incident.timeline.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Timeline</h2>
          <ul className="space-y-2 text-sm">
            {incident.timeline.map((t: any, idx: number) => (
              <li key={idx} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{typeof t === "string" ? t : JSON.stringify(t)}</span></li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
