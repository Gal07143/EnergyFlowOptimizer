import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from '../storage';

interface ActiveConnection {
  ws: WebSocket;
  id: string; // Unique connection ID
  siteId: number;
  deviceId?: number;
  lastActivity: Date;
  isAlive: boolean; // For ping/pong health check
}

// Store active connections
const activeConnections: ActiveConnection[] = [];

// Connection cleanup interval (in milliseconds)
const CLEANUP_INTERVAL = 60000; // 1 minute

// Connection ping interval (in milliseconds)
const PING_INTERVAL = 30000; // 30 seconds

// Initialize WebSocket server
export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    // Increase the timeout to prevent premature connection closures
    clientTracking: true,
    // WebSocket server configuration
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below options specified as default values
      concurrencyLimit: 10,
      threshold: 1024 // Size in bytes below which messages should not be compressed
    }
  });

  // Handle WebSocket server errors
  wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
  });

  // Handle close events on the WebSocket server
  wss.on('close', () => {
    console.log('WebSocket Server Closed');
    
    // Clean up all connections when the server closes
    for (const connection of activeConnections) {
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.terminate();
        }
      } catch (error) {
        console.error('Error terminating connection:', error);
      }
    }
    
    // Clear the connections array
    activeConnections.length = 0;
  });

  // Set up connection ping interval
  const pingInterval = setInterval(() => {
    for (const connection of activeConnections) {
      // If connection didn't respond to the previous ping, terminate it
      if (connection.isAlive === false) {
        console.log('Terminating unresponsive connection');
        connection.ws.terminate();
        continue;
      }
      
      // Mark as inactive until it responds to the ping
      connection.isAlive = false;
      
      // Send ping
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      } catch (error) {
        console.error('Error sending ping:', error);
        connection.ws.terminate();
      }
    }
  }, PING_INTERVAL);

  // Clean up interval on process exit
  process.on('exit', () => {
    clearInterval(pingInterval);
  });

  // Set up WebSocket server connection handler
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected');
    
    // Generate a unique connection ID
    const connectionId = generateConnectionId();
    
    // Set initial connection data
    const connection: ActiveConnection = {
      ws,
      id: connectionId,
      siteId: 0, // Will be updated when client sends subscription message
      lastActivity: new Date(),
      isAlive: true
    };
    
    // Add to active connections
    activeConnections.push(connection);

    // Handle pong response (keep-alive)
    ws.on('pong', () => {
      // Update the connection's alive status
      const conn = activeConnections.find(c => c.id === connectionId);
      if (conn) {
        conn.isAlive = true;
        conn.lastActivity = new Date();
      }
    });
    
    // Handle messages from clients
    ws.on('message', async (message: Buffer | string) => {
      try {
        // Update the last activity timestamp
        connection.lastActivity = new Date();
        connection.isAlive = true;
        
        // Parse the message
        const data = JSON.parse(message.toString());
        
        // Process different message types
        switch (data.type) {
          case 'subscribe':
            handleSubscription(connection, data);
            break;
            
          case 'unsubscribe':
            handleUnsubscription(connection, data);
            break;
            
          case 'ping':
            // Send a pong response
            sendMessageToClient(ws, { type: 'pong', timestamp: Date.now() });
            break;
            
          default:
            console.log(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid message format' 
            }));
          }
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected (code: ${code}, reason: ${reason.toString() || 'unknown'})`);
      
      // Remove from active connections
      removeConnection(connectionId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
      
      // Terminate the connection on error
      try {
        ws.terminate();
      } catch (terminateError) {
        console.error('Error terminating connection:', terminateError);
      }
      
      // Remove from active connections
      removeConnection(connectionId);
    });

    // Send an initialization message
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'connected',
          timestamp: Date.now(),
          connectionId
        }));
      }
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  });
  
  // Set up connection cleanup interval
  const cleanupInterval = setInterval(cleanupConnections, CLEANUP_INTERVAL);
  
  // Clean up interval on process exit
  process.on('exit', () => {
    clearInterval(cleanupInterval);
  });
  
  return wss;
}

// Remove a connection by ID
function removeConnection(connectionId: string) {
  const index = activeConnections.findIndex(conn => conn.id === connectionId);
  if (index !== -1) {
    activeConnections.splice(index, 1);
  }
}

// Generate a unique connection ID
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// Handle subscription requests
function handleSubscription(connection: ActiveConnection, data: any) {
  if (data.siteId) {
    connection.siteId = data.siteId;
    console.log(`Client subscribed to site ${data.siteId}`);
    
    // Send confirmation
    try {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ 
          type: 'subscribed', 
          siteId: data.siteId,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error sending subscription confirmation:', error);
    }
  }
  
  if (data.deviceId) {
    connection.deviceId = data.deviceId;
    console.log(`Client subscribed to device ${data.deviceId}`);
    
    // Send confirmation
    try {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ 
          type: 'subscribed', 
          deviceId: data.deviceId,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error sending subscription confirmation:', error);
    }
  }
}

// Handle unsubscription requests
function handleUnsubscription(connection: ActiveConnection, data: any) {
  if (data.siteId && connection.siteId === data.siteId) {
    connection.siteId = 0;
    console.log(`Client unsubscribed from site ${data.siteId}`);
    
    // Send confirmation
    try {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ 
          type: 'unsubscribed', 
          siteId: data.siteId,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error sending unsubscription confirmation:', error);
    }
  }
  
  if (data.deviceId && connection.deviceId === data.deviceId) {
    delete connection.deviceId;
    console.log(`Client unsubscribed from device ${data.deviceId}`);
    
    // Send confirmation
    try {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ 
          type: 'unsubscribed', 
          deviceId: data.deviceId,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error sending unsubscription confirmation:', error);
    }
  }
}

// Clean up stale connections
function cleanupConnections() {
  console.log(`Active WebSocket connections: ${activeConnections.length}`);
  
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - (CLEANUP_INTERVAL * 2));
  let cleanedCount = 0;
  
  for (let i = activeConnections.length - 1; i >= 0; i--) {
    const connection = activeConnections[i];
    
    // Check if the connection is stale
    if (connection.lastActivity < staleThreshold || !connection.isAlive) {
      console.log('Removing stale WebSocket connection');
      
      try {
        // Try to close the connection gracefully
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close(1000, 'Connection timeout');
        }
      } catch (error) {
        console.error('Error closing stale connection:', error);
        
        // Force terminate if close fails
        try {
          connection.ws.terminate();
        } catch (terminateError) {
          console.error('Error terminating connection:', terminateError);
        }
      }
      
      // Remove from array
      activeConnections.splice(i, 1);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} stale connections`);
  }
}

