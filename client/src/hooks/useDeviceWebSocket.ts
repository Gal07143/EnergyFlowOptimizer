import { useState, useEffect, useCallback, useRef } from 'react';

export interface DeviceReading {
  deviceId: number;
  timestamp: string;
  data: {
    power?: number;
    energy?: number;
    stateOfCharge?: number;
    voltage?: number;
    current?: number;
    frequency?: number;
    temperature?: number;
    [key: string]: any;
  };
  type: string;
}

export interface CommandResult {
  deviceId: number;
  command: string;
  status: 'success' | 'failure' | 'pending';
  message?: string;
  result?: any;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  deviceId?: number;
  siteId?: number;
  timestamp: string;
  data?: any;
  command?: string;
  result?: any;
  connectionId?: string;
  message?: string;
}

interface UseDeviceWebSocketOptions {
  deviceId?: number;
  siteId?: number;
  onDeviceReading?: (reading: DeviceReading) => void;
  onCommandResult?: (result: CommandResult) => void;
  onConnect?: (connectionId: string) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onError?: (error: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

/**
 * Hook for interacting with real-time device data via WebSockets
 */
export function useDeviceWebSocket({
  deviceId,
  siteId,
  onDeviceReading,
  onCommandResult,
  onConnect,
  onDisconnect,
  onReconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 5000,
}: UseDeviceWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Use useRef to keep a consistent reference to the WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectCountRef = useRef(0);
  
  // Also use refs for the latest callback values to avoid stale closures
  const onDeviceReadingRef = useRef(onDeviceReading);
  const onCommandResultRef = useRef(onCommandResult);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onReconnectRef = useRef(onReconnect);
  const onErrorRef = useRef(onError);
  
  // Update refs when the callback props change
  useEffect(() => {
    onDeviceReadingRef.current = onDeviceReading;
    onCommandResultRef.current = onCommandResult;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onReconnectRef.current = onReconnect;
    onErrorRef.current = onError;
  }, [
    onDeviceReading, 
    onCommandResult, 
    onConnect, 
    onDisconnect, 
    onReconnect, 
    onError
  ]);

  // Connect to the WebSocket
  const connect = useCallback(() => {
    // Close any existing connection
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }
    
    try {
      // Determine the WebSocket URL (using secure protocol if site uses HTTPS)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
        
        // Subscribe to device/site data
        if (deviceId) {
          sendMessage({
            type: 'subscribe',
            deviceId
          });
        }
        
        if (siteId) {
          sendMessage({
            type: 'subscribe',
            siteId
          });
        }
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        
        if (onDisconnectRef.current) {
          onDisconnectRef.current();
        }
        
        // Auto-reconnect if enabled and not a clean close
        if (autoReconnect && event.code !== 1000) {
          scheduleReconnect();
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
        
        if (onErrorRef.current) {
          onErrorRef.current(event);
        }
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          
          switch (message.type) {
            case 'connected':
              if (message.connectionId) {
                setConnectionId(message.connectionId);
                
                if (onConnectRef.current) {
                  onConnectRef.current(message.connectionId);
                }
              }
              break;
              
            case 'deviceReading':
              if (message.data && onDeviceReadingRef.current) {
                const reading = message as DeviceReading;
                
                // Keep the last 50 readings in state
                setReadings(prev => {
                  const newReadings = [...prev, reading];
                  if (newReadings.length > 50) {
                    return newReadings.slice(newReadings.length - 50);
                  }
                  return newReadings;
                });
                
                onDeviceReadingRef.current(reading);
              }
              break;
              
            case 'deviceCommand':
              if (onCommandResultRef.current && message.deviceId && message.command) {
                const result: CommandResult = {
                  deviceId: message.deviceId,
                  command: message.command,
                  status: message.result?.success ? 'success' : 'failure',
                  message: message.result?.message,
                  result: message.result,
                  timestamp: message.timestamp
                };
                
                onCommandResultRef.current(result);
              }
              break;
              
            case 'error':
              console.error('WebSocket error message:', message.message);
              setError(new Error(message.message || 'Unknown WebSocket error'));
              
              if (onErrorRef.current) {
                onErrorRef.current(new Error(message.message || 'Unknown WebSocket error'));
              }
              break;
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err, event.data);
          
          if (onErrorRef.current) {
            onErrorRef.current(err);
          }
        }
      };
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
      
      if (autoReconnect) {
        scheduleReconnect();
      }
    }
  }, [deviceId, siteId, autoReconnect]);
  
  // Schedule a reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }
    
    // Exponential backoff with max delay of 30 seconds
    const backoffDelay = Math.min(
      reconnectInterval * Math.pow(1.5, reconnectCountRef.current),
      30000
    );
    
    console.log(`Reconnecting in ${backoffDelay}ms (attempt ${reconnectCountRef.current + 1})`);
    
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectCountRef.current += 1;
      
      if (onReconnectRef.current) {
        onReconnectRef.current();
      }
      
      connect();
    }, backoffDelay);
  }, [connect, reconnectInterval]);
  
  // Send a message through the WebSocket
  const sendMessage = useCallback((message: Record<string, any>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
      return true;
    }
    return false;
  }, []);
  
  // Send a control command to a device
  const sendCommand = useCallback((deviceId: number, command: string, parameters?: Record<string, any>) => {
    return sendMessage({
      type: 'command',
      deviceId,
      command,
      parameters
    });
  }, [sendMessage]);
  
  // Subscribe to a device or site
  const subscribe = useCallback((target: { deviceId?: number; siteId?: number }) => {
    return sendMessage({
      type: 'subscribe',
      ...target
    });
  }, [sendMessage]);
  
  // Unsubscribe from a device or site
  const unsubscribe = useCallback((target: { deviceId?: number; siteId?: number }) => {
    return sendMessage({
      type: 'unsubscribe',
      ...target
    });
  }, [sendMessage]);
  
  // Connect on initial render
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);
  
  // Update subscriptions when deviceId or siteId changes
  useEffect(() => {
    if (isConnected) {
      if (deviceId) {
        subscribe({ deviceId });
      }
      
      if (siteId) {
        subscribe({ siteId });
      }
    }
  }, [isConnected, deviceId, siteId, subscribe]);
  
  return {
    isConnected,
    connectionId,
    lastMessage,
    readings,
    error,
    sendMessage,
    sendCommand,
    subscribe,
    unsubscribe,
    connect
  };
}

export default useDeviceWebSocket;