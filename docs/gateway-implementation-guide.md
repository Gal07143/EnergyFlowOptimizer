# Gateway Implementation Guide

This guide provides code examples and implementation details for the gateway-based device connectivity approach outlined in the Device Connectivity Plan.

## 1. Gateway Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Gateway Device                          │
├────────────┬─────────────┬────────────────┬───────────────────┤
│ Protocol   │ Device      │ Data           │ Communication     │
│ Adapters   │ Manager     │ Processor      │ Manager           │
├────────────┼─────────────┼────────────────┼───────────────────┤
│ - Modbus   │ - Discovery │ - Buffering    │ - MQTT Client     │
│ - OCPP     │ - Lifecycle │ - Aggregation  │ - Authentication  │
│ - SunSpec  │ - Status    │ - Normalization│ - TLS Security    │
│ - Proprietary│- Config   │ - Validation   │ - Reconnection    │
├────────────┴─────────────┴────────────────┴───────────────────┤
│                   Local Control & Safety Logic                  │
├────────────────────────────────────────────────────────────────┤
│                    System Management                            │
│  - Update Manager  - Diagnostics  - Configuration Interface     │
└────────────────────────────────────────────────────────────────┘
```

## 2. Gateway Configuration File Example

```json
{
  "gatewayId": "gw-123456",
  "siteId": 42,
  "cloud": {
    "mqttBroker": "mqtt.ems-platform.com",
    "mqttPort": 8883,
    "useTls": true,
    "username": "gateway-123456",
    "passwordEnv": "MQTT_PASSWORD",
    "clientId": "gateway-123456",
    "reconnectInterval": 5000,
    "maxReconnectInterval": 300000,
    "keepAliveInterval": 60
  },
  "localControl": {
    "enabledModules": ["safetyMonitor", "loadBalancer"],
    "offlineOperationMode": "conservative"
  },
  "deviceScan": {
    "enableAutoDiscovery": true,
    "scanIntervals": {
      "modbus": 3600000,
      "network": 86400000
    }
  },
  "devices": [
    {
      "id": "inv-001",
      "name": "Solar Inverter 1",
      "type": "solar_inverter",
      "protocol": "modbus",
      "enabled": true,
      "connection": {
        "type": "tcp",
        "host": "192.168.1.100",
        "port": 502,
        "unitId": 1,
        "timeout": 3000,
        "retries": 3
      },
      "templateId": "sma-sunny-tripower",
      "scanInterval": 5000
    },
    {
      "id": "bat-001",
      "name": "Battery System",
      "type": "battery",
      "protocol": "modbus",
      "enabled": true,
      "connection": {
        "type": "rtu",
        "serialPort": "/dev/ttyUSB0",
        "baudRate": 9600,
        "dataBits": 8,
        "parity": "none",
        "stopBits": 1,
        "unitId": 1,
        "timeout": 3000,
        "retries": 3
      },
      "templateId": "byd-battery-box",
      "scanInterval": 1000
    }
  ]
}
```

## 3. Modbus Device Templates Example

```json
{
  "templateId": "sma-sunny-tripower",
  "manufacturer": "SMA",
  "model": "Sunny Tripower",
  "deviceType": "solar_inverter",
  "protocol": "modbus",
  "registers": [
    {
      "name": "activePower",
      "address": 30775,
      "type": "int32",
      "unit": "W",
      "scaling": 1,
      "description": "Current active power output"
    },
    {
      "name": "dailyYield",
      "address": 30517,
      "type": "uint32",
      "unit": "Wh",
      "scaling": 1,
      "description": "Energy generated today"
    },
    {
      "name": "totalYield",
      "address": 30513,
      "type": "uint32",
      "unit": "kWh",
      "scaling": 1,
      "description": "Total energy generated"
    },
    {
      "name": "dcVoltage1",
      "address": 30771,
      "type": "int32",
      "unit": "V",
      "scaling": 0.01,
      "description": "DC voltage input 1"
    },
    {
      "name": "dcCurrent1",
      "address": 30769,
      "type": "int32",
      "unit": "A",
      "scaling": 0.001,
      "description": "DC current input 1"
    },
    {
      "name": "gridFrequency",
      "address": 30803,
      "type": "uint32",
      "unit": "Hz",
      "scaling": 0.01,
      "description": "Grid frequency"
    },
    {
      "name": "operatingStatus",
      "address": 30201,
      "type": "uint32",
      "description": "Current operating status",
      "mapping": {
        "307": "Off",
        "308": "Fault",
        "309": "Waiting to start",
        "310": "Starting",
        "311": "MPP",
        "312": "Derating"
      }
    }
  ]
}
```

## 4. Gateway Implementation Examples

### 4.1 Modbus Device Adapter

```typescript
// server/gateway/adapters/modbusAdapter.ts

import ModbusRTU from 'modbus-serial';
import { EventEmitter } from 'events';
import { DeviceTemplate, DeviceConfig } from '../types';
import { getLogger } from '../util/logger';

const logger = getLogger('ModbusAdapter');

export class ModbusAdapter {
  private client: ModbusRTU | null = null;
  private connected: boolean = false;
  private template: DeviceTemplate;
  private config: DeviceConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectCount: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly baseReconnectInterval = 1000; // 1 second
  private eventEmitter = new EventEmitter();

