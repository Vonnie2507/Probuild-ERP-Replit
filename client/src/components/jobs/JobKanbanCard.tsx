import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobStageProgress } from "./JobStageProgress";
import { 
  Calendar, 
  AlertTriangle, 
  Timer,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanJobData {
  id: string;
  jobNumber: string;
  clientName: string;
  siteAddress: string;
  jobType: string;
  hasGate: boolean;
  totalAmount: string;
  assignedInstallerName?: string;
  scheduledStartDate?: string;
  isDelayed: boolean;
  isWaitingOnClient: boolean;
  stagesCompleted: number[];
  status: string;
}

interface JobKanbanCardProps {
  job: KanbanJobData;
  onClick?: () => void;
}

function isThisWeek(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

function formatCurrency(amount: string | number): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function JobKanbanCard({ job, onClick }: JobKanbanCardProps) {
  const isSupplyInstall = job.jobType === "supply_install";
  const thisWeek = isThisWeek(job.scheduledStartDate);
  
  const borderColor = isSupplyInstall 
    ? "border-l-4 border-l-yellow-500" 
    : "border-l-4 border-l-green-500";

  return (
    <Card 
      className={cn(
        "cursor-pointer hover-elevate transition-all",
        borderColor
      )}
      onClick={onClick}
      data-testid={`kanban-card-${job.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-muted-foreground" data-testid="kanban-job-number">
              {job.jobNumber}
            </p>
            <p className="font-medium text-sm break-words" data-testid="kanban-client-name">
              {job.clientName}
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs shrink-0"
            data-testid="kanban-job-type"
          >
            {isSupplyInstall ? "S+I" : "Supply"}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground break-words" data-testid="kanban-address">
          {job.siteAddress}
        </p>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {job.assignedInstallerName ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="break-words">{job.assignedInstallerName}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Unassigned</span>
          )}
          <span className="font-semibold text-sm shrink-0" data-testid="kanban-amount">
            {formatCurrency(job.totalAmount)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {thisWeek && (
            <Badge 
              variant="outline" 
              className="text-xs py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
              data-testid="badge-this-week"
            >
              <Calendar className="h-3 w-3 mr-1" />
              THIS WEEK
            </Badge>
          )}
          {job.isDelayed && (
            <Badge 
              className="text-xs py-0 px-1.5 bg-red-600 text-white border-red-600"
              data-testid="badge-delayed"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              DELAYED
            </Badge>
          )}
          {job.isWaitingOnClient && (
            <Badge 
              variant="outline" 
              className="text-xs py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200"
              data-testid="badge-waiting"
            >
              <Timer className="h-3 w-3 mr-1" />
              Waiting On Client
            </Badge>
          )}
        </div>

        <div className="pt-1 border-t">
          <JobStageProgress
            jobType={job.jobType}
            hasGate={job.hasGate}
            stagesCompleted={job.stagesCompleted}
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
