/**
 * MQTT Service for Energy Management System
 * 
 * This module provides a standardized MQTT client service for the EMS,
 * handling connection, subscriptions, and message processing.
 */

import * as mqtt from 'mqtt';
import { BaseService } from './baseService';
import { config } from './config';
import { logger } from './logger';

export interface MqttMessageHandler {
  (topic: string, message: Buffer, packet: mqtt.IPublishPacket): void;
}

export interface TopicSubscription {
  topic: string;
  handler: MqttMessageHandler;
}

/**
 * MQTT Service for handling MQTT connections and message processing
 */
export class MqttService extends BaseService {
  private client: mqtt.MqttClient | null = null;
  private subscriptions: Map<string, Set<MqttMessageHandler>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private useMockBroker: boolean = false;

  /**
   * Create a new MQTT service
   */
  constructor() {
    super('mqtt');
    this.useMockBroker = config.core.env === 'development' && !config.mqtt.brokerUrl.includes('://');
  }

  /**
   * Initialize the MQTT service
   */
  protected async onInitialize(): Promise<void> {
    if (this.useMockBroker) {
      logger.info('Development mode: Using mock MQTT broker');
      // In development, we'll use a mock MQTT broker
      this.setupMockBroker();
      return;
    }

    try {
      // Setup real MQTT connection
      await this.setupMqttConnection();
    } catch (error) {
      logger.error('Failed to initialize MQTT service', error);
      throw error;
    }
  }

  /**
   * Start the MQTT service
   */
  protected async onStart(): Promise<void> {
    logger.info('MQTT service successfully initialized');
  }

  /**
   * Stop the MQTT service
   */
  protected async onStop(): Promise<void> {
    if (this.client) {
      // Unsubscribe from all topics
      const topics = Array.from(this.subscriptions.keys());
      
      if (topics.length > 0 && this.isConnected) {
        return new Promise<void>((resolve) => {
          if (!this.client) {
            resolve();
            return;
          }
          
          this.client.unsubscribe(topics, {}, (err) => {
            if (err) {
              logger.error('Error unsubscribing from topics', err);
            }
            
            this.client!.end(true, {}, () => {
              this.client = null;
              this.isConnected = false;
              this.subscriptions.clear();
              logger.info('MQTT client disconnected');
              resolve();
            });
          });
        });
      } else {
        return new Promise<void>((resolve) => {
          if (!this.client) {
            resolve();
            return;
          }
          
          this.client.end(true, {}, () => {
            this.client = null;
            this.isConnected = false;
            this.subscriptions.clear();
            logger.info('MQTT client disconnected');
            resolve();
          });
        });
      }
    }
  }

  /**
   * Setup the MQTT connection
   */
  private async setupMqttConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const {
        brokerUrl,
        clientId,
        username,
        password,
        cleanSession,
        keepAlive,
        reconnectPeriod,
        connectTimeout
      } = config.mqtt;
      
      const mqttOptions: mqtt.IClientOptions = {
        clientId,
        clean: cleanSession,
        keepalive: keepAlive,
        reconnectPeriod,
        connectTimeout
      };
      
      if (username && password) {
        mqttOptions.username = username;
        mqttOptions.password = password;
      }
      
      this.client = mqtt.connect(brokerUrl, mqttOptions);
      
