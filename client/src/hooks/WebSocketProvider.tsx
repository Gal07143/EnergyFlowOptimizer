import React, { createContext, useContext, useEffect, useState } from 'react';
import { DeviceReading, CommandResult, WebSocketMessage } from './useDeviceWebSocket';
import { useToast } from './use-toast';
import { webSocketManager } from '@/lib/websocket';

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
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastReading, setLastReading] = useState<DeviceReading | null>(null);
  const [lastCommandResult, setLastCommandResult] = useState<CommandResult | null>(null);
  const { toast } = useToast();

  // Connect to WebSocket using the singleton manager
  const connect = () => {
    // Only try to connect if not already connected
    if (!webSocketManager.isConnected()) {
      setConnectionState('connecting');
      webSocketManager.connect();
    }
  };
  
  // Disconnect from WebSocket
  const disconnect = () => {
    webSocketManager.disconnect();
    setConnectionState('disconnected');
    setConnectionId(null);
  };
  
  // Send a message through the WebSocket
  const sendMessage = (message: Record<string, any>): boolean => {
    if (webSocketManager.isConnected()) {
      webSocketManager.send({
        ...message,
        timestamp: Date.now()
      });
      return true;
    } else {
      console.warn('Cannot send message: WebSocket not initialized');
      return false;
    }
  };
  
  // Set up event listeners and connect on initial render
  useEffect(() => {
    // Event handlers
    const handleConnected = (data: { connectionId: string }) => {
      setConnectionState('connected');
      setConnectionId(data.connectionId);
    };
    
    const handleDisconnected = () => {
      setConnectionState('disconnected');
      setConnectionId(null);
    };
    
    const handleError = (error: Error) => {
      setConnectionState('error');
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect to the real-time data service',
        variant: 'destructive',
      });
    };
    
    const handleMessage = (message: WebSocketMessage) => {
      setLastMessage(message);
    };
    
    const handleDeviceReading = (reading: any) => {
      setLastReading(reading as DeviceReading);
    };
    
    const handleDeviceCommand = (command: { deviceId: number; command: string; result: any }) => {
      const result: CommandResult = {
        deviceId: command.deviceId,
        command: command.command,
        status: command.result?.success ? 'success' : 'failure',
        message: command.result?.message,
        result: command.result,
        timestamp: Date.now()
      };
      setLastCommandResult(result);
    };
    
    // Set up listeners
    webSocketManager
      .on('connected', handleConnected)
      .on('disconnected', handleDisconnected)
      .on('error', handleError)
      .on('message', handleMessage)
      .on('deviceReading', handleDeviceReading)
      .on('deviceCommand', handleDeviceCommand);
    
    // Initialize connection - the manager will handle reconnection
    connect();
    
    // Clean up on unmount
    return () => {
      webSocketManager
        .off('connected', handleConnected)
        .off('disconnected', handleDisconnected)
        .off('error', handleError)
        .off('message', handleMessage)
        .off('deviceReading', handleDeviceReading)
        .off('deviceCommand', handleDeviceCommand);
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