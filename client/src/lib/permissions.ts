export type UserRole = 
  | "admin" 
  | "sales" 
  | "scheduler" 
  | "production_manager" 
  | "warehouse" 
  | "installer" 
  | "trade_client";

export interface RolePermissions {
  routes: string[];
  sidebarGroups: string[];
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    routes: ["*"],
    sidebarGroups: ["main", "operations", "finance", "analytics", "live-docs", "installer", "trade", "organisation"],
  },
  sales: {
    routes: [
      "/",
      "/leads",
      "/leads/*",
      "/quotes",
      "/quotes/*",
      "/clients",
      "/clients/*",
      "/messages",
      "/messages/*",
      "/organisation/*",
    ],
    sidebarGroups: ["main-sales", "finance-messages", "organisation"],
  },
  scheduler: {
    routes: [
      "/",
      "/jobs",
      "/jobs/*",
      "/schedule",
      "/schedule/*",
      "/production",
      "/clients",
      "/clients/*",
      "/messages",
      "/messages/*",
      "/organisation/*",
    ],
    sidebarGroups: ["main-scheduler", "operations-scheduler", "finance-messages", "organisation"],
  },
  production_manager: {
    routes: [
      "/",
      "/jobs",
      "/jobs/*",
      "/production",
      "/production/*",
      "/schedule",
      "/schedule/*",
      "/inventory",
      "/inventory/*",
      "/clients",
      "/messages",
      "/messages/*",
      "/organisation/*",
    ],
    sidebarGroups: ["main-production", "operations", "finance-messages", "organisation"],
  },
  warehouse: {
    routes: [
      "/",
      "/production",
      "/production/*",
      "/inventory",
      "/inventory/*",
      "/jobs",
      "/organisation/*",
    ],
    sidebarGroups: ["main-warehouse", "operations-warehouse", "organisation"],
  },
  installer: {
    routes: [
      "/",
      "/installer",
      "/installer/*",
      "/jobs",
      "/jobs/*",
      "/schedule",
      "/organisation/*",
    ],
    sidebarGroups: ["main-installer", "installer", "organisation"],
  },
  trade_client: {
    routes: [
      "/trade",
      "/trade/*",
    ],
    sidebarGroups: ["trade"],
  },
};

export function hasRouteAccess(role: UserRole, route: string): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  if (permissions.routes.includes("*")) return true;
  
  return permissions.routes.some(allowedRoute => {
    if (allowedRoute === route) return true;
    if (allowedRoute.endsWith("/*")) {
      const baseRoute = allowedRoute.slice(0, -2);
      return route.startsWith(baseRoute);
    }
    return false;
  });
}

export function hasSidebarGroupAccess(role: UserRole, group: string): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  return permissions.sidebarGroups.some(allowedGroup => {
    if (allowedGroup === group) return true;
    if (allowedGroup.startsWith(group + "-")) return true;
    if (group.startsWith(allowedGroup.split("-")[0])) return true;
    return false;
  });
}
