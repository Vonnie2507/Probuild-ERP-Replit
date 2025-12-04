import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ClipboardList,
  FileText,
  Loader2,
  Package,
  Calendar,
  Wrench,
  Save,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  JobSetupDocument as JobSetupDocumentType,
  JobSetupProduct,
  JobSetupSection1Sales,
  JobSetupSection3Production,
  JobSetupSection4Schedule,
  JobSetupSection5Install,
} from "@shared/schema";

interface JobSetupDocumentProps {
  jobId: string;
  jobType: "supply_only" | "supply_install";
}

interface DocumentWithProducts extends JobSetupDocumentType {
  products?: JobSetupProduct[];
}

const SECTION_TITLES = {
  1: "Sales & Site Info",
  2: "Products / BOM",
  3: "Production Notes",
  4: "Scheduling",
  5: "Install Notes & Sign-off",
};

const SECTION_ICONS = {
  1: FileText,
  2: Package,
  3: Wrench,
  4: Calendar,
  5: ClipboardList,
};

export function JobSetupDocument({ jobId, jobType }: JobSetupDocumentProps) {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<string[]>(["section-1"]);

  const { data: document, isLoading } = useQuery<DocumentWithProducts>({
    queryKey: ["/api/jobs", jobId, "setup-document"],
    enabled: jobType === "supply_install",
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({
      sectionNumber,
      data,
    }: {
      sectionNumber: number;
      data: unknown;
    }) => {
      return apiRequest(
        "PATCH",
        `/api/job-setup-documents/${document?.id}/section${sectionNumber}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/jobs", jobId, "setup-document"],
      });
      toast({
        title: "Section Updated",
        description: "Changes have been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async ({
      sectionNumber,
      complete,
    }: {
      sectionNumber: number;
      complete: boolean;
    }) => {
      return apiRequest(
        "POST",
        `/api/job-setup-documents/${document?.id}/section/${sectionNumber}/complete`,
        { complete }
      );
    },
    onSuccess: (_, { sectionNumber, complete }) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/jobs", jobId, "setup-document"],
      });
      toast({
        title: complete ? "Section Completed" : "Section Reopened",
        description: `Section ${sectionNumber} has been ${complete ? "marked complete" : "reopened for editing"}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section status",
        variant: "destructive",
      });
    },
  });

  if (jobType !== "supply_install") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            Job Setup Documents are only available for Supply + Install jobs
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No setup document found for this job</p>
          <p className="text-xs mt-2">
            Setup documents are auto-created when a quote is accepted
          </p>
        </CardContent>
      </Card>
    );
  }

  const completedSections = [
    document.section1Complete,
    document.section2Complete,
    document.section3Complete,
    document.section4Complete,
    document.section5Complete,
  ].filter(Boolean).length;

  const progressPercent = (completedSections / 5) * 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Job Setup & Handover Progress
            </CardTitle>
            <Badge
              variant={
                document.status === "completed" ? "default" : "secondary"
              }
            >
              {document.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedSections} of 5 sections complete
              </span>
              <span className="font-semibold">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Accordion
        type="multiple"
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="space-y-2"
      >
        <Section1SalesInfo
          document={document}
          isComplete={document.section1Complete}
          onMarkComplete={(complete) =>
            markCompleteMutation.mutate({ sectionNumber: 1, complete })
          }
          onSave={(data) =>
            updateSectionMutation.mutate({ sectionNumber: 1, data })
          }
          isSaving={updateSectionMutation.isPending}
        />

        <Section2Products
          document={document}
          products={document.products || []}
          isComplete={document.section2Complete}
          onMarkComplete={(complete) =>
            markCompleteMutation.mutate({ sectionNumber: 2, complete })
          }
        />

        <Section3Production
          document={document}
          isComplete={document.section3Complete}
          onMarkComplete={(complete) =>
            markCompleteMutation.mutate({ sectionNumber: 3, complete })
          }
          onSave={(data) =>
            updateSectionMutation.mutate({ sectionNumber: 3, data })
          }
          isSaving={updateSectionMutation.isPending}
        />

        <Section4Schedule
          document={document}
          isComplete={document.section4Complete}
          onMarkComplete={(complete) =>
            markCompleteMutation.mutate({ sectionNumber: 4, complete })
          }
          onSave={(data) =>
            updateSectionMutation.mutate({ sectionNumber: 4, data })
          }
          isSaving={updateSectionMutation.isPending}
        />

        <Section5Install
          document={document}
          isComplete={document.section5Complete}
          onMarkComplete={(complete) =>
            markCompleteMutation.mutate({ sectionNumber: 5, complete })
          }
          onSave={(data) =>
            updateSectionMutation.mutate({ sectionNumber: 5, data })
          }
          isSaving={updateSectionMutation.isPending}
        />
      </Accordion>
    </div>
  );
}

