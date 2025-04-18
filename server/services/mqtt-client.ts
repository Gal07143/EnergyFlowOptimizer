/**
 * MQTT Client Service
 * 
 * This service provides a centralized MQTT client for the entire application,
 * managing connection, subscription, and publishing to the MQTT broker.
 * It includes support for both real and mock MQTT brokers.
 */

import * as mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Simple console logger
const logger = {
  info: (message: string) => console.info(`[INFO] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  debug: (message: string) => console.debug(`[DEBUG] ${message}`)
};

// MQTT Configuration
const DEFAULT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const DEFAULT_CLIENT_ID = `ems-server-${uuidv4().substring(0, 8)}`;
const DEFAULT_QOS = 1; // At least once delivery
const RECONNECT_PERIOD = 5000; // 5 seconds

// MQTT Topic structure
export const MQTT_TOPICS = {
  DEVICE_STATUS: 'devices/+/status',
  DEVICE_TELEMETRY: 'devices/+/telemetry',
  DEVICE_COMMANDS: 'devices/+/commands',
  DEVICE_COMMANDS_RESPONSE: 'devices/+/commands/response',
  GATEWAY_STATUS: 'gateways/+/status',
  GATEWAY_TELEMETRY: 'gateways/+/telemetry',
  GATEWAY_COMMANDS: 'gateways/+/commands',
  SITE_ENERGY_READINGS: 'sites/+/energy/readings',
  VPP_EVENTS: 'vpp/events/+',
  VPP_RESPONSES: 'vpp/events/+/responses/+'
};

// Message types
export interface MqttMessage {
  topic: string;
  payload: any;
  qos?: number;
  retain?: boolean;
}

// Callback type definition
type MessageCallback = (topic: string, payload: any) => void;

// Mock MQTT broker for development
class MockMqttBroker extends EventEmitter {
  private subscribers: Map<string, Set<MessageCallback>> = new Map();
  private connected: boolean = true;

  constructor() {
    super();
    logger.info('Development mode: Using mock MQTT broker');
  }

  subscribe(topic: string, callback: MessageCallback): boolean {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    const subscribers = this.subscribers.get(topic);
    if (subscribers) {
      subscribers.add(callback);
    }
    logger.info(`Subscribed to ${topic}`);
    return true;
  }

  unsubscribe(topic: string, callback?: MessageCallback): boolean {
    if (!callback) {
      this.subscribers.delete(topic);
      return true;
    }

    const callbacks = this.subscribers.get(topic);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(topic);
      }
    }
    return true;
  }

  publish(topic: string, payload: any): boolean {
    if (!this.connected) {
      return false;
    }

    // Convert payload to string if it's an object
    const message = typeof payload === 'object' ? JSON.stringify(payload) : payload;

    // Find matching topics (including wildcards)
    this.subscribers.forEach((callbacks, subscribedTopic) => {
      if (this.topicMatches(subscribedTopic, topic)) {
        callbacks.forEach(callback => {
          callback(topic, message);
        });
      }
    });
    
    // Emit the message for any direct listeners
    this.emit('message', topic, message);
    return true;
  }

  // Handle wildcard matching for MQTT topics
  private topicMatches(subscription: string, publishedTopic: string): boolean {
    // Exact match
    if (subscription === publishedTopic) {
      return true;
    }

    const subParts = subscription.split('/');
    const pubParts = publishedTopic.split('/');

    // Different number of parts, can't match unless there's a multi-level wildcard #
    if (subParts.length !== pubParts.length && !subscription.includes('#')) {
      return false;
    }

    // Check each part
    for (let i = 0; i < subParts.length; i++) {
      const subPart = subParts[i];
      const pubPart = pubParts[i];

      // Multi-level wildcard (#) matches remainder of topic
      if (subPart === '#') {
        return true;
      }

      // Single-level wildcard (+) matches any single part
      if (subPart === '+') {
        continue;
      }

      // Regular part must match exactly
      if (subPart !== pubPart) {
        return false;
      }
    }

    return true;
  }

  connect(): boolean {
    this.connected = true;
    setTimeout(() => {
      this.emit('connect');
    }, 100);
    return true;
  }

  disconnect(): boolean {
    this.connected = false;
    this.emit('close');
    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  reset(): void {
    this.subscribers.clear();
    this.connected = false;
    this.emit('close');
  }
}

// MQTT Client service
class MqttClientService {
  private client: mqtt.MqttClient | MockMqttBroker | null = null;
  private clientId: string;
  private brokerUrl: string;
  private subscriptions: Map<string, Set<MessageCallback>> = new Map();
  private connected: boolean = false;
  private mockMode: boolean = process.env.NODE_ENV === 'development';
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(brokerUrl: string = DEFAULT_BROKER_URL, clientId: string = DEFAULT_CLIENT_ID) {
    this.brokerUrl = brokerUrl;
    this.clientId = clientId;
  }

  // Initialize the MQTT client
  async initialize(): Promise<boolean> {
    if (this.client) {
      return this.connected;
    }

    try {
      if (this.mockMode) {
        // Use mock MQTT broker for development
        this.client = new MockMqttBroker();
        this.setupMockListeners();
        this.connected = true;
        logger.info('Connected to mock MQTT broker');
        return true;
      } else {
        // Connect to real MQTT broker
        this.client = mqtt.connect(this.brokerUrl, {
          clientId: this.clientId,
          clean: true,
          connectTimeout: 5000,
          reconnectPeriod: RECONNECT_PERIOD
        });

        return new Promise<boolean>((resolve) => {
          if (!this.client) {
            resolve(false);
            return;
          }

          // Explicitly cast to MqttClient to avoid TypeScript issues
          const mqttClient = this.client as mqtt.MqttClient;

          mqttClient.on('connect', () => {
            this.connected = true;
            logger.info(`Connected to MQTT broker at ${this.brokerUrl}`);
            this.resubscribeAll();
            resolve(true);
          });

          mqttClient.on('error', (err: Error) => {
            logger.error(`MQTT client error: ${err.message}`);
            this.connected = false;
            resolve(false);
          });

          mqttClient.on('message', (topic: string, payload: Buffer) => {
            this.handleMessage(topic, payload);
          });

          mqttClient.on('close', () => {
            this.connected = false;
            logger.warn('MQTT connection closed');
          });

          mqttClient.on('offline', () => {
            this.connected = false;
            logger.warn('MQTT client is offline');
          });

          mqttClient.on('reconnect', () => {
            logger.info('Attempting to reconnect to MQTT broker');
          });
        });
      }
    } catch (error: any) {
      logger.error(`Failed to initialize MQTT client: ${error.message}`);
      return false;
    }
  }

  // Set up listeners for mock MQTT broker
  private setupMockListeners(): void {
    if (!this.client || !(this.client instanceof MockMqttBroker)) {
      return;
    }

    const mockClient = this.client as MockMqttBroker;

    mockClient.on('connect', () => {
      this.connected = true;
      this.resubscribeAll();
    });

    mockClient.on('close', () => {
      this.connected = false;
    });

    mockClient.on('message', (topic: string, payload: string) => {
      this.handleMessage(topic, payload);
    });
  }

  // Handle incoming messages
  private handleMessage(topic: string, payload: Buffer | string): void {
    try {
      // Parse message if it's JSON
      let parsedPayload;
      if (typeof payload === 'string') {
        try {
          parsedPayload = JSON.parse(payload);
        } catch {
          parsedPayload = payload;
        }
      } else {
        // It's a Buffer
        const payloadStr = payload.toString();
        try {
          parsedPayload = JSON.parse(payloadStr);
        } catch {
          parsedPayload = payloadStr;
        }
      }

      // Find callbacks for this topic
      this.subscriptions.forEach((callbacks, subscribedTopic) => {
        if (this.topicMatches(subscribedTopic, topic)) {
          callbacks.forEach(callback => {
            try {
              callback(topic, parsedPayload);
            } catch (error: any) {
              logger.error(`Error in MQTT message handler: ${error.message}`);
            }
          });
        }
      });
    } catch (error: any) {
      logger.error(`Error processing MQTT message: ${error.message}`);
    }
  }

  // Check if a published topic matches a subscription topic pattern
  private topicMatches(subscription: string, publishedTopic: string): boolean {
    // Exact match
    if (subscription === publishedTopic) {
      return true;
    }

    const subParts = subscription.split('/');
    const pubParts = publishedTopic.split('/');

    // Different number of parts, can't match unless there's a multi-level wildcard #
    if (subParts.length !== pubParts.length && !subscription.includes('#')) {
      return false;
    }

    // Check each part
    for (let i = 0; i < subParts.length; i++) {
      const subPart = subParts[i];
      // If we've gone past the published topic parts
      if (i >= pubParts.length) {
        return subPart === '#';
      }
      
      const pubPart = pubParts[i];

      // Multi-level wildcard (#) matches remainder of topic
      if (subPart === '#') {
        return true;
      }

      // Single-level wildcard (+) matches any single part
      if (subPart === '+') {
        continue;
      }

      // Regular part must match exactly
      if (subPart !== pubPart) {
        return false;
      }
    }

    return pubParts.length === subParts.length;
  }

  // Subscribe to a topic
  subscribe(topic: string, callback: MessageCallback): boolean {
    if (!this.connected || !this.client) {
      // Store subscription for later when we reconnect
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }
      const subscribers = this.subscriptions.get(topic);
      if (subscribers) {
        subscribers.add(callback);
      }
      return false;
    }

    try {
      // Store the callback
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }
      const subscribers = this.subscriptions.get(topic);
      if (subscribers) {
        subscribers.add(callback);
      }

      // Subscribe via the client
      if (this.mockMode && this.client instanceof MockMqttBroker) {
        return this.client.subscribe(topic, callback);
      } else if (this.client && 'subscribe' in this.client) {
        const mqttClient = this.client as mqtt.MqttClient;
        mqttClient.subscribe(topic, { qos: DEFAULT_QOS as mqtt.QoS }, (err) => {
          if (err) {
            logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
            return;
          }
          logger.info(`Subscribed to ${topic}`);
        });
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error(`Error subscribing to ${topic}: ${error.message}`);
      return false;
    }
  }

  // Unsubscribe from a topic
  unsubscribe(topic: string, callback?: MessageCallback): boolean {
    try {
      if (callback) {
        // Remove specific callback
        const callbacks = this.subscriptions.get(topic);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.subscriptions.delete(topic);
            // Unsubscribe from broker if no more callbacks
            if (this.connected && this.client) {
              if (this.mockMode && this.client instanceof MockMqttBroker) {
                return this.client.unsubscribe(topic);
              } else if ('unsubscribe' in this.client) {
                const mqttClient = this.client as mqtt.MqttClient;
                mqttClient.unsubscribe(topic);
                return true;
              }
            }
          }
        }
      } else {
        // Remove all callbacks
        this.subscriptions.delete(topic);
        // Unsubscribe from broker
        if (this.connected && this.client) {
          if (this.mockMode && this.client instanceof MockMqttBroker) {
            return this.client.unsubscribe(topic);
          } else if ('unsubscribe' in this.client) {
            const mqttClient = this.client as mqtt.MqttClient;
            mqttClient.unsubscribe(topic);
            return true;
          }
        }
      }
      return true;
    } catch (error: any) {
      logger.error(`Error unsubscribing from ${topic}: ${error.message}`);
      return false;
    }
  }

  // Publish a message to a topic
  publish(message: MqttMessage): boolean {
    if (!this.connected || !this.client) {
      logger.warn(`Cannot publish to ${message.topic}: Not connected to MQTT broker`);
      return false;
    }

    try {
      const { topic, payload, qos = DEFAULT_QOS, retain = false } = message;
      const stringPayload = typeof payload === 'object' ? JSON.stringify(payload) : payload;

      if (this.mockMode && this.client instanceof MockMqttBroker) {
        return this.client.publish(topic, stringPayload);
      } else if ('publish' in this.client) {
        const mqttClient = this.client as mqtt.MqttClient;
        mqttClient.publish(topic, stringPayload, { qos: qos as mqtt.QoS, retain }, (err) => {
          if (err) {
            logger.error(`Failed to publish to ${topic}: ${err.message}`);
          }
        });
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error(`Error publishing to ${message.topic}: ${error.message}`);
      return false;
    }
  }

  // Resubscribe to all stored subscriptions (used after reconnection)
  private resubscribeAll(): void {
    if (!this.connected || !this.client) {
      return;
    }

    this.subscriptions.forEach((callbacks, topic) => {
      if (callbacks.size > 0) {
        if (this.mockMode && this.client instanceof MockMqttBroker) {
          callbacks.forEach(callback => {
            (this.client as MockMqttBroker).subscribe(topic, callback);
          });
        } else if ('subscribe' in this.client) {
          const mqttClient = this.client as mqtt.MqttClient;
          mqttClient.subscribe(topic, { qos: DEFAULT_QOS as mqtt.QoS }, (err) => {
            if (err) {
              logger.error(`Failed to resubscribe to ${topic}: ${err.message}`);
            } else {
              logger.info(`Resubscribed to ${topic}`);
            }
          });
        }
      }
    });
  }

  // Disconnect from the MQTT broker
  disconnect(): void {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.client) {
        if (this.mockMode && this.client instanceof MockMqttBroker) {
          this.client.disconnect();
        } else if ('end' in this.client) {
          (this.client as mqtt.MqttClient).end();
        }
        this.client = null;
      }
      this.connected = false;
    } catch (error: any) {
      logger.error(`Error disconnecting from MQTT broker: ${error.message}`);
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Reset the client (for testing purposes)
  reset(): void {
    this.disconnect();
    this.subscriptions.clear();
    this.connected = false;
  }

  // Get client statistics
  getStats() {
    return {
      connected: this.connected,
      mockMode: this.mockMode,
      subscriptionCount: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }
}

// Singleton instance
const mqttClient = new MqttClientService();

export { mqttClient, MqttClientService, MockMqttBroker, MQTT_TOPICS };