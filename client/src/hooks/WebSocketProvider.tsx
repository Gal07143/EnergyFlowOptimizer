import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { webSocketManager } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';

// Define the event types
export type WebSocketEventType = 
  | 'message' 
  | 'connected' 
  | 'disconnected' 
  | 'error'
  | 'deviceReading'
  | 'energyReading'
  | 'optimizationRecommendation'
  | 'deviceCommand'
  | 'pong';

export type WebSocketMessageHandler<T = any> = (data: T) => void;

// Type definitions for the WebSocket context
interface WebSocketContextType {
  isConnected: boolean;
  connectionId: string | null;
  subscribedSiteId: number | null;
  subscribedDeviceId: number | null;
  lastMessages: Record<string, any>;
  subscribeSite: (siteId: number) => void;
  unsubscribeSite: () => void;
  subscribeDevice: (deviceId: number) => void;
  unsubscribeDevice: () => void;
  sendMessage: (message: any) => void;
  ping: () => void;
  registerHandler: (eventType: WebSocketEventType, handler: WebSocketMessageHandler) => () => void;
  getLastMessage: (eventType: WebSocketEventType) => any;
}

// Create a context for WebSocket
const WebSocketContext = createContext<WebSocketContextType | null>(null);

export interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export function WebSocketProvider({
  children,
  autoConnect = true
}: WebSocketProviderProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(webSocketManager.isConnected());
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [subscribedSiteId, setSubscribedSiteId] = useState<number | null>(null);
  const [subscribedDeviceId, setSubscribedDeviceId] = useState<number | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  
  // Toast for displaying connection status
  const { toast } = useToast();
  
  // Auto-connect if specified
  useEffect(() => {
    if (autoConnect && !webSocketManager.isConnected()) {
      webSocketManager.connect();
    }
    
    // Handle connection status changes
    const handleConnect = (data: { connectionId: string }) => {
      setIsConnected(true);
      setConnectionId(data.connectionId);
      
      toast({
        title: "WebSocket Connected",
        description: "Real-time connection established",
        variant: "default",
      });
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
      
      toast({
        title: "WebSocket Disconnected",
        description: "Real-time connection lost. Reconnecting...",
        variant: "destructive",
      });
    };
    
    // Handle incoming messages
    const handleMessage = (message: any) => {
      const messageType = message.type;
      
      // Update last message for this type
      if (messageType) {
        setLastMessages(prev => ({
          ...prev,
          [messageType]: message.data || message
        }));
      }
    };
    
    // Register handlers
    webSocketManager
      .on('connected', handleConnect)
      .on('disconnected', handleDisconnect)
      .on('message', handleMessage);
    
    // Set initial connection state
    setIsConnected(webSocketManager.isConnected());
    
    // Cleanup
    return () => {
      webSocketManager
        .off('connected', handleConnect)
        .off('disconnected', handleDisconnect)
        .off('message', handleMessage);
    };
  }, [autoConnect, toast]);
  
  // Subscribe to site updates
  const subscribeSite = useCallback((siteId: number) => {
    // Unsubscribe from previous site if different
    if (subscribedSiteId !== null && subscribedSiteId !== siteId) {
      webSocketManager.unsubscribeSite(subscribedSiteId);
    }
    
    // Subscribe to new site
    webSocketManager.subscribeSite(siteId);
    setSubscribedSiteId(siteId);
  }, [subscribedSiteId]);
  
  // Unsubscribe from site updates
  const unsubscribeSite = useCallback(() => {
    if (subscribedSiteId !== null) {
      webSocketManager.unsubscribeSite(subscribedSiteId);
      setSubscribedSiteId(null);
    }
  }, [subscribedSiteId]);
  
  // Subscribe to device updates
  const subscribeDevice = useCallback((deviceId: number) => {
    // Unsubscribe from previous device if different
    if (subscribedDeviceId !== null && subscribedDeviceId !== deviceId) {
      webSocketManager.unsubscribeDevice(subscribedDeviceId);
    }
    
    // Subscribe to new device
    webSocketManager.subscribeDevice(deviceId);
    setSubscribedDeviceId(deviceId);
  }, [subscribedDeviceId]);
  
  // Unsubscribe from device updates
  const unsubscribeDevice = useCallback(() => {
    if (subscribedDeviceId !== null) {
      webSocketManager.unsubscribeDevice(subscribedDeviceId);
      setSubscribedDeviceId(null);
    }
  }, [subscribedDeviceId]);
  
  // Send a message
  const sendMessage = useCallback((message: any) => {
    webSocketManager.send(message);
  }, []);
  
  // Send a ping
  const ping = useCallback(() => {
    webSocketManager.ping();
  }, []);
  
  // Register a handler
  const registerHandler = useCallback((
    eventType: WebSocketEventType, 
    handler: WebSocketMessageHandler
  ) => {
    webSocketManager.on(eventType as any, handler as any);
    return () => {
      webSocketManager.off(eventType as any, handler as any);
    };
  }, []);
  
  // Get the last message of a specific type
  const getLastMessage = useCallback((eventType: WebSocketEventType) => {
    return lastMessages[eventType] || null;
  }, [lastMessages]);
  
  // Context value
  const contextValue = {
    isConnected,
    connectionId,
    subscribedSiteId,
    subscribedDeviceId,
    lastMessages,
    subscribeSite,
    unsubscribeSite,
    subscribeDevice,
    unsubscribeDevice,
    sendMessage,
    ping,
    registerHandler,
    getLastMessage
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use the WebSocket context
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}