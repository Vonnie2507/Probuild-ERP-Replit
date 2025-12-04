import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Truck,
  Clock,
  Wrench,
  Package,
  Users,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { 
  QuoteCostComponent, 
  QuoteTrip, 
  QuoteAdminTime, 
  QuotePLSummary,
  User 
} from "@shared/schema";

interface QuotePLPanelProps {
  quoteId: string;
  quoteTotalAmount: string;
}

type CostCategory = "materials" | "manufacturing_labour" | "install_labour" | "travel" | "admin" | "supplier_fees" | "third_party" | "ground_conditions";
type TripType = "site_quote" | "post_install" | "panel_install" | "gate_install" | "welder_dropoff" | "welder_pickup" | "powder_coat_dropoff" | "powder_coat_pickup" | "supplier_delivery" | "warranty" | "follow_up";
type AdminActivityType = "quote_creation" | "client_messaging" | "client_call" | "spec_gathering" | "scheduling" | "invoicing" | "follow_up" | "general_admin";

const categoryLabels: Record<CostCategory, string> = {
  materials: "Materials",
  manufacturing_labour: "Manufacturing Labour",
  install_labour: "Installation Labour",
  travel: "Travel",
  admin: "Admin Time",
  supplier_fees: "Supplier Delivery Fees",
  third_party: "Third Party",
  ground_conditions: "Ground Conditions",
};

const categoryIcons: Record<CostCategory, any> = {
  materials: Package,
  manufacturing_labour: Wrench,
  install_labour: Users,
  travel: Truck,
  admin: Clock,
  supplier_fees: Truck,
  third_party: DollarSign,
  ground_conditions: MapPin,
};

const tripTypeLabels: Record<TripType, string> = {
  site_quote: "Site Quote",
  post_install: "Post Installation",
  panel_install: "Panel Installation",
  gate_install: "Gate Installation",
  welder_dropoff: "Welder Drop-off",
  welder_pickup: "Welder Pick-up",
  powder_coat_dropoff: "Powder Coat Drop-off",
  powder_coat_pickup: "Powder Coat Pick-up",
  supplier_delivery: "Supplier Delivery",
  warranty: "Warranty",
  follow_up: "Follow Up",
};

const adminActivityLabels: Record<AdminActivityType, string> = {
  quote_creation: "Quote Creation",
  client_messaging: "Client Messaging",
  client_call: "Client Call",
  spec_gathering: "Spec Gathering",
  scheduling: "Scheduling",
  invoicing: "Invoicing",
  follow_up: "Follow Up",
  general_admin: "General Admin",
};