// Broadcast energy reading to all clients subscribed to a site
export function broadcastEnergyReading(siteId: number, reading: any) {
  const message = JSON.stringify({
    type: 'energyReading',
    data: reading,
    timestamp: Date.now()
  });
  
  let sentCount = 0;
  
  for (const connection of activeConnections) {
    if (connection.siteId === siteId && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(message);
        sentCount++;
      } catch (error) {
        console.error('Error broadcasting energy reading:', error);
      }
    }
  }
  
  if (sentCount > 0) {
    console.log(`Broadcast energy reading to ${sentCount} clients for site ${siteId}`);
  }
}

// Broadcast device reading to all clients subscribed to a device
export function broadcastDeviceReading(deviceId: number, reading: any) {
  const message = JSON.stringify({
    type: 'deviceReading',
    data: reading,
    timestamp: Date.now()
  });
  
  let sentCount = 0;
  
  for (const connection of activeConnections) {
    if (connection.deviceId === deviceId && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(message);
        sentCount++;
      } catch (error) {
        console.error('Error broadcasting device reading:', error);
      }
    }
  }
  
  if (sentCount > 0) {
    console.log(`Broadcast device reading to ${sentCount} clients for device ${deviceId}`);
  }
}

// Broadcast optimization recommendation to all clients subscribed to a site
export function broadcastOptimizationRecommendation(siteId: number, recommendation: any) {
  const message = JSON.stringify({
    type: 'optimizationRecommendation',
    data: recommendation,
    timestamp: Date.now()
  });
  
  let sentCount = 0;
  
  for (const connection of activeConnections) {
    if (connection.siteId === siteId && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(message);
        sentCount++;
      } catch (error) {
        console.error('Error broadcasting optimization recommendation:', error);
      }
    }
  }
  
  if (sentCount > 0) {
    console.log(`Broadcast optimization recommendation to ${sentCount} clients for site ${siteId}`);
  }
}

// Send message to a specific client
export function sendMessageToClient(ws: WebSocket, message: any) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  } catch (error) {
    console.error('Error sending message to client:', error);
  }
}

