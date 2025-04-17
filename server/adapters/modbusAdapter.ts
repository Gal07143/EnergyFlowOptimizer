import ModbusRTU from 'modbus-serial';
import { getMqttService, formatDeviceTopic } from '../services/mqttService';
import { TOPIC_PATTERNS } from '@shared/messageSchema';
import { v4 as uuidv4 } from 'uuid';

// Types for ModbusDevice configuration
export interface ModbusDevice {
  id: number;               // Unique device ID
  address: number;          // Modbus address/ID
  connection: ModbusConnectionConfig;
  registers: ModbusRegisterConfig[];
  scanInterval: number;     // Milliseconds between scans
  timeout?: number;         // Connection timeout in milliseconds
  retryCount?: number;      // Number of retry attempts
  publishRaw?: boolean;     // Whether to publish raw register values
}

// Connection configuration
export interface ModbusConnectionConfig {
  type: 'tcp' | 'rtu' | 'ascii' | 'mock';  // Connection type
  host?: string;            // IP address (for TCP)
  port?: number;            // Port number (for TCP)
  baudRate?: number;        // Baud rate (for serial)
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';  // Serial parity
  dataBits?: 5 | 6 | 7 | 8; // Data bits (for serial)
  stopBits?: 1 | 2;         // Stop bits (for serial)
  path?: string;            // Serial port path (for RTU)
}

// Register configuration
export interface ModbusRegisterConfig {
  name: string;             // Register name
  type: 'holding' | 'input' | 'coil' | 'discrete'; // Register type
  address: number;          // Register address
  length: number;           // Number of registers
  dataType: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'boolean' | 'buffer'; // Data type
  scale?: number;           // Scaling factor
  unit?: string;            // Engineering unit
  byteOrder?: 'BE' | 'LE';  // Byte order (big-endian or little-endian)
  bitOffset?: number;       // Bit offset for boolean values
  description?: string;     // Register description
}

// Convert data based on its type
function convertModbusData(buffer: Buffer, dataType: string, byteOrder: 'BE' | 'LE' = 'BE', scale: number = 1): any {
  if (!buffer || buffer.length === 0) return null;
  
  switch (dataType) {
    case 'int16':
      return (byteOrder === 'BE' ? buffer.readInt16BE(0) : buffer.readInt16LE(0)) * scale;
    case 'uint16':
      return (byteOrder === 'BE' ? buffer.readUInt16BE(0) : buffer.readUInt16LE(0)) * scale;
    case 'int32':
      if (buffer.length < 4) return null;
      return (byteOrder === 'BE' ? buffer.readInt32BE(0) : buffer.readInt32LE(0)) * scale;
    case 'uint32':
      if (buffer.length < 4) return null;
      return (byteOrder === 'BE' ? buffer.readUInt32BE(0) : buffer.readUInt32LE(0)) * scale;
    case 'float32':
      if (buffer.length < 4) return null;
      return (byteOrder === 'BE' ? buffer.readFloatBE(0) : buffer.readFloatLE(0)) * scale;
    case 'boolean':
      return buffer[0] !== 0;
    case 'buffer':
      return buffer.toString('hex');
    default:
      return null;
  }
}

// Mock data generator for development mode
function generateMockModbusData(register: ModbusRegisterConfig): any {
  const scale = register.scale || 1;
  
  switch (register.dataType) {
    case 'int16':
      return Math.floor(Math.random() * 200 - 100) * scale;
    case 'uint16':
      return Math.floor(Math.random() * 65535) * scale;
    case 'int32':
      return Math.floor(Math.random() * 20000 - 10000) * scale;
    case 'uint32':
      return Math.floor(Math.random() * 4294967295) * scale;
    case 'float32':
      return parseFloat((Math.random() * 200 - 100).toFixed(2)) * scale;
    case 'boolean':
      return Math.random() > 0.5;
    case 'buffer':
      const arr = new Uint8Array(register.length * 2);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return Buffer.from(arr).toString('hex');
    default:
      return null;
  }
}

// Read specific register types
async function readRegister(client: ModbusRTU, register: ModbusRegisterConfig): Promise<Buffer | null> {
  try {
    let result;
    switch (register.type) {
      case 'holding':
        result = await client.readHoldingRegisters(register.address, register.length);
        return result.buffer;
      case 'input':
        result = await client.readInputRegisters(register.address, register.length);
        return result.buffer;
      case 'coil':
        result = await client.readCoils(register.address, register.length);
        return result.buffer;
      case 'discrete':
        result = await client.readDiscreteInputs(register.address, register.length);
        return result.buffer;
      default:
        console.error(`Unsupported register type: ${register.type}`);
        return null;
    }
  } catch (error) {
    console.error(`Error reading ${register.type} register at address ${register.address}:`, error);
    return null;
  }
}

