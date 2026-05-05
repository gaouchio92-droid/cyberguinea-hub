import { useEffect, useState } from "react";
import { Bell, ShieldAlert, ListChecks, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

type Notif = {
  id: string;
  kind: "incident" | "task";
  title: string;
  sub?: string;
  at: Date;
  href?: string;
};

const STORAGE_KEY = "arpt-notifs-v1";

export default function NotificationsBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw).map((n: any) => ({ ...n, at: new Date(n.at) })) : [];
    } catch { return []; }
  });
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
  }, [items]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("realtime-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incidents" }, (p) => {
        const r: any = p.new;
        const n: Notif = {
          id: `inc-${r.id}`, kind: "incident",
          title: `Nouvel incident : ${r.title}`,
          sub: `Sévérité ${r.severity}`,
          at: new Date(), href: `/incidents/${r.id}`,
        };
        setItems(prev => [n, ...prev].slice(0, 30));
        setUnread(u => u + 1);
        toast.error(n.title, { description: n.sub, action: { label: "Voir", onClick: () => nav(n.href!) } });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "incidents" }, (p) => {
        const o: any = p.old, r: any = p.new;
        if (o.status !== r.status) {
          const n: Notif = {
            id: `inc-st-${r.id}-${Date.now()}`, kind: "incident",
            title: `Incident "${r.title}"`, sub: `Statut → ${r.status}`,
            at: new Date(), href: `/incidents/${r.id}`,
          };
          setItems(prev => [n, ...prev].slice(0, 30));
          setUnread(u => u + 1);
          toast(n.title, { description: n.sub });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, (p) => {
        const r: any = p.new;
        const n: Notif = {
          id: `task-${r.id}`, kind: "task",
          title: `Nouvelle tâche : ${r.title}`,
          sub: `Priorité ${r.priority}`,
          at: new Date(), href: `/tasks`,
        };
        setItems(prev => [n, ...prev].slice(0, 30));
        setUnread(u => u + 1);
        toast(n.title, { description: n.sub });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, nav]);

  return (
    <Popover onOpenChange={(o) => o && setUnread(0)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">Notifications</div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setItems([])}>
              <X className="h-3 w-3 mr-1" />Vider
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Aucune notification</div>
          ) : (
            <div className="divide-y divide-border">
              {items.map(n => (
                <button
                  key={n.id}
                  onClick={() => n.href && nav(n.href)}
                  className="w-full text-left p-3 hover:bg-muted/50 flex items-start gap-2 transition-colors"
                >
                  <div className="mt-0.5">
                    {n.kind === "incident" ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ListChecks className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium line-clamp-2">{n.title}</div>
                    {n.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{n.sub}</div>}
                    <div className="text-[10px] text-muted-foreground mt-0.5">{format(n.at, "dd/MM HH:mm")}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
