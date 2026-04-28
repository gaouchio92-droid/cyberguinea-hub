import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldOff, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Row = { id: string; full_name: string | null; created_at: string; roles: string[] };

export default function Users() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser: Record<string, string[]> = {};
    (rolesData ?? []).forEach((r: any) => {
      byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role];
    });
    setRows((profiles ?? []).map((p: any) => ({ ...p, roles: byUser[p.id] ?? [] })));
    setLoading(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function toggleRole(userId: string, role: "admin" | "analyst", has: boolean) {
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
      <PageHeader title="Gestion des utilisateurs" description="Administration des comptes et rôles — réservé aux administrateurs" />
      <Card className="p-5 gradient-card">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const isA = r.roles.includes("admin");
              const isAn = r.roles.includes("analyst");
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
                    {!isA && !isAn && <Badge variant="outline" className="text-muted-foreground">Aucun rôle</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={isA ? "destructive" : "default"} onClick={() => toggleRole(r.id, "admin", isA)}>
                      {isA ? <><ShieldOff className="h-4 w-4" /> Retirer admin</> : <><Shield className="h-4 w-4" /> Promouvoir admin</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleRole(r.id, "analyst", isAn)}>
                      {isAn ? "Retirer analyste" : "Ajouter analyste"}
                    </Button>
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
