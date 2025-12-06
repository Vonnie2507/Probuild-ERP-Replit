import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobCard } from "@/components/jobs/JobCard";
import { JobTimeline } from "@/components/jobs/JobTimeline";
import { JobSetupDocument } from "@/components/jobs/JobSetupDocument";
import { JobKanbanBoard } from "@/components/jobs/JobKanbanBoard";
import { ViewToggle } from "@/components/jobs/ViewToggle";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Package,
  FileText,
  Camera,
  Briefcase,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job, Client, ProductionTask, User } from "@shared/schema";
import { Plus } from "lucide-react";
import { DialogTrigger } from "@/components/ui/dialog";

type JobStatus = "in_progress" | "production" | "ready" | "scheduled" | "complete";

interface DisplayJob {
  id: string;
  jobNumber: string;
  invoiceNumber?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  fenceStyle: string;
  jobType: "supply" | "supply_install";
  status: JobStatus;
  productionProgress: number;
  scheduledDate?: string;
  installer?: {
    name: string;
    initials: string;
  };
  totalValue: number;
  depositPaid: boolean;
  depositAmount: number;
  balanceDue: number;
}

type ViewMode = "list" | "kanban";

export default function Jobs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [formData, setFormData] = useState({
    status: "",
    notes: "",
    siteAddress: "",
  });
  const [newJobData, setNewJobData] = useState({
    clientId: "",
    jobType: "supply_install" as "supply_only" | "supply_install",
    siteAddress: "",
    notes: "",
    totalAmount: "",
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Job> }) => {
      return apiRequest("PATCH", `/api/jobs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Updated",
        description: "Job has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingJob(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Deleted",
        description: "Job has been removed",
      });
      setIsDeleteDialogOpen(false);
      setSelectedJobId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    },
  });

  const createDirectJobMutation = useMutation({
    mutationFn: async (data: { clientId: string; jobType: string; siteAddress: string; notes?: string; totalAmount?: string }) => {
      return apiRequest("POST", "/api/jobs/create-direct", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Job Created",
        description: "New job has been created successfully",
      });
      setIsNewJobDialogOpen(false);
      setNewJobData({
        clientId: "",
        jobType: "supply_install",
        siteAddress: "",
        notes: "",
        totalAmount: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const handleCreateDirectJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobData.clientId || !newJobData.siteAddress) {
      toast({
        title: "Error",
        description: "Client and site address are required",
        variant: "destructive",
      });
      return;
    }
    createDirectJobMutation.mutate({
      clientId: newJobData.clientId,
      jobType: newJobData.jobType,
      siteAddress: newJobData.siteAddress,
      notes: newJobData.notes || undefined,
      totalAmount: newJobData.totalAmount || undefined,
    });
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setFormData({
      status: job.status,
      notes: job.notes || "",
      siteAddress: job.siteAddress,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    
    updateJobMutation.mutate({
      id: editingJob.id,
      data: {
        status: formData.status as Job["status"],
        notes: formData.notes || undefined,
        siteAddress: formData.siteAddress,
      },
    });
  };

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: productionTasks = [] } = useQuery<ProductionTask[]>({
    queryKey: ["/api/production-tasks"],
  });

  const getClientInfo = (clientId: string | null) => {
    if (!clientId) return { name: "Unknown", phone: "", email: "" };
    const client = clients.find(c => c.id === clientId);
    return {
      name: client?.name || "Unknown",
      phone: client?.phone || "",
      email: client?.email || "",
    };
  };

  const calculateProgress = (jobId: string): number => {
    const jobTasks = productionTasks.filter(t => t.jobId === jobId);
    if (jobTasks.length === 0) return 0;
    const completed = jobTasks.filter(t => t.status === "completed").length;
    return Math.round((completed / jobTasks.length) * 100);
  };

  const mapJobStatus = (status: string): JobStatus => {
    switch (status) {
      case "pending_deposit":
      case "deposit_received":
        return "in_progress";
      case "manufacturing_posts":
      case "manufacturing_panels":
      case "manufacturing_gates":
      case "qa_check":
        return "production";
      case "ready_for_scheduling":
      case "ready_for_pickup":
        return "ready";
      case "scheduled":
        return "scheduled";
      case "install_in_progress":
      case "install_complete":
      case "final_payment_pending":
      case "completed":
        return "complete";
      default:
        return "in_progress";
    }
  };

  const displayJobs: DisplayJob[] = jobs.map((job) => {
    const clientInfo = getClientInfo(job.clientId);
    const totalValue = parseFloat(job.totalAmount);
    const depositAmount = parseFloat(job.depositAmount || "0");
    
    return {
      id: job.id,
      jobNumber: job.jobNumber,
      invoiceNumber: job.invoiceNumber || undefined,
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      clientEmail: clientInfo.email,
      address: job.siteAddress,
      fenceStyle: `${job.fenceStyle || "Unknown"} - ${job.fenceHeight}mm, ${job.totalLength}m`,
      jobType: job.jobType === "supply_install" ? "supply_install" : "supply",
      status: mapJobStatus(job.status),
      productionProgress: calculateProgress(job.id),
      scheduledDate: job.scheduledStartDate 
        ? new Date(job.scheduledStartDate).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
        : undefined,
      installer: job.assignedInstaller ? { name: "Installer", initials: "IN" } : undefined,
      totalValue,
      depositPaid: job.depositPaid || false,
      depositAmount,
      balanceDue: totalValue - depositAmount,
    };
  });

  const selectedJob = displayJobs.find(j => j.id === selectedJobId) || null;

  const jobTasks = selectedJob 
    ? productionTasks.filter(t => t.jobId === selectedJob.id)
    : [];

  const timelineEvents = selectedJob ? [
    { 
      id: "1", 
      title: "Quote Accepted", 
      description: "Client approved quote and paid deposit", 
      date: "Started",
      status: (selectedJob.depositPaid ? "complete" : "pending") as "complete" | "current" | "pending"
    },
    { 
      id: "2", 
      title: "Cutting", 
      description: "Posts and rails cut to size",
      date: "",
      status: getTaskStatus(jobTasks, "cutting")
    },
    { 
      id: "3", 
      title: "Routing", 
      description: "Routing and shaping completed",
      date: "",
      status: getTaskStatus(jobTasks, "routing")
    },
    { 
      id: "4", 
      title: "Assembly", 
      description: "Panels being assembled",
      date: "",
      status: getTaskStatus(jobTasks, "assembly")
    },
    { 
      id: "5", 
      title: "QA Check", 
      description: "Quality assurance inspection",
      date: "",
      status: getTaskStatus(jobTasks, "qa")
    },
    { 
      id: "6", 
      title: "Ready for Install/Pickup", 
      date: "",
      status: (selectedJob.status === "ready" || selectedJob.status === "scheduled" || selectedJob.status === "complete" ? "complete" : "pending") as "complete" | "current" | "pending"
    },
  ] : [];

  const filteredJobs = displayJobs.filter(
    (job) =>
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJobClick = (job: DisplayJob) => {
    setSelectedJobId(job.id);
  };

  const handleKanbanJobClick = (job: Job) => {
    setSelectedJobId(job.id);
    setViewMode("list");
  };

  const handleJobStatusChange = (jobId: string, newStatus: string) => {
    if (updateJobMutation.isPending) return;
    
    const previousJobs = queryClient.getQueryData<Job[]>(["/api/jobs"]);
    
    queryClient.setQueryData<Job[]>(["/api/jobs"], (old) => 
      old?.map(job => 
        job.id === jobId ? { ...job, status: newStatus as Job["status"] } : job
      )
    );
    
    updateJobMutation.mutate(
      { id: jobId, data: { status: newStatus as Job["status"] } },
      {
        onError: () => {
          queryClient.setQueryData(["/api/jobs"], previousJobs);
          toast({
            title: "Error",
            description: "Failed to move job. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (viewMode === "kanban") {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]" data-testid="jobs-kanban-view">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold" data-testid="text-jobs-title">Jobs</h1>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-jobs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => setIsNewJobDialogOpen(true)}
              data-testid="button-new-job-kanban"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open("/api/export/jobs", "_blank")}
              data-testid="button-export-jobs"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <JobKanbanBoard
            jobs={searchQuery 
              ? jobs.filter(j => 
                  j.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  clients.find(c => c.id === j.clientId)?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )
              : jobs
            }
            clients={clients}
            users={users}
            isLoading={jobsLoading}
            isUpdating={updateJobMutation.isPending}
            onJobClick={handleKanbanJobClick}
            onJobStatusChange={handleJobStatusChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-96 border-r flex flex-col">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-semibold" data-testid="text-jobs-title">Jobs</h1>
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-jobs"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setIsNewJobDialogOpen(true)}
              data-testid="button-new-job"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open("/api/export/jobs", "_blank")}
              data-testid="button-export-jobs"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {jobsLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className={`cursor-pointer ${selectedJobId === job.id ? "ring-2 ring-accent rounded-md" : ""}`}
                  onClick={() => handleJobClick(job)}
                >
                  <JobCard
                    job={job}
                    onUpdateStatus={() => toast({ title: "Status updated" })}
                    onViewMaterials={() => toast({ title: "Materials view" })}
                    onViewSchedule={() => toast({ title: "Schedule view" })}
                  />
                </div>
              ))
            )}
            {!jobsLoading && filteredJobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No jobs found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedJob ? (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm text-muted-foreground" data-testid="text-job-number">{selectedJob.jobNumber}</span>
                  {selectedJob.invoiceNumber && (
                    <span className="font-mono text-sm text-muted-foreground" data-testid="text-invoice-number">
                      {selectedJob.invoiceNumber}
                    </span>
                  )}
                  <StatusBadge status={selectedJob.status} />
                  <Badge variant="secondary">
                    {selectedJob.jobType === "supply_install" ? "Supply + Install" : "Supply Only"}
                  </Badge>
                </div>
                <h2 className="text-2xl font-semibold">{selectedJob.clientName}</h2>
                <p className="text-muted-foreground">{selectedJob.fenceStyle}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    const job = jobs.find(j => j.id === selectedJob.id);
                    if (job) handleEditJob(job);
                  }}
                  data-testid="button-edit-job"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  data-testid="button-delete-job"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" data-testid="button-update-status">Update Status</Button>
                <Button data-testid="button-view-materials">View Materials</Button>
              </div>
            </div>

            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
                <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
                {selectedJob.jobType === "supply_install" && (
                  <TabsTrigger value="setup" data-testid="tab-setup">Setup & Handover</TabsTrigger>
                )}
                <TabsTrigger value="materials" data-testid="tab-materials">Materials</TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
                <TabsTrigger value="photos" data-testid="tab-photos">Photos</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Client Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedJob.clientPhone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedJob.clientEmail || "No email"}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{selectedJob.address}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Value</span>
                        <span className="font-semibold">${selectedJob.totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Deposit</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${selectedJob.depositAmount.toLocaleString()}</span>
                          <StatusBadge status={selectedJob.depositPaid ? "paid" : "pending"} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t pt-3">
                        <span className="text-muted-foreground">Balance Due</span>
                        <span className="font-semibold text-lg">${selectedJob.balanceDue.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedJob.scheduledDate ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedJob.scheduledDate}</span>
                          </div>
                          {selectedJob.installer && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Installer:</span>
                              <span>{selectedJob.installer.name}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not yet scheduled</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Production Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Overall Progress</span>
                          <span className="font-semibold">{selectedJob.productionProgress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all"
                            style={{ width: `${selectedJob.productionProgress}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-6">
                <JobTimeline events={timelineEvents} />
              </TabsContent>

              {selectedJob.jobType === "supply_install" && (
                <TabsContent value="setup" className="mt-6">
                  <JobSetupDocument
                    jobId={String(selectedJob.id)}
                    jobType={selectedJob.jobType as "supply_only" | "supply_install"}
                  />
                </TabsContent>
              )}

              <TabsContent value="materials" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Bill of Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">PVC Post 90x90 - 2.4m</span>
                        <span className="font-mono text-sm">x 15</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">PVC Rail 65x40 - 3.0m</span>
                        <span className="font-mono text-sm">x 48</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">PVC Picket 65x16 - 1.5m</span>
                        <span className="font-mono text-sm">x 180</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">Post Cap 90mm</span>
                        <span className="font-mono text-sm">x 15</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded hover-elevate cursor-pointer">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Quote_{selectedJob.jobNumber}.pdf</p>
                            <p className="text-xs text-muted-foreground">Approved Quote</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded hover-elevate cursor-pointer">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Deposit_Invoice.pdf</p>
                            <p className="text-xs text-muted-foreground">Deposit Invoice</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photos" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Site Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No photos uploaded yet</p>
                      <p className="text-xs">Photos will appear here after installation begins</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a job to view details</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-siteAddress">Site Address</Label>
              <Input 
                id="edit-siteAddress" 
                placeholder="Enter site address" 
                value={formData.siteAddress}
                onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                data-testid="input-edit-job-address" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger data-testid="select-edit-job-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_deposit">Pending Deposit</SelectItem>
                  <SelectItem value="deposit_received">Deposit Received</SelectItem>
                  <SelectItem value="manufacturing_posts">Manufacturing Posts</SelectItem>
                  <SelectItem value="manufacturing_panels">Manufacturing Panels</SelectItem>
                  <SelectItem value="manufacturing_gates">Manufacturing Gates</SelectItem>
                  <SelectItem value="qa_check">QA Check</SelectItem>
                  <SelectItem value="ready_for_scheduling">Ready for Scheduling</SelectItem>
                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="install_in_progress">Install in Progress</SelectItem>
                  <SelectItem value="install_complete">Install Complete</SelectItem>
                  <SelectItem value="final_payment_pending">Final Payment Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add job notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="textarea-edit-job-notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateJobMutation.isPending}
                data-testid="button-save-job"
              >
                {updateJobMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job {selectedJob?.jobNumber}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job for "{selectedJob?.clientName}" at {selectedJob?.address}. 
              This action cannot be undone and will remove all associated production tasks, schedule events, and payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedJobId && deleteJobMutation.mutate(selectedJobId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-job"
            >
              {deleteJobMutation.isPending ? "Deleting..." : "Delete Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>
              Create a job directly without going through the leads flow. A lead will be created automatically for analytics.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDirectJob} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-job-client">Client</Label>
              <Select 
                value={newJobData.clientId}
                onValueChange={(value) => setNewJobData({ ...newJobData, clientId: value })}
              >
                <SelectTrigger data-testid="select-new-job-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-job-type">Job Type</Label>
              <Select 
                value={newJobData.jobType}
                onValueChange={(value) => setNewJobData({ ...newJobData, jobType: value as "supply_only" | "supply_install" })}
              >
                <SelectTrigger data-testid="select-new-job-type">
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supply_install">Supply + Install</SelectItem>
                  <SelectItem value="supply_only">Supply Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-job-address">Site Address</Label>
              <Input 
                id="new-job-address" 
                placeholder="Enter site address" 
                value={newJobData.siteAddress}
                onChange={(e) => setNewJobData({ ...newJobData, siteAddress: e.target.value })}
                data-testid="input-new-job-address" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-job-amount">Total Amount (optional)</Label>
              <Input 
                id="new-job-amount" 
                type="number"
                placeholder="0.00" 
                value={newJobData.totalAmount}
                onChange={(e) => setNewJobData({ ...newJobData, totalAmount: e.target.value })}
                data-testid="input-new-job-amount" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-job-notes">Notes (optional)</Label>
              <Textarea
                id="new-job-notes"
                placeholder="Add job notes..."
                value={newJobData.notes}
                onChange={(e) => setNewJobData({ ...newJobData, notes: e.target.value })}
                data-testid="textarea-new-job-notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsNewJobDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDirectJobMutation.isPending}
                data-testid="button-submit-new-job"
              >
                {createDirectJobMutation.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getTaskStatus(tasks: ProductionTask[], taskType: string): "complete" | "current" | "pending" {
  const task = tasks.find(t => t.taskType === taskType);
  if (!task) return "pending";
  if (task.status === "completed") return "complete";
  if (task.status === "in_progress") return "current";
  return "pending";
}
