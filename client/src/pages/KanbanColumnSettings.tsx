import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Columns3,
  ArrowUp,
  ArrowDown,
  ListTodo,
  Link2,
  AlertCircle,
  Factory,
} from "lucide-react";
import type { KanbanColumn, JobStatus, JobStatusDependency, ProductionStage } from "@shared/schema";

const COLOR_OPTIONS = [
  { value: "bg-slate-100 dark:bg-slate-800", label: "Gray" },
  { value: "bg-blue-50 dark:bg-blue-950", label: "Blue" },
  { value: "bg-purple-50 dark:bg-purple-950", label: "Purple" },
  { value: "bg-amber-50 dark:bg-amber-950", label: "Amber" },
  { value: "bg-green-50 dark:bg-green-950", label: "Green" },
  { value: "bg-emerald-50 dark:bg-emerald-950", label: "Emerald" },
  { value: "bg-red-50 dark:bg-red-950", label: "Red" },
  { value: "bg-orange-50 dark:bg-orange-950", label: "Orange" },
  { value: "bg-cyan-50 dark:bg-cyan-950", label: "Cyan" },
  { value: "bg-pink-50 dark:bg-pink-950", label: "Pink" },
];

interface DependencyConfig {
  prerequisiteKey: string;
  dependencyType: string;
}

