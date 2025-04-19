import ModbusRTU from 'modbus-serial';
import { v4 as uuidv4 } from 'uuid';
import { BaseDeviceAdapter, DeviceType, Protocol } from './deviceAdapterFactory';
import { getMqttService, formatDeviceTopic } from '../services/mqttService';
import { TOPIC_PATTERNS } from '@shared/messageSchema';

// Types for ModbusDevice configuration
export interface ModbusDevice {
  id: number;               // Unique device ID
  deviceType?: string;      // Device type (solar_pv, battery, etc.)
  name?: string;            // Human-readable name
  connection: {
    host?: string;          // IP address (for TCP)
    port?: number;          // Port number (for TCP)
    serialPort?: string;    // Serial port path (for RTU)
    baudRate?: number;      // Baud rate (for RTU)
    unitId?: number;        // Modbus unit ID
    protocol?: string;      // 'tcp' or 'rtu'
    timeout?: number;       // Connection timeout in ms
    mockMode?: boolean;     // Whether to use mock data
  };
  registers: {
    name: string;           // Register name (e.g., "voltage")
    address: number;        // Register address
    type: string;           // Data type (float32, int16, etc)
    length?: number;        // Number of registers
    scaling?: number;       // Scaling factor
    unit?: string;          // Unit of measurement
    description?: string;   // Description
    min?: number;           // Minimum value
    max?: number;           // Maximum value
  }[];
  scanInterval?: number;    // Milliseconds between scans
}

/**
 * Enhanced ModbusAdapter with improved connection resilience
 * Extends BaseDeviceAdapter to leverage robust connection handling
 */
export class EnhancedModbusAdapter extends BaseDeviceAdapter {
  private device: ModbusDevice;
  private client: ModbusRTU | null = null;
  private scanInterval: NodeJS.Timeout | null = null;
  private lastReadings: Record<string, any> = {};
  private mockMode: boolean = false;
  private inDevelopment: boolean = process.env.NODE_ENV !== 'production';
  private mqttService = getMqttService();
  
  constructor(device: ModbusDevice) {
    // Map device type to protocol for the base class
    const deviceType = device.deviceType || 'generic';
    super(device.id, deviceType, Protocol.MODBUS);
    
    this.device = device;
    this.mockMode = this.inDevelopment || !!device.connection.mockMode;
    
    // Configure longer timeouts for Modbus which can be slow to respond
    this.maxConnectionAttempts = 10;
    this.reconnectInterval = 10000; // 10 seconds
  }
  
  // Implementation of abstract method from BaseDeviceAdapter
  protected async connectImplementation(): Promise<boolean> {
    try {
      console.log(`Connecting to Modbus device ${this.device.id}`);
      
      if (this.mockMode) {
        console.log(`Development mode: Using simulated data for Modbus device ${this.device.id}`);
        return true;
      }
      
      // Initialize Modbus client
      this.client = new ModbusRTU();
      
      // Connect based on connection type
      if (this.device.connection.protocol === 'tcp') {
        await this.client.connectTCP(
          this.device.connection.host as string, 
          { port: this.device.connection.port as number }
        );
        
        console.log(`Connected to Modbus TCP device at ${this.device.connection.host}:${this.device.connection.port}`);
      } else {
        // RTU over serial
        await this.client.connectRTUBuffered(
          this.device.connection.serialPort as string,
          { baudRate: this.device.connection.baudRate as number }
        );
        
        console.log(`Connected to Modbus RTU device at ${this.device.connection.serialPort}`);
      }
      
      // Set Modbus unit ID
      this.client.setID(this.device.connection.unitId as number);
      
      // Set timeout
      this.client.setTimeout(this.device.connection.timeout || 5000);
      
      // Start scanning if interval is specified
      if (this.device.scanInterval) {
        this.startScanning();
      }
      
      return true;
    } catch (error) {
      console.error(`Error connecting to Modbus device ${this.device.id}:`, error);
      return false;
    }
  }
  
