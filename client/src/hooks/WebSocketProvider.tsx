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
      console.log('Attempting to connect to WebSocket at', wsUrl);
      
      // Create a new socket with extended timeout
      const newSocket = new WebSocket(wsUrl);
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (newSocket.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout, closing socket');
          newSocket.close();
        }
      }, 10000); // 10 second timeout
      
      // Connection opened
      newSocket.addEventListener('open', () => {
        console.log('WebSocket connection established successfully');
        clearTimeout(connectionTimeout);
        setConnected(true);
        setRetryCount(0);
        
        // Send an initial message to verify the connection
        try {
          newSocket.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Error sending initial ping:', e);
        }
      });
      
      // Listen for messages
      newSocket.addEventListener('message', (event) => {
        // Handle incoming messages
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data.type);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      });
      
      // Handle errors - log them but don't immediately close
      newSocket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
      });
      
      // Connection closed
      newSocket.addEventListener('close', (event) => {
        console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'No reason provided'})`);
        clearTimeout(connectionTimeout);
        setConnected(false);
        
        // Auto-reconnect with exponential backoff if under max retries
        if (retryCount < maxRetries) {
          const delay = reconnectDelay * Math.pow(1.5, retryCount);
          console.log(`Attempting to reconnect (${retryCount + 1}/${maxRetries}) in ${delay}ms...`);
          
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, delay);
        } else {
          console.log('Maximum retry attempts reached. Please try reconnecting manually.');
        }
      });
      
      setSocket(newSocket);
      
      // Clean up on unmount
      return () => {
        clearTimeout(connectionTimeout);
        if (newSocket && newSocket.readyState === WebSocket.OPEN) {
          newSocket.close(1000, 'Component unmounted');
        }
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
  }, [retryCount, reconnectDelay, maxRetries]);

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