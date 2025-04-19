/**
 * Device Adapter Factory
 * 
 * Creates the appropriate device adapter based on the device type and protocol,
 * integrating it with the protocol bridge for standardized communication.
 */

import { getProtocolBridgeManager, ProtocolBridgeConfig } from './protocolBridgeAdapter';
import { QoSLevel } from '@shared/messageSchema';

// Device type enumeration
export enum DeviceType {
  SOLAR_INVERTER = 'solar_inverter',
  BATTERY = 'battery',
  EV_CHARGER = 'ev_charger',
  HEAT_PUMP = 'heat_pump',
  SMART_METER = 'meter',
  LOAD_CONTROLLER = 'load_controller'
}

// Protocol enumeration
export enum Protocol {
  MODBUS = 'modbus',
  OCPP = 'ocpp',
  EEBUS = 'eebus', 
  SUNSPEC = 'sunspec',
  TCPIP = 'tcpip'
}

// Device adapter interface
export interface DeviceAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  readData(): Promise<any>;
  writeData(params: any): Promise<boolean>;
  getDeviceInfo(): { deviceId: number; deviceType: string; };
  isConnected(): boolean;
}

// Base device adapter with protocol bridge functionality
export abstract class BaseDeviceAdapter implements DeviceAdapter {
  protected deviceId: number;
  protected deviceType: string;
  protected protocol: Protocol;
  protected bridgeManager = getProtocolBridgeManager();
  protected connected: boolean = false;
  protected bridgeConnected: boolean = false;
  protected connectionAttempts: number = 0;
  protected maxConnectionAttempts: number = 5;
  protected reconnectInterval: number = 5000; // Initial reconnect interval
  protected maxReconnectInterval: number = 60000; // Max 1 minute between reconnects
  protected connectionTimeout: NodeJS.Timeout | null = null;

  constructor(deviceId: number, deviceType: string, protocol: Protocol) {
    this.deviceId = deviceId;
    this.deviceType = deviceType;
    this.protocol = protocol;
  }

  // Setup protocol bridge for standardized communication
  protected setupProtocolBridge(): void {
    // Configure bridge based on device type
    const bridgeConfig: ProtocolBridgeConfig = {
      sourceProtocol: this.protocol,
      targetProtocol: 'mqtt',
      deviceId: this.deviceId,
      deviceType: this.deviceType,
      qosLevel: QoSLevel.AT_LEAST_ONCE,
      retainMessages: this.shouldRetainMessages()
    };

    // Add mapping rules based on device type
    bridgeConfig.mappingRules = this.getDeviceSpecificMappingRules();

    // Create bridge
    this.bridgeManager.createBridge(bridgeConfig);
    this.bridgeConnected = true;

    console.log(`Protocol bridge set up for ${this.deviceType} (ID: ${this.deviceId}) using ${this.protocol} protocol`);
  }

  // Should message be retained (overridable)
  protected shouldRetainMessages(): boolean {
    return this.deviceType === 'battery' || 
           this.deviceType === 'meter' || 
           this.deviceType === 'solar_inverter';
  }

  // Get device-specific mapping rules (must be implemented by subclasses)
  protected abstract getDeviceSpecificMappingRules(): any[];

  // Common methods
  // Attempt to connect with exponential backoff retry logic
  async connect(): Promise<boolean> {
    try {
      if (this.connected) {
        return true;
      }
      
      this.connectionAttempts += 1;
      console.log(`Connection attempt ${this.connectionAttempts} for ${this.deviceType} device ${this.deviceId}`);
      
      // Implementation-specific connection logic handled by concrete adapters
      const result = await this.connectImplementation();
      
      if (result) {
        // Connection successful
        this.connected = true;
        this.connectionAttempts = 0;
        this.reconnectInterval = 5000; // Reset reconnect interval
        console.log(`Successfully connected to ${this.deviceType} device ${this.deviceId}`);
        
        // Setup protocol bridge if not already set up
        if (!this.bridgeConnected) {
          this.setupProtocolBridge();
        }
        
        // Clear any pending reconnection timeout
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        return true;
      } else {
        // Connection failed - schedule reconnect if within retry limit
        return this.handleConnectionFailure(new Error("Connection failed"));
      }
    } catch (error) {
      return this.handleConnectionFailure(error);
    }
  }
  
  // Handle connection failures with exponential backoff
  private handleConnectionFailure(error: any): boolean {
    console.error(`Error connecting to ${this.deviceType} device ${this.deviceId}:`, error.message);
    
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      // Calculate backoff interval with jitter
      const backoff = Math.min(
        this.reconnectInterval * Math.pow(1.5, this.connectionAttempts - 1),
        this.maxReconnectInterval
      ) * (0.8 + Math.random() * 0.4); // Add 20% jitter
      
      console.log(`Scheduling reconnection for ${this.deviceType} device ${this.deviceId} in ${Math.round(backoff)}ms`);
      
      // Clear any existing timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
      
      // Schedule reconnection
      this.connectionTimeout = setTimeout(() => {
        this.connect();
      }, backoff);
      
      return false;
    } else {
      console.error(`Maximum connection attempts reached for ${this.deviceType} device ${this.deviceId}`);
      
      // Reset for future attempts after a cooldown period
      this.connectionTimeout = setTimeout(() => {
        this.connectionAttempts = 0;
        console.log(`Connection cooldown completed for ${this.deviceType} device ${this.deviceId}`);
      }, this.maxReconnectInterval * 2);
      
      return false;
    }
  }
  
  // Implementation-specific connection logic (abstract)
  protected abstract connectImplementation(): Promise<boolean>;
  
  // Disconnect implementation
  async disconnect(): Promise<void> {
    // Clear any pending reconnection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Implementation-specific disconnection
    await this.disconnectImplementation();
    
    this.connected = false;
    console.log(`Disconnected from ${this.deviceType} device ${this.deviceId}`);
  }
  
  // Implementation-specific disconnection logic (abstract)
  protected abstract disconnectImplementation(): Promise<void>;
  
  abstract readData(): Promise<any>;
  abstract writeData(params: any): Promise<boolean>;

  getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      deviceType: this.deviceType
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Factory function to create the appropriate device adapter
export function createDeviceAdapter(
  deviceId: number,
  deviceType: DeviceType,
  protocol: Protocol,
  connectionParams: any
): DeviceAdapter {
  // This would be extended with actual adapter implementations
  // For now, it will be stubbed
  
  console.log(`Creating device adapter for ${deviceType} (ID: ${deviceId}) using ${protocol} protocol`);
  
  // Factory pattern would instantiate different concrete adapters
  // For example:
  // if (deviceType === DeviceType.BATTERY && protocol === Protocol.MODBUS) {
  //   return new ModbusBatteryAdapter(deviceId, connectionParams);
  // }
  
  // Return stub implementation
  return {
    connect: async () => { 
      console.log(`Connecting to ${deviceType} device ${deviceId}`);
      return true; 
    },
    disconnect: async () => { 
      console.log(`Disconnecting from ${deviceType} device ${deviceId}`);
    },
    readData: async () => ({ status: 'ok', deviceId }),
    writeData: async () => true,
    getDeviceInfo: () => ({ deviceId, deviceType }),
    isConnected: () => true
  };
}