  // Implementation of abstract method from BaseDeviceAdapter
  protected async disconnectImplementation(): Promise<void> {
    // Stop scanning
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    // Close Modbus connection
    if (this.client && !this.mockMode) {
      try {
        await this.client.close();
      } catch (error) {
        console.error(`Error closing Modbus connection for device ${this.device.id}:`, error);
      }
    }
    
    this.client = null;
  }
  
  // Start periodic scanning of Modbus registers
  private startScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    console.log(`Started scanning Modbus device ${this.device.id} every ${this.device.scanInterval}ms`);
    
    this.scanInterval = setInterval(async () => {
      await this.scanRegisters();
    }, this.device.scanInterval);
  }
  
  // Scan Modbus registers
  private async scanRegisters(): Promise<void> {
    if (!this.isConnected()) {
      console.log(`Device ${this.device.id} not connected, attempting to reconnect`);
      await this.connect();
      return;
    }
    
    try {
      const readingsData: Record<string, any> = {};
      const telemetryData: Record<string, any> = {};
      
      // For mock mode, generate simulated data
      if (this.mockMode) {
        for (const register of this.device.registers) {
          const value = this.generateMockValue(register);
          readingsData[register.name] = value;
          
          // Apply scaling if specified
          const scaledValue = register.scaling ? value * register.scaling : value;
          telemetryData[register.name] = {
            value: scaledValue,
            unit: register.unit || '',
            timestamp: new Date().toISOString()
          };
        }
      } 
      // For real devices, read from Modbus
      else if (this.client) {
        for (const register of this.device.registers) {
          try {
            let value: any;
            
            switch (register.type.toLowerCase()) {
              case 'float32':
              case 'float':
                value = await this.readFloat(register.address, register.length || 2);
                break;
                
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
                
              case 'boolean':
              case 'coil':
                value = await this.readCoil(register.address);
                break;
                
              default:
                value = await this.readHoldingRegister(register.address);
                break;
            }
            
            readingsData[register.name] = value;
            
            // Apply scaling if specified
            const scaledValue = register.scaling ? value * register.scaling : value;
            telemetryData[register.name] = {
              value: scaledValue,
              unit: register.unit || '',
              timestamp: new Date().toISOString()
            };
          } catch (regError) {
            console.error(`Error reading register ${register.name} at address ${register.address}:`, regError);
            // Continue with other registers
          }
        }
      }
      
      // Save the last readings
      this.lastReadings = readingsData;
      
      // Publish telemetry message to MQTT
      const telemetryMessage = {
        messageId: uuidv4(),
        messageType: 'telemetry',
        timestamp: new Date().toISOString(),
        deviceId: this.device.id,
        readings: telemetryData,
        metadata: {
          rawReadings: readingsData,
          source: 'modbus'
        }
      };
      
      const topic = formatDeviceTopic(TOPIC_PATTERNS.TELEMETRY, this.device.id);
      await this.mqttService.publish(topic, telemetryMessage);
      
      // Emit device status update via MQTT (occasional heartbeat)
      if (Math.random() < 0.05) { // ~5% chance per scan to update status
        this.publishDeviceStatus('online');
      }
    } catch (error) {
      console.error(`Error scanning registers for device ${this.device.id}:`, error);
      
      // Check if it's a connection error
      if (error.message && (
        error.message.includes('Port is closed') || 
        error.message.includes('Connection timed out') || 
        error.message.includes('Not connected')
      )) {
        console.log(`Reconnecting to Modbus device ${this.device.id} after connection error`);
        await this.connect();
      }
      
      // Emit device status update via MQTT
      this.publishDeviceStatus('error');
    }
  }
  
  // Read Modbus holding register as float32
  private async readFloat(address: number, length: number = 2): Promise<number> {
    if (this.mockMode) {
      return Math.random() * 100;
    }
    
    if (!this.client) throw new Error('Modbus client not initialized');
    
    const result = await this.client.readHoldingRegisters(address, length);
    
    // Convert two 16-bit registers to float32
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE(result.data[0], 0);
    buf.writeUInt16BE(result.data[1], 2);
    return buf.readFloatBE(0);
  }
  
  // Read Modbus holding register as int16
  private async readInt16(address: number): Promise<number> {
    if (this.mockMode) {
      return Math.floor(Math.random() * 1000) - 500;
    }
    
    if (!this.client) throw new Error('Modbus client not initialized');
    
    const result = await this.client.readHoldingRegisters(address, 1);
    return result.data[0];
  }
  
  // Read Modbus holding register as uint16
  private async readUint16(address: number): Promise<number> {
    if (this.mockMode) {
      return Math.floor(Math.random() * 1000);
    }
    
    if (!this.client) throw new Error('Modbus client not initialized');
    
    const result = await this.client.readHoldingRegisters(address, 1);
    return result.data[0];
  }
  
  // Read Modbus holding register as int32
  private async readInt32(address: number): Promise<number> {
    if (this.mockMode) {
      return Math.floor(Math.random() * 100000) - 50000;
    }
    
    if (!this.client) throw new Error('Modbus client not initialized');
    
    const result = await this.client.readHoldingRegisters(address, 2);
    
    // Convert two 16-bit registers to int32
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE(result.data[0], 0);
    buf.writeUInt16BE(result.data[1], 2);
    return buf.readInt32BE(0);
  }
  
  // Read Modbus holding register as uint32
  private async readUint32(address: number): Promise<number> {
    if (this.mockMode) {
      return Math.floor(Math.random() * 100000);
    }
    
    if (!this.client) throw new Error('Modbus client not initialized');
    
    const result = await this.client.readHoldingRegisters(address, 2);
    
    // Convert two 16-bit registers to uint32
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE(result.data[0], 0);
    buf.writeUInt16BE(result.data[1], 2);
    return buf.readUInt32BE(0);
  }
  
  // Read Modbus coil
  private async readCoil(address: number): Promise<boolean> {
    if (this.mockMode) {
      return Math.random() > 0.5;
    }
    
    if (!this.client) throw new Error('Modbus client not initialized');
    
    const result = await this.client.readCoils(address, 1);
    return result.data[0];
  }
  
  // Read Modbus holding register (generic)
  private async readHoldingRegister(address: number): Promise<number> {
    if (this.mockMode) {
      return Math.floor(Math.random() * 100);
    }
    
    if (!this.client) throw new Error('Modbus client not initialized');
    
    const result = await this.client.readHoldingRegisters(address, 1);
    return result.data[0];
  }
  
  // Generate mock value based on register type
  private generateMockValue(register: any): any {
    switch (register.type.toLowerCase()) {
      case 'float32':
      case 'float':
        return parseFloat((Math.random() * 100).toFixed(2));
        
      case 'int16':
        return Math.floor(Math.random() * 1000) - 500;
        
      case 'uint16':
        return Math.floor(Math.random() * 1000);
        
      case 'int32':
        return Math.floor(Math.random() * 100000) - 50000;
        
      case 'uint32':
        return Math.floor(Math.random() * 100000);
        
      case 'boolean':
      case 'coil':
        return Math.random() > 0.5;
        
      default:
        return Math.floor(Math.random() * 100);
    }
  }
  
  // Publish device status to MQTT
  private async publishDeviceStatus(status: 'online' | 'offline' | 'error'): Promise<void> {
    const statusMessage = {
      messageId: uuidv4(),
      messageType: 'status',
      timestamp: new Date().toISOString(),
      deviceId: this.device.id,
      status: status,
      metadata: {
        source: 'modbus',
        deviceName: this.device.name || `Device ${this.device.id}`
      }
    };
    
    const topic = formatDeviceTopic(TOPIC_PATTERNS.STATUS, this.device.id);
    await this.mqttService.publish(topic, statusMessage);
  }
  
  // Get last readings data
  public getLastReadings(): Record<string, any> {
    return this.lastReadings;
  }
  
  // Required implementations from DeviceAdapter interface
  public async readData(): Promise<any> {
    if (this.mockMode) {
      const readings: Record<string, any> = {};
      
      for (const register of this.device.registers) {
        readings[register.name] = this.generateMockValue(register);
      }
      
      return readings;
    }
    
    await this.scanRegisters();
    return this.lastReadings;
  }
  
  public async writeData(params: any): Promise<boolean> {
    if (!this.isConnected()) {
      await this.connect();
      if (!this.isConnected()) {
        throw new Error(`Cannot write to device ${this.device.id}: Not connected`);
      }
    }
    
    if (this.mockMode) {
      console.log(`Mock write to device ${this.device.id}:`, params);
      return true;
    }
    
    if (!this.client) {
      throw new Error('Modbus client not initialized');
    }
    
    try {
      // Params should have address, value, and type properties
      const { address, value, type } = params;
      
      switch (type.toLowerCase()) {
        case 'coil':
        case 'boolean':
          await this.client.writeCoil(address, !!value);
          break;
          
        case 'holding':
        case 'uint16':
        case 'int16':
          await this.client.writeRegister(address, value);
          break;
          
        case 'float32':
        case 'float':
          // Convert float to two registers
          const buf = Buffer.allocUnsafe(4);
          buf.writeFloatBE(value, 0);
          const regHigh = buf.readUInt16BE(0);
          const regLow = buf.readUInt16BE(2);
          await this.client.writeRegisters(address, [regHigh, regLow]);
          break;
          
        default:
          throw new Error(`Unsupported write data type: ${type}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error writing to device ${this.device.id}:`, error);
      return false;
    }
  }
  
  // Implementation of abstract method from BaseDeviceAdapter
  protected getDeviceSpecificMappingRules(): any[] {
    // Return device-specific mapping rules for protocol bridge
    // These would depend on the specific device type (solar, battery, etc.)
    const mappingRules = [];
    
    // Add generic rules based on device type
    switch (this.deviceType) {
      case 'solar_pv':
        mappingRules.push({
          source: { protocol: 'modbus', key: 'power' },
          target: { protocol: 'mqtt', topic: 'solar/power', key: 'value' }
        });
        break;
        
      case 'battery_storage':
        mappingRules.push({
          source: { protocol: 'modbus', key: 'soc' },
          target: { protocol: 'mqtt', topic: 'battery/soc', key: 'value' }
        });
        break;
        
      // Add more device-specific mappings as needed
    }
    
    return mappingRules;
  }
}

