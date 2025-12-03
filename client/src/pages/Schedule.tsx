import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarView } from "@/components/schedule/CalendarView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Plus, MapPin, Clock, Wrench, Truck, Package, Ruler, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScheduleEvent, Job, User } from "@shared/schema";

type CalendarEventType = "install" | "delivery" | "pickup" | "measure";
type DbEventType = "install" | "delivery" | "pickup" | "site_measure";

interface CalendarEvent {
  id: string;
  jobNumber: string;
  clientName: string;
  time: string;
  type: CalendarEventType;
  installer?: string;
  address?: string;
}

interface Installer {
  id: string;
  name: string;
  initials: string;
  todayJobs: number;
  weekJobs: number;
  available: boolean;
}

const eventFormSchema = z.object({
  eventType: z.enum(["install", "delivery", "pickup", "site_measure"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
  jobId: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  isConfirmed: z.boolean().default(false),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function Schedule() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: scheduleEvents = [], isLoading: eventsLoading } = useQuery<ScheduleEvent[]>({
    queryKey: ["/api/schedule"],
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const installerUsers = users.filter(u => u.role === "installer");

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const payload = {
        eventType: data.eventType,
        title: data.title,
        description: data.description || null,
        startDate: new Date(`${data.startDate}T${data.startTime}`).toISOString(),
        endDate: new Date(`${data.endDate}T${data.endTime}`).toISOString(),
        jobId: data.jobId && data.jobId !== "none" ? data.jobId : null,
        assignedTo: data.assignedTo && data.assignedTo !== "none" ? data.assignedTo : null,
        notes: data.notes || null,
        isConfirmed: data.isConfirmed,
        clientNotified: false,
        installerNotified: false,
      };
      return apiRequest("POST", "/api/schedule", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Event Created", description: "Calendar event has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      const payload = {
        eventType: data.eventType,
        title: data.title,
        description: data.description || null,
        startDate: new Date(`${data.startDate}T${data.startTime}`).toISOString(),
        endDate: new Date(`${data.endDate}T${data.endTime}`).toISOString(),
        jobId: data.jobId && data.jobId !== "none" ? data.jobId : null,
        assignedTo: data.assignedTo && data.assignedTo !== "none" ? data.assignedTo : null,
        notes: data.notes || null,
        isConfirmed: data.isConfirmed,
      };
      return apiRequest("PATCH", `/api/schedule/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setIsViewDialogOpen(false);
      setIsEditMode(false);
      setSelectedEvent(null);
      toast({ title: "Event Updated", description: "Calendar event has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/schedule/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setIsViewDialogOpen(false);
      setSelectedEvent(null);
      toast({ title: "Event Deleted", description: "Calendar event has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    },
  });

  const createForm = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      eventType: "install",
      title: "",
      description: "",
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "17:00",
      jobId: "",
      assignedTo: "",
      notes: "",
      isConfirmed: false,
    },
  });

  const editForm = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      eventType: "install",
      title: "",
      description: "",
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "17:00",
      jobId: "",
      assignedTo: "",
      notes: "",
      isConfirmed: false,
    },
  });

  const getJobInfo = (jobId: string | null) => {
    if (!jobId) return { jobNumber: "", clientName: "Event" };
    const job = jobs.find(j => j.id === jobId);
    return {
      jobNumber: job?.jobNumber || "",
      clientName: job?.siteAddress?.split(",")[0] || "Client",
    };
  };

  const getInstallerName = (userId: string | null) => {
    if (!userId) return undefined;
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName?.[0] || ""}` : undefined;
  };

  const mapEventType = (dbType: string): CalendarEventType => {
    if (dbType === "site_measure") return "measure";
    return dbType as CalendarEventType;
  };

  const events: CalendarEvent[] = scheduleEvents.map((event) => {
    const jobInfo = getJobInfo(event.jobId);
    return {
      id: event.id,
      jobNumber: jobInfo.jobNumber,
      clientName: event.title || jobInfo.clientName,
      time: new Date(event.startDate).toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      type: mapEventType(event.eventType),
      installer: getInstallerName(event.assignedTo),
      address: event.description || "",
    };
  });

  const installers: Installer[] = installerUsers.map((user) => {
    const todayEvents = scheduleEvents.filter(e => {
      const eventDate = new Date(e.startDate);
      const today = new Date();
      return e.assignedTo === user.id && 
             eventDate.toDateString() === today.toDateString();
    });

    const weekEvents = scheduleEvents.filter(e => {
      const eventDate = new Date(e.startDate);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return e.assignedTo === user.id && 
             eventDate >= now && 
             eventDate <= weekFromNow;
    });

    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      initials: `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`,
      todayJobs: todayEvents.length,
      weekJobs: weekEvents.length,
      available: true,
    };
  });

  const pendingJobs = jobs
    .filter(j => j.status === "ready_for_scheduling")
    .slice(0, 5)
    .map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      clientName: job.siteAddress?.split(",")[0] || "Client",
      readyDate: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      type: job.jobType === "supply_only" ? "pickup" as const : "install" as const,
    }));

  const handleEventClick = (event: CalendarEvent) => {
    const fullEvent = scheduleEvents.find(e => e.id === event.id);
    if (fullEvent) {
      setSelectedEvent(fullEvent);
      setIsEditMode(false);
      
      const startDate = new Date(fullEvent.startDate);
      const endDate = new Date(fullEvent.endDate);
      
      editForm.reset({
        eventType: fullEvent.eventType as DbEventType,
        title: fullEvent.title,
        description: fullEvent.description || "",
        startDate: startDate.toISOString().split("T")[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split("T")[0],
        endTime: endDate.toTimeString().slice(0, 5),
        jobId: fullEvent.jobId || "",
        assignedTo: fullEvent.assignedTo || "",
        notes: fullEvent.notes || "",
        isConfirmed: fullEvent.isConfirmed || false,
      });
      
      setIsViewDialogOpen(true);
    }
  };

  const handleAddEvent = (date: Date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split("T")[0];
    createForm.reset({
      eventType: "install",
      title: "",
      description: "",
      startDate: dateStr,
      startTime: "09:00",
      endDate: dateStr,
      endTime: "17:00",
      jobId: "",
      assignedTo: "",
      notes: "",
      isConfirmed: false,
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreateSubmit = (data: EventFormValues) => {
    createEventMutation.mutate(data);
  };

  const handleEditSubmit = (data: EventFormValues) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, data });
    }
  };

  const handleDelete = () => {
    if (selectedEvent && confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(selectedEvent.id);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "install": return <Wrench className="h-4 w-4" />;
      case "delivery": return <Truck className="h-4 w-4" />;
      case "pickup": return <Package className="h-4 w-4" />;
      case "site_measure":
      case "measure": return <Ruler className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "install": return "Installation";
      case "delivery": return "Delivery";
      case "pickup": return "Pickup";
      case "site_measure":
      case "measure": return "Site Measure";
      default: return type;
    }
  };

  const todayEvents = events.filter(e => {
    const event = scheduleEvents.find(se => se.id === e.id);
    if (!event) return false;
    const eventDate = new Date(event.startDate);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const todaySummary = {
    installs: todayEvents.filter(e => e.type === "install").length,
    deliveries: todayEvents.filter(e => e.type === "delivery").length,
    pickups: todayEvents.filter(e => e.type === "pickup").length,
    measures: todayEvents.filter(e => e.type === "measure").length,
  };

  if (eventsLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-[500px]" />
        </div>
        <div className="w-80 border-l p-4">
          <Skeleton className="h-48 mb-4" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const EventFormFields = ({ form, disabled = false }: { form: typeof createForm; disabled?: boolean }) => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="eventType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
              <FormControl>
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="install">Installation</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="site_measure">Site Measure</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Event title" disabled={disabled} data-testid="input-event-title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={disabled} data-testid="input-start-date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} disabled={disabled} data-testid="input-start-time" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={disabled} data-testid="input-end-date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} disabled={disabled} data-testid="input-end-time" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="jobId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Linked Job (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || "none"} disabled={disabled}>
              <FormControl>
                <SelectTrigger data-testid="select-linked-job">
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">No linked job</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.jobNumber} - {job.siteAddress?.split(",")[0] || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="assignedTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assigned To (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || "none"} disabled={disabled}>
              <FormControl>
                <SelectTrigger data-testid="select-assigned-to">
                  <SelectValue placeholder="Select installer" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {installerUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Textarea {...field} placeholder="Event description or address" disabled={disabled} data-testid="input-description" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder="Additional notes" disabled={disabled} data-testid="input-notes" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-schedule-title">Schedule</h1>
            <p className="text-sm text-muted-foreground">
              Manage installs, deliveries, pickups, and site measures
            </p>
          </div>
          <Button onClick={() => handleAddEvent(new Date())} data-testid="button-add-event">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        <CalendarView
          events={events}
          onEventClick={handleEventClick}
          onAddEvent={handleAddEvent}
        />
      </div>

      <div className="w-80 border-l bg-card p-4 space-y-6 overflow-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Installers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installers.length > 0 ? (
              installers.map((installer) => (
                <div
                  key={installer.id}
                  className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                  data-testid={`installer-${installer.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-muted">
                      {installer.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{installer.name}</span>
                      {!installer.available && (
                        <Badge variant="secondary" className="text-[10px]">OFF</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Today: {installer.todayJobs} | Week: {installer.weekJobs}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No installers found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {pendingJobs.length > 0 ? (
                  pendingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3 rounded-md border hover-elevate cursor-pointer"
                      data-testid={`pending-job-${job.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getEventIcon(job.type)}
                        <span className="font-mono text-xs text-muted-foreground">{job.jobNumber}</span>
                      </div>
                      <p className="text-sm font-medium">{job.clientName}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Ready: {job.readyDate}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending jobs to schedule
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-success" />
                <span>Installs</span>
              </div>
              <span className="font-semibold">{todaySummary.installs}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-warning" />
                <span>Deliveries</span>
              </div>
              <span className="font-semibold">{todaySummary.deliveries}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span>Pickups</span>
              </div>
              <span className="font-semibold">{todaySummary.pickups}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-accent" />
                <span>Measures</span>
              </div>
              <span className="font-semibold">{todaySummary.measures}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Add a new event to the schedule calendar.</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <EventFormFields form={createForm} />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createEventMutation.isPending} data-testid="button-create-event">
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) {
          setIsEditMode(false);
          setSelectedEvent(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isEditMode ? "Edit Event" : "Event Details"}</span>
              {!isEditMode && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setIsEditMode(true)} data-testid="button-edit-event">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleDelete} data-testid="button-delete-event">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the event details below." : "View and manage event details."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && !isEditMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  {getEventIcon(selectedEvent.eventType)}
                </div>
                <div>
                  <Badge variant="outline">{getEventTypeLabel(selectedEvent.eventType)}</Badge>
                  <p className="font-semibold mt-1">{selectedEvent.title}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(selectedEvent.startDate).toLocaleDateString("en-AU", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })} at {new Date(selectedEvent.startDate).toLocaleTimeString("en-AU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                
                {selectedEvent.description && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.description}</span>
                  </div>
                )}
                
                {selectedEvent.assignedTo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span>Assigned: {getInstallerName(selectedEvent.assignedTo)}</span>
                  </div>
                )}
                
                {selectedEvent.jobId && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Job: {getJobInfo(selectedEvent.jobId).jobNumber}</span>
                  </div>
                )}
                
                {selectedEvent.notes && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{selectedEvent.notes}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={selectedEvent.isConfirmed ? "default" : "secondary"}>
                    {selectedEvent.isConfirmed ? "Confirmed" : "Unconfirmed"}
                  </Badge>
                  {selectedEvent.clientNotified && (
                    <Badge variant="outline">Client Notified</Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button className="flex-1" onClick={() => setIsEditMode(true)} data-testid="button-edit-event-main">
                  Edit Event
                </Button>
              </div>
            </div>
          )}
          
          {selectedEvent && isEditMode && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <EventFormFields form={editForm} />
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditMode(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={updateEventMutation.isPending} data-testid="button-save-changes">
                    {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
