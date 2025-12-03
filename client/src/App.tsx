import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { NewMessageBanner } from "@/components/layout/NewMessageBanner";

import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Jobs from "@/pages/Jobs";
import Clients from "@/pages/Clients";
import Production from "@/pages/Production";
import Schedule from "@/pages/Schedule";
import Inventory from "@/pages/Inventory";
import Payments from "@/pages/Payments";
import Messages from "@/pages/Messages";
import Installer from "@/pages/Installer";
import Trade from "@/pages/Trade";
import NotFound from "@/pages/not-found";

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

function Router() {
  return (
    <Switch>
      <Route path="/">
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </Route>
      <Route path="/leads">
        <MainLayout>
          <Leads />
        </MainLayout>
      </Route>
      <Route path="/jobs">
        <MainLayout>
          <Jobs />
        </MainLayout>
      </Route>
      <Route path="/clients">
        <MainLayout>
          <Clients />
        </MainLayout>
      </Route>
      <Route path="/production">
        <MainLayout>
          <Production />
        </MainLayout>
      </Route>
      <Route path="/schedule">
        <MainLayout>
          <Schedule />
        </MainLayout>
      </Route>
      <Route path="/inventory">
        <MainLayout>
          <Inventory />
        </MainLayout>
      </Route>
      <Route path="/payments">
        <MainLayout>
          <Payments />
        </MainLayout>
      </Route>
      <Route path="/messages">
        <MainLayout>
          <Messages />
        </MainLayout>
      </Route>
      <Route path="/installer">
        <InstallerLayout>
          <Installer />
        </InstallerLayout>
      </Route>
      <Route path="/trade">
        <TradeLayout>
          <Trade />
        </TradeLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="probuild-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