/**
 * ModbusManager class for managing multiple ModbusAdapter instances
 */
export class EnhancedModbusManager {
  private static instance: EnhancedModbusManager;
  private adapters: Map<number, EnhancedModbusAdapter> = new Map();
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  // Get singleton instance
  public static getInstance(): EnhancedModbusManager {
    if (!EnhancedModbusManager.instance) {
      EnhancedModbusManager.instance = new EnhancedModbusManager();
    }
    return EnhancedModbusManager.instance;
  }
  
  // Add a Modbus device
  async addDevice(device: ModbusDevice): Promise<EnhancedModbusAdapter> {
    const adapter = new EnhancedModbusAdapter(device);
    
    // Store adapter
    this.adapters.set(device.id, adapter);
    
    // Connect to device
    await adapter.connect();
    
    return adapter;
  }
  
  // Remove a Modbus device
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      console.log(`Modbus device ${deviceId} not found`);
      return;
    }
    
    // Disconnect device
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(deviceId);
    
    console.log(`Removed Modbus device ${deviceId}`);
  }
  
  // Get a specific adapter
  getAdapter(deviceId: number): EnhancedModbusAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  // Shut down all adapters
  async shutdown(): Promise<void> {
    console.log('Shutting down Modbus Manager');
    
    // Disconnect all devices
    const shutdownPromises = Array.from(this.adapters.values()).map(adapter => adapter.disconnect());
    
    await Promise.all(shutdownPromises);
    
    // Clear adapters
    this.adapters.clear();
  }
}

// Export singleton instance
export const enhancedModbusManager = EnhancedModbusManager.getInstance();