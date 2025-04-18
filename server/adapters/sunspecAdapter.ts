/**
 * SunSpec Adapter for Energy Management System
 * 
 * This adapter implements the SunSpec protocol for solar inverters and other
 * renewable energy devices, supporting both Modbus TCP and Modbus RTU.
 */

import { v4 as uuidv4 } from 'uuid';
import ModbusRTU from 'modbus-serial';
import { getMqttService, formatDeviceTopic } from '../services/mqttService';
import { TOPIC_PATTERNS } from '@shared/messageSchema';

// SunSpec start register identifier
const SUNSPEC_ID_REGISTER = 40000;
const SUNSPEC_ID_VALUE = 0x53756e53; // "SunS" in ASCII

// SunSpec common model identifiers
const MODEL_COMMON = 1;        // Common Model
const MODEL_INVERTER_SINGLE = 101; // Single Phase Inverter
const MODEL_INVERTER_SPLIT = 102; // Split Phase Inverter
const MODEL_INVERTER_THREE = 103; // Three Phase Inverter
const MODEL_STORAGE = 124;     // Storage Device
const MODEL_MPPT = 160;        // Multiple Power Point Tracking
const MODEL_STRING_COMBINER = 403; // String Combiner / DC Meter

// SunSpec connection types
export enum SunSpecConnectionType {
  MODBUS_TCP = 'modbus_tcp',
  MODBUS_RTU = 'modbus_rtu',
  MODBUS_RTU_OVER_TCP = 'modbus_rtu_over_tcp',
  MOCK = 'mock'
}

// SunSpec device configuration
export interface SunSpecDeviceConfig {
  id: string;
  name?: string;
  connectionType: SunSpecConnectionType;
  host?: string;            // For TCP connections
  port?: number;            // For TCP connections
  serialPort?: string;      // For RTU connections
  baudRate?: number;        // For RTU connections
  parity?: string;          // For RTU connections
  dataBits?: number;        // For RTU connections
  stopBits?: number;        // For RTU connections
  unitId: number;           // Modbus unit/slave ID
  timeout?: number;         // Connection timeout in ms
  retryCount?: number;      // Number of connection retries
  scanInterval?: number;    // Milliseconds between data scans
  baseRegister?: number;    // Optional: override SunSpec base register
  models?: number[];        // Optional: specific models to scan
}

// SunSpec model information
interface SunSpecModel {
  id: number;
  length: number;
  address: number;
  name: string;
  data?: Record<string, any>;
}

