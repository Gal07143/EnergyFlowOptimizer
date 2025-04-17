import { getMqttService } from '../services/mqttService';
import { EventEmitter } from 'events';

/**
 * SunSpec Alliance is an open information standard for the renewable energy industry.
 * This adapter implements the SunSpec Modbus protocol for solar inverters and PV monitoring systems.
 */

// SunSpec device models
export enum SunSpecModelId {
  COMMON = 1,
  INVERTER_SINGLE_PHASE = 101,
  INVERTER_SPLIT_PHASE = 102,
  INVERTER_THREE_PHASE = 103,
  NAMEPLATES = 120,
  SETTINGS = 121,
  STATUS = 122,
  CONTROLS = 123,
  STORAGE = 124
}

// SunSpec device configuration
export interface SunSpecConnectionConfig {
  connectionType: 'tcp' | 'rtu';
  host?: string;
  port?: number;
  deviceAddress?: number;
  path?: string;
  baudRate?: number;
  timeout?: number;
  mockMode?: boolean;
}

// SunSpec device interface
export interface SunSpecDevice {
  id: number;
  address: number;
  connection: SunSpecConnectionConfig;
  models: SunSpecModelId[];
  scanInterval: number;
}

// SunSpec Model Definition
export interface SunSpecModelDefinition {
  id: number;
  length: number;
  points: SunSpecPoint[];
}

// SunSpec Data Point Definition
export interface SunSpecPoint {
  id: string;
  offset: number;
  length: number;
  type: 'int16' | 'uint16' | 'int32' | 'uint32' | 'int64' | 'uint64' | 'float32' | 'float64' | 'string' | 'enum16' | 'enum32' | 'bitfield16' | 'bitfield32';
  mandatory: boolean;
  scale?: number;
  units?: string;
  description?: string;
}

// SunSpec Data Block
export interface SunSpecDataBlock {
  modelId: number;
  deviceId: number;
  timestamp: string;
  points: Record<string, any>;
}

/**
 * SunSpec Device Adapter - Manages communication with a single SunSpec-compliant device
 */
export class SunSpecAdapter extends EventEmitter {
  private device: SunSpecDevice;
  private connected: boolean = false;
  private scanning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private lastReadings: Record<string, any> = {};
  private mqttService = getMqttService();
  private modelDefinitions: Map<number, SunSpecModelDefinition> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';

  constructor(device: SunSpecDevice) {
    super();
    this.device = device;
    
    // Load model definitions
    this.loadModelDefinitions();
  }

