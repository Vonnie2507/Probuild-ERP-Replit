import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  MessageSquare,
  Send,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  User,
  Loader2,
  UserCheck,
  Link2,
  Building2,
  FileText,
  Briefcase,
  CalendarRange,
  AlertTriangle,
} from "lucide-react";
import type { Client, SMSLog, User as UserType, Lead, Job, SMSConversation } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { toast } = useToast();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<SMSLog[]>({
    queryKey: ["/api/sms/logs"],
  });

  const { data: conversations = [] } = useQuery<SMSConversation[]>({
    queryKey: ["/api/sms/conversations"],
  });

  const { data: clientMessages = [], refetch: refetchClientMessages } = useQuery<SMSLog[]>({
    queryKey: ["/api/sms/conversation", selectedPhone],
    enabled: !!selectedPhone,
  });

  const [optimisticMessages, setOptimisticMessages] = useState<SMSLog[]>([]);

  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; assignedTo?: string | null; isResolved?: boolean; clientId?: string | null }) => {
      return apiRequest("PATCH", `/api/sms/conversations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/unread-count"] });
      toast({
        title: "Updated",
        description: "Conversation updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update conversation.",
        variant: "destructive",
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (data: { messageIds: string[]; conversationId?: string }) => {
      return apiRequest("POST", "/api/sms/mark-read", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
    },
  });

  const createMessageRangeMutation = useMutation({
    mutationFn: async (data: { conversationId: string; leadId?: string; jobId?: string; startMessageId: string; endMessageId: string; startDate: string; endDate: string; summary?: string }) => {
      return apiRequest("POST", "/api/sms/message-ranges", data);
    },
    onSuccess: () => {
      setSelectionMode(false);
      setSelectedMessages(new Set());
      setAttachDialogOpen(false);
      toast({
        title: "Attached",
        description: "Messages attached to opportunity successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to attach messages.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { to: string; message: string; recipientName?: string; relatedEntityType?: string; relatedEntityId?: string }) => {
      return apiRequest("POST", "/api/sms/send", data);
    },
    onMutate: async (data) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: SMSLog = {
        id: tempId,
        recipientPhone: data.to,
        recipientName: data.recipientName || null,
        message: data.message,
        twilioMessageSid: null,
        status: "pending",
        isOutbound: true,
        isRead: true,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId || null,
        sentAt: null,
        deliveredAt: null,
        errorMessage: null,
        createdAt: new Date(),
      };
      setOptimisticMessages(prev => [...prev, optimisticMsg]);
      setNewMessage("");
    },
    onSuccess: async (_, variables) => {
      toast({
        title: "Message Sent",
        description: "Your SMS has been sent successfully.",
      });
      const recipientPhone = variables.to;
      
      if (recipientPhone && !selectedPhone) {
        setSelectedPhone(recipientPhone);
      }
      
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/sms/logs"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/sms/unread-count"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] }),
          selectedPhone ? queryClient.invalidateQueries({ queryKey: ["/api/sms/conversation", selectedPhone] }) : Promise.resolve(),
          (recipientPhone && recipientPhone !== selectedPhone) 
            ? queryClient.invalidateQueries({ queryKey: ["/api/sms/conversation", recipientPhone] }) 
            : Promise.resolve(),
        ]);
      } finally {
        setOptimisticMessages([]);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. SMS service may not be configured.",
        variant: "destructive",
      });
      setOptimisticMessages([]);
    },
  });

  const getPhoneMessages = (phone: string): SMSLog[] => {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    return allMessages.filter(msg => 
      msg.recipientPhone.replace(/\D/g, '').slice(-9) === normalizedPhone
    );
  };

  const getLastMessageTime = (phone: string): Date | null => {
    const messages = getPhoneMessages(phone);
    if (messages.length === 0) return null;
    return messages.reduce((latest, msg) => {
      const msgDate = new Date(msg.createdAt);
      return msgDate > latest ? msgDate : latest;
    }, new Date(messages[0].createdAt));
  };

  const getUnreadCount = (phone: string): number => {
    const messages = getPhoneMessages(phone);
    return messages.filter(m => !m.isOutbound && !m.isRead).length;
  };

  const getConversationForPhone = (phone: string): SMSConversation | undefined => {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    return conversations.find(conv => 
      conv.phoneNumber.replace(/\D/g, '').slice(-9) === normalizedPhone
    );
  };

  const getClientByPhone = (phone: string): Client | undefined => {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    return clients.find(client => 
      client.phone?.replace(/\D/g, '').slice(-9) === normalizedPhone
    );
  };

  const uniquePhones = Array.from(new Set(allMessages.map(m => m.recipientPhone.replace(/\D/g, '').slice(-9))))
    .map(normalized => {
      const msg = allMessages.find(m => m.recipientPhone.replace(/\D/g, '').slice(-9) === normalized);
      return msg?.recipientPhone || '';
    })
    .filter(Boolean);

  const filteredPhones = uniquePhones.filter(phone => {
    const client = getClientByPhone(phone);
    const conv = getConversationForPhone(phone);
    const messages = getPhoneMessages(phone);
    const lastMsg = messages[messages.length - 1];

    if (!showResolved && conv?.isResolved) return false;

    const matchesSearch = searchQuery === "" || 
      phone.includes(searchQuery) ||
      (client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (lastMsg?.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    return matchesSearch;
  });

  const sortedPhones = [...filteredPhones].sort((a, b) => {
    const aTime = getLastMessageTime(a);
    const bTime = getLastMessageTime(b);
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return bTime.getTime() - aTime.getTime();
  });

  const selectedClient = selectedPhone ? getClientByPhone(selectedPhone) : null;
  const selectedConversation = selectedPhone ? getConversationForPhone(selectedPhone) : null;
  const selectedMessages_ = selectedPhone ? getPhoneMessages(selectedPhone) : [];
  const lastMsgName = selectedMessages_.length > 0 ? selectedMessages_[selectedMessages_.length - 1].recipientName : null;

  const handleSendMessage = () => {
    if (!selectedPhone || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      to: selectedPhone,
      message: newMessage.trim(),
      recipientName: selectedClient?.name || lastMsgName || undefined,
      relatedEntityType: selectedClient ? "client" : undefined,
      relatedEntityId: selectedClient?.id,
    });
  };

  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    setSelectionMode(false);
    setSelectedMessages(new Set());
    
    const messages = getPhoneMessages(phone);
    const unreadMsgIds = messages.filter(m => !m.isOutbound && !m.isRead).map(m => m.id);
    const conv = getConversationForPhone(phone);
    
    if (unreadMsgIds.length > 0) {
      markReadMutation.mutate({
        messageIds: unreadMsgIds,
        conversationId: conv?.id,
      });
    }
  };

  const handleMessageSelect = (msgId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgId)) {
        newSet.delete(msgId);
      } else {
        newSet.add(msgId);
      }
      return newSet;
    });
  };

  const handleAttachMessages = (opportunityType: 'lead' | 'job', opportunityId: string) => {
    if (!selectedConversation || selectedMessages.size === 0) return;

    const selectedMsgs = clientMessages.filter(m => selectedMessages.has(m.id));
    const sortedMsgs = [...selectedMsgs].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const startMsg = sortedMsgs[0];
    const endMsg = sortedMsgs[sortedMsgs.length - 1];

    createMessageRangeMutation.mutate({
      conversationId: selectedConversation.id,
      leadId: opportunityType === 'lead' ? opportunityId : undefined,
      jobId: opportunityType === 'job' ? opportunityId : undefined,
      startMessageId: startMsg.id,
      endMessageId: endMsg.id,
      startDate: new Date(startMsg.createdAt).toISOString(),
      endDate: new Date(endMsg.createdAt).toISOString(),
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case "received":
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getAssignedUser = (userId: string | null): UserType | undefined => {
    if (!userId) return undefined;
    return users.find(u => u.id === userId);
  };

  const clientLeads = selectedClient 
    ? leads.filter(l => l.clientId === selectedClient.id)
    : [];

  const clientJobs = selectedClient
    ? jobs.filter(j => j.clientId === selectedClient.id)
    : [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [clientMessages]);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      <Card className="w-80 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-conversations"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Switch
              id="show-resolved"
              checked={showResolved}
              onCheckedChange={setShowResolved}
            />
            <Label htmlFor="show-resolved" className="text-sm">Show resolved</Label>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedPhones.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No conversations found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sortedPhones.map(phone => {
                  const messages = getPhoneMessages(phone);
                  const lastMessage = messages[messages.length - 1];
                  const isSelected = selectedPhone === phone;
                  const client = getClientByPhone(phone);
                  const conv = getConversationForPhone(phone);
                  const unreadCount = getUnreadCount(phone);
                  const assignedUser = getAssignedUser(conv?.assignedTo || null);
                  const displayName = client?.name || lastMessage?.recipientName || "Unknown";
                  
                  return (
                    <button
                      key={phone}
                      onClick={() => handleSelectConversation(phone)}
                      className={`w-full rounded-lg p-3 text-left transition-colors hover-elevate ${
                        isSelected ? "bg-accent" : ""
                      }`}
                      data-testid={`button-conversation-${phone}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {displayName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {!conv?.isResolved && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-2 border-background" title="Action required" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{displayName}</p>
                            {unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1.5">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {phone}
                          </p>
                          {lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {lastMessage.isOutbound ? "You: " : ""}{lastMessage.message.slice(0, 35)}...
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {client && (
                              <Badge variant="outline" className="text-xs py-0 px-1">
                                <Building2 className="h-3 w-3 mr-0.5" />
                                Client
                              </Badge>
                            )}
                            {assignedUser && (
                              <Badge variant="secondary" className="text-xs py-0 px-1">
                                <UserCheck className="h-3 w-3 mr-0.5" />
                                {assignedUser.firstName}
                              </Badge>
                            )}
                            {conv?.isResolved && (
                              <Badge variant="outline" className="text-xs py-0 px-1 text-green-600 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-0.5" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                        </div>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        {selectedPhone ? (
          <>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {(selectedClient?.name || lastMsgName || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedClient?.name || lastMsgName || "Unknown"}
                      {!selectedConversation?.isResolved && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Action Required
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" />
                      {selectedPhone}
                      {selectedClient && (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          Linked to Client
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Assigned To</Label>
                    <Select
                      value={selectedConversation?.assignedTo || "unassigned"}
                      onValueChange={(value) => {
                        if (selectedConversation) {
                          updateConversationMutation.mutate({
                            id: selectedConversation.id,
                            assignedTo: value === "unassigned" ? null : value,
                          });
                        }
                      }}
                      disabled={usersLoading || updateConversationMutation.isPending}
                    >
                      <SelectTrigger className="w-36" data-testid="select-assigned-to">
                        {usersLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Loading...</span>
                          </div>
                        ) : updateConversationMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Assign to..." />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {!usersLoading && (
                          <>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.filter(u => u.role !== "installer" && u.role !== "trade_client").map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                    <Label className="text-xs text-muted-foreground">Resolved</Label>
                    <Switch
                      checked={selectedConversation?.isResolved || false}
                      onCheckedChange={(checked) => {
                        if (selectedConversation) {
                          updateConversationMutation.mutate({
                            id: selectedConversation.id,
                            isResolved: checked,
                          });
                        }
                      }}
                      disabled={updateConversationMutation.isPending}
                      data-testid="switch-resolved"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  variant={selectionMode ? "secondary" : "outline"} 
                  size="sm"
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    setSelectedMessages(new Set());
                  }}
                  data-testid="button-select-messages"
                >
                  <CalendarRange className="h-4 w-4 mr-1" />
                  {selectionMode ? "Cancel Selection" : "Select Messages"}
                </Button>
                {selectionMode && selectedMessages.size > 0 && (
                  <Button 
                    size="sm" 
                    onClick={() => setAttachDialogOpen(true)}
                    data-testid="button-attach-to-opportunity"
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Attach to Opportunity ({selectedMessages.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : clientMessages.length === 0 && optimisticMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start the conversation by sending an SMS
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...clientMessages, ...optimisticMessages].map((msg) => {
                      const isOutbound = msg.isOutbound !== false;
                      const isSelected = selectedMessages.has(msg.id);
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                        >
                          {selectionMode && (
                            <div className="flex items-center mr-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleMessageSelect(msg.id)}
                                data-testid={`checkbox-message-${msg.id}`}
                              />
                            </div>
                          )}
                          <div className={`max-w-[70%] space-y-1 ${selectionMode && isSelected ? "ring-2 ring-primary rounded-lg" : ""}`}>
                            <div className={`rounded-lg px-4 py-2 ${
                              isOutbound 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-foreground"
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <div className={`flex items-center gap-2 px-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                              </span>
                              {isOutbound && getStatusIcon(msg.status)}
                              {!msg.isRead && !isOutbound && (
                                <Badge variant="secondary" className="text-xs py-0 px-1">New</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="self-end"
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <User className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a conversation from the list to view message history
            </p>
          </div>
        )}
      </Card>

      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Messages to Opportunity</DialogTitle>
            <DialogDescription>
              Select a lead or job to attach the selected {selectedMessages.size} message(s) to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(leadsLoading || jobsLoading || createMessageRangeMutation.isPending) ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {createMessageRangeMutation.isPending ? "Attaching messages..." : "Loading opportunities..."}
                </p>
              </div>
            ) : (
              <>
                {clientLeads.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Leads
                    </h4>
                    <div className="space-y-2">
                      {clientLeads.map(lead => (
                        <Button
                          key={lead.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleAttachMessages('lead', lead.id)}
                          disabled={createMessageRangeMutation.isPending}
                          data-testid={`button-attach-lead-${lead.id}`}
                        >
                          <Badge variant="secondary" className="mr-2">{lead.stage}</Badge>
                          {lead.description?.slice(0, 40) || "Lead"} - {lead.siteAddress?.slice(0, 30) || "No address"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {clientJobs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Jobs
                    </h4>
                    <div className="space-y-2">
                      {clientJobs.map(job => (
                        <Button
                          key={job.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleAttachMessages('job', job.id)}
                          disabled={createMessageRangeMutation.isPending}
                          data-testid={`button-attach-job-${job.id}`}
                        >
                          <Badge variant="secondary" className="mr-2">{job.jobNumber}</Badge>
                          {job.siteAddress?.slice(0, 40) || "No address"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {clientLeads.length === 0 && clientJobs.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    <p>No leads or jobs found for this client.</p>
                    <p className="text-sm mt-1">Link this conversation to a client first to see their opportunities.</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