// Supported SunSpec points by model type
const MODEL_POINTS: Record<number, Record<string, { address: number, length: number, type: string, sf?: string, unit?: string }>> = {
  [MODEL_COMMON]: {
    Mn: { address: 4, length: 16, type: 'string', unit: '' },      // Manufacturer
    Md: { address: 20, length: 16, type: 'string', unit: '' },     // Model
    SN: { address: 36, length: 16, type: 'string', unit: '' },     // Serial Number
    DA: { address: 52, length: 1, type: 'uint16', unit: '' },      // Device Address
    Vr: { address: 53, length: 8, type: 'string', unit: '' },      // Version
  },
  [MODEL_INVERTER_SINGLE]: {
    A: { address: 2, length: 1, type: 'uint16', sf: 'A_SF', unit: 'A' },       // AC Current
    AphA: { address: 3, length: 1, type: 'uint16', sf: 'A_SF', unit: 'A' },    // Phase A Current
    PhVphA: { address: 4, length: 1, type: 'uint16', sf: 'V_SF', unit: 'V' },  // Phase A Voltage
    W: { address: 14, length: 1, type: 'int16', sf: 'W_SF', unit: 'W' },       // AC Power
    Hz: { address: 15, length: 1, type: 'uint16', sf: 'Hz_SF', unit: 'Hz' },   // AC Frequency
    WH: { address: 20, length: 2, type: 'uint32', sf: 'WH_SF', unit: 'Wh' },   // AC Lifetime Energy
    DCA: { address: 22, length: 1, type: 'uint16', sf: 'DCA_SF', unit: 'A' },  // DC Current
    DCV: { address: 23, length: 1, type: 'uint16', sf: 'DCV_SF', unit: 'V' },  // DC Voltage
    DCW: { address: 24, length: 1, type: 'int16', sf: 'DCW_SF', unit: 'W' },   // DC Power
    TmpCab: { address: 30, length: 1, type: 'int16', sf: 'Tmp_SF', unit: 'C' }, // Cabinet Temperature
    St: { address: 31, length: 1, type: 'enum16', unit: '' },                  // Operating State
    StVnd: { address: 32, length: 1, type: 'enum16', unit: '' },               // Vendor Operating State
    Evt1: { address: 33, length: 1, type: 'uint32', unit: '' },                // Event Flags
    A_SF: { address: 36, length: 1, type: 'sunssf', unit: '' },                // Current Scale Factor
    V_SF: { address: 37, length: 1, type: 'sunssf', unit: '' },                // Voltage Scale Factor
    W_SF: { address: 38, length: 1, type: 'sunssf', unit: '' },                // Power Scale Factor
    WH_SF: { address: 39, length: 1, type: 'sunssf', unit: '' },               // Energy Scale Factor
    DCA_SF: { address: 40, length: 1, type: 'sunssf', unit: '' },              // DC Current Scale Factor
    DCV_SF: { address: 41, length: 1, type: 'sunssf', unit: '' },              // DC Voltage Scale Factor
    DCW_SF: { address: 42, length: 1, type: 'sunssf', unit: '' },              // DC Power Scale Factor
    Tmp_SF: { address: 43, length: 1, type: 'sunssf', unit: '' },              // Temperature Scale Factor
  },
  [MODEL_INVERTER_THREE]: {
    A: { address: 2, length: 1, type: 'uint16', sf: 'A_SF', unit: 'A' },       // AC Total Current
    AphA: { address: 3, length: 1, type: 'uint16', sf: 'A_SF', unit: 'A' },    // Phase A Current
    AphB: { address: 4, length: 1, type: 'uint16', sf: 'A_SF', unit: 'A' },    // Phase B Current
    AphC: { address: 5, length: 1, type: 'uint16', sf: 'A_SF', unit: 'A' },    // Phase C Current
    PPVphAB: { address: 6, length: 1, type: 'uint16', sf: 'V_SF', unit: 'V' }, // Phase AB Voltage
    PPVphBC: { address: 7, length: 1, type: 'uint16', sf: 'V_SF', unit: 'V' }, // Phase BC Voltage
    PPVphCA: { address: 8, length: 1, type: 'uint16', sf: 'V_SF', unit: 'V' }, // Phase CA Voltage
    PhVphA: { address: 9, length: 1, type: 'uint16', sf: 'V_SF', unit: 'V' },  // Phase A Voltage
    PhVphB: { address: 10, length: 1, type: 'uint16', sf: 'V_SF', unit: 'V' }, // Phase B Voltage
    PhVphC: { address: 11, length: 1, type: 'uint16', sf: 'V_SF', unit: 'V' }, // Phase C Voltage
    W: { address: 14, length: 1, type: 'int16', sf: 'W_SF', unit: 'W' },       // AC Power
    Hz: { address: 15, length: 1, type: 'uint16', sf: 'Hz_SF', unit: 'Hz' },   // AC Frequency
    WH: { address: 20, length: 2, type: 'uint32', sf: 'WH_SF', unit: 'Wh' },   // AC Lifetime Energy
    DCA: { address: 22, length: 1, type: 'uint16', sf: 'DCA_SF', unit: 'A' },  // DC Current
    DCV: { address: 23, length: 1, type: 'uint16', sf: 'DCV_SF', unit: 'V' },  // DC Voltage
    DCW: { address: 24, length: 1, type: 'int16', sf: 'DCW_SF', unit: 'W' },   // DC Power
    TmpCab: { address: 30, length: 1, type: 'int16', sf: 'Tmp_SF', unit: 'C' }, // Cabinet Temperature
    St: { address: 31, length: 1, type: 'enum16', unit: '' },                  // Operating State
    StVnd: { address: 32, length: 1, type: 'enum16', unit: '' },               // Vendor Operating State
    Evt1: { address: 33, length: 1, type: 'uint32', unit: '' },                // Event Flags
    A_SF: { address: 36, length: 1, type: 'sunssf', unit: '' },                // Current Scale Factor
    V_SF: { address: 37, length: 1, type: 'sunssf', unit: '' },                // Voltage Scale Factor
    W_SF: { address: 38, length: 1, type: 'sunssf', unit: '' },                // Power Scale Factor
    WH_SF: { address: 39, length: 1, type: 'sunssf', unit: '' },               // Energy Scale Factor
    DCA_SF: { address: 40, length: 1, type: 'sunssf', unit: '' },              // DC Current Scale Factor
    DCV_SF: { address: 41, length: 1, type: 'sunssf', unit: '' },              // DC Voltage Scale Factor
    DCW_SF: { address: 42, length: 1, type: 'sunssf', unit: '' },              // DC Power Scale Factor
    Tmp_SF: { address: 43, length: 1, type: 'sunssf', unit: '' },              // Temperature Scale Factor
  },
  [MODEL_STORAGE]: {
    ChaSt: { address: 2, length: 1, type: 'enum16', unit: '' },                // Charge Status
    WhRtg: { address: 3, length: 1, type: 'uint16', sf: 'WRtg_SF', unit: 'Wh' }, // WH Rating
    W: { address: 4, length: 1, type: 'int16', sf: 'W_SF', unit: 'W' },        // Power
    St: { address: 8, length: 1, type: 'enum16', unit: '' },                   // State
    SoC: { address: 14, length: 1, type: 'uint16', sf: 'SoC_SF', unit: '%' },  // State of Charge
    DoD: { address: 15, length: 1, type: 'uint16', sf: 'DoD_SF', unit: '%' },  // Depth of Discharge
    SoH: { address: 16, length: 1, type: 'uint16', sf: 'SoH_SF', unit: '%' },  // State of Health
    NCyc: { address: 17, length: 1, type: 'uint16', unit: 'cycles' },          // Cycle Count
    ChaTm: { address: 27, length: 1, type: 'uint32', unit: 'secs' },           // Charge Time Remaining
    WRtg_SF: { address: 31, length: 1, type: 'sunssf', unit: '' },             // Rating Scale Factor
    W_SF: { address: 32, length: 1, type: 'sunssf', unit: '' },                // Power Scale Factor
    SoC_SF: { address: 33, length: 1, type: 'sunssf', unit: '' },              // SoC Scale Factor
    DoD_SF: { address: 34, length: 1, type: 'sunssf', unit: '' },              // DoD Scale Factor
    SoH_SF: { address: 35, length: 1, type: 'sunssf', unit: '' },              // SoH Scale Factor
  }
};