export function QuotePLPanel({ quoteId, quoteTotalAmount }: QuotePLPanelProps) {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["summary"]));
  const [showAddCostDialog, setShowAddCostDialog] = useState(false);
  const [showAddTripDialog, setShowAddTripDialog] = useState(false);
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);

  const { data: plSummary, isLoading: summaryLoading, error: summaryError } = useQuery<QuotePLSummary>({
    queryKey: ["/api/quotes", quoteId, "pl-summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes/${quoteId}/pl-summary`);
      return res.json();
    },
  });

  const { data: costComponents = [], isLoading: costsLoading, error: costsError } = useQuery<QuoteCostComponent[]>({
    queryKey: ["/api/quotes", quoteId, "costs"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes/${quoteId}/costs`);
      return res.json();
    },
  });

  const { data: trips = [], isLoading: tripsLoading, error: tripsError } = useQuery<QuoteTrip[]>({
    queryKey: ["/api/quotes", quoteId, "trips"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes/${quoteId}/trips`);
      return res.json();
    },
  });

  const { data: adminTime = [], isLoading: adminLoading, error: adminError } = useQuery<QuoteAdminTime[]>({
    queryKey: ["/api/quotes", quoteId, "admin-time"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/quotes/${quoteId}/admin-time`);
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/pl-summary/recalculate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "pl-summary"] });
      toast({ title: "P&L summary recalculated" });
    },
    onError: (error) => {
      toast({ title: "Failed to recalculate", variant: "destructive" });
    },
  });

  const addCostMutation = useMutation({
    mutationFn: async (data: Partial<QuoteCostComponent>) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/costs`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "pl-summary"] });
      setShowAddCostDialog(false);
      toast({ title: "Cost added" });
    },
    onError: () => {
      toast({ title: "Failed to add cost", variant: "destructive" });
    },
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (costId: string) => {
      await apiRequest("DELETE", `/api/quotes/${quoteId}/costs/${costId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "pl-summary"] });
      toast({ title: "Cost removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove cost", variant: "destructive" });
    },
  });

  const addTripMutation = useMutation({
    mutationFn: async (data: Partial<QuoteTrip>) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/trips`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "pl-summary"] });
      setShowAddTripDialog(false);
      toast({ title: "Trip added" });
    },
    onError: () => {
      toast({ title: "Failed to add trip", variant: "destructive" });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      await apiRequest("DELETE", `/api/quotes/${quoteId}/trips/${tripId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "pl-summary"] });
      toast({ title: "Trip removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove trip", variant: "destructive" });
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data: Partial<QuoteAdminTime>) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/admin-time`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "admin-time"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "pl-summary"] });
      setShowAddAdminDialog(false);
      toast({ title: "Admin time added" });
    },
    onError: () => {
      toast({ title: "Failed to add admin time", variant: "destructive" });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      await apiRequest("DELETE", `/api/quotes/${quoteId}/admin-time/${adminId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "admin-time"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId, "pl-summary"] });
      toast({ title: "Admin time removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove admin time", variant: "destructive" });
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown";
  };

  const profitMargin = plSummary?.profitMarginPercent 
    ? parseFloat(plSummary.profitMarginPercent) 
    : 0;
  const isHealthyMargin = profitMargin >= 20;

  const isLoading = summaryLoading || costsLoading || tripsLoading || adminLoading;
  const hasError = summaryError || costsError || tripsError || adminError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading P&L data...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load P&L data</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Profit & Loss Analysis</h3>
          <Badge variant="outline" className="text-xs">Staff Only</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => recalculateMutation.mutate()}
          disabled={recalculateMutation.isPending}
          data-testid="button-recalculate-pl"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
          Recalculate
        </Button>
      </div>

      <Card className={isHealthyMargin ? "border-green-200 dark:border-green-900" : "border-orange-200 dark:border-orange-900"}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Revenue</div>
              <div className="text-xl font-bold text-green-600" data-testid="text-pl-revenue">
                ${parseFloat(plSummary?.totalRevenue || quoteTotalAmount || "0").toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-xl font-bold text-red-600" data-testid="text-pl-cost">
                ${parseFloat(plSummary?.totalCost || "0").toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Profit</div>
              <div className={`text-xl font-bold flex items-center justify-center gap-1 ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-pl-profit">
                {profitMargin >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                ${parseFloat(plSummary?.profitAmount || "0").toLocaleString()}
                <span className="text-sm">({profitMargin.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
          {!isHealthyMargin && profitMargin > 0 && (
            <div className="mt-3 flex items-center gap-2 text-orange-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Margin below 20% target</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Collapsible open={expandedSections.has("costs")} onOpenChange={() => toggleSection("costs")}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2" data-testid="button-toggle-costs">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Cost Components ({costComponents.length})</span>
            </div>
            {expandedSections.has("costs") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-3 space-y-2">
              {costComponents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No cost components added yet
                </div>
              ) : (
                <div className="space-y-2">
                  {costComponents.map((cost) => {
                    const Icon = categoryIcons[cost.category as CostCategory] || DollarSign;
                    return (
                      <div key={cost.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{cost.description || categoryLabels[cost.category as CostCategory]}</div>
                            <div className="text-xs text-muted-foreground">
                              {cost.quantity} × ${parseFloat(cost.unitCost || "0").toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${parseFloat(cost.totalCost || "0").toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteCostMutation.mutate(cost.id)}
                            data-testid={`button-delete-cost-${cost.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAddCostDialog(true)}
                data-testid="button-add-cost"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Cost
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={expandedSections.has("trips")} onOpenChange={() => toggleSection("trips")}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2" data-testid="button-toggle-trips">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span>Trips ({trips.length})</span>
            </div>
            {expandedSections.has("trips") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-3 space-y-2">
              {trips.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No trips scheduled yet
                </div>
              ) : (
                <div className="space-y-2">
                  {trips.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{tripTypeLabels[trip.tripType as TripType]}</div>
                          <div className="text-xs text-muted-foreground">
                            {trip.staffId ? getUserName(trip.staffId) : "Unassigned"}
                            {trip.distanceKm && ` • ${trip.distanceKm}km`}
                            {trip.durationMinutes && ` • ${trip.durationMinutes}min`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {trip.travelCostTotal && (
                          <span className="font-medium">${parseFloat(trip.travelCostTotal).toLocaleString()}</span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {trip.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteTripMutation.mutate(trip.id)}
                          data-testid={`button-delete-trip-${trip.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAddTripDialog(true)}
                data-testid="button-add-trip"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Trip
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={expandedSections.has("admin")} onOpenChange={() => toggleSection("admin")}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2" data-testid="button-toggle-admin">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Admin Time ({adminTime.length})</span>
            </div>
            {expandedSections.has("admin") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-3 space-y-2">
              {adminTime.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No admin time logged yet
                </div>
              ) : (
                <div className="space-y-2">
                  {adminTime.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{admin.activityType}</div>
                          <div className="text-xs text-muted-foreground">
                            {admin.staffId ? getUserName(admin.staffId) : "Unknown"}
                            {admin.durationMinutes && ` • ${admin.durationMinutes}min`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {admin.totalCost && (
                          <span className="font-medium">${parseFloat(admin.totalCost).toLocaleString()}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteAdminMutation.mutate(admin.id)}
                          data-testid={`button-delete-admin-${admin.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAddAdminDialog(true)}
                data-testid="button-add-admin"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Admin Time
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={expandedSections.has("breakdown")} onOpenChange={() => toggleSection("breakdown")}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2" data-testid="button-toggle-breakdown">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Cost Breakdown</span>
            </div>
            {expandedSections.has("breakdown") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Materials</span>
                  <span>${parseFloat(plSummary?.materialsCost || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manufacturing</span>
                  <span>${parseFloat(plSummary?.manufacturingLabourCost || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installation</span>
                  <span>${parseFloat(plSummary?.installationLabourCost || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Travel</span>
                  <span>${parseFloat(plSummary?.travelCost || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admin</span>
                  <span>${parseFloat(plSummary?.adminCost || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier Fees</span>
                  <span>${parseFloat(plSummary?.supplierDeliveryFees || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Third Party</span>
                  <span>${parseFloat(plSummary?.thirdPartyCost || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ground Conditions</span>
                  <span>${parseFloat(plSummary?.groundConditionsCost || "0").toLocaleString()}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Cost</span>
                <span>${parseFloat(plSummary?.totalCost || "0").toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <AddCostDialog
        open={showAddCostDialog}
        onClose={() => setShowAddCostDialog(false)}
        onSubmit={(data) => addCostMutation.mutate(data)}
        isPending={addCostMutation.isPending}
      />

      <AddTripDialog
        open={showAddTripDialog}
        onClose={() => setShowAddTripDialog(false)}
        onSubmit={(data) => addTripMutation.mutate(data)}
        isPending={addTripMutation.isPending}
        users={users}
      />

      <AddAdminTimeDialog
        open={showAddAdminDialog}
        onClose={() => setShowAddAdminDialog(false)}
        onSubmit={(data) => addAdminMutation.mutate(data)}
        isPending={addAdminMutation.isPending}
        users={users}
      />
    </div>
  );
}

function AddCostDialog({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QuoteCostComponent>) => void;
  isPending: boolean;
}) {
  const [category, setCategory] = useState<CostCategory>("materials");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");

  const handleSubmit = () => {
    const qty = parseFloat(quantity) || 1;
    const cost = parseFloat(unitCost) || 0;
    onSubmit({
      category,
      description,
      quantity: qty.toString(),
      unitCost: cost.toString(),
      totalCost: (qty * cost).toString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cost Component</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CostCategory)}>
              <SelectTrigger data-testid="select-cost-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Post material costs"
              data-testid="input-cost-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="input-cost-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
                data-testid="input-cost-unit-price"
              />
            </div>
          </div>
          <div className="text-right text-muted-foreground">
            Total: ${((parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0)).toFixed(2)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-cost">
            {isPending ? "Adding..." : "Add Cost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTripDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  users,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QuoteTrip>) => void;
  isPending: boolean;
  users: User[];
}) {
  const [tripType, setTripType] = useState<TripType>("panel_install");
  const [staffId, setStaffId] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [travelCost, setTravelCost] = useState("");

  const handleSubmit = () => {
    onSubmit({
      tripType,
      staffId,
      distanceKm: distanceKm || undefined,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
      travelCostTotal: travelCost || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Trip Type</Label>
            <Select value={tripType} onValueChange={(v) => setTripType(v as TripType)}>
              <SelectTrigger data-testid="select-trip-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tripTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assigned Staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger data-testid="select-trip-staff">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.role === 'installer' || u.role === 'sales' || u.role === 'admin').map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Distance (km)</Label>
              <Input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="0"
                data-testid="input-trip-distance"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="0"
                data-testid="input-trip-duration"
              />
            </div>
            <div className="space-y-2">
              <Label>Travel Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={travelCost}
                onChange={(e) => setTravelCost(e.target.value)}
                placeholder="0.00"
                data-testid="input-trip-cost"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !staffId} data-testid="button-submit-trip">
            {isPending ? "Adding..." : "Add Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAdminTimeDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  users,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<QuoteAdminTime>) => void;
  isPending: boolean;
  users: User[];
}) {
  const [activityType, setActivityType] = useState<AdminActivityType>("quote_creation");
  const [staffId, setStaffId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [hourlyRate, setHourlyRate] = useState("50");

  const handleSubmit = () => {
    const minutes = parseInt(durationMinutes) || 0;
    const rate = parseFloat(hourlyRate) || 0;
    const totalCost = (minutes / 60) * rate;
    onSubmit({
      activityType,
      staffId,
      durationMinutes: minutes,
      hourlyRate: rate.toString(),
      totalCost: totalCost.toString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Admin Time</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as AdminActivityType)}>
              <SelectTrigger data-testid="select-admin-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(adminActivityLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Staff Member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger data-testid="select-admin-staff">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="0"
                data-testid="input-admin-duration"
              />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                data-testid="input-admin-rate"
              />
            </div>
          </div>
          <div className="text-right text-muted-foreground">
            Total: ${(((parseInt(durationMinutes) || 0) / 60) * (parseFloat(hourlyRate) || 0)).toFixed(2)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !staffId} data-testid="button-submit-admin">
            {isPending ? "Adding..." : "Add Time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
