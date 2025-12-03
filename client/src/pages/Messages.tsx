import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import type { Client, SMSLog } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";

export default function Messages() {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<SMSLog[]>({
    queryKey: ["/api/sms/logs"],
  });

  const { data: clientMessages = [], refetch: refetchClientMessages } = useQuery<SMSLog[]>({
    queryKey: ["/api/sms/conversation", selectedClient?.phone],
    enabled: !!selectedClient?.phone,
  });

  const [optimisticMessages, setOptimisticMessages] = useState<SMSLog[]>([]);

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
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your SMS has been sent successfully.",
      });
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/sms/logs"] });
      if (selectedClient?.phone) {
        queryClient.invalidateQueries({ queryKey: ["/api/sms/conversation", selectedClient.phone] });
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

  const filteredClients = clients.filter(client => 
    client.phone && 
    (client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     client.phone.includes(searchQuery))
  );

  const getClientMessages = (clientPhone: string): SMSLog[] => {
    // Use last 9 digits for matching (handles both 0xxx and +61xxx formats)
    const normalizedPhone = clientPhone.replace(/\D/g, '').slice(-9);
    return allMessages.filter(msg => 
      msg.recipientPhone.replace(/\D/g, '').slice(-9) === normalizedPhone
    );
  };

  const getLastMessageTime = (clientPhone: string): Date | null => {
    const messages = getClientMessages(clientPhone);
    if (messages.length === 0) return null;
    return messages.reduce((latest, msg) => {
      const msgDate = new Date(msg.createdAt);
      return msgDate > latest ? msgDate : latest;
    }, new Date(messages[0].createdAt));
  };

  const sortedClients = [...filteredClients].sort((a, b) => {
    const aTime = a.phone ? getLastMessageTime(a.phone) : null;
    const bTime = b.phone ? getLastMessageTime(b.phone) : null;
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return bTime.getTime() - aTime.getTime();
  });

  const handleSendMessage = () => {
    if (!selectedClient?.phone || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      to: selectedClient.phone,
      message: newMessage.trim(),
      recipientName: selectedClient.name,
      relatedEntityType: "client",
      relatedEntityId: selectedClient.id,
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
      default:
        return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      delivered: "default",
      failed: "destructive",
      pending: "secondary",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status}
      </Badge>
    );
  };

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
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-conversations"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {clientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedClients.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No clients with phone numbers found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sortedClients.map(client => {
                  const messages = client.phone ? getClientMessages(client.phone) : [];
                  const lastMessage = messages[messages.length - 1];
                  const isSelected = selectedClient?.id === client.id;
                  
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`w-full rounded-lg p-3 text-left transition-colors hover-elevate ${
                        isSelected ? "bg-accent" : ""
                      }`}
                      data-testid={`button-conversation-${client.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {client.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{client.name}</p>
                            {client.clientType === "trade" && (
                              <Badge variant="outline" className="text-xs shrink-0">Trade</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {client.phone}
                          </p>
                          {lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {lastMessage.message.slice(0, 40)}...
                            </p>
                          )}
                        </div>
                        {lastMessage && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                            </span>
                            {getStatusIcon(lastMessage.status)}
                          </div>
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
        {selectedClient ? (
          <>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {selectedClient.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedClient.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" />
                      {selectedClient.phone}
                      {selectedClient.clientType === "trade" && (
                        <Badge variant="outline" className="text-xs">Trade Client</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) => {
                      if (value === "install-reminder") {
                        toast({
                          title: "Quick Message",
                          description: "Select a job to send install reminder",
                        });
                      } else if (value === "quote-ready") {
                        toast({
                          title: "Quick Message",
                          description: "Select a quote to send notification",
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-40" data-testid="select-quick-message">
                      <SelectValue placeholder="Quick message" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="install-reminder">Install Reminder</SelectItem>
                      <SelectItem value="quote-ready">Quote Ready</SelectItem>
                      <SelectItem value="payment-confirm">Payment Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                        >
                          <div className="max-w-[70%] space-y-1">
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
              Choose a client from the list to view their message history
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
