import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CheckCircle2, Clock, AlertCircle, Bell, Calendar, Cloud, Sun, CloudRain,
  Thermometer, Umbrella, FileText, Phone, Briefcase, Users, TrendingUp,
  CalendarCheck, Target, ExternalLink, Plus, Package, Truck, ClipboardList,
  Hammer, Settings, BarChart3, UserPlus, Boxes, Wrench, LayoutDashboard,
  Gauge, LineChart, PieChart, Table, ListChecks
} from "lucide-react";
import type { LeadTask, Notification, StaffLeaveBalance, DashboardWidget } from "@shared/schema";
import { formatDistanceToNow, isToday, isBefore, addDays, format } from "date-fns";

interface CustomLayoutWidget {
  id: string;
  widgetId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  config: Record<string, any> | null;
  widget?: DashboardWidget;
}

interface CustomLayout {
  id: string;
  name: string;
  role: string;
  isPublished: boolean;
  instances: CustomLayoutWidget[];
}

interface KpiItem {
  label: string;
  value: string | number;
  trend?: string;
}

interface DashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    positionTitle: string | null;
    profilePhotoUrl: string | null;
  };
  tasks: LeadTask[];
  notifications: Notification[];
  leaveBalance: StaffLeaveBalance | { annualLeaveBalanceHours: string; sickLeaveBalanceHours: string };
  kpis: KpiItem[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatRoleDisplay(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "Administrator",
    sales: "Sales",
    scheduler: "Scheduler",
    production_manager: "Production Manager",
    warehouse: "Warehouse",
    installer: "Installer",
    trade_client: "Trade Client",
  };
  return roleMap[role] || role;
}

function TaskPriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, "destructive" | "secondary" | "outline"> = {
    urgent: "destructive",
    high: "destructive",
    medium: "secondary",
    low: "outline",
  };
  return <Badge variant={variants[priority] || "secondary"}>{priority}</Badge>;
}

function TaskStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-blue-500" />;
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}

const WEATHER_LOCATIONS = [
  { id: "malaga", name: "Malaga" },
  { id: "perth", name: "Perth CBD" },
  { id: "rockingham", name: "Rockingham" },
  { id: "quinns", name: "Quinns Rock" },
];