  // Load SunSpec model definitions
  private loadModelDefinitions(): void {
    // In a real implementation, these would be loaded from JSON files or a database
    // For simplicity, we'll define a few key models inline
    
    // Common Model (1)
    this.modelDefinitions.set(SunSpecModelId.COMMON, {
      id: SunSpecModelId.COMMON,
      length: 66,
      points: [
        { id: 'Mn', offset: 0, length: 16, type: 'string', mandatory: true, description: 'Manufacturer' },
        { id: 'Md', offset: 16, length: 16, type: 'string', mandatory: true, description: 'Model' },
        { id: 'SN', offset: 32, length: 16, type: 'string', mandatory: true, description: 'Serial Number' },
        { id: 'Ver', offset: 48, length: 8, type: 'string', mandatory: false, description: 'Version' }
      ]
    });
    
    // Inverter Model (103 - Three Phase)
    this.modelDefinitions.set(SunSpecModelId.INVERTER_THREE_PHASE, {
      id: SunSpecModelId.INVERTER_THREE_PHASE,
      length: 50,
      points: [
        { id: 'A', offset: 0, length: 1, type: 'uint16', scale: -1, units: 'A', mandatory: true, description: 'AC Current' },
        { id: 'AphA', offset: 1, length: 1, type: 'uint16', scale: -1, units: 'A', mandatory: false, description: 'Phase A Current' },
        { id: 'AphB', offset: 2, length: 1, type: 'uint16', scale: -1, units: 'A', mandatory: false, description: 'Phase B Current' },
        { id: 'AphC', offset: 3, length: 1, type: 'uint16', scale: -1, units: 'A', mandatory: false, description: 'Phase C Current' },
        { id: 'PPVphAB', offset: 4, length: 1, type: 'uint16', scale: -1, units: 'V', mandatory: false, description: 'Phase AB Voltage' },
        { id: 'PPVphBC', offset: 5, length: 1, type: 'uint16', scale: -1, units: 'V', mandatory: false, description: 'Phase BC Voltage' },
        { id: 'PPVphCA', offset: 6, length: 1, type: 'uint16', scale: -1, units: 'V', mandatory: false, description: 'Phase CA Voltage' },
        { id: 'W', offset: 7, length: 1, type: 'int16', scale: 0, units: 'W', mandatory: true, description: 'AC Power' },
        { id: 'Hz', offset: 8, length: 1, type: 'uint16', scale: -2, units: 'Hz', mandatory: false, description: 'AC Frequency' },
        { id: 'VA', offset: 9, length: 1, type: 'int16', scale: 0, units: 'VA', mandatory: false, description: 'Apparent Power' },
        { id: 'VAr', offset: 10, length: 1, type: 'int16', scale: 0, units: 'VAr', mandatory: false, description: 'Reactive Power' },
        { id: 'PF', offset: 11, length: 1, type: 'int16', scale: -2, units: '%', mandatory: false, description: 'Power Factor' },
        { id: 'WH', offset: 12, length: 2, type: 'uint32', scale: 0, units: 'Wh', mandatory: true, description: 'AC Energy' },
        { id: 'DCA', offset: 14, length: 1, type: 'uint16', scale: -1, units: 'A', mandatory: false, description: 'DC Current' },
        { id: 'DCV', offset: 15, length: 1, type: 'uint16', scale: -1, units: 'V', mandatory: false, description: 'DC Voltage' },
        { id: 'DCW', offset: 16, length: 1, type: 'int16', scale: 0, units: 'W', mandatory: false, description: 'DC Power' },
        { id: 'TmpCab', offset: 17, length: 1, type: 'int16', scale: -1, units: 'C', mandatory: false, description: 'Cabinet Temperature' },
        { id: 'St', offset: 18, length: 1, type: 'enum16', mandatory: true, description: 'Operating State' }
      ]
    });
  }

  // Connect to SunSpec device
  async connect(): Promise<boolean> {
    if (this.connected) {
      return true;
    }

    try {
      console.log(`Connecting to SunSpec device ${this.device.id}`);

      if (this.inDevelopment && this.device.connection.mockMode) {
        console.log(`Development mode: Using simulated data for SunSpec device ${this.device.id}`);
        this.connected = true;
        this.emit('connected', this.device.id);
        await this.publishDeviceStatus('online');
        return true;
      }

      // In a real implementation, we would connect to the device via Modbus TCP or RTU
      // and check for the SunSpec identifier (0x53756e53)
      this.connected = true;
      this.emit('connected', this.device.id);
      await this.publishDeviceStatus('online');
      
      return true;
    } catch (error: any) {
      console.error(`Error connecting to SunSpec device ${this.device.id}:`, error);
      this.connected = false;
      await this.publishDeviceStatus('error', error.message);
      this.emit('error', error);
      return false;
    }
  }

  // Disconnect from SunSpec device
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      console.log(`Disconnecting from SunSpec device ${this.device.id}`);
      
      // Stop scanning if active
      this.stopScanning();
      
