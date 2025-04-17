/**
 * MQTT Broker Configuration
 * Based on the communication protocol standards for Energy Management System
 */

import { QoSLevel } from '@shared/messageSchema';

// MQTT Broker Types
export enum MqttBrokerType {
  MOSQUITTO = 'mosquitto',
  HIVEMQ = 'hivemq',
  EMQ_X = 'emqx',
  VERNEMQ = 'vernemq'
}

// MQTT Auth Methods
export enum MqttAuthMethod {
  NONE = 'none',
  BASIC = 'basic',
  TOKEN = 'token',
  CERTIFICATE = 'certificate'
}

// MQTT Configuration
export interface MqttBrokerConfig {
  // Broker information
  brokerType: MqttBrokerType;
  mainBrokerUrl: string;
  clusterNodes: string[];
  
  // Security
  tlsEnabled: boolean;
  tlsCertPath?: string;
  tlsKeyPath?: string;
  tlsCaPath?: string;
  
  // Authentication
  authEnabled: boolean;
  authMethod: MqttAuthMethod;
  username?: string;
  password?: string;
  token?: string;
  
  // Connection
  clientIdPrefix: string;
  keepalive: number;
  cleanSession: boolean;
  connectTimeout: number;
  reconnectPeriod: number;
  
  // QoS and Message Delivery
  defaultQoS: QoSLevel;
  persistentSession: boolean;
  retainedMessagesEnabled: boolean;
  
  // Will Message (Last Will and Testament)
  willEnabled: boolean;
  willTopic?: string;
  willMessage?: string;
  willQos?: QoSLevel;
  willRetain?: boolean;
  
  // Advanced
  maxInflightMessages?: number;
  queueQosZeroMessages?: boolean;
  rejectUnauthorized?: boolean;
  highAvailability?: boolean;
}

// Default configuration
export const defaultMqttConfig: MqttBrokerConfig = {
  // Broker information
  brokerType: process.env.MQTT_BROKER_TYPE === 'hivemq' ? MqttBrokerType.HIVEMQ : MqttBrokerType.MOSQUITTO,
  mainBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  clusterNodes: process.env.MQTT_CLUSTER_NODES?.split(',') || [],
  
  // Security - disabled by default for development
  tlsEnabled: process.env.MQTT_TLS_ENABLED === 'true',
  tlsCertPath: process.env.MQTT_TLS_CERT_PATH,
  tlsKeyPath: process.env.MQTT_TLS_KEY_PATH,
  tlsCaPath: process.env.MQTT_TLS_CA_PATH,
  
  // Authentication
  authEnabled: process.env.MQTT_AUTH_ENABLED === 'true',
  authMethod: process.env.MQTT_AUTH_METHOD as MqttAuthMethod || MqttAuthMethod.NONE,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  
  // Connection
  clientIdPrefix: 'ems-server',
  keepalive: parseInt(process.env.MQTT_KEEPALIVE || '60', 10),
  cleanSession: process.env.MQTT_CLEAN_SESSION !== 'false',
  connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || '30000', 10),
  reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || '5000', 10),
  
  // QoS and Message Delivery
  defaultQoS: parseInt(process.env.MQTT_DEFAULT_QOS || '0', 10) as QoSLevel,
  persistentSession: process.env.MQTT_PERSISTENT_SESSION === 'true',
  retainedMessagesEnabled: process.env.MQTT_RETAINED_MESSAGES_ENABLED !== 'false',
  
  // Will Message
  willEnabled: process.env.MQTT_WILL_ENABLED === 'true',
  willTopic: process.env.MQTT_WILL_TOPIC || 'system/status',
  willMessage: process.env.MQTT_WILL_MESSAGE || JSON.stringify({
    status: 'offline',
    timestamp: new Date().toISOString(),
    message: 'Server disconnected unexpectedly'
  }),
  willQos: parseInt(process.env.MQTT_WILL_QOS || '1', 10) as QoSLevel,
  willRetain: process.env.MQTT_WILL_RETAIN !== 'false',
  
  // Advanced
  maxInflightMessages: parseInt(process.env.MQTT_MAX_INFLIGHT || '100', 10),
  queueQosZeroMessages: process.env.MQTT_QUEUE_QOS_ZERO === 'true',
  rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== 'false',
  highAvailability: process.env.MQTT_HIGH_AVAILABILITY === 'true'
};

/**
 * Get MQTT broker configuration
 * Merges environment variables with default configuration
 */
export function getMqttConfig(): MqttBrokerConfig {
  return defaultMqttConfig;
}

/**
 * Get MQTT options for connecting to the broker
 * This transforms the broker configuration into the format expected by the MQTT client
 */
export function getMqttOptions() {
  const config = getMqttConfig();
  
  // Generate client ID with prefix and random suffix for uniqueness
  const clientId = `${config.clientIdPrefix}-${Math.floor(Math.random() * 10000)}`;
  
  // Base options
  const options: any = {
    clientId,
    keepalive: config.keepalive,
    clean: config.cleanSession,
    reconnectPeriod: config.reconnectPeriod,
    connectTimeout: config.connectTimeout,
    rejectUnauthorized: config.rejectUnauthorized
  };
  
  // Add authentication if enabled
  if (config.authEnabled) {
    if (config.authMethod === MqttAuthMethod.BASIC && config.username) {
      options.username = config.username;
      options.password = config.password;
    } else if (config.authMethod === MqttAuthMethod.TOKEN && config.token) {
      options.username = 'token';
      options.password = config.token;
    }
  }
  
  // Add TLS configuration if enabled
  if (config.tlsEnabled) {
    options.protocol = 'mqtts';
    
    // Add certificates if paths are provided
    if (config.tlsCertPath && config.tlsKeyPath) {
      options.cert = config.tlsCertPath;
      options.key = config.tlsKeyPath;
      
      if (config.tlsCaPath) {
        options.ca = config.tlsCaPath;
      }
    }
  }
  
  // Add will message if enabled
  if (config.willEnabled && config.willTopic) {
    options.will = {
      topic: config.willTopic,
      payload: config.willMessage,
      qos: config.willQos || 0,
      retain: config.willRetain || true
    };
  }
  
  return options;
}