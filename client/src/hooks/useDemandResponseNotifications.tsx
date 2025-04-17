import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocketContext } from '@/hooks/WebSocketProvider';
import { DemandResponseEvent } from './useDemandResponse';
import { useToast } from '@/hooks/use-toast';
import { useSiteContext } from '@/hooks/use-site-context';

// Define the notification types
export interface DemandResponseNotification {
  id: string;
  type: 'event_scheduled' | 'event_upcoming' | 'event_started' | 'event_ended' | 'event_cancelled';
  title: string;
  message: string;
  event: DemandResponseEvent;
  timestamp: string;
  read: boolean;
}

interface DemandResponseNotificationContextValue {
  notifications: DemandResponseNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const DemandResponseNotificationContext = createContext<DemandResponseNotificationContextValue | undefined>(undefined);

export function DemandResponseNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<DemandResponseNotification[]>([]);
  const { ws } = useWebSocketContext();
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Functions to handle notifications
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Listen for WebSocket messages related to demand response
  useEffect(() => {
    if (!ws || !currentSiteId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Only process messages related to demand response events for the current site
        if (data.type?.startsWith('demand_response_') && data.siteId === currentSiteId) {
          const newNotification: DemandResponseNotification = {
            id: `dr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: data.type.replace('demand_response_', '') as any,
            title: data.title || 'Demand Response Update',
            message: data.message || '',
            event: data.event,
            timestamp: new Date().toISOString(),
            read: false
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          
          // Also show a toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'event_cancelled' ? 'destructive' : 'default',
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, currentSiteId, toast]);

  return (
    <DemandResponseNotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead, 
        clearNotifications 
      }}
    >
      {children}
    </DemandResponseNotificationContext.Provider>
  );
}

export function useDemandResponseNotifications() {
  const context = useContext(DemandResponseNotificationContext);
  
  if (context === undefined) {
    throw new Error('useDemandResponseNotifications must be used within a DemandResponseNotificationProvider');
  }
  
  return context;
}