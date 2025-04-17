import React, { createContext, useContext, useEffect, useState } from 'react';
import { DeviceReading, CommandResult, WebSocketMessage } from './useDeviceWebSocket';
import { useToast } from './use-toast';

// WebSocket connection states
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// WebSocket context type
interface WebSocketContextType {
  connectionState: ConnectionState;
  connectionId: string | null;
  lastMessage: WebSocketMessage | null;
  lastReading: DeviceReading | null;
  lastCommandResult: CommandResult | null;
  sendMessage: (message: Record<string, any>) => boolean;
  connect: () => void;
  disconnect: () => void;
}

// Create context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  connectionState: 'disconnected',
  connectionId: null,
  lastMessage: null,
  lastReading: null,
  lastCommandResult: null,
  sendMessage: () => false,
  connect: () => {},
  disconnect: () => {},
});

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastReading, setLastReading] = useState<DeviceReading | null>(null);
  const [lastCommandResult, setLastCommandResult] = useState<CommandResult | null>(null);
  const { toast } = useToast();

  // Connect to WebSocket
  const connect = () => {
    if (socket && socket.readyState !== WebSocket.CLOSED) return;

    try {
      setConnectionState('connecting');
      
      // Determine the WebSocket URL (using secure protocol if site uses HTTPS)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      const newSocket = new WebSocket(wsUrl);
      setSocket(newSocket);
      
      // Set up event handlers
      newSocket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
      };
      
      newSocket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        setConnectionState('disconnected');
        setConnectionId(null);
        setSocket(null);
      };
      
      newSocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionState('error');
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to the real-time data service',
          variant: 'destructive',
        });
      };
      
      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'connected':
              if (message.connectionId) {
                setConnectionId(message.connectionId);
              }
              break;
              
            case 'deviceReading':
              const reading = message as DeviceReading;
              setLastReading(reading);
              break;
              
            case 'deviceCommand':
              if (message.deviceId && message.command) {
                const result: CommandResult = {
                  deviceId: message.deviceId,
                  command: message.command,
                  status: message.result?.success ? 'success' : 'failure',
                  message: message.result?.message,
                  result: message.result,
                  timestamp: message.timestamp
                };
                setLastCommandResult(result);
              }
              break;
              
            case 'error':
              toast({
                title: 'WebSocket Error',
                description: message.message || 'Unknown error',
                variant: 'destructive',
              });
              break;
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      setConnectionState('error');
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to the real-time data service',
        variant: 'destructive',
      });
    }
  };
  
  // Disconnect from WebSocket
  const disconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      setConnectionState('disconnected');
    }
  };
  
  // Send a message through the WebSocket
  const sendMessage = (message: Record<string, any>): boolean => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
      return true;
    }
    return false;
  };
  
  // Connect on initial render
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const contextValue: WebSocketContextType = {
    connectionState,
    connectionId,
    lastMessage,
    lastReading,
    lastCommandResult,
    sendMessage,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook for using WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}