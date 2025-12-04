import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
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
  Settings,
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
import type { UserRole } from "@/lib/permissions";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: UserRole[];
  badge?: "unread-messages";
}

interface NavGroup {
  label: string;
  items: NavItem[];
  roles: UserRole[];
}

const allRoles: UserRole[] = ["admin", "sales", "scheduler", "production_manager", "warehouse", "installer", "trade_client"];
const internalRoles: UserRole[] = ["admin", "sales", "scheduler", "production_manager", "warehouse", "installer"];
const officeRoles: UserRole[] = ["admin", "sales", "scheduler", "production_manager"];

const navigationConfig: NavGroup[] = [
  {
    label: "Main",
    roles: internalRoles,
    items: [
      { title: "My Dashboard", url: "/", icon: User, roles: internalRoles },
      { title: "Business Dashboard", url: "/business-dashboard", icon: TrendingUp, roles: ["admin"] },
      { title: "Leads", url: "/leads", icon: FileText, roles: ["admin", "sales"] },
      { title: "Quotes", url: "/quotes", icon: ClipboardList, roles: ["admin", "sales"] },
      { title: "Jobs", url: "/jobs", icon: Briefcase, roles: ["admin", "sales", "scheduler", "production_manager", "warehouse", "installer"] },
      { title: "Clients", url: "/clients", icon: Users, roles: ["admin", "sales", "scheduler", "production_manager"] },
    ],
  },
  {
    label: "Operations",
    roles: ["admin", "scheduler", "production_manager", "warehouse"],
    items: [
      { title: "Production", url: "/production", icon: Factory, roles: ["admin", "production_manager", "warehouse"] },
      { title: "Schedule", url: "/schedule", icon: Calendar, roles: ["admin", "scheduler", "production_manager", "installer"] },
      { title: "Inventory", url: "/inventory", icon: Package, roles: ["admin", "production_manager", "warehouse"] },
    ],
  },
  {
    label: "Finance",
    roles: ["admin", "sales"],
    items: [
      { title: "Payments", url: "/payments", icon: CreditCard, roles: ["admin"] },
      { title: "Messages", url: "/messages", icon: MessageSquare, roles: officeRoles, badge: "unread-messages" },
    ],
  },
  {
    label: "Analytics",
    roles: ["admin"],
    items: [
      { title: "Quote Analytics", url: "/quote-analytics", icon: BarChart3, roles: ["admin", "sales"] },
      { title: "Automation", url: "/automation", icon: Zap, roles: ["admin"] },
      { title: "Import Data", url: "/import", icon: Upload, roles: ["admin"] },
    ],
  },
  {
    label: "Live Documents",
    roles: ["admin", "sales", "scheduler", "production_manager"],
    items: [
      { title: "Templates", url: "/live-doc-templates", icon: FileStack, roles: ["admin", "sales", "scheduler", "production_manager"] },
    ],
  },
  {
    label: "Field",
    roles: ["admin", "installer"],
    items: [
      { title: "Installer App", url: "/installer", icon: Wrench, roles: ["admin", "installer"] },
    ],
  },
  {
    label: "External",
    roles: ["admin", "trade_client"],
    items: [
      { title: "Trade Portal", url: "/trade", icon: Building2, roles: ["admin", "trade_client"] },
    ],
  },
  {
    label: "Organisation",
    roles: internalRoles,
    items: [
      { title: "Departments", url: "/organisation/departments", icon: Building, roles: ["admin"] },
      { title: "Workflows & SOPs", url: "/organisation/workflows", icon: GitBranch, roles: internalRoles },
      { title: "Policies", url: "/organisation/policies", icon: Shield, roles: internalRoles },
      { title: "Resources", url: "/organisation/resources", icon: FolderOpen, roles: internalRoles },
      { title: "Knowledge Base", url: "/organisation/knowledge", icon: BookOpen, roles: internalRoles },
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
  const userRole = (user?.role || "sales") as UserRole;

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/sms/unread-count'],
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const hasAccess = (roles: UserRole[]) => {
    return roles.includes(userRole);
  };

  const visibleGroups = navigationConfig.filter(group => hasAccess(group.roles));

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
        {visibleGroups.map((group) => {
          const visibleItems = group.items.filter(item => hasAccess(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
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
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserSection />
      </SidebarFooter>
    </Sidebar>
  );
}
