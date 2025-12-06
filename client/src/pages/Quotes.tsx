import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Download,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  Calendar,
  User,
  MapPin,
  MoreHorizontal,
  Plus,
  ArrowUpDown,
  ChevronDown,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QuotePLPanel } from "@/components/pl/QuotePLPanel";
import type { Quote, Client, Lead } from "@shared/schema";

type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

interface QuoteWithDetails extends Quote {
  client?: Client;
  lead?: Lead;
}

function getStatusColor(status: QuoteStatus): string {
  switch (status) {
    case "draft":
      return "bg-muted text-muted-foreground";
    case "sent":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "expired":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusIcon(status: QuoteStatus) {
  switch (status) {
    case "draft":
      return <FileText className="h-3.5 w-3.5" />;
    case "sent":
      return <Send className="h-3.5 w-3.5" />;
    case "approved":
      return <CheckCircle className="h-3.5 w-3.5" />;
    case "rejected":
      return <XCircle className="h-3.5 w-3.5" />;
    case "expired":
      return <Clock className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

export default function Quotes() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithDetails | null>(null);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("PATCH", `/api/quotes/${quoteId}`, { status: "sent", sentAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote sent",
        description: "The quote has been marked as sent.",
      });
    },
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("PATCH", `/api/quotes/${quoteId}`, { status: "approved", approvedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote approved",
        description: "The quote has been approved.",
      });
    },
  });

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "Unknown Client";
    const client = clients.find((c) => c.id === clientId);
    return client?.name || client?.companyName || "Unknown Client";
  };

  const getLeadNumber = (leadId: string | null) => {
    if (!leadId) return null;
    const lead = leads.find((l) => l.id === leadId);
    return lead?.leadNumber || null;
  };

  const quotesWithDetails: QuoteWithDetails[] = quotes.map((quote) => ({
    ...quote,
    client: clients.find((c) => c.id === quote.clientId),
    lead: leads.find((l) => l.id === quote.leadId),
  }));

  const filteredQuotes = quotesWithDetails.filter((quote) => {
    const matchesSearch =
      searchQuery === "" ||
      quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(quote.clientId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quote.siteAddress || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "trade" && quote.isTradeQuote) ||
      (typeFilter === "public" && !quote.isTradeQuote);

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "quoteNumber":
        aValue = a.quoteNumber;
        bValue = b.quoteNumber;
        break;
      case "totalAmount":
        aValue = parseFloat(a.totalAmount);
        bValue = parseFloat(b.totalAmount);
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "createdAt":
      default:
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  const stats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "draft").length,
    sent: quotes.filter((q) => q.status === "sent").length,
    approved: quotes.filter((q) => q.status === "approved").length,
    // Pipeline Forecast uses opportunity_value from active leads (not sum of all quotes)
    // This prevents inflation from multiple quotes per lead
    pipelineForecast: leads
      .filter((l) => !["won", "lost", "converted_to_job"].includes(l.stage) && l.opportunityValue)
      .reduce((sum, l) => sum + parseFloat(l.opportunityValue || "0"), 0),
    pendingValue: quotes
      .filter((q) => q.status === "sent")
      .reduce((sum, q) => sum + parseFloat(q.totalAmount), 0),
  };

  const handleExportCSV = () => {
    const headers = ["Quote Number", "Client", "Address", "Amount", "Status", "Type", "Created"];
    const rows = sortedQuotes.map((quote) => [
      quote.quoteNumber,
      getClientName(quote.clientId),
      quote.siteAddress,
      `$${parseFloat(quote.totalAmount).toLocaleString()}`,
      quote.status,
      quote.isTradeQuote ? "Trade" : "Public",
      format(new Date(quote.createdAt), "dd/MM/yyyy"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotes-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `${sortedQuotes.length} quotes exported to CSV.`,
    });
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (quotesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Quotes</h1>
          <p className="text-muted-foreground">
            Manage all quotes across your leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-quotes">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.draft} drafts, {stats.sent} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-approved-quotes">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : 0}% approval rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pipeline Forecast</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pipeline-forecast">
              ${stats.pipelineForecast.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on primary quotes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-pending-value">
              ${stats.pendingValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting client response
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>All Quotes</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                  data-testid="input-search-quotes"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => toggleSort("quoteNumber")}
                      data-testid="button-sort-quote-number"
                    >
                      Quote #
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => toggleSort("totalAmount")}
                      data-testid="button-sort-amount"
                    >
                      Amount
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => toggleSort("status")}
                      data-testid="button-sort-status"
                    >
                      Status
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => toggleSort("createdAt")}
                      data-testid="button-sort-date"
                    >
                      Created
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                        ? "No quotes match your filters"
                        : "No quotes yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedQuotes.map((quote) => (
                    <TableRow
                      key={quote.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedQuote(quote)}
                      data-testid={`row-quote-${quote.id}`}
                    >
                      <TableCell className="font-mono font-medium" data-testid={`text-quote-number-${quote.id}`}>
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell data-testid={`text-client-name-${quote.id}`}>
                        {getClientName(quote.clientId)}
                      </TableCell>
                      <TableCell>
                        {quote.leadId ? (
                          <span className="font-mono text-xs text-muted-foreground" data-testid={`text-lead-number-${quote.id}`}>
                            {getLeadNumber(quote.leadId)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={quote.siteAddress || undefined}>
                        {quote.siteAddress || "-"}
                      </TableCell>
                      <TableCell className="font-semibold" data-testid={`text-amount-${quote.id}`}>
                        ${parseFloat(quote.totalAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${getStatusColor(quote.status as QuoteStatus)}`} data-testid={`badge-status-${quote.id}`}>
                          {getStatusIcon(quote.status as QuoteStatus)}
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={quote.isTradeQuote ? "secondary" : "outline"} data-testid={`badge-type-${quote.id}`}>
                          {quote.isTradeQuote ? "Trade" : "Public"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(quote.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${quote.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedQuote(quote); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {quote.status === "draft" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sendQuoteMutation.mutate(quote.id); }}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Quote
                              </DropdownMenuItem>
                            )}
                            {quote.status === "sent" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); approveQuoteMutation.mutate(quote.id); }}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Approved
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {sortedQuotes.length} of {quotes.length} quotes
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono">{selectedQuote?.quoteNumber}</span>
              {selectedQuote && (
                <Badge className={getStatusColor(selectedQuote.status as QuoteStatus)}>
                  {selectedQuote.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" data-testid="tab-quote-details">
                  <FileText className="h-4 w-4 mr-2" />
                  Quote Details
                </TabsTrigger>
                <TabsTrigger value="pl" data-testid="tab-quote-pl">
                  <Calculator className="h-4 w-4 mr-2" />
                  P&L Analysis
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <ScrollArea className="max-h-[55vh]">
                  <div className="space-y-6 pr-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Client
                        </div>
                        <div className="font-medium" data-testid="dialog-client-name">{getClientName(selectedQuote.clientId)}</div>
                      </div>
                      {selectedQuote.leadId && (
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Lead
                          </div>
                          <div className="font-mono" data-testid="dialog-lead-number">
                            {getLeadNumber(selectedQuote.leadId)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Site Address
                      </div>
                      <div data-testid="dialog-address">{selectedQuote.siteAddress}</div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Fence Details</div>
                        <div>
                          {selectedQuote.totalLength}m × {selectedQuote.fenceHeight}mm
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Quote Type</div>
                        <Badge variant={selectedQuote.isTradeQuote ? "secondary" : "outline"}>
                          {selectedQuote.isTradeQuote ? "Trade Quote" : "Public Quote"}
                        </Badge>
                        {selectedQuote.isTradeQuote && selectedQuote.tradeDiscount && (
                          <span className="ml-2 text-sm text-green-600">
                            ({selectedQuote.tradeDiscount}% discount)
                          </span>
                        )}
                      </div>
                    </div>

                {selectedQuote.lineItems && Array.isArray(selectedQuote.lineItems) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Line Items</div>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Unit Price</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(selectedQuote.lineItems as any[]).map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.productName || item.productId}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">${item.unitPrice}</TableCell>
                                <TableCell className="text-right">${item.totalPrice}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Materials Subtotal</span>
                    <span>${parseFloat(selectedQuote.materialsSubtotal || "0").toLocaleString()}</span>
                  </div>
                  {parseFloat(selectedQuote.labourEstimate || "0") > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labour</span>
                      <span>${parseFloat(selectedQuote.labourEstimate || "0").toLocaleString()}</span>
                    </div>
                  )}
                  {selectedQuote.isTradeQuote && selectedQuote.tradeDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>Trade Discount ({selectedQuote.tradeDiscount}%)</span>
                      <span>
                        -${((parseFloat(selectedQuote.materialsSubtotal || "0") * parseFloat(selectedQuote.tradeDiscount)) / 100).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span data-testid="dialog-total-amount">${parseFloat(selectedQuote.totalAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Deposit Required ({selectedQuote.depositPercent}%)</span>
                    <span>${parseFloat(selectedQuote.depositRequired || "0").toLocaleString()}</span>
                  </div>
                </div>

                {selectedQuote.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Notes</div>
                      <div className="text-sm text-muted-foreground">{selectedQuote.notes}</div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    {format(new Date(selectedQuote.createdAt), "dd MMM yyyy HH:mm")}
                  </div>
                  {selectedQuote.sentAt && (
                    <div>
                      <span className="text-muted-foreground">Sent: </span>
                      {format(new Date(selectedQuote.sentAt), "dd MMM yyyy HH:mm")}
                    </div>
                  )}
                  {selectedQuote.approvedAt && (
                    <div>
                      <span className="text-muted-foreground">Approved: </span>
                      {format(new Date(selectedQuote.approvedAt), "dd MMM yyyy HH:mm")}
                    </div>
                  )}
                </div>

                    <div className="flex gap-2 pt-4">
                      {selectedQuote.status === "draft" && (
                        <Button
                          onClick={() => {
                            sendQuoteMutation.mutate(selectedQuote.id);
                            setSelectedQuote(null);
                          }}
                          data-testid="button-send-quote"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Quote
                        </Button>
                      )}
                      {selectedQuote.status === "sent" && (
                        <Button
                          onClick={() => {
                            approveQuoteMutation.mutate(selectedQuote.id);
                            setSelectedQuote(null);
                          }}
                          data-testid="button-approve-quote"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Approved
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setSelectedQuote(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="pl">
                <ScrollArea className="max-h-[55vh]">
                  <div className="pt-4 pr-4">
                    <QuotePLPanel 
                      quoteId={selectedQuote.id} 
                      quoteTotalAmount={selectedQuote.totalAmount} 
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
