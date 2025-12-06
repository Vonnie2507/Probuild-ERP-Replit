import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { LeadCard } from "./LeadCard";

type LeadStatus = "new" | "contacted" | "quoted" | "approved" | "declined";

interface QuoteInfo {
  total: number;
  sent: number;
  approved: number;
  failed: number;
  drafts: number;
}

interface Lead {
  id: string;
  leadNumber: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  source: string;
  fenceStyle: string;
  leadType: "public" | "trade";
  jobFulfillmentType?: "supply_only" | "supply_install";
  status: LeadStatus;
  assignedTo: {
    name: string;
    initials: string;
  };
  createdAt: string;
  quoteInfo?: QuoteInfo;
  soilWarning?: string | null;
  soilInstallNotes?: string | null;
  hasUnreadMessages?: boolean;
  hasPendingTasks?: boolean;
  pendingTaskCount?: number;
  isAssigned?: boolean;
}

interface KanbanColumn {
  id: LeadStatus;
  title: string;
  color: string;
}

interface KanbanBoardProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
  onAddLead?: () => void;
  onCreateQuote?: (lead: Lead) => void;
  onEditLead?: (lead: Lead) => void;
  onDeleteLead?: (lead: Lead) => void;
  onViewSetupTemplate?: (lead: Lead) => void;
  onLeadStatusChange?: (leadId: string, newStatus: LeadStatus) => void;
  isUpdating?: boolean;
}

const columns: KanbanColumn[] = [
  { id: "new", title: "New Leads", color: "bg-accent" },
  { id: "contacted", title: "Contacted", color: "bg-primary" },
  { id: "quoted", title: "Quote Sent", color: "bg-warning" },
  { id: "approved", title: "Approved", color: "bg-success" },
  { id: "declined", title: "Declined", color: "bg-destructive" },
];

export function KanbanBoard({
  leads,
  onLeadClick,
  onAddLead,
  onCreateQuote,
  onEditLead,
  onDeleteLead,
  onViewSetupTemplate,
  onLeadStatusChange,
  isUpdating = false,
}: KanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  const canDrag = !isUpdating;

  const getLeadsForColumn = (status: LeadStatus) =>
    leads.filter((lead) => lead.status === status);

  const handleDragStart = (lead: Lead) => {
    if (canDrag) {
      setDraggedLead(lead);
    }
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const handleDrop = (status: LeadStatus) => {
    if (draggedLead && draggedLead.status !== status && onLeadStatusChange) {
      onLeadStatusChange(draggedLead.id, status);
    }
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnLeads = getLeadsForColumn(column.id);
        const isDropTarget = dragOverColumn === column.id && draggedLead?.status !== column.id;
        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 transition-all duration-200 ${isDropTarget ? "ring-2 ring-primary rounded-lg" : ""}`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(column.id)}
            data-testid={`kanban-column-${column.id}`}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${column.color}`} />
                    <CardTitle className="text-sm font-medium">
                      {column.title}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnLeads.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-3 p-1">
                    {column.id === "new" && onAddLead && (
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={onAddLead}
                        data-testid="button-add-lead"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lead
                      </Button>
                    )}
                    {columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable={canDrag}
                        onDragStart={() => handleDragStart(lead)}
                        onDragEnd={handleDragEnd}
                        className={`${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"} ${draggedLead?.id === lead.id ? "opacity-50" : ""}`}
                      >
                        <LeadCard
                          lead={lead}
                          onClick={() => onLeadClick?.(lead)}
                          onCreateQuote={() => onCreateQuote?.(lead)}
                          onEdit={() => onEditLead?.(lead)}
                          onDelete={() => onDeleteLead?.(lead)}
                          onViewSetupTemplate={() => onViewSetupTemplate?.(lead)}
                        />
                      </div>
                    ))}
                    {columnLeads.length === 0 && column.id !== "new" && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No leads
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
