import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/shared/StatCard";
import { PriorityList } from "@/components/dashboard/PriorityList";
import { ScheduleSnapshot } from "@/components/dashboard/ScheduleSnapshot";
import { ProductionOverview } from "@/components/dashboard/ProductionOverview";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, Briefcase, DollarSign, Plus, RefreshCw } from "lucide-react";
import type { Lead, Quote, Job, ScheduleEvent, ProductionTask, Product, Payment, KanbanColumn, JobStatus, ProductionStage, Client, User as UserType } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadClient, setSelectedLeadClient] = useState<Client | null>(null);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<{
    newLeadsCount: number;
    quotesAwaitingFollowUp: number;
    jobsInProduction: number;
    jobsReadyForInstall: number;
    todayInstalls: number;
    pendingPaymentsTotal: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: scheduleEvents = [] } = useQuery<ScheduleEvent[]>({
    queryKey: ["/api/schedule"],
  });

  const { data: productionTasks = [] } = useQuery<ProductionTask[]>({
    queryKey: ["/api/production-tasks"],
  });

  const { data: lowStockProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products?lowStock=true"],
  });

  const { data: pendingPayments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments?pending=true"],
  });

  const { data: kanbanColumns = [] } = useQuery<KanbanColumn[]>({
    queryKey: ["/api/kanban-columns"],
  });

  const { data: jobStatuses = [] } = useQuery<JobStatus[]>({
    queryKey: ["/api/job-statuses"],
  });

  const { data: configuredStages = [] } = useQuery<ProductionStage[]>({
    queryKey: ["/api/production-stages"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const handleRefresh = () => {
    refetchStats();
  };

  const newLeads = leads.filter(l => l.stage === "new");
  const quotesFollowUp = quotes.filter(q => q.status === "sent");
  
  const getClientName = (clientId: string | null | undefined) => {
    if (!clientId) return "Unknown Client";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  const priorityLeads = newLeads.slice(0, 5).map((lead) => ({
    id: lead.id,
    title: `${lead.leadNumber} - ${getClientName(lead.clientId)}`,
    subtitle: `${lead.fenceStyle || "Unknown style"} - ${lead.fenceLength || "?"}m`,
    status: lead.stage as "new" | "contacted" | "quoted" | "overdue",
    timeAgo: formatTimeAgo(lead.createdAt),
    urgent: lead.stage === "new",
  }));

  const quotesFollowUpItems = quotesFollowUp.slice(0, 5).map((quote) => ({
    id: quote.id,
    title: `${quote.quoteNumber} - ${getClientName(quote.clientId)}`,
    subtitle: `Quote sent - $${parseFloat(quote.totalAmount).toLocaleString()}`,
    status: "quoted" as const,
    timeAgo: quote.sentAt ? formatTimeAgo(quote.sentAt) : "",
  }));

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));
  
  const todayEvents = scheduleEvents
    .filter(e => {
      const eventDate = new Date(e.startDate);
      return eventDate >= todayStart && eventDate <= todayEnd;
    })
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      jobNumber: event.jobId ? `JOB-${event.jobId.slice(0, 8)}` : "",
      clientName: event.title,
      address: event.description || "",
      installer: { 
        name: event.assignedTo ? "Installer" : "Unassigned", 
        initials: event.assignedTo ? "IN" : "UA" 
      },
      time: new Date(event.startDate).toLocaleTimeString("en-AU", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false 
      }),
      type: event.eventType as "install" | "delivery" | "measure" | "pickup",
    }));

  const productionColumn = kanbanColumns.find(c => c.title.toLowerCase().includes("production"));
  const productionStatusKeys = productionColumn?.statuses || [];
  
  const productionStages = configuredStages.map((stage) => {
    const jobsInStage = jobs.filter(j => j.status === stage.key);
    const totalProductionJobs = jobs.filter(j => 
      configuredStages.some(s => s.key === j.status)
    ).length;
    const progress = totalProductionJobs > 0 ? Math.round((jobsInStage.length / totalProductionJobs) * 100) : 0;
    
    return {
      statusKey: stage.key,
      label: stage.label,
      jobCount: jobsInStage.length,
      progress,
    };
  });

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: "stock" | "overdue" | "payment" | "general";
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }>>([]);

  const dynamicAlerts = [
    ...lowStockProducts.slice(0, 2).map((product, i) => ({
      id: `stock-${product.id}`,
      type: "stock" as const,
      title: "Low Stock Alert",
      message: `${product.name} - Only ${product.stockOnHand} remaining`,
      actionLabel: "View Inventory",
      onAction: () => setLocation("/inventory"),
    })),
    ...pendingPayments.slice(0, 2).map((payment) => ({
      id: `payment-${payment.id}`,
      type: "payment" as const,
      title: "Payment Pending",
      message: `${payment.invoiceNumber || "Invoice"} - $${parseFloat(payment.amount).toLocaleString()} awaiting payment`,
      actionLabel: "View Payment",
      onAction: () => setLocation("/payments"),
    })),
  ];

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter((a) => a.id !== id));
  };

  const todayFormatted = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isLoading = statsLoading || leadsLoading || quotesLoading || jobsLoading;

  const stats = {
    newLeads: dashboardStats?.newLeadsCount || newLeads.length,
    activeQuotes: dashboardStats?.quotesAwaitingFollowUp || quotesFollowUp.length,
    jobsInProgress: dashboardStats?.jobsInProduction || jobs.filter(j => 
      ["manufacturing_posts", "manufacturing_panels", "manufacturing_gates", "qa_check"].includes(j.status)
    ).length,
    pendingPayments: dashboardStats?.pendingPaymentsTotal || 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setLocation("/leads")} data-testid="button-new-lead">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="New Leads"
              value={stats.newLeads}
              description="Awaiting contact"
              icon={Users}
            />
            <StatCard
              title="Active Quotes"
              value={stats.activeQuotes}
              description="Pending response"
              icon={FileText}
            />
            <StatCard
              title="Jobs in Progress"
              value={stats.jobsInProgress}
              description="In production"
              icon={Briefcase}
            />
            <StatCard
              title="Pending Payments"
              value={`$${stats.pendingPayments.toLocaleString()}`}
              description="Awaiting payment"
              icon={DollarSign}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PriorityList
              title="New Leads"
              items={priorityLeads}
              onItemClick={(item) => {
                const lead = leads.find(l => l.id === item.id);
                if (lead) {
                  const client = clients.find(c => c.id === lead.clientId);
                  setSelectedLead(lead);
                  setSelectedLeadClient(client || null);
                  setLeadDialogOpen(true);
                }
              }}
              onViewAll={() => setLocation("/leads")}
              emptyMessage="No new leads"
            />
            <PriorityList
              title="Quotes Awaiting Follow-Up"
              items={quotesFollowUpItems}
              onItemClick={(item) => {
                const quote = quotes.find(q => q.id === item.id);
                if (quote && quote.leadId) {
                  const lead = leads.find(l => l.id === quote.leadId);
                  if (lead) {
                    const client = clients.find(c => c.id === lead.clientId);
                    setSelectedLead(lead);
                    setSelectedLeadClient(client || null);
                    setLeadDialogOpen(true);
                  }
                }
              }}
              onViewAll={() => setLocation("/leads")}
              emptyMessage="All quotes followed up"
            />
          </div>
          <ScheduleSnapshot
            date={todayFormatted}
            items={todayEvents}
            onItemClick={() => setLocation("/schedule")}
            onViewSchedule={() => setLocation("/schedule")}
          />
        </div>
        <div className="space-y-6">
          <ProductionOverview
            stages={productionStages}
            totalActiveJobs={jobs.filter(j => configuredStages.some(s => s.key === j.status)).length}
            onViewProduction={() => setLocation("/production")}
          />
          <AlertsPanel 
            alerts={dynamicAlerts.length > 0 ? dynamicAlerts : alerts} 
            onDismiss={handleDismissAlert} 
          />
        </div>
      </div>

      <LeadDetailDialog
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
        lead={selectedLead}
        client={selectedLeadClient}
        quotes={quotes.filter(q => q.leadId === selectedLead?.id)}
        users={users}
        onEditLead={() => {
          setLeadDialogOpen(false);
          if (selectedLead) {
            setLocation(`/leads?edit=${selectedLead.id}`);
          }
        }}
        onCreateQuote={() => {
          setLeadDialogOpen(false);
          if (selectedLead) {
            setLocation(`/leads?newQuote=${selectedLead.id}`);
          }
        }}
        onViewQuote={(quote) => {
          setLeadDialogOpen(false);
          setLocation(`/leads?quote=${quote.id}`);
        }}
      />
    </div>
  );
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function calculateProgress(tasks: ProductionTask[], taskType: string): number {
  const typeTasks = tasks.filter(t => t.taskType === taskType);
  if (typeTasks.length === 0) return 0;
  const completed = typeTasks.filter(t => t.status === "completed").length;
  return Math.round((completed / typeTasks.length) * 100);
}
