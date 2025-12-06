import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Truck, Wrench, Package, Ruler, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type EventType = "install" | "delivery" | "pickup" | "measure";
type JobType = "supply_only" | "supply_install";

interface CalendarEvent {
  id: string;
  jobNumber: string;
  clientName: string;
  time: string;
  type: EventType;
  installer?: string;
  jobType?: JobType;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: (date: Date) => void;
}

const eventTypeConfig: Record<EventType, { icon: typeof Wrench; color: string; label: string }> = {
  install: { icon: Wrench, color: "bg-success text-success-foreground", label: "Install" },
  delivery: { icon: Truck, color: "bg-warning text-warning-foreground", label: "Delivery" },
  pickup: { icon: Package, color: "bg-primary text-primary-foreground", label: "Pickup" },
  measure: { icon: Ruler, color: "bg-accent text-accent-foreground", label: "Measure" },
};

export function CalendarView({ events, onEventClick, onAddEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper: get date from event time string
  const getEventDate = (event: CalendarEvent): Date | null => {
    try {
      const date = new Date(event.time);
      if (isNaN(date.getTime())) return null;
      date.setHours(0, 0, 0, 0);
      return date;
    } catch {
      return null;
    }
  };

  // Helper: check if date is same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() === d2.getTime();
  };

  // Helper: get events for a specific day
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = getEventDate(event);
      return eventDate && isSameDay(eventDate, date);
    });
  };

  // Helper: extract hour from event time
  const getHourFromEvent = (event: CalendarEvent): number => {
    try {
      const date = new Date(event.time);
      return date.getHours();
    } catch {
      return 9;
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  };

  const formatDayDate = (date: Date) => {
    return date.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  // Month View: Get all days in month + padding
  const getMonthDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    let date = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateToAdd = new Date(date);
      dateToAdd.setHours(0, 0, 0, 0);
      
      days.push({
        date: dateToAdd,
        isCurrentMonth: dateToAdd.getMonth() === month,
        isToday: isSameDay(dateToAdd, today),
        events: getEventsForDay(dateToAdd),
      });

      date.setDate(date.getDate() + 1);
    }

    return days;
  };

  // Week View: Get 7 days starting Monday
  const getWeekDays = (): CalendarDay[] => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    start.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      days.push({
        date,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: isSameDay(date, today),
        events: getEventsForDay(date),
      });
    }
    return days;
  };

  // Day View: Just current day
  const getDayData = (): CalendarDay => {
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    return {
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      events: getEventsForDay(date),
    };
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthDays = getMonthDays();
  const weekDays = getWeekDays();
  const dayData = getDayData();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 11 }, (_, i) => i + 6); // 6am to 4pm

  // Event badge component
  const EventBadge = ({ event }: { event: CalendarEvent }) => {
    const config = eventTypeConfig[event.type];
    const Icon = config.icon;
    return (
      <div
        className={cn(
          "text-[10px] p-1 rounded flex items-center gap-1 truncate cursor-pointer hover-elevate",
          config.color
        )}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick?.(event);
        }}
        data-testid={`calendar-event-${event.id}`}
      >
        <Icon className="h-2.5 w-2.5 flex-shrink-0" />
        <span className="truncate">{event.time} {event.clientName}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {viewMode === "day" ? formatDayDate(dayData.date) : formatMonthYear(currentDate)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              {(["day", "week", "month"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none first:rounded-l-md last:rounded-r-md",
                    viewMode === mode && "bg-muted"
                  )}
                  onClick={() => setViewMode(mode)}
                  data-testid={`button-view-${mode}`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                data-testid="button-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                data-testid="button-today"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(1)}
                data-testid="button-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {Object.entries(eventTypeConfig).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <Badge key={type} variant="outline" className="gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === "month" && (
          <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
            {dayNames.map((day) => (
              <div
                key={day}
                className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {monthDays.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  "bg-background min-h-[100px] p-2 cursor-pointer hover-elevate",
                  day.isToday && "ring-2 ring-accent ring-inset"
                )}
                onClick={() => onAddEvent?.(day.date)}
                data-testid={`calendar-day-${idx}`}
              >
                <div
                  className={cn(
                    "text-sm font-medium mb-2",
                    !day.isCurrentMonth && "text-muted-foreground",
                    day.isToday && "text-accent"
                  )}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.events.slice(0, 2).map((event) => (
                    <EventBadge key={event.id} event={event} />
                  ))}
                  {day.events.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{day.events.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === "week" && (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header row with days */}
              <div className="grid gap-px bg-border rounded-md overflow-hidden" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">Time</div>
                {weekDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "bg-muted p-2 text-center text-xs font-medium text-muted-foreground",
                      day.isToday && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div>{dayNames[day.date.getDay()]}</div>
                    <div>{day.date.getDate()}</div>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              {hours.map((hour) => (
                <div key={hour} className="grid gap-px bg-border" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                  <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                    {hour}:00
                  </div>
                  {weekDays.map((day, dayIdx) => {
                    const dayEvents = day.events.filter(e => getHourFromEvent(e) === hour);
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "bg-background min-h-[60px] p-1 cursor-pointer hover-elevate border-b border-border",
                          day.isToday && "bg-accent/5"
                        )}
                        onClick={() => onAddEvent?.(day.date)}
                        data-testid={`week-cell-${hour}-${dayIdx}`}
                      >
                        <div className="space-y-1">
                          {dayEvents.map((event) => {
                            const config = eventTypeConfig[event.type];
                            const Icon = config.icon;
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "text-[10px] p-1 rounded flex items-center gap-1 truncate cursor-pointer hover-elevate",
                                  config.color
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick?.(event);
                                }}
                                data-testid={`week-event-${event.id}`}
                              >
                                <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate text-xs">{event.clientName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === "day" && (
          <div className="space-y-6">
            {/* Supply Only Section */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Badge variant="outline">Supply Only</Badge>
                <span className="text-xs text-muted-foreground">
                  {dayData.events.filter(e => e.jobType === "supply_only").length} events
                </span>
              </h3>
              {dayData.events.filter(e => e.jobType === "supply_only").length > 0 ? (
                <div className="space-y-2">
                  {dayData.events
                    .filter(e => e.jobType === "supply_only")
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((event) => {
                      const config = eventTypeConfig[event.type];
                      const Icon = config.icon;
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-3 rounded-md border cursor-pointer hover-elevate flex items-start gap-3",
                            config.color
                          )}
                          onClick={() => onEventClick?.(event)}
                          data-testid={`day-event-${event.id}`}
                        >
                          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{event.clientName}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.time}
                              {event.installer && ` • ${event.installer}`}
                            </div>
                            {event.jobNumber && (
                              <div className="text-xs text-muted-foreground mt-1 font-mono">
                                {event.jobNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-md text-center">
                  No supply only events
                </div>
              )}
            </div>

            {/* Supply & Install Section */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Badge variant="outline">Supply & Install</Badge>
                <span className="text-xs text-muted-foreground">
                  {dayData.events.filter(e => e.jobType === "supply_install").length} events
                </span>
              </h3>
              {dayData.events.filter(e => e.jobType === "supply_install").length > 0 ? (
                <div className="space-y-2">
                  {dayData.events
                    .filter(e => e.jobType === "supply_install")
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((event) => {
                      const config = eventTypeConfig[event.type];
                      const Icon = config.icon;
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-3 rounded-md border cursor-pointer hover-elevate flex items-start gap-3",
                            config.color
                          )}
                          onClick={() => onEventClick?.(event)}
                          data-testid={`day-event-${event.id}`}
                        >
                          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{event.clientName}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.time}
                              {event.installer && ` • ${event.installer}`}
                            </div>
                            {event.jobNumber && (
                              <div className="text-xs text-muted-foreground mt-1 font-mono">
                                {event.jobNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-md text-center">
                  No supply & install events
                </div>
              )}
            </div>

            {dayData.events.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No events scheduled for this day</p>
                <Button onClick={() => onAddEvent?.(dayData.date)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
