export type UserRole = 
  | "admin" 
  | "sales" 
  | "scheduler" 
  | "production_manager" 
  | "warehouse" 
  | "installer" 
  | "trade_client";

export const allInternalRoles: UserRole[] = ["admin", "sales", "scheduler", "production_manager", "warehouse", "installer"];
export const officeRoles: UserRole[] = ["admin", "sales", "scheduler", "production_manager"];

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
}

export const routePermissions: RouteConfig[] = [
  { path: "/", allowedRoles: allInternalRoles },
  { path: "/business-dashboard", allowedRoles: allInternalRoles },
  { path: "/leads", allowedRoles: allInternalRoles },
  { path: "/quotes", allowedRoles: allInternalRoles },
  { path: "/jobs", allowedRoles: allInternalRoles },
  { path: "/clients", allowedRoles: allInternalRoles },
  { path: "/production", allowedRoles: allInternalRoles },
  { path: "/schedule", allowedRoles: allInternalRoles },
  { path: "/inventory", allowedRoles: allInternalRoles },
  { path: "/financial", allowedRoles: ["admin", "scheduler", "production_manager"] },
  { path: "/payments", allowedRoles: ["admin"] },
  { path: "/messages", allowedRoles: allInternalRoles },
  { path: "/quote-analytics", allowedRoles: allInternalRoles },
  { path: "/automation", allowedRoles: ["admin"] },
  { path: "/installer", allowedRoles: allInternalRoles },
  { path: "/trade", allowedRoles: ["admin", "trade_client"] },
  { path: "/organisation/departments", allowedRoles: ["admin"] },
  { path: "/organisation/workflows", allowedRoles: allInternalRoles },
  { path: "/organisation/policies", allowedRoles: allInternalRoles },
  { path: "/organisation/resources", allowedRoles: allInternalRoles },
  { path: "/organisation/knowledge", allowedRoles: allInternalRoles },
  { path: "/live-doc-templates", allowedRoles: allInternalRoles },
  { path: "/import", allowedRoles: ["admin"] },
  { path: "/dashboard-builder", allowedRoles: ["admin"] },
  { path: "/job-stage-configuration", allowedRoles: ["admin"] },
  { path: "/kanban-column-settings", allowedRoles: ["admin"] },
  { path: "/unauthorized", allowedRoles: allInternalRoles },
];

export function hasRouteAccess(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  
  if (role === "admin") return true;
  
  const matchedConfig = routePermissions.find(config => {
    if (config.path === route) return true;
    if (route.startsWith(config.path + "/")) return true;
    return false;
  });
  
  if (!matchedConfig) return false;
  
  return matchedConfig.allowedRoles.includes(role);
}

export function getDefaultRoute(role: UserRole | undefined): string {
  if (!role) return "/login";
  if (role === "trade_client") return "/trade";
  return "/";
}

export function getRolesForRoute(route: string): UserRole[] {
  const matchedConfig = routePermissions.find(config => {
    if (config.path === route) return true;
    if (route.startsWith(config.path + "/")) return true;
    return false;
  });
  
  return matchedConfig?.allowedRoles || [];
}
