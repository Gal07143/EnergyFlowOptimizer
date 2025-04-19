/**
 * WebSocket Service for Energy Management System
 * 
 * This module provides a standardized WebSocket service for the EMS,
 * handling connections, events, and message processing.
 */

import { Server } from 'http';
import { WebSocketServer, WebSocket, MessageEvent } from 'ws';
import { BaseService } from './baseService';
import { logger } from './logger';

/**
 * WebSocket connection with additional data
 */
export interface EnhancedWebSocket extends WebSocket {
  id: string;
  isAlive: boolean;
  userId?: number;
  siteId?: number;
  deviceId?: number;
  subscriptions: Set<string>;
  lastActivity: number;
}

/**
 * WebSocket message handler
 */
export interface WebSocketMessageHandler {
  (ws: EnhancedWebSocket, message: string | Buffer, event: MessageEvent): void;
}

/**
 * WebSocket service for handling WebSocket connections and messages
 */
export class WebSocketService extends BaseService {
  private wss: WebSocketServer | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, WebSocketMessageHandler> = new Map();
  private connections: Map<string, EnhancedWebSocket> = new Map();
  private pingIntervalMs: number = 30000; // 30 seconds
  private path: string = '/ws';

  /**
   * Create a new WebSocket service
   */
  constructor() {
    super('websocket');
  }

  /**
   * Initialize the WebSocket service
   */
  protected async onInitialize(): Promise<void> {
    // Nothing to do in initialization
  }

  /**
   * Start the WebSocket service with the HTTP server
   */
  protected async onStart(): Promise<void> {
    // Actual start is done through setupWebSocketServer
    logger.info('WebSocket service ready');
  }

  /**
   * Stop the WebSocket service
   */
  protected async onStop(): Promise<void> {
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all connections
    for (const ws of this.connections.values()) {
      try {
        ws.terminate();
      } catch (error) {
        logger.error('Error terminating WebSocket connection', error);
      }
    }
    this.connections.clear();

    // Close the server
    if (this.wss) {
      return new Promise<void>((resolve, reject) => {
        this.wss!.close((err) => {
          if (err) {
            logger.error('Error closing WebSocket server', err);
            reject(err);
            return;
          }

          this.wss = null;
          logger.info('WebSocket server closed');
          resolve();
        });
      });
    }
  }

