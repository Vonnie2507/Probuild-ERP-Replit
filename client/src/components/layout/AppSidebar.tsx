import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LucideIcon } from "lucide-react";
import {
  Users,
  FileText,
  ClipboardList,
  Briefcase,
  Factory,
  Calendar,
  Package,
  CreditCard,
  MessageSquare,
  Wrench,
  Building2,
  LogOut,
  BarChart3,
  Zap,
  Building,
  GitBranch,
  Shield,
  FolderOpen,
  BookOpen,
  FileStack,
  User,
  TrendingUp,
  Upload,
  LayoutDashboard,
  Landmark,
  Columns3,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { type UserRole, getRolesForRoute, allInternalRoles, officeRoles } from "@/lib/permissions";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: "unread-messages";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationConfig: NavGroup[] = [
  {
    label: "Main",
    items: [
      { title: "My Dashboard", url: "/", icon: User },
      { title: "Business Dashboard", url: "/business-dashboard", icon: TrendingUp },
      { title: "Leads", url: "/leads", icon: FileText },
      { title: "Quotes", url: "/quotes", icon: ClipboardList },
      { title: "Jobs", url: "/jobs", icon: Briefcase },
      { title: "Clients", url: "/clients", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Production", url: "/production", icon: Factory },
      { title: "Schedule", url: "/schedule", icon: Calendar },
      { title: "Inventory", url: "/inventory", icon: Package },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Banking", url: "/financial", icon: Landmark },
      { title: "Payments", url: "/payments", icon: CreditCard },
      { title: "Messages", url: "/messages", icon: MessageSquare, badge: "unread-messages" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Quote Analytics", url: "/quote-analytics", icon: BarChart3 },
      { title: "Automation", url: "/automation", icon: Zap },
      { title: "Import Data", url: "/import", icon: Upload },
    ],
  },
  {
    label: "Live Documents",
    items: [
      { title: "Templates", url: "/live-doc-templates", icon: FileStack },
    ],
  },
  {
    label: "Field",
    items: [
      { title: "Installer App", url: "/installer", icon: Wrench },
    ],
  },
  {
    label: "External",
    items: [
      { title: "Trade Portal", url: "/trade", icon: Building2 },
    ],
  },
  {
    label: "Organisation",
    items: [
      { title: "Departments", url: "/organisation/departments", icon: Building },
      { title: "Workflows & SOPs", url: "/organisation/workflows", icon: GitBranch },
      { title: "Policies", url: "/organisation/policies", icon: Shield },
      { title: "Resources", url: "/organisation/resources", icon: FolderOpen },
      { title: "Knowledge Base", url: "/organisation/knowledge", icon: BookOpen },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Dashboard Builder", url: "/dashboard-builder", icon: LayoutDashboard },
      { title: "Job Stage Config", url: "/job-stage-configuration", icon: GitBranch },
      { title: "Kanban Columns", url: "/kanban-column-settings", icon: Columns3 },
    ],
  },
];

function formatRoleDisplay(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "Administrator",
    sales: "Sales",
    scheduler: "Scheduler",
    production_manager: "Production Manager",
    warehouse: "Warehouse",
    installer: "Installer",
    trade_client: "Trade Client",
  };
  return roleMap[role] || role;
}

function UserSection() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  const initials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() 
    : 'U';
  
  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };
  
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-sidebar-foreground" data-testid="text-user-name">
          {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
        </span>
        <span className="text-xs text-sidebar-foreground/70">
          {user?.positionTitle || formatRoleDisplay(user?.role || 'user')}
        </span>
      </div>
      <SidebarMenuButton 
        size="sm" 
        className="h-8 w-8" 
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="h-4 w-4" />
      </SidebarMenuButton>
    </div>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role as UserRole | undefined;

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/sms/unread-count'],
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const canAccessRoute = (route: string): boolean => {
    if (!userRole) return false;
    const allowedRoles = getRolesForRoute(route);
    return allowedRoles.includes(userRole);
  };

  const getVisibleGroups = () => {
    return navigationConfig
      .map(group => ({
        ...group,
        items: group.items.filter(item => canAccessRoute(item.url)),
      }))
      .filter(group => group.items.length > 0);
  };
  
  const visibleGroups = getVisibleGroups();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground font-bold text-lg">
            PB
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">Probuild PVC</span>
            <span className="text-xs text-sidebar-foreground/70">ERP & CRM</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge === "unread-messages" && unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                            data-testid="badge-unread-messages"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserSection />
      </SidebarFooter>
    </Sidebar>
  );
}
