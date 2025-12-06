import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { JobKanbanCard } from "./JobKanbanCard";
import { cn } from "@/lib/utils";
import type { Job, Client, User, KanbanColumn as DBKanbanColumn } from "@shared/schema";

interface KanbanColumn {
  id: string;
  title: string;
  statuses: string[];
  defaultStatus: string;
  color: string;
}

const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "accepted",
    title: "New Jobs",
    statuses: ["accepted", "awaiting_deposit"],
    defaultStatus: "accepted",
    color: "bg-slate-100 dark:bg-slate-800",
  },
  {
    id: "pipeline",
    title: "Pipeline",
    statuses: ["deposit_paid", "ready_for_production"],
    defaultStatus: "deposit_paid",
    color: "bg-blue-50 dark:bg-blue-950",
  },
  {
    id: "production",
    title: "Production",
    statuses: ["manufacturing_posts", "manufacturing_panels", "manufacturing_gates", "qa_check"],
    defaultStatus: "manufacturing_posts",
    color: "bg-purple-50 dark:bg-purple-950",
  },
  {
    id: "scheduling",
    title: "Ready to Schedule",
    statuses: ["ready_for_scheduling"],
    defaultStatus: "ready_for_scheduling",
    color: "bg-amber-50 dark:bg-amber-950",
  },
  {
    id: "scheduled",
    title: "Scheduled",
    statuses: ["scheduled", "install_posts", "install_panels", "install_gates"],
    defaultStatus: "scheduled",
    color: "bg-green-50 dark:bg-green-950",
  },
  {
    id: "complete",
    title: "Completing",
    statuses: ["install_complete", "awaiting_final_payment", "paid_in_full"],
    defaultStatus: "install_complete",
    color: "bg-emerald-50 dark:bg-emerald-950",
  },
];

function mapDbColumnsToKanban(dbColumns: DBKanbanColumn[]): KanbanColumn[] {
  return dbColumns
    .filter(col => col.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(col => ({
      id: col.id.toString(),
      title: col.title,
      statuses: col.statuses as string[],
      defaultStatus: col.defaultStatus,
      color: col.color,
    }));
}

interface JobKanbanBoardProps {
  jobs: Job[];
  clients: Client[];
  users: User[];
  isLoading: boolean;
  isUpdating?: boolean;
  onJobClick: (job: Job) => void;
  onJobStatusChange?: (jobId: string, newStatus: string) => void;
}

export function JobKanbanBoard({ 
  jobs, 
  clients, 
  users, 
  isLoading, 
  isUpdating = false,
  onJobClick,
  onJobStatusChange 
}: JobKanbanBoardProps) {
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  const { data: dbColumns } = useQuery<DBKanbanColumn[]>({
    queryKey: ["/api/kanban-columns"],
  });
  
  const kanbanColumns = dbColumns && dbColumns.length > 0 
    ? mapDbColumnsToKanban(dbColumns) 
    : DEFAULT_KANBAN_COLUMNS;
  
  const canDrag = !isUpdating;

  const getClientName = (clientId: string | null): string => {
    if (!clientId) return "Unknown";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown";
  };

  const getInstallerName = (installerId: string | null): string | undefined => {
    if (!installerId) return undefined;
    const user = users.find(u => u.id === installerId);
    return user ? `${user.firstName} ${user.lastName}` : undefined;
  };

  const getJobsForColumn = (column: KanbanColumn): Job[] => {
    return jobs.filter(job => column.statuses.includes(job.status));
  };

  const handleDragStart = (e: React.DragEvent, job: Job) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", job.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, column: KanbanColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedJob && onJobStatusChange) {
      const currentColumn = kanbanColumns.find(col => 
        col.statuses.includes(draggedJob.status)
      );
      
      if (currentColumn?.id !== column.id) {
        onJobStatusChange(draggedJob.id, column.defaultStatus);
      }
    }
    
    setDraggedJob(null);
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
    setDragOverColumn(null);
  };

  const columnCount = kanbanColumns.length;
  const minWidth = Math.max(1200, columnCount * 200);

  if (isLoading) {
    return (
      <div className="grid gap-4 p-4 min-w-0" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
        {kanbanColumns.map((column) => (
          <div key={column.id} className="min-w-0">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full p-4 overflow-x-auto" data-testid="kanban-board">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, minWidth: `${minWidth}px` }}>
        {kanbanColumns.map((column) => {
          const columnJobs = getJobsForColumn(column);
          const columnTotal = columnJobs.reduce(
            (sum, job) => sum + parseFloat(job.totalAmount || "0"), 
            0
          );
          const isDropTarget = dragOverColumn === column.id;

          return (
            <div 
              key={column.id} 
              className="min-w-0"
              data-testid={`kanban-column-${column.id}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column)}
            >
              <Card className={cn(
                "h-full transition-all duration-200",
                column.color,
                isDropTarget && "ring-2 ring-primary ring-offset-2"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      {column.title}
                    </CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {columnJobs.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat("en-AU", {
                      style: "currency",
                      currency: "AUD",
                      minimumFractionDigits: 0,
                    }).format(columnTotal)}
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-3 pr-2">
                      {columnJobs.length === 0 ? (
                        <div className={cn(
                          "text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg",
                          isDropTarget && "border-primary bg-primary/5"
                        )}>
                          <p className="text-sm">
                            {isDropTarget ? "Drop here" : "No jobs"}
                          </p>
                        </div>
                      ) : (
                        columnJobs.map((job) => (
                          <div
                            key={job.id}
                            draggable={canDrag}
                            onDragStart={(e) => canDrag && handleDragStart(e, job)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                              draggedJob?.id === job.id && "opacity-50"
                            )}
                          >
                            <JobKanbanCard
                              job={{
                                id: job.id,
                                jobNumber: job.jobNumber,
                                clientName: getClientName(job.clientId),
                                siteAddress: job.siteAddress,
                                jobType: job.jobType,
                                hasGate: job.hasGate || false,
                                totalAmount: job.totalAmount,
                                assignedInstallerName: getInstallerName(job.assignedInstaller),
                                scheduledStartDate: job.scheduledStartDate?.toString(),
                                isDelayed: job.isDelayed || false,
                                isWaitingOnClient: job.isWaitingOnClient || false,
                                stagesCompleted: (job.stagesCompleted as number[]) || [],
                                status: job.status,
                              }}
                              onClick={() => onJobClick(job)}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
