import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function NewMessageBanner() {
  const [location, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/sms/unread-count'],
    refetchInterval: 15000,
  });

  const unreadCount = unreadData?.count || 0;

  useEffect(() => {
    if (unreadCount > lastCount && lastCount > 0) {
      setDismissed(false);
    }
    setLastCount(unreadCount);
  }, [unreadCount, lastCount]);

  if (location === '/messages' || dismissed || unreadCount === 0) {
    return null;
  }

  return (
    <div 
      className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between gap-4 animate-in slide-in-from-top-2"
      data-testid="banner-new-messages"
    >
      <div className="flex items-center gap-3">
        <MessageSquare className="h-4 w-4" />
        <span className="text-sm font-medium">
          You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''} requiring attention
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-transparent border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
          onClick={() => navigate('/messages')}
          data-testid="button-view-messages"
        >
          View Messages
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 text-destructive-foreground hover:bg-destructive-foreground/10"
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