// Class for managing Modbus device connections
export class ModbusAdapter {
  private client: ModbusRTU;
  private device: ModbusDevice;
  private connected: boolean = false;
  private scanIntervalId: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  private lastReadings: Record<string, any> = {};
  private lastError: Error | null = null;
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';

  constructor(device: ModbusDevice) {
    this.device = {
      ...device,
      timeout: device.timeout || 5000,
      retryCount: device.retryCount || 3
    };
    this.client = new ModbusRTU();
    
    if (this.inDevelopment) {
      console.log(`Development mode: Using simulated data for Modbus device ${device.id}`);
    }
  }

  // Connect to the Modbus device
  async connect(): Promise<boolean> {
    if (this.connected) return true;
    
    // For development mode or mock connections, don't actually connect
    if (this.inDevelopment || this.device.connection.type === 'mock') {
      this.connected = true;
      console.log(`Simulated connection to Modbus device ${this.device.id}`);
      return true;
    }
    
    try {
      const connection = this.device.connection;
      
      switch (connection.type) {
        case 'tcp':
          if (!connection.host || !connection.port) {
            throw new Error('TCP connection requires host and port');
          }
          await this.client.connectTCP(connection.host, { port: connection.port });
          break;
        
        case 'rtu':
          if (!connection.path) {
            throw new Error('RTU connection requires serial port path');
          }
          await this.client.connectRTU(connection.path, {
            baudRate: connection.baudRate || 9600,
            parity: connection.parity || 'none',
            dataBits: connection.dataBits || 8,
            stopBits: connection.stopBits || 1
          });
          break;
        
        case 'ascii':
          if (!connection.path) {
            throw new Error('ASCII connection requires serial port path');
          }
          await this.client.connectAscii(connection.path, {
            baudRate: connection.baudRate || 9600,
            parity: connection.parity || 'none',
            dataBits: connection.dataBits || 8,
            stopBits: connection.stopBits || 1
          });
          break;
        
        default:
          throw new Error(`Unsupported connection type: ${connection.type}`);
      }
      
      // Set the device address/ID
      this.client.setID(this.device.address);
      
      // Set the timeout
      this.client.setTimeout(this.device.timeout);
      
      this.connected = true;
      this.retryCount = 0;
      console.log(`Connected to Modbus device ${this.device.id} at address ${this.device.address}`);
      
      return true;
    } catch (error) {
      console.error(`Error connecting to Modbus device ${this.device.id}:`, error);
      
      // Retry logic
      if (this.retryCount < this.device.retryCount) {
        this.retryCount++;
        console.log(`Retrying connection to Modbus device ${this.device.id} (attempt ${this.retryCount}/${this.device.retryCount})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.connect();
      }
      
      // Emit device status update via MQTT
      this.publishDeviceStatus('error', `Connection error: ${error.message}`);
      
      return false;
    }
  }

  // Disconnect from the Modbus device
  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    
    // For development mode or mock connections, just reset state
    if (this.inDevelopment || this.device.connection.type === 'mock') {
      this.connected = false;
      console.log(`Simulated disconnection from Modbus device ${this.device.id}`);
      return;
    }
    
    try {
      await this.client.close();
      this.connected = false;
      console.log(`Disconnected from Modbus device ${this.device.id}`);
      
      // Emit device status update via MQTT
      this.publishDeviceStatus('offline');
    } catch (error) {
      console.error(`Error disconnecting from Modbus device ${this.device.id}:`, error);
    }
  }

  // Start periodic scanning of registers
  async startScanning(): Promise<void> {
    if (this.scanIntervalId) {
      console.log(`Scanning already in progress for Modbus device ${this.device.id}`);
      return;
    }
    
    // Ensure we're connected first
    if (!this.connected) {
      const connected = await this.connect();
      if (!connected) {
        console.error(`Cannot start scanning - device ${this.device.id} is not connected`);
        return;
      }
    }
    
    // Emit device status update via MQTT
    this.publishDeviceStatus('online');
    
    // Start periodic scanning
    this.scanIntervalId = setInterval(async () => {
      await this.scanRegisters();
    }, this.device.scanInterval);
    
    console.log(`Started scanning Modbus device ${this.device.id} every ${this.device.scanInterval}ms`);
  }

  // Stop periodic scanning of registers
  stopScanning(): void {
    if (!this.scanIntervalId) return;
    
    clearInterval(this.scanIntervalId);
    this.scanIntervalId = null;
    console.log(`Stopped scanning Modbus device ${this.device.id}`);
  }

  // Scan all registers and publish data
  private async scanRegisters(): Promise<void> {
    if (!this.connected) {
      console.log(`Cannot scan - device ${this.device.id} is not connected`);
      return;
    }
    
    try {
      const readingsData: Record<string, any> = {};
      
      // Read each register in sequence
      for (const register of this.device.registers) {
        let value: any;
        
        if (this.inDevelopment || this.device.connection.type === 'mock') {
          // Generate mock data in development mode
          value = generateMockModbusData(register);
        } else {
          // Read actual register
          const buffer = await readRegister(this.client, register);
          
          if (buffer === null) {
            console.warn(`Failed to read register ${register.name} from device ${this.device.id}`);
            continue;
          }
          
          // Convert based on data type
          value = convertModbusData(
            buffer, 
            register.dataType, 
            register.byteOrder || 'BE', 
            register.scale || 1
          );
          
          // Publish raw register data if requested
          if (this.device.publishRaw) {
            readingsData[`${register.name}_raw`] = buffer.toString('hex');
          }
        }
        
        // Store the processed value
        readingsData[register.name] = value;
      }
      
      // If we have actual readings, publish them
      if (Object.keys(readingsData).length > 0) {
        // Map standard register names to EMS telemetry fields
        const telemetryData: Record<string, any> = {};
        
        // Map common Modbus registers to standard telemetry fields
        for (const register of this.device.registers) {
          // Use register name to map to standard fields
          switch (register.name.toLowerCase()) {
            case 'power':
            case 'active_power':
            case 'output_power':
              telemetryData.power = readingsData[register.name];
              break;
            case 'energy':
            case 'total_energy':
            case 'energy_delivered':
              telemetryData.energy = readingsData[register.name];
              break;
            case 'voltage':
            case 'ac_voltage':
            case 'dc_voltage':
              telemetryData.voltage = readingsData[register.name];
              break;
            case 'current':
            case 'ac_current':
            case 'dc_current':
              telemetryData.current = readingsData[register.name];
              break;
            case 'frequency':
            case 'ac_frequency':
              telemetryData.frequency = readingsData[register.name];
              break;
            case 'temperature':
            case 'internal_temperature':
              telemetryData.temperature = readingsData[register.name];
              break;
            case 'soc':
            case 'state_of_charge':
              telemetryData.stateOfCharge = readingsData[register.name];
              break;
            default:
              // No standard mapping, will be included in additional readings
              break;
          }
        }
        
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
        this.connected = false;
        await this.connect();
      }
      
      // Emit device status update via MQTT
      this.publishDeviceStatus('error', `Scan error: ${error.message}`);
    }
  }

  // Get last readings
  getLastReadings(): Record<string, any> {
    return this.lastReadings;
  }
  
  // Publish device status via MQTT
  private async publishDeviceStatus(status: 'online' | 'offline' | 'error', details?: string): Promise<void> {
    const statusMessage = {
      messageId: uuidv4(),
      messageType: 'status',
      timestamp: new Date().toISOString(),
      deviceId: this.device.id,
      status,
      details
    };
    
    const topic = formatDeviceTopic(TOPIC_PATTERNS.STATUS, this.device.id);
    try {
      await this.mqttService.publish(topic, statusMessage);
    } catch (error) {
      console.error(`Error publishing status for device ${this.device.id}:`, error);
    }
  }
}

// Manager for all Modbus devices
export class ModbusManager {
  private adapters: Map<number, ModbusAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  // Initialize and start a Modbus device
  async addDevice(deviceConfig: ModbusDevice): Promise<void> {
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`Modbus device ${deviceConfig.id} already exists, updating configuration`);
      await this.removeDevice(deviceConfig.id);
    }
    
    // Create adapter
    const adapter = new ModbusAdapter(deviceConfig);
    this.adapters.set(deviceConfig.id, adapter);
    
    // Connect and start scanning
    try {
      await adapter.connect();
      await adapter.startScanning();
    } catch (error) {
      console.error(`Error initializing Modbus device ${deviceConfig.id}:`, error);
    }
  }
  
  // Remove and stop a Modbus device
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) return;
    
    adapter.stopScanning();
    await adapter.disconnect();
    this.adapters.delete(deviceId);
    console.log(`Removed Modbus device ${deviceId}`);
  }
  
  // Get a Modbus adapter by device ID
  getAdapter(deviceId: number): ModbusAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  // Stop and disconnect all devices
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];
    for (const [deviceId, adapter] of this.adapters.entries()) {
      adapter.stopScanning();
      shutdownPromises.push(adapter.disconnect());
      console.log(`Shutting down Modbus device ${deviceId}`);
    }
    
    await Promise.all(shutdownPromises);
    this.adapters.clear();
    console.log('All Modbus devices shut down');
  }
}

// Singleton instance
let modbusManagerInstance: ModbusManager | null = null;

// Get or create the Modbus manager instance
export function getModbusManager(): ModbusManager {
  if (!modbusManagerInstance) {
    modbusManagerInstance = new ModbusManager();
  }
  return modbusManagerInstance;
}