import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Shield, Plus, Pencil, Trash2, Search, Filter, Eye, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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
import type { Policy, Department, PolicyVersion, PolicyAcknowledgement } from "@shared/schema";
import { format } from "date-fns";

const policyFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["safety", "hr", "warehouse", "vehicles", "equipment", "operations", "other"]),
  status: z.enum(["active", "draft", "archived"]).default("draft"),
  departmentId: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

const categoryLabels: Record<string, string> = {
  safety: "Safety",
  hr: "HR",
  warehouse: "Warehouse",
  vehicles: "Vehicles",
  equipment: "Equipment",
  operations: "Operations",
  other: "Other",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function Policies() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<Policy | null>(null);

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ['/api/organisation/policies'],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/organisation/departments'],
  });

  const { data: policyVersions = [] } = useQuery<PolicyVersion[]>({
    queryKey: ['/api/organisation/policies', viewingPolicy?.id, 'versions'],
    enabled: !!viewingPolicy,
  });

  const { data: acknowledgements = [] } = useQuery<PolicyAcknowledgement[]>({
    queryKey: ['/api/organisation/policies', viewingPolicy?.id, 'acknowledgements'],
    enabled: !!viewingPolicy,
  });

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      title: "",
      category: "other",
      status: "draft",
      departmentId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PolicyFormValues) => {
      return apiRequest('POST', '/api/organisation/policies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/policies'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Policy created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create policy", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PolicyFormValues }) => {
      return apiRequest('PATCH', `/api/organisation/policies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/policies'] });
      setEditingPolicy(null);
      form.reset();
      toast({ title: "Policy updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update policy", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/organisation/policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/policies'] });
      setDeletingPolicy(null);
      toast({ title: "Policy deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete policy", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (data: PolicyFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: PolicyFormValues) => {
    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, data });
    }
  };

  const openEditDialog = (policy: Policy) => {
    setEditingPolicy(policy);
    form.reset({
      title: policy.title,
      category: policy.category as any,
      status: policy.status as any,
      departmentId: policy.departmentId || "",
    });
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || policy.category === categoryFilter;
    const matchesStatus = !statusFilter || policy.status === statusFilter;
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
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Policies & Procedures</h1>
          <p className="text-muted-foreground">Company policies with acknowledgement tracking</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-policy">
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Policy</DialogTitle>
              <DialogDescription>Add a new policy to your organisation.</DialogDescription>
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
                        <Input {...field} placeholder="e.g. Safety Guidelines" data-testid="input-policy-title" />
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
                            <SelectTrigger data-testid="select-policy-category">
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
                            <SelectTrigger data-testid="select-policy-status">
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
                      <FormLabel>Department (optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} defaultValue={field.value || "_none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-policy-department">
                            <SelectValue placeholder="All departments" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">All departments</SelectItem>
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
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-policy">
                    {createMutation.isPending ? "Creating..." : "Create Policy"}
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
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-policies"
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
      ) : filteredPolicies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No policies found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || categoryFilter || statusFilter ? "Try adjusting your filters" : "Create your first policy to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => (
            <Card key={policy.id} data-testid={`card-policy-${policy.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{policy.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {categoryLabels[policy.category] || policy.category}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setViewingPolicy(policy)}
                      data-testid={`button-view-policy-${policy.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(policy)}
                      data-testid={`button-edit-policy-${policy.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeletingPolicy(policy)}
                      data-testid={`button-delete-policy-${policy.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusColors[policy.status]}>
                    {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                  </Badge>
                  {policy.departmentId ? (
                    <Badge variant="secondary">{getDepartmentName(policy.departmentId)}</Badge>
                  ) : (
                    <Badge variant="outline">All Departments</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Updated {format(new Date(policy.updatedAt), 'dd MMM yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingPolicy} onOpenChange={(open) => !open && setEditingPolicy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
            <DialogDescription>Update policy details.</DialogDescription>
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
                      <Input {...field} data-testid="input-edit-policy-title" />
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
                          <SelectTrigger data-testid="select-edit-policy-category">
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
                          <SelectTrigger data-testid="select-edit-policy-status">
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
                    <FormLabel>Department (optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} value={field.value || "_none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-policy-department">
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">All departments</SelectItem>
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
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-policy">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPolicy} onOpenChange={(open) => !open && setViewingPolicy(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingPolicy?.title}</DialogTitle>
            <DialogDescription>
              {categoryLabels[viewingPolicy?.category || '']} policy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {viewingPolicy && (
                <>
                  <Badge className={statusColors[viewingPolicy.status]}>
                    {viewingPolicy.status.charAt(0).toUpperCase() + viewingPolicy.status.slice(1)}
                  </Badge>
                  {viewingPolicy.departmentId ? (
                    <Badge variant="secondary">{getDepartmentName(viewingPolicy.departmentId)}</Badge>
                  ) : (
                    <Badge variant="outline">All Departments</Badge>
                  )}
                </>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Version History</h4>
              {policyVersions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No versions created yet.</p>
              ) : (
                <div className="space-y-2">
                  {policyVersions.map((version) => (
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

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Acknowledgements ({acknowledgements.length})
              </h4>
              {acknowledgements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No acknowledgements yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {acknowledgements.map((ack) => (
                    <div key={ack.id} className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20">
                      <span className="text-sm">{ack.userId}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ack.acknowledgedAt), 'dd MMM yyyy HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingPolicy} onOpenChange={(open) => !open && setDeletingPolicy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingPolicy?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPolicy(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingPolicy && deleteMutation.mutate(deletingPolicy.id)}
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
