import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { TOPIC_PATTERNS, QoSLevel } from '@shared/messageSchema';
import { getMqttConfig, getMqttOptions } from '../config/mqttBrokerConfig';

export interface MqttConnectionOptions {
  brokerUrl?: string;
  clientId?: string;
  username?: string;
  password?: string;
  keepalive?: number;
  clean?: boolean;
  reconnectPeriod?: number;
  connectTimeout?: number;
  queueQoSZero?: boolean;
  rejectUnauthorized?: boolean;
  will?: {
    topic: string;
    payload: string;
    qos: 0 | 1 | 2;
    retain: boolean;
  };
  // Enhanced options
  protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  cert?: string;
  key?: string;
  ca?: string;
  highAvailability?: boolean;
  maxInflightMessages?: number;
  persistentSession?: boolean;
}

export interface PublishOptions {
  qos?: QoSLevel;
  retain?: boolean;
  dup?: boolean;
  properties?: {
    payloadFormatIndicator?: boolean;
    messageExpiryInterval?: number;
    contentType?: string;
    responseTopic?: string;
    correlationData?: Buffer;
    userProperties?: Record<string, string>;
  };
}

export interface SubscribeOptions {
  qos?: QoSLevel;
  nl?: boolean; // No Local flag
  rap?: boolean; // Retain as Published
  rh?: number; // Retain Handling
}

interface MessageHandler {
  topicPattern: string;
  handler: (topic: string, message: any, params: Record<string, any>) => void;
}

// Mock MQTT broker for development environment
class MockMqttBroker {
  private subscribers: Map<string, Array<(topic: string, message: Buffer) => void>> = new Map();
  private mockClientId: string = `mock-client-${uuidv4().slice(0, 8)}`;
  private connected: boolean = false;
  private emitter: EventEmitter = new EventEmitter();

  connect(): void {
    this.connected = true;
    setTimeout(() => {
      this.emitter.emit('connect');
    }, 100);
    
    console.log('Connected to mock MQTT broker');
  }

  subscribe(topic: string, _options: SubscribeOptions | undefined, callback?: (err: Error | null, granted: any) => void): void {
    console.log(`Subscribed to topic: ${topic}`);
    if (callback) {
      callback(null, [{ topic, qos: 0 }]);
    }
  }

  publish(topic: string, message: Buffer | string, _options: PublishOptions | undefined, callback?: (err?: Error) => void): void {
    const messageBuffer = typeof message === 'string' ? Buffer.from(message) : message;
    
    // Get all matching topic subscribers
    for (const [subscribedTopic, handlers] of this.subscribers.entries()) {
      if (this.topicMatches(topic, subscribedTopic)) {
        for (const handler of handlers) {
          try {
            handler(topic, messageBuffer);
          } catch (error) {
            console.error(`Error in mock MQTT handler for topic ${subscribedTopic}:`, error);
          }
        }
      }
    }
    
    if (callback) {
      callback();
    }
  }

  private topicMatches(actualTopic: string, patternTopic: string): boolean {
    // Simple topic matching (supports wildcards like # and +)
    const actualParts = actualTopic.split('/');
    const patternParts = patternTopic.split('/');
    
    return this.partsMatch(actualParts, patternParts);
  }