// Mapping of operating state values
const OPERATING_STATES: Record<number, string> = {
  1: 'Off',
  2: 'Sleeping',
  3: 'Starting',
  4: 'MPPT',
  5: 'Throttled',
  6: 'Shutting down',
  7: 'Fault',
  8: 'Standby'
};

/**
 * SunSpec Adapter for communication with SunSpec-compliant devices
 */
export class SunSpecAdapter {
  private deviceId: string;
  private config: SunSpecDeviceConfig;
  private client: ModbusRTU;
  private connected: boolean = false;
  private models: SunSpecModel[] = [];
  private scanIntervalId: NodeJS.Timeout | null = null;
  private baseRegister: number;
  private retryCount: number = 0;
  private deviceInfo: Record<string, any> = {};
  private lastReadings: Record<string, any> = {};
  private status: 'online' | 'offline' | 'error' = 'offline';
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';

  constructor(config: SunSpecDeviceConfig) {
    this.deviceId = config.id;
    this.config = {
      ...config,
      timeout: config.timeout || 5000,
      retryCount: config.retryCount || 3,
      scanInterval: config.scanInterval || 60000, // Default to 1 minute
      baseRegister: config.baseRegister || SUNSPEC_ID_REGISTER
    };
    this.baseRegister = this.config.baseRegister!;
    this.client = new ModbusRTU();
    
    if (this.inDevelopment) {
      console.log(`Development mode: Using simulated SunSpec device ${this.deviceId}`);
    }
  }

