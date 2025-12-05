import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Landmark,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Building2,
  Wallet,
  DollarSign,
  Clock,
  Loader2,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { BankAccount, BankConnection, BankTransaction } from "@shared/schema";

interface FinancialOverview {
  totalBalance: number;
  totalAvailable: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  accountCount: number;
  connectionCount: number;
  recentTransactions: BankTransaction[];
  lastSyncedAt: string | null;
}

interface Institution {
  id: string;
  name: string;
  shortName?: string;
  institutionType: string;
  tier?: number;
  logo?: { links?: { full?: string } };
}

const connectionFormSchema = z.object({
  email: z.string().email("Valid email required"),
  mobile: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num == null || isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(num);
}

function OverviewCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendValue,
  description,
  loading 
}: { 
  title: string; 
  value: string; 
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
  description?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
        {trend && trendValue && (
          <p className={`text-xs flex items-center gap-1 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trendValue}
          </p>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function AccountCard({ account, onSync }: { account: BankAccount; onSync: (id: string) => void }) {
  const getAccountIcon = (type: string | null) => {
    switch (type) {
      case "savings": return Wallet;
      case "credit_card": return CreditCard;
      case "investment": return TrendingUp;
      default: return Landmark;
    }
  };
  const Icon = getAccountIcon(account.accountType);

  return (
    <Card className="hover-elevate cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium" data-testid={`account-name-${account.id}`}>{account.name}</h4>
              <p className="text-sm text-muted-foreground">
                {account.accountNumberMasked || "••••••"}
                {account.bsbMasked && ` | BSB ${account.bsbMasked}`}
              </p>
            </div>
          </div>
          <Badge variant="outline">{account.accountType?.replace("_", " ")}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-semibold" data-testid={`account-balance-${account.id}`}>
              {formatCurrency(account.balance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(account.availableFunds)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {account.lastUpdatedAt ? `Updated ${format(new Date(account.lastUpdatedAt), "dd MMM, h:mm a")}` : "Never synced"}
          </p>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={(e) => { e.stopPropagation(); onSync(account.id); }}
            data-testid={`button-sync-${account.id}`}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionRow({ transaction }: { transaction: BankTransaction }) {
  const isCredit = transaction.direction === "credit";
  
  return (
    <TableRow data-testid={`transaction-row-${transaction.id}`}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isCredit ? "bg-green-100" : "bg-red-100"}`}>
            {isCredit ? (
              <ArrowDownRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{transaction.merchantName || transaction.description?.slice(0, 40)}</p>
            <p className="text-xs text-muted-foreground">{transaction.category || "Uncategorized"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {transaction.postDate ? format(new Date(transaction.postDate), "dd MMM yyyy") : "-"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
        {transaction.description}
      </TableCell>
      <TableCell className={`text-right font-medium ${isCredit ? "text-green-600" : "text-red-600"}`}>
        {isCredit ? "+" : "-"}{formatCurrency(Math.abs(parseFloat(transaction.amount || "0")))}
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ type }: { type: "accounts" | "transactions" | "connections" }) {
  const messages = {
    accounts: {
      title: "No Bank Accounts",
      description: "Connect your bank to see account balances and transactions.",
      icon: CreditCard,
    },
    transactions: {
      title: "No Transactions Yet",
      description: "Transactions will appear here once you connect a bank account and sync.",
      icon: DollarSign,
    },
    connections: {
      title: "No Bank Connections",
      description: "Connect to your bank using secure Open Banking to get started.",
      icon: Building2,
    },
  };

  const { title, description, icon: Icon } = messages[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
    </div>
  );
}

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const isAdmin = user?.role === "admin";

  const form = useForm<z.infer<typeof connectionFormSchema>>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      email: "",
      mobile: "",
      firstName: "",
      lastName: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (showConnectDialog) {
      form.reset({
        email: "",
        mobile: "",
        firstName: "",
        lastName: "",
      });
    }
  }, [showConnectDialog, form]);

  const { data: overview, isLoading: overviewLoading } = useQuery<FinancialOverview>({
    queryKey: ["/api/financial/overview"],
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ["/api/financial/accounts"],
  });

  const { data: connections = [] } = useQuery<BankConnection[]>({
    queryKey: ["/api/financial/connections"],
    enabled: isAdmin,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/financial/transactions", { search: searchQuery, direction: directionFilter !== "all" ? directionFilter : undefined }],
  });

  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return apiRequest("POST", `/api/financial/accounts/${accountId}/sync`, {});
    },
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/overview"] });
      toast({ title: "Sync Complete", description: "Transactions have been synced successfully." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Sync Failed", 
        description: error.message || "Failed to sync transactions. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof connectionFormSchema>) => {
      const response = await apiRequest("POST", "/api/financial/connections", {
        email: data.email,
        mobile: data.mobile || undefined,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/connections"] });
      setShowConnectDialog(false);
      form.reset();
      
      // Redirect to Basiq Consent UI if we have a consent URL
      if (data.consentUrl) {
        toast({ 
          title: "Redirecting to Bank Connection", 
          description: "Opening secure portal to connect your bank..." 
        });
        window.open(data.consentUrl, "_blank");
      } else {
        toast({ 
          title: "Bank Connection Initiated", 
          description: "Your bank is being connected. This may take a few moments." 
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Connection Failed", 
        description: error.message || "Failed to start bank connection. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const onConnectSubmit = (data: z.infer<typeof connectionFormSchema>) => {
    connectMutation.mutate(data);
  };

  const filteredTransactions = transactions.filter(tx => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches = 
        tx.description?.toLowerCase().includes(query) ||
        tx.merchantName?.toLowerCase().includes(query) ||
        tx.category?.toLowerCase().includes(query);
      if (!matches) return false;
    }
    if (directionFilter !== "all" && tx.direction !== directionFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-financial">
            <Landmark className="h-6 w-6" />
            Banking
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor your bank accounts and transactions via secure Open Banking
          </p>
        </div>
        {isAdmin && (
          <Button 
            data-testid="button-connect-bank" 
            onClick={() => setShowConnectDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect Bank
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts" data-testid="tab-accounts">Accounts ({accounts.length})</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="connections" data-testid="tab-connections">Connections</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <OverviewCard
              title="Total Balance"
              value={formatCurrency(overview?.totalBalance)}
              icon={DollarSign}
              loading={overviewLoading}
            />
            <OverviewCard
              title="Available Funds"
              value={formatCurrency(overview?.totalAvailable)}
              icon={Wallet}
              loading={overviewLoading}
            />
            <OverviewCard
              title="Monthly Income"
              value={formatCurrency(overview?.monthlyIncome)}
              icon={TrendingUp}
              trend="up"
              trendValue="Credits (30 days)"
              loading={overviewLoading}
            />
            <OverviewCard
              title="Monthly Expenses"
              value={formatCurrency(overview?.monthlyExpenses)}
              icon={TrendingDown}
              trend="down"
              trendValue="Debits (30 days)"
              loading={overviewLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest activity across all accounts</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("transactions")}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                ) : overview?.recentTransactions && overview.recentTransactions.length > 0 ? (
                  <Table>
                    <TableBody>
                      {overview.recentTransactions.map((tx) => (
                        <TransactionRow key={tx.id} transaction={tx} />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState type="transactions" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accounts</CardTitle>
                <CardDescription>Connected bank accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accountsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : accounts.length > 0 ? (
                  accounts.slice(0, 3).map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                          <Landmark className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.accountType?.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(account.balance)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState type="accounts" />
                )}
                {accounts.length > 3 && (
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    size="sm"
                    onClick={() => setActiveTab("accounts")}
                  >
                    View all {accounts.length} accounts
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          {accountsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(account => (
                <AccountCard 
                  key={account.id} 
                  account={account} 
                  onSync={(id) => syncMutation.mutate(id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <EmptyState type="accounts" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle>All Transactions</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[250px]"
                      data-testid="input-search-transactions"
                    />
                  </div>
                  <Select value={directionFilter} onValueChange={setDirectionFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="select-direction-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="credit">Credits Only</SelectItem>
                      <SelectItem value="debit">Debits Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TransactionRow key={tx.id} transaction={tx} />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState type="transactions" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="connections" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bank Connections</CardTitle>
                <CardDescription>
                  Manage your Open Banking connections. Connections require periodic re-authentication.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connections.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Synced</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.map((conn) => (
                        <TableRow key={conn.id} data-testid={`connection-row-${conn.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{conn.institutionName || conn.institutionId}</p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {conn.basiqConnectionId?.slice(0, 8) || "Pending"}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={conn.status === "active" ? "default" : "secondary"}
                              data-testid={`connection-status-${conn.id}`}
                            >
                              {conn.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {conn.lastSyncedAt ? format(new Date(conn.lastSyncedAt), "dd MMM yyyy, h:mm a") : "Never"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(conn.createdAt), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState type="connections" />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Connect Bank Account
            </DialogTitle>
            <DialogDescription>
              Enter your email to start the secure bank connection process. You'll be redirected to Basiq's secure portal to complete the connection.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onConnectSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@probuildpvc.com.au"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormDescription>
                      Used to identify your bank connection
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+61400000000"
                        {...field}
                        data-testid="input-mobile"
                      />
                    </FormControl>
                    <FormDescription>
                      Australian format: +61XXXXXXXXX
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Secure Connection Process:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click "Start Connection" below</li>
                  <li>You'll be redirected to Basiq's secure portal</li>
                  <li>Select your bank and enter your credentials there</li>
                  <li>Return here to see your connected accounts</li>
                </ol>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowConnectDialog(false)}
                  data-testid="button-cancel-connect"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={connectMutation.isPending}
                  data-testid="button-submit-connect"
                >
                  {connectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Start Connection
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
