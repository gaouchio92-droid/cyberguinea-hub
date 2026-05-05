import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Phone, Mail, Trash2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Contact = {
  id: string; full_name: string; role: string | null; email: string | null;
  phone: string | null; on_call_24_7: boolean; preferred_channel: string | null;
  pgp_fingerprint: string | null; languages: string[]; notes: string | null;
};

const empty = {
  full_name: "", role: "", email: "", phone: "",
  on_call_24_7: false, preferred_channel: "phone",
  pgp_fingerprint: "", languages: "fr", notes: "",
};

export function OperatorContactsDialog({
  operator, open, onOpenChange,
}: { operator: { id: string; name: string } | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { isAdmin, isAnalyst } = useAuth();
  const canEdit = isAdmin || isAnalyst;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!operator) return;
    const { data } = await supabase
      .from("operator_contacts").select("*")
      .eq("operator_id", operator.id)
      .order("on_call_24_7", { ascending: false });
    setContacts((data ?? []) as any);
  }
  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, operator?.id]);

  async function add() {
    if (!operator || !form.full_name.trim()) return toast.error("Nom requis");
    const { error } = await supabase.from("operator_contacts").insert({
      operator_id: operator.id,
      full_name: form.full_name.trim(),
      role: form.role || null,
      email: form.email || null,
      phone: form.phone || null,
      on_call_24_7: form.on_call_24_7,
      preferred_channel: form.preferred_channel || null,
      pgp_fingerprint: form.pgp_fingerprint || null,
      languages: form.languages.split(",").map(s => s.trim()).filter(Boolean),
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Contact ajouté");
    setForm(empty); setAdding(false); load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    const { error } = await supabase.from("operator_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé"); load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Carnet d'astreinte — {operator?.name}
          </DialogTitle>
        </DialogHeader>

        {!canEdit && (
          <div className="text-xs text-muted-foreground p-2 rounded bg-muted/40">
            Lecture seule — réservé admin/analyste.
          </div>
        )}

        <div className="space-y-2">
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Aucun contact enregistré.</p>
          )}
          {contacts.map(c => (
            <Card key={c.id} className="p-3 gradient-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.full_name}</span>
                    {c.role && <Badge variant="outline" className="text-[10px]">{c.role}</Badge>}
                    {c.on_call_24_7 && <Badge className="bg-destructive text-destructive-foreground text-[10px]">24/7</Badge>}
                    {c.languages?.map(l => <Badge key={l} variant="secondary" className="text-[10px]">{l.toUpperCase()}</Badge>)}
                  </div>
                  <div className="text-xs mt-1 space-y-0.5">
                    {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /><a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a></div>}
                    {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /><a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a></div>}
                    {c.pgp_fingerprint && <div className="font-mono text-[10px] text-muted-foreground">PGP: {c.pgp_fingerprint}</div>}
                    {c.notes && <div className="text-muted-foreground">{c.notes}</div>}
                  </div>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {canEdit && (
          <div className="border-t pt-3 mt-2">
            {!adding ? (
              <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4 mr-1" />Ajouter un contact
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Nom complet *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                  <div><Label>Rôle</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="RSSI, NOC..." /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Canal préféré</Label><Input value={form.preferred_channel} onChange={e => setForm({ ...form, preferred_channel: e.target.value })} /></div>
                  <div><Label>Langues (csv)</Label><Input value={form.languages} onChange={e => setForm({ ...form, languages: e.target.value })} placeholder="fr,en" /></div>
                </div>
                <div><Label>Empreinte PGP</Label><Input value={form.pgp_fingerprint} onChange={e => setForm({ ...form, pgp_fingerprint: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.on_call_24_7} onCheckedChange={v => setForm({ ...form, on_call_24_7: v })} />
                  <Label className="cursor-pointer">Astreinte 24/7</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setAdding(false); setForm(empty); }}>Annuler</Button>
                  <Button className="flex-1" onClick={add}>Enregistrer</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
