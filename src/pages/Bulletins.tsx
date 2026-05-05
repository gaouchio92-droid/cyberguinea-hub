import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TLPBadge, TLP_OPTIONS, TLP } from "@/components/TLPBadge";
import { Plus, FileText, Send, Archive, Eye, Pencil, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type BType = "alerte" | "avis" | "bulletin" | "ioc";
type BStatus = "draft" | "published" | "archived";

const TYPE_LABEL: Record<BType, string> = { alerte: "Alerte", avis: "Avis", bulletin: "Bulletin", ioc: "Rapport IoC" };
const TYPE_COLOR: Record<BType, string> = {
  alerte: "bg-destructive/15 text-destructive border-destructive/40",
  avis: "bg-warning/15 text-warning border-warning/40",
  bulletin: "bg-primary/15 text-primary border-primary/40",
  ioc: "bg-secondary/15 text-secondary border-secondary/40",
};
const STATUS_LABEL: Record<BStatus, string> = { draft: "Brouillon", published: "Publié", archived: "Archivé" };

export default function Bulletins() {
  const { user, isAdmin, isAnalyst } = useAuth();
  const canWrite = isAdmin || isAnalyst;
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [form, setForm] = useState({
    type: "avis" as BType, tlp: "amber" as TLP, title: "", summary: "", body_md: "",
    affected_systems: "", recommendations: "", cve_refs: "",
  });

  async function load() {
    const { data } = await supabase.from("bulletins").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (q && !`${b.reference} ${b.title} ${b.summary ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, q, statusFilter]);

  function startNew() {
    setEditing(null);
    setForm({ type: "avis", tlp: "amber", title: "", summary: "", body_md: "", affected_systems: "", recommendations: "", cve_refs: "" });
    setOpen(true);
  }
  function startEdit(b: any) {
    setEditing(b);
    setForm({
      type: b.type, tlp: b.tlp, title: b.title, summary: b.summary ?? "", body_md: b.body_md,
      affected_systems: b.affected_systems ?? "", recommendations: b.recommendations ?? "",
      cve_refs: (b.cve_refs ?? []).join(", "),
    });
    setOpen(true);
  }

  async function save(publishNow = false) {
    if (!user || !form.title.trim() || !form.body_md.trim()) return toast.error("Titre et contenu obligatoires");
    const cve_refs = form.cve_refs.split(",").map(s => s.trim()).filter(Boolean);
    if (editing) {
      const { error } = await supabase.from("bulletins").update({
        type: form.type, tlp: form.tlp, title: form.title, summary: form.summary || null,
        body_md: form.body_md, affected_systems: form.affected_systems || null,
        recommendations: form.recommendations || null, cve_refs,
        ...(publishNow ? { status: "published", published_at: new Date().toISOString() } : {}),
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { data: ref } = await supabase.rpc("next_bulletin_reference", { _type: form.type });
      const { error } = await supabase.from("bulletins").insert({
        reference: ref, type: form.type, tlp: form.tlp, title: form.title, summary: form.summary || null,
        body_md: form.body_md, affected_systems: form.affected_systems || null,
        recommendations: form.recommendations || null, cve_refs, author_id: user.id,
        status: publishNow ? "published" : "draft",
        published_at: publishNow ? new Date().toISOString() : null,
      });
      if (error) return toast.error(error.message);
    }
    toast.success(publishNow ? "Bulletin publié" : "Brouillon enregistré");
    setOpen(false); load();
  }

  async function changeStatus(b: any, status: BStatus) {
    const { error } = await supabase.from("bulletins").update({
      status, ...(status === "published" && !b.published_at ? { published_at: new Date().toISOString() } : {}),
    }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour"); load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulletins & Avis"
        description="Publication d'alertes, avis de vulnérabilité, bulletins de synthèse et rapports IoC (style CERT-FR)"
        action={canWrite && <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Nouveau bulletin</Button>}
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher référence, titre…" className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="draft">Brouillons</TabsTrigger>
            <TabsTrigger value="published">Publiés</TabsTrigger>
            <TabsTrigger value="archived">Archivés</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3">
        {filtered.map(b => (
          <Card key={b.id} className="p-4 gradient-card hover:border-primary/40 transition-smooth">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className="font-mono text-[10px]">{b.reference}</Badge>
                  <Badge className={`text-[10px] ${TYPE_COLOR[b.type as BType]}`}>{TYPE_LABEL[b.type as BType]}</Badge>
                  <TLPBadge tlp={b.tlp} />
                  <Badge variant="secondary" className="text-[10px]">{STATUS_LABEL[b.status as BStatus]}</Badge>
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                {b.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{b.summary}</p>}
                <div className="text-[10px] text-muted-foreground mt-2">
                  Créé le {format(new Date(b.created_at), "dd MMM yyyy", { locale: fr })}
                  {b.published_at && ` · Publié le ${format(new Date(b.published_at), "dd MMM yyyy", { locale: fr })}`}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPreview(b)}><Eye className="h-3 w-3 mr-1" />Voir</Button>
                {canWrite && <Button variant="ghost" size="sm" onClick={() => startEdit(b)}><Pencil className="h-3 w-3 mr-1" />Éditer</Button>}
                {canWrite && b.status === "draft" && <Button variant="ghost" size="sm" onClick={() => changeStatus(b, "published")}><Send className="h-3 w-3 mr-1" />Publier</Button>}
                {canWrite && b.status === "published" && <Button variant="ghost" size="sm" onClick={() => changeStatus(b, "archived")}><Archive className="h-3 w-3 mr-1" />Archiver</Button>}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Aucun bulletin</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Éditer ${editing.reference}` : "Nouveau bulletin"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as BType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>TLP</Label>
                <Select value={form.tlp} onValueChange={(v) => setForm(f => ({ ...f, tlp: v as TLP }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TLP_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Résumé exécutif</Label><Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2} /></div>
            <div><Label>Contenu (markdown)</Label><Textarea value={form.body_md} onChange={e => setForm(f => ({ ...f, body_md: e.target.value }))} rows={10} className="font-mono text-xs" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Systèmes affectés</Label><Textarea value={form.affected_systems} onChange={e => setForm(f => ({ ...f, affected_systems: e.target.value }))} rows={3} /></div>
              <div><Label>Recommandations</Label><Textarea value={form.recommendations} onChange={e => setForm(f => ({ ...f, recommendations: e.target.value }))} rows={3} /></div>
            </div>
            <div><Label>CVE référencés (séparés par virgule)</Label><Input value={form.cve_refs} onChange={e => setForm(f => ({ ...f, cve_refs: e.target.value }))} placeholder="CVE-2026-1234, CVE-2026-5678" /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => save(false)}>Enregistrer brouillon</Button>
              <Button className="flex-1" onClick={() => save(true)}><Send className="h-4 w-4 mr-1" />Publier maintenant</Button>
            </div>
            {form.tlp === "clear" && (
              <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded p-2">
                ⚠️ TLP:CLEAR = diffusion publique. Ce bulletin sera visible sur la page <code>/avis</code> sans authentification.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono">{preview?.reference}</Badge>
              {preview && <TLPBadge tlp={preview.tlp} />}
              {preview && <Badge className={`text-[10px] ${TYPE_COLOR[preview.type as BType]}`}>{TYPE_LABEL[preview.type as BType]}</Badge>}
            </div>
            <DialogTitle className="mt-2">{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4 text-sm">
              {preview.summary && <div className="p-3 bg-muted/30 rounded border-l-4 border-primary">{preview.summary}</div>}
              <div>
                <div className="font-semibold mb-1 text-xs uppercase text-muted-foreground">Contenu</div>
                <pre className="whitespace-pre-wrap font-sans text-sm">{preview.body_md}</pre>
              </div>
              {preview.affected_systems && <div><div className="font-semibold mb-1 text-xs uppercase text-muted-foreground">Systèmes affectés</div><div className="whitespace-pre-line">{preview.affected_systems}</div></div>}
              {preview.recommendations && <div><div className="font-semibold mb-1 text-xs uppercase text-muted-foreground">Recommandations</div><div className="whitespace-pre-line">{preview.recommendations}</div></div>}
              {(preview.cve_refs ?? []).length > 0 && (
                <div><div className="font-semibold mb-1 text-xs uppercase text-muted-foreground">CVE</div>
                  <div className="flex gap-2 flex-wrap">
                    {preview.cve_refs.map((c: string) => (
                      <a key={c} href={`https://nvd.nist.gov/vuln/detail/${c}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {c} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
