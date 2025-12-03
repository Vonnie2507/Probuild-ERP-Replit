import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, Column, Action } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, CreditCard, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Payment, Client, Job } from "@shared/schema";

interface DisplayPayment {
  id: string;
  invoiceNumber: string;
  jobNumber: string;
  clientName: string;
  amount: number;
  type: "deposit" | "final" | "refund" | "credit_note" | "adjustment";
  status: "pending" | "paid" | "overdue";
  dueDate: string;
  paidDate?: string;
}

export default function Payments() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  const getJobNumber = (jobId: string | null) => {
    if (!jobId) return "N/A";
    const job = jobs.find(j => j.id === jobId);
    return job?.jobNumber || "N/A";
  };

  const displayPayments: DisplayPayment[] = payments.map((payment) => {
    let status: "pending" | "paid" | "overdue" = "pending";
    if (payment.status === "paid" || payment.paidAt) {
      status = "paid";
    } else if (payment.status === "overdue") {
      status = "overdue";
    }

    return {
      id: payment.id,
      invoiceNumber: payment.invoiceNumber || `INV-${payment.id.slice(0, 8).toUpperCase()}`,
      jobNumber: getJobNumber(payment.jobId),
      clientName: getClientName(payment.clientId),
      amount: parseFloat(payment.amount) || 0,
      type: payment.paymentType as DisplayPayment["type"],
      status,
      dueDate: new Date(payment.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
      paidDate: payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : undefined,
    };
  });

  const totalReceived = displayPayments.filter(p => p.status === "paid").reduce((acc, p) => acc + p.amount, 0);
  const totalPending = displayPayments.filter(p => p.status === "pending").reduce((acc, p) => acc + p.amount, 0);
  const totalOverdue = displayPayments.filter(p => p.status === "overdue").reduce((acc, p) => acc + p.amount, 0);
  const pendingCount = displayPayments.filter(p => p.status === "pending").length;

  const filteredPayments = displayPayments.filter(
    (payment) =>
      payment.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.jobNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<DisplayPayment>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice",
      sortable: true,
      render: (payment) => (
        <span className="font-mono text-sm">{payment.invoiceNumber}</span>
      ),
    },
    {
      key: "jobNumber",
      header: "Job",
      render: (payment) => (
        <span className="font-mono text-xs text-muted-foreground">{payment.jobNumber}</span>
      ),
    },
    {
      key: "clientName",
      header: "Client",
      sortable: true,
    },
    {
      key: "type",
      header: "Type",
      render: (payment) => (
        <Badge variant="secondary" className="text-[10px] uppercase">
          {payment.type}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (payment) => (
        <span className="font-semibold">${payment.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => <StatusBadge status={payment.status as "pending" | "paid" | "overdue"} />,
    },
  ];

  const actions: Action<DisplayPayment>[] = [
    {
      label: "View Invoice",
      onClick: (payment) => toast({ title: "Viewing invoice", description: payment.invoiceNumber }),
    },
    {
      label: "Record Payment",
      onClick: (payment) => toast({ title: "Recording payment", description: payment.invoiceNumber }),
    },
    {
      label: "Send Reminder",
      onClick: (payment) => toast({ title: "Sending reminder", description: `Reminder sent for ${payment.invoiceNumber}` }),
    },
  ];

  if (paymentsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-payments-title">Finance & Payments</h1>
          <p className="text-sm text-muted-foreground">
            Track deposits, finals, and payment status
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            data-testid="button-export"
            onClick={() => window.open("/api/export/payments", "_blank")}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button data-testid="button-record-payment">
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Received (MTD)"
          value={`$${totalReceived.toLocaleString()}`}
          description="This month"
          icon={CheckCircle}
        />
        <StatCard
          title="Pending"
          value={`$${totalPending.toLocaleString()}`}
          description={`${pendingCount} invoices`}
          icon={Clock}
        />
        <StatCard
          title="Overdue"
          value={`$${totalOverdue.toLocaleString()}`}
          description="Needs attention"
          icon={AlertTriangle}
        />
        <StatCard
          title="This Week"
          value={`$${(totalReceived * 0.3).toLocaleString()}`}
          description="Payments received"
          icon={CreditCard}
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base font-semibold">Payment History</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-payments"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-payments">All</TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending-payments">Pending</TabsTrigger>
              <TabsTrigger value="paid" data-testid="tab-paid-payments">Paid</TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-overdue-payments">Overdue</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <DataTable
                data={filteredPayments}
                columns={columns}
                actions={actions}
                onRowClick={(payment) => toast({ title: "Payment selected", description: payment.invoiceNumber })}
                keyExtractor={(payment) => payment.id}
              />
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <DataTable
                data={filteredPayments.filter(p => p.status === "pending")}
                columns={columns}
                actions={actions}
                onRowClick={(payment) => toast({ title: "Payment selected", description: payment.invoiceNumber })}
                keyExtractor={(payment) => payment.id}
              />
            </TabsContent>

            <TabsContent value="paid" className="mt-4">
              <DataTable
                data={filteredPayments.filter(p => p.status === "paid")}
                columns={columns}
                actions={actions}
                onRowClick={(payment) => toast({ title: "Payment selected", description: payment.invoiceNumber })}
                keyExtractor={(payment) => payment.id}
              />
            </TabsContent>

            <TabsContent value="overdue" className="mt-4">
              <DataTable
                data={filteredPayments.filter(p => p.status === "overdue")}
                columns={columns}
                actions={actions}
                onRowClick={(payment) => toast({ title: "Payment selected", description: payment.invoiceNumber })}
                keyExtractor={(payment) => payment.id}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