function WeatherWidget() {
  const [selectedLocation, setSelectedLocation] = useState(() => {
    return localStorage.getItem("weatherLocation") || "malaga";
  });

  const { data: weather, isLoading } = useQuery<{
    location: string;
    temperature: number;
    condition: string;
    minTemp: number;
    maxTemp: number;
    humidity: number;
  }>({
    queryKey: ["/api/weather", selectedLocation],
    retry: false,
    staleTime: 1000 * 60 * 30,
  });

  const handleLocationChange = (newLocation: string) => {
    setSelectedLocation(newLocation);
    localStorage.setItem("weatherLocation", newLocation);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const weatherData = weather || {
    location: "Malaga",
    temperature: 24,
    condition: "Sunny",
    minTemp: 18,
    maxTemp: 28,
    humidity: 45,
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.toLowerCase().includes("rain") || condition.toLowerCase().includes("shower")) return <CloudRain className="h-10 w-10 text-blue-500" />;
    if (condition.toLowerCase().includes("cloud") || condition.toLowerCase().includes("overcast")) return <Cloud className="h-10 w-10 text-gray-500" />;
    if (condition.toLowerCase().includes("fog")) return <Cloud className="h-10 w-10 text-gray-400" />;
    if (condition.toLowerCase().includes("thunder")) return <CloudRain className="h-10 w-10 text-purple-500" />;
    return <Sun className="h-10 w-10 text-yellow-500" />;
  };

  return (
    <Card data-testid="widget-weather">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Cloud className="h-4 w-4" />
          Weather
        </CardTitle>
        <Select value={selectedLocation} onValueChange={handleLocationChange}>
          <SelectTrigger className="w-[130px] h-7 text-xs" data-testid="select-weather-location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEATHER_LOCATIONS.map((loc) => (
              <SelectItem key={loc.id} value={loc.id} data-testid={`option-location-${loc.id}`}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weatherData.condition)}
            <div>
              <p className="text-3xl font-bold" data-testid="text-weather-temp">{weatherData.temperature}°C</p>
              <p className="text-sm text-muted-foreground">{weatherData.condition}</p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p className="flex items-center justify-end gap-1">
              <Thermometer className="h-3 w-3" />
              {weatherData.minTemp}° / {weatherData.maxTemp}°
            </p>
            <p className="flex items-center justify-end gap-1">
              <Umbrella className="h-3 w-3" />
              {weatherData.humidity}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveBalanceWidget({ leaveBalance }: { leaveBalance: DashboardData["leaveBalance"] }) {
  const annualHours = parseFloat(leaveBalance.annualLeaveBalanceHours || "0");
  const sickHours = parseFloat(leaveBalance.sickLeaveBalanceHours || "0");
  const annualDays = annualHours / 8;
  const sickDays = sickHours / 8;
  
  const upcomingLeave = "upcomingLeaveStart" in leaveBalance && leaveBalance.upcomingLeaveStart 
    ? leaveBalance 
    : null;

  return (
    <Card data-testid="widget-leave-balances">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          My Leave Balances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Annual Leave</span>
          <span className="font-semibold" data-testid="text-annual-leave">{annualDays.toFixed(1)} days</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Sick Leave</span>
          <span className="font-semibold" data-testid="text-sick-leave">{sickDays.toFixed(1)} days</span>
        </div>
        {upcomingLeave?.upcomingLeaveStart && upcomingLeave?.upcomingLeaveEnd && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">Upcoming Leave</p>
            <p className="text-sm font-medium">
              {format(new Date(upcomingLeave.upcomingLeaveStart), "d MMM")} - {format(new Date(upcomingLeave.upcomingLeaveEnd), "d MMM")}
              <Badge variant="outline" className="ml-2">{upcomingLeave.upcomingLeaveType || "Annual"}</Badge>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TasksWidget({ tasks }: { tasks: LeadTask[] }) {
  const [, setLocation] = useLocation();
  const [showCompleted, setShowCompleted] = useState(false);
  
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/lead-tasks/${id}`, { 
        status,
        completedAt: status === "completed" ? new Date().toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dashboard"] });
    },
  });

  const now = new Date();
  const activeTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = activeTasks.filter(t => 
    t.dueDate && isBefore(new Date(t.dueDate), now)
  );
  const todayTasks = activeTasks.filter(t => 
    t.dueDate && isToday(new Date(t.dueDate))
  );
  const upcomingTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return !isBefore(dueDate, now) && !isToday(dueDate) && isBefore(dueDate, addDays(now, 7));
  });
  const noDueDateTasks = activeTasks.filter(t => !t.dueDate);

  const handleToggleComplete = async (task: LeadTask) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    await updateTaskMutation.mutateAsync({ id: task.id, status: newStatus });
  };

  const renderTask = (task: LeadTask) => (
    <div 
      key={task.id} 
      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
      data-testid={`task-item-${task.id}`}
    >
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => handleToggleComplete(task)}
        className="mt-1"
        data-testid={`checkbox-task-${task.id}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TaskStatusIcon status={task.status} />
          <span className={`text-sm font-medium truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              Due: {format(new Date(task.dueDate), "d MMM")}
            </span>
          )}
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          setLocation(`/leads?leadId=${task.leadId}&taskId=${task.id}&tab=activity`);
        }}
        data-testid={`button-open-task-${task.id}`}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card data-testid="widget-tasks">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            My To-Do List
          </CardTitle>
          <CardDescription>{activeTasks.length} active tasks{completedTasks.length > 0 && ` • ${completedTasks.length} completed`}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {completedTasks.length > 0 && (
            <Button 
              variant={showCompleted ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setShowCompleted(!showCompleted)}
              data-testid="button-toggle-completed"
            >
              {showCompleted ? "Hide Completed" : "Show Completed"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setLocation("/leads")} data-testid="button-view-all-tasks">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {overdueTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Overdue ({overdueTasks.length})
                </h4>
                <div className="space-y-2">
                  {overdueTasks.slice(0, 5).map(renderTask)}
                </div>
              </div>
            )}
            
            {todayTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Due Today ({todayTasks.length})
                </h4>
                <div className="space-y-2">
                  {todayTasks.slice(0, 5).map(renderTask)}
                </div>
              </div>
            )}
            
            {upcomingTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Upcoming ({upcomingTasks.length})
                </h4>
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 5).map(renderTask)}
                </div>
              </div>
            )}

            {noDueDateTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Other Tasks ({noDueDateTasks.length})
                </h4>
                <div className="space-y-2">
                  {noDueDateTasks.slice(0, 10).map(renderTask)}
                </div>
              </div>
            )}
            
            {activeTasks.length === 0 && !showCompleted && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active tasks. Great job!
              </p>
            )}

            {showCompleted && completedTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed ({completedTasks.length})
                </h4>
                <div className="space-y-2">
                  {completedTasks.slice(0, 10).map(renderTask)}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function NotificationsWidget({ notifications }: { notifications: Notification[] }) {
  const [, setLocation] = useLocation();
  
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${id}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dashboard"] });
    },
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const recentNotifications = notifications.slice(0, 10);

  const getNotificationIcon = (type: string) => {
    if (type.includes("lead")) return <Users className="h-4 w-4 text-blue-500" />;
    if (type.includes("quote")) return <FileText className="h-4 w-4 text-green-500" />;
    if (type.includes("job")) return <Briefcase className="h-4 w-4 text-purple-500" />;
    if (type.includes("call")) return <Phone className="h-4 w-4 text-orange-500" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  const handleOpenNotification = async (notification: Notification) => {
    if (!notification.isRead) {
      await markReadMutation.mutateAsync(notification.id);
    }
    
    if (notification.relatedEntityType && notification.relatedEntityId) {
      const routes: Record<string, string> = {
        lead: "/leads",
        quote: "/quotes",
        job: "/jobs",
      };
      const route = routes[notification.relatedEntityType];
      if (route) {
        setLocation(`${route}?id=${notification.relatedEntityId}`);
      }
    }
  };

  return (
    <Card data-testid="widget-notifications">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            My Notifications
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-1">{unreadNotifications.length}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notifications
              </p>
            ) : (
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover-elevate ${
                    !notification.isRead ? "bg-accent/50" : "bg-card"
                  }`}
                  onClick={() => handleOpenNotification(notification)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.isRead ? "font-medium" : ""}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface QuickAction {
  label: string;
  icon: typeof Plus;
  path: string;
  variant?: "default" | "outline" | "ghost";
}

function getRoleQuickActions(role: string): QuickAction[] {
  const commonActions: QuickAction[] = [];
  
  switch (role) {
    case 'admin':
      return [
        { label: "New Lead", icon: UserPlus, path: "/leads", variant: "default" },
        { label: "Schedule", icon: CalendarCheck, path: "/schedule", variant: "outline" },
        { label: "Business Dashboard", icon: BarChart3, path: "/business-dashboard", variant: "outline" },
        { label: "Settings", icon: Settings, path: "/organisation", variant: "ghost" },
      ];
    case 'sales':
      return [
        { label: "New Lead", icon: UserPlus, path: "/leads", variant: "default" },
        { label: "Quotes", icon: FileText, path: "/quotes", variant: "outline" },
        { label: "My Clients", icon: Users, path: "/clients", variant: "outline" },
      ];
    case 'scheduler':
      return [
        { label: "Schedule", icon: CalendarCheck, path: "/schedule", variant: "default" },
        { label: "Jobs", icon: Briefcase, path: "/jobs", variant: "outline" },
        { label: "Installers", icon: Users, path: "/organisation", variant: "ghost" },
      ];
    case 'production_manager':
      return [
        { label: "Production Queue", icon: ClipboardList, path: "/production", variant: "default" },
        { label: "Jobs", icon: Briefcase, path: "/jobs", variant: "outline" },
        { label: "Inventory", icon: Package, path: "/inventory", variant: "outline" },
      ];
    case 'warehouse':
      return [
        { label: "Inventory", icon: Boxes, path: "/inventory", variant: "default" },
        { label: "Low Stock", icon: AlertCircle, path: "/inventory?filter=low-stock", variant: "outline" },
        { label: "Deliveries", icon: Truck, path: "/schedule", variant: "outline" },
      ];
    case 'installer':
      return [
        { label: "My Jobs", icon: Hammer, path: "/jobs?filter=mine", variant: "default" },
        { label: "Schedule", icon: CalendarCheck, path: "/schedule", variant: "outline" },
        { label: "Job Docs", icon: FileText, path: "/jobs", variant: "ghost" },
      ];
    case 'trade_client':
      return [
        { label: "My Orders", icon: Package, path: "/jobs", variant: "default" },
        { label: "New Quote", icon: FileText, path: "/quotes", variant: "outline" },
        { label: "Contact Us", icon: Phone, path: "/contact", variant: "ghost" },
      ];
    default:
      return [
        { label: "Dashboard", icon: BarChart3, path: "/", variant: "default" },
      ];
  }
}

function RoleQuickActions({ role }: { role: string }) {
  const [, setLocation] = useLocation();
  const actions = getRoleQuickActions(role);
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action, index) => (
        <Button 
          key={index}
          variant={action.variant || "outline"} 
          size="sm" 
          onClick={() => setLocation(action.path)}
          data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <action.icon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function KPIsWidget({ kpis }: { kpis: KpiItem[] }) {
  return (
    <Card data-testid="widget-kpis">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          My Performance
        </CardTitle>
        <CardDescription>Role-based metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {kpis.map((kpi, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
              data-testid={`kpi-item-${index}`}
            >
              <div>
                <p className="text-sm font-medium">{kpi.label}</p>
                {kpi.trend && (
                  <p className="text-xs text-green-600">{kpi.trend}</p>
                )}
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const WIDGET_ICONS: Record<string, typeof BarChart3> = {
  "bar_chart": BarChart3,
  "line_chart": LineChart,
  "pie_chart": PieChart,
  "table": Table,
  "kpi": Gauge,
  "list": ListChecks,
};

function CustomWidgetRenderer({ 
  widget, 
  dashboardData 
}: { 
  widget: CustomLayoutWidget; 
  dashboardData: DashboardData | undefined;
}) {
  const widgetInfo = widget.widget;
  if (!widgetInfo) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[120px]">
          <p className="text-muted-foreground">Widget not found</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = WIDGET_ICONS[widgetInfo.widgetType] || LayoutDashboard;

  switch (widgetInfo.componentKey) {
    case "tasks_widget":
      return <TasksWidget tasks={dashboardData?.tasks || []} />;
    case "notifications_widget":
      return <NotificationsWidget notifications={dashboardData?.notifications || []} />;
    case "kpis_widget":
      return <KPIsWidget kpis={dashboardData?.kpis || []} />;
    case "weather_widget":
      return <WeatherWidget />;
    case "leave_balance_widget":
      return <LeaveBalanceWidget leaveBalance={dashboardData?.leaveBalance || { annualLeaveBalanceHours: "0", sickLeaveBalanceHours: "0" }} />;
    default:
      return (
        <Card data-testid={`custom-widget-${widget.id}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {widgetInfo.name}
            </CardTitle>
            <CardDescription>{widgetInfo.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Widget preview coming soon</p>
                <p className="text-xs mt-1">Type: {widgetInfo.widgetType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
  }
}

function CustomDashboardLayout({ 
  layout, 
  dashboardData 
}: { 
  layout: CustomLayout; 
  dashboardData: DashboardData | undefined;
}) {
  const sortedInstances = [...layout.instances].sort((a, b) => a.positionY - b.positionY);

  return (
    <div className="space-y-4" data-testid="custom-dashboard-layout">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <LayoutDashboard className="h-4 w-4" />
        <span>Custom Layout: {layout.name}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedInstances.map((instance) => (
          <div 
            key={instance.id} 
            className={`${instance.width >= 2 ? 'md:col-span-2' : ''} ${instance.width >= 3 ? 'lg:col-span-3' : ''}`}
          >
            <CustomWidgetRenderer widget={instance} dashboardData={dashboardData} />
          </div>
        ))}
      </div>
      {sortedInstances.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No widgets configured</h3>
            <p className="text-muted-foreground">
              This dashboard layout has no widgets. Ask an admin to add widgets in the Dashboard Builder.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MyDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/my-dashboard"],
    enabled: !!user,
  });

  const { data: customLayout, isLoading: layoutLoading } = useQuery<CustomLayout | null>({
    queryKey: ["/api/dashboard/my-layout"],
    enabled: !!user,
  });

  const todayFormatted = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (isLoading || layoutLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const displayUser = dashboardData?.user || user;
  const tasks = dashboardData?.tasks || [];
  const notifications = dashboardData?.notifications || [];
  const leaveBalance = dashboardData?.leaveBalance || { annualLeaveBalanceHours: "0", sickLeaveBalanceHours: "0" };
  const kpis = dashboardData?.kpis || [];

  const hasCustomLayout = customLayout && customLayout.instances && customLayout.instances.length > 0;

  return (
    <div className="p-6 space-y-6" data-testid="page-my-dashboard">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-dashboard-greeting">
            {getGreeting()}, {displayUser?.firstName || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {displayUser?.positionTitle || formatRoleDisplay(displayUser?.role || "staff")} • {todayFormatted}
          </p>
        </div>
        <RoleQuickActions role={displayUser?.role || "staff"} />
      </div>

      {hasCustomLayout ? (
        <CustomDashboardLayout layout={customLayout} dashboardData={dashboardData} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TasksWidget tasks={tasks} />
            <NotificationsWidget notifications={notifications} />
          </div>
          <div className="space-y-6">
            <KPIsWidget kpis={kpis} />
            <WeatherWidget />
            <LeaveBalanceWidget leaveBalance={leaveBalance} />
          </div>
        </div>
      )}
    </div>
  );
}