      // In a real implementation, we would close the Modbus connection
      this.connected = false;
      this.emit('disconnected', this.device.id);
      await this.publishDeviceStatus('offline');
    } catch (error) {
      console.error(`Error disconnecting from SunSpec device ${this.device.id}:`, error);
      this.emit('error', error);
    }
  }

  // Start scanning device registers at defined interval
  async startScanning(): Promise<void> {
    if (this.scanning || this.scanInterval) {
      return;
    }

    if (!this.connected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error(`Cannot start scanning - device ${this.device.id} not connected`);
      }
    }

    console.log(`Started scanning SunSpec device ${this.device.id} every ${this.device.scanInterval}ms`);
    
    this.scanning = true;
    
    // Initial scan immediately
    await this.scanDevice();
    
    // Set up interval for regular scanning
    this.scanInterval = setInterval(() => {
      this.scanDevice().catch(error => {
        console.error(`Error scanning SunSpec device ${this.device.id}:`, error);
      });
    }, this.device.scanInterval);
  }

  // Stop scanning device
  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      this.scanning = false;
      console.log(`Stopped scanning SunSpec device ${this.device.id}`);
    }
  }

  // Scan device for all model data
  private async scanDevice(): Promise<void> {
    if (!this.connected) {
      throw new Error(`Cannot scan device ${this.device.id} - not connected`);
    }

    try {
      const readings: Record<string, any> = {};
      const timestamp = new Date().toISOString();
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        // Generate simulated data for each model
        for (const modelId of this.device.models) {
          const model = this.modelDefinitions.get(modelId);
          if (model) {
            const modelData = this.generateMockData(modelId);
            readings[`model_${modelId}`] = modelData;
          }
        }
      } else {
        // In a real implementation, we would read data from each model via Modbus
        // For each model ID, read the corresponding registers and parse the data
        for (const modelId of this.device.models) {
          const model = this.modelDefinitions.get(modelId);
          if (model) {
            // Read model data from device
            // For now, just generate mock data to simulate real reading
            const modelData = this.generateMockData(modelId);
            readings[`model_${modelId}`] = modelData;
          }
        }
      }
      
      // Store last readings
      this.lastReadings = {
        ...readings,
        timestamp
      };
      
      // Publish data via MQTT
      await this.publishTelemetry(readings);
      
      // Emit data event
      this.emit('data', {
        deviceId: this.device.id,
        timestamp,
        readings
      });
      
    } catch (error: any) {
      console.error(`Error scanning SunSpec device ${this.device.id}:`, error);
      this.emit('error', error);
      
      // Update status to error if we're still connected
      if (this.connected) {
        await this.publishDeviceStatus('error', error.message);
      }
    }
  }

  // Generate mock data for a specific model
  private generateMockData(modelId: SunSpecModelId): Record<string, any> {
    const model = this.modelDefinitions.get(modelId);
    if (!model) {
      return {};
    }

    const data: Record<string, any> = {};
    
    for (const point of model.points) {
      switch (modelId) {
        case SunSpecModelId.COMMON:
          // Common model data - relatively static
          switch (point.id) {
            case 'Mn':
              data[point.id] = 'SunnyMaker';
              break;
            case 'Md':
              data[point.id] = 'SolPro 3000';
              break;
            case 'SN':
              data[point.id] = 'SP3000-' + this.device.id.toString().padStart(8, '0');
              break;
            case 'Ver':
              data[point.id] = 'v1.2.3';
              break;
            default:
              data[point.id] = '';
          }
          break;
          
        case SunSpecModelId.INVERTER_THREE_PHASE:
          // Inverter data - more dynamic
          switch (point.id) {
            case 'A':
              data[point.id] = Math.random() * 10 + 5; // 5-15A
              break;
            case 'AphA':
            case 'AphB':
            case 'AphC':
              data[point.id] = Math.random() * 5 + 3; // 3-8A per phase
              break;
            case 'PPVphAB':
            case 'PPVphBC':
            case 'PPVphCA':
              data[point.id] = Math.random() * 10 + 395; // 395-405V
              break;
            case 'W':
              data[point.id] = Math.random() * 2000 + 1000; // 1-3kW
              break;
            case 'Hz':
              data[point.id] = 50 + (Math.random() * 0.2 - 0.1); // 49.9-50.1Hz
              break;
            case 'VA':
              data[point.id] = Math.random() * 2200 + 1100; // 1.1-3.3kVA
              break;
            case 'VAr':
              data[point.id] = Math.random() * 200 - 100; // -100 to +100 VAr
              break;
            case 'PF':
              data[point.id] = 0.95 + Math.random() * 0.05; // 0.95-1.0
              break;
            case 'WH':
              data[point.id] = 10000 + Math.random() * 5000; // 10-15kWh
              break;
            case 'DCA':
              data[point.id] = Math.random() * 8 + 4; // 4-12A
              break;
            case 'DCV':
              data[point.id] = Math.random() * 50 + 350; // 350-400V
              break;
            case 'DCW':
              data[point.id] = Math.random() * 2200 + 1100; // 1.1-3.3kW
              break;
            case 'TmpCab':
              data[point.id] = Math.random() * 20 + 30; // 30-50C
              break;
            case 'St':
              data[point.id] = 4; // 4 = MPPT
              break;
            default:
              data[point.id] = 0;
          }
          break;
          
        default:
          // For other models, generate random data based on point type
          switch (point.type) {
            case 'int16':
            case 'uint16':
              data[point.id] = Math.floor(Math.random() * 100);
              break;
            case 'int32':
            case 'uint32':
              data[point.id] = Math.floor(Math.random() * 10000);
              break;
            case 'float32':
              data[point.id] = Math.random() * 100;
              break;
            case 'string':
              data[point.id] = 'SunSpec_' + Math.floor(Math.random() * 1000);
              break;
            case 'enum16':
              data[point.id] = Math.floor(Math.random() * 5);
              break;
            default:
              data[point.id] = 0;
          }
      }
    }
    
    return data;
  }

  // Publish telemetry data via MQTT
  private async publishTelemetry(data: Record<string, any>): Promise<void> {
    const topic = `devices/${this.device.id}/telemetry`;
    
    try {
      await this.mqttService.publish(topic, {
        deviceId: this.device.id,
        timestamp: new Date().toISOString(),
        protocol: 'sunspec',
        readings: data
      });
    } catch (error) {
      console.error(`Error publishing telemetry for device ${this.device.id}:`, error);
    }
  }

  // Publish device status update via MQTT
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

  // Get last readings from device
  getLastReadings(): Record<string, any> {
    return this.lastReadings;
  }

  // Get device connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Get device scanning status
  isScanning(): boolean {
    return this.scanning;
  }
}