  /**
   * Setup the WebSocket server
   */
  public setupWebSocketServer(httpServer: Server, path?: string): void {
    if (path) {
      this.path = path;
    }

    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server: httpServer,
      path: this.path
    });

    // Setup event handlers
    this.wss.on('connection', (ws, req) => {
      // Get origin of the connection
      const origin = req.headers.origin || 'unknown';
      logger.info(`WebSocket connection attempt from origin: ${origin}`);

      // Create enhanced WebSocket
      const enhancedWs = ws as EnhancedWebSocket;
      enhancedWs.id = this.generateId();
      enhancedWs.isAlive = true;
      enhancedWs.subscriptions = new Set();
      enhancedWs.lastActivity = Date.now();

      // Add to connections map
      this.connections.set(enhancedWs.id, enhancedWs);
      logger.info(`WebSocket client connected ${this.path}`);

      // Set up handlers
      enhancedWs.on('pong', () => {
        enhancedWs.isAlive = true;
        enhancedWs.lastActivity = Date.now();
      });

      enhancedWs.on('message', (data, isBinary) => {
        try {
          enhancedWs.lastActivity = Date.now();
          
          // Parse message
          const message = isBinary ? data : data.toString();
          
          // Handle as JSON if possible
          if (typeof message === 'string') {
            try {
              const jsonMessage = JSON.parse(message);
              
              // Check if it's a subscription message
              if (jsonMessage.type === 'subscribe' && jsonMessage.channel) {
                enhancedWs.subscriptions.add(jsonMessage.channel);
                this.sendToClient(enhancedWs, { type: 'subscribed', channel: jsonMessage.channel });
                logger.debug(`Client ${enhancedWs.id} subscribed to ${jsonMessage.channel}`);
                return;
              }
              
              // Check if it's an unsubscribe message
              if (jsonMessage.type === 'unsubscribe' && jsonMessage.channel) {
                enhancedWs.subscriptions.delete(jsonMessage.channel);
                this.sendToClient(enhancedWs, { type: 'unsubscribed', channel: jsonMessage.channel });
                logger.debug(`Client ${enhancedWs.id} unsubscribed from ${jsonMessage.channel}`);
                return;
              }
              
              // Check if it's a ping message
              if (jsonMessage.type === 'ping') {
                this.sendToClient(enhancedWs, { type: 'pong' });
                return;
              }
              
              // Handle the message with registered handlers
              if (jsonMessage.type && this.messageHandlers.has(jsonMessage.type)) {
                const handler = this.messageHandlers.get(jsonMessage.type)!;
                handler(enhancedWs, message, { data: message, type: 'message', target: enhancedWs });
                return;
              }
            } catch (error) {
              // Not a valid JSON, continue to generic handlers
            }
          }
          
          // Handle message with generic handlers
          if (this.messageHandlers.has('message')) {
            const handler = this.messageHandlers.get('message')!;
            handler(enhancedWs, message, { data: message, type: 'message', target: enhancedWs });
          }
        } catch (error) {
          logger.error('Error handling WebSocket message', error);
        }
      });

      enhancedWs.on('close', (code, reason) => {
        // Remove from connections map
        this.connections.delete(enhancedWs.id);
        logger.info(`WebSocket client disconnected (code: ${code}, reason: ${reason || 'unknown'})`);
      });

      enhancedWs.on('error', (error) => {
        logger.error('WebSocket error', error);
      });

      // Send initial connection message
      this.sendToClient(enhancedWs, { type: 'connected' });
    });

    // Setup ping interval
    this.pingInterval = setInterval(() => {
      this.checkConnections();
    }, this.pingIntervalMs);

    // Log active connections periodically
    setInterval(() => {
      logger.info(`Active WebSocket connections: ${this.connections.size}`);
    }, 60000); // Every minute
  }

  /**
   * Add a message handler
   */
  public addMessageHandler(type: string, handler: WebSocketMessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove a message handler
   */
  public removeMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Send a message to a specific client
   */
  public sendToClient(ws: EnhancedWebSocket, message: any): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      ws.send(messageStr);
    } catch (error) {
      logger.error('Error sending WebSocket message', error);
    }
  }

  /**
   * Send a message to all connected clients
   */
  public broadcast(message: any, filter?: (ws: EnhancedWebSocket) => boolean): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        if (!filter || filter(ws)) {
          try {
            ws.send(messageStr);
          } catch (error) {
            logger.error('Error broadcasting WebSocket message', error);
          }
        }
      }
    }
  }

  /**
   * Send a message to subscribers of a channel
   */
  public publishToChannel(channel: string, message: any): void {
    this.broadcast(message, (ws) => ws.subscriptions.has(channel));
  }

  /**
   * Check if a client is subscribed to a channel
   */
  public isSubscribed(ws: EnhancedWebSocket, channel: string): boolean {
    return ws.subscriptions.has(channel);
  }

  /**
   * Subscribe a client to a channel
   */
  public subscribe(ws: EnhancedWebSocket, channel: string): void {
    ws.subscriptions.add(channel);
  }

  /**
   * Unsubscribe a client from a channel
   */
  public unsubscribe(ws: EnhancedWebSocket, channel: string): void {
    ws.subscriptions.delete(channel);
  }

  /**
   * Get a list of active WebSocket connections
   */
  public getConnections(): EnhancedWebSocket[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get a WebSocket connection by ID
   */
  public getConnection(id: string): EnhancedWebSocket | undefined {
    return this.connections.get(id);
  }

  /**
   * Get active connections by user ID
   */
  public getConnectionsByUser(userId: number): EnhancedWebSocket[] {
    return Array.from(this.connections.values()).filter(ws => ws.userId === userId);
  }

  /**
   * Check connections for stale ones and ping active ones
   */
  private checkConnections(): void {
    for (const ws of this.connections.values()) {
      if (!ws.isAlive) {
        // Terminate connection if didn't respond to ping
        logger.debug(`Terminating stale WebSocket connection: ${ws.id}`);
        ws.terminate();
        this.connections.delete(ws.id);
        continue;
      }

      // Mark as not alive and send ping (pong response will set isAlive back to true)
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        logger.error('Error sending ping to WebSocket client', error);
        ws.terminate();
        this.connections.delete(ws.id);
      }
    }
  }

  /**
   * Generate a unique identifier
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get server instance
   */
  public getServer(): WebSocketServer | null {
    return this.wss;
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();