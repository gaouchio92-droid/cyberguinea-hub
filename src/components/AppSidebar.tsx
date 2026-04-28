import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ListChecks, ShieldAlert, Radar, Building2, FileBarChart, Sparkles, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import arptLogo from "@/assets/arpt-logo.png";

const items = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Planning & Tâches", url: "/tasks", icon: ListChecks },
  { title: "Incidents", url: "/incidents", icon: ShieldAlert },
  { title: "Threat Intelligence", url: "/intel", icon: Radar },
  { title: "Opérateurs & Audits", url: "/operators", icon: Building2 },
  { title: "Centre de Reporting", url: "/reports", icon: FileBarChart },
  { title: "Assistant IA", url: "/assistant", icon: Sparkles },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user, isAdmin } = useAuth();

  return (
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
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
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
  );
}
