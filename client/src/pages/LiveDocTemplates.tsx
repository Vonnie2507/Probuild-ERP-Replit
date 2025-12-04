import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileText, Plus, Pencil, Trash2, Star, Check, Search, Eye, MapPin, Package, Wrench, Calendar, ClipboardCheck, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  FormDescription,
} from "@/components/ui/form";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import type { LiveDocumentTemplate, TemplateSectionConfig, JobSetupSection1Sales, JobSetupSection3Production, JobSetupSection4Schedule, JobSetupSection5Install } from "@shared/schema";

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const sectionIcons = {
  1: MapPin,
  2: Package,
  3: Wrench,
  4: Calendar,
  5: ClipboardCheck,
};

const sectionTitles = {
  1: "Sales & Site Info",
  2: "Products / BOM",
  3: "Production Notes",
  4: "Scheduling",
  5: "Install Notes & Sign-off",
};

function SectionConfigDisplay({ 
  sectionNumber, 
  config, 
  defaults 
}: { 
  sectionNumber: number; 
  config?: TemplateSectionConfig | null;
  defaults?: JobSetupSection1Sales | JobSetupSection3Production | JobSetupSection4Schedule | JobSetupSection5Install | Record<string, unknown> | null;
}) {
  const Icon = sectionIcons[sectionNumber as keyof typeof sectionIcons];
  const defaultTitle = sectionTitles[sectionNumber as keyof typeof sectionTitles];
  
  const title = config?.title || defaultTitle;
  const description = config?.description;
  const requiredFields = config?.requiredBeforeComplete || [];

  const renderDefaults = () => {
    if (!defaults || Object.keys(defaults).length === 0) {
      return <p className="text-sm text-muted-foreground italic">No default values configured</p>;
    }

    const entries = Object.entries(defaults);
    
    return (
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, value]) => {
          const displayKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
          
          let displayValue: string;
          if (typeof value === 'boolean') {
            displayValue = value ? 'Yes' : 'No';
          } else if (value === null || value === undefined) {
            displayValue = '-';
          } else {
            displayValue = String(value);
          }
          
          return (
            <div key={key} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground truncate flex-1">{displayKey}</span>
              <Badge variant={typeof value === 'boolean' ? (value ? 'default' : 'secondary') : 'outline'} className="ml-2 shrink-0">
                {displayValue}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AccordionItem value={`section-${sectionNumber}`} className="border rounded-lg px-4 mb-2">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-medium">Section {sectionNumber}: {title}</p>
            {description && (
              <p className="text-xs text-muted-foreground font-normal">{description}</p>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="space-y-4 pt-2">
          {requiredFields.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Required fields before completion:</p>
              <div className="flex flex-wrap gap-1">
                {requiredFields.map((field) => (
                  <Badge key={field} variant="outline" className="text-xs">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium mb-2">Default Values:</p>
            {renderDefaults()}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function TemplateDetailDialog({ template, open, onOpenChange }: { 
  template: LiveDocumentTemplate; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {template.name}
            {template.isDefault && (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            )}
          </DialogTitle>
          <DialogDescription>
            {template.description || "Template configuration and default values for each section"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline">Job Setup & Handover</Badge>
          {template.isActive ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
          {template.isDefault && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Default
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[60vh] pr-4">
          <Accordion type="multiple" defaultValue={["section-1"]} className="w-full">
            <SectionConfigDisplay 
              sectionNumber={1} 
              config={template.section1Config} 
              defaults={template.section1Defaults}
            />
            <SectionConfigDisplay 
              sectionNumber={2} 
              config={template.section2Config} 
              defaults={template.section2Defaults}
            />
            <SectionConfigDisplay 
              sectionNumber={3} 
              config={template.section3Config} 
              defaults={template.section3Defaults}
            />
            <SectionConfigDisplay 
              sectionNumber={4} 
              config={template.section4Config} 
              defaults={template.section4Defaults}
            />
            <SectionConfigDisplay 
              sectionNumber={5} 
              config={template.section5Config} 
              defaults={template.section5Defaults}
            />
          </Accordion>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LiveDocTemplates() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LiveDocumentTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<LiveDocumentTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<LiveDocumentTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<LiveDocumentTemplate[]>({
    queryKey: ['/api/live-doc-templates'],
  });

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      isDefault: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return apiRequest('POST', '/api/live-doc-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-doc-templates'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormValues }) => {
      return apiRequest('PATCH', `/api/live-doc-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-doc-templates'] });
      setEditingTemplate(null);
      form.reset();
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/live-doc-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-doc-templates'] });
      setDeletingTemplate(null);
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (data: TemplateFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: TemplateFormValues) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    }
  };

  const openEditDialog = (template: LiveDocumentTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      isActive: template.isActive ?? true,
      isDefault: template.isDefault ?? false,
    });
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TemplateFormContent = ({ onSubmit, isPending }: { onSubmit: (data: TemplateFormValues) => void; isPending: boolean }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Standard Job Setup" data-testid="input-template-name" />
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
                <Textarea {...field} placeholder="Describe what this template is used for..." data-testid="input-template-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription className="text-xs">
                  Active templates can be used for new documents
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-template-active"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Default Template</FormLabel>
                <FormDescription className="text-xs">
                  Set as the default template for new documents
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-template-default"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-template">
            {isPending ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">Live Document Templates</h1>
          <p className="text-muted-foreground">Manage reusable templates for job setup and handover documents</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>Create a new template for live documents.</DialogDescription>
            </DialogHeader>
            <TemplateFormContent onSubmit={handleCreateSubmit} isPending={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-templates"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery ? "Try a different search term" : "Create your first template to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="hover-elevate cursor-pointer" 
              data-testid={`card-template-${template.id}`}
              onClick={() => setViewingTemplate(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {template.name}
                      {template.isDefault && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingTemplate(template)}
                      data-testid={`button-view-template-${template.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingTemplate(template)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge variant="outline">
                    Job Setup & Handover
                  </Badge>
                  {template.isActive ? (
                    <Badge variant="default" className="bg-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {template.isDefault && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Default
                    </Badge>
                  )}
                </div>
                
                <Separator className="my-3" />
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium mb-2">5 Sections:</p>
                  <div className="grid grid-cols-1 gap-1">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const Icon = sectionIcons[num as keyof typeof sectionIcons];
                      const title = sectionTitles[num as keyof typeof sectionTitles];
                      return (
                        <div key={num} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Icon className="h-3 w-3" />
                          <span>{title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex items-center justify-end mt-3 text-xs text-primary">
                  <span>Click to view details</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewingTemplate && (
        <TemplateDetailDialog 
          template={viewingTemplate} 
          open={!!viewingTemplate} 
          onOpenChange={(open) => !open && setViewingTemplate(null)}
        />
      )}

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template details.</DialogDescription>
          </DialogHeader>
          <TemplateFormContent onSubmit={handleEditSubmit} isPending={updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteMutation.mutate(deletingTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
