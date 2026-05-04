import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, Lock } from "lucide-react";
import { format } from "date-fns";

const levelColor: Record<string, string> = {
  info: "bg-secondary/20 text-secondary border border-secondary/40",
  warning: "bg-warning/20 text-warning border border-warning/40",
  error: "bg-destructive/20 text-destructive border border-destructive/40",
  critical: "bg-destructive text-destructive-foreground",
  debug: "bg-muted text-muted-foreground",
};

export default function SystemLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (level !== "all") q = q.eq("level", level as any);
    const { data } = await q;
    setLogs(data ?? []);
    setLoading(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, level]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Journal système" description="Audit des actions sur la plateforme" />
        <Card><CardContent className="p-12 text-center">
          <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
        </CardContent></Card>
      </div>
    );
  }

  const filtered = logs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.target?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Journal système" description="Audit des actions et événements de la plateforme" />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input placeholder="Rechercher acteur, action, cible…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous niveaux</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Date</TableHead>
                  <TableHead className="w-24">Niveau</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Cible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    Aucun log trouvé
                  </TableCell></TableRow>
                )}
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{format(new Date(l.created_at), "dd/MM/yy HH:mm:ss")}</TableCell>
                    <TableCell><Badge className={levelColor[l.level]}>{l.level}</Badge></TableCell>
                    <TableCell className="text-xs">{l.actor_email ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{l.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{l.target ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
