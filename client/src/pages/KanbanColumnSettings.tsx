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
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Columns3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { KanbanColumn } from "@shared/schema";

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

const JOB_STATUSES = [
  { value: "accepted", label: "Accepted" },
  { value: "awaiting_deposit", label: "Awaiting Deposit" },
  { value: "deposit_paid", label: "Deposit Paid" },
  { value: "ready_for_production", label: "Ready for Production" },
  { value: "manufacturing_posts", label: "Manufacturing Posts" },
  { value: "manufacturing_panels", label: "Manufacturing Panels" },
  { value: "manufacturing_gates", label: "Manufacturing Gates" },
  { value: "qa_check", label: "QA Check" },
  { value: "ready_for_scheduling", label: "Ready for Scheduling" },
  { value: "scheduled", label: "Scheduled" },
  { value: "install_posts", label: "Install Posts" },
  { value: "install_panels", label: "Install Panels" },
  { value: "install_gates", label: "Install Gates" },
  { value: "install_complete", label: "Install Complete" },
  { value: "awaiting_final_payment", label: "Awaiting Final Payment" },
  { value: "paid_in_full", label: "Paid in Full" },
];

export default function KanbanColumnSettings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    statuses: [] as string[],
    defaultStatus: "",
    color: "bg-slate-100 dark:bg-slate-800",
    isActive: true,
  });

  const { data: columns = [], isLoading } = useQuery<KanbanColumn[]>({
    queryKey: ["/api/kanban-columns"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/kanban-columns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kanban-columns"] });
      toast({ title: "Column created successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create column", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/kanban-columns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kanban-columns"] });
      toast({ title: "Column updated successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update column", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
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

  const reorderMutation = useMutation({
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

  const openCreateDialog = () => {
    setEditingColumn(null);
    setFormData({
      title: "",
      statuses: [],
      defaultStatus: "",
      color: "bg-slate-100 dark:bg-slate-800",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (column: KanbanColumn) => {
    setEditingColumn(column);
    setFormData({
      title: column.title,
      statuses: column.statuses || [],
      defaultStatus: column.defaultStatus,
      color: column.color,
      isActive: column.isActive,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingColumn(null);
  };

  const handleSubmit = () => {
    if (!formData.title || formData.statuses.length === 0 || !formData.defaultStatus) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (editingColumn) {
      updateMutation.mutate({ id: editingColumn.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleStatusToggle = (status: string) => {
    setFormData((prev) => {
      const newStatuses = prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status];
      
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

    reorderMutation.mutate(newColumns.map((c) => c.id));
  };

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Columns3 className="h-6 w-6" />
            Kanban Column Settings
          </h1>
          <p className="text-muted-foreground">
            Configure the columns displayed on the Jobs kanban board
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-column">
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
                    onClick={() => openEditDialog(column)}
                    data-testid={`button-edit-column-${column.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this column?")) {
                        deleteMutation.mutate(column.id);
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                      formData.color === color.value
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-transparent"
                    }`}
                    onClick={() => setFormData({ ...formData, color: color.value })}
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
                {JOB_STATUSES.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.statuses.includes(status.value)}
                      onChange={() => handleStatusToggle(status.value)}
                      className="rounded"
                      data-testid={`checkbox-status-${status.value}`}
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {formData.statuses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="defaultStatus">Default Status (for new jobs dropped here)</Label>
                <select
                  id="defaultStatus"
                  value={formData.defaultStatus}
                  onChange={(e) => setFormData({ ...formData, defaultStatus: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  data-testid="select-default-status"
                >
                  {formData.statuses.map((status) => (
                    <option key={status} value={status}>
                      {JOB_STATUSES.find((s) => s.value === status)?.label || status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-column"
            >
              {editingColumn ? "Update" : "Create"} Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
