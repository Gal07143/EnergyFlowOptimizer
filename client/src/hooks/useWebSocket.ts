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
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  const reconnectInterval = options.reconnectInterval || 5000;
  const maxReconnectAttempts = options.maxReconnectAttempts || 10;
  
  const connect = useCallback(() => {
    // Close any existing connections
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    
    // Determine the correct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Create a new WebSocket connection
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      if (options.onOpen) options.onOpen();
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      if (options.onClose) options.onClose();
      
      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          connect();
        }, reconnectInterval);
      } else {
        console.error('Max reconnect attempts reached');
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        if (options.onMessage) options.onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (options.onError) options.onError(error);
    };
  }, [options, reconnectInterval, maxReconnectAttempts]);
  
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  const subscribe = useCallback((siteId: number, deviceId?: number) => {
    const message: WebSocketMessage = { type: 'subscribe', siteId };
    if (deviceId) message.deviceId = deviceId;
    return sendMessage(message);
  }, [sendMessage]);
  
  const unsubscribe = useCallback((siteId: number, deviceId?: number) => {
    const message: WebSocketMessage = { type: 'unsubscribe', siteId };
    if (deviceId) message.deviceId = deviceId;
    return sendMessage(message);
  }, [sendMessage]);
  
  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };
}
