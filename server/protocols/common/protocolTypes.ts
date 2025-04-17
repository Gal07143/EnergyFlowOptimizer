/**
 * Protocol Types and Interfaces
 * 
 * This file defines the common interface and types used across different
 * protocol implementations in the Energy Management System.
 */

import { QoSLevel } from '@shared/messageSchema';

// Protocol types supported by the EMS
export enum Protocol {
  MODBUS = 'modbus',
  OCPP = 'ocpp',
  EEBUS = 'eebus',
  SUNSPEC = 'sunspec',
  TCPIP = 'tcpip'
}

// Device types that can communicate with the EMS
export enum DeviceType {
  SOLAR_INVERTER = 'solar_inverter',
  BATTERY = 'battery',
  EV_CHARGER = 'ev_charger',
  HEAT_PUMP = 'heat_pump',
  SMART_METER = 'meter',
  LOAD_CONTROLLER = 'load_controller'
}

// Message directions for protocol communication
export enum MessageDirection {
  DEVICE_TO_SERVER = 'device_to_server',
  SERVER_TO_DEVICE = 'server_to_device',
  BIDIRECTIONAL = 'bidirectional'
}

// Connection state tracking
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// Common protocol configuration interface
export interface ProtocolConfig {
  protocol: Protocol;
  deviceType: DeviceType;
  deviceId: number;
  connectionParams: Record<string, any>;
  qosLevel?: QoSLevel;
  retainMessages?: boolean;
  reconnectStrategy?: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
  authConfig?: {
    method: 'none' | 'basic' | 'token' | 'certificate';
    username?: string;
    password?: string;
    token?: string;
    certPath?: string;
    keyPath?: string;
  };
}

// Data mapping rule interface
export interface DataMappingRule {
  sourceField: string;
  targetField: string;
  transformation?: 'none' | 'scale' | 'lookup' | 'custom';
  transformationParams?: Record<string, any>;
}

// Protocol message interface
export interface ProtocolMessage {
  direction: MessageDirection;
  timestamp: string;
  payload: any;
  metadata?: Record<string, any>;
}

// Protocol handler interface
export interface ProtocolHandler {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionState(): ConnectionState;
  sendMessage(message: ProtocolMessage): Promise<boolean>;
  receiveMessage(): Promise<ProtocolMessage | null>;
  registerMessageHandler(callback: (message: ProtocolMessage) => void): void;
  unregisterMessageHandler(callback: (message: ProtocolMessage) => void): void;
}

// Protocol bridge interface
export interface ProtocolBridge {
  sourceProtocol: Protocol;
  targetProtocol: string; // Usually 'mqtt'
  mappingRules: DataMappingRule[];
  bridgeTelemetry(data: any): Promise<void>;
  bridgeStatus(status: string, details?: string): Promise<void>;
  bridgeCommand(command: string, params: any): Promise<void>;
  bridgeCommandResponse(command: string, success: boolean, result?: any, error?: string): Promise<void>;
}

// Protocol adapter factory interface
export interface ProtocolAdapterFactory {
  createAdapter(config: ProtocolConfig): ProtocolHandler;
  getSupportedProtocols(): Protocol[];
  getSupportedDeviceTypes(): DeviceType[];
}