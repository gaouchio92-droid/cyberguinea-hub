import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ListChecks, ShieldAlert, Radar, Building2, FileBarChart, Sparkles, LogOut, Users, BookOpen, Activity, ScrollText, Map, ShieldCheck, Target, Crosshair, FileText, Award, Code2,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import MapView from "@/pages/MapView";
import arptLogo from "@/assets/arpt-logo.png";

const baseItems = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Planning & Tâches", url: "/tasks", icon: ListChecks },
  { title: "Incidents", url: "/incidents", icon: ShieldAlert },
  { title: "Opérations", url: "/operations", icon: Activity },
  { title: "Threat Intelligence", url: "/intel", icon: Radar },
  { title: "Opérateurs & Audits", url: "/operators", icon: Building2 },
  { title: "Conformité ANSSI/NIS2", url: "/compliance", icon: ShieldCheck },
  { title: "Exercices & PCA", url: "/exercises", icon: Target },
  { title: "Cartographie", url: "/map", icon: Map },
  { title: "Centre de Reporting", url: "/reports", icon: FileBarChart },
  { title: "Bulletins & Avis", url: "/bulletins", icon: FileText },
  { title: "Indicateurs (IoCs)", url: "/iocs", icon: Crosshair },
  { title: "Assistant IA", url: "/assistant", icon: Sparkles },
  { title: "Documentation", url: "/documentation", icon: BookOpen },
];
const adminItems = [
  { title: "Maturité CSIRT", url: "/maturity", icon: Award },
  { title: "Utilisateurs", url: "/users", icon: Users },
  { title: "Journal système", url: "/system-logs", icon: ScrollText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user, isAdmin } = useAuth();
  const items = isAdmin ? [...baseItems, ...adminItems] : baseItems;
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 ring-1 ring-primary/30 shadow-glow bg-background/40">
            <img src={arptLogo} alt="Logo ARPT Guinée CERT National" width={40} height={40} className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">ARPT Cyber</div>
              <div className="text-[10px] text-muted-foreground truncate">Analyst Pro 2026</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => {
                const active = pathname === item.url;
                const isMap = item.url === "/map";
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active && !isMap}>
                      {isMap ? (
                        <button
                          type="button"
                          onClick={() => setMapOpen(true)}
                          className="flex items-center gap-3 w-full text-left"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </button>
                      ) : (
                        <NavLink to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="px-2 py-2 mb-2">
            <div className="text-xs font-medium truncate">{user.email}</div>
            <div className="text-[10px] text-muted-foreground">{isAdmin ? "Administrateur" : "Analyste"}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
    <Dialog open={mapOpen} onOpenChange={setMapOpen}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-4 overflow-auto">
        <DialogHeader>
          <DialogTitle>Cartographie</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <MapView />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
