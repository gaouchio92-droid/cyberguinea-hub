import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { operatorSchema, firstZodError } from "@/lib/validation";

export default function OperatorForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const { isAdmin, isAnalyst } = useAuth();
  const canWrite = isAdmin || isAnalyst;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "telecom", region: "",
    contact_email: "", contact_phone: "",
    latitude: 9.6412, longitude: -13.5784,
    notes: "", source_url: "",
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data, error } = await supabase.from("operators").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Opérateur introuvable"); nav("/operators"); return; }
      setForm({
        name: data.name ?? "", type: data.type ?? "telecom", region: data.region ?? "",
        contact_email: data.contact_email ?? "", contact_phone: data.contact_phone ?? "",
        latitude: data.latitude ?? 9.6412, longitude: data.longitude ?? -13.5784,
        notes: data.notes ?? "", source_url: data.source_url ?? "",
      });
      setLoading(false);
    })();
  }, [id, isEdit, nav]);

  async function save() {
    const parsed = operatorSchema.safeParse({
      name: form.name, type: form.type, region: form.region,
      contact_email: form.contact_email, contact_phone: form.contact_phone,
      latitude: Number(form.latitude), longitude: Number(form.longitude),
    });
    if (!parsed.success) return toast.error(firstZodError(parsed.error));
    setSaving(true);
    const payload = {
      ...parsed.data,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      region: parsed.data.region || null,
      notes: form.notes || null,
      source_url: form.source_url || null,
    };
    const { error } = isEdit
      ? await supabase.from("operators").update(payload).eq("id", id)
      : await supabase.from("operators").insert(payload as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Opérateur modifié" : "Opérateur créé");
    nav("/operators");
  }

  async function remove() {
    if (!confirm("Supprimer définitivement cet opérateur ?")) return;
    const { error } = await supabase.from("operators").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Opérateur supprimé");
    nav("/operators");
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => nav("/operators")}><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
      <PageHeader title={isEdit ? "Modifier l'opérateur" : "Nouvel opérateur"} description="Fiche complète : identification, géolocalisation et contacts." />

      <Card className="p-6 space-y-4 gradient-card">
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={!canWrite} /></div>
          <div><Label>Type *</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })} disabled={!canWrite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="telecom">Télécom</SelectItem>
                <SelectItem value="isp">FAI / ISP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Région</Label><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} disabled={!canWrite} /></div>
          <div><Label>URL source</Label><Input value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://…" disabled={!canWrite} /></div>
          <div><Label>Email contact</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} disabled={!canWrite} /></div>
          <div><Label>Téléphone</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} disabled={!canWrite} /></div>
          <div><Label>Latitude *</Label><Input type="number" step="0.0001" value={form.latitude} onChange={e => setForm({ ...form, latitude: +e.target.value })} disabled={!canWrite} /></div>
          <div><Label>Longitude *</Label><Input type="number" step="0.0001" value={form.longitude} onChange={e => setForm({ ...form, longitude: +e.target.value })} disabled={!canWrite} /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4} disabled={!canWrite} /></div>

        {canWrite && (
          <div className="flex gap-2 justify-between pt-3 border-t">
            <div>
              {isEdit && isAdmin && (
                <Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1" />Supprimer</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => nav("/operators")}>Annuler</Button>
              <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "..." : "Enregistrer"}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
