// WebSocket connection manager

interface WebSocketMessage {
  type: string;
  id?: string;
  device?: number;
  deviceId?: number; // Include both forms for compatibility
  siteId?: number;
  action?: string;
  data?: any;
  timestamp?: number;
}

interface WebSocketEventMap {
  'message': WebSocketMessage;
  'connected': { connectionId: string };
  'disconnected': void;
  'error': Error;
  'deviceReading': any;
  'energyReading': any;
  'optimizationRecommendation': any;
  'deviceCommand': { deviceId: number; command: string; result: any };
  'pong': { timestamp: number };
}

type WebSocketEventHandler<K extends keyof WebSocketEventMap> = 
  (data: WebSocketEventMap[K]) => void;

class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private eventHandlers: Map<string, Array<(...args: any[]) => void>> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 30; // Increased to allow more reconnection attempts
  private reconnectDelay = 1500; // Start with 1.5s delay
  private connectionId: string | null = null;
  private subscriptions: { siteId?: number; deviceId?: number }[] = [];

  // Initialize the WebSocket connection
  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Clear any existing reconnect timeouts
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      // Use the correct protocol based on whether we're on HTTPS or HTTP
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);

      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.scheduleReconnect();
    }

    return this;
  }

  // Close the WebSocket connection
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.heartbeatInterval !== null) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.connectionId = null;
    this.subscriptions = [];
  }

  // Add an event listener
  on<K extends keyof WebSocketEventMap>(
    event: K, 
    handler: WebSocketEventHandler<K>
  ) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler as any);
    return this;
  }

  // Remove an event listener
  off<K extends keyof WebSocketEventMap>(
    event: K, 
    handler: WebSocketEventHandler<K>
  ) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler as any);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  // Send a message through the WebSocket
  send(message: WebSocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
    }
    return this;
  }

  // Subscribe to site updates
  subscribeSite(siteId: number) {
    this.send({
      type: 'subscribe',
      siteId
    });
    this.subscriptions.push({ siteId });
    return this;
  }

  // Subscribe to device updates
  subscribeDevice(deviceId: number) {
    this.send({
      type: 'subscribe',
      deviceId
    });
    this.subscriptions.push({ deviceId });
    return this;
  }

  // Unsubscribe from site updates
  unsubscribeSite(siteId: number) {
    this.send({
      type: 'unsubscribe',
      siteId
    });
    this.subscriptions = this.subscriptions.filter(sub => sub.siteId !== siteId);
    return this;
  }

  // Unsubscribe from device updates
  unsubscribeDevice(deviceId: number) {
    this.send({
      type: 'unsubscribe',
      deviceId
    });
    this.subscriptions = this.subscriptions.filter(sub => sub.deviceId !== deviceId);
    return this;
  }

  // Check connection status
  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // Send a ping to check connection
  ping() {
    this.send({
      type: 'ping',
      id: `ping_${Date.now()}`
    });
    return this;
  }

  private heartbeatInterval: number | null = null;
  private heartbeatTimeout = 30000; // 30 seconds between heartbeats
  
  // Private: Handle WebSocket open event
  private handleOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Process any queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
    
    // Resubscribe to previous subscriptions if any
    for (const sub of this.subscriptions) {
      if (sub.siteId) {
        this.subscribeSite(sub.siteId);
      } else if (sub.deviceId) {
        this.subscribeDevice(sub.deviceId);
      }
    }
    
    // Start heartbeat to keep connection alive
    this.startHeartbeat();
    
    // Emit connected event
    this.emit('connected', { connectionId: this.connectionId || '' });
    console.log('WebSocket connected successfully');
  }
  
  // Start heartbeat mechanism to keep connection alive
  private startHeartbeat() {
    // Clear any existing heartbeat
    if (this.heartbeatInterval !== null) {
      window.clearInterval(this.heartbeatInterval);
    }
    
    // Set up periodic ping
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.ping();
      } else {
        // If not connected, try to reconnect
        this.connect();
      }
    }, this.heartbeatTimeout);
  }

  // Private: Handle WebSocket message event
  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Store connection ID if received
      if (message.type === 'connected' && message.data?.connectionId) {
        this.connectionId = message.data.connectionId;
      }
      
      // General message event
      this.emit('message', message);
      
      // Specific event type
      this.emit(message.type as keyof WebSocketEventMap, message.data || message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }

  // Private: Handle WebSocket close event
  private handleClose(event: CloseEvent) {
    console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
    this.socket = null;
    
    // Emit disconnected event
    this.emit('disconnected', undefined);
    
    // Try to reconnect if not a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  // Private: Handle WebSocket error event
  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    this.emit('error', new Error('WebSocket connection error'));
    
    // The socket will also close after an error
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Private: Schedule a reconnect attempt
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      return;
    }
    
    // Exponential backoff for reconnect
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts), 
      30000 // Max 30 seconds
    );
    
    console.log(`Scheduling reconnect in ${delay}ms`);
    this.reconnectAttempts++;
    
    this.reconnectTimeout = window.setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  // Private: Emit an event to all registered handlers
  private emit<K extends keyof WebSocketEventMap>(
    event: K, 
    data: WebSocketEventMap[K]
  ) {
    if (this.eventHandlers.has(event)) {
      for (const handler of this.eventHandlers.get(event)!) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${String(event)}:`, error);
        }
      }
    }
  }
}

// Create and export a singleton instance
export const webSocketManager = new WebSocketManager();

// Connect automatically when the module is loaded
if (typeof window !== 'undefined') {
  // Slight delay to ensure the DOM is ready
  setTimeout(() => {
    webSocketManager.connect();
  }, 100);
}