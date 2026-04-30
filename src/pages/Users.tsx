import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, ShieldOff, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";

const newUserSchema = z.object({
  full_name: z.string().trim().min(1, "Nom requis").max(100),
  email: z.string().trim().toLowerCase().email("Email invalide").max(255),
  password: z.string().min(8, "Min. 8 caractères").max(128),
  role: z.enum(["admin", "analyst", "operator"]),
});

type Row = { id: string; full_name: string | null; created_at: string; roles: string[]; operator_id: string | null };
type Operator = { id: string; name: string };

export default function Users() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: rolesData }, { data: ops }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, created_at, operator_id").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("operators").select("id, name").order("name"),
    ]);
    const byUser: Record<string, string[]> = {};
    (rolesData ?? []).forEach((r: any) => {
      byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role];
    });
    setRows((profiles ?? []).map((p: any) => ({ ...p, roles: byUser[p.id] ?? [] })));
    setOperators(ops ?? []);
    setLoading(false);
  }

  async function setOperator(userId: string, operatorId: string | null) {
    const { error } = await supabase.from("profiles").update({ operator_id: operatorId }).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Opérateur associé");
    load();
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function toggleRole(userId: string, role: "admin" | "analyst" | "operator", has: boolean) {
    if (has) {
      if (userId === user?.id && role === "admin") {
        if (!confirm("Retirer votre propre rôle administrateur ?")) return;
      }
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    }
    toast.success("Rôle mis à jour");
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des utilisateurs"
        description="Administration des comptes et rôles — réservé aux administrateurs"
        action={<NewUserDialog onCreated={load} />}
      />
      <Card className="p-5 gradient-card">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const isA = r.roles.includes("admin");
              const isAn = r.roles.includes("analyst");
              const isOp = r.roles.includes("operator");
              return (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-smooth">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <UserCheck className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{r.full_name ?? "Sans nom"}</div>
                    <div className="text-[11px] text-muted-foreground">Créé le {format(new Date(r.created_at), "dd MMM yyyy", { locale: fr })}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isA && <Badge className="bg-primary/15 text-primary border-primary/30">Administrateur</Badge>}
                    {isAn && <Badge variant="outline">Analyste</Badge>}
                    {isOp && <Badge className="bg-secondary/15 text-secondary border-secondary/30">Opérateur</Badge>}
                    {!isA && !isAn && !isOp && <Badge variant="outline" className="text-muted-foreground">Aucun rôle</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button size="sm" variant={isA ? "destructive" : "default"} onClick={() => toggleRole(r.id, "admin", isA)}>
                      {isA ? <><ShieldOff className="h-4 w-4" /> Retirer admin</> : <><Shield className="h-4 w-4" /> Admin</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleRole(r.id, "analyst", isAn)}>
                      {isAn ? "Retirer analyste" : "Analyste"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleRole(r.id, "operator", isOp)}>
                      {isOp ? "Retirer opérateur" : "Opérateur"}
                    </Button>
                    <Select
                      value={r.operator_id ?? "none"}
                      onValueChange={(v) => setOperator(r.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Opérateur associé" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucun opérateur —</SelectItem>
                        {operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
            {!rows.length && <p className="text-sm text-muted-foreground text-center py-6">Aucun utilisateur</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

function NewUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "analyst" as "admin" | "analyst" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newUserSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body: parsed.data });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Erreur");
    toast.success("Utilisateur créé");
    setForm({ full_name: "", email: "", password: "", role: "analyst" });
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="h-4 w-4" /> Nouvel utilisateur</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Créer un utilisateur</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nom complet</Label><Input maxLength={100} required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" maxLength={255} required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <Label>Mot de passe initial</Label>
            <Input type="text" minLength={8} maxLength={128} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <p className="text-[11px] text-muted-foreground mt-1">Communiquez-le à l'utilisateur, il pourra le changer après connexion.</p>
          </div>
          <div>
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={(v: "admin" | "analyst") => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="analyst">Analyste</SelectItem>
                <SelectItem value="operator">Opérateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Créer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
