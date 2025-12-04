import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Phone, Mail, MapPin, FileText, Edit, Plus, Clock, Calendar, 
  CheckCircle2, CircleDashed, MessageSquare, PhoneCall, Send,
  ChevronRight, ClipboardList, AlertCircle, User, PhoneIncoming, PhoneOutgoing, PhoneMissed
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobSetupDocument } from "@/components/jobs/JobSetupDocument";
import { CallLogEntry } from "./CallLogEntry";
import type { Lead, Client, Quote, LeadActivity, LeadTask, User as UserType, LiveDocumentTemplate, JobSetupDocument as JobSetupDocumentType } from "@shared/schema";

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  client: Client | null;
  quotes: Quote[];
  users: UserType[];
  onEditLead: () => void;
  onCreateQuote: () => void;
  onViewQuote: (quote: Quote) => void;
}

const activityTypeLabels: Record<string, { label: string; icon: typeof MessageSquare }> = {
  call_logged: { label: "Call Logged", icon: PhoneCall },
  call_missed: { label: "Missed Call", icon: PhoneCall },
  note_added: { label: "Note Added", icon: MessageSquare },
  email_sent: { label: "Email Sent", icon: Send },
  sms_sent: { label: "SMS Sent", icon: MessageSquare },
  quote_created: { label: "Quote Created", icon: FileText },
  quote_sent: { label: "Quote Sent", icon: Send },
  quote_approved: { label: "Quote Approved", icon: CheckCircle2 },
  lead_created: { label: "Lead Created", icon: Plus },
  stage_changed: { label: "Stage Changed", icon: ChevronRight },
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(num);
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
  client,
  quotes,
  users,
  onEditLead,
  onCreateQuote,
  onViewQuote,
}: LeadDetailDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [newNote, setNewNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  
  const [showLogCallForm, setShowLogCallForm] = useState(false);
  const [callDirection, setCallDirection] = useState<string>("outbound");
  const [callDuration, setCallDuration] = useState<string>("");
  const [callNotes, setCallNotes] = useState("");
  const [linkingTaskToCallId, setLinkingTaskToCallId] = useState<string | null>(null);
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");

  const { data: activities = [] } = useQuery<LeadActivity[]>({
    queryKey: ["/api/leads", lead?.id, "activities"],
    enabled: !!lead?.id && open,
  });

  const { data: tasks = [] } = useQuery<LeadTask[]>({
    queryKey: ["/api/leads", lead?.id, "tasks"],
    enabled: !!lead?.id && open,
  });

  const { data: templates = [] } = useQuery<LiveDocumentTemplate[]>({
    queryKey: ["/api/live-doc-templates"],
    enabled: open,
  });

  const { data: existingDocument } = useQuery<JobSetupDocumentType>({
    queryKey: ["/api/leads", lead?.id, "live-document"],
    enabled: !!lead?.id && open && lead?.jobFulfillmentType === "supply_install",
  });

  const addActivityMutation = useMutation({
    mutationFn: async (data: { activityType: string; title: string; description?: string }) => {
      return apiRequest("POST", `/api/leads/${lead?.id}/activities`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "activities"] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
    onError: (error) => {
      console.error("Error adding activity:", error);
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (data: { title: string; priority: string; assignedTo?: string }) => {
      return apiRequest("POST", `/api/leads/${lead?.id}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-dashboard"] });
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskAssignee("");
      toast({ title: "Task added successfully" });
    },
    onError: (error) => {
      console.error("Error adding task:", error);
      toast({ title: "Failed to add task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/lead-tasks/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const logCallMutation = useMutation({
    mutationFn: async (data: {
      activityType: string;
      title: string;
      callDirection: string;
      callTimestamp: string;
      callDurationSeconds?: number;
      callNotes?: string;
    }) => {
      return apiRequest("POST", `/api/leads/${lead?.id}/activities`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "activities"] });
      setShowLogCallForm(false);
      setCallDirection("outbound");
      setCallDuration("");
      setCallNotes("");
      toast({ title: "Call logged successfully" });
    },
    onError: (error) => {
      console.error("Error logging call:", error);
      toast({ title: "Failed to log call", variant: "destructive" });
    },
  });

  const addTaskWithCallLinkMutation = useMutation({
    mutationFn: async (data: { title: string; priority: string; sourceActivityId?: string; assignedTo?: string }) => {
      return apiRequest("POST", `/api/leads/${lead?.id}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-dashboard"] });
      if (linkingTaskToCallId) {
        queryClient.invalidateQueries({ queryKey: ["/api/lead-activities", linkingTaskToCallId, "tasks"] });
      }
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskAssignee("");
      setLinkingTaskToCallId(null);
      toast({ title: "Task created from call" });
    },
    onError: (error) => {
      console.error("Error adding task:", error);
      toast({ title: "Failed to add task", variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addActivityMutation.mutate({
      activityType: "note_added",
      title: "Note Added",
      description: newNote.trim(),
    });
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTaskMutation.mutate({
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      assignedTo: newTaskAssignee && newTaskAssignee !== "unassigned" ? newTaskAssignee : undefined,
    });
  };

  const handleLogCall = () => {
    const parsedDuration = callDuration ? parseInt(callDuration) * 60 : undefined;
    const directionLabel = callDirection === "inbound" ? "Inbound Call" : 
                          callDirection === "outbound" ? "Outbound Call" : "Missed Call";
    
    logCallMutation.mutate({
      activityType: callDirection === "missed" ? "call_missed" : "call_logged",
      title: directionLabel,
      callDirection,
      callTimestamp: new Date().toISOString(),
      callDurationSeconds: parsedDuration,
      callNotes: callNotes.trim() || undefined,
    });
  };

  const handleCreateTaskFromCall = (activityId: string) => {
    setLinkingTaskToCallId(activityId);
  };

  const handleSubmitTaskFromCall = () => {
    if (!newTaskTitle.trim()) return;
    addTaskWithCallLinkMutation.mutate({
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      sourceActivityId: linkingTaskToCallId || undefined,
      assignedTo: newTaskAssignee && newTaskAssignee !== "unassigned" ? newTaskAssignee : undefined,
    });
  };

  const isCallActivity = (activity: LeadActivity) => {
    return activity.activityType === "call_logged" || activity.activityType === "call_missed";
  };

  if (!lead) return null;

  const activeTemplates = templates.filter(t => t.isActive);
  const defaultTemplate = activeTemplates.find(t => t.isDefault);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              Lead Details
              <span className="text-base font-mono text-muted-foreground">
                {lead.leadNumber}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={lead.leadType === "trade" ? "default" : "secondary"}>
                {lead.leadType}
              </Badge>
              <Badge variant="outline">{lead.stage}</Badge>
              {lead.jobFulfillmentType === "supply_install" && (
                <Badge className="bg-primary">S+I</Badge>
              )}
            </div>
          </div>
          <DialogDescription>
            {client?.name || "No client linked"} - {lead.siteAddress || "No site address"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" data-testid="tab-lead-details">Details</TabsTrigger>
            <TabsTrigger value="quotes" data-testid="tab-lead-quotes">
              Quotes ({quotes.length})
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-lead-activity">Activity</TabsTrigger>
            <TabsTrigger value="document" data-testid="tab-lead-document">Live Document</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onEditLead} data-testid="button-edit-lead-detail">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Lead
                </Button>
                <Button size="sm" variant="outline" onClick={onCreateQuote} data-testid="button-create-quote-detail">
                  <FileText className="h-4 w-4 mr-1" />
                  Create Quote
                </Button>
                <Button size="sm" variant="outline" onClick={handleLogCall} data-testid="button-log-call">
                  <PhoneCall className="h-4 w-4 mr-1" />
                  Log Call
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="font-medium text-lg">
                    {client?.name || "No client linked"}
                  </div>
                  {client?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                    </div>
                  )}
                  {client?.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                    </div>
                  )}
                  {lead.siteAddress && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {lead.siteAddress}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fence Style:</span>
                      <div className="font-medium">{lead.fenceStyle || "Not specified"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Length:</span>
                      <div className="font-medium">{lead.fenceLength ? `${lead.fenceLength}m` : "Not specified"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source:</span>
                      <div className="font-medium capitalize">{lead.source?.replace("_", " ") || "Unknown"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Job Type:</span>
                      <div className="font-medium">
                        <Badge variant={lead.jobFulfillmentType === "supply_install" ? "default" : "secondary"}>
                          {lead.jobFulfillmentType === "supply_install" ? "Supply & Install" : "Supply Only"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {lead.description && (
                    <div className="pt-2">
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <p className="mt-1">{lead.description}</p>
                    </div>
                  )}
                  {lead.notes && (
                    <div className="pt-2">
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="mt-1">{lead.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Associated Quotes</h3>
                <Button size="sm" onClick={onCreateQuote} data-testid="button-new-quote">
                  <Plus className="h-4 w-4 mr-1" />
                  New Quote
                </Button>
              </div>

              {quotes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No quotes created yet.</p>
                    <Button size="sm" className="mt-4" onClick={onCreateQuote}>
                      Create First Quote
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {quotes.map((quote) => (
                    <Card
                      key={quote.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => onViewQuote(quote)}
                      data-testid={`quote-item-${quote.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{quote.quoteNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(quote.totalAmount)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                quote.status === "approved"
                                  ? "default"
                                  : quote.status === "sent"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {quote.status}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0 space-y-4">
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant={showLogCallForm ? "secondary" : "outline"}
                  onClick={() => setShowLogCallForm(!showLogCallForm)}
                  data-testid="button-toggle-log-call"
                >
                  <PhoneCall className="h-4 w-4 mr-1" />
                  Log Call
                </Button>
              </div>

              {showLogCallForm && (
                <Card className="border-primary/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PhoneCall className="h-4 w-4" />
                      Log a Call
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={callDirection === "inbound" ? "default" : "outline"}
                        onClick={() => setCallDirection("inbound")}
                        data-testid="button-call-inbound"
                      >
                        <PhoneIncoming className="h-4 w-4 mr-1" />
                        Inbound
                      </Button>
                      <Button
                        size="sm"
                        variant={callDirection === "outbound" ? "default" : "outline"}
                        onClick={() => setCallDirection("outbound")}
                        data-testid="button-call-outbound"
                      >
                        <PhoneOutgoing className="h-4 w-4 mr-1" />
                        Outbound
                      </Button>
                      <Button
                        size="sm"
                        variant={callDirection === "missed" ? "default" : "outline"}
                        onClick={() => setCallDirection("missed")}
                        data-testid="button-call-missed"
                      >
                        <PhoneMissed className="h-4 w-4 mr-1" />
                        Missed
                      </Button>
                    </div>
                    
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-sm text-muted-foreground mb-1 block">Duration (minutes)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={callDuration}
                          onChange={(e) => setCallDuration(e.target.value)}
                          className="w-24"
                          data-testid="input-call-duration"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
                      <Textarea
                        placeholder="Call notes..."
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        className="min-h-[60px]"
                        data-testid="input-call-notes"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleLogCall}
                        disabled={logCallMutation.isPending}
                        data-testid="button-submit-call-log"
                      >
                        {logCallMutation.isPending ? "Saving..." : "Log Call"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLogCallForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {linkingTaskToCallId && (
                <Card className="border-blue-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Create Task from Call
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      data-testid="input-task-from-call"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                        <SelectTrigger className="w-[160px]" data-testid="select-task-assignee-call">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSubmitTaskFromCall}
                        disabled={!newTaskTitle.trim() || addTaskWithCallLinkMutation.isPending}
                        data-testid="button-submit-task-from-call"
                      >
                        Create Task
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setLinkingTaskToCallId(null);
                          setNewTaskAssignee("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Add Note
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-new-note"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addActivityMutation.isPending}
                      data-testid="button-add-note"
                    >
                      Add Note
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Add Task
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      data-testid="input-new-task"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                        <SelectTrigger className="w-[120px]" data-testid="select-task-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                        <SelectTrigger className="w-[160px]" data-testid="select-task-assignee">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim() || addTaskMutation.isPending}
                      data-testid="button-add-task"
                    >
                      Add Task
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {tasks.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Tasks ({tasks.filter(t => t.status !== "completed").length} pending)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tasks.map((task) => {
                        const assignee = task.assignedTo ? users.find(u => u.id === task.assignedTo) : null;
                        return (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-2 border rounded-lg"
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateTaskMutation.mutate({
                                  id: task.id,
                                  status: task.status === "completed" ? "pending" : "completed"
                                })}
                              >
                                {task.status === "completed" ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <CircleDashed className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <div className="flex flex-col">
                                <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                                  {task.title}
                                </span>
                                {assignee && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {assignee.firstName} {assignee.lastName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={priorityColors[task.priority || "medium"]}>
                              {task.priority}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activities.filter(a => isCallActivity(a)).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PhoneCall className="h-4 w-4" />
                      Call History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activities
                        .filter(a => isCallActivity(a))
                        .map((activity) => (
                          <CallLogEntry
                            key={activity.id}
                            activity={activity}
                            users={users}
                            leadId={lead.id}
                            onCreateTask={handleCreateTaskFromCall}
                          />
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.filter(a => !isCallActivity(a)).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No other activity recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities
                        .filter(a => !isCallActivity(a))
                        .map((activity) => {
                          const typeInfo = activityTypeLabels[activity.activityType] || { label: activity.activityType, icon: MessageSquare };
                          const Icon = typeInfo.icon;
                          return (
                            <div key={activity.id} className="flex gap-3 text-sm" data-testid={`activity-item-${activity.id}`}>
                              <div className="p-1.5 rounded-full bg-muted h-fit">
                                <Icon className="h-3 w-3" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{typeInfo.label}</div>
                                {activity.description && (
                                  <p className="text-muted-foreground">{activity.description}</p>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  {activity.createdAt && format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm")}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="document" className="mt-0 space-y-4">
              {lead.jobFulfillmentType !== "supply_install" ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Live documents are only available for Supply & Install jobs.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      This lead is set as "Supply Only".
                    </p>
                  </CardContent>
                </Card>
              ) : existingDocument ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Job Setup & Handover Document</h3>
                    </div>
                    <Badge variant="outline">
                      Created {existingDocument.createdAt && format(new Date(existingDocument.createdAt), "dd/MM/yyyy")}
                    </Badge>
                  </div>
                  <JobSetupDocument
                    leadId={lead.id}
                    jobType="supply_install"
                  />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Create Live Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Select a template to create the Job Setup & Handover document for this lead.
                      This document will follow the job through production, scheduling, and installation.
                    </p>

                    {activeTemplates.length === 0 ? (
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          No templates available. Please create a template first.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Select Template</label>
                          <Select 
                            value={selectedTemplateId || defaultTemplate?.id || ""} 
                            onValueChange={setSelectedTemplateId}
                          >
                            <SelectTrigger data-testid="select-template">
                              <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {activeTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name} {template.isDefault && "(Default)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          className="w-full"
                          onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "live-document"] });
                          }}
                          data-testid="button-create-document"
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Create Document
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