// Broadcast device command execution result to all subscribed clients
export function broadcastCommandExecution(deviceId: number, command: string, result: any) {
  const message = JSON.stringify({
    type: 'deviceCommand',
    deviceId,
    command,
    result,
    timestamp: Date.now()
  });
  
  let sentCount = 0;
  
  // Process each connection
  for (const connection of activeConnections) {
    // Process device subscription immediately
    if (connection.deviceId === deviceId && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(message);
        sentCount++;
      } catch (error) {
        console.error('Error broadcasting command execution:', error);
      }
      continue; // Skip site check if we already sent based on device
    }
    
    // Check site subscription async
    if (connection.siteId && connection.ws.readyState === WebSocket.OPEN) {
      // Use IIFE to handle the async check without blocking the loop
      (async (conn) => {
        try {
          const belongs = await deviceBelongsToSite(deviceId, conn.siteId);
          if (belongs) {
            try {
              conn.ws.send(message);
              sentCount++;
              console.log(`Sent command execution to client subscribed to site ${conn.siteId}`);
            } catch (sendError) {
              console.error('Error sending message after site check:', sendError);
            }
          }
        } catch (error) {
          console.error('Error checking site subscription:', error);
        }
      })(connection);
    }
  }
  
  if (sentCount > 0) {
    console.log(`Broadcast command execution to ${sentCount} clients for device ${deviceId}`);
  }
}

// Check if a device belongs to a site
async function deviceBelongsToSite(deviceId: number, siteId: number): Promise<boolean> {
  try {
    const device = await storage.getDevice(deviceId);
    if (!device) {
      return false;
    }
    return device.siteId === siteId;
  } catch (error) {
    console.error('Error checking if device belongs to site:', error);
    return false;
  }
}

// Simulate device reading in development mode
export function simulateDeviceReading(deviceId: number, deviceType: string) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  // Generate simulated reading based on device type
  const reading: any = {
    deviceId,
    timestamp: new Date().toISOString()
  };
  
  // Generate type-specific simulated data
  switch (deviceType) {
    case 'solar_pv':
      reading.power = Math.random() * 5000; // 0-5kW
      reading.energy = Math.random() * 20; // 0-20kWh daily
      reading.voltage = 230 + (Math.random() * 10 - 5); // ~230V
      reading.temperature = 25 + (Math.random() * 20 - 10); // 15-35°C
      reading.additionalData = {
        irradiance: Math.random() * 1000, // 0-1000 W/m²
        panelEfficiency: 0.18 + (Math.random() * 0.04 - 0.02) // ~18%
      };
      break;
      
    case 'battery_storage':
      reading.power = (Math.random() > 0.5 ? 1 : -1) * Math.random() * 3000; // -3kW to 3kW
      reading.energy = Math.random() * 10; // 0-10kWh
      reading.stateOfCharge = Math.random() * 100; // 0-100%
      reading.voltage = 48 + (Math.random() * 4 - 2); // ~48V
      reading.temperature = 20 + (Math.random() * 15); // 20-35°C
      reading.additionalData = {
        cycleCount: Math.floor(Math.random() * 500),
        healthStatus: "good"
      };
      break;
      
    case 'ev_charger':
      const isCharging = Math.random() > 0.3;
      reading.power = isCharging ? Math.random() * 11000 : 0; // 0-11kW when charging
      reading.energy = Math.random() * 30; // 0-30kWh session
      reading.voltage = 400 + (Math.random() * 20 - 10); // ~400V
      reading.additionalData = {
        isCharging,
        chargingMode: isCharging ? "normal" : "idle",
        connectedVehicle: isCharging ? "EV_ID_12345" : null
      };
      break;
      
    case 'smart_meter':
      const importing = Math.random() > 0.5;
      reading.power = (importing ? 1 : -1) * Math.random() * 5000; // -5kW to 5kW
      reading.energy = Math.random() * 50; // 0-50kWh daily
      reading.voltage = 230 + (Math.random() * 10 - 5); // ~230V
      reading.frequency = 50 + (Math.random() * 0.2 - 0.1); // ~50Hz
      reading.additionalData = {
        importEnergy: Math.random() * 30,
        exportEnergy: Math.random() * 20,
        powerFactor: 0.95 + (Math.random() * 0.1 - 0.05)
      };
      break;
      
    case 'heat_pump':
      reading.power = Math.random() * 3000; // 0-3kW
      reading.energy = Math.random() * 15; // 0-15kWh daily
      reading.temperature = 35 + (Math.random() * 10); // 35-45°C output temp
      reading.additionalData = {
        mode: Math.random() > 0.7 ? "cooling" : "heating",
        targetTemp: 21 + (Math.random() * 4 - 2), // 19-23°C
        ambientTemp: 18 + (Math.random() * 10 - 5), // 13-23°C
        cop: 3 + Math.random() * 2 // COP between 3-5
      };
      break;
      
    default:
      reading.power = Math.random() * 1000; // Generic reading
      reading.status = "unknown";
  }
  
  // Broadcast the simulated reading
  broadcastDeviceReading(deviceId, reading);
  
  // Log the simulation
  console.log(`Development mode: Simulated ${deviceType} reading for device ${deviceId}`);
  
  return reading;
}
