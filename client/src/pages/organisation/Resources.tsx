import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FolderOpen, Plus, Pencil, Trash2, Search, ExternalLink, FileText, Link2 } from "lucide-react";
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
import type { Resource, Department } from "@shared/schema";
import { format } from "date-fns";

const resourceFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  resourceType: z.enum(["file", "link"]),
  fileUrl: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  departmentId: z.string().optional(),
});

type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export default function Resources() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ['/api/organisation/resources'],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/organisation/departments'],
  });

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      resourceType: "link",
      fileUrl: "",
      externalUrl: "",
      departmentId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ResourceFormValues) => {
      return apiRequest('POST', '/api/organisation/resources', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/resources'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Resource created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create resource", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ResourceFormValues }) => {
      return apiRequest('PATCH', `/api/organisation/resources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/resources'] });
      setEditingResource(null);
      form.reset();
      toast({ title: "Resource updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update resource", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/organisation/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/resources'] });
      setDeletingResource(null);
      toast({ title: "Resource deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete resource", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (data: ResourceFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: ResourceFormValues) => {
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data });
    }
  };

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    form.reset({
      title: resource.title,
      description: resource.description || "",
      resourceType: resource.resourceType as any,
      fileUrl: resource.fileUrl || "",
      externalUrl: resource.externalUrl || "",
      departmentId: resource.departmentId || "",
    });
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || resource.resourceType === typeFilter;
    const matchesDepartment = !departmentFilter || resource.departmentId === departmentFilter;
    return matchesSearch && matchesType && matchesDepartment;
  });

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    const department = departments.find(d => d.id === departmentId);
    return department?.name;
  };

  const resourceType = form.watch("resourceType");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Resource Library</h1>
          <p className="text-muted-foreground">Centralised files and links for the team</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-resource">
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Resource</DialogTitle>
              <DialogDescription>Add a new file or link to the resource library.</DialogDescription>
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
                        <Input {...field} placeholder="e.g. Installation Guide" data-testid="input-resource-title" />
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
                        <Textarea {...field} placeholder="Brief description..." data-testid="input-resource-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-resource-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="link">External Link</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {resourceType === "link" && (
                  <FormField
                    control={form.control}
                    name="externalUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://..." data-testid="input-resource-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {resourceType === "file" && (
                  <FormField
                    control={form.control}
                    name="fileUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="File path or URL" data-testid="input-resource-file" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department (optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} defaultValue={field.value || "_none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-resource-department">
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
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-resource">
                    {createMutation.isPending ? "Adding..." : "Add Resource"}
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
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-resources"
          />
        </div>
        <Select value={typeFilter || "all"} onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-32" data-testid="filter-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="file">Files</SelectItem>
            <SelectItem value="link">Links</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter || "all"} onValueChange={(val) => setDepartmentFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-40" data-testid="filter-department">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
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
      ) : filteredResources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No resources found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || typeFilter || departmentFilter ? "Try adjusting your filters" : "Add your first resource to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id} data-testid={`card-resource-${resource.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {resource.resourceType === "link" ? (
                        <Link2 className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{resource.title}</CardTitle>
                      {resource.description && (
                        <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {resource.externalUrl && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        asChild
                      >
                        <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-resource-${resource.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(resource)}
                      data-testid={`button-edit-resource-${resource.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeletingResource(resource)}
                      data-testid={`button-delete-resource-${resource.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {resource.resourceType === "link" ? "Link" : "File"}
                  </Badge>
                  {resource.departmentId && (
                    <Badge variant="secondary">{getDepartmentName(resource.departmentId)}</Badge>
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Added {format(new Date(resource.uploadedAt), 'dd MMM yyyy')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>Update resource details.</DialogDescription>
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
                      <Input {...field} data-testid="input-edit-resource-title" />
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
                      <Textarea {...field} data-testid="input-edit-resource-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-resource-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="link">External Link</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {resourceType === "link" && (
                <FormField
                  control={form.control}
                  name="externalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" data-testid="input-edit-resource-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {resourceType === "file" && (
                <FormField
                  control={form.control}
                  name="fileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File URL</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-resource-file" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} value={field.value || "_none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-resource-department">
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
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-resource">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingResource} onOpenChange={(open) => !open && setDeletingResource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingResource?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingResource(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingResource && deleteMutation.mutate(deletingResource.id)}
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
