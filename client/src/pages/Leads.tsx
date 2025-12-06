import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
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
import { Plus, Search, Filter, LayoutGrid, List, Download, Phone, Mail, MapPin, FileText, Edit, Trash2, X, ChevronRight, Calendar, DollarSign, Send, Check, Clock, ClipboardList, Package, Wrench, CalendarDays, CheckCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JobSetupDocument } from "@/components/jobs/JobSetupDocument";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import type { Lead, Client, InsertLead, Quote, User } from "@shared/schema";

type LeadStatus = "new" | "contacted" | "quoted" | "approved" | "declined";

interface QuoteInfo {
  total: number;
  sent: number;
  approved: number;
}

interface KanbanLead {
  id: string;
  leadNumber: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  source: string;
  fenceStyle: string;
  leadType: "public" | "trade";
  jobFulfillmentType?: "supply_only" | "supply_install";
  status: LeadStatus;
  assignedTo: {
    name: string;
    initials: string;
  };
  soilWarning?: string | null;
  soilInstallNotes?: string | null;
  createdAt: string;
  quoteInfo?: QuoteInfo;
}

export default function Leads() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuoteBuilderOpen, setIsQuoteBuilderOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isQuoteSheetOpen, setIsQuoteSheetOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<KanbanLead | null>(null);
  const [selectedLeadForQuote, setSelectedLeadForQuote] = useState<Lead | null>(null);
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [isSetupTemplateOpen, setIsSetupTemplateOpen] = useState(false);
  const [selectedLeadForTemplate, setSelectedLeadForTemplate] = useState<Lead | null>(null);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState({
    clientName: "",
    phone: "",
    email: "",
    address: "",
    leadType: "public" as "public" | "trade",
    source: "website" as "website" | "phone" | "referral" | "trade" | "walk_in" | "social_media" | "other",
    description: "",
    jobFulfillmentType: "supply_install" as "supply_only" | "supply_install",
  });
  const [siteCoordinates, setSiteCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [soilData, setSoilData] = useState<{ warning: string | null; notes: string | null }>({ warning: null, notes: null });
  const [isSoilDataLoading, setIsSoilDataLoading] = useState(false);
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Handle URL parameters for deep linking to specific lead/task
  useEffect(() => {
    if (leads.length > 0 && searchString) {
      const params = new URLSearchParams(searchString);
      const leadId = params.get("leadId");
      const taskId = params.get("taskId");
      const tab = params.get("tab");
      
      if (leadId) {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          setSelectedLead(lead);
          setInitialTab(tab || undefined);
          setHighlightedTaskId(taskId || undefined);
          setIsDetailDialogOpen(true);
          // Clear the URL params after opening
          setLocation("/leads", { replace: true });
        }
      }
    }
  }, [leads, searchString, setLocation]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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

  // Debounced client search effect
  useEffect(() => {
    const searchTerm = formData.clientName || formData.phone || formData.address;
    if (searchTerm && searchTerm.length >= 2 && !selectedClientId) {
      const timer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/clients?search=${encodeURIComponent(searchTerm)}`);
          if (response.ok) {
            const matchingClients = await response.json();
            setClientSuggestions(matchingClients);
            setShowSuggestions(matchingClients.length > 0);
          }
        } catch (error) {
          console.error("Error searching clients:", error);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setClientSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.clientName, formData.phone, formData.address, selectedClientId]);

  // Fetch soil data when coordinates change
  useEffect(() => {
    if (siteCoordinates) {
      setIsSoilDataLoading(true);
      const fetchSoilData = async () => {
        try {
          const response = await fetch(`/api/soil-data?lat=${siteCoordinates.lat}&lng=${siteCoordinates.lng}`);
          if (response.ok) {
            const data = await response.json();
            // Determine short warning label based on installation notes
            let warning: string | null = null;
            if (data.installationNotes) {
              const notes = data.installationNotes.toUpperCase();
              if (notes.includes("LIMESTONE")) warning = "LIMESTONE";
              else if (notes.includes("ROCK") || notes.includes("CALCRETE")) warning = "ROCK";
              else if (notes.includes("CLAY") || notes.includes("HARDER")) warning = "CLAY";
              else if (notes.includes("GRAVEL") || notes.includes("MIXED")) warning = "GRAVEL";
              else if (notes.includes("SAND") || notes.includes("EASY")) warning = "SAND";
            }
            setSoilData({ warning, notes: data.installationNotes });
          }
        } catch (error) {
          console.error("Error fetching soil data:", error);
        } finally {
          setIsSoilDataLoading(false);
        }
      };
      fetchSoilData();
    } else {
      setSoilData({ warning: null, notes: null });
      setIsSoilDataLoading(false);
    }
  }, [siteCoordinates]);

  const handleSelectClient = (client: Client) => {
    setFormData({
      ...formData,
      clientName: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || formData.address,
    });
    setSelectedClientId(client.id);
    setShowSuggestions(false);
    toast({
      title: "Existing Client Selected",
      description: `${client.name} found in your client database`,
    });
  };

  const handleClearClientSelection = () => {
    setSelectedClientId(null);
    setFormData({
      ...formData,
      clientName: "",
      phone: "",
      email: "",
    });
  };

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

  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/quotes/${id}`, data);
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      const updatedQuotes = queryClient.getQueryData<Quote[]>(["/api/quotes"]);
      const updated = updatedQuotes?.find(q => q.id === variables.id);
      if (updated) {
        setSelectedQuote(updated);
      }
      toast({
        title: "Quote Updated",
        description: "Quote has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quote",
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
        jobFulfillmentType: (originalLead.jobFulfillmentType as "supply_only" | "supply_install") || "supply_install",
      });
      // Set selected client ID if lead already has a linked client
      setSelectedClientId(originalLead.clientId || null);
      setClientSuggestions([]);
      setShowSuggestions(false);
      setIsEditDialogOpen(true);
    }
  };

  const handleDeleteLead = (lead: KanbanLead) => {
    setLeadToDelete(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleLeadStatusChange = (leadId: string, newStatus: string) => {
    if (updateLeadMutation.isPending) return;
    
    const previousLeads = queryClient.getQueryData<Lead[]>(["/api/leads"]);
    const mappedStage = mapStatusToStage(newStatus as LeadStatus);
    
    queryClient.setQueryData<Lead[]>(["/api/leads"], (old) =>
      old?.map(lead =>
        lead.id === leadId ? { ...lead, stage: mappedStage as Lead["stage"] } : lead
      )
    );
    
    updateLeadMutation.mutate(
      { id: leadId, data: { stage: mappedStage as Lead["stage"] } },
      {
        onError: () => {
          queryClient.setQueryData(["/api/leads"], previousLeads);
          toast({
            title: "Error",
            description: "Failed to move lead. Please try again.",
            variant: "destructive",
          });
        },
        onSuccess: () => {
          toast({
            title: "Lead Updated",
            description: `Lead moved to ${newStatus}`,
          });
        },
      }
    );
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    
    if (!formData.clientName.trim()) {
      toast({
        title: "Validation Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }
    
    updateLeadMutation.mutate({
      id: editingLead.id,
      data: {
        source: formData.source,
        leadType: formData.leadType,
        description: formData.description,
        siteAddress: formData.address,
        jobFulfillmentType: formData.jobFulfillmentType,
        clientId: selectedClientId,
        clientName: formData.clientName.trim(),
        clientPhone: formData.phone.trim(),
        clientEmail: formData.email.trim(),
      } as any,
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
      jobFulfillmentType: "supply_install",
    });
    setSelectedClientId(null);
    setClientSuggestions([]);
    setShowSuggestions(false);
    setSiteCoordinates(null);
    setSoilData({ warning: null, notes: null });
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

  const getAssignedUser = (userId: string | null): { name: string; initials: string } => {
    if (!userId) return { name: "Unassigned", initials: "—" };
    const user = users.find(u => u.id === userId);
    if (!user) return { name: "Unassigned", initials: "—" };
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
    const initials = firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : fullName.substring(0, 2).toUpperCase();
    return { name: fullName, initials };
  };

  const getQuoteInfo = (leadId: string): { total: number; sent: number; approved: number } => {
    const leadQuotes = quotes.filter(q => q.leadId === leadId);
    return {
      total: leadQuotes.length,
      sent: leadQuotes.filter(q => q.status === "sent").length,
      approved: leadQuotes.filter(q => ["approved", "accepted"].includes(q.status as string)).length,
    };
  };

  const kanbanLeads: KanbanLead[] = leads.map((lead) => ({
    id: lead.id,
    leadNumber: lead.leadNumber,
    clientName: getClientName(lead.clientId),
    phone: getClientPhone(lead.clientId),
    email: getClientEmail(lead.clientId),
    address: lead.siteAddress || "",
    source: lead.source || "website",
    fenceStyle: `${lead.fenceStyle || "Unknown"} - ${lead.fenceLength || "?"}m`,
    leadType: lead.leadType as "public" | "trade",
    jobFulfillmentType: (lead.jobFulfillmentType as "supply_only" | "supply_install") || "supply_install",
    status: mapStageToStatus(lead.stage),
    assignedTo: getAssignedUser(lead.assignedTo),
    createdAt: formatTimeAgo(lead.createdAt),
    quoteInfo: getQuoteInfo(lead.id),
    soilWarning: (lead as any).soilWarning || null,
    soilInstallNotes: (lead as any).soilInstallNotes || null,
  }));

  const handleLeadClick = (lead: KanbanLead) => {
    const originalLead = leads.find(l => l.id === lead.id);
    if (originalLead) {
      setSelectedLead(originalLead);
      setIsDetailDialogOpen(true);
    }
  };

  const getLeadQuotes = (leadId: string) => {
    return quotes.filter(q => q.leadId === leadId);
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(Number(amount));
  };

  const handleCreateQuote = (lead: KanbanLead) => {
    const originalLead = leads.find(l => l.id === lead.id);
    if (originalLead) {
      setSelectedLeadForQuote(originalLead);
      setIsQuoteBuilderOpen(true);
    }
  };

  const handleViewSetupTemplate = (lead: KanbanLead) => {
    const originalLead = leads.find(l => l.id === lead.id);
    if (originalLead && originalLead.jobFulfillmentType === "supply_install") {
      setSelectedLeadForTemplate(originalLead);
      setIsSetupTemplateOpen(true);
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
    
    if (!formData.clientName.trim()) {
      toast({
        title: "Validation Error",
        description: "Client name is required",
        variant: "destructive",
      });
      return;
    }
    
    createLeadMutation.mutate({
      source: formData.source,
      leadType: formData.leadType,
      description: formData.description,
      siteAddress: formData.address,
      stage: "new",
      jobFulfillmentType: formData.jobFulfillmentType,
      clientId: selectedClientId,
      clientName: formData.clientName.trim(),
      clientPhone: formData.phone.trim(),
      clientEmail: formData.email.trim(),
      // Include soil/site data
      soilWarning: soilData.warning,
      soilInstallNotes: soilData.notes,
      siteLatitude: siteCoordinates?.lat?.toString() || null,
      siteLongitude: siteCoordinates?.lng?.toString() || null,
    } as any);
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
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitLead} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input 
                      id="clientName" 
                      placeholder="Enter client name" 
                      value={formData.clientName}
                      onChange={(e) => {
                        setFormData({ ...formData, clientName: e.target.value });
                        if (selectedClientId) setSelectedClientId(null);
                      }}
                      data-testid="input-client-name" 
                    />
                    {selectedClientId && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={handleClearClientSelection}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {showSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <div className="p-2 text-xs text-muted-foreground border-b">
                        Existing clients found - click to select
                      </div>
                      {clientSuggestions.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                          onClick={() => handleSelectClient(client)}
                          data-testid={`suggestion-client-${client.id}`}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground flex gap-3">
                            {client.phone && <span>{client.phone}</span>}
                            {client.email && <span>{client.email}</span>}
                          </div>
                          {client.address && (
                            <div className="text-xs text-muted-foreground mt-1">{client.address}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedClientId && (
                  <p className="text-xs text-green-600 mt-1">
                    Existing client selected - details auto-filled
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    placeholder="0400 000 000" 
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (selectedClientId) setSelectedClientId(null);
                    }}
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
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(value) => {
                    setFormData({ ...formData, address: value });
                    if (selectedClientId) setSelectedClientId(null);
                  }}
                  onCoordinatesChange={(coords) => setSiteCoordinates(coords)}
                  placeholder="Enter site address"
                  showStreetView={true}
                  data-testid="input-site-address"
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
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="trade">Trade</SelectItem>
                      <SelectItem value="walk_in">Walk In</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobFulfillmentType">Job Type</Label>
                <Select 
                  value={formData.jobFulfillmentType}
                  onValueChange={(value: "supply_only" | "supply_install") => setFormData({ ...formData, jobFulfillmentType: value })}
                >
                  <SelectTrigger data-testid="select-job-fulfillment-type">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supply_install">Supply & Install</SelectItem>
                    <SelectItem value="supply_only">Supply Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Supply & Install jobs include the Setup & Handover document
                </p>
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
                  disabled={createLeadMutation.isPending || (siteCoordinates !== null && isSoilDataLoading)}
                  data-testid="button-submit-lead"
                >
                  {createLeadMutation.isPending ? "Creating..." : isSoilDataLoading && siteCoordinates ? "Loading soil data..." : "Create Lead"}
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
          onCreateQuote={handleCreateQuote}
          onEditLead={handleEditLead}
          onDeleteLead={handleDeleteLead}
          onViewSetupTemplate={handleViewSetupTemplate}
          onLeadStatusChange={handleLeadStatusChange}
          isUpdating={updateLeadMutation.isPending}
        />
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update lead and client details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-clientName">Client Name</Label>
              <Input 
                id="edit-clientName" 
                placeholder="Enter client name" 
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
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
              <Label htmlFor="edit-address">Site Address</Label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                placeholder="Enter site address"
                showStreetView={true}
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
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="trade">Trade</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-jobFulfillmentType">Job Type</Label>
              <Select 
                value={formData.jobFulfillmentType}
                onValueChange={(value: "supply_only" | "supply_install") => setFormData({ ...formData, jobFulfillmentType: value })}
              >
                <SelectTrigger data-testid="select-edit-job-fulfillment-type">
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supply_install">Supply & Install</SelectItem>
                  <SelectItem value="supply_only">Supply Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Supply & Install jobs include the Setup & Handover document
              </p>
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

      <LeadDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            setInitialTab(undefined);
            setHighlightedTaskId(undefined);
          }
        }}
        lead={selectedLead}
        client={selectedLead?.clientId ? clients.find(c => c.id === selectedLead.clientId) || null : null}
        quotes={selectedLead ? getLeadQuotes(selectedLead.id) : []}
        users={users}
        initialTab={initialTab}
        highlightedTaskId={highlightedTaskId}
        onEditLead={() => {
          setIsDetailDialogOpen(false);
          setInitialTab(undefined);
          setHighlightedTaskId(undefined);
          const kanbanLead = kanbanLeads.find(l => l.id === selectedLead?.id);
          if (kanbanLead) handleEditLead(kanbanLead);
        }}
        onCreateQuote={() => {
          setSelectedLeadForQuote(selectedLead);
          setIsDetailDialogOpen(false);
          setInitialTab(undefined);
          setHighlightedTaskId(undefined);
          setIsQuoteBuilderOpen(true);
        }}
        onViewQuote={(quote) => {
          setSelectedQuote(quote);
          setIsQuoteSheetOpen(true);
        }}
      />

      <Sheet open={isQuoteSheetOpen} onOpenChange={setIsQuoteSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Quote {selectedQuote?.quoteNumber}
              {selectedQuote && (
                <Badge
                  variant={
                    selectedQuote.status === "approved"
                      ? "default"
                      : selectedQuote.status === "sent"
                      ? "secondary"
                      : selectedQuote.status === "declined"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {selectedQuote.status}
                </Badge>
              )}
            </SheetTitle>
            <SheetDescription>
              View and manage quote details
            </SheetDescription>
          </SheetHeader>

          {selectedQuote && (
            <div className="mt-6 space-y-6">
              <div className="flex gap-2">
                {selectedQuote.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateQuoteMutation.mutate({
                        id: selectedQuote.id,
                        data: { status: "sent", sentAt: new Date().toISOString() },
                      });
                    }}
                    disabled={updateQuoteMutation.isPending}
                    data-testid="button-send-quote"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Quote
                  </Button>
                )}
                {selectedQuote.status === "sent" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateQuoteMutation.mutate({
                          id: selectedQuote.id,
                          data: { status: "approved", approvedAt: new Date().toISOString() },
                        });
                      }}
                      disabled={updateQuoteMutation.isPending}
                      data-testid="button-approve-quote"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark Approved
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        updateQuoteMutation.mutate({
                          id: selectedQuote.id,
                          data: { status: "declined" },
                        });
                      }}
                      disabled={updateQuoteMutation.isPending}
                      data-testid="button-decline-quote"
                    >
                      Declined
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedLeadForQuote(selectedLead);
                    setIsQuoteSheetOpen(false);
                    setIsDetailDialogOpen(false);
                    setIsQuoteBuilderOpen(true);
                  }}
                  data-testid="button-edit-quote"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Quote
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Materials:</span>
                      <div className="font-medium">{formatCurrency(selectedQuote.materialsSubtotal)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Labour:</span>
                      <div className="font-medium">{formatCurrency(selectedQuote.labourEstimate)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <div className="font-semibold text-lg">{formatCurrency(selectedQuote.totalAmount)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deposit ({selectedQuote.depositPercent}%):</span>
                      <div className="font-medium">{formatCurrency(selectedQuote.depositRequired)}</div>
                    </div>
                  </div>
                  {selectedQuote.isTradeQuote && (
                    <div className="pt-2 flex items-center gap-2">
                      <Badge variant="secondary">Trade Quote</Badge>
                      <span className="text-sm text-muted-foreground">
                        {selectedQuote.tradeDiscount}% discount applied
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fence Height:</span>
                      <div className="font-medium">{selectedQuote.fenceHeight}mm</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Length:</span>
                      <div className="font-medium">{selectedQuote.totalLength}m</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Site Address:</span>
                    <div className="font-medium">{selectedQuote.siteAddress}</div>
                  </div>
                </CardContent>
              </Card>

              {selectedQuote.lineItems && Array.isArray(selectedQuote.lineItems) && selectedQuote.lineItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(selectedQuote.lineItems as any[]).map((item, index) => (
                        <div key={index} className="flex justify-between text-sm py-2 border-b last:border-0">
                          <div>
                            <div className="font-medium">{item.productName || "Product"}</div>
                            <div className="text-muted-foreground">Qty: {item.quantity} x {formatCurrency(item.unitPrice)}</div>
                          </div>
                          <div className="font-medium">{formatCurrency(item.totalPrice)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(selectedQuote.createdAt).toLocaleDateString("en-AU")}</span>
                  </div>
                  {selectedQuote.sentAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sent:</span>
                      <span>{new Date(selectedQuote.sentAt).toLocaleDateString("en-AU")}</span>
                    </div>
                  )}
                  {selectedQuote.approvedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved:</span>
                      <span>{new Date(selectedQuote.approvedAt).toLocaleDateString("en-AU")}</span>
                    </div>
                  )}
                  {selectedQuote.validUntil && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid Until:</span>
                      <span>{new Date(selectedQuote.validUntil).toLocaleDateString("en-AU")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(selectedQuote.notes || selectedQuote.internalNotes) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedQuote.notes && (
                      <div>
                        <span className="text-sm text-muted-foreground">Customer Notes:</span>
                        <p className="mt-1">{selectedQuote.notes}</p>
                      </div>
                    )}
                    {selectedQuote.internalNotes && (
                      <div>
                        <span className="text-sm text-muted-foreground">Internal Notes:</span>
                        <p className="mt-1">{selectedQuote.internalNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isSetupTemplateOpen} onOpenChange={setIsSetupTemplateOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Live Document - Setup & Handover
            </DialogTitle>
            <DialogDescription>
              {selectedLeadForTemplate && (
                <span className="flex items-center gap-2">
                  Lead: {selectedLeadForTemplate.leadNumber} - Fill in each section as you progress through the workflow
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLeadForTemplate && (
            <ScrollArea className="h-[70vh] pr-4">
              <JobSetupDocument
                leadId={selectedLeadForTemplate.id}
                jobType="supply_install"
              />
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => setIsSetupTemplateOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsSetupTemplateOpen(false);
                    setSelectedLeadForQuote(selectedLeadForTemplate);
                    setIsQuoteBuilderOpen(true);
                  }}
                  data-testid="button-create-quote-from-template"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Quote
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
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

function mapStatusToStage(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "new";
    case "contacted":
      return "contacted";
    case "quoted":
      return "quote_sent";
    case "approved":
      return "approved";
    case "declined":
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
