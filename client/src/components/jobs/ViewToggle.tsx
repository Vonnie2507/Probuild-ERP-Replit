import { Button } from "@/components/ui/button";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "kanban";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex border rounded-md">
      <Button
        variant="ghost"
        size="sm"
        className={cn(viewMode === "list" && "bg-muted")}
        onClick={() => onViewModeChange("list")}
        data-testid="button-view-list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(viewMode === "kanban" && "bg-muted")}
        onClick={() => onViewModeChange("kanban")}
        data-testid="button-view-kanban"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
