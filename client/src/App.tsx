import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { NewMessageBanner } from "@/components/layout/NewMessageBanner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldX } from "lucide-react";
import type { UserRole } from "@/lib/permissions";

import Login from "@/pages/Login";
import MyDashboard from "@/pages/MyDashboard";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Quotes from "@/pages/Quotes";
import Jobs from "@/pages/Jobs";
import Clients from "@/pages/Clients";
import Production from "@/pages/Production";
import Schedule from "@/pages/Schedule";
import Inventory from "@/pages/Inventory";
import Payments from "@/pages/Payments";
import Messages from "@/pages/Messages";
import QuoteAnalytics from "@/pages/QuoteAnalytics";
import AutomationCampaigns from "@/pages/AutomationCampaigns";
import Installer from "@/pages/Installer";
import Trade from "@/pages/Trade";
import NotFound from "@/pages/not-found";

import OrganisationDepartments from "@/pages/organisation/Departments";
import OrganisationWorkflows from "@/pages/organisation/Workflows";
import OrganisationPolicies from "@/pages/organisation/Policies";
import OrganisationResources from "@/pages/organisation/Resources";
import OrganisationKnowledge from "@/pages/organisation/Knowledge";
import LiveDocTemplates from "@/pages/LiveDocTemplates";
import Import from "@/pages/Import";

function MainLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <NewMessageBanner />
          <Header />
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function InstallerLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-auto">{children}</div>;
}

function TradeLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-auto">{children}</div>;
}

const allInternalRoles: UserRole[] = ["admin", "sales", "scheduler", "production_manager", "warehouse", "installer"];
const officeRoles: UserRole[] = ["admin", "sales", "scheduler", "production_manager"];

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <ShieldX className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-4">
        You don't have permission to access this page.
      </p>
      <a href="/" className="text-primary hover:underline">Return to Dashboard</a>
    </div>
  );
}

function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user?.role) {
    const hasAccess = allowedRoles.includes(user.role as UserRole);
    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/login">
        <LoginRedirect />
      </Route>
      <Route path="/">
        <ProtectedRoute allowedRoles={allInternalRoles}>
          <MainLayout>
            <MyDashboard />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/business-dashboard">
        <ProtectedRoute allowedRoles={["admin"]}>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads">
        <ProtectedRoute allowedRoles={["admin", "sales"]}>
          <MainLayout>
            <Leads />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/quotes">
        <ProtectedRoute allowedRoles={["admin", "sales"]}>
          <MainLayout>
            <Quotes />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/jobs">
        <ProtectedRoute allowedRoles={["admin", "sales", "scheduler", "production_manager", "warehouse", "installer"]}>
          <MainLayout>
            <Jobs />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute allowedRoles={officeRoles}>
          <MainLayout>
            <Clients />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/production">
        <ProtectedRoute allowedRoles={["admin", "production_manager", "warehouse"]}>
          <MainLayout>
            <Production />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/schedule">
        <ProtectedRoute allowedRoles={["admin", "scheduler", "production_manager", "installer"]}>
          <MainLayout>
            <Schedule />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <ProtectedRoute allowedRoles={["admin", "production_manager", "warehouse"]}>
          <MainLayout>
            <Inventory />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/payments">
        <ProtectedRoute allowedRoles={["admin"]}>
          <MainLayout>
            <Payments />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute allowedRoles={officeRoles}>
          <MainLayout>
            <Messages />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/quote-analytics">
        <ProtectedRoute allowedRoles={["admin", "sales"]}>
          <MainLayout>
            <QuoteAnalytics />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/automation">
        <ProtectedRoute allowedRoles={["admin"]}>
          <MainLayout>
            <AutomationCampaigns />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/installer">
        <ProtectedRoute allowedRoles={["admin", "installer"]}>
          <InstallerLayout>
            <Installer />
          </InstallerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/trade">
        <ProtectedRoute allowedRoles={["admin", "trade_client"]}>
          <TradeLayout>
            <Trade />
          </TradeLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/departments">
        <ProtectedRoute allowedRoles={["admin"]}>
          <MainLayout>
            <OrganisationDepartments />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/workflows">
        <ProtectedRoute allowedRoles={allInternalRoles}>
          <MainLayout>
            <OrganisationWorkflows />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/policies">
        <ProtectedRoute allowedRoles={allInternalRoles}>
          <MainLayout>
            <OrganisationPolicies />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/resources">
        <ProtectedRoute allowedRoles={allInternalRoles}>
          <MainLayout>
            <OrganisationResources />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/knowledge">
        <ProtectedRoute allowedRoles={allInternalRoles}>
          <MainLayout>
            <OrganisationKnowledge />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/live-doc-templates">
        <ProtectedRoute allowedRoles={["admin", "sales", "scheduler", "production_manager"]}>
          <MainLayout>
            <LiveDocTemplates />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/import">
        <ProtectedRoute allowedRoles={["admin"]}>
          <MainLayout>
            <Import />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function LoginRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    if (user?.role === "trade_client") {
      return <Redirect to="/trade" />;
    }
    return <Redirect to="/" />;
  }
  
  return <Login />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="probuild-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <AuthenticatedRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