/**
 * SunSpec Manager - Manages all SunSpec devices in the system
 */
export class SunSpecManager {
  private adapters: Map<number, SunSpecAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    console.log('Initializing SunSpec Manager');
  }
  
  // Add a new SunSpec device
  async addDevice(deviceConfig: SunSpecDevice): Promise<void> {
    // Check if device already exists
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`SunSpec device ${deviceConfig.id} already registered`);
      return;
    }
    
    console.log(`Adding SunSpec device ${deviceConfig.id}`);
    
    // Create new adapter
    const adapter = new SunSpecAdapter(deviceConfig);
    
    // Store adapter
    this.adapters.set(deviceConfig.id, adapter);
    
    // Set up event handlers
    adapter.on('connected', (deviceId: number) => {
      console.log(`SunSpec device ${deviceId} connected`);
    });
    
    adapter.on('disconnected', (deviceId: number) => {
      console.log(`SunSpec device ${deviceId} disconnected`);
    });
    
    adapter.on('error', (error: Error) => {
      console.error('SunSpec device error:', error);
    });
    
    // Connect and start scanning if in development mode or if explicitly configured
    if (this.inDevelopment || deviceConfig.connection.mockMode) {
      try {
        await adapter.connect();
        await adapter.startScanning();
      } catch (error) {
        console.error(`Error starting SunSpec device ${deviceConfig.id}:`, error);
      }
    }
  }
  
  // Remove a SunSpec device
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      console.log(`SunSpec device ${deviceId} not found`);
      return;
    }
    
    // Disconnect device
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(deviceId);
    
    console.log(`Removed SunSpec device ${deviceId}`);
  }
  
  // Get a specific adapter
  getAdapter(deviceId: number): SunSpecAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  // Shut down all adapters
  async shutdown(): Promise<void> {
    console.log('Shutting down SunSpec Manager');
    
    // Disconnect all devices
    const shutdownPromises = Array.from(this.adapters.values()).map(adapter => adapter.disconnect());
    
    await Promise.all(shutdownPromises);
    
    // Clear adapters
    this.adapters.clear();
  }
}

// Singleton instance
let sunspecManager: SunSpecManager;

// Get the SunSpec manager instance
export function getSunSpecManager(): SunSpecManager {
  if (!sunspecManager) {
    sunspecManager = new SunSpecManager();
  }
  return sunspecManager;
}