  /**
   * Connect to the SunSpec device
   */
  async connect(): Promise<boolean> {
    if (this.connected) return true;
    
    // For development mode, don't actually connect
    if (this.inDevelopment || this.config.connectionType === SunSpecConnectionType.MOCK) {
      this.connected = true;
      console.log(`Simulated connection to SunSpec device ${this.deviceId}`);
      this.setupMockData();
      this.publishStatus('online');
      return true;
    }
    
    try {
      const connection = this.config.connectionType;
      
      switch (connection) {
        case SunSpecConnectionType.MODBUS_TCP:
          if (!this.config.host || !this.config.port) {
            throw new Error('Host and port required for Modbus TCP connection');
          }
          await this.client.connectTCP(this.config.host, { port: this.config.port });
          break;
          
        case SunSpecConnectionType.MODBUS_RTU:
          if (!this.config.serialPort) {
            throw new Error('Serial port required for Modbus RTU connection');
          }
          await this.client.connectRTU(this.config.serialPort, {
            baudRate: this.config.baudRate || 9600,
            parity: (this.config.parity as any) || 'none',
            dataBits: this.config.dataBits || 8,
            stopBits: this.config.stopBits || 1
          });
          break;
          
        case SunSpecConnectionType.MODBUS_RTU_OVER_TCP:
          if (!this.config.host || !this.config.port) {
            throw new Error('Host and port required for Modbus RTU over TCP connection');
          }
          await this.client.connectTcpRTUBuffered(this.config.host, { port: this.config.port });
          break;
          
        default:
          throw new Error(`Unsupported connection type: ${connection}`);
      }
      
      // Set the Modbus unit ID
      this.client.setID(this.config.unitId);
      
      // Set the timeout
      this.client.setTimeout(this.config.timeout!);
      
      this.connected = true;
      this.retryCount = 0;
      console.log(`Connected to SunSpec device ${this.deviceId}`);
      
      // Detect SunSpec models
      await this.detectSunSpecModels();
      
      // Read device information
      await this.readDeviceInfo();
      
      // Publish status update via MQTT
      this.publishStatus('online');
      
      return true;
    } catch (error) {
      console.error(`Error connecting to SunSpec device ${this.deviceId}:`, error);
      
      // Retry logic
      if (this.retryCount < this.config.retryCount!) {
        this.retryCount++;
        console.log(`Retrying connection to SunSpec device ${this.deviceId} (attempt ${this.retryCount}/${this.config.retryCount!})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.connect();
      }
      
      // Publish device status update via MQTT
      this.publishStatus('error', `Connection error: ${error.message}`);
      
      return false;
    }
  }

  /**
   * Disconnect from the SunSpec device
   */
  async disconnect(): Promise<void> {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    
    // For development mode, just reset state
    if (this.inDevelopment || this.config.connectionType === SunSpecConnectionType.MOCK) {
      this.connected = false;
      console.log(`Simulated disconnection from SunSpec device ${this.deviceId}`);
      this.publishStatus('offline');
      return;
    }
    
    try {
      if (this.connected) {
        await this.client.close();
        this.connected = false;
        console.log(`Disconnected from SunSpec device ${this.deviceId}`);
        
        // Publish device status update via MQTT
        this.publishStatus('offline');
      }
    } catch (error) {
      console.error(`Error disconnecting from SunSpec device ${this.deviceId}:`, error);
    }
  }

  /**
   * Start scanning the SunSpec device
   */
  async startScanning(): Promise<void> {
    if (this.scanIntervalId) {
      console.log(`Scanning already in progress for SunSpec device ${this.deviceId}`);
      return;
    }
    
    // Ensure we're connected first
    if (!this.connected) {
      const connected = await this.connect();
      if (!connected) {
        console.error(`Cannot start scanning - device ${this.deviceId} is not connected`);
        return;
      }
    }
    
    // Initial scan
    await this.scanDevice();
    
    // Start periodic scanning
    this.scanIntervalId = setInterval(async () => {
      await this.scanDevice();
    }, this.config.scanInterval!);
    
    console.log(`Started scanning SunSpec device ${this.deviceId} every ${this.config.scanInterval}ms`);
  }

  /**
   * Stop scanning the SunSpec device
   */
  stopScanning(): void {
    if (!this.scanIntervalId) return;
    
    clearInterval(this.scanIntervalId);
    this.scanIntervalId = null;
    console.log(`Stopped scanning SunSpec device ${this.deviceId}`);
  }

  /**
   * Scan the SunSpec device and read data from all models
   */
  private async scanDevice(): Promise<void> {
    try {
      // For development mode, just generate random data
      if (this.inDevelopment || this.config.connectionType === SunSpecConnectionType.MOCK) {
        this.updateMockData();
        this.publishTelemetry();
        return;
      }
      
      if (!this.connected) {
        console.log(`Cannot scan - device ${this.deviceId} is not connected`);
        return;
      }
      
      // Read data from each model
      for (const model of this.models) {
        await this.readModelData(model);
      }
      
      // Publish telemetry data
      this.publishTelemetry();
      
      // Occasional heartbeat status update
      if (Math.random() < 0.05) { // ~5% chance per scan
        this.publishStatus('online');
      }
    } catch (error) {
      console.error(`Error scanning SunSpec device ${this.deviceId}:`, error);
      
      // Check for connection errors
      if (error.message && (
        error.message.includes('Port is closed') || 
        error.message.includes('Connection timed out') || 
        error.message.includes('Not connected')
      )) {
        console.log(`Reconnecting to SunSpec device ${this.deviceId} after connection error`);
        this.connected = false;
        await this.connect();
      }
      
      // Update status
      this.publishStatus('error', `Scan error: ${error.message}`);
    }
  }

  /**
   * Detect SunSpec models in the device
   */
  private async detectSunSpecModels(): Promise<void> {
    // Clear existing models
    this.models = [];
    
    // For development mode, use predefined models
    if (this.inDevelopment || this.config.connectionType === SunSpecConnectionType.MOCK) {
      this.setupMockModels();
      return;
    }
    
    try {
      // Check for SunSpec ID
      const idResponse = await this.client.readHoldingRegisters(this.baseRegister, 2);
      const sunSpecId = (idResponse.buffer.readUInt16BE(0) << 16) | idResponse.buffer.readUInt16BE(2);
      
      if (sunSpecId !== SUNSPEC_ID_VALUE) {
        // Try other common base registers
        const alternateRegisters = [40000, 50000, 0, 1];
        let found = false;
        
        for (const register of alternateRegisters) {
          if (register === this.baseRegister) continue;
          
          try {
            const alt = await this.client.readHoldingRegisters(register, 2);
            const altId = (alt.buffer.readUInt16BE(0) << 16) | alt.buffer.readUInt16BE(2);
            
            if (altId === SUNSPEC_ID_VALUE) {
              this.baseRegister = register;
              found = true;
              console.log(`Found SunSpec header at register ${register}`);
              break;
            }
          } catch (err) {
            // Ignore errors, just try next register
          }
        }
        
        if (!found) {
          throw new Error('SunSpec identifier not found');
        }
      }
      
      // Read models
      let address = this.baseRegister + 2; // Start after SunSpec ID
      
      while (true) {
        // Read model header (model ID and length)
        const headerResponse = await this.client.readHoldingRegisters(address, 2);
        const modelId = headerResponse.buffer.readUInt16BE(0);
        const modelLength = headerResponse.buffer.readUInt16BE(2);
        
        // End marker (modelId = 0xFFFF)
        if (modelId === 0xFFFF) {
          break;
        }
        
        // Add model to the list
        const model: SunSpecModel = {
          id: modelId,
          length: modelLength,
          address: address + 2, // Data starts after header
          name: this.getModelName(modelId)
        };
        
        this.models.push(model);
        console.log(`Found SunSpec model ${model.id} (${model.name}) at address ${address}, length ${model.length}`);
        
        // Move to next model
        address += 2 + modelLength;
      }
      
      if (this.models.length === 0) {
        throw new Error('No SunSpec models found');
      }
    } catch (error) {
      console.error(`Error detecting SunSpec models: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read device information (Common Model)
   */
  private async readDeviceInfo(): Promise<void> {
    // Find common model (ID = 1)
    const commonModel = this.models.find(m => m.id === MODEL_COMMON);
    if (!commonModel) {
      console.warn('Common model not found in SunSpec device');
      return;
    }
    
    if (this.inDevelopment || this.config.connectionType === SunSpecConnectionType.MOCK) {
      // Use mock data
      this.deviceInfo = {
        manufacturer: 'SunSpec Mock',
        model: 'InverterSim 2000',
        serialNumber: `SIM-${this.deviceId}`,
        version: '1.0.0'
      };
      return;
    }
    
    try {
      // Read manufacturer (16 registers, 4 bytes each = 32 chars)
      await this.readModelData(commonModel);
      
      if (commonModel.data) {
        this.deviceInfo = {
          manufacturer: commonModel.data.Mn,
          model: commonModel.data.Md,
          serialNumber: commonModel.data.SN,
          version: commonModel.data.Vr
        };
        
        console.log(`Device info: ${JSON.stringify(this.deviceInfo)}`);
      }
    } catch (error) {
      console.error(`Error reading device info: ${error.message}`);
    }
  }

  /**
   * Read data from a SunSpec model
   */
  private async readModelData(model: SunSpecModel): Promise<void> {
    // Skip for mock devices
    if (this.inDevelopment || this.config.connectionType === SunSpecConnectionType.MOCK) {
      return;
    }
    
    // Get points for this model
    const points = MODEL_POINTS[model.id];
    if (!points) {
      // console.log(`No point definitions for model ${model.id}`);
      return;
    }
    
    try {
      // Read all registers for the model
      const response = await this.client.readHoldingRegisters(model.address, model.length);
      
      // Process each point
      const modelData: Record<string, any> = {};
      const scaleFactors: Record<string, number> = {};
      
      // First pass: extract scale factors
      for (const [name, point] of Object.entries(points)) {
        if (point.type === 'sunssf') {
          const value = this.extractValue(response.buffer, point.address, point.type);
          scaleFactors[name] = value;
        }
      }
      
      // Second pass: extract values and apply scale factors
      for (const [name, point] of Object.entries(points)) {
        if (point.type !== 'sunssf') {
          let value = this.extractValue(response.buffer, point.address, point.type, point.length);
          
          // Apply scale factor if specified
          if (point.sf && scaleFactors[point.sf] !== undefined) {
            const scaleFactor = scaleFactors[point.sf];
            value = value * Math.pow(10, scaleFactor);
          }
          
          // Special handling for enum values
          if (point.type === 'enum16' && name === 'St') {
            const enumValue = value;
            value = {
              value: enumValue,
              label: OPERATING_STATES[enumValue] || `Unknown (${enumValue})`
            };
          }
          
          modelData[name] = value;
        }
      }
      
      // Store the data in the model
      model.data = modelData;
      
      // Update last readings - flatten the structure
      if (model.id !== MODEL_COMMON) { // Skip common model
        for (const [name, value] of Object.entries(modelData)) {
          // Skip complex objects
          if (typeof value !== 'object') {
            const key = `${this.getModelPrefix(model.id)}_${name}`;
            this.lastReadings[key] = value;
          }
        }
      }
    } catch (error) {
      console.error(`Error reading model ${model.id} data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract value from buffer based on data type
   */
  private extractValue(buffer: Buffer, address: number, type: string, length: number = 1): any {
    const offset = (address - 2) * 2; // Convert register address to buffer offset
    
    switch (type) {
      case 'uint16':
        return buffer.readUInt16BE(offset);
      case 'int16':
        return buffer.readInt16BE(offset);
      case 'uint32':
        return buffer.readUInt32BE(offset);
      case 'int32':
        return buffer.readInt32BE(offset);
      case 'float32':
        return buffer.readFloatBE(offset);
      case 'sunssf':
        return buffer.readInt16BE(offset);
      case 'enum16':
        return buffer.readUInt16BE(offset);
      case 'string':
        let str = '';
        for (let i = 0; i < length; i++) {
          const reg = buffer.readUInt16BE(offset + i * 2);
          const char1 = reg >> 8;
          const char2 = reg & 0xFF;
          if (char1 > 0) str += String.fromCharCode(char1);
          if (char2 > 0) str += String.fromCharCode(char2);
        }
        return str.trim();
      default:
        return null;
    }
  }

  /**
   * Get a human-readable name for a SunSpec model ID
   */
  private getModelName(modelId: number): string {
    switch (modelId) {
      case MODEL_COMMON:
        return 'Common';
      case MODEL_INVERTER_SINGLE:
        return 'Single Phase Inverter';
      case MODEL_INVERTER_SPLIT:
        return 'Split Phase Inverter';
      case MODEL_INVERTER_THREE:
        return 'Three Phase Inverter';
      case MODEL_STORAGE:
        return 'Storage';
      case MODEL_MPPT:
        return 'MPPT';
      case MODEL_STRING_COMBINER:
        return 'String Combiner';
      default:
        return `Model ${modelId}`;
    }
  }

  /**
   * Get a prefix for readings from a specific model
   */
  private getModelPrefix(modelId: number): string {
    switch (modelId) {
      case MODEL_INVERTER_SINGLE:
      case MODEL_INVERTER_SPLIT:
      case MODEL_INVERTER_THREE:
        return 'inv';
      case MODEL_STORAGE:
        return 'storage';
      case MODEL_MPPT:
        return 'mppt';
      case MODEL_STRING_COMBINER:
        return 'string';
      default:
        return `model${modelId}`;
    }
  }

  /**
   * Setup mock models for development mode
   */
  private setupMockModels(): void {
    this.models = [
      {
        id: MODEL_COMMON,
        length: 66,
        address: this.baseRegister + 4,
        name: 'Common'
      },
      {
        id: MODEL_INVERTER_THREE,
        length: 60,
        address: this.baseRegister + 72,
        name: 'Three Phase Inverter'
      },
      {
        id: MODEL_STORAGE,
        length: 40,
        address: this.baseRegister + 134,
        name: 'Storage'
      }
    ];
  }

  /**
   * Setup mock data for development mode
   */
  private setupMockData(): void {
    // Mock basic readings
    this.lastReadings = {
      'inv_A': 5.2,
      'inv_AphA': 1.7,
      'inv_AphB': 1.8,
      'inv_AphC': 1.7,
      'inv_PPVphAB': 230.5,
      'inv_PPVphBC': 231.2,
      'inv_PPVphCA': 230.8,
      'inv_PhVphA': 133.2,
      'inv_PhVphB': 133.5,
      'inv_PhVphC': 133.3,
      'inv_W': 3500,
      'inv_Hz': 50.02,
      'inv_WH': 25750000,
      'inv_DCA': 9.2,
      'inv_DCV': 380.5,
      'inv_DCW': 3500,
      'inv_TmpCab': 42.5,
      'inv_St': { value: 4, label: 'MPPT' },
      'storage_ChaSt': 1,
      'storage_WhRtg': 10000,
      'storage_W': 0,
      'storage_St': 1,
      'storage_SoC': 87.5,
      'storage_DoD': 12.5,
      'storage_SoH': 98.2,
      'storage_NCyc': 120
    };
    
    // Setup device info
    this.deviceInfo = {
      manufacturer: 'SunSpec Mock',
      model: 'InverterSim 2000',
      serialNumber: `SIM-${this.deviceId}`,
      version: '1.0.0'
    };
  }

  /**
   * Update mock data for development mode
   */
  private updateMockData(): void {
    // Update AC power (with some randomness based on time of day)
    const hour = new Date().getHours();
    const baseACPower = hour >= 9 && hour <= 16 ? 3500 : (hour >= 7 && hour <= 18 ? 1500 : 0);
    const powerVariation = baseACPower * 0.15; // 15% variation
    const acPower = baseACPower + (Math.random() * powerVariation * 2 - powerVariation);
    
    // Update inverter readings
    this.lastReadings['inv_W'] = acPower;
    this.lastReadings['inv_DCW'] = acPower * 1.05; // DC power slightly higher
    this.lastReadings['inv_A'] = acPower / 230 / Math.sqrt(3);
    this.lastReadings['inv_AphA'] = this.lastReadings['inv_A'] / 3;
    this.lastReadings['inv_AphB'] = this.lastReadings['inv_A'] / 3;
    this.lastReadings['inv_AphC'] = this.lastReadings['inv_A'] / 3;
    this.lastReadings['inv_DCA'] = this.lastReadings['inv_DCW'] / this.lastReadings['inv_DCV'];
    this.lastReadings['inv_Hz'] = 50 + (Math.random() * 0.04 - 0.02);
    this.lastReadings['inv_TmpCab'] = 25 + (acPower / 5000 * 20) + (Math.random() * 2 - 1);
    
    // Update lifetime energy (accumulate)
    this.lastReadings['inv_WH'] = (this.lastReadings['inv_WH'] || 25000000) + acPower / 60; // Assume 1-minute intervals
    
    // Update operating state
    if (acPower < 100) {
      this.lastReadings['inv_St'] = { value: 2, label: 'Sleeping' };
    } else {
      this.lastReadings['inv_St'] = { value: 4, label: 'MPPT' };
    }
    
    // Update storage readings (if generation > consumption, charge; otherwise discharge)
    const excessPower = acPower - 2000; // Assume 2kW consumption
    
    if (excessPower > 200) {
      // Charging
      this.lastReadings['storage_ChaSt'] = 2; // Charging
      this.lastReadings['storage_W'] = -Math.min(excessPower, 5000); // Negative for charging
      // Increase SoC
      this.lastReadings['storage_SoC'] = Math.min(100, this.lastReadings['storage_SoC'] + ((-this.lastReadings['storage_W']) / 10000));
      this.lastReadings['storage_DoD'] = 100 - this.lastReadings['storage_SoC'];
    } else if (excessPower < -200) {
      // Discharging
      this.lastReadings['storage_ChaSt'] = 3; // Discharging
      this.lastReadings['storage_W'] = Math.min(-excessPower, 5000); // Positive for discharging
      // Decrease SoC
      this.lastReadings['storage_SoC'] = Math.max(0, this.lastReadings['storage_SoC'] - (this.lastReadings['storage_W'] / 10000));
      this.lastReadings['storage_DoD'] = 100 - this.lastReadings['storage_SoC'];
    } else {
      // Idle
      this.lastReadings['storage_ChaSt'] = 1; // Idle
      this.lastReadings['storage_W'] = 0;
    }
  }

  /**
   * Get the device information
   */
  getDeviceInfo(): Record<string, any> {
    return this.deviceInfo;
  }

  /**
   * Get the last readings
   */
  getLastReadings(): Record<string, any> {
    return this.lastReadings;
  }

  /**
   * Get the connection status
   */
  getConnectionStatus(): boolean {
    return this.connected;
  }

  /**
   * Get the SunSpec models
   */
  getModels(): SunSpecModel[] {
    return this.models;
  }

  /**
   * Publish status via MQTT
   */
  private publishStatus(status: 'online' | 'offline' | 'error', details?: string): void {
    this.status = status;
    
    const statusMessage = {
      messageId: uuidv4(),
      messageType: 'status',
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      status,
      details,
      deviceType: 'solar_inverter',
      protocol: 'sunspec',
      manufacturer: this.deviceInfo.manufacturer || 'Unknown',
      model: this.deviceInfo.model || 'Unknown'
    };
    
    const topic = formatDeviceTopic(TOPIC_PATTERNS.STATUS, this.deviceId);
    try {
      this.mqttService.publish(topic, statusMessage);
    } catch (error) {
      console.error(`Error publishing status for device ${this.deviceId}:`, error);
    }
  }

  /**
   * Publish telemetry via MQTT
   */
  private publishTelemetry(): void {
    // Skip if we have no readings
    if (Object.keys(this.lastReadings).length === 0) {
      return;
    }
    
    // Prepare telemetry message
    const readings: Record<string, number> = {};
    const units: Record<string, string> = {};
    
    // Map SunSpec readings to standard EMS fields
    for (const [key, value] of Object.entries(this.lastReadings)) {
      // Skip complex objects
      if (typeof value === 'object') continue;
      
      // Add original reading with its original key
      readings[key] = value;
      
      // Map to standard fields based on key patterns
      if (key.includes('_W') && !key.includes('_WH') && !key.includes('_DCW')) {
        readings.power = value;
        units.power = 'W';
      } else if (key.includes('_WH')) {
        readings.energy = value;
        units.energy = 'Wh';
      } else if (key.includes('_DCW')) {
        readings.dcPower = value;
        units.dcPower = 'W';
      } else if (key.includes('_DCV')) {
        readings.dcVoltage = value;
        units.dcVoltage = 'V';
      } else if (key.includes('_DCA')) {
        readings.dcCurrent = value;
        units.dcCurrent = 'A';
      } else if (key.includes('_SoC')) {
        readings.stateOfCharge = value;
        units.stateOfCharge = '%';
      } else if (key.includes('_Hz')) {
        readings.frequency = value;
        units.frequency = 'Hz';
      } else if (key.includes('_TmpCab')) {
        readings.temperature = value;
        units.temperature = 'C';
      }
    }
    
    // Add operational status as numeric value for charting
    if (this.lastReadings['inv_St'] && typeof this.lastReadings['inv_St'] === 'object') {
      readings.statusValue = this.lastReadings['inv_St'].value;
      readings.isGenerating = this.lastReadings['inv_St'].value === 4 ? 1 : 0; // MPPT = generating
    }
    
    // Add battery status as numeric value for charting
    if (this.lastReadings['storage_ChaSt']) {
      readings.batteryStatusValue = this.lastReadings['storage_ChaSt'];
      readings.isCharging = this.lastReadings['storage_ChaSt'] === 2 ? 1 : 0;
      readings.isDischarging = this.lastReadings['storage_ChaSt'] === 3 ? 1 : 0;
    }
    
    const telemetryMessage = {
      messageId: uuidv4(),
      messageType: 'telemetry',
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      readings,
      units,
      deviceType: 'solar_inverter',
      protocol: 'sunspec',
      manufacturer: this.deviceInfo.manufacturer || 'Unknown',
      model: this.deviceInfo.model || 'Unknown'
    };
    
    const topic = formatDeviceTopic(TOPIC_PATTERNS.TELEMETRY, this.deviceId);
    try {
      this.mqttService.publish(topic, telemetryMessage);
    } catch (error) {
      console.error(`Error publishing telemetry for device ${this.deviceId}:`, error);
    }
  }
}

/**
 * SunSpec Manager for managing multiple SunSpec devices
 */
export class SunSpecManager {
  private adapters: Map<string, SunSpecAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  /**
   * Add a SunSpec device
   */
  async addDevice(config: SunSpecDeviceConfig): Promise<SunSpecAdapter> {
    // Check if device already exists
    if (this.adapters.has(config.id)) {
      return this.adapters.get(config.id)!;
    }
    
    // Create new adapter
    const adapter = new SunSpecAdapter(config);
    this.adapters.set(config.id, adapter);
    
    // Connect and start scanning
    try {
      await adapter.connect();
      await adapter.startScanning();
    } catch (error) {
      console.error(`Failed to initialize SunSpec device ${config.id}:`, error);
    }
    
    return adapter;
  }
  
  /**
   * Remove a SunSpec device
   */
  async removeDevice(id: string): Promise<boolean> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return false;
    }
    
    // Stop scanning and disconnect
    adapter.stopScanning();
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(id);
    
    return true;
  }
  
  /**
   * Get a SunSpec device adapter
   */
  getDevice(id: string): SunSpecAdapter | undefined {
    return this.adapters.get(id);
  }
  
  /**
   * Get all SunSpec devices
   */
  getAllDevices(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Initialize with sample devices (for development)
   */
  async initializeWithSamples(): Promise<void> {
    if (!this.inDevelopment) {
      return;
    }
    
    console.log('Development mode: Initializing sample SunSpec devices');
    
    // Add sample devices
    await this.addDevice({
      id: 'SUN001',
      name: 'Solar Inverter 1',
      connectionType: SunSpecConnectionType.MOCK,
      unitId: 1
    });
    
    await this.addDevice({
      id: 'SUN002',
      name: 'Solar Inverter 2',
      connectionType: SunSpecConnectionType.MOCK,
      unitId: 2
    });
    
    console.log('Sample SunSpec devices initialized');
  }
  
  /**
   * Disconnect all devices
   */
  async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      adapter.stopScanning();
      await adapter.disconnect();
    }
  }
}

// Initialize SunSpec Manager
export const sunspecManager = new SunSpecManager();

export default {
  SunSpecAdapter,
  SunSpecManager,
  sunspecManager,
  SunSpecConnectionType
};