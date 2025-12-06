import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Mail, MapPin, Clock, MoreHorizontal, Pencil, Trash2, ClipboardList, Send, FileText, Pickaxe, MessageSquare, CheckSquare, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuoteInfo {
  total: number;
  sent: number;
  approved: number;
}

// Soil warning display - only LIMESTONE is red badge, all others are gray text
function SoilWarningDisplay({ warning }: { warning: string }) {
  const warningUpper = warning.toUpperCase();
  
  // Only LIMESTONE gets red/destructive badge styling
  if (warningUpper.includes("LIMESTONE")) {
    return (
      <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1">
        <Pickaxe className="h-3 w-3" />
        LIMESTONE
      </Badge>
    );
  }
  
  // All other soil types - plain gray text
  return (
    <span className="text-xs text-muted-foreground">{warningUpper}</span>
  );
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
  status: "new" | "contacted" | "quoted" | "approved" | "declined";
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

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onCreateQuote?: () => void;
  onAddNote?: () => void;
  onFollowUp?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewSetupTemplate?: () => void;
}

export function LeadCard({
  lead,
  onClick,
  onCreateQuote,
  onAddNote,
  onFollowUp,
  onEdit,
  onDelete,
  onViewSetupTemplate,
}: LeadCardProps) {
  return (
    <Card
      className="hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`lead-card-${lead.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={lead.leadType} />
            <StatusBadge status={lead.status} />
            {lead.jobFulfillmentType && (
              <Badge 
                variant={lead.jobFulfillmentType === "supply_install" ? "default" : "secondary"}
                className="text-xs"
                data-testid={`badge-job-type-${lead.id}`}
              >
                {lead.jobFulfillmentType === "supply_install" ? "S+I" : "Supply"}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-lead-actions-${lead.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }} data-testid={`button-edit-lead-${lead.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateQuote?.(); }} data-testid={`button-create-quote-${lead.id}`}>
                Create Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddNote?.(); }}>
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFollowUp?.(); }}>
                Log Follow-up
              </DropdownMenuItem>
              {lead.jobFulfillmentType === "supply_install" && onViewSetupTemplate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onViewSetupTemplate?.(); }}
                    data-testid={`button-view-setup-template-${lead.id}`}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    View Setup Template
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }} 
                className="text-destructive focus:text-destructive"
                data-testid={`button-delete-lead-${lead.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">{lead.clientName}</h3>
          <span className="text-xs font-mono text-muted-foreground">{lead.leadNumber}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{lead.fenceStyle}</p>

        <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{lead.address}</span>
          </div>
          {lead.soilWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 mt-1" data-testid={`soil-warning-${lead.id}`}>
                  <SoilWarningDisplay warning={lead.soilWarning} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{lead.soilInstallNotes || lead.soilWarning}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-muted">
                {lead.assignedTo.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{lead.assignedTo.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {(lead.hasUnreadMessages || lead.isAssigned) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center" data-testid={`message-indicator-${lead.id}`}>
                    {lead.hasUnreadMessages ? (
                      <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center bg-primary">
                        <MessageSquare className="h-3 w-3" />
                      </Badge>
                    ) : lead.isAssigned ? (
                      <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </Badge>
                    ) : null}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {lead.hasUnreadMessages ? "Message waiting for reply" : "Assigned to staff"}
                </TooltipContent>
              </Tooltip>
            )}
            {lead.hasPendingTasks && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="h-5 px-1.5 text-[10px] gap-0.5 border-warning text-warning"
                    data-testid={`task-indicator-${lead.id}`}
                  >
                    <CheckSquare className="h-3 w-3" />
                    {lead.pendingTaskCount || 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {lead.pendingTaskCount} pending task{lead.pendingTaskCount !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}
            {lead.quoteInfo && lead.quoteInfo.total > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1" data-testid={`quote-indicator-${lead.id}`}>
                    {lead.quoteInfo.approved > 0 ? (
                      <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-success text-success-foreground">
                        <FileText className="h-3 w-3 mr-0.5" />
                        {lead.quoteInfo.approved}
                      </Badge>
                    ) : lead.quoteInfo.sent > 0 ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        <Send className="h-3 w-3 mr-0.5" />
                        {lead.quoteInfo.sent}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        <FileText className="h-3 w-3 mr-0.5" />
                        {lead.quoteInfo.total}
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{lead.quoteInfo.total} quote{lead.quoteInfo.total !== 1 ? 's' : ''}</p>
                  {lead.quoteInfo.sent > 0 && <p>{lead.quoteInfo.sent} sent</p>}
                  {lead.quoteInfo.approved > 0 && <p>{lead.quoteInfo.approved} approved</p>}
                </TooltipContent>
              </Tooltip>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{lead.createdAt}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