export default function KanbanColumnSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("columns");
  
  // Column dialog state
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [columnFormData, setColumnFormData] = useState({
    title: "",
    statuses: [] as string[],
    defaultStatus: "",
    color: "bg-slate-100 dark:bg-slate-800",
    isActive: true,
  });

  // Status dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<JobStatus | null>(null);
  const [statusFormData, setStatusFormData] = useState({
    key: "",
    label: "",
    description: "",
    isActive: true,
  });
  const [statusDependencies, setStatusDependencies] = useState<DependencyConfig[]>([]);

  // Production stage dialog state
  const [isProductionStageDialogOpen, setIsProductionStageDialogOpen] = useState(false);
  const [editingProductionStage, setEditingProductionStage] = useState<ProductionStage | null>(null);
  const [productionStageFormData, setProductionStageFormData] = useState({
    key: "",
    label: "",
    description: "",
    icon: "Factory",
    color: "bg-chart-1",
    isActive: true,
  });

  // Fetch columns, statuses, and all dependencies
  const { data: columns = [], isLoading: columnsLoading } = useQuery<KanbanColumn[]>({
    queryKey: ["/api/kanban-columns"],
  });

  const { data: jobStatuses = [], isLoading: statusesLoading } = useQuery<JobStatus[]>({
    queryKey: ["/api/job-statuses"],
  });

  const { data: allDependencies = [] } = useQuery<JobStatusDependency[]>({
    queryKey: ["/api/job-status-dependencies"],
  });

  const { data: productionStages = [], isLoading: productionStagesLoading } = useQuery<ProductionStage[]>({
    queryKey: ["/api/production-stages"],
  });

  // Column mutations
  const createColumnMutation = useMutation({
    mutationFn: async (data: typeof columnFormData) => {
      return apiRequest("POST", "/api/kanban-columns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kanban-columns"] });
      toast({ title: "Column created successfully" });
      closeColumnDialog();
    },
    onError: () => {
      toast({ title: "Failed to create column", variant: "destructive" });
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof columnFormData }) => {
      return apiRequest("PATCH", `/api/kanban-columns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kanban-columns"] });
      toast({ title: "Column updated successfully" });
      closeColumnDialog();
    },
    onError: () => {
      toast({ title: "Failed to update column", variant: "destructive" });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/kanban-columns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kanban-columns"] });
      toast({ title: "Column deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete column", variant: "destructive" });
    },
  });

  const reorderColumnMutation = useMutation({
    mutationFn: async (columnIds: string[]) => {
      return apiRequest("POST", "/api/kanban-columns/reorder", { columnIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kanban-columns"] });
    },
    onError: () => {
      toast({ title: "Failed to reorder columns", variant: "destructive" });
    },
  });

  // Status mutations
  const createStatusMutation = useMutation({
    mutationFn: async (data: typeof statusFormData) => {
      return apiRequest("POST", "/api/job-statuses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-statuses"] });
      toast({ title: "Status created successfully" });
      closeStatusDialog();
    },
    onError: () => {
      toast({ title: "Failed to create status", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof statusFormData }) => {
      return apiRequest("PATCH", `/api/job-statuses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-statuses"] });
      toast({ title: "Status updated successfully" });
      closeStatusDialog();
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/job-statuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-statuses"] });
      toast({ title: "Status deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete status", variant: "destructive" });
    },
  });

  const reorderStatusMutation = useMutation({
    mutationFn: async (statusIds: string[]) => {
      return apiRequest("POST", "/api/job-statuses/reorder", { statusIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-statuses"] });
    },
    onError: () => {
      toast({ title: "Failed to reorder statuses", variant: "destructive" });
    },
  });

  const saveDependenciesMutation = useMutation({
    mutationFn: async ({ statusKey, dependencies }: { statusKey: string; dependencies: DependencyConfig[] }) => {
      return apiRequest("PUT", `/api/job-status-dependencies/${statusKey}`, { dependencies });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-status-dependencies"] });
    },
    onError: () => {
      toast({ title: "Failed to save dependencies", variant: "destructive" });
    },
  });

  // Production stage mutations
  const createProductionStageMutation = useMutation({
    mutationFn: async (data: typeof productionStageFormData) => {
      return apiRequest("POST", "/api/production-stages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-stages"] });
      toast({ title: "Production stage created successfully" });
      closeProductionStageDialog();
    },
    onError: () => {
      toast({ title: "Failed to create production stage", variant: "destructive" });
    },
  });

  const updateProductionStageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof productionStageFormData }) => {
      return apiRequest("PATCH", `/api/production-stages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-stages"] });
      toast({ title: "Production stage updated successfully" });
      closeProductionStageDialog();
    },
    onError: () => {
      toast({ title: "Failed to update production stage", variant: "destructive" });
    },
  });

  const deleteProductionStageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/production-stages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-stages"] });
      toast({ title: "Production stage deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete production stage", variant: "destructive" });
    },
  });

  const reorderProductionStageMutation = useMutation({
    mutationFn: async (stageIds: string[]) => {
      return apiRequest("POST", "/api/production-stages/reorder", { stageIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-stages"] });
    },
    onError: () => {
      toast({ title: "Failed to reorder production stages", variant: "destructive" });
    },
  });

  // Column dialog handlers
  const openCreateColumnDialog = () => {
    setEditingColumn(null);
    setColumnFormData({
      title: "",
      statuses: [],
      defaultStatus: "",
      color: "bg-slate-100 dark:bg-slate-800",
      isActive: true,
    });
    setIsColumnDialogOpen(true);
  };

  const openEditColumnDialog = (column: KanbanColumn) => {
    setEditingColumn(column);
    setColumnFormData({
      title: column.title,
      statuses: column.statuses || [],
      defaultStatus: column.defaultStatus,
      color: column.color,
      isActive: column.isActive,
    });
    setIsColumnDialogOpen(true);
  };

  const closeColumnDialog = () => {
    setIsColumnDialogOpen(false);
    setEditingColumn(null);
  };

  const handleColumnSubmit = () => {
    if (!columnFormData.title || columnFormData.statuses.length === 0 || !columnFormData.defaultStatus) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (editingColumn) {
      updateColumnMutation.mutate({ id: editingColumn.id, data: columnFormData });
    } else {
      createColumnMutation.mutate(columnFormData);
    }
  };

  const handleStatusToggle = (statusKey: string) => {
    setColumnFormData((prev) => {
      const newStatuses = prev.statuses.includes(statusKey)
        ? prev.statuses.filter((s) => s !== statusKey)
        : [...prev.statuses, statusKey];
      
      const newDefaultStatus = newStatuses.includes(prev.defaultStatus)
        ? prev.defaultStatus
        : newStatuses[0] || "";

      return { ...prev, statuses: newStatuses, defaultStatus: newDefaultStatus };
    });
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    const newColumns = [...columns];
    const temp = newColumns[index];
    newColumns[index] = newColumns[newIndex];
    newColumns[newIndex] = temp;

    reorderColumnMutation.mutate(newColumns.map((c) => c.id));
  };

  // Status dialog handlers
  const openCreateStatusDialog = () => {
    setEditingStatus(null);
    setStatusFormData({
      key: "",
      label: "",
      description: "",
      isActive: true,
    });
    setStatusDependencies([]);
    setIsStatusDialogOpen(true);
  };

  const openEditStatusDialog = (status: JobStatus) => {
    setEditingStatus(status);
    setStatusFormData({
      key: status.key,
      label: status.label,
      description: status.description || "",
      isActive: status.isActive,
    });
    const deps = allDependencies
      .filter(d => d.statusKey === status.key)
      .map(d => ({ prerequisiteKey: d.prerequisiteKey, dependencyType: d.dependencyType }));
    setStatusDependencies(deps);
    setIsStatusDialogOpen(true);
  };

  const closeStatusDialog = () => {
    setIsStatusDialogOpen(false);
    setEditingStatus(null);
    setStatusDependencies([]);
  };

  const handleStatusSubmit = async () => {
    if (!statusFormData.key || !statusFormData.label) {
      toast({ title: "Please fill in key and label", variant: "destructive" });
      return;
    }

    if (editingStatus) {
      await updateStatusMutation.mutateAsync({ id: editingStatus.id, data: statusFormData });
      await saveDependenciesMutation.mutateAsync({ 
        statusKey: statusFormData.key, 
        dependencies: statusDependencies 
      });
    } else {
      await createStatusMutation.mutateAsync(statusFormData);
      if (statusDependencies.length > 0) {
        await saveDependenciesMutation.mutateAsync({ 
          statusKey: statusFormData.key, 
          dependencies: statusDependencies 
        });
      }
    }
  };

  const moveStatus = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= jobStatuses.length) return;

    const newStatuses = [...jobStatuses];
    const temp = newStatuses[index];
    newStatuses[index] = newStatuses[newIndex];
    newStatuses[newIndex] = temp;

    reorderStatusMutation.mutate(newStatuses.map((s) => s.id));
  };

  const addDependency = () => {
    const availableStatuses = jobStatuses.filter(
      s => s.key !== statusFormData.key && !statusDependencies.some(d => d.prerequisiteKey === s.key)
    );
    if (availableStatuses.length > 0) {
      setStatusDependencies([...statusDependencies, { 
        prerequisiteKey: availableStatuses[0].key, 
        dependencyType: "mandatory" 
      }]);
    }
  };

  const removeDependency = (index: number) => {
    setStatusDependencies(statusDependencies.filter((_, i) => i !== index));
  };

  const updateDependency = (index: number, field: keyof DependencyConfig, value: string) => {
    const updated = [...statusDependencies];
    updated[index] = { ...updated[index], [field]: value };
    setStatusDependencies(updated);
  };

  const getStatusDependencyCount = (statusKey: string) => {
    return allDependencies.filter(d => d.statusKey === statusKey).length;
  };

  // Production stage dialog handlers
  const openCreateProductionStageDialog = () => {
    setEditingProductionStage(null);
    setProductionStageFormData({
      key: "",
      label: "",
      description: "",
      icon: "Factory",
      color: "bg-chart-1",
      isActive: true,
    });
    setIsProductionStageDialogOpen(true);
  };

  const openEditProductionStageDialog = (stage: ProductionStage) => {
    setEditingProductionStage(stage);
    setProductionStageFormData({
      key: stage.key,
      label: stage.label,
      description: stage.description || "",
      icon: stage.icon || "Factory",
      color: stage.color || "bg-chart-1",
      isActive: stage.isActive,
    });
    setIsProductionStageDialogOpen(true);
  };

  const closeProductionStageDialog = () => {
    setIsProductionStageDialogOpen(false);
    setEditingProductionStage(null);
  };

  const handleProductionStageSubmit = () => {
    if (!productionStageFormData.key || !productionStageFormData.label) {
      toast({ title: "Please fill in key and label", variant: "destructive" });
      return;
    }

    if (editingProductionStage) {
      updateProductionStageMutation.mutate({ id: editingProductionStage.id, data: productionStageFormData });
    } else {
      createProductionStageMutation.mutate(productionStageFormData);
    }
  };

  const moveProductionStage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= productionStages.length) return;

    const newStages = [...productionStages];
    const temp = newStages[index];
    newStages[index] = newStages[newIndex];
    newStages[newIndex] = temp;

    reorderProductionStageMutation.mutate(newStages.map((s) => s.id));
  };

  const isLoading = columnsLoading || statusesLoading || productionStagesLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-kanban-column-settings">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Columns3 className="h-6 w-6" />
          Kanban Settings
        </h1>
        <p className="text-muted-foreground">
          Configure kanban columns and job statuses
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="columns" className="flex items-center gap-2">
            <Columns3 className="h-4 w-4" />
            Columns
          </TabsTrigger>
          <TabsTrigger value="statuses" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Job Statuses
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Stages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateColumnDialog} data-testid="button-add-column">
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </div>

          <div className="space-y-3">
            {columns.map((column, index) => (
              <Card key={column.id} data-testid={`card-column-${column.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => moveColumn(index, "up")}
                        data-testid={`button-move-up-${column.id}`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === columns.length - 1}
                        onClick={() => moveColumn(index, "down")}
                        data-testid={`button-move-down-${column.id}`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <div
                      className={`w-4 h-12 rounded ${column.color}`}
                      title="Column color"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{column.title}</h3>
                        {!column.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(column.statuses || []).length} status(es) • Default: {column.defaultStatus}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditColumnDialog(column)}
                        data-testid={`button-edit-column-${column.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this column?")) {
                            deleteColumnMutation.mutate(column.id);
                          }
                        }}
                        data-testid={`button-delete-column-${column.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {columns.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Columns3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No kanban columns configured yet.</p>
                  <p className="text-sm">Click "Add Column" to create your first column.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="statuses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateStatusDialog} data-testid="button-add-status">
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          </div>

          <div className="space-y-3">
            {jobStatuses.map((status, index) => {
              const depCount = getStatusDependencyCount(status.key);
              return (
                <Card key={status.id} data-testid={`card-status-${status.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => moveStatus(index, "up")}
                          data-testid={`button-move-up-status-${status.id}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === jobStatuses.length - 1}
                          onClick={() => moveStatus(index, "down")}
                          data-testid={`button-move-down-status-${status.id}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{status.label}</h3>
                          <Badge variant="outline" className="text-xs font-mono">
                            {status.key}
                          </Badge>
                          {!status.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                          {depCount > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Link2 className="h-3 w-3" />
                              {depCount} prerequisite{depCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        {status.description && (
                          <p className="text-sm text-muted-foreground">{status.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditStatusDialog(status)}
                          data-testid={`button-edit-status-${status.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this status? This may affect existing jobs.")) {
                              deleteStatusMutation.mutate(status.id);
                            }
                          }}
                          data-testid={`button-delete-status-${status.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {jobStatuses.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No job statuses configured yet.</p>
                  <p className="text-sm">Click "Add Status" to create your first status.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateProductionStageDialog} data-testid="button-add-production-stage">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Configure the manufacturing stages displayed in production widgets and the Production Manager page.
            These stages track the progress of production tasks (e.g., Manufacturing Posts, Panels, Gates, QA Check).
          </div>

          <div className="space-y-2">
            {productionStages.map((stage, index) => (
              <Card key={stage.id} data-testid={`card-production-stage-${stage.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="cursor-move text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveProductionStage(index, "up")}
                        disabled={index === 0}
                        data-testid={`button-move-stage-up-${stage.id}`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveProductionStage(index, "down")}
                        disabled={index === productionStages.length - 1}
                        data-testid={`button-move-stage-down-${stage.id}`}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{stage.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {stage.key}
                        </Badge>
                        {!stage.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {stage.icon && (
                          <Badge variant="outline" className="text-xs">
                            Icon: {stage.icon}
                          </Badge>
                        )}
                      </div>
                      {stage.description && (
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditProductionStageDialog(stage)}
                        data-testid={`button-edit-production-stage-${stage.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this production stage?")) {
                            deleteProductionStageMutation.mutate(stage.id);
                          }
                        }}
                        data-testid={`button-delete-production-stage-${stage.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {productionStages.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No production stages configured yet.</p>
                  <p className="text-sm">Click "Add Stage" to create your first production stage.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? "Edit Column" : "Add New Column"}
            </DialogTitle>
            <DialogDescription>
              Configure the kanban column settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Column Title</Label>
              <Input
                id="title"
                value={columnFormData.title}
                onChange={(e) => setColumnFormData({ ...columnFormData, title: e.target.value })}
                placeholder="e.g., New Jobs, Pipeline, Production"
                data-testid="input-column-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Column Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded border-2 ${color.value} ${
                      columnFormData.color === color.value
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-transparent"
                    }`}
                    onClick={() => setColumnFormData({ ...columnFormData, color: color.value })}
                    title={color.label}
                    data-testid={`button-color-${color.label.toLowerCase()}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Job Statuses in this Column</Label>
              <p className="text-xs text-muted-foreground">
                Select which job statuses should appear in this column
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                {jobStatuses.map((status) => (
                  <label
                    key={status.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={columnFormData.statuses.includes(status.key)}
                      onChange={() => handleStatusToggle(status.key)}
                      className="rounded"
                      data-testid={`checkbox-status-${status.key}`}
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {columnFormData.statuses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="defaultStatus">Default Status (for new jobs dropped here)</Label>
                <select
                  id="defaultStatus"
                  value={columnFormData.defaultStatus}
                  onChange={(e) => setColumnFormData({ ...columnFormData, defaultStatus: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  data-testid="select-default-status"
                >
                  {columnFormData.statuses.map((statusKey) => (
                    <option key={statusKey} value={statusKey}>
                      {jobStatuses.find((s) => s.key === statusKey)?.label || statusKey}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={columnFormData.isActive}
                onCheckedChange={(checked) => setColumnFormData({ ...columnFormData, isActive: checked })}
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeColumnDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleColumnSubmit}
              disabled={createColumnMutation.isPending || updateColumnMutation.isPending}
              data-testid="button-save-column"
            >
              {editingColumn ? "Update" : "Create"} Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Edit Status" : "Add New Status"}
            </DialogTitle>
            <DialogDescription>
              Configure the job status settings and prerequisites
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="statusKey">Status Key</Label>
              <Input
                id="statusKey"
                value={statusFormData.key}
                onChange={(e) => setStatusFormData({ ...statusFormData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., awaiting_approval"
                disabled={!!editingStatus}
                data-testid="input-status-key"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, underscores). Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusLabel">Display Label</Label>
              <Input
                id="statusLabel"
                value={statusFormData.label}
                onChange={(e) => setStatusFormData({ ...statusFormData, label: e.target.value })}
                placeholder="e.g., Awaiting Approval"
                data-testid="input-status-label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusDescription">Description (optional)</Label>
              <Input
                id="statusDescription"
                value={statusFormData.description}
                onChange={(e) => setStatusFormData({ ...statusFormData, description: e.target.value })}
                placeholder="Brief description of this status"
                data-testid="input-status-description"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="statusIsActive"
                checked={statusFormData.isActive}
                onCheckedChange={(checked) => setStatusFormData({ ...statusFormData, isActive: checked })}
                data-testid="switch-status-is-active"
              />
              <Label htmlFor="statusIsActive">Active</Label>
            </div>

            {/* Dependencies Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Prerequisites
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Which statuses must be completed before this one?
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDependency}
                  disabled={
                    jobStatuses.filter(
                      s => s.key !== statusFormData.key && !statusDependencies.some(d => d.prerequisiteKey === s.key)
                    ).length === 0
                  }
                  data-testid="button-add-dependency"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {statusDependencies.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">
                  No prerequisites. This status can be reached at any time.
                </p>
              ) : (
                <div className="space-y-2">
                  {statusDependencies.map((dep, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded bg-muted/30">
                      <Select
                        value={dep.prerequisiteKey}
                        onValueChange={(value) => updateDependency(index, 'prerequisiteKey', value)}
                      >
                        <SelectTrigger className="flex-1" data-testid={`select-prerequisite-${index}`}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobStatuses
                            .filter(s => s.key !== statusFormData.key)
                            .map((s) => (
                              <SelectItem 
                                key={s.key} 
                                value={s.key}
                                disabled={statusDependencies.some((d, i) => i !== index && d.prerequisiteKey === s.key)}
                              >
                                {s.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={dep.dependencyType}
                        onValueChange={(value) => updateDependency(index, 'dependencyType', value)}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-dep-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mandatory">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-destructive" />
                              Required
                            </span>
                          </SelectItem>
                          <SelectItem value="advisory">Advisory</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDependency(index)}
                        data-testid={`button-remove-dependency-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <strong>Required:</strong> Job cannot enter this status until prerequisite is done.<br />
                <strong>Advisory:</strong> Shows a warning but allows override.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStatusDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusSubmit}
              disabled={createStatusMutation.isPending || updateStatusMutation.isPending || saveDependenciesMutation.isPending}
              data-testid="button-save-status"
            >
              {editingStatus ? "Update" : "Create"} Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Production Stage Dialog */}
      <Dialog open={isProductionStageDialogOpen} onOpenChange={setIsProductionStageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProductionStage ? "Edit Production Stage" : "Add New Production Stage"}
            </DialogTitle>
            <DialogDescription>
              Configure the production stage settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stageKey">Stage Key</Label>
              <Input
                id="stageKey"
                value={productionStageFormData.key}
                onChange={(e) => setProductionStageFormData({ ...productionStageFormData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., manufacturing_posts"
                disabled={!!editingProductionStage}
                data-testid="input-production-stage-key"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, underscores). Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stageLabel">Display Label</Label>
              <Input
                id="stageLabel"
                value={productionStageFormData.label}
                onChange={(e) => setProductionStageFormData({ ...productionStageFormData, label: e.target.value })}
                placeholder="e.g., Manufacturing Posts"
                data-testid="input-production-stage-label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stageDescription">Description (optional)</Label>
              <Input
                id="stageDescription"
                value={productionStageFormData.description}
                onChange={(e) => setProductionStageFormData({ ...productionStageFormData, description: e.target.value })}
                placeholder="Brief description of this stage"
                data-testid="input-production-stage-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stageIcon">Icon Name (Lucide)</Label>
              <Input
                id="stageIcon"
                value={productionStageFormData.icon}
                onChange={(e) => setProductionStageFormData({ ...productionStageFormData, icon: e.target.value })}
                placeholder="e.g., Factory, Columns, DoorOpen, CheckCircle"
                data-testid="input-production-stage-icon"
              />
              <p className="text-xs text-muted-foreground">
                Enter a Lucide icon name (e.g., Factory, Columns, DoorOpen, CheckCircle)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Stage Color</Label>
              <Select
                value={productionStageFormData.color}
                onValueChange={(value) => setProductionStageFormData({ ...productionStageFormData, color: value })}
              >
                <SelectTrigger data-testid="select-production-stage-color">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bg-chart-1">Chart 1 (Blue)</SelectItem>
                  <SelectItem value="bg-chart-2">Chart 2 (Green)</SelectItem>
                  <SelectItem value="bg-chart-3">Chart 3 (Orange)</SelectItem>
                  <SelectItem value="bg-chart-4">Chart 4 (Purple)</SelectItem>
                  <SelectItem value="bg-chart-5">Chart 5 (Pink)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="stageIsActive"
                checked={productionStageFormData.isActive}
                onCheckedChange={(checked) => setProductionStageFormData({ ...productionStageFormData, isActive: checked })}
                data-testid="switch-production-stage-is-active"
              />
              <Label htmlFor="stageIsActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeProductionStageDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleProductionStageSubmit}
              disabled={createProductionStageMutation.isPending || updateProductionStageMutation.isPending}
              data-testid="button-save-production-stage"
            >
              {editingProductionStage ? "Update" : "Create"} Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
