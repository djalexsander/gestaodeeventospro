import { useState, useEffect } from "react";
import { Calendar, Music, Mic2, MapPin, LayoutDashboard, Shield, LogOut, Users, Building2, Settings, Crown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const empresaItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Artistas", url: "/artistas", icon: Music },
  { title: "Riders Técnicos", url: "/riders", icon: Mic2 },
  { title: "Cidades", url: "/cidades", icon: MapPin },
  { title: "Funcionários", url: "/funcionarios", icon: Users },
];

const masterItems = [
  { title: "Painel Master", url: "/master", icon: Crown },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Usuários Globais", url: "/admin", icon: Shield },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, isAdminMaster, signOut, user } = useAuth();
  const { companies, activeCompany, activeCompanyId, setActiveCompanyId } = useCompany();
  const [platformName, setPlatformName] = useState("Gestão de Eventos Pro");
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('system_settings' as any).select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setPlatformName((data as any).platform_name || "Gestão de Eventos Pro");
        setPlatformLogoUrl((data as any).platform_logo_url || null);
      }
    });
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {platformLogoUrl ? (
            <img src={platformLogoUrl} alt={platformName} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          ) : activeCompany?.logoUrl ? (
            <img src={activeCompany.logoUrl} alt={activeCompany.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-heading text-sm font-bold text-sidebar-foreground truncate">
                {platformName}
              </span>
              <span className="text-xs text-sidebar-foreground/60">Gestão de Eventos</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* MASTER section — only visible to admin_master */}
        {isAdminMaster && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-2 mb-1">
                Master
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {masterItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/master"}
                        className="hover:bg-sidebar-accent/80 rounded-lg transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}


        {/* EMPRESA section — hidden for admin_master */}
        {!isAdminMaster && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-2 mb-1">
                Empresa
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {empresaItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent/80 rounded-lg transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Usuários">
                      <NavLink
                        to="/admin"
                        className="hover:bg-sidebar-accent/80 rounded-lg transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <Shield className="h-4 w-4" />
                        {!collapsed && <span>Usuários</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && user && (
          <div className="space-y-0.5">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            <p className="text-[10px] text-sidebar-foreground/40">v1.0.0</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={signOut}
          className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/80"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/40 text-center">
            © 2026 Gestão de Eventos Pro
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
