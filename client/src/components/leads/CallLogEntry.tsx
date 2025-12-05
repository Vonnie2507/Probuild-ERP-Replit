import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, 
  Clock, User, ChevronDown, ChevronUp, FileText,
  Edit2, Trash2, Plus, Link, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { LeadActivity, LeadTask, User as UserType } from "@shared/schema";

interface CallLogEntryProps {
  activity: LeadActivity;
  users: UserType[];
  leadId: string;
  onCreateTask?: (activityId: string) => void;
}

const callDirectionConfig = {
  inbound: {
    icon: PhoneIncoming,
    label: "Inbound Call",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  outbound: {
    icon: PhoneOutgoing,
    label: "Outbound Call",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  missed: {
    icon: PhoneMissed,
    label: "Missed Call",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

const transcriptionStatusConfig: Record<string, { label: string; className: string }> = {
  not_applicable: { label: "No Recording", className: "text-muted-foreground" },
  pending: { label: "Processing...", className: "text-yellow-600" },
  in_progress: { label: "Transcribing...", className: "text-blue-600" },
  completed: { label: "Transcribed", className: "text-green-600" },
  failed: { label: "Failed", className: "text-red-600" },
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function CallLogEntry({ activity, users, leadId, onCreateTask }: CallLogEntryProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(activity.callNotes || "");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskAssignee, setTaskAssignee] = useState("");

  const direction = (activity.callDirection || "outbound") as keyof typeof callDirectionConfig;
  const config = callDirectionConfig[direction];
  const DirectionIcon = config.icon;

  const staffMember = users.find(u => u.id === activity.staffMemberId);
  const transcriptionStatus = activity.transcriptionStatus || "not_applicable";
  const transcriptionConfig = transcriptionStatusConfig[transcriptionStatus];

  const { data: linkedTasks = [] } = useQuery<LeadTask[]>({
    queryKey: ["/api/lead-activities", activity.id, "tasks"],
    enabled: isExpanded,
  });

  const updateActivityMutation = useMutation({
    mutationFn: async (data: Partial<LeadActivity>) => {
      return apiRequest("PATCH", `/api/lead-activities/${activity.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "activities"] });
      setIsEditing(false);
      toast({ title: "Call notes updated" });
    },
    onError: () => {
      toast({ title: "Failed to update notes", variant: "destructive" });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/lead-activities/${activity.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "activities"] });
      toast({ title: "Call log deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete call log", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { title: string; priority: string; assignedTo?: string; sourceActivityId: string }) => {
      return apiRequest("POST", `/api/leads/${leadId}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lead-activities", activity.id, "tasks"] });
      toast({ title: "Task created and linked to call" });
      setShowTaskForm(false);
      setTaskTitle("");
      setTaskPriority("medium");
      setTaskAssignee("");
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const handleSaveNotes = () => {
    updateActivityMutation.mutate({ callNotes: editedNotes });
  };

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    createTaskMutation.mutate({
      title: taskTitle.trim(),
      priority: taskPriority,
      sourceActivityId: activity.id,
      assignedTo: taskAssignee && taskAssignee !== "unassigned" ? taskAssignee : undefined,
    });
  };

  const hasDetails = activity.callNotes || activity.callTranscriptionText || activity.aiSummaryText || activity.audioRecordingUrl;

  return (
    <Card 
      className="overflow-hidden"
      data-testid={`call-log-entry-${activity.id}`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${config.badgeClass}`}>
              <DirectionIcon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{config.label}</span>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(activity.callDurationSeconds)}
                </Badge>
                {linkedTasks.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Link className="h-3 w-3 mr-1" />
                    {linkedTasks.length} task{linkedTasks.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                {staffMember && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {staffMember.firstName} {staffMember.lastName}
                  </span>
                )}
                {activity.callTimestamp && (
                  <span>
                    {format(new Date(activity.callTimestamp), "dd/MM/yyyy HH:mm")}
                  </span>
                )}
                <span className="text-xs">
                  ({formatDistanceToNow(new Date(activity.callTimestamp || activity.createdAt!), { addSuffix: true })})
                </span>
              </div>

              {activity.title && activity.title !== config.label && (
                <p className="text-sm mt-1">{activity.title}</p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  data-testid={`button-expand-call-${activity.id}`}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    data-testid={`button-delete-call-${activity.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Call Log</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this call log? This action cannot be undone.
                      {linkedTasks.length > 0 && (
                        <span className="block mt-2 text-amber-600">
                          Note: {linkedTasks.length} linked task(s) will be unlinked from this call.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteActivityMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <Separator />
          <div className="p-3 space-y-3 bg-muted/30">
            {activity.callNotes && !isEditing && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Call Notes</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditedNotes(activity.callNotes || "");
                      setIsEditing(true);
                    }}
                    data-testid={`button-edit-notes-${activity.id}`}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{activity.callNotes}</p>
              </div>
            )}

            {isEditing && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">Edit Call Notes</span>
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="min-h-[80px] mb-2"
                  data-testid={`input-edit-notes-${activity.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={updateActivityMutation.isPending}
                    data-testid={`button-save-notes-${activity.id}`}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!activity.callNotes && !isEditing && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-add-notes-${activity.id}`}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Add Notes
                </Button>
              </div>
            )}

            {activity.aiSummaryText && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">AI Summary</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                  {activity.aiSummaryText}
                </div>
              </div>
            )}

            {activity.callTranscriptionText && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Transcription</span>
                  <span className={`text-xs ${transcriptionConfig.className}`}>
                    {transcriptionConfig.label}
                  </span>
                </div>
                <div className="p-2 bg-background rounded border text-sm max-h-[200px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans">{activity.callTranscriptionText}</pre>
                </div>
              </div>
            )}

            {activity.audioRecordingUrl && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">Recording</span>
                <audio controls className="w-full h-8">
                  <source src={activity.audioRecordingUrl} type="audio/mpeg" />
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {linkedTasks.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">Linked Tasks</span>
                <div className="space-y-1">
                  {linkedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 bg-background rounded border text-sm"
                    >
                      <Link className="h-3 w-3 text-muted-foreground" />
                      <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                        {task.title}
                      </span>
                      <Badge variant={task.status === "completed" ? "secondary" : "outline"} className="text-xs ml-auto">
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showTaskForm ? (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                <span className="text-xs font-medium text-muted-foreground uppercase block">Create Task from Call</span>
                <Input
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  data-testid={`input-task-title-${activity.id}`}
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap">
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
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
                  <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                    <SelectTrigger className="w-[160px]" data-testid={`select-task-assignee-${activity.id}`}>
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
                    onClick={handleCreateTask}
                    disabled={!taskTitle.trim() || createTaskMutation.isPending}
                    data-testid={`button-submit-task-${activity.id}`}
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowTaskForm(false);
                      setTaskTitle("");
                      setTaskAssignee("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTaskForm(true)}
                data-testid={`button-create-task-from-call-${activity.id}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Task from Call
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
