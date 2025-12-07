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
import { type UserRole, hasRouteAccess, getDefaultRoute } from "@/lib/permissions";

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
import Unauthorized from "@/pages/Unauthorized";
import DashboardBuilder from "@/pages/DashboardBuilder";
import Financial from "@/pages/Financial";
import JobStageConfiguration from "@/pages/JobStageConfiguration";
import KanbanColumnSettings from "@/pages/KanbanColumnSettings";
import SalesChecklistConfig from "@/pages/SalesChecklistConfig";
import Calls from "@/pages/Calls";
import SubmitReceipt from "@/pages/SubmitReceipt";
import ExpenseCategoryConfig from "@/pages/ExpenseCategoryConfig";
import StaffManagement from "@/pages/StaffManagement";
import { CallWidget } from "@/components/coaching/CallWidget";

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
      <CallWidget />
    </SidebarProvider>
  );
}

function InstallerLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-auto">{children}</div>;
}

function TradeLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-auto">{children}</div>;
}

function ProtectedRoute({ 
  children, 
  path 
}: { 
  children: React.ReactNode;
  path: string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const userRole = user?.role as UserRole | undefined;

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

  if (!hasRouteAccess(userRole, path)) {
    // Trade clients trying to access internal pages go to trade portal
    if (userRole === "trade_client") {
      return <Redirect to="/trade" />;
    }
    // All other unauthorized access goes to unauthorized page
    return <Redirect to="/unauthorized" />;
  }

  return <>{children}</>;
}

function AuthenticatedRouter() {
  return (
    <Switch>
      {/* Public route for receipt submission - no auth required */}
      <Route path="/submit-receipt/:token">
        <SubmitReceipt />
      </Route>
      <Route path="/login">
        <LoginRedirect />
      </Route>
      <Route path="/">
        <ProtectedRoute path="/">
          <MainLayout>
            <MyDashboard />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/business-dashboard">
        <ProtectedRoute path="/business-dashboard">
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads/:rest*">
        <ProtectedRoute path="/leads">
          <MainLayout>
            <Leads />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads">
        <ProtectedRoute path="/leads">
          <MainLayout>
            <Leads />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/quotes/:rest*">
        <ProtectedRoute path="/quotes">
          <MainLayout>
            <Quotes />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/quotes">
        <ProtectedRoute path="/quotes">
          <MainLayout>
            <Quotes />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/jobs/:rest*">
        <ProtectedRoute path="/jobs">
          <MainLayout>
            <Jobs />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/jobs">
        <ProtectedRoute path="/jobs">
          <MainLayout>
            <Jobs />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/clients/:rest*">
        <ProtectedRoute path="/clients">
          <MainLayout>
            <Clients />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute path="/clients">
          <MainLayout>
            <Clients />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/production/:rest*">
        <ProtectedRoute path="/production">
          <MainLayout>
            <Production />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/production">
        <ProtectedRoute path="/production">
          <MainLayout>
            <Production />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/schedule/:rest*">
        <ProtectedRoute path="/schedule">
          <MainLayout>
            <Schedule />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/schedule">
        <ProtectedRoute path="/schedule">
          <MainLayout>
            <Schedule />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/inventory/:rest*">
        <ProtectedRoute path="/inventory">
          <MainLayout>
            <Inventory />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <ProtectedRoute path="/inventory">
          <MainLayout>
            <Inventory />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/financial/:rest*">
        <ProtectedRoute path="/financial">
          <MainLayout>
            <Financial />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/financial">
        <ProtectedRoute path="/financial">
          <MainLayout>
            <Financial />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/payments/:rest*">
        <ProtectedRoute path="/payments">
          <MainLayout>
            <Payments />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/payments">
        <ProtectedRoute path="/payments">
          <MainLayout>
            <Payments />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/messages/:rest*">
        <ProtectedRoute path="/messages">
          <MainLayout>
            <Messages />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute path="/messages">
          <MainLayout>
            <Messages />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/calls">
        <ProtectedRoute path="/calls">
          <MainLayout>
            <Calls />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/quote-analytics">
        <ProtectedRoute path="/quote-analytics">
          <MainLayout>
            <QuoteAnalytics />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/automation/:rest*">
        <ProtectedRoute path="/automation">
          <MainLayout>
            <AutomationCampaigns />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/automation">
        <ProtectedRoute path="/automation">
          <MainLayout>
            <AutomationCampaigns />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/installer/:rest*">
        <ProtectedRoute path="/installer">
          <InstallerLayout>
            <Installer />
          </InstallerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/installer">
        <ProtectedRoute path="/installer">
          <InstallerLayout>
            <Installer />
          </InstallerLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/trade/:rest*">
        <ProtectedRoute path="/trade">
          <TradeLayout>
            <Trade />
          </TradeLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/trade">
        <ProtectedRoute path="/trade">
          <TradeLayout>
            <Trade />
          </TradeLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/departments">
        <ProtectedRoute path="/organisation/departments">
          <MainLayout>
            <OrganisationDepartments />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/workflows/:rest*">
        <ProtectedRoute path="/organisation/workflows">
          <MainLayout>
            <OrganisationWorkflows />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/workflows">
        <ProtectedRoute path="/organisation/workflows">
          <MainLayout>
            <OrganisationWorkflows />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/policies/:rest*">
        <ProtectedRoute path="/organisation/policies">
          <MainLayout>
            <OrganisationPolicies />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/policies">
        <ProtectedRoute path="/organisation/policies">
          <MainLayout>
            <OrganisationPolicies />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/resources/:rest*">
        <ProtectedRoute path="/organisation/resources">
          <MainLayout>
            <OrganisationResources />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/resources">
        <ProtectedRoute path="/organisation/resources">
          <MainLayout>
            <OrganisationResources />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/knowledge/:rest*">
        <ProtectedRoute path="/organisation/knowledge">
          <MainLayout>
            <OrganisationKnowledge />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/organisation/knowledge">
        <ProtectedRoute path="/organisation/knowledge">
          <MainLayout>
            <OrganisationKnowledge />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/live-doc-templates/:rest*">
        <ProtectedRoute path="/live-doc-templates">
          <MainLayout>
            <LiveDocTemplates />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/live-doc-templates">
        <ProtectedRoute path="/live-doc-templates">
          <MainLayout>
            <LiveDocTemplates />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/import">
        <ProtectedRoute path="/import">
          <MainLayout>
            <Import />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard-builder/:rest*">
        <ProtectedRoute path="/dashboard-builder">
          <MainLayout>
            <DashboardBuilder />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard-builder">
        <ProtectedRoute path="/dashboard-builder">
          <MainLayout>
            <DashboardBuilder />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/job-stage-configuration">
        <ProtectedRoute path="/job-stage-configuration">
          <MainLayout>
            <JobStageConfiguration />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/kanban-column-settings">
        <ProtectedRoute path="/kanban-column-settings">
          <MainLayout>
            <KanbanColumnSettings />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/sales-checklist-config">
        <ProtectedRoute path="/sales-checklist-config">
          <MainLayout>
            <SalesChecklistConfig />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/expense-category-config">
        <ProtectedRoute path="/expense-category-config">
          <MainLayout>
            <ExpenseCategoryConfig />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/staff-management">
        <ProtectedRoute path="/staff-management">
          <MainLayout>
            <StaffManagement />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/unauthorized">
        <ProtectedRoute path="/unauthorized">
          <Unauthorized />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function LoginRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const defaultRoute = getDefaultRoute(user?.role as UserRole | undefined);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Redirect to={defaultRoute} />;
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
