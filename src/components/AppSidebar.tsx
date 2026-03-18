import { Calendar, Music, Mic2, MapPin, LayoutDashboard, Shield, LogOut, Users, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Artistas", url: "/artistas", icon: Music },
  { title: "Riders Técnicos", url: "/riders", icon: Mic2 },
  { title: "Cidades", url: "/cidades", icon: MapPin },
  { title: "Funcionários", url: "/funcionarios", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, isAdminMaster, signOut, user } = useAuth();
  const { companies, activeCompany, activeCompanyId, setActiveCompanyId } = useCompany();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {activeCompany?.logoUrl ? (
            <img src={activeCompany.logoUrl} alt={activeCompany.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-heading text-sm font-bold text-sidebar-foreground truncate">
                {activeCompany?.name || "Central de Eventos"}
              </span>
              <span className="text-xs text-sidebar-foreground/60">Eventos</span>
            </div>
          )}
        </div>
        {/* Company selector for admin_master */}
        {isAdminMaster && !collapsed && companies.length > 1 && (
          <div className="mt-3">
            <Select value={activeCompanyId || ""} onValueChange={setActiveCompanyId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
              {isAdminMaster && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Empresas">
                    <NavLink
                      to="/empresas"
                      className="hover:bg-sidebar-accent/80 rounded-lg transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Building2 className="h-4 w-4" />
                      {!collapsed && <span>Empresas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
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
            © 2026 Central de Eventos
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
