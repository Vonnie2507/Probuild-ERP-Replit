import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { useLocation } from "wouter";
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
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Receipt,
  Eye,
  Link2,
  Copy,
  UserCircle,
  Calendar,
  Tag,
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
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

function AccountCard({ account, onSync, isSyncing }: { account: BankAccount; onSync: (id: string) => void; isSyncing?: boolean }) {
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
            disabled={isSyncing}
            data-testid={`button-sync-${account.id}`}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
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

function ConnectionCard({ connection, onRefresh }: { connection: BankConnection; onRefresh: (id: string) => void }) {
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    processing: "bg-yellow-100 text-yellow-800",
    inactive: "bg-gray-100 text-gray-800",
    invalid: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{connection.institutionName || "Bank Connection"}</h4>
              <p className="text-xs text-muted-foreground">
                {connection.basiqConsentId ? `Consent: ${connection.basiqConsentId.slice(0, 8)}...` : "Pending setup"}
              </p>
            </div>
          </div>
          <Badge className={statusColors[connection.status || "inactive"]}>
            {connection.status}
          </Badge>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {connection.lastSyncedAt 
              ? `Last synced: ${format(new Date(connection.lastSyncedAt), "dd MMM, h:mm a")}`
              : "Never synced"
            }
            {connection.consentExpiresAt && (
              <span className="ml-2">
                | Expires: {format(new Date(connection.consentExpiresAt), "dd MMM yyyy")}
              </span>
            )}
          </div>
          {connection.status === "active" && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onRefresh(connection.id)}
              data-testid={`button-refresh-${connection.id}`}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Staff transaction summary interface
interface StaffSummary {
  staffId: string;
  staffName: string;
  totalSpent: number;
  transactionCount: number;
}

// Staff Expenses Tab Component
function StaffExpensesTab() {
  const { toast } = useToast();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  const { data: staffSummary = [], isLoading: summaryLoading } = useQuery<StaffSummary[]>({
    queryKey: ["/api/financial/staff-summary"],
  });
  
  const { data: staffTransactions = [], isLoading: transactionsLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/financial/staff", selectedStaffId, "transactions"],
    enabled: !!selectedStaffId,
  });

  const autoAllocateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/financial/auto-allocate", { method: "POST" });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Auto-Allocation Complete",
        description: data.message || `Allocated ${data.allocatedCount} transactions`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/staff-summary"] });
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Allocation Failed",
        description: error.message || "Could not auto-allocate transactions",
        variant: "destructive",
      });
    },
  });

  if (summaryLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Expenses
          </h3>
          <p className="text-sm text-muted-foreground">
            View and allocate transactions by staff member
          </p>
        </div>
        <Button
          onClick={() => autoAllocateMutation.mutate()}
          disabled={autoAllocateMutation.isPending}
          data-testid="button-auto-allocate"
        >
          {autoAllocateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Auto-Allocate by Card
        </Button>
      </div>

      {staffSummary.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Staff Allocations Yet</p>
              <p className="text-sm mt-1">
                Assign staff bank card numbers to auto-allocate transactions, or manually allocate them.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffSummary.map((staff) => (
            <Card 
              key={staff.staffId}
              className={`cursor-pointer hover-elevate transition-all ${selectedStaffId === staff.staffId ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedStaffId(selectedStaffId === staff.staffId ? null : staff.staffId)}
              data-testid={`card-staff-${staff.staffId}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{staff.staffName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {staff.transactionCount} transaction{staff.transactionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(staff.totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">Total spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedStaffId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Transactions for {staffSummary.find(s => s.staffId === selectedStaffId)?.staffName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : staffTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No transactions found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {tx.postDate ? format(new Date(tx.postDate), "dd MMM yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm truncate max-w-[200px]">
                          {tx.merchantName || tx.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {tx.category || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.direction === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.direction === 'debit' ? '-' : '+'}{formatCurrency(Math.abs(parseFloat(tx.amount || '0')))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Receipt Inbox Tab Component
interface ReceiptSubmission {
  id: string;
  staffId: string | null;
  imageUrl: string | null;
  photoUrl: string | null;
  expenseCategoryId: string | null;
  actualAmount: string | null;
  amount: string | null;
  merchantName: string | null;
  purchaseDate: string | null;
  notes: string | null;
  status: string;
  submissionToken: string;
  submittedAt: string | null;
  createdAt: string;
}

function ReceiptInboxTab() {
  const { toast } = useToast();
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptSubmission | null>(null);
  const [showCreateLinkDialog, setShowCreateLinkDialog] = useState(false);
  const [linkDescription, setLinkDescription] = useState("");
  const [linkAmount, setLinkAmount] = useState("");

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery<ReceiptSubmission[]>({
    queryKey: ["/api/receipts"],
  });

  const { data: pendingReceipts = [] } = useQuery<ReceiptSubmission[]>({
    queryKey: ["/api/receipts/pending"],
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: { description: string; amount?: string }) => {
      return apiRequest("/api/receipts/create-link", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Receipt Link Created",
        description: "Share this link with your staff member to upload their receipt.",
      });
      // Copy URL to clipboard
      if (data.submissionUrl) {
        navigator.clipboard.writeText(data.submissionUrl);
        toast({
          title: "Link Copied",
          description: "The receipt submission link has been copied to your clipboard.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      setShowCreateLinkDialog(false);
      setLinkDescription("");
      setLinkAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Link",
        description: error.message || "Could not create receipt link",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      submitted: "bg-blue-100 text-blue-800",
      reviewed: "bg-green-100 text-green-800",
      matched: "bg-purple-100 text-purple-800",
      rejected: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Inbox
          </h3>
          <p className="text-sm text-muted-foreground">
            Review staff receipt submissions and match to transactions
          </p>
        </div>
        <Button
          onClick={() => setShowCreateLinkDialog(true)}
          data-testid="button-create-receipt-link"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Create Receipt Link
        </Button>
      </div>

      {/* Pending count alert */}
      {pendingReceipts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Pending Receipts</AlertTitle>
          <AlertDescription>
            You have {pendingReceipts.length} receipt{pendingReceipts.length !== 1 ? 's' : ''} waiting for submission or review.
          </AlertDescription>
        </Alert>
      )}

      {receiptsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Receipts Yet</p>
              <p className="text-sm mt-1">
                Create a receipt link to share with staff for uploading receipts.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id} data-testid={`row-receipt-${receipt.id}`}>
                  <TableCell className="text-sm">
                    {format(new Date(receipt.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm truncate max-w-[200px]">
                      {receipt.merchantName || receipt.notes || "No description"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {receipt.actualAmount || receipt.amount ? formatCurrency(receipt.actualAmount || receipt.amount) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(receipt.status)}>
                      {receipt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(receipt.imageUrl || receipt.photoUrl) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(receipt.imageUrl || receipt.photoUrl || '', '_blank')}
                          data-testid={`button-view-receipt-${receipt.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {receipt.status === 'pending' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const url = `${window.location.origin}/submit-receipt/${receipt.submissionToken}`;
                            navigator.clipboard.writeText(url);
                            toast({ title: "Link copied to clipboard" });
                          }}
                          data-testid={`button-copy-link-${receipt.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Receipt Link Dialog */}
      <Dialog open={showCreateLinkDialog} onOpenChange={setShowCreateLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Receipt Submission Link</DialogTitle>
            <DialogDescription>
              Generate a shareable link for staff to upload their receipt photo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="linkDescription">Description (optional)</Label>
              <Input
                id="linkDescription"
                placeholder="e.g., Fuel receipt for site visit"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                data-testid="input-link-description"
              />
            </div>
            <div>
              <Label htmlFor="linkAmount">Expected Amount (optional)</Label>
              <Input
                id="linkAmount"
                type="number"
                step="0.01"
                placeholder="e.g., 85.50"
                value={linkAmount}
                onChange={(e) => setLinkAmount(e.target.value)}
                data-testid="input-link-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLinkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createLinkMutation.mutate({
                description: linkDescription,
                amount: linkAmount || undefined,
              })}
              disabled={createLinkMutation.isPending}
              data-testid="button-generate-link"
            >
              {createLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Generate Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [businessName, setBusinessName] = useState("");
  const [businessIdNo, setBusinessIdNo] = useState("");
  const [businessIdNoType, setBusinessIdNoType] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [organisationType, setOrganisationType] = useState("");
  const [sharingDuration, setSharingDuration] = useState("");
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  // Check URL for success/error from Basiq callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const consentId = params.get("consentId");

    if (success === "true") {
      toast({
        title: "Bank Connected Successfully",
        description: consentId 
          ? "Your bank account has been connected via Open Banking."
          : "Bank connection was successful.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/overview"] });
      // Clean up URL
      window.history.replaceState({}, "", "/financial");
    } else if (error) {
      toast({
        title: "Connection Failed",
        description: error === "callback_failed" 
          ? "There was an issue completing the bank connection."
          : error,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/financial");
    }
  }, [toast]);

  const { data: overview, isLoading: overviewLoading } = useQuery<FinancialOverview>({
    queryKey: ["/api/financial/overview"],
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ["/api/financial/accounts"],
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<BankConnection[]>({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/overview"] });
      toast({ title: "Sync Complete", description: "Transactions have been synced successfully." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Sync Failed", 
        description: error.message || "Failed to sync transactions.",
        variant: "destructive" 
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest("POST", `/api/financial/connections/${connectionId}/refresh`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/accounts"] });
      toast({ title: "Connection Refreshed", description: "Account data has been updated." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Refresh Failed", 
        description: error.message || "Failed to refresh connection.",
        variant: "destructive" 
      });
    },
  });

  // CDR Consent Flow - Create consent and redirect to Basiq Connect
  const connectBankMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/financial/connect-bank", {
        businessName,
        businessIdNo,
        businessIdNoType,
        businessAddress,
        organisationType,
        sharingDuration: parseInt(sharingDuration) || 365,
        email
      });
    },
    onSuccess: (data: any) => {
      setShowConnectDialog(false);
      setBusinessName("");
      setBusinessIdNo("");
      setBusinessIdNoType("");
      setBusinessAddress("");
      setOrganisationType("");
      setSharingDuration("");
      setEmail("");
      
      if (data.connectUrl) {
        toast({ 
          title: "Opening Bank Connection", 
          description: "You will be redirected to your bank's secure login to authorize access." 
        });
        // Open in same window to allow redirect back
        window.location.href = data.connectUrl;
      } else {
        toast({ 
          title: "Connection Started", 
          description: "Bank connection process has begun.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Connection Failed", 
        description: error.message || "Failed to start bank connection.",
        variant: "destructive" 
      });
    },
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
            Connect Bank Account
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts" data-testid="tab-accounts">Accounts ({accounts.length})</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="staff" data-testid="tab-staff">Staff Expenses</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="receipts" data-testid="tab-receipts">Receipt Inbox</TabsTrigger>
          )}
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
                  isSyncing={syncMutation.isPending}
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
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : transactions.length > 0 ? (
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
                    {transactions.map((tx) => (
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
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Secure Open Banking</AlertTitle>
              <AlertDescription>
                Bank connections use CDR (Consumer Data Right) Open Banking. Your credentials are never stored in this system - 
                you authenticate directly with your bank via their secure login.
              </AlertDescription>
            </Alert>

            {connectionsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            ) : connections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.map(connection => (
                  <ConnectionCard 
                    key={connection.id} 
                    connection={connection}
                    onRefresh={(id) => refreshMutation.mutate(id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <EmptyState type="connections" />
                  <div className="flex justify-center mt-4">
                    <Button onClick={() => setShowConnectDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Connect Your First Bank
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Staff Expenses Tab */}
        {isAdmin && (
          <TabsContent value="staff" className="mt-6 space-y-4">
            <StaffExpensesTab />
          </TabsContent>
        )}

        {/* Receipt Inbox Tab */}
        {isAdmin && (
          <TabsContent value="receipts" className="mt-6 space-y-4">
            <ReceiptInboxTab />
          </TabsContent>
        )}
      </Tabs>

      {/* Connect Bank Dialog - Simple CDR Consent Flow */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Connect Bank Account
            </DialogTitle>
            <DialogDescription>
              Securely connect your business bank account using Open Banking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Secure CDR Open Banking</AlertTitle>
              <AlertDescription className="text-sm">
                You will be redirected to your bank&apos;s secure login page to authorize access. 
                Your credentials are never shared with us.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label htmlFor="businessName" className="text-sm font-medium">Business Name</Label>
                <Input 
                  id="businessName"
                  placeholder="e.g., Probuild PVC" 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  data-testid="input-business-name"
                />
              </div>
              
              <div>
                <Label htmlFor="businessIdNo" className="text-sm font-medium">ABN (Australian Business Number)</Label>
                <Input 
                  id="businessIdNo"
                  placeholder="e.g., 29 688 327 479" 
                  value={businessIdNo}
                  onChange={(e) => setBusinessIdNo(e.target.value)}
                  data-testid="input-business-id"
                />
              </div>

              <div>
                <Label htmlFor="businessIdNoType" className="text-sm font-medium">Business ID Type</Label>
                <Input 
                  id="businessIdNoType"
                  placeholder="e.g., ABN" 
                  value={businessIdNoType}
                  onChange={(e) => setBusinessIdNoType(e.target.value)}
                  data-testid="input-business-id-type"
                />
              </div>

              <div>
                <Label htmlFor="businessAddress" className="text-sm font-medium">Business Address</Label>
                <Input 
                  id="businessAddress"
                  placeholder="e.g., 123 Main Street, Perth WA 6000" 
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  data-testid="input-business-address"
                />
              </div>

              <div>
                <Label htmlFor="organisationType" className="text-sm font-medium">Organisation Type</Label>
                <Input 
                  id="organisationType"
                  placeholder="e.g., COMPANY" 
                  value={organisationType}
                  onChange={(e) => setOrganisationType(e.target.value)}
                  data-testid="input-organisation-type"
                />
              </div>

              <div>
                <Label htmlFor="sharingDuration" className="text-sm font-medium">Sharing Duration (days)</Label>
                <Input 
                  id="sharingDuration"
                  placeholder="e.g., 365" 
                  value={sharingDuration}
                  onChange={(e) => setSharingDuration(e.target.value)}
                  data-testid="input-sharing-duration"
                  type="number"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input 
                  id="email"
                  placeholder="e.g., vonnie@probuildpvc.com.au" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                  type="email"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Data Access Requested</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Account details and balances</li>
                <li>Transaction history</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Access is valid for 365 days and can be revoked at any time.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConnectDialog(false);
                setBusinessName("");
                setBusinessIdNo("");
                setBusinessIdNoType("");
                setBusinessAddress("");
                setOrganisationType("");
                setSharingDuration("");
                setEmail("");
              }}
              className="w-full sm:w-auto"
              data-testid="button-cancel-connection"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => connectBankMutation.mutate()}
              disabled={connectBankMutation.isPending || !businessName || !businessIdNo || !businessIdNoType || !businessAddress || !organisationType || !sharingDuration || !email}
              className="w-full sm:w-auto"
              data-testid="button-start-connection"
            >
              {connectBankMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect to Bank
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
