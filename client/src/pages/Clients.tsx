import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientCard } from "@/components/clients/ClientCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Briefcase,
  DollarSign,
  Users,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Quote, Job, InsertClient } from "@shared/schema";

interface DisplayClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  clientType: "public" | "trade";
  tradeDiscountLevel?: number;
  totalQuotes: number;
  totalJobs: number;
  totalSpent: number;
  notes?: string;
  createdAt: string;
}

export default function Clients() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "public" | "trade">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    clientType: "public" as "public" | "trade",
    tradeDiscountLevel: "",
    notes: "",
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Created",
        description: "New client has been added successfully",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertClient> }) => {
      return apiRequest("PATCH", `/api/clients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Updated",
        description: "Client information has been updated",
      });
      setIsEditDialogOpen(false);
      setEditingClient(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Deleted",
        description: "Client has been removed",
      });
      setIsDeleteDialogOpen(false);
      setSelectedClientId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      clientType: client.clientType as "public" | "trade",
      tradeDiscountLevel: client.tradeDiscountLevel || "",
      notes: client.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !formData.name || !formData.phone) {
      toast({
        title: "Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }
    updateClientMutation.mutate({
      id: editingClient.id,
      data: {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        clientType: formData.clientType,
        tradeDiscountLevel: formData.clientType === "trade" && formData.tradeDiscountLevel
          ? (formData.tradeDiscountLevel as "gold" | "silver" | "bronze") 
          : undefined,
        notes: formData.notes || undefined,
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      clientType: "public",
      tradeDiscountLevel: "",
      notes: "",
    });
  };

  const getDiscountPercent = (level: string | null): number | undefined => {
    switch (level) {
      case "gold": return 20;
      case "silver": return 15;
      case "bronze": return 10;
      default: return undefined;
    }
  };

  const displayClients: DisplayClient[] = clients.map((client) => {
    const clientQuotes = quotes.filter(q => q.clientId === client.id);
    const clientJobs = jobs.filter(j => j.clientId === client.id);
    const completedStatuses = ["install_complete", "final_payment_pending", "completed"];
    const totalSpent = clientJobs
      .filter(j => completedStatuses.includes(j.status))
      .reduce((sum, j) => sum + parseFloat(j.totalAmount), 0);

    return {
      id: client.id,
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      clientType: client.clientType as "public" | "trade",
      tradeDiscountLevel: getDiscountPercent(client.tradeDiscountLevel),
      totalQuotes: clientQuotes.length,
      totalJobs: clientJobs.length,
      totalSpent,
      notes: client.notes || undefined,
      createdAt: new Date(client.createdAt).toLocaleDateString("en-AU", { month: "short", year: "numeric" }),
    };
  });

  const selectedClient = displayClients.find(c => c.id === selectedClientId) || null;

  const filteredClients = displayClients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === "all" || client.clientType === filterType;
    return matchesSearch && matchesType;
  });

  const handleClientClick = (client: DisplayClient) => {
    setSelectedClientId(client.id);
  };

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast({
        title: "Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }
    createClientMutation.mutate({
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      address: formData.address || undefined,
      clientType: formData.clientType,
      tradeDiscountLevel: formData.clientType === "trade" && formData.tradeDiscountLevel
        ? (formData.tradeDiscountLevel as "gold" | "silver" | "bronze") 
        : undefined,
      notes: formData.notes || undefined,
    });
  };

  if (clientsLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="w-96 border-r p-4">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-24 mb-2" />
          <Skeleton className="h-24 mb-2" />
          <Skeleton className="h-24" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-96 border-r flex flex-col">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-semibold" data-testid="text-clients-title">Clients</h1>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open("/api/export/clients", "_blank")}
                data-testid="button-export-clients"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-new-client">
                    <Plus className="h-4 w-4 mr-2" />
                    New Client
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitClient} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Client Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter name" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      data-testid="input-client-name" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        placeholder="0400 000 000" 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="input-phone" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="email@example.com" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        data-testid="input-email" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address" 
                      placeholder="Enter address" 
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      data-testid="input-address" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientType">Client Type</Label>
                      <Select 
                        value={formData.clientType}
                        onValueChange={(value: "public" | "trade") => setFormData({ ...formData, clientType: value })}
                      >
                        <SelectTrigger data-testid="select-client-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="trade">Trade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.clientType === "trade" && (
                      <div className="space-y-2">
                        <Label htmlFor="discount">Trade Level</Label>
                        <Select 
                          value={formData.tradeDiscountLevel}
                          onValueChange={(value) => setFormData({ ...formData, tradeDiscountLevel: value })}
                        >
                          <SelectTrigger data-testid="select-discount">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bronze">Bronze (10%)</SelectItem>
                            <SelectItem value="silver">Silver (15%)</SelectItem>
                            <SelectItem value="gold">Gold (20%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Add notes..." 
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      data-testid="textarea-notes" 
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createClientMutation.isPending}
                      data-testid="button-submit-client"
                    >
                      {createClientMutation.isPending ? "Adding..." : "Add Client"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-clients"
            />
          </div>
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1" data-testid="tab-all-clients">All</TabsTrigger>
              <TabsTrigger value="public" className="flex-1" data-testid="tab-public-clients">Public</TabsTrigger>
              <TabsTrigger value="trade" className="flex-1" data-testid="tab-trade-clients">Trade</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className={`cursor-pointer ${selectedClientId === client.id ? "ring-2 ring-accent rounded-md" : ""}`}
                onClick={() => handleClientClick(client)}
              >
                <ClientCard
                  client={client}
                  onCreateQuote={() => toast({ title: "Creating quote" })}
                  onAddNote={() => toast({ title: "Adding note" })}
                  onViewHistory={() => toast({ title: "Viewing history" })}
                />
              </div>
            ))}
            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No clients found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedClient ? (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <StatusBadge status={selectedClient.clientType} />
                  {selectedClient.tradeDiscountLevel && (
                    <Badge variant="secondary">
                      {selectedClient.tradeDiscountLevel}% Trade Discount
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-semibold">{selectedClient.name}</h2>
                <p className="text-muted-foreground">Client since {selectedClient.createdAt}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    const client = clients.find(c => c.id === selectedClient.id);
                    if (client) handleEditClient(client);
                  }}
                  data-testid="button-edit-client"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  data-testid="button-delete-client"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" data-testid="button-add-note">Add Note</Button>
                <Button data-testid="button-create-quote">Create Quote</Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClient.phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClient.email || "No email"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedClient.address || "No address"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Activity Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Total Quotes</span>
                    </div>
                    <span className="font-semibold">{selectedClient.totalQuotes}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>Total Jobs</span>
                    </div>
                    <span className="font-semibold">{selectedClient.totalJobs}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Total Spent</span>
                    </div>
                    <span className="font-semibold">${selectedClient.totalSpent.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedClient.notes ? (
                    <p className="text-sm text-muted-foreground">{selectedClient.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No notes added</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="quotes">
              <TabsList>
                <TabsTrigger value="quotes" data-testid="tab-quotes">Quotes</TabsTrigger>
                <TabsTrigger value="jobs" data-testid="tab-jobs">Jobs</TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="quotes" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    {quotes.filter(q => q.clientId === selectedClient.id).length > 0 ? (
                      <div className="space-y-2">
                        {quotes.filter(q => q.clientId === selectedClient.id).map((quote) => (
                          <div key={quote.id} className="flex items-center justify-between p-3 border rounded hover-elevate cursor-pointer">
                            <div>
                              <p className="font-mono text-sm">{quote.quoteNumber}</p>
                              <p className="text-sm text-muted-foreground">{quote.siteAddress}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${parseFloat(quote.totalAmount).toLocaleString()}</p>
                              <StatusBadge status={quote.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No quotes yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    {jobs.filter(j => j.clientId === selectedClient.id).length > 0 ? (
                      <div className="space-y-2">
                        {jobs.filter(j => j.clientId === selectedClient.id).map((job) => (
                          <div key={job.id} className="flex items-center justify-between p-3 border rounded hover-elevate cursor-pointer">
                            <div>
                              <p className="font-mono text-sm">{job.jobNumber}</p>
                              <p className="text-sm text-muted-foreground">{job.siteAddress}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${parseFloat(job.totalAmount).toLocaleString()}</p>
                              <StatusBadge status={job.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No jobs yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Documents will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a client to view details</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Client Name</Label>
              <Input 
                id="edit-name" 
                placeholder="Enter name" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-client-name" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input 
                  id="edit-phone" 
                  placeholder="0400 000 000" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-edit-phone" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  placeholder="email@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-edit-email" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input 
                id="edit-address" 
                placeholder="Enter address" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-edit-address" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-clientType">Client Type</Label>
                <Select 
                  value={formData.clientType}
                  onValueChange={(value: "public" | "trade") => setFormData({ ...formData, clientType: value })}
                >
                  <SelectTrigger data-testid="select-edit-client-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="trade">Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.clientType === "trade" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-discount">Trade Level</Label>
                  <Select 
                    value={formData.tradeDiscountLevel}
                    onValueChange={(value) => setFormData({ ...formData, tradeDiscountLevel: value })}
                  >
                    <SelectTrigger data-testid="select-edit-discount">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bronze">Bronze (10%)</SelectItem>
                      <SelectItem value="silver">Silver (15%)</SelectItem>
                      <SelectItem value="gold">Gold (20%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea 
                id="edit-notes" 
                placeholder="Add notes..." 
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="textarea-edit-notes" 
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateClientMutation.isPending}
                data-testid="button-save-client"
              >
                {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedClient?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClientId && deleteClientMutation.mutate(selectedClientId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
