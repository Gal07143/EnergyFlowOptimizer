import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface WebSocketContextType {
  socket: WebSocket | null;
  connected: boolean;
  reconnect: () => void;
  send: (data: any) => void;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  const reconnectDelay = 2000; // 2 seconds

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Connecting to WebSocket at', wsUrl);
      
      const newSocket = new WebSocket(wsUrl);
      
      // Connection opened
      newSocket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        setConnected(true);
        setRetryCount(0);
      });
      
      // Listen for messages
      newSocket.addEventListener('message', (event) => {
        // Handle message events
      });
      
      // Handle errors
      newSocket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
      });
      
      // Connection closed
      newSocket.addEventListener('close', (event) => {
        console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
        setConnected(false);
        
        // Auto-reconnect if not a normal closure and under max retries
        if (event.code !== 1000 && retryCount < maxRetries) {
          console.log(`Attempting to reconnect (${retryCount + 1}/${maxRetries})...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, reconnectDelay);
        }
      });
      
      setSocket(newSocket);
      
      // Clean up on unmount
      return () => {
        newSocket.close();
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
  }, [retryCount]);

  // Initial connection
  useEffect(() => {
    connect();
    
    // Add heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socket && connected && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(heartbeatInterval);
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  // Force reconnect
  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
    setRetryCount(0);
    connect();
  }, [socket, connect]);

  // Send data through WebSocket
  const send = useCallback((data: any) => {
    if (socket && connected && socket.readyState === WebSocket.OPEN) {
      socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  }, [socket, connected]);

  const value = {
    socket,
    connected,
    reconnect,
    send
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}