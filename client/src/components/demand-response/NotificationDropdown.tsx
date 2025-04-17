import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Zap,
  CheckCircle
} from 'lucide-react';
import { 
  useDemandResponseNotifications, 
  DemandResponseNotification 
} from '@/hooks/useDemandResponseNotifications';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useDemandResponseNotifications();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleNotificationClick = (notification: DemandResponseNotification) => {
    markAsRead(notification.id);
    
    // Navigate to the event details based on the notification
    if (notification.event?.id) {
      setLocation(`/demand-response/events/${notification.event.id}`);
    } else {
      setLocation('/demand-response');
    }
    
    setOpen(false);
  };

  // Function to get icon for notification type
  const getNotificationIcon = (type: DemandResponseNotification['type']) => {
    switch (type) {
      case 'event_scheduled':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'event_upcoming':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'event_started':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'event_ended':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'event_cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Demand Response Notifications</h3>
          <div className="flex space-x-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={clearNotifications}
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No demand response notifications
            </div>
          ) : (
            <div className="py-1">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={cn(
                    "p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 flex items-start gap-3",
                    !notification.read && "bg-muted/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", !notification.read && "font-semibold")}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div 
                      className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"
                      aria-label="Unread notification"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}