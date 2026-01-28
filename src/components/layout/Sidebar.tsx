import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getRolePermissions, getRoleLabel, getRoleColor } from '@/types/pos';
import { NavLink } from '@/components/NavLink';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Settings,
  LogOut,
  History,
  CloudLightning,
  AlertTriangle,
  Tag,
} from 'lucide-react';

export function AppSidebar() {
  const { profile, role, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();
  const location = useLocation();

  const permissions = role ? getRolePermissions(role) : null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const mainMenuItems = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Point of Sale', url: '/pos', icon: ShoppingCart },
    { title: 'Sales History', url: '/sales', icon: History },
  ];

  const managementItems = [
    { title: 'Inventory', url: '/inventory', icon: Package, requiresPermission: 'canManageProducts' as const },
    { title: 'Discounts', url: '/discounts', icon: Tag, requiresPermission: 'canManageProducts' as const },
    { title: 'Reports', url: '/reports', icon: BarChart3, requiresPermission: 'canViewReports' as const },
    { title: 'Users', url: '/users', icon: Users, requiresPermission: 'canManageUsers' as const },
    { title: 'Settings', url: '/settings', icon: Settings, requiresPermission: 'canAccessSettings' as const },
  ];

  const filteredManagementItems = managementItems.filter(
    (item) => permissions && permissions[item.requiresPermission]
  );

  return (
    <Sidebar className="border-r border-sidebar-border gradient-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <CloudLightning className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg">VapeShop</span>
              <span className="text-xs text-muted-foreground">POS System</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredManagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredManagementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <item.icon className="w-5 h-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!role && (
          <div className="mb-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              {!collapsed && <span className="text-xs">No role assigned</span>}
            </div>
          </div>
        )}
        
        {!collapsed && profile && (
          <div className="mb-3 p-3 rounded-lg bg-sidebar-accent">
            <p className="font-medium text-sm truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            {role && (
              <Badge variant="outline" className={`mt-2 ${getRoleColor(role)}`}>
                {getRoleLabel(role)}
              </Badge>
            )}
          </div>
        )}
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
