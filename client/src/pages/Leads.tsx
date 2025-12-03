import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter, LayoutGrid, List, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, Client, InsertLead } from "@shared/schema";

type LeadStatus = "new" | "contacted" | "quoted" | "approved" | "declined";

interface KanbanLead {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  source: string;
  fenceStyle: string;
  leadType: "public" | "trade";
  status: LeadStatus;
  assignedTo: {
    name: string;
    initials: string;
  };
  createdAt: string;
}

export default function Leads() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuoteBuilderOpen, setIsQuoteBuilderOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<KanbanLead | null>(null);
  const [selectedLeadForQuote, setSelectedLeadForQuote] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    clientName: "",
    phone: "",
    email: "",
    address: "",
    leadType: "public" as "public" | "trade",
    source: "website" as "website" | "google" | "referral" | "phone" | "walk_in",
    description: "",
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      return apiRequest("POST", "/api/leads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Lead Created",
        description: "New lead has been added successfully",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Updated",
        description: "Lead has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingLead(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Deleted",
        description: "Lead has been removed",
      });
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const handleEditLead = (lead: KanbanLead) => {
    const originalLead = leads.find(l => l.id === lead.id);
    if (originalLead) {
      setEditingLead(originalLead);
      setFormData({
        clientName: lead.clientName,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        leadType: lead.leadType,
        source: (originalLead.source as typeof formData.source) || "website",
        description: originalLead.description || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleDeleteLead = (lead: KanbanLead) => {
    setLeadToDelete(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    
    updateLeadMutation.mutate({
      id: editingLead.id,
      data: {
        source: formData.source,
        leadType: formData.leadType,
        description: formData.description,
        siteAddress: formData.address,
      },
    });
  };

  const resetForm = () => {
    setFormData({
      clientName: "",
      phone: "",
      email: "",
      address: "",
      leadType: "public",
      source: "website",
      description: "",
    });
  };

  const getClientName = (clientId: string | null): string => {
    if (!clientId) return "Unknown";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown";
  };

  const getClientPhone = (clientId: string | null): string => {
    if (!clientId) return "";
    const client = clients.find(c => c.id === clientId);
    return client?.phone || "";
  };

  const getClientEmail = (clientId: string | null): string => {
    if (!clientId) return "";
    const client = clients.find(c => c.id === clientId);
    return client?.email || "";
  };

  const kanbanLeads: KanbanLead[] = leads.map((lead) => ({
    id: lead.id,
    clientName: getClientName(lead.clientId),
    phone: getClientPhone(lead.clientId),
    email: getClientEmail(lead.clientId),
    address: lead.siteAddress || "",
    source: lead.source || "website",
    fenceStyle: `${lead.fenceStyle || "Unknown"} - ${lead.fenceLength || "?"}m`,
    leadType: lead.leadType as "public" | "trade",
    status: mapStageToStatus(lead.stage),
    assignedTo: { name: "Dave", initials: "DV" },
    createdAt: formatTimeAgo(lead.createdAt),
  }));

  const handleLeadClick = (lead: KanbanLead) => {
    toast({
      title: "Lead Selected",
      description: `Opening ${lead.clientName}'s details`,
    });
  };

  const handleConvertToQuote = (lead: KanbanLead) => {
    const originalLead = leads.find(l => l.id === lead.id);
    if (originalLead) {
      setSelectedLeadForQuote(originalLead);
      setIsQuoteBuilderOpen(true);
    }
  };

  const handleQuoteCreated = () => {
    if (selectedLeadForQuote) {
      updateLeadMutation.mutate({
        id: selectedLeadForQuote.id,
        data: { stage: "quote_sent" },
      });
    }
    setSelectedLeadForQuote(null);
  };

  const handleAddLead = () => {
    setIsDialogOpen(true);
  };

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    
    createLeadMutation.mutate({
      source: formData.source,
      leadType: formData.leadType,
      description: formData.description,
      siteAddress: formData.address,
      stage: "new",
    });
  };

  const filteredLeads = kanbanLeads.filter(
    (lead) =>
      lead.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.fenceStyle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-leads-title">Leads & Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Manage enquiries, build quotes, and track conversions
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.open("/api/export/leads", "_blank")}
            data-testid="button-export-leads"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-lead">
                <Plus className="h-4 w-4 mr-2" />
                New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitLead} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input 
                  id="clientName" 
                  placeholder="Enter client name" 
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
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
                <Label htmlFor="address">Site Address</Label>
                <Input 
                  id="address" 
                  placeholder="Enter site address" 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  data-testid="input-address" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadType">Lead Type</Label>
                  <Select 
                    value={formData.leadType}
                    onValueChange={(value: "public" | "trade") => setFormData({ ...formData, leadType: value })}
                  >
                    <SelectTrigger data-testid="select-lead-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="trade">Trade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select 
                    value={formData.source}
                    onValueChange={(value: any) => setFormData({ ...formData, source: value })}
                  >
                    <SelectTrigger data-testid="select-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="walk_in">Walk In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the fencing requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="textarea-description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLeadMutation.isPending}
                  data-testid="button-submit-lead"
                >
                  {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                </Button>
              </div>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-leads"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className={viewMode === "kanban" ? "bg-muted" : ""}
            onClick={() => setViewMode("kanban")}
            data-testid="button-view-kanban"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={viewMode === "list" ? "bg-muted" : ""}
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {leadsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          onLeadClick={handleLeadClick}
          onAddLead={handleAddLead}
          onConvertToQuote={handleConvertToQuote}
          onEditLead={handleEditLead}
          onDeleteLead={handleDeleteLead}
        />
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update lead details for {editingLead ? getClientName(editingLead.clientId) : "this lead"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-address">Site Address</Label>
              <Input 
                id="edit-address" 
                placeholder="Enter site address" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-edit-address" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-leadType">Lead Type</Label>
                <Select 
                  value={formData.leadType}
                  onValueChange={(value: "public" | "trade") => setFormData({ ...formData, leadType: value })}
                >
                  <SelectTrigger data-testid="select-edit-lead-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="trade">Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-source">Source</Label>
                <Select 
                  value={formData.source}
                  onValueChange={(value: any) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger data-testid="select-edit-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe the fencing requirements..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="textarea-edit-description"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              To update client contact details, please edit the client record from the Clients page.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateLeadMutation.isPending}
                data-testid="button-save-lead"
              >
                {updateLeadMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the lead for "{leadToDelete?.clientName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leadToDelete && deleteLeadMutation.mutate(leadToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-lead"
            >
              {deleteLeadMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuoteBuilder
        open={isQuoteBuilderOpen}
        onOpenChange={setIsQuoteBuilderOpen}
        lead={selectedLeadForQuote || undefined}
        client={selectedLeadForQuote?.clientId 
          ? clients.find(c => c.id === selectedLeadForQuote.clientId) 
          : undefined}
        onQuoteCreated={handleQuoteCreated}
      />
    </div>
  );
}

function mapStageToStatus(stage: string): LeadStatus {
  switch (stage) {
    case "new":
      return "new";
    case "contacted":
    case "site_visit_scheduled":
    case "site_visit_complete":
      return "contacted";
    case "quote_sent":
    case "quote_revised":
      return "quoted";
    case "approved":
    case "converted_to_job":
      return "approved";
    case "declined":
    case "lost":
      return "declined";
    default:
      return "new";
  }
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