  private partsMatch(actualParts: string[], patternParts: string[]): boolean {
    // Handle # wildcard (matches multiple levels)
    if (patternParts.length > 0 && patternParts[patternParts.length - 1] === '#') {
      return actualParts.length >= patternParts.length - 1 && 
             this.partsMatch(actualParts.slice(0, patternParts.length - 1), patternParts.slice(0, patternParts.length - 1));
    }
    
    if (actualParts.length !== patternParts.length) {
      return false;
    }
    
    for (let i = 0; i < actualParts.length; i++) {
      if (patternParts[i] !== '+' && patternParts[i] !== actualParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.emitter.on(event, callback);
  }

  end(force?: boolean, callback?: () => void): void {
    this.connected = false;
    this.emitter.emit('close');
    if (callback) {
      callback();
    }
  }

  addMessageHandler(topic: string, handler: (topic: string, message: Buffer) => void): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic)?.push(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// MQTT service for handling message communication
export class MqttService {
  private client!: mqtt.MqttClient | MockMqttBroker;
  private connected: boolean = false;
  private reconnecting: boolean = false;
  private messageHandlers: MessageHandler[] = [];
  private clientId: string;
  private options: MqttConnectionOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, { options?: SubscribeOptions, callback?: (err: Error, granted: any) => void }> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private useMockBroker: boolean = false;
  private topicCache: Map<string, Record<string, any>> = new Map();
  
  constructor(options?: MqttConnectionOptions) {
    // Get configuration from broker config
    const mqttConfig = getMqttConfig();
    const mqttOptions = getMqttOptions();
    
    // Merge with provided options
    this.options = {
      brokerUrl: mqttConfig.mainBrokerUrl,
      clientId: mqttOptions.clientId as string,
      keepalive: mqttConfig.keepalive,
      clean: mqttConfig.cleanSession,
      reconnectPeriod: mqttConfig.reconnectPeriod,
      connectTimeout: mqttConfig.connectTimeout,
      queueQoSZero: mqttConfig.queueQosZeroMessages,
      rejectUnauthorized: mqttConfig.rejectUnauthorized,
      protocol: mqttConfig.tlsEnabled ? 'mqtts' : 'mqtt',
      highAvailability: mqttConfig.highAvailability,
      maxInflightMessages: mqttConfig.maxInflightMessages,
      persistentSession: mqttConfig.persistentSession,
      username: mqttConfig.authEnabled ? mqttConfig.username : undefined,
      password: mqttConfig.authEnabled ? mqttConfig.password : undefined,
      ...options
    };
    
    this.clientId = this.options.clientId || `ems-${uuidv4()}`;
    
    // Use mock broker in development mode if MQTT_BROKER_URL is not set
    this.useMockBroker = process.env.NODE_ENV === 'development' && !process.env.MQTT_BROKER_URL;
    
    if (this.useMockBroker) {
      console.log('Development mode: Using mock MQTT broker');
      this.client = new MockMqttBroker();
    } else {
      // Enhanced MQTT client connection options
      const connectOptions: any = {
        clientId: this.clientId,
        keepalive: this.options.keepalive,
        clean: this.options.clean,
        reconnectPeriod: this.options.reconnectPeriod,
        connectTimeout: this.options.connectTimeout,
        queueQoSZero: this.options.queueQoSZero,
        rejectUnauthorized: this.options.rejectUnauthorized
      };
      
      // Add authentication if enabled
      if (this.options.username) {
        connectOptions.username = this.options.username;
        connectOptions.password = this.options.password;
      }
      
      // Add TLS configuration if enabled
      if (this.options.protocol === 'mqtts') {
        connectOptions.protocol = 'mqtts';
        if (this.options.cert && this.options.key) {
          connectOptions.cert = this.options.cert;
          connectOptions.key = this.options.key;
          if (this.options.ca) {
            connectOptions.ca = this.options.ca;
          }
        }
      }
      
      // Add will message if provided
      if (this.options.will) {
        connectOptions.will = this.options.will;
      }
      
      // Client will be initialized in connect()
      this.client = mqtt.connect(this.options.brokerUrl!, connectOptions);
    }
  }
  
  // Connect to MQTT broker
  async connect(): Promise<void> {
    if (this.connected) return;
    
    return new Promise((resolve, reject) => {
      // If mock broker, simply connect
      if (this.useMockBroker) {
        (this.client as MockMqttBroker).connect();
        this.connected = true;
        this.resubscribe();
        resolve();
        return;
      }
      
      // Handle real broker connection
      const client = this.client as mqtt.MqttClient;
      
      const connectHandler = () => {
        console.log(`Connected to MQTT broker at ${this.options.brokerUrl}`);
        this.connected = true;
        this.reconnecting = false;
        client.removeListener('connect', connectHandler);
        client.removeListener('error', errorHandler);
        
        // Set up event handlers
        client.on('message', (topic, message) => this.handleMessage(topic, message));
        client.on('close', () => {
          console.log('MQTT connection closed');
          this.connected = false;
          if (!this.reconnecting) {
            this.scheduleReconnect();
          }
        });
        client.on('error', (err) => {
          console.error('MQTT client error:', err);
          if (this.connected) {
            this.connected = false;
            this.scheduleReconnect();
          }
        });
        
        // Resubscribe to topics
        this.resubscribe();
        
        resolve();
      };
      
      const errorHandler = (err: Error) => {
        console.error(`Error connecting to MQTT broker at ${this.options.brokerUrl}:`, err.message);
        client.removeListener('connect', connectHandler);
        client.removeListener('error', errorHandler);
        if (!this.reconnecting) {
          this.scheduleReconnect();
        }
        reject(err);
      };
      
      client.once('connect', connectHandler);
      client.once('error', errorHandler);
    });
  }
  
  // Disconnect from MQTT broker
  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    return new Promise((resolve) => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      this.client.end(false, () => {
        this.connected = false;
        console.log('Disconnected from MQTT broker');
        resolve();
      });
    });
  }
  
  // Subscribe to a topic
  async subscribe(topic: string, options?: SubscribeOptions): Promise<void> {
    // Store subscription for later resubscription if needed
    this.subscriptions.set(topic, { options });
    
    if (!this.connected) {
      console.log(`Will subscribe to ${topic} when connected`);
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, options || { qos: 0 }, (err, granted) => {
        if (err) {
          console.error(`Error subscribing to ${topic}:`, err);
          reject(err);
          return;
        }
        
        console.log(`Subscribed to ${topic}`);
        resolve();
      });
    });
  }
  
  // Unsubscribe from a topic
  async unsubscribe(topic: string): Promise<void> {
    this.subscriptions.delete(topic);
    
    if (!this.connected) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      if ('unsubscribe' in this.client) {
        this.client.unsubscribe(topic, (err) => {
          if (err) {
            console.error(`Error unsubscribing from ${topic}:`, err);
            reject(err);
            return;
          }
          
          console.log(`Unsubscribed from ${topic}`);
          resolve();
        });
      } else {
        // Mock broker doesn't have unsubscribe
        resolve();
      }
    });
  }
  
  // Publish a message to a topic
  async publish(topic: string, message: any, options?: PublishOptions): Promise<void> {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (!this.connected) {
      console.warn(`Cannot publish to ${topic} - not connected`);
      throw new Error('MQTT client not connected');
    }
    
    return new Promise((resolve, reject) => {
      this.client.publish(topic, messageStr, options || { qos: 0 }, (err) => {
        if (err) {
          console.error(`Error publishing to ${topic}:`, err);
          reject(err);
          return;
        }
        
        // Update topic cache
        if (options?.retain) {
          try {
            const messageObj = typeof message === 'string' ? JSON.parse(message) : message;
            this.topicCache.set(topic, messageObj);
          } catch (error) {
            // Ignore parse errors for non-JSON messages
          }
        }
        
        resolve();
      });
    });
  }
  
  // Add a message handler for a topic pattern
  addMessageHandler(topicPattern: string, handler: (topic: string, message: any, params: Record<string, any>) => void): void {
    this.messageHandlers.push({ topicPattern, handler });
    
    // Extract non-wildcard parts of the pattern to create a subscription
    let subscriptionTopic = topicPattern;
    if (subscriptionTopic.includes(':')) {
      // Replace named parameters with MQTT wildcards for subscription
      subscriptionTopic = subscriptionTopic.replace(/:[a-zA-Z0-9_]+/g, '+');
    }
    
    // Subscribe to the topic
    this.subscribe(subscriptionTopic).catch(err => {
      console.error(`Error subscribing to ${subscriptionTopic}:`, err);
    });
  }
  
  // Remove a message handler
  removeMessageHandler(handler: (topic: string, message: any, params: Record<string, any>) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h.handler !== handler);
  }
  
  // Add event listener
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
  
  // Remove event listener
  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
  
  // Check if connected
  isConnected(): boolean {
    return this.connected;
  }
  
  // Handle incoming messages
  private handleMessage(topic: string, messageBuffer: Buffer): void {
    let messageObj: any = null;
    
    try {
      const messageStr = messageBuffer.toString();
      messageObj = JSON.parse(messageStr);
    } catch (error) {
      // Not a JSON message, use the raw message as a string
      messageObj = messageBuffer.toString();
    }
    
    // Update cache for retained messages
    this.topicCache.set(topic, messageObj);
    
    // Process message with registered handlers
    for (const { topicPattern, handler } of this.messageHandlers) {
      const params = this.extractTopicParams(topic, topicPattern);
      if (params) {
        try {
          handler(topic, messageObj, params);
        } catch (error) {
          console.error(`Error in MQTT message handler for ${topicPattern}:`, error);
        }
      }
    }
    
    // Emit message event
    this.eventEmitter.emit('message', topic, messageObj);
  }
  
  // Extract named parameters from topic pattern
  private extractTopicParams(topic: string, topicPattern: string): Record<string, any> | null {
    const topicParts = topic.split('/');
    const patternParts = topicPattern.split('/');
    
    if (topicParts.length !== patternParts.length && !patternParts.includes('#')) {
      return null;
    }
    
    const params: Record<string, any> = {};
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      
      // Handle wildcard
      if (patternPart === '#') {
        return params;
      }
      
      if (patternPart === '+') {
        continue;
      }
      
      // Handle named parameter
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1);
        if (i < topicParts.length) {
          params[paramName] = topicParts[i];
        }
        continue;
      }
      
      // Check for exact match
      if (i >= topicParts.length || patternPart !== topicParts[i]) {
        return null;
      }
    }
    
    return params;
  }
  
  // Resubscribe to all stored subscriptions
  private resubscribe(): void {
    for (const [topic, { options, callback }] of this.subscriptions.entries()) {
      this.client.subscribe(topic, options || { qos: 0 }, callback || (() => {}));
      console.log(`Resubscribed to ${topic}`);
    }
  }
  
  // Schedule reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnecting) {
      return;
    }
    
    this.reconnecting = true;
    const delay = this.options.reconnectPeriod || 5000;
    
    console.log(`Scheduling reconnect in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      
      if (!this.useMockBroker) {
        // For real MQTT client, create a new instance with enhanced options
        const connectOptions: any = {
          clientId: this.clientId,
          keepalive: this.options.keepalive,
          clean: this.options.clean,
          reconnectPeriod: this.options.reconnectPeriod,
          connectTimeout: this.options.connectTimeout,
          queueQoSZero: this.options.queueQoSZero,
          rejectUnauthorized: this.options.rejectUnauthorized
        };
        
        // Add authentication if enabled
        if (this.options.username) {
          connectOptions.username = this.options.username;
          connectOptions.password = this.options.password;
        }
        
        // Add TLS configuration if enabled
        if (this.options.protocol === 'mqtts') {
          connectOptions.protocol = 'mqtts';
          if (this.options.cert && this.options.key) {
            connectOptions.cert = this.options.cert;
            connectOptions.key = this.options.key;
            if (this.options.ca) {
              connectOptions.ca = this.options.ca;
            }
          }
        }
        
        // Add will message if provided
        if (this.options.will) {
          connectOptions.will = this.options.will;
        }
        
        // Add enhanced options for MQTT 5.0 if available
        if (this.options.maxInflightMessages) {
          connectOptions.maxInflightMessages = this.options.maxInflightMessages;
        }
        
        this.client = mqtt.connect(this.options.brokerUrl!, connectOptions);
      }
      
      this.connect().catch(err => {
        console.error('Reconnect failed:', err);
        this.scheduleReconnect();
      });
    }, delay);
  }
}

// Singleton instance
let mqttServiceInstance: MqttService | null = null;

// Initialize the MQTT service
export function initMqttService(options?: MqttConnectionOptions): MqttService {
  if (!mqttServiceInstance) {
    mqttServiceInstance = new MqttService(options);
    
    // Connect immediately
    mqttServiceInstance.connect().catch(err => {
      console.error('Error initializing MQTT service:', err);
    });
  }
  
  return mqttServiceInstance;
}

// Get the existing MQTT service instance
export function getMqttService(): MqttService {
  if (!mqttServiceInstance) {
    throw new Error('MQTT service not initialized. Call initMqttService first.');
  }
  
  return mqttServiceInstance;
}

// Format a topic with dynamic parameters
export function formatTopic(pattern: string, params: Record<string, any>): string {
  let formattedTopic = pattern;
  
  for (const [key, value] of Object.entries(params)) {
    formattedTopic = formattedTopic.replace(`:${key}`, value.toString());
  }
  
  return formattedTopic;
}

// Format a device-specific topic
export function formatDeviceTopic(pattern: string, deviceId: number, additionalParams: Record<string, any> = {}): string {
  return formatTopic(pattern, { deviceId, ...additionalParams });
}

// Format a site-specific topic
export function formatSiteTopic(pattern: string, siteId: number, additionalParams: Record<string, any> = {}): string {
  return formatTopic(pattern, { siteId, ...additionalParams });
}