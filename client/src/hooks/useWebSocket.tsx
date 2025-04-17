import { useState, useEffect, useRef, useCallback } from 'react';
import { webSocketManager } from '@/lib/websocket';

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

/**
 * Hook for using WebSocket connections in React components
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(webSocketManager.isConnected());
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const eventHandlers = useRef(new Map<string, Set<WebSocketMessageHandler>>());
  
  // Track the site subscription
  const [subscribedSiteId, setSubscribedSiteId] = useState<number | null>(null);
  
  // Track the device subscription
  const [subscribedDeviceId, setSubscribedDeviceId] = useState<number | null>(null);
  
  // Track the last received messages by type
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  
  // Register basic event handlers on mount
  useEffect(() => {
    const handleConnected = (data: { connectionId: string }) => {
      setIsConnected(true);
      setConnectionId(data.connectionId);
    };
    
    const handleDisconnected = () => {
      setIsConnected(false);
    };
    
    const handleMessage = (message: any) => {
      const messageType = message.type;
      
      // Update last message for this type
      if (messageType) {
        setLastMessages(prev => ({
          ...prev,
          [messageType]: message.data || message
        }));
      }
      
      // Call any registered handlers for this message type
      if (messageType && eventHandlers.current.has(messageType)) {
        const handlers = eventHandlers.current.get(messageType);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.data || message);
            } catch (error) {
              console.error(`Error in WebSocket handler for ${messageType}:`, error);
            }
          });
        }
      }
    };
    
    // Register handlers
    webSocketManager
      .on('connected', handleConnected)
      .on('disconnected', handleDisconnected)
      .on('message', handleMessage);
    
    // Initial connection state
    setIsConnected(webSocketManager.isConnected());
    
    // Cleanup on unmount
    return () => {
      webSocketManager
        .off('connected', handleConnected)
        .off('disconnected', handleDisconnected)
        .off('message', handleMessage);
    };
  }, []);
  
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
  
  // Register an event handler
  const registerHandler = useCallback((
    eventType: WebSocketEventType, 
    handler: WebSocketMessageHandler
  ) => {
    if (!eventHandlers.current.has(eventType)) {
      eventHandlers.current.set(eventType, new Set());
    }
    
    const handlers = eventHandlers.current.get(eventType);
    if (handlers) {
      handlers.add(handler);
    }
    
    // Return cleanup function
    return () => {
      const handlers = eventHandlers.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }, []);
  
  // Register event listener with useEffect cleanup
  const useEventListener = useCallback(<T = any>(
    eventType: WebSocketEventType, 
    handler: WebSocketMessageHandler<T>
  ) => {
    useEffect(() => {
      return registerHandler(eventType, handler as WebSocketMessageHandler);
    }, [eventType, handler]);
  }, [registerHandler]);
  
  // Get the last message of a specific type
  const getLastMessage = useCallback((eventType: WebSocketEventType) => {
    return lastMessages[eventType] || null;
  }, [lastMessages]);
  
  // Expose all the methods
  return {
    isConnected,
    connectionId,
    subscribeSite,
    unsubscribeSite,
    subscribeDevice,
    unsubscribeDevice,
    sendMessage,
    ping,
    registerHandler,
    useEventListener,
    getLastMessage,
    
    // Direct access to last message by event type
    lastMessages,
    
    // Current subscriptions
    subscribedSiteId,
    subscribedDeviceId
  };
}