      // Setup event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Connected to MQTT broker');
        resolve();
      });
      
      this.client.on('error', (err) => {
        logger.error('MQTT client error', err);
        if (!this.isConnected) {
          reject(err);
        }
      });
      
      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.warn(`Attempting to reconnect to MQTT broker (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max reconnect attempts reached, stopping reconnection');
          this.client?.end(true);
          reject(new Error('Failed to connect to MQTT broker after maximum reconnect attempts'));
        }
      });
      
      this.client.on('offline', () => {
        this.isConnected = false;
        logger.warn('MQTT client offline');
      });
      
      this.client.on('close', () => {
        this.isConnected = false;
        logger.info('MQTT connection closed');
      });
      
      this.client.on('message', (topic, message, packet) => {
        this.handleMessage(topic, message, packet);
      });
    });
  }

  /**
   * Setup a mock MQTT broker for development
   */
  private setupMockBroker(): void {
    // Create a mock MQTT client that just logs messages
    this.client = {
      connected: true,
      publish: (topic: string, message: string | Buffer, options?: mqtt.IClientPublishOptions, callback?: mqtt.PacketCallback) => {
        logger.debug(`Publishing to topic: ${topic}`, {
          message: typeof message === 'string' ? message : '<Buffer>'
        });
        if (callback) callback(null);
        return this as any;
      },
      subscribe: (topic: string | string[] | mqtt.ISubscriptionMap, options?: mqtt.IClientSubscribeOptions, callback?: mqtt.PacketCallback) => {
        const topics = Array.isArray(topic) ? topic : [topic];
        topics.forEach(t => {
          if (typeof t === 'string') {
            logger.debug(`Subscribed to topic: ${t}`);
          } else {
            // Handle ISubscriptionMap
            Object.keys(t).forEach(topicName => {
              logger.debug(`Subscribed to topic: ${topicName}`);
            });
          }
        });
        if (callback) callback(null);
        return this as any;
      },
      unsubscribe: (topic: string | string[], options?: mqtt.IClientSubscribeOptions, callback?: mqtt.PacketCallback) => {
        const topics = Array.isArray(topic) ? topic : [topic];
        topics.forEach(t => logger.debug(`Unsubscribed from topic: ${t}`));
        if (callback) callback(null);
        return this as any;
      },
      end: (force?: boolean, options?: object, callback?: mqtt.CloseCallback) => {
        logger.debug('Mock MQTT client ended');
        if (callback) callback();
        return this as any;
      },
      // Mock other methods as needed
      on: (event: string, callback: (...args: any[]) => void) => {
        if (event === 'connect') {
          // Immediately trigger connect event
          setTimeout(() => callback(), 0);
        }
        return this as any;
      },
      once: (event: string, callback: (...args: any[]) => void) => {
        return this as any;
      },
      removeListener: (event: string, callback: (...args: any[]) => void) => {
        return this as any;
      },
      removeOutgoingMessage: (mid: number) => {
        return this as any;
      },
      reconnect: () => {
        return this as any;
      },
      handleMessage: (packet: mqtt.IPacket) => {
        return this as any;
      },
      getLastMessageId: () => {
        return 0;
      }
    } as unknown as mqtt.MqttClient;
    
    this.isConnected = true;
    logger.info('Connected to mock MQTT broker');
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleMessage(topic: string, message: Buffer, packet: mqtt.IPublishPacket): void {
    // Check exact topic match first
    const exactHandlers = this.subscriptions.get(topic);
    if (exactHandlers) {
      exactHandlers.forEach(handler => {
        try {
          handler(topic, message, packet);
        } catch (error) {
          logger.error(`Error in MQTT message handler for topic ${topic}`, error);
        }
      });
    }
    
    // Check wildcard topic matches
    this.subscriptions.forEach((handlers, subscribedTopic) => {
      if (subscribedTopic === topic) {
        return; // Already handled exact match
      }
      
      if (this.topicMatches(subscribedTopic, topic)) {
        handlers.forEach(handler => {
          try {
            handler(topic, message, packet);
          } catch (error) {
            logger.error(`Error in MQTT message handler for topic ${topic} (wildcard: ${subscribedTopic})`, error);
          }
        });
      }
    });
  }

  /**
   * Check if a topic matches a subscription pattern
   */
  private topicMatches(pattern: string, topic: string): boolean {
    // Convert MQTT wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\+/g, '[^/]+')  // + matches a single level
      .replace(/\/#$/, '(/.*)?'); // # matches multiple levels at the end
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(topic);
  }

  /**
   * Subscribe to a topic
   */
  public subscribe(topic: string, handler: MqttMessageHandler): void {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    let handlers = this.subscriptions.get(topic);
    if (!handlers) {
      handlers = new Set();
      this.subscriptions.set(topic, handlers);
      
      // Only subscribe to the broker if this is a new topic
      this.client.subscribe(topic, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to topic ${topic}`, err);
          this.subscriptions.delete(topic);
          throw err;
        }
        logger.info(`Subscribed to topic: ${topic}`);
        logger.info(`Subscribed to ${topic}`);
      });
    }
    
    handlers.add(handler);
  }

  /**
   * Unsubscribe from a topic
   */
  public unsubscribe(topic: string, handler?: MqttMessageHandler): void {
    if (!this.client || !this.isConnected) {
      return;
    }

    const handlers = this.subscriptions.get(topic);
    if (!handlers) {
      return;
    }
    
    if (handler) {
      // Remove specific handler
      handlers.delete(handler);
      
      // If there are still handlers, don't unsubscribe from the broker
      if (handlers.size > 0) {
        return;
      }
    }
    
    // No handlers left, unsubscribe from the broker
    this.subscriptions.delete(topic);
    this.client.unsubscribe(topic, (err) => {
      if (err) {
        logger.error(`Failed to unsubscribe from topic ${topic}`, err);
      } else {
        logger.info(`Unsubscribed from topic: ${topic}`);
      }
    });
  }

  /**
   * Publish a message to a topic
   */
  public publish(
    topic: string, 
    message: string | Buffer | object, 
    options: mqtt.IClientPublishOptions = {}
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      return Promise.reject(new Error('MQTT client not connected'));
    }

    let messageContent: string | Buffer;
    if (typeof message === 'object' && !(message instanceof Buffer)) {
      messageContent = JSON.stringify(message);
    } else {
      messageContent = message;
    }

    return new Promise<void>((resolve, reject) => {
      this.client!.publish(topic, messageContent, options, (err) => {
        if (err) {
          logger.error(`Failed to publish to topic ${topic}`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Check if the MQTT client is connected
   */
  public isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the MQTT client
   */
  public getClient(): mqtt.MqttClient | null {
    return this.client;
  }

  /**
   * Get all active subscriptions
   */
  public getSubscriptions(): Map<string, Set<MqttMessageHandler>> {
    return this.subscriptions;
  }
}

// Export a singleton instance
export const mqttService = new MqttService();