import { EventEmitter } from 'events';
import { getMqttService } from '../services/mqttService';
import { TCPIPAdapter, getTCPIPManager, TCPIPDevice } from './tcpipAdapter';
import { ModbusAdapter, getModbusManager, ModbusDevice } from './modbusAdapter';

/**
 * Gateway Adapter - Provides a way to connect to devices through gateways
 * like data concentrators, IoT gateways, or protocol converters.
 * The gateway itself is a device in the system, but it also provides 
 * connectivity to other devices through its endpoints.
 */

// Gateway connection types
export type GatewayType = 'modbus_gateway' | 'tcpip_gateway' | 'mbus_gateway' | 'mqtt_gateway';

// Device types connected through gateway
export type GatewayDeviceType = 'meter' | 'inverter' | 'battery' | 'sensor' | 'controller' | 'generic';

// Connection to a gateway
export interface GatewayConnectionConfig {
  host: string;
  port: number;
  type: GatewayType;
  username?: string;
  password?: string;
  tlsEnabled?: boolean;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  mockMode?: boolean;
  custom?: Record<string, any>;
}

// Gateway itself as a device
export interface GatewayDevice {
  id: number;
  name: string;
  connection: GatewayConnectionConfig;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmware?: string;
  childDevices: GatewayChildDevice[];
}

// Child device connected through the gateway
export interface GatewayChildDevice {
  id: number;
  name: string;
  type: GatewayDeviceType;
  address: string | number; // Address within the gateway (Modbus address, M-Bus address, etc.)
  protocol: string;
  pollInterval?: number;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  commands?: Record<string, any>;
  mappings?: DataPointMapping[];
}

// Mapping between device datapoints and protocol registers/addresses
export interface DataPointMapping {
  name: string;
  address: string | number;
  dataType: 'float' | 'integer' | 'boolean' | 'string' | 'enum';
  unit?: string;
  scale?: number;
  access: 'read' | 'write' | 'read-write';
  description?: string;
}

// Gateway status data
export interface GatewayStatus {
  online: boolean;
  lastSeen: string;
  childDevicesStatus: Map<number, boolean>;
  error?: string;
}

/**
 * Gateway Adapter - Manages communication with a gateway and its devices
 */
export class GatewayAdapter extends EventEmitter {
  private device: GatewayDevice;
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private status: GatewayStatus;
  private childAdapters: Map<number, ModbusAdapter | TCPIPAdapter | any> = new Map();
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor(device: GatewayDevice) {
    super();
    this.device = device;
    
    // Initialize status
    this.status = {
      online: false,
      lastSeen: new Date().toISOString(),
      childDevicesStatus: new Map()
    };
    
    // Initialize child device status
    for (const childDevice of this.device.childDevices) {
      this.status.childDevicesStatus.set(childDevice.id, false);
    }
  }
  
  // Connect to the gateway and its child devices
  async connect(): Promise<boolean> {
    if (this.connected) {
      console.log(`Gateway ${this.device.id} already connected`);
      return true;
    }
    
    try {
      console.log(`Connecting to gateway ${this.device.id} (${this.device.name})`);
      
      // For mock mode in development
      if (this.inDevelopment && this.device.connection.mockMode) {
        console.log(`Development mode: Using simulated data for gateway ${this.device.id}`);
        this.connected = true;
        this.status.online = true;
        this.status.lastSeen = new Date().toISOString();
        
        await this.publishDeviceStatus('online');
        
        // Initialize child devices in mock mode
        await this.initializeChildDevices(true);
        
        // Start heartbeat
        this.startHeartbeat();
        
        this.emit('connected', this.device.id);
        return true;
      }
      
      // Real gateway connection logic based on gateway type
      switch (this.device.connection.type) {
        case 'modbus_gateway':
          await this.connectModbusGateway();
          break;
          
        case 'tcpip_gateway':
          await this.connectTcpipGateway();
          break;
          
        case 'mbus_gateway':
          await this.connectMbusGateway();
          break;
          
        case 'mqtt_gateway':
          await this.connectMqttGateway();
          break;
          
        default:
          throw new Error(`Unsupported gateway type: ${this.device.connection.type}`);
      }
      
      // Set status
      this.connected = true;
      this.status.online = true;
      this.status.lastSeen = new Date().toISOString();
      
      // Publish status
      await this.publishDeviceStatus('online');
      
      // Initialize child devices
      await this.initializeChildDevices();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.emit('connected', this.device.id);
      return true;
    } catch (error: any) {
      console.error(`Error connecting to gateway ${this.device.id}:`, error.message);
      this.connected = false;
      this.status.online = false;
      this.status.error = error.message;
      
      await this.publishDeviceStatus('error', error.message);
      this.emit('error', error);
      
      // Schedule reconnect
      this.scheduleReconnect();
      
      return false;
    }
  }
  
  // Connect to Modbus gateway
  private async connectModbusGateway(): Promise<void> {
    console.log(`Connecting to Modbus gateway ${this.device.id}`);
    // In a real implementation, we would establish connection to the Modbus gateway
    // This could be via TCP, RTU, or other Modbus variant
    
    // Example implementation would create a ModbusTCP client
    // this.modbusClient = new ModbusTCPClient({
    //   host: this.device.connection.host,
    //   port: this.device.connection.port,
    //   timeout: this.device.connection.connectionTimeout || 5000
    // });
    // await this.modbusClient.connect();
    
    // For now, we'll just simulate a successful connection
    console.log(`Connected to Modbus gateway ${this.device.id}`);
  }
  
  // Connect to TCP/IP gateway
  private async connectTcpipGateway(): Promise<void> {
    console.log(`Connecting to TCP/IP gateway ${this.device.id}`);
    // In a real implementation, we would establish TCP/IP connection to the gateway
    
    // For now, we'll just simulate a successful connection
    console.log(`Connected to TCP/IP gateway ${this.device.id}`);
  }
  
  // Connect to M-Bus gateway
  private async connectMbusGateway(): Promise<void> {
    console.log(`Connecting to M-Bus gateway ${this.device.id}`);
    // In a real implementation, we would establish connection to the M-Bus gateway
    
    // For now, we'll just simulate a successful connection
    console.log(`Connected to M-Bus gateway ${this.device.id}`);
  }
  
  // Connect to MQTT gateway
  private async connectMqttGateway(): Promise<void> {
    console.log(`Connecting to MQTT gateway ${this.device.id}`);
    // In a real implementation, we would establish MQTT connection to the gateway
    
    // For now, we'll just simulate a successful connection
    console.log(`Connected to MQTT gateway ${this.device.id}`);
  }
  
  // Initialize child devices
  private async initializeChildDevices(mockMode: boolean = false): Promise<void> {
    console.log(`Initializing ${this.device.childDevices.length} child devices for gateway ${this.device.id}`);
    
    for (const childDevice of this.device.childDevices) {
      try {
        await this.connectChildDevice(childDevice, mockMode);
        this.status.childDevicesStatus.set(childDevice.id, true);
      } catch (error) {
        console.error(`Error connecting child device ${childDevice.id}:`, error);
        this.status.childDevicesStatus.set(childDevice.id, false);
      }
    }
  }
  
  // Connect a child device through the gateway
  private async connectChildDevice(childDevice: GatewayChildDevice, mockMode: boolean = false): Promise<void> {
    console.log(`Connecting child device ${childDevice.id} (${childDevice.name}) via gateway ${this.device.id}`);
    
    switch (childDevice.protocol.toLowerCase()) {
      case 'modbus':
        await this.connectModbusDevice(childDevice, mockMode);
        break;
        
      case 'tcpip':
        await this.connectTcpipDevice(childDevice, mockMode);
        break;
        
      case 'mbus':
        await this.connectMbusDevice(childDevice, mockMode);
        break;
        
      default:
        throw new Error(`Unsupported protocol for child device: ${childDevice.protocol}`);
    }
  }
  
  // Connect a Modbus child device
  private async connectModbusDevice(childDevice: GatewayChildDevice, mockMode: boolean = false): Promise<void> {
    // Create a Modbus device configuration
    const modbusDevice: ModbusDevice = {
      id: childDevice.id,
      connection: {
        host: this.device.connection.host,
        port: this.device.connection.port,
        unitId: typeof childDevice.address === 'number' ? childDevice.address : parseInt(childDevice.address),
        protocol: 'tcp',
        mockMode: mockMode || this.inDevelopment
      },
      name: childDevice.name,
      registers: this.mapDataPointsToModbusRegisters(childDevice.mappings || []),
      scanInterval: childDevice.pollInterval || 30000
    };
    
    // Get the Modbus manager and add the device
    const modbusManager = getModbusManager();
    await modbusManager.addDevice(modbusDevice);
    
    // Store reference to the adapter
    const adapter = modbusManager.getAdapter(childDevice.id);
    if (adapter) {
      this.childAdapters.set(childDevice.id, adapter);
    } else {
      throw new Error(`Failed to create adapter for Modbus device ${childDevice.id}`);
    }
  }
  
  // Map generic data points to Modbus registers
  private mapDataPointsToModbusRegisters(mappings: DataPointMapping[]): any[] {
    return mappings.map(mapping => {
      return {
        name: mapping.name,
        address: typeof mapping.address === 'number' ? mapping.address : parseInt(mapping.address),
        type: this.mapDataTypeToModbusType(mapping.dataType),
        length: this.getModbusRegisterLength(mapping.dataType),
        scaling: mapping.scale,
        unit: mapping.unit,
        description: mapping.description
      };
    });
  }
  
  // Map generic data types to Modbus types
  private mapDataTypeToModbusType(dataType: string): string {
    switch (dataType) {
      case 'float': return 'float32';
      case 'integer': return 'int16';
      case 'boolean': return 'coil';
      case 'string': return 'string';
      case 'enum': return 'uint16';
      default: return 'holding';
    }
  }
  
  // Get register length based on data type
  private getModbusRegisterLength(dataType: string): number {
    switch (dataType) {
      case 'float': return 2;
      case 'string': return 8;
      default: return 1;
    }
  }
  
  // Connect a TCP/IP child device
  private async connectTcpipDevice(childDevice: GatewayChildDevice, mockMode: boolean = false): Promise<void> {
    // Create a TCP/IP device configuration
    const tcpipDevice: TCPIPDevice = {
      id: childDevice.id,
      deviceId: childDevice.id.toString(),
      connection: {
        host: this.device.connection.host,
        port: typeof childDevice.address === 'number' ? 
          childDevice.address as number : 
          parseInt(childDevice.address as string),
        dataFormat: 'json',
        mockMode: mockMode || this.inDevelopment
      },
      pollInterval: childDevice.pollInterval || 30000,
      commands: childDevice.commands
    };
    
    // Get the TCP/IP manager and add the device
    const tcpipManager = getTCPIPManager();
    await tcpipManager.addDevice(tcpipDevice);
    
    // Store reference to the adapter
    const adapter = tcpipManager.getAdapter(childDevice.id);
    if (adapter) {
      this.childAdapters.set(childDevice.id, adapter);
    } else {
      throw new Error(`Failed to create adapter for TCP/IP device ${childDevice.id}`);
    }
  }
  
  // Connect an M-Bus child device
  private async connectMbusDevice(childDevice: GatewayChildDevice, mockMode: boolean = false): Promise<void> {
    // In a real implementation, we would initialize an M-Bus adapter
    // This is just a placeholder for now
    console.log(`Connected to M-Bus device ${childDevice.id} via gateway ${this.device.id}`);
    // In a real implementation, we would store a reference to the M-Bus adapter
  }
  
  // Disconnect from the gateway and all child devices
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      console.log(`Disconnecting from gateway ${this.device.id}`);
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Cancel reconnect timer if active
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      // Disconnect all child devices
      await this.disconnectChildDevices();
      
      // Disconnect from the gateway based on type
      switch (this.device.connection.type) {
        case 'modbus_gateway':
          // Close Modbus connection
          break;
        case 'tcpip_gateway':
          // Close TCP/IP connection
          break;
        case 'mbus_gateway':
          // Close M-Bus connection
          break;
        case 'mqtt_gateway':
          // Close MQTT connection
          break;
      }
      
      // Update status
      this.connected = false;
      this.status.online = false;
      this.status.lastSeen = new Date().toISOString();
      
      // Publish status
      await this.publishDeviceStatus('offline');
      
      this.emit('disconnected', this.device.id);
    } catch (error) {
      console.error(`Error disconnecting from gateway ${this.device.id}:`, error);
      this.emit('error', error);
    }
  }
  
  // Disconnect all child devices
  private async disconnectChildDevices(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];
    
    for (const [id, adapter] of this.childAdapters.entries()) {
      disconnectPromises.push(
        adapter.disconnect().catch(error => {
          console.error(`Error disconnecting child device ${id}:`, error);
        })
      );
    }
    
    await Promise.all(disconnectPromises);
    this.childAdapters.clear();
    
    // Update status
    for (const childId of this.status.childDevicesStatus.keys()) {
      this.status.childDevicesStatus.set(childId, false);
    }
  }
  
  // Start heartbeat timer
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }
    
    const interval = this.device.connection.heartbeatInterval || 60000; // Default 1 minute
    console.log(`Starting heartbeat for gateway ${this.device.id} every ${interval}ms`);
    
    // Send initial heartbeat
    this.sendHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }
  
  // Stop heartbeat timer
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  // Send heartbeat to the gateway
  private async sendHeartbeat(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      console.log(`Sending heartbeat to gateway ${this.device.id}`);
      
      // In a real implementation, we would send a heartbeat to the gateway
      // and update the status based on the response
      
      // For now, just update the last seen timestamp
      this.status.lastSeen = new Date().toISOString();
      
      // Check status of child devices
      this.checkChildDevicesStatus();
      
      // Publish gateway status
      await this.publishGatewayStatus();
    } catch (error) {
      console.error(`Error sending heartbeat to gateway ${this.device.id}:`, error);
      this.emit('error', error);
      
      // If too many heartbeat failures, mark as disconnected
      if (this.connected) {
        this.connected = false;
        this.status.online = false;
        this.status.error = 'Heartbeat failed';
        
        await this.publishDeviceStatus('error', 'Heartbeat failed');
        this.scheduleReconnect();
      }
    }
  }
  
  // Check status of all child devices
  private checkChildDevicesStatus(): void {
    for (const [id, adapter] of this.childAdapters.entries()) {
      const isConnected = adapter.isConnected();
      this.status.childDevicesStatus.set(id, isConnected);
      
      // If a child device is not connected, try to reconnect it
      if (!isConnected) {
        const childDevice = this.device.childDevices.find(d => d.id === id);
        if (childDevice) {
          this.connectChildDevice(childDevice).catch(error => {
            console.error(`Error reconnecting child device ${id}:`, error);
          });
        }
      }
    }
  }
  
  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    const delay = this.device.connection.reconnectInterval || 30000; // Default 30 seconds
    console.log(`Scheduling reconnect for gateway ${this.device.id} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      try {
        await this.connect();
      } catch (error) {
        console.error(`Error reconnecting to gateway ${this.device.id}:`, error);
        this.scheduleReconnect();
      }
    }, delay);
  }
  
  // Publish gateway status via MQTT
  private async publishGatewayStatus(): Promise<void> {
    const topic = `devices/${this.device.id}/status`;
    
    try {
      const statusData = {
        deviceId: this.device.id,
        status: this.status.online ? 'online' : 'offline',
        timestamp: this.status.lastSeen,
        error: this.status.error,
        childDevices: Array.from(this.status.childDevicesStatus.entries()).map(([id, status]) => ({
          id,
          status: status ? 'online' : 'offline'
        }))
      };
      
      await this.mqttService.publish(topic, statusData);
    } catch (error) {
      console.error(`Error publishing status for gateway ${this.device.id}:`, error);
    }
  }
  
  // Publish device status via MQTT
  private async publishDeviceStatus(status: string, details?: string): Promise<void> {
    const topic = `devices/${this.device.id}/status`;
    
    try {
      await this.mqttService.publish(topic, {
        deviceId: this.device.id,
        status,
        timestamp: new Date().toISOString(),
        details
      });
    } catch (error) {
      console.error(`Error publishing status for device ${this.device.id}:`, error);
    }
  }
  
  // Get status of the gateway and its child devices
  getStatus(): GatewayStatus {
    // Update last seen time
    if (this.connected) {
      this.status.lastSeen = new Date().toISOString();
    }
    
    return {
      ...this.status,
      childDevicesStatus: new Map(this.status.childDevicesStatus)
    };
  }
  
  // Check if gateway is connected
  isConnected(): boolean {
    return this.connected;
  }
  
  // Get a child device adapter by ID
  getChildAdapter(childId: number): any {
    return this.childAdapters.get(childId);
  }
  
  // Execute a command on a child device
  async executeCommandOnChild(childId: number, command: string, parameters?: any): Promise<any> {
    const adapter = this.childAdapters.get(childId);
    if (!adapter) {
      throw new Error(`Child device ${childId} not found or not connected`);
    }
    
    if (typeof adapter.executeCommand === 'function') {
      return adapter.executeCommand(command, parameters);
    } else if (typeof adapter.sendData === 'function') {
      // For adapters that only support raw data sending
      const cmdData = typeof parameters === 'string' ? parameters : JSON.stringify(parameters);
      return adapter.sendData(cmdData);
    } else {
      throw new Error(`Child device ${childId} does not support command execution`);
    }
  }
  
  // Get gateway info
  getInfo(): any {
    return {
      id: this.device.id,
      name: this.device.name,
      type: this.device.connection.type,
      manufacturer: this.device.manufacturer,
      model: this.device.model,
      serialNumber: this.device.serialNumber,
      firmware: this.device.firmware,
      status: this.status.online ? 'online' : 'offline',
      lastSeen: this.status.lastSeen,
      childDevices: this.device.childDevices.map(child => ({
        id: child.id,
        name: child.name,
        type: child.type,
        protocol: child.protocol,
        status: this.status.childDevicesStatus.get(child.id) ? 'online' : 'offline'
      }))
    };
  }
}

/**
 * Gateway Manager - Manages all gateways in the system
 */
export class GatewayManager {
  private adapters: Map<number, GatewayAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    console.log('Initializing Gateway Manager');
  }
  
  // Add a new gateway
  async addGateway(deviceConfig: GatewayDevice): Promise<void> {
    // Check if gateway already exists
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`Gateway ${deviceConfig.id} already registered`);
      return;
    }
    
    console.log(`Adding gateway ${deviceConfig.id} with ${deviceConfig.childDevices.length} child devices`);
    
    // Create new adapter
    const adapter = new GatewayAdapter(deviceConfig);
    
    // Store adapter
    this.adapters.set(deviceConfig.id, adapter);
    
    // Set up event handlers
    adapter.on('connected', (deviceId: number) => {
      console.log(`Gateway ${deviceId} connected`);
    });
    
    adapter.on('disconnected', (deviceId: number) => {
      console.log(`Gateway ${deviceId} disconnected`);
    });
    
    adapter.on('error', (error: Error) => {
      console.error('Gateway error:', error);
    });
    
    // Connect if in development mode or if explicitly configured
    if (this.inDevelopment && deviceConfig.connection.mockMode) {
      try {
        await adapter.connect();
      } catch (error) {
        console.error(`Error connecting to gateway ${deviceConfig.id}:`, error);
      }
    }
  }
  
  // Remove a gateway
  async removeGateway(gatewayId: number): Promise<void> {
    const adapter = this.adapters.get(gatewayId);
    if (!adapter) {
      console.log(`Gateway ${gatewayId} not found`);
      return;
    }
    
    // Disconnect gateway and all its child devices
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(gatewayId);
    
    console.log(`Removed gateway ${gatewayId} and all its child devices`);
  }
  
  // Get a specific gateway adapter
  getAdapter(gatewayId: number): GatewayAdapter | undefined {
    return this.adapters.get(gatewayId);
  }
  
  // Get a specific child device adapter
  getChildAdapter(gatewayId: number, childId: number): any {
    const gateway = this.adapters.get(gatewayId);
    if (!gateway) {
      throw new Error(`Gateway ${gatewayId} not found`);
    }
    
    return gateway.getChildAdapter(childId);
  }
  
  // Execute a command on a child device
  async executeCommandOnChild(gatewayId: number, childId: number, command: string, parameters?: any): Promise<any> {
    const gateway = this.adapters.get(gatewayId);
    if (!gateway) {
      throw new Error(`Gateway ${gatewayId} not found`);
    }
    
    return gateway.executeCommandOnChild(childId, command, parameters);
  }
  
  // Get statuses of all gateways
  getAllGatewayStatuses(): Map<number, GatewayStatus> {
    const statuses = new Map<number, GatewayStatus>();
    
    for (const [id, adapter] of this.adapters.entries()) {
      statuses.set(id, adapter.getStatus());
    }
    
    return statuses;
  }
  
  // Get status of specific gateway
  getGatewayStatus(gatewayId: number): GatewayStatus | undefined {
    const adapter = this.adapters.get(gatewayId);
    if (!adapter) {
      return undefined;
    }
    
    return adapter.getStatus();
  }
  
  // Get gateway info
  getGatewayInfo(gatewayId: number): any {
    const adapter = this.adapters.get(gatewayId);
    if (!adapter) {
      return null;
    }
    
    return adapter.getInfo();
  }
  
  // Get all gateway info
  getAllGatewayInfo(): any[] {
    return Array.from(this.adapters.values()).map(adapter => adapter.getInfo());
  }
  
  // Connect all gateways
  async connectAll(): Promise<void> {
    const connectPromises = Array.from(this.adapters.values()).map(adapter => {
      return adapter.connect().catch(error => {
        console.error(`Error connecting gateway:`, error);
      });
    });
    
    await Promise.all(connectPromises);
  }
  
  // Shutdown all gateways
  async shutdown(): Promise<void> {
    console.log('Shutting down Gateway Manager');
    
    const shutdownPromises = Array.from(this.adapters.values()).map(adapter => {
      return adapter.disconnect().catch(error => {
        console.error(`Error disconnecting gateway:`, error);
      });
    });
    
    await Promise.all(shutdownPromises);
    
    this.adapters.clear();
  }
}

// Singleton instance
let gatewayManager: GatewayManager;

// Get the Gateway manager instance
export function getGatewayManager(): GatewayManager {
  if (!gatewayManager) {
    gatewayManager = new GatewayManager();
  }
  return gatewayManager;
}