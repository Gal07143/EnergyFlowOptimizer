import { useEffect, useState, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean; // Whether to connect automatically on mount
  autoReconnect?: boolean; // Whether to reconnect automatically on disconnect
}

// WebSocket connection states corresponding to the WebSocket.readyState values
const WS_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

/**
 * Custom hook for WebSocket communication with improved reliability
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  
  // Default options with fallbacks
  const {
    onOpen, 
    onClose, 
    onMessage, 
    onError,
    reconnectInterval = 2000,
    maxReconnectAttempts = 30,  // Increase max attempts for better stability
    autoConnect = true,
    autoReconnect = true
  } = options;
  
  /**
   * Establish a WebSocket connection
   */
  const connect = useCallback(() => {
    // Don't attempt to connect if already connecting or connected
    if (
      socketRef.current && 
      (socketRef.current.readyState === WS_STATES.CONNECTING || 
       socketRef.current.readyState === WS_STATES.OPEN)
    ) {
      return;
    }
    
    // Cleanup any existing connection
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (error) {
        console.warn('Error closing existing socket:', error);
      }
      socketRef.current = null;
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current !== null) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Update connection attempts counter
    setConnectionAttempts(prev => prev + 1);
    
    // Determine the correct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      // Create a new WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Setup heartbeat to keep connection alive
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (socket.readyState === WS_STATES.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // 30 second ping interval
        
        if (onOpen) onOpen();
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'unknown reason'})`);
        setIsConnected(false);
        
        // Clear heartbeat interval on disconnect
        if (heartbeatIntervalRef.current !== null) {
          window.clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        if (onClose) onClose();
        
        // Attempt to reconnect if auto reconnect is enabled
        if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          
          const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts.current - 1), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error(`Max reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`);
        }
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip heartbeat responses to prevent unnecessary rendering
          if (data.type === 'heartbeat' || data.type === 'pong') {
            return;
          }
          
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't set isConnected to false here, let onclose handle that
        if (onError) onError(error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      
      // If connection creation fails, try to reconnect
      if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [
    onOpen, 
    onClose, 
    onMessage, 
    onError, 
    reconnectInterval, 
    maxReconnectAttempts,
    autoReconnect
  ]);
  
  /**
   * Manually disconnect the WebSocket connection
   */
  const disconnect = useCallback(() => {
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current !== null) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close socket if it exists and is open
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WS_STATES.OPEN) {
          socketRef.current.close(1000, 'Closed by client');
        }
      } catch (error) {
        console.warn('Error closing WebSocket:', error);
      }
      socketRef.current = null;
    }
    
    setIsConnected(false);
  }, []);
  
  /**
   * Send a message through the WebSocket connection
   */
  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    if (!socketRef.current) {
      console.warn('Cannot send message: WebSocket not initialized');
      return false;
    }
    
    if (socketRef.current.readyState !== WS_STATES.OPEN) {
      console.warn(`Cannot send message: WebSocket not open (state: ${socketRef.current.readyState})`);
      return false;
    }
    
    try {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, []);
  
  /**
   * Subscribe to updates for a site and/or device
   */
  const subscribe = useCallback((siteId: number, deviceId?: number): boolean => {
    const message: WebSocketMessage = { type: 'subscribe', siteId };
    if (deviceId) message.deviceId = deviceId;
    return sendMessage(message);
  }, [sendMessage]);
  
  /**
   * Unsubscribe from updates for a site and/or device
   */
  const unsubscribe = useCallback((siteId: number, deviceId?: number): boolean => {
    const message: WebSocketMessage = { type: 'unsubscribe', siteId };
    if (deviceId) message.deviceId = deviceId;
    return sendMessage(message);
  }, [sendMessage]);
  
  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);
  
  return {
    isConnected,
    lastMessage,
    connectionAttempts,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };
}
