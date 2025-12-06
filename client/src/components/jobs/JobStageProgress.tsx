import { 
  Hammer, 
  Truck, 
  Package, 
  CheckCircle2, 
  ClipboardList,
  Wrench,
  DoorOpen
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type JobStageType = "supply_install" | "supply_install_gate" | "supply_only";

export interface StageDefinition {
  id: number;
  name: string;
  shortName: string;
  icon: typeof Hammer;
}

export const STAGE_DEFINITIONS: Record<JobStageType, StageDefinition[]> = {
  supply_install: [
    { id: 1, name: "Manufacturing of Posts", shortName: "Mfg Posts", icon: Hammer },
    { id: 2, name: "Installation of Posts", shortName: "Install Posts", icon: Wrench },
    { id: 3, name: "Manufacturing of Panels", shortName: "Mfg Panels", icon: Hammer },
    { id: 4, name: "Installation of Panels", shortName: "Install Panels", icon: Wrench },
    { id: 5, name: "Complete", shortName: "Complete", icon: CheckCircle2 },
  ],
  supply_install_gate: [
    { id: 1, name: "Order PO", shortName: "Order PO", icon: ClipboardList },
    { id: 2, name: "Manufacturing of Posts", shortName: "Mfg Posts", icon: Hammer },
    { id: 3, name: "Installation of Posts", shortName: "Install Posts", icon: Wrench },
    { id: 4, name: "Manufacturing of Panels", shortName: "Mfg Panels", icon: Hammer },
    { id: 5, name: "Installation of Panels", shortName: "Install Panels", icon: Wrench },
    { id: 6, name: "Manufacturing of Gate", shortName: "Mfg Gate", icon: DoorOpen },
    { id: 7, name: "Installation of Gate", shortName: "Install Gate", icon: DoorOpen },
    { id: 8, name: "Complete", shortName: "Complete", icon: CheckCircle2 },
  ],
  supply_only: [
    { id: 1, name: "Manufacturing of Posts", shortName: "Mfg Posts", icon: Hammer },
    { id: 2, name: "Client Picked Up Posts", shortName: "Pickup Posts", icon: Package },
    { id: 3, name: "Manufacturing of Panels", shortName: "Mfg Panels", icon: Hammer },
    { id: 4, name: "Client Picks Up Panels", shortName: "Pickup Panels", icon: Truck },
  ],
};

export function getJobStageType(jobType: string, hasGate: boolean): JobStageType {
  if (jobType === "supply_only") {
    return "supply_only";
  }
  return hasGate ? "supply_install_gate" : "supply_install";
}

interface JobStageProgressProps {
  jobType: string;
  hasGate: boolean;
  stagesCompleted: number[];
  size?: "sm" | "md";
  className?: string;
}

export function JobStageProgress({ 
  jobType, 
  hasGate, 
  stagesCompleted = [], 
  size = "sm",
  className 
}: JobStageProgressProps) {
  const stageType = getJobStageType(jobType, hasGate);
  const stages = STAGE_DEFINITIONS[stageType];
  
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const containerGap = size === "sm" ? "gap-1" : "gap-2";

  return (
    <div 
      className={cn("flex items-center", containerGap, className)}
      data-testid="job-stage-progress"
    >
      {stages.map((stage) => {
        const isCompleted = stagesCompleted.includes(stage.id);
        const Icon = stage.icon;
        
        return (
          <Tooltip key={stage.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center rounded-sm p-0.5 transition-colors",
                  isCompleted 
                    ? "text-green-600 dark:text-green-500" 
                    : "text-muted-foreground/30"
                )}
                data-testid={`stage-${stage.id}-${isCompleted ? "completed" : "pending"}`}
              >
                <Icon className={iconSize} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{stage.name}</p>
              <p className="text-muted-foreground">
                {isCompleted ? "Completed" : "Pending"}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
