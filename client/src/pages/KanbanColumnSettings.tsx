import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Columns3,
  ArrowUp,
  ArrowDown,
  ListTodo,
} from "lucide-react";
import type { KanbanColumn, JobStatus } from "@shared/schema";

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

  // Fetch columns and statuses
  const { data: columns = [], isLoading: columnsLoading } = useQuery<KanbanColumn[]>({
    queryKey: ["/api/kanban-columns"],
  });

  const { data: jobStatuses = [], isLoading: statusesLoading } = useQuery<JobStatus[]>({
    queryKey: ["/api/job-statuses"],
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
    setIsStatusDialogOpen(true);
  };

  const closeStatusDialog = () => {
    setIsStatusDialogOpen(false);
    setEditingStatus(null);
  };

  const handleStatusSubmit = () => {
    if (!statusFormData.key || !statusFormData.label) {
      toast({ title: "Please fill in key and label", variant: "destructive" });
      return;
    }

    if (editingStatus) {
      updateStatusMutation.mutate({ id: editingStatus.id, data: statusFormData });
    } else {
      createStatusMutation.mutate(statusFormData);
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

  const isLoading = columnsLoading || statusesLoading;

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
            {jobStatuses.map((status, index) => (
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{status.label}</h3>
                        <Badge variant="outline" className="text-xs font-mono">
                          {status.key}
                        </Badge>
                        {!status.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
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
            ))}

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
      </Tabs>

      {/* Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? "Edit Column" : "Add New Column"}
            </DialogTitle>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Edit Status" : "Add New Status"}
            </DialogTitle>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStatusDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusSubmit}
              disabled={createStatusMutation.isPending || updateStatusMutation.isPending}
              data-testid="button-save-status"
            >
              {editingStatus ? "Update" : "Create"} Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