  constructor(template: DeviceTemplate, config: DeviceConfig) {
    this.template = template;
    this.config = config;
    this.client = new ModbusRTU();
  }

  async connect(): Promise<boolean> {
    if (this.connected) {
      return true;
    }

    try {
      this.client = new ModbusRTU();

      const connectionConfig = this.config.connection;
      if (connectionConfig.type === 'tcp') {
        await this.client.connectTCP(
          connectionConfig.host, 
          { port: connectionConfig.port || 502 }
        );
      } else if (connectionConfig.type === 'rtu') {
        await this.client.connectRTUBuffered(
          connectionConfig.serialPort, 
          { 
            baudRate: connectionConfig.baudRate || 9600,
            dataBits: connectionConfig.dataBits || 8,
            parity: connectionConfig.parity || 'none',
            stopBits: connectionConfig.stopBits || 1
          }
        );
      } else {
        throw new Error(`Unsupported connection type: ${connectionConfig.type}`);
      }

      this.client.setID(connectionConfig.unitId || 1);
      this.client.setTimeout(connectionConfig.timeout || 3000);
      
      this.connected = true;
      this.reconnectCount = 0;
      
      logger.info(`Connected to Modbus device ${this.config.id}`);
      this.eventEmitter.emit('connected', this.config.id);
      
      return true;
    } catch (error) {
      logger.error(`Failed to connect to Modbus device ${this.config.id}:`, error);
      this.connected = false;
      
      // Schedule reconnect with exponential backoff
      await this.scheduleReconnect();
      
      return false;
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectCount >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error(`Max reconnect attempts reached for device ${this.config.id}`);
      this.eventEmitter.emit('max_reconnect_reached', this.config.id);
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      30000, // Max 30 seconds
      this.baseReconnectInterval * Math.pow(1.5, this.reconnectCount) *
        (0.9 + Math.random() * 0.2) // Add 10% jitter
    );

    this.reconnectCount++;
    logger.info(`Scheduling reconnect for device ${this.config.id} in ${Math.round(delay)}ms (attempt ${this.reconnectCount})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error(`Reconnect attempt failed for device ${this.config.id}:`, error);
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client && this.connected) {
      try {
        await this.client.close();
        logger.info(`Disconnected from Modbus device ${this.config.id}`);
      } catch (error) {
        logger.error(`Error disconnecting from Modbus device ${this.config.id}:`, error);
      } finally {
        this.connected = false;
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Reads all registers defined in the device template
   */
  async readAllRegisters(): Promise<Record<string, any>> {
    if (!this.connected || !this.client) {
      throw new Error('Device not connected');
    }

    const results: Record<string, any> = {
      deviceId: this.config.id,
      timestamp: new Date().toISOString()
    };

    for (const register of this.template.registers) {
      try {
        let value: number | boolean;

        switch (register.type) {
          case 'int16':
            value = await this.readInt16(register.address);
            break;
          case 'uint16':
            value = await this.readUint16(register.address);
            break;
          case 'int32':
            value = await this.readInt32(register.address);
            break;
          case 'uint32':
            value = await this.readUint32(register.address);
            break;
          case 'float32':
            value = await this.readFloat32(register.address);
            break;
          case 'coil':
            value = await this.readCoil(register.address);
            break;
          default:
            logger.warn(`Unsupported register type: ${register.type}`);
            continue;
        }

        // Apply scaling if defined
        if (register.scaling && typeof value === 'number') {
          value = value * register.scaling;
        }

        // Apply mapping if defined
        if (register.mapping && typeof value !== 'boolean') {
          const mappedValue = register.mapping[value];
          if (mappedValue !== undefined) {
            value = mappedValue;
          }
        }

        results[register.name] = value;
      } catch (error) {
        logger.error(`Error reading register ${register.name} (${register.address}):`, error);
        results[register.name] = null;
      }
    }

    return results;
  }

  /**
   * Write a value to a register
   */
  async writeRegister(registerName: string, value: number | boolean): Promise<boolean> {
    if (!this.connected || !this.client) {
      throw new Error('Device not connected');
    }

    const register = this.template.registers.find(r => r.name === registerName);
    if (!register) {
      throw new Error(`Register ${registerName} not found in template`);
    }

    try {
      // Convert mapped values back to numbers
      if (register.mapping && typeof value === 'string') {
        const invertedMapping = Object.entries(register.mapping)
          .reduce((acc, [k, v]) => ({...acc, [v]: parseInt(k)}), {});
        
        if (invertedMapping[value] !== undefined) {
          value = invertedMapping[value];
        }
      }

      // Apply reverse scaling if needed
      if (register.scaling && typeof value === 'number') {
        value = value / register.scaling;
      }

      switch (register.type) {
        case 'int16':
        case 'uint16':
          if (typeof value !== 'number') throw new Error('Value must be a number');
          await this.client.writeRegister(register.address, value);
          break;
        case 'int32':
        case 'uint32':
        case 'float32':
          if (typeof value !== 'number') throw new Error('Value must be a number');
          await this.client.writeRegisters(register.address, this.floatToRegisters(value));
          break;
        case 'coil':
          if (typeof value !== 'boolean') throw new Error('Value must be a boolean');
          await this.client.writeCoil(register.address, value);
          break;
        default:
          throw new Error(`Unsupported register type for writing: ${register.type}`);
      }

      logger.info(`Successfully wrote value ${value} to register ${registerName}`);
      return true;
    } catch (error) {
      logger.error(`Error writing to register ${registerName}:`, error);
      return false;
    }
  }

  private async readInt16(address: number): Promise<number> {
    const result = await this.client!.readHoldingRegisters(address, 1);
    // Convert to signed integer if needed
    let value = result.data[0];
    if (value > 32767) value -= 65536;
    return value;
  }

  private async readUint16(address: number): Promise<number> {
    const result = await this.client!.readHoldingRegisters(address, 1);
    return result.data[0];
  }

  private async readInt32(address: number): Promise<number> {
    const result = await this.client!.readHoldingRegisters(address, 2);
    // Combine two 16-bit registers into one 32-bit value
    // Most significant register first (big-endian)
    let value = (result.data[0] << 16) | result.data[1];
    // Convert to signed integer if needed
    if (value > 2147483647) value -= 4294967296;
    return value;
  }

  private async readUint32(address: number): Promise<number> {
    const result = await this.client!.readHoldingRegisters(address, 2);
    // Combine two 16-bit registers into one 32-bit value
    return (result.data[0] << 16) | result.data[1];
  }

  private async readFloat32(address: number): Promise<number> {
    const result = await this.client!.readHoldingRegisters(address, 2);
    // Convert two 16-bit registers to float32
    const buf = Buffer.alloc(4);
    buf.writeUInt16BE(result.data[0], 0);
    buf.writeUInt16BE(result.data[1], 2);
    return buf.readFloatBE(0);
  }

  private async readCoil(address: number): Promise<boolean> {
    const result = await this.client!.readCoils(address, 1);
    return result.data[0];
  }

  private floatToRegisters(value: number): number[] {
    const buf = Buffer.alloc(4);
    buf.writeFloatBE(value, 0);
    return [buf.readUInt16BE(0), buf.readUInt16BE(2)];
  }
}
```

### 4.2 Gateway MQTT Client

```typescript
// server/gateway/communication/mqttClient.ts

import * as mqtt from 'async-mqtt';
import { EventEmitter } from 'events';
import { getLogger } from '../util/logger';

const logger = getLogger('MqttClient');

export interface MqttConfig {
  brokerUrl: string;
  clientId: string;
  username?: string;
  password?: string;
  useTls: boolean;
  reconnectInterval: number;
  maxReconnectInterval: number;
}

export class MqttClient {
  private client: mqtt.AsyncMqttClient | null = null;
  private config: MqttConfig;
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectCount: number = 0;
  private eventEmitter = new EventEmitter();
  private subscriptions: Set<string> = new Set();
  private messageBuffer: Array<{topic: string, payload: any, options?: any}> = [];
  private readonly MAX_BUFFER_SIZE = 1000;

  constructor(config: MqttConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    if (this.connected) {
      return true;
    }

    try {
      const protocol = this.config.useTls ? 'mqtts://' : 'mqtt://';
      const brokerUrl = `${protocol}${this.config.brokerUrl}`;
      
      logger.info(`Connecting to MQTT broker at ${brokerUrl}`);
      
      this.client = await mqtt.connectAsync(brokerUrl, {
        clientId: this.config.clientId,
        username: this.config.username,
        password: this.config.password,
        rejectUnauthorized: true,
        reconnectPeriod: 0, // We'll handle reconnection ourselves
        keepalive: 60
      });
      
      this.client.on('message', (topic, payload) => {
        try {
          let message: any;
          try {
            message = JSON.parse(payload.toString());
          } catch (e) {
            message = payload.toString();
          }
          this.eventEmitter.emit('message', topic, message);
        } catch (error) {
          logger.error('Error handling MQTT message:', error);
        }
      });
      
      this.client.on('error', (error) => {
        logger.error('MQTT client error:', error);
        this.eventEmitter.emit('error', error);
      });
      
      this.client.on('close', () => {
        logger.warn('MQTT connection closed');
        this.connected = false;
        this.scheduleReconnect();
        this.eventEmitter.emit('disconnected');
      });
      
      this.connected = true;
      this.reconnectCount = 0;
      
      // Resubscribe to all previous topics
      await this.resubscribe();
      
      // Publish any buffered messages
      await this.publishBuffer();
      
      logger.info('Connected to MQTT broker');
      this.eventEmitter.emit('connected');
      
      return true;
    } catch (error) {
      logger.error('Failed to connect to MQTT broker:', error);
      this.connected = false;
      
      // Schedule reconnect with exponential backoff
      this.scheduleReconnect();
      
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.maxReconnectInterval,
      this.config.reconnectInterval * Math.pow(2, this.reconnectCount) *
        (0.9 + Math.random() * 0.2) // Add 10% jitter
    );

    this.reconnectCount++;
    logger.info(`Scheduling MQTT reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectCount})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('MQTT reconnect attempt failed:', error);
      }
    }, delay);
  }

  private async resubscribe(): Promise<void> {
    if (!this.connected || !this.client) return;

    const topics = Array.from(this.subscriptions);
    for (const topic of topics) {
      try {
        await this.client.subscribe(topic);
        logger.info(`Resubscribed to topic: ${topic}`);
      } catch (error) {
        logger.error(`Failed to resubscribe to topic ${topic}:`, error);
      }
    }
  }

  private async publishBuffer(): Promise<void> {
    if (!this.connected || !this.client) return;

    while (this.messageBuffer.length > 0) {
      const message = this.messageBuffer.shift();
      if (!message) continue;

      try {
        await this.client.publish(
          message.topic, 
          typeof message.payload === 'string' 
            ? message.payload 
            : JSON.stringify(message.payload), 
          message.options
        );
        logger.debug(`Published buffered message to ${message.topic}`);
      } catch (error) {
        logger.error(`Failed to publish buffered message to ${message.topic}:`, error);
        // Put it back in the buffer if it's important
        if (message.options?.qos > 0) {
          this.messageBuffer.unshift(message);
          break;
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client && this.connected) {
      try {
        await this.client.end();
        logger.info('Disconnected from MQTT broker');
      } catch (error) {
        logger.error('Error disconnecting from MQTT broker:', error);
      } finally {
        this.connected = false;
        this.client = null;
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async subscribe(topic: string): Promise<boolean> {
    this.subscriptions.add(topic);

    if (!this.connected || !this.client) {
      logger.warn(`Not connected, topic ${topic} will be subscribed upon reconnection`);
      return false;
    }

    try {
      await this.client.subscribe(topic);
      logger.info(`Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      logger.error(`Error subscribing to topic ${topic}:`, error);
      return false;
    }
  }

  async unsubscribe(topic: string): Promise<boolean> {
    this.subscriptions.delete(topic);

    if (!this.connected || !this.client) {
      return false;
    }

    try {
      await this.client.unsubscribe(topic);
      logger.info(`Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      logger.error(`Error unsubscribing from topic ${topic}:`, error);
      return false;
    }
  }

  async publish(topic: string, payload: any, options?: any): Promise<boolean> {
    if (!this.connected || !this.client) {
      // Buffer the message for later if the broker is unavailable
      if (this.messageBuffer.length < this.MAX_BUFFER_SIZE) {
        this.messageBuffer.push({ topic, payload, options });
        logger.debug(`Buffered message for topic ${topic} (buffer size: ${this.messageBuffer.length})`);
      } else {
        logger.warn(`Message buffer full, dropping message for topic ${topic}`);
      }
      return false;
    }

    try {
      await this.client.publish(
        topic, 
        typeof payload === 'string' ? payload : JSON.stringify(payload), 
        options
      );
      logger.debug(`Published message to ${topic}`);
      return true;
    } catch (error) {
      logger.error(`Error publishing to topic ${topic}:`, error);
      
      // Buffer the message for retry if it's important
      if (options?.qos > 0 && this.messageBuffer.length < this.MAX_BUFFER_SIZE) {
        this.messageBuffer.push({ topic, payload, options });
        logger.debug(`Buffered failed message for topic ${topic}`);
      }
      
      return false;
    }
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  getBufferSize(): number {
    return this.messageBuffer.length;
  }
}
```

### 4.3 Device Manager Implementation

```typescript
// server/gateway/deviceManager.ts

import { ModbusAdapter } from './adapters/modbusAdapter';
import { DeviceConfig, DeviceStatus, DeviceTemplate } from './types';
import { MqttClient } from './communication/mqttClient';
import { getLogger } from './util/logger';
import { readFileSync } from 'fs';
import path from 'path';

const logger = getLogger('DeviceManager');

export class DeviceManager {
  private devices: Map<string, {
    config: DeviceConfig;
    template: DeviceTemplate;
    adapter: ModbusAdapter;
    status: DeviceStatus;
    scanInterval: NodeJS.Timeout | null;
    lastReading: Record<string, any> | null;
  }> = new Map();
  
  private mqttClient: MqttClient;
  private gatewayId: string;
  private templateCache: Map<string, DeviceTemplate> = new Map();
  
  constructor(gatewayId: string, mqttClient: MqttClient) {
    this.gatewayId = gatewayId;
    this.mqttClient = mqttClient;
    
    // Set up MQTT message handlers
    this.mqttClient.on('message', this.handleMqttMessage.bind(this));
    
    // Subscribe to command topics
    this.mqttClient.subscribe(`gateways/${this.gatewayId}/commands`);
    this.mqttClient.subscribe(`devices/+/commands/request`);
  }
  
  private handleMqttMessage(topic: string, message: any): void {
    // Handle gateway commands
    if (topic === `gateways/${this.gatewayId}/commands`) {
      this.handleGatewayCommand(message);
      return;
    }
    
    // Handle device commands
    const deviceCommandMatch = topic.match(/^devices\/(.+)\/commands\/request$/);
    if (deviceCommandMatch) {
      const deviceId = deviceCommandMatch[1];
      this.handleDeviceCommand(deviceId, message);
      return;
    }
  }
  
  private handleGatewayCommand(command: any): void {
    if (!command || !command.action) {
      logger.warn('Received invalid gateway command:', command);
      return;
    }
    
    switch (command.action) {
      case 'scan_devices':
        this.scanForDevices();
        break;
      case 'restart':
        this.restartAllDevices();
        break;
      case 'device_discovery':
        this.startDeviceDiscovery();
        break;
      default:
        logger.warn(`Unknown gateway command: ${command.action}`);
    }
  }
  
  private async handleDeviceCommand(deviceId: string, command: any): Promise<void> {
    if (!command || !command.action) {
      logger.warn(`Received invalid command for device ${deviceId}:`, command);
      return;
    }
    
    const device = this.devices.get(deviceId);
    if (!device) {
      logger.warn(`Received command for unknown device ${deviceId}`);
      // Publish error response
      await this.mqttClient.publish(`devices/${deviceId}/commands/response`, {
        success: false,
        error: 'Device not found',
        command: command
      });
      return;
    }
    
    logger.info(`Handling command for device ${deviceId}: ${command.action}`);
    
    try {
      let result: any = null;
      let success = false;
      
      switch (command.action) {
        case 'restart':
          await device.adapter.disconnect();
          success = await device.adapter.connect();
          break;
        
        case 'read':
          if (!device.adapter.isConnected()) {
            throw new Error('Device not connected');
          }
          result = await device.adapter.readAllRegisters();
          success = true;
          break;
        
        case 'write':
          if (!command.register || command.value === undefined) {
            throw new Error('Missing register or value in write command');
          }
          if (!device.adapter.isConnected()) {
            throw new Error('Device not connected');
          }
          success = await device.adapter.writeRegister(command.register, command.value);
          break;
          
        default:
          throw new Error(`Unknown command action: ${command.action}`);
      }
      
      // Publish response
      await this.mqttClient.publish(`devices/${deviceId}/commands/response`, {
        success,
        result,
        command,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error(`Error handling command for device ${deviceId}:`, error);
      
      // Publish error response
      await this.mqttClient.publish(`devices/${deviceId}/commands/response`, {
        success: false,
        error: error.message,
        command,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  async loadDevices(configFile: string): Promise<void> {
    try {
      const configData = JSON.parse(readFileSync(configFile, 'utf8'));
      
      if (!Array.isArray(configData.devices)) {
        throw new Error('Invalid configuration: devices array missing');
      }
      
      for (const deviceConfig of configData.devices) {
        if (deviceConfig.enabled !== false) {
          await this.addDevice(deviceConfig);
        }
      }
      
    } catch (error) {
      logger.error(`Error loading devices from ${configFile}:`, error);
      throw error;
    }
  }
  
  private async loadTemplate(templateId: string): Promise<DeviceTemplate> {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }
    
    // Load template from file system
    try {
      const templatePath = path.join(process.cwd(), 'templates', `${templateId}.json`);
      const templateData = JSON.parse(readFileSync(templatePath, 'utf8'));
      
      // Validate template
      if (!templateData.templateId || !templateData.deviceType || !templateData.registers) {
        throw new Error(`Invalid template format for ${templateId}`);
      }
      
      this.templateCache.set(templateId, templateData);
      return templateData;
    } catch (error) {
      logger.error(`Error loading template ${templateId}:`, error);
      throw error;
    }
  }
  
  async addDevice(config: DeviceConfig): Promise<boolean> {
    if (this.devices.has(config.id)) {
      logger.warn(`Device ${config.id} already exists`);
      return false;
    }
    
    try {
      // Load device template
      const template = await this.loadTemplate(config.templateId);
      
      // Create adapter based on protocol
      let adapter: ModbusAdapter;
      
      if (config.protocol === 'modbus') {
        adapter = new ModbusAdapter(template, config);
      } else {
        throw new Error(`Unsupported protocol: ${config.protocol}`);
      }
      
      // Set up event handlers
      adapter.on('connected', () => {
        this.updateDeviceStatus(config.id, 'online');
      });
      
      adapter.on('max_reconnect_reached', () => {
        this.updateDeviceStatus(config.id, 'offline');
      });
      
      // Add device to collection
      this.devices.set(config.id, {
        config,
        template,
        adapter,
        status: 'initializing',
        scanInterval: null,
        lastReading: null
      });
      
      // Connect to device
      const connected = await adapter.connect();
      
      // Set initial status
      this.updateDeviceStatus(config.id, connected ? 'online' : 'connecting');
      
      // Start regular scanning if connected
      if (connected) {
        this.startDeviceScanning(config.id);
      }
      
      logger.info(`Added device ${config.id} (${config.name})`);
      
      // Publish device added event
      await this.mqttClient.publish(`gateways/${this.gatewayId}/events`, {
        event: 'device_added',
        deviceId: config.id,
        deviceType: config.type,
        status: connected ? 'online' : 'connecting',
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error(`Error adding device ${config.id}:`, error);
      return false;
    }
  }
  
  async removeDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      logger.warn(`Cannot remove: Device ${deviceId} not found`);
      return false;
    }
    
    try {
      // Stop scanning
      if (device.scanInterval) {
        clearInterval(device.scanInterval);
      }
      
      // Disconnect
      await device.adapter.disconnect();
      
      // Remove from collection
      this.devices.delete(deviceId);
      
      logger.info(`Removed device ${deviceId}`);
      
      // Publish device removed event
      await this.mqttClient.publish(`gateways/${this.gatewayId}/events`, {
        event: 'device_removed',
        deviceId,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error(`Error removing device ${deviceId}:`, error);
      return false;
    }
  }
  
  private updateDeviceStatus(deviceId: string, status: DeviceStatus): void {
    const device = this.devices.get(deviceId);
    if (!device) {
      return;
    }
    
    if (device.status !== status) {
      device.status = status;
      logger.info(`Device ${deviceId} status changed to ${status}`);
      
      // Publish status update
      this.mqttClient.publish(`devices/${deviceId}/status`, {
        status,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  private startDeviceScanning(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) {
      return;
    }
    
    // Clear existing interval if any
    if (device.scanInterval) {
      clearInterval(device.scanInterval);
    }
    
    // Get scan interval from config or default
    const scanInterval = device.config.scanInterval || 5000;
    
    // Start regular scanning
    device.scanInterval = setInterval(async () => {
      if (!device.adapter.isConnected()) {
        // Try to reconnect
        const connected = await device.adapter.connect();
        if (!connected) {
          return;
        }
      }
      
      try {
        // Read all registers
        const readings = await device.adapter.readAllRegisters();
        
        // Update last reading
        device.lastReading = readings;
        
        // Publish telemetry
        await this.mqttClient.publish(`devices/${deviceId}/telemetry`, {
          ...readings,
          gatewayId: this.gatewayId
        });
        
        // Check if we need to publish to type-specific topics
        if (device.config.type === 'solar_inverter' && readings.activePower !== undefined) {
          await this.mqttClient.publish(`devices/${deviceId}/solar/production`, {
            production: readings.activePower,
            daily: readings.dailyYield,
            total: readings.totalYield,
            timestamp: readings.timestamp
          });
        } else if (device.config.type === 'battery' && readings.stateOfCharge !== undefined) {
          await this.mqttClient.publish(`devices/${deviceId}/battery/soc`, {
            soc: readings.stateOfCharge,
            power: readings.power || 0,
            timestamp: readings.timestamp
          });
        }
        
      } catch (error) {
        logger.error(`Error scanning device ${deviceId}:`, error);
        
        // Update status if too many consecutive errors
        // (This would be more sophisticated in a real implementation)
        this.updateDeviceStatus(deviceId, 'error');
      }
    }, scanInterval);
    
    logger.info(`Started scanning device ${deviceId} every ${scanInterval}ms`);
  }
  
  async restartAllDevices(): Promise<void> {
    for (const [deviceId, device] of this.devices.entries()) {
      try {
        // Disconnect
        await device.adapter.disconnect();
        
        // Connect again
        const connected = await device.adapter.connect();
        
        // Update status
        this.updateDeviceStatus(deviceId, connected ? 'online' : 'error');
        
        // Restart scanning if connected
        if (connected && device.scanInterval) {
          clearInterval(device.scanInterval);
          this.startDeviceScanning(deviceId);
        }
        
        logger.info(`Restarted device ${deviceId}`);
      } catch (error) {
        logger.error(`Error restarting device ${deviceId}:`, error);
      }
    }
  }
  
  async scanForDevices(): Promise<void> {
    // Implementation would depend on the protocols supported
    // For Modbus TCP, we could scan IP ranges
    // For serial protocols, we would check available ports
    logger.info('Scanning for devices...');
    
    // Publish event
    await this.mqttClient.publish(`gateways/${this.gatewayId}/events`, {
      event: 'scan_started',
      timestamp: new Date().toISOString()
    });
    
    // TODO: Implement actual scanning logic
    
    // Publish scan complete event
    await this.mqttClient.publish(`gateways/${this.gatewayId}/events`, {
      event: 'scan_completed',
      devicesFound: [],
      timestamp: new Date().toISOString()
    });
  }
  
  async startDeviceDiscovery(): Promise<void> {
    // Implementation for automatic device discovery
    logger.info('Starting device discovery...');
    
    // TODO: Implement discovery logic
  }
  
  getDeviceStatus(deviceId: string): DeviceStatus | null {
    const device = this.devices.get(deviceId);
    return device ? device.status : null;
  }
  
  getLastReading(deviceId: string): Record<string, any> | null {
    const device = this.devices.get(deviceId);
    return device ? device.lastReading : null;
  }
  
  getDeviceCount(): number {
    return this.devices.size;
  }
  
  getDeviceIds(): string[] {
    return Array.from(this.devices.keys());
  }
  
  async shutdown(): Promise<void> {
    logger.info('Shutting down device manager...');
    
    // Stop all scan intervals
    for (const device of this.devices.values()) {
      if (device.scanInterval) {
        clearInterval(device.scanInterval);
        device.scanInterval = null;
      }
    }
    
    // Disconnect all devices
    for (const [deviceId, device] of this.devices.entries()) {
      try {
        await device.adapter.disconnect();
        logger.info(`Disconnected device ${deviceId}`);
      } catch (error) {
        logger.error(`Error disconnecting device ${deviceId}:`, error);
      }
    }
    
    // Clear devices collection
    this.devices.clear();
  }
}
```

### 4.4 Gateway Main Application

```typescript
// server/gateway/index.ts

import { DeviceManager } from './deviceManager';
import { MqttClient } from './communication/mqttClient';
import { getLogger } from './util/logger';
import { readFileSync } from 'fs';
import path from 'path';

const logger = getLogger('Gateway');

class Gateway {
  private config: any;
  private mqttClient: MqttClient;
  private deviceManager: DeviceManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(configPath: string) {
    // Load configuration
    try {
      this.config = JSON.parse(readFileSync(configPath, 'utf8'));
      logger.info(`Loaded configuration from ${configPath}`);
    } catch (error) {
      logger.error(`Error loading configuration from ${configPath}:`, error);
      throw error;
    }
    
    // Set up MQTT client
    this.mqttClient = new MqttClient({
      brokerUrl: this.config.cloud.mqttBroker,
      clientId: this.config.cloud.clientId || `gateway-${this.config.gatewayId}`,
      username: this.config.cloud.username,
      password: process.env[this.config.cloud.passwordEnv] || this.config.cloud.password,
      useTls: this.config.cloud.useTls !== false,
      reconnectInterval: this.config.cloud.reconnectInterval || 5000,
      maxReconnectInterval: this.config.cloud.maxReconnectInterval || 300000
    });
    
    // Set up device manager
    this.deviceManager = new DeviceManager(this.config.gatewayId, this.mqttClient);
    
    // Set up shutdown handler
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }
  
  async start(): Promise<void> {
    logger.info(`Starting gateway ${this.config.gatewayId}...`);
    
    // Connect to MQTT broker
    const connected = await this.mqttClient.connect();
    if (!connected) {
      logger.warn('Failed to connect to MQTT broker, will retry automatically');
    }
    
    // Subscribe to gateway command topics
    await this.mqttClient.subscribe(`gateways/${this.config.gatewayId}/commands`);
    
    // Load devices
    if (this.config.devices && this.config.devices.length > 0) {
      for (const deviceConfig of this.config.devices) {
        if (deviceConfig.enabled !== false) {
          await this.deviceManager.addDevice(deviceConfig);
        }
      }
    } else {
      logger.warn('No devices configured');
    }
    
    // Start heartbeat
    this.startHeartbeat();
    
    logger.info(`Gateway ${this.config.gatewayId} started`);
    
    // Publish gateway online event
    await this.mqttClient.publish(`gateways/${this.config.gatewayId}/status`, {
      status: 'online',
      deviceCount: this.deviceManager.getDeviceCount(),
      version: process.env.GATEWAY_VERSION || '1.0.0',
      timestamp: new Date().toISOString()
    }, { retain: true });
  }
  
  private startHeartbeat(): void {
    // Clear existing interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Start sending heartbeats
    const interval = this.config.cloud.heartbeatInterval || 60000;
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.mqttClient.isConnected()) {
          await this.mqttClient.publish(`gateways/${this.config.gatewayId}/heartbeat`, {
            timestamp: new Date().toISOString(),
            deviceCount: this.deviceManager.getDeviceCount(),
            deviceIds: this.deviceManager.getDeviceIds(),
            bufferSize: this.mqttClient.getBufferSize()
          });
        }
      } catch (error) {
        logger.error('Error sending heartbeat:', error);
      }
    }, interval);
    
    logger.info(`Started heartbeat every ${interval}ms`);
  }
  
  async shutdown(): Promise<void> {
    logger.info('Shutting down gateway...');
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Publish offline status
    if (this.mqttClient.isConnected()) {
      await this.mqttClient.publish(`gateways/${this.config.gatewayId}/status`, {
        status: 'offline',
        timestamp: new Date().toISOString()
      }, { retain: true });
    }
    
    // Shutdown device manager
    await this.deviceManager.shutdown();
    
    // Disconnect MQTT client
    await this.mqttClient.disconnect();
    
    logger.info('Gateway shutdown complete');
    process.exit(0);
  }
}

// Start the gateway
if (require.main === module) {
  const configPath = process.env.GATEWAY_CONFIG || path.join(process.cwd(), 'config', 'gateway.json');
  const gateway = new Gateway(configPath);
  
  gateway.start().catch((error) => {
    logger.error('Error starting gateway:', error);
    process.exit(1);
  });
}

export default Gateway;
```

## 5. EMS Platform Integration Components

### 5.1 Gateway Device Registration API

```typescript
// server/controllers/gatewayController.ts

import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { gateways, gatewayDevices } from '../schema';
import { eq, and } from 'drizzle-orm';
import { getMqttService } from '../services/mqttService';
import { getDeviceManagementService } from '../services/deviceManagementService';

// Schema for gateway registration
const gatewayRegistrationSchema = z.object({
  gatewayId: z.string().min(1),
  name: z.string().min(1),
  siteId: z.number().int(),
  description: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional()
  }).optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  version: z.string().optional()
});

// Gateway device association schema
const gatewayDeviceSchema = z.object({
  gatewayId: z.string().min(1),
  deviceId: z.number().int(),
  localId: z.string().min(1)
});

export const gatewayController = {
  // Register a new gateway
  async registerGateway(req: Request, res: Response) {
    try {
      const validation = gatewayRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
      }

      const gatewayData = validation.data;

      // Check if gateway already exists
      const existingGateway = await db.select()
        .from(gateways)
        .where(eq(gateways.gatewayId, gatewayData.gatewayId))
        .limit(1);

      if (existingGateway.length > 0) {
        return res.status(409).json({ error: 'Gateway ID already exists' });
      }

      // Insert new gateway
      const [newGateway] = await db.insert(gateways)
        .values({
          gatewayId: gatewayData.gatewayId,
          name: gatewayData.name,
          siteId: gatewayData.siteId,
          description: gatewayData.description || '',
          latitude: gatewayData.location?.latitude,
          longitude: gatewayData.location?.longitude,
          address: gatewayData.location?.address,
          model: gatewayData.model || '',
          manufacturer: gatewayData.manufacturer || '',
          version: gatewayData.version || '1.0.0',
          status: 'provisioned',
          lastSeenAt: new Date().toISOString()
        })
        .returning();

      // Generate credentials and return
      const credentials = {
        username: `gateway-${gatewayData.gatewayId}`,
        password: generateSecurePassword(),
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt.ems-platform.com',
        port: parseInt(process.env.MQTT_BROKER_PORT || '8883'),
        useTls: process.env.MQTT_USE_TLS !== 'false'
      };

      // Store credentials securely (implementation depends on your system)
      await storeGatewayCredentials(gatewayData.gatewayId, credentials);

      // Subscribe to gateway topics
      const mqttService = getMqttService();
      await mqttService.subscribe(`gateways/${gatewayData.gatewayId}/status`);
      await mqttService.subscribe(`gateways/${gatewayData.gatewayId}/events`);
      await mqttService.subscribe(`gateways/${gatewayData.gatewayId}/heartbeat`);

      return res.status(201).json({
        gateway: newGateway,
        credentials
      });
    } catch (error) {
      console.error('Error registering gateway:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Associate a device with a gateway
  async associateDevice(req: Request, res: Response) {
    try {
      const validation = gatewayDeviceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
      }

      const { gatewayId, deviceId, localId } = validation.data;

      // Check if gateway exists
      const existingGateway = await db.select()
        .from(gateways)
        .where(eq(gateways.gatewayId, gatewayId))
        .limit(1);

      if (existingGateway.length === 0) {
        return res.status(404).json({ error: 'Gateway not found' });
      }

      // Check if device exists
      const deviceManagementService = getDeviceManagementService();
      const device = deviceManagementService.getDevice(deviceId);

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Check if association already exists
      const existingAssociation = await db.select()
        .from(gatewayDevices)
        .where(
          and(
            eq(gatewayDevices.gatewayId, gatewayId),
            eq(gatewayDevices.deviceId, deviceId)
          )
        )
        .limit(1);

      if (existingAssociation.length > 0) {
        return res.status(409).json({ error: 'Device already associated with this gateway' });
      }

      // Create association
      const [association] = await db.insert(gatewayDevices)
        .values({
          gatewayId,
          deviceId,
          localId,
          status: 'configured',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      // Update device connection path in device management service
      await deviceManagementService.updateDevice(deviceId, {
        connectionPath: `gateway:${gatewayId}`
      });

      return res.status(201).json(association);
    } catch (error) {
      console.error('Error associating device with gateway:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // List all gateways
  async listGateways(req: Request, res: Response) {
    try {
      const allGateways = await db.select().from(gateways);
      return res.json(allGateways);
    } catch (error) {
      console.error('Error listing gateways:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get gateway by ID
  async getGateway(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [gateway] = await db.select()
        .from(gateways)
        .where(eq(gateways.gatewayId, id))
        .limit(1);

      if (!gateway) {
        return res.status(404).json({ error: 'Gateway not found' });
      }

      // Get associated devices
      const devices = await db.select()
        .from(gatewayDevices)
        .where(eq(gatewayDevices.gatewayId, id));

      return res.json({
        ...gateway,
        devices
      });
    } catch (error) {
      console.error('Error getting gateway:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Send command to gateway
  async sendCommand(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { command, params } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      // Check if gateway exists
      const [gateway] = await db.select()
        .from(gateways)
        .where(eq(gateways.gatewayId, id))
        .limit(1);

      if (!gateway) {
        return res.status(404).json({ error: 'Gateway not found' });
      }

      // Send command to gateway via MQTT
      const mqttService = getMqttService();
      const commandId = generateCommandId();
      const payload = {
        commandId,
        action: command,
        params: params || {},
        timestamp: new Date().toISOString()
      };

      await mqttService.publish(`gateways/${id}/commands`, payload);

      return res.json({
        success: true,
        commandId,
        message: `Command sent to gateway ${id}`
      });
    } catch (error) {
      console.error('Error sending command to gateway:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Helper functions
function generateSecurePassword(): string {
  const length = 24;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function storeGatewayCredentials(gatewayId: string, credentials: any): Promise<void> {
  // Implementation depends on your system's security requirements
  // This could use a secure credential store, a database with encrypted fields, etc.
  console.log(`Storing credentials for gateway ${gatewayId}`);
}
```

## 6. Adding Gateway Routes

```typescript
// server/routes.ts

// Add gateway routes
router.post('/api/gateways', authenticate, gatewayController.registerGateway);
router.get('/api/gateways', authenticate, gatewayController.listGateways);
router.get('/api/gateways/:id', authenticate, gatewayController.getGateway);
router.post('/api/gateways/:id/command', authenticate, gatewayController.sendCommand);
router.post('/api/gateways/devices', authenticate, gatewayController.associateDevice);