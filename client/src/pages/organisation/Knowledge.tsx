import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BookOpen, Plus, Pencil, Trash2, Search, Eye, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import type { KnowledgeArticle, Department } from "@shared/schema";
import { format } from "date-fns";

const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  contentMarkdown: z.string().optional(),
  departmentId: z.string().optional(),
  isPublished: z.boolean().default(false),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

export default function Knowledge() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [publishedFilter, setPublishedFilter] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [viewingArticle, setViewingArticle] = useState<KnowledgeArticle | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<KnowledgeArticle | null>(null);

  const { data: articles = [], isLoading } = useQuery<KnowledgeArticle[]>({
    queryKey: ['/api/organisation/knowledge'],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/organisation/departments'],
  });

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      contentMarkdown: "",
      departmentId: "",
      isPublished: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ArticleFormValues) => {
      return apiRequest('POST', '/api/organisation/knowledge', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/knowledge'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Article created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create article", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ArticleFormValues }) => {
      return apiRequest('PATCH', `/api/organisation/knowledge/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/knowledge'] });
      setEditingArticle(null);
      form.reset();
      toast({ title: "Article updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update article", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/organisation/knowledge/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organisation/knowledge'] });
      setDeletingArticle(null);
      toast({ title: "Article deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete article", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (data: ArticleFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: ArticleFormValues) => {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data });
    }
  };

  const openEditDialog = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    form.reset({
      title: article.title,
      slug: article.slug,
      contentMarkdown: article.contentMarkdown || "",
      departmentId: article.departmentId || "",
      isPublished: article.isPublished,
    });
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.contentMarkdown?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = !departmentFilter || article.departmentId === departmentFilter;
    const matchesPublished = !publishedFilter || 
      (publishedFilter === "published" ? article.isPublished : !article.isPublished);
    return matchesSearch && matchesDepartment && matchesPublished;
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
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Knowledge Base</h1>
          <p className="text-muted-foreground">Company knowledge and documentation</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-article">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Article</DialogTitle>
              <DialogDescription>Add a new knowledge base article.</DialogDescription>
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
                        <Input 
                          {...field} 
                          placeholder="e.g. How to Process a New Lead" 
                          data-testid="input-article-title"
                          onChange={(e) => {
                            field.onChange(e);
                            const currentSlug = form.getValues("slug");
                            if (!currentSlug || currentSlug === generateSlug(form.getValues("title"))) {
                              form.setValue("slug", generateSlug(e.target.value));
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="how-to-process-a-new-lead" data-testid="input-article-slug" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contentMarkdown"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (Markdown)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Write your article content here using Markdown..." 
                          className="min-h-[200px] font-mono text-sm"
                          data-testid="input-article-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department (optional)</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} defaultValue={field.value || "_none"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-article-department">
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
                  <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Published</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-article-published"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-article">
                    {createMutation.isPending ? "Creating..." : "Create Article"}
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
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-articles"
          />
        </div>
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
        <Select value={publishedFilter || "all"} onValueChange={(val) => setPublishedFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-32" data-testid="filter-published">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
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
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No articles found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || departmentFilter || publishedFilter ? "Try adjusting your filters" : "Create your first article to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => (
            <Card key={article.id} data-testid={`card-article-${article.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{article.title}</CardTitle>
                      <CardDescription className="text-xs font-mono">/{article.slug}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setViewingArticle(article)}
                      data-testid={`button-view-article-${article.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditDialog(article)}
                      data-testid={`button-edit-article-${article.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeletingArticle(article)}
                      data-testid={`button-delete-article-${article.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={article.isPublished 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }>
                    {article.isPublished ? "Published" : "Draft"}
                  </Badge>
                  {article.departmentId && (
                    <Badge variant="secondary">{getDepartmentName(article.departmentId)}</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Updated {format(new Date(article.updatedAt), 'dd MMM yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingArticle} onOpenChange={(open) => !open && setEditingArticle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>Update article content.</DialogDescription>
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
                      <Input {...field} data-testid="input-edit-article-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-article-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contentMarkdown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[200px] font-mono text-sm"
                        data-testid="input-edit-article-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department (optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "_none" ? "" : val)} value={field.value || "_none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-article-department">
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
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Published</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-article-published"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-article">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingArticle} onOpenChange={(open) => !open && setViewingArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingArticle?.title}</DialogTitle>
            <DialogDescription className="font-mono">/{viewingArticle?.slug}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {viewingArticle && (
                <>
                  <Badge className={viewingArticle.isPublished 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }>
                    {viewingArticle.isPublished ? "Published" : "Draft"}
                  </Badge>
                  {viewingArticle.departmentId && (
                    <Badge variant="secondary">{getDepartmentName(viewingArticle.departmentId)}</Badge>
                  )}
                </>
              )}
            </div>
            <div className="border-t pt-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {viewingArticle?.contentMarkdown ? (
                  <pre className="whitespace-pre-wrap font-sans">{viewingArticle.contentMarkdown}</pre>
                ) : (
                  <p className="text-muted-foreground">No content yet.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingArticle} onOpenChange={(open) => !open && setDeletingArticle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingArticle?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingArticle(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingArticle && deleteMutation.mutate(deletingArticle.id)}
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
