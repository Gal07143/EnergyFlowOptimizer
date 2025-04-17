import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/WebSocketProvider';
import { useSiteContext } from '@/hooks/use-site-context';
import { DemandResponseEvent } from '@/hooks/useDemandResponse';

// Define notification types
export type NotificationType = 
  | 'event_scheduled' 
  | 'event_upcoming' 
  | 'event_started' 
  | 'event_ended' 
  | 'event_cancelled'
  | 'program_enrollment'
  | 'system';

export interface DemandResponseNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  event?: {
    id: number;
    name: string;
  };
  program?: {
    id: number;
    name: string;
  };
}

// Context type
type NotificationContextType = {
  notifications: DemandResponseNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<DemandResponseNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

// Provider component
export function DemandResponseNotificationProvider({ children }: { children: ReactNode }) {
  const { currentSite } = useSiteContext();
  const { socket, connected } = useWebSocket();
  const [notifications, setNotifications] = useState<DemandResponseNotification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle WebSocket events
  useEffect(() => {
    if (!socket || !connected || !currentSite?.id) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'demand_response_notification' && data.siteId === currentSite.id) {
          addNotification({
            type: data.notificationType,
            title: data.title,
            message: data.message,
            event: data.event,
            program: data.program
          });
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, connected, currentSite?.id]);

  // Add a notification
  const addNotification = (notification: Omit<DemandResponseNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: DemandResponseNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Custom hook for using the context
export function useDemandResponseNotifications() {
  const context = useContext(NotificationContext);
  
  if (context === null) {
    throw new Error('useDemandResponseNotifications must be used within a DemandResponseNotificationProvider');
  }
  
  return context;
}