import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from '../storage';

interface ActiveConnection {
  ws: WebSocket;
  siteId: number;
  deviceId?: number;
  lastActivity: Date;
}

// Store active connections
const activeConnections: ActiveConnection[] = [];

// Connection cleanup interval (in milliseconds)
const CLEANUP_INTERVAL = 60000; // 1 minute

// Connection heartbeat interval (in milliseconds)
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Initialize WebSocket server
export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Set up WebSocket server
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Set initial connection data
    const connection: ActiveConnection = {
      ws,
      siteId: 0, // Will be updated when client sends subscription message
      lastActivity: new Date()
    };
    
    // Add to active connections
    activeConnections.push(connection);
    
    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, HEARTBEAT_INTERVAL);
    
    // Handle messages from clients
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        connection.lastActivity = new Date();
        
        switch (data.type) {
          case 'subscribe':
            handleSubscription(connection, data);
            break;
            
          case 'unsubscribe':
            handleUnsubscription(connection, data);
            break;
            
          case 'pong':
            // Update last activity timestamp on heartbeat response
            break;
            
          default:
            console.log(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Clear heartbeat interval
      clearInterval(heartbeatInterval);
      
      // Remove from active connections
      const index = activeConnections.findIndex(conn => conn.ws === ws);
      if (index !== -1) {
        activeConnections.splice(index, 1);
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Set up connection cleanup interval
  setInterval(cleanupConnections, CLEANUP_INTERVAL);
  
  return wss;
}

// Handle subscription requests
function handleSubscription(connection: ActiveConnection, data: any) {
  if (data.siteId) {
    connection.siteId = data.siteId;
    console.log(`Client subscribed to site ${data.siteId}`);
    
    // Send confirmation
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({ 
        type: 'subscribed', 
        siteId: data.siteId 
      }));
    }
  }
  
  if (data.deviceId) {
    connection.deviceId = data.deviceId;
    console.log(`Client subscribed to device ${data.deviceId}`);
    
    // Send confirmation
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({ 
        type: 'subscribed', 
        deviceId: data.deviceId 
      }));
    }
  }
}

// Handle unsubscription requests
function handleUnsubscription(connection: ActiveConnection, data: any) {
  if (data.siteId && connection.siteId === data.siteId) {
    connection.siteId = 0;
    console.log(`Client unsubscribed from site ${data.siteId}`);
    
    // Send confirmation
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({ 
        type: 'unsubscribed', 
        siteId: data.siteId 
      }));
    }
  }
  
  if (data.deviceId && connection.deviceId === data.deviceId) {
    delete connection.deviceId;
    console.log(`Client unsubscribed from device ${data.deviceId}`);
    
    // Send confirmation
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({ 
        type: 'unsubscribed', 
        deviceId: data.deviceId 
      }));
    }
  }
}

// Clean up stale connections
function cleanupConnections() {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - (CLEANUP_INTERVAL * 2));
  
  for (let i = activeConnections.length - 1; i >= 0; i--) {
    const connection = activeConnections[i];
    
    // Remove stale connections
    if (connection.lastActivity < staleThreshold) {
      console.log('Removing stale WebSocket connection');
      
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
      
      activeConnections.splice(i, 1);
    }
  }
}

// Broadcast energy reading to all clients subscribed to a site
export function broadcastEnergyReading(siteId: number, reading: any) {
  for (const connection of activeConnections) {
    if (
      connection.siteId === siteId && 
      connection.ws.readyState === WebSocket.OPEN
    ) {
      connection.ws.send(JSON.stringify({
        type: 'energyReading',
        data: reading
      }));
    }
  }
}

// Broadcast device reading to all clients subscribed to a device
export function broadcastDeviceReading(deviceId: number, reading: any) {
  for (const connection of activeConnections) {
    if (
      connection.deviceId === deviceId && 
      connection.ws.readyState === WebSocket.OPEN
    ) {
      connection.ws.send(JSON.stringify({
        type: 'deviceReading',
        data: reading
      }));
    }
  }
}

// Broadcast optimization recommendation to all clients subscribed to a site
export function broadcastOptimizationRecommendation(siteId: number, recommendation: any) {
  for (const connection of activeConnections) {
    if (
      connection.siteId === siteId && 
      connection.ws.readyState === WebSocket.OPEN
    ) {
      connection.ws.send(JSON.stringify({
        type: 'optimizationRecommendation',
        data: recommendation
      }));
    }
  }
}

// Send message to a specific client
export function sendMessageToClient(ws: WebSocket, message: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
