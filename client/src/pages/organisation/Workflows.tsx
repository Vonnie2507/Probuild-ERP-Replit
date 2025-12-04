import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GitBranch, Plus, Pencil, Trash2, Search, Filter, Eye, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Workflow, Department, WorkflowVersion } from "@shared/schema";
import { format } from "date-fns";

const workflowFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["sales", "production", "install", "warehouse", "admin", "hr", "safety", "other"]),
  status: z.enum(["active", "draft", "archived"]).default("draft"),
  departmentId: z.string().optional(),
});

type WorkflowFormValues = z.infer<typeof workflowFormSchema>;

const categoryLabels: Record<string, string> = {
  sales: "Sales",
  production: "Production",
  install: "Installation",
  warehouse: "Warehouse",
  admin: "Admin",
  hr: "HR",
  safety: "Safety",
  other: "Other",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function Workflows() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [viewingWorkflow, setViewingWorkflow] = useState<Workflow | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['/api/organisation/workflows'],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/organisation/departments'],
  });

  const { data: workflowVersions = [] } = useQuery<WorkflowVersion[]>({
    queryKey: ['/api/organisation/workflows', viewingWorkflow?.id, 'versions'],
    enabled: !!viewingWorkflow,
  });

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      status: "draft",
      departmentId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkflowFormValues) => {
      return apiRequest('POST', '/api/organisation/workflows', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/workflows'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Workflow created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create workflow", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WorkflowFormValues }) => {
      return apiRequest('PATCH', `/api/organisation/workflows/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/workflows'] });
      setEditingWorkflow(null);
      form.reset();
      toast({ title: "Workflow updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update workflow", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/organisation/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/workflows'] });
      setDeletingWorkflow(null);
      toast({ title: "Workflow deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete workflow", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (data: WorkflowFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: WorkflowFormValues) => {
    if (editingWorkflow) {
      updateMutation.mutate({ id: editingWorkflow.id, data });
    }
  };

  const openEditDialog = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    form.reset({
      title: workflow.title,
      description: workflow.description || "",
      category: workflow.category as any,
      status: workflow.status as any,
      departmentId: workflow.departmentId || "",
    });
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = 
      workflow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || workflow.category === categoryFilter;
    const matchesStatus = !statusFilter || workflow.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    const department = departments.find(d => d.id === departmentId);
    return department?.name;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Workflows & SOPs</h1>
          <p className="text-muted-foreground">Standard operating procedures and workflows</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-workflow">
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>Add a new workflow or SOP to your organisation.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. New Lead Processing" data-testid="input-workflow-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Workflow description..." data-testid="input-workflow-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-workflow-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-workflow-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-workflow-department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-workflow">
                    {createMutation.isPending ? "Creating..." : "Create Workflow"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-workflows"
          />
        </div>
        <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-40" data-testid="filter-category">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-32" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 w-32 bg-muted rounded"></div>
                <div className="h-4 w-48 bg-muted rounded"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No workflows found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || categoryFilter || statusFilter ? "Try adjusting your filters" : "Create your first workflow to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} data-testid={`card-workflow-${workflow.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{workflow.title}</CardTitle>
                      {workflow.description && (
                        <CardDescription className="line-clamp-2">{workflow.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setViewingWorkflow(workflow)}
                      data-testid={`button-view-workflow-${workflow.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(workflow)}
                      data-testid={`button-edit-workflow-${workflow.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeletingWorkflow(workflow)}
                      data-testid={`button-delete-workflow-${workflow.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{categoryLabels[workflow.category] || workflow.category}</Badge>
                  <Badge className={statusColors[workflow.status]}>
                    {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                  </Badge>
                  {workflow.departmentId && (
                    <Badge variant="secondary">{getDepartmentName(workflow.departmentId)}</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Updated {format(new Date(workflow.updatedAt), 'dd MMM yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingWorkflow} onOpenChange={(open) => !open && setEditingWorkflow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>Update workflow details.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-workflow-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-workflow-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-workflow-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-workflow-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-workflow-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-workflow">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingWorkflow} onOpenChange={(open) => !open && setViewingWorkflow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingWorkflow?.title}</DialogTitle>
            <DialogDescription>{viewingWorkflow?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {viewingWorkflow && (
                <>
                  <Badge variant="outline">{categoryLabels[viewingWorkflow.category]}</Badge>
                  <Badge className={statusColors[viewingWorkflow.status]}>
                    {viewingWorkflow.status.charAt(0).toUpperCase() + viewingWorkflow.status.slice(1)}
                  </Badge>
                </>
              )}
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Version History</h4>
              {workflowVersions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions created yet.</p>
              ) : (
                <div className="space-y-2">
                  {workflowVersions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div>
                        <span className="font-medium">v{version.versionNumber}</span>
                        {version.changeSummary && (
                          <span className="ml-2 text-sm text-muted-foreground">{version.changeSummary}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(version.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingWorkflow} onOpenChange={(open) => !open && setDeletingWorkflow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingWorkflow?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingWorkflow(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingWorkflow && deleteMutation.mutate(deletingWorkflow.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