interface SectionProps {
  document: DocumentWithProducts;
  isComplete: boolean | null;
  onMarkComplete: (complete: boolean) => void;
  onSave?: (data: unknown) => void;
  isSaving?: boolean;
}

function SectionHeader({
  sectionNumber,
  title,
  isComplete,
  onMarkComplete,
}: {
  sectionNumber: number;
  title: string;
  isComplete: boolean | null;
  onMarkComplete: (complete: boolean) => void;
}) {
  const Icon = SECTION_ICONS[sectionNumber as keyof typeof SECTION_ICONS];

  return (
    <div className="flex items-center justify-between w-full pr-2">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${isComplete ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
        >
          {isComplete ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        <div>
          <span className="font-medium">
            Section {sectionNumber}: {title}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground">
          {isComplete ? "Complete" : "Pending"}
        </span>
        <Switch
          checked={isComplete ?? false}
          onCheckedChange={onMarkComplete}
          data-testid={`switch-section-${sectionNumber}-complete`}
        />
      </div>
    </div>
  );
}

function Section1SalesInfo({
  document,
  isComplete,
  onMarkComplete,
  onSave,
  isSaving,
}: SectionProps) {
  const section = (document.section1Sales as JobSetupSection1Sales) || {};
  const [formData, setFormData] = useState({
    oldFenceBeingRemoved: section.oldFenceBeingRemoved ?? false,
    oldFenceMaterial: section.oldFenceMaterial ?? "",
    oldFenceAgeYears: section.oldFenceAgeYears ?? "",
    allFootingsRemoved: section.allFootingsRemoved ?? false,
    reticInGround: section.reticInGround ?? false,
    reticNotes: section.reticNotes ?? "",
    undergroundServicesKnown: section.undergroundServicesKnown ?? false,
    undergroundServicesNotes: section.undergroundServicesNotes ?? "",
    poolArea: section.poolArea ?? false,
    dogsOnSite: section.dogsOnSite ?? false,
    lockedGatesOrRestrictedAccess: section.lockedGatesOrRestrictedAccess ?? false,
    someoneHomeOnInstallDay: section.someoneHomeOnInstallDay ?? false,
    drivewayAccessDescription: section.drivewayAccessDescription ?? "",
    steepOrSlopingSite: section.steepOrSlopingSite ?? false,
    siteHazardsNotes: section.siteHazardsNotes ?? "",
    needsCoreDrill: section.needsCoreDrill ?? false,
    needsChainsaw: section.needsChainsaw ?? false,
    needsAuger: section.needsAuger ?? false,
    needsSkipBin: section.needsSkipBin ?? false,
    needsExtraLabor: section.needsExtraLabor ?? false,
    equipmentOtherNotes: section.equipmentOtherNotes ?? "",
    fenceTotalMetres: section.fenceTotalMetres ?? 0,
    fenceHeightMm: section.fenceHeightMm ?? 0,
    numGates: section.numGates ?? 0,
    gateOpeningsDescription: section.gateOpeningsDescription ?? "",
    rakedOrStepped: section.rakedOrStepped ?? "",
    panelsLayoutNotes: section.panelsLayoutNotes ?? "",
    clientConfirmationText: section.clientConfirmationText ?? "",
    clientSignedAt: section.clientSignedAt ?? "",
  });

  const handleSave = () => {
    onSave?.(formData);
  };

  return (
    <AccordionItem value="section-1" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <SectionHeader
          sectionNumber={1}
          title={SECTION_TITLES[1]}
          isComplete={isComplete}
          onMarkComplete={onMarkComplete}
        />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Old fence being removed?</Label>
              <Switch
                checked={formData.oldFenceBeingRemoved}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, oldFenceBeingRemoved: v })
                }
                data-testid="switch-old-fence-removed"
              />
            </div>
            {formData.oldFenceBeingRemoved && (
              <div className="space-y-2">
                <Label className="text-sm">Old fence material</Label>
                <Input
                  value={formData.oldFenceMaterial}
                  onChange={(e) =>
                    setFormData({ ...formData, oldFenceMaterial: e.target.value })
                  }
                  placeholder="e.g., Timber, Colorbond"
                  data-testid="input-old-fence-material"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">All footings removed?</Label>
              <Switch
                checked={formData.allFootingsRemoved}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, allFootingsRemoved: v })
                }
                data-testid="switch-footings-removed"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Retic in ground?</Label>
              <Switch
                checked={formData.reticInGround}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, reticInGround: v })
                }
                data-testid="switch-retic-ground"
              />
            </div>
          </div>

          {formData.reticInGround && (
            <div className="space-y-2">
              <Label className="text-sm">Retic notes</Label>
              <Textarea
                value={formData.reticNotes}
                onChange={(e) =>
                  setFormData({ ...formData, reticNotes: e.target.value })
                }
                placeholder="Notes about reticulation..."
                data-testid="textarea-retic-notes"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Underground services known?</Label>
              <Switch
                checked={formData.undergroundServicesKnown}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, undergroundServicesKnown: v })
                }
                data-testid="switch-underground-services"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Pool area?</Label>
              <Switch
                checked={formData.poolArea}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, poolArea: v })
                }
                data-testid="switch-pool-area"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Dogs on site?</Label>
              <Switch
                checked={formData.dogsOnSite}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, dogsOnSite: v })
                }
                data-testid="switch-dogs-on-site"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Someone home on install day?</Label>
              <Switch
                checked={formData.someoneHomeOnInstallDay}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, someoneHomeOnInstallDay: v })
                }
                data-testid="switch-someone-home"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Locked gates/restricted access?</Label>
              <Switch
                checked={formData.lockedGatesOrRestrictedAccess}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, lockedGatesOrRestrictedAccess: v })
                }
                data-testid="switch-locked-gates"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Steep or sloping site?</Label>
              <Switch
                checked={formData.steepOrSlopingSite}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, steepOrSlopingSite: v })
                }
                data-testid="switch-steep-site"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Driveway access description</Label>
            <Textarea
              value={formData.drivewayAccessDescription}
              onChange={(e) =>
                setFormData({ ...formData, drivewayAccessDescription: e.target.value })
              }
              placeholder="Describe driveway/site access..."
              data-testid="textarea-driveway-access"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Site hazards notes</Label>
            <Textarea
              value={formData.siteHazardsNotes}
              onChange={(e) =>
                setFormData({ ...formData, siteHazardsNotes: e.target.value })
              }
              placeholder="Any site hazards to be aware of..."
              data-testid="textarea-site-hazards"
            />
          </div>

          <h4 className="font-medium text-sm pt-2">Equipment Required</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Core drill</Label>
              <Switch
                checked={formData.needsCoreDrill}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, needsCoreDrill: v })
                }
                data-testid="switch-core-drill"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Chainsaw</Label>
              <Switch
                checked={formData.needsChainsaw}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, needsChainsaw: v })
                }
                data-testid="switch-chainsaw"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Auger</Label>
              <Switch
                checked={formData.needsAuger}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, needsAuger: v })
                }
                data-testid="switch-auger"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Skip bin</Label>
              <Switch
                checked={formData.needsSkipBin}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, needsSkipBin: v })
                }
                data-testid="switch-skip-bin"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Extra labor</Label>
              <Switch
                checked={formData.needsExtraLabor}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, needsExtraLabor: v })
                }
                data-testid="switch-extra-labor"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Other equipment notes</Label>
            <Textarea
              value={formData.equipmentOtherNotes}
              onChange={(e) =>
                setFormData({ ...formData, equipmentOtherNotes: e.target.value })
              }
              placeholder="Any other equipment required..."
              data-testid="textarea-equipment-notes"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-section1">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function Section2Products({
  document,
  products,
  isComplete,
  onMarkComplete,
}: SectionProps & { products: JobSetupProduct[] }) {
  return (
    <AccordionItem value="section-2" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <SectionHeader
          sectionNumber={2}
          title={SECTION_TITLES[2]}
          isComplete={isComplete}
          onMarkComplete={onMarkComplete}
        />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          {Boolean((document.section2ProductsMeta as Record<string, boolean> | null)?.autoPopulatedFromQuote) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <Check className="h-4 w-4 text-green-500" />
              <span>Products auto-populated from quote</span>
            </div>
          )}

          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                    <TableCell className="font-medium">
                      {product.productName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {product.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No products in BOM</p>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full" data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function Section3Production({
  document,
  isComplete,
  onMarkComplete,
  onSave,
  isSaving,
}: SectionProps) {
  const section = (document.section3Production as JobSetupSection3Production) || {};
  const [formData, setFormData] = useState({
    postsManufactured: section.postsManufactured ?? false,
    panelsManufactured: section.panelsManufactured ?? false,
    gatesFabricated: section.gatesFabricated ?? false,
    hardwarePacked: section.hardwarePacked ?? false,
    accessoriesPacked: section.accessoriesPacked ?? false,
    cementAndMaterialsPrepared: section.cementAndMaterialsPrepared ?? false,
    productionSpecialNotes: section.productionSpecialNotes ?? "",
    productionCompletedBy: section.productionCompletedBy ?? "",
    productionCompletedAt: section.productionCompletedAt ?? "",
  });

  const handleSave = () => {
    onSave?.(formData);
  };

  return (
    <AccordionItem value="section-3" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <SectionHeader
          sectionNumber={3}
          title={SECTION_TITLES[3]}
          isComplete={isComplete}
          onMarkComplete={onMarkComplete}
        />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Production Checklist</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Posts manufactured</Label>
              <Switch
                checked={formData.postsManufactured}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, postsManufactured: v })
                }
                data-testid="switch-posts-manufactured"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Panels manufactured</Label>
              <Switch
                checked={formData.panelsManufactured}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, panelsManufactured: v })
                }
                data-testid="switch-panels-manufactured"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Gates fabricated</Label>
              <Switch
                checked={formData.gatesFabricated}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, gatesFabricated: v })
                }
                data-testid="switch-gates-fabricated"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Hardware packed</Label>
              <Switch
                checked={formData.hardwarePacked}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, hardwarePacked: v })
                }
                data-testid="switch-hardware-packed"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Accessories packed</Label>
              <Switch
                checked={formData.accessoriesPacked}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, accessoriesPacked: v })
                }
                data-testid="switch-accessories-packed"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Cement & materials prepared</Label>
              <Switch
                checked={formData.cementAndMaterialsPrepared}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, cementAndMaterialsPrepared: v })
                }
                data-testid="switch-cement-prepared"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Production special notes</Label>
            <Textarea
              value={formData.productionSpecialNotes}
              onChange={(e) =>
                setFormData({ ...formData, productionSpecialNotes: e.target.value })
              }
              placeholder="Notes for the production team..."
              data-testid="textarea-production-notes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Completed by</Label>
              <Input
                value={formData.productionCompletedBy}
                onChange={(e) =>
                  setFormData({ ...formData, productionCompletedBy: e.target.value })
                }
                placeholder="Staff member name"
                data-testid="input-production-completed-by"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Completed at</Label>
              <Input
                type="datetime-local"
                value={formData.productionCompletedAt}
                onChange={(e) =>
                  setFormData({ ...formData, productionCompletedAt: e.target.value })
                }
                data-testid="input-production-completed-at"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-section3">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function Section4Schedule({
  document,
  isComplete,
  onMarkComplete,
  onSave,
  isSaving,
}: SectionProps) {
  const section = (document.section4Schedule as JobSetupSection4Schedule) || {};
  const [formData, setFormData] = useState({
    schedulingReadyForInstall: section.schedulingReadyForInstall ?? false,
    proposedInstallDate: section.proposedInstallDate ?? "",
    confirmInstallDateWithClient: section.confirmInstallDateWithClient ?? false,
    installTimeWindow: section.installTimeWindow ?? "",
    installerTeamAssigned: section.installerTeamAssigned ?? "",
    isSupplyOnlyPickup: section.isSupplyOnlyPickup ?? false,
    pickupOrDeliveryNotes: section.pickupOrDeliveryNotes ?? "",
    schedulerNotes: section.schedulerNotes ?? "",
    scheduledBy: section.scheduledBy ?? "",
    scheduledAt: section.scheduledAt ?? "",
    requiresCoreDrill: section.requiresCoreDrill ?? false,
    requiresChainsaw: section.requiresChainsaw ?? false,
    requiresAuger: section.requiresAuger ?? false,
    requiresSkipBin: section.requiresSkipBin ?? false,
  });

  const handleSave = () => {
    onSave?.(formData);
  };

  return (
    <AccordionItem value="section-4" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <SectionHeader
          sectionNumber={4}
          title={SECTION_TITLES[4]}
          isComplete={isComplete}
          onMarkComplete={onMarkComplete}
        />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded">
            <Label className="text-sm">Ready for install scheduling?</Label>
            <Switch
              checked={formData.schedulingReadyForInstall}
              onCheckedChange={(v) =>
                setFormData({ ...formData, schedulingReadyForInstall: v })
              }
              data-testid="switch-ready-install"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Proposed install date</Label>
              <Input
                type="date"
                value={formData.proposedInstallDate}
                onChange={(e) =>
                  setFormData({ ...formData, proposedInstallDate: e.target.value })
                }
                data-testid="input-proposed-date"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Install time window</Label>
              <Input
                value={formData.installTimeWindow}
                onChange={(e) =>
                  setFormData({ ...formData, installTimeWindow: e.target.value })
                }
                placeholder="e.g., Morning, Afternoon, All day"
                data-testid="input-install-window"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <Label className="text-sm">Date confirmed with client?</Label>
            <Switch
              checked={formData.confirmInstallDateWithClient}
              onCheckedChange={(v) =>
                setFormData({ ...formData, confirmInstallDateWithClient: v })
              }
              data-testid="switch-date-confirmed"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Installer team assigned</Label>
            <Input
              value={formData.installerTeamAssigned}
              onChange={(e) =>
                setFormData({ ...formData, installerTeamAssigned: e.target.value })
              }
              placeholder="e.g., Team A, John & Mike"
              data-testid="input-installer-team"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <Label className="text-sm">Supply only (customer pickup)?</Label>
            <Switch
              checked={formData.isSupplyOnlyPickup}
              onCheckedChange={(v) =>
                setFormData({ ...formData, isSupplyOnlyPickup: v })
              }
              data-testid="switch-supply-only"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Pickup/delivery notes</Label>
            <Textarea
              value={formData.pickupOrDeliveryNotes}
              onChange={(e) =>
                setFormData({ ...formData, pickupOrDeliveryNotes: e.target.value })
              }
              placeholder="Details about pickup or delivery..."
              data-testid="textarea-pickup-notes"
            />
          </div>

          <h4 className="font-medium text-sm pt-2">Equipment Required</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Core drill</Label>
              <Switch
                checked={formData.requiresCoreDrill}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, requiresCoreDrill: v })
                }
                data-testid="switch-req-core-drill"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Chainsaw</Label>
              <Switch
                checked={formData.requiresChainsaw}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, requiresChainsaw: v })
                }
                data-testid="switch-req-chainsaw"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Auger</Label>
              <Switch
                checked={formData.requiresAuger}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, requiresAuger: v })
                }
                data-testid="switch-req-auger"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Skip bin</Label>
              <Switch
                checked={formData.requiresSkipBin}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, requiresSkipBin: v })
                }
                data-testid="switch-req-skip-bin"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Scheduler notes</Label>
            <Textarea
              value={formData.schedulerNotes}
              onChange={(e) =>
                setFormData({ ...formData, schedulerNotes: e.target.value })
              }
              placeholder="Additional scheduling notes..."
              data-testid="textarea-scheduler-notes"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-section4">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function Section5Install({
  document,
  isComplete,
  onMarkComplete,
  onSave,
  isSaving,
}: SectionProps) {
  const section = (document.section5Install as JobSetupSection5Install) || {};
  const [formData, setFormData] = useState({
    installerCheckedMaterialsComplete: section.installerCheckedMaterialsComplete ?? false,
    installerCheckedToolsLoaded: section.installerCheckedToolsLoaded ?? false,
    installerConfirmedSiteAccessOk: section.installerConfirmedSiteAccessOk ?? false,
    installerReadSiteNotes: section.installerReadSiteNotes ?? false,
    installerPrestartNotes: section.installerPrestartNotes ?? "",
    installerPrestartCompletedBy: section.installerPrestartCompletedBy ?? "",
    installerPrestartCompletedAt: section.installerPrestartCompletedAt ?? "",
    installCompleted: section.installCompleted ?? false,
    completionNotes: section.completionNotes ?? "",
    clientSignedCompletion: section.clientSignedCompletion ?? false,
    clientSignedCompletionAt: section.clientSignedCompletionAt ?? "",
    installerCompletionBy: section.installerCompletionBy ?? "",
    installerCompletionAt: section.installerCompletionAt ?? "",
  });

  const handleSave = () => {
    onSave?.(formData);
  };

  return (
    <AccordionItem value="section-5" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <SectionHeader
          sectionNumber={5}
          title={SECTION_TITLES[5]}
          isComplete={isComplete}
          onMarkComplete={onMarkComplete}
        />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Pre-Start Checklist</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Materials complete?</Label>
              <Switch
                checked={formData.installerCheckedMaterialsComplete}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, installerCheckedMaterialsComplete: v })
                }
                data-testid="switch-materials-complete"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Tools loaded?</Label>
              <Switch
                checked={formData.installerCheckedToolsLoaded}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, installerCheckedToolsLoaded: v })
                }
                data-testid="switch-tools-loaded"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Site access OK?</Label>
              <Switch
                checked={formData.installerConfirmedSiteAccessOk}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, installerConfirmedSiteAccessOk: v })
                }
                data-testid="switch-site-access-ok"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label className="text-sm">Read site notes?</Label>
              <Switch
                checked={formData.installerReadSiteNotes}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, installerReadSiteNotes: v })
                }
                data-testid="switch-read-site-notes"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Pre-start notes</Label>
            <Textarea
              value={formData.installerPrestartNotes}
              onChange={(e) =>
                setFormData({ ...formData, installerPrestartNotes: e.target.value })
              }
              placeholder="Any notes before starting install..."
              data-testid="textarea-prestart-notes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Pre-start completed by</Label>
              <Input
                value={formData.installerPrestartCompletedBy}
                onChange={(e) =>
                  setFormData({ ...formData, installerPrestartCompletedBy: e.target.value })
                }
                placeholder="Installer name"
                data-testid="input-prestart-by"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Pre-start completed at</Label>
              <Input
                type="datetime-local"
                value={formData.installerPrestartCompletedAt}
                onChange={(e) =>
                  setFormData({ ...formData, installerPrestartCompletedAt: e.target.value })
                }
                data-testid="input-prestart-at"
              />
            </div>
          </div>

          <h4 className="font-medium text-sm pt-2">Completion Sign-off</h4>

          <div className="flex items-center justify-between p-3 border rounded">
            <Label className="text-sm">Install completed?</Label>
            <Switch
              checked={formData.installCompleted}
              onCheckedChange={(v) =>
                setFormData({ ...formData, installCompleted: v })
              }
              data-testid="switch-install-completed"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Completion notes</Label>
            <Textarea
              value={formData.completionNotes}
              onChange={(e) =>
                setFormData({ ...formData, completionNotes: e.target.value })
              }
              placeholder="Notes from installation..."
              data-testid="textarea-completion-notes"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <Label className="text-sm">Client signed off?</Label>
            <Switch
              checked={formData.clientSignedCompletion}
              onCheckedChange={(v) =>
                setFormData({ ...formData, clientSignedCompletion: v })
              }
              data-testid="switch-client-signed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Completed by</Label>
              <Input
                value={formData.installerCompletionBy}
                onChange={(e) =>
                  setFormData({ ...formData, installerCompletionBy: e.target.value })
                }
                placeholder="Installer name"
                data-testid="input-completion-by"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Completed at</Label>
              <Input
                type="datetime-local"
                value={formData.installerCompletionAt}
                onChange={(e) =>
                  setFormData({ ...formData, installerCompletionAt: e.target.value })
                }
                data-testid="input-completion-at"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-section5">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
