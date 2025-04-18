import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { getMqttService, formatDeviceTopic, formatTopic } from './mqttService';
import { TOPIC_PATTERNS } from '@shared/messageSchema';
import { getModbusManager, ModbusDevice } from '../adapters/modbusAdapter';
import { ocppManager, OcppChargePointConfig as OCPPDevice } from '../adapters/ocppAdapter';
import { getEEBusManager, EEBusDevice } from '../adapters/eebusAdapter';
import { sunspecManager, SunSpecDeviceConfig as SunSpecDevice } from '../adapters/sunspecAdapter';
import { getTCPIPManager, TCPIPDevice } from '../adapters/tcpipAdapter';
import { getGatewayManager, GatewayDevice, GatewayDeviceType } from '../adapters/gatewayAdapter';

// Device types supported by the system
export type DeviceType = 'solar_pv' | 'battery_storage' | 'ev_charger' | 'smart_meter' | 'heat_pump' | 'gateway' | 'generic';

// Communication protocols supported by devices
export type ProtocolType = 'mqtt' | 'modbus' | 'ocpp' | 'eebus' | 'sunspec' | 'tcpip' | 'gateway' | 'rest';

// Device status
export type DeviceStatus = 'online' | 'offline' | 'error' | 'maintenance' | 'standby';

// Device authentication methods
export type AuthMethod = 'client_cert' | 'api_key' | 'oauth' | 'basic' | 'none';

// Device data interface
export interface Device {
  id: number;
  name: string;
  type: DeviceType;
  model: string;
  manufacturer: string;
  serialNumber: string;
  firmwareVersion: string;
  protocol: ProtocolType;
  protocolConfig: any;
  status: DeviceStatus;
  authMethod: AuthMethod;
  authCredentials: AuthCredentials;
  siteId: number;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  metadata?: Record<string, any>;
  capabilities?: string[];
  specs?: {
    capacity?: number;       // kWh for batteries
    maxChargeRate?: number;  // kW for batteries and EV chargers 
    maxDischargeRate?: number; // kW for batteries
    efficiency?: number;     // Round-trip efficiency (0-1)
    maxPower?: number;       // kW for solar, EV chargers
    nominalVoltage?: number; // V
    nominalCurrent?: number; // A
    ratedPower?: number;     // kW
    [key: string]: any;      // Allow for additional device-specific specs
  };
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
}

// Authentication credentials interface
export interface AuthCredentials {
  apiKey?: string;
  apiKeyHash?: string;
  clientCert?: {
    thumbprint: string;
    issuedBy: string;
    expiresAt: string;
  };
  oauth?: {
    clientId: string;
    scope: string;
  };
  basic?: {
    username: string;
    passwordHash: string;
  };
}

// Configuration for the device management service
export interface DeviceManagementConfig {
  enableAutoProvisioning?: boolean;
  enableAlerts?: boolean;
  defaultHeartbeatInterval?: number;
  mockDevicesInDevelopment?: boolean;
  devModeDeviceCount?: number;
}

// In-memory storage for devices (will be replaced with database in production)
class DeviceRegistry {
  private devices: Map<number, Device> = new Map();
  private devicesBySerial: Map<string, number> = new Map();
  private nextId: number = 1;
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    if (this.inDevelopment) {
      console.log('Development mode: Initializing device registry with mock devices');
    }
  }
  
  // Add a new device to the registry
  addDevice(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Device {
    const now = new Date().toISOString();
    const newDevice: Device = {
      ...device,
      id: this.nextId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.devices.set(newDevice.id, newDevice);
    this.devicesBySerial.set(newDevice.serialNumber, newDevice.id);
    
    console.log(`Added device ${newDevice.id} (${newDevice.name}) to registry`);
    return newDevice;
  }
  
  // Get a device by ID
  getDevice(id: number): Device | undefined {
    return this.devices.get(id);
  }
  
  // Get a device by serial number
  getDeviceBySerial(serialNumber: string): Device | undefined {
    const id = this.devicesBySerial.get(serialNumber);
    if (id !== undefined) {
      return this.devices.get(id);
    }
    return undefined;
  }
  
  // Get all devices
  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }
  
  // Get devices by site ID
  getDevicesBySite(siteId: number): Device[] {
    return this.getAllDevices().filter(device => device.siteId === siteId);
  }
  
  // Get devices by type
  getDevicesByType(type: DeviceType): Device[] {
    return this.getAllDevices().filter(device => device.type === type);
  }
  
  // Update an existing device
  updateDevice(id: number, updates: Partial<Omit<Device, 'id' | 'createdAt' | 'updatedAt'>>): Device | undefined {
    const device = this.devices.get(id);
    if (!device) {
      return undefined;
    }
    
    const now = new Date().toISOString();
    const updatedDevice: Device = {
      ...device,
      ...updates,
      updatedAt: now
    };
    
    this.devices.set(id, updatedDevice);
    
    // Update serial number index if it changed
    if (updates.serialNumber && updates.serialNumber !== device.serialNumber) {
      this.devicesBySerial.delete(device.serialNumber);
      this.devicesBySerial.set(updatedDevice.serialNumber, id);
    }
    
    console.log(`Updated device ${id} (${updatedDevice.name})`);
    return updatedDevice;
  }
  
  // Remove a device from the registry
  removeDevice(id: number): boolean {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }
    
    this.devicesBySerial.delete(device.serialNumber);
    this.devices.delete(id);
    
    console.log(`Removed device ${id} (${device.name}) from registry`);
    return true;
  }
  
  // Update device status
  updateDeviceStatus(id: number, status: DeviceStatus, details?: string): boolean {
    const device = this.devices.get(id);
    if (!device) {
      return false;
    }
    
    device.status = status;
    device.lastSeenAt = new Date().toISOString();
    
    // Also emit to MQTT
    try {
      const mqttService = getMqttService();
      const topic = formatDeviceTopic(TOPIC_PATTERNS.STATUS, id);
      mqttService.publish(topic, {
        messageType: 'status',
        timestamp: device.lastSeenAt,
        deviceId: id,
        status,
        details
      });
    } catch (error) {
      console.error(`Error publishing device status for device ${id}:`, error);
    }
    
    return true;
  }
  
  // Generate mock devices for development (if enabled)
  generateMockDevices(count: number = 5): Device[] {
    if (!this.inDevelopment) {
      console.warn('Mock devices can only be generated in development mode');
      return [];
    }
    
    const mockDevices: Device[] = [];
    const deviceTypes: DeviceType[] = ['solar_pv', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump', 'gateway', 'generic'];
    const manufacturers = ['SMA', 'Tesla', 'ABB', 'Fronius', 'Schneider', 'Delta', 'SolarEdge', 'ChargePoint', 'Enphase', 'Siemens'];
    
    for (let i = 0; i < count; i++) {
      const type = deviceTypes[i % deviceTypes.length];
      const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
      
      // Generate model based on device type
      let model = '';
      switch (type) {
        case 'solar_pv':
          model = `Inverter-${1000 + Math.floor(Math.random() * 9000)}`;
          break;
        case 'battery_storage':
          model = `PowerWall-${Math.floor(Math.random() * 5) + 1}`;
          break;
        case 'ev_charger':
          model = `ChargePro-${Math.floor(Math.random() * 3) + 1}`;
          break;
        case 'smart_meter':
          model = `SmartMeter-${100 + Math.floor(Math.random() * 900)}`;
          break;
        case 'heat_pump':
          model = `ThermalPro-${Math.floor(Math.random() * 10) + 1}`;
          break;
        case 'gateway':
          model = `GatewayPro-${Math.floor(Math.random() * 5) + 1}`;
          break;
        case 'generic':
          model = `Device-${1000 + Math.floor(Math.random() * 9000)}`;
          break;
      }
      
      // Generate protocol based on device type
      let protocol: ProtocolType;
      let protocolConfig: any = {};
      
      // Assign appropriate protocols based on device type
      switch (type) {
        case 'ev_charger':
          protocol = 'ocpp';
          protocolConfig = {
            chargePointId: `CP${i+1}`,
            version: Math.random() > 0.5 ? '1.6' : '2.0',
            connectionType: 'websocket',
            endpoint: `ws://localhost:8080/ocpp/${i+1}`,
            authEnabled: Math.random() > 0.3,
            maxPower: 22,
            connectors: 1 + Math.floor(Math.random() * 2)
          };
          break;
        case 'solar_pv':
          protocol = Math.random() > 0.5 ? 'sunspec' : 'modbus';
          if (protocol === 'sunspec') {
            protocolConfig = {
              deviceId: `INV${i+1}`,
              deviceType: 'Inverter',
              connectionType: 'Modbus-TCP',
              modbusAddress: 1,
              modbusIp: `192.168.1.${100 + i}`,
              modbusPort: 502,
              scanInterval: 10000,
              models: [101, 103, 120, 123]
            };
          } else {
            protocolConfig = {
              address: 1 + Math.floor(Math.random() * 10),
              connection: {
                type: 'tcp',
                host: '192.168.1.' + (100 + i),
                port: 502
              },
              registers: this.getDefaultRegistersForDeviceType(type)
            };
          }
          break;
        case 'heat_pump':
          protocol = Math.random() > 0.5 ? 'eebus' : 'modbus';
          if (protocol === 'eebus') {
            protocolConfig = {
              deviceId: `HP${i+1}`,
              deviceType: 'HeatPump',
              endpoint: `eeb://192.168.1.${150 + i}:5150`,
              secureConnection: true,
              brand: manufacturer,
              model: model
            };
          } else {
            protocolConfig = {
              address: 1 + Math.floor(Math.random() * 10),
              connection: {
                type: 'tcp',
                host: '192.168.1.' + (100 + i),
                port: 502
              },
              registers: this.getDefaultRegistersForDeviceType(type)
            };
          }
          break;
        case 'gateway':
          protocol = 'gateway';
          // Gateway device handling multiple child devices
          const gatewayPort = 502 + i;
          const childCount = 1 + Math.floor(Math.random() * 3); // 1-3 child devices
          const childDevices = [];
          
          // Generate child devices
          for (let j = 0; j < childCount; j++) {
            // Determine child device type
            const childTypes: GatewayDeviceType[] = ['meter', 'inverter', 'battery', 'sensor', 'controller'];
            const childType = childTypes[Math.floor(Math.random() * childTypes.length)];
            const childProtocol = Math.random() > 0.5 ? 'modbus' : 'tcpip';
            
            // Create mappings for the child device
            const mappings = [];
            mappings.push({
              name: 'power',
              address: 100 + j * 10,
              dataType: 'float',
              unit: 'W',
              scale: 1,
              access: 'read' as const
            });
            mappings.push({
              name: 'energy',
              address: 102 + j * 10,
              dataType: 'float',
              unit: 'kWh',
              scale: 0.1,
              access: 'read' as const
            });
            mappings.push({
              name: 'status',
              address: 104 + j * 10,
              dataType: 'integer',
              access: 'read-write' as const
            });
            
            // Add child device
            childDevices.push({
              id: 1000 + i * 10 + j, // Ensure unique ID
              name: `Child ${childType} ${j+1}`,
              type: childType,
              address: 1 + j,
              protocol: childProtocol,
              pollInterval: 10000 + j * 1000,
              manufacturer,
              model: `Child-${childType}-${100 + j}`,
              serialNumber: `CHILD${i}${j}${Date.now().toString(36)}`,
              mappings
            });
          }
          
          protocolConfig = {
            connection: {
              type: 'modbus_gateway',
              host: '192.168.1.' + (100 + i),
              port: gatewayPort,
              reconnectInterval: 30000,
              heartbeatInterval: 60000,
              mockMode: true
            },
            childDevices
          };
          break;
        case 'generic':
          protocol = 'tcpip';
          // Generic device with TCP/IP connection
          protocolConfig = {
            connection: {
              host: '192.168.1.' + (200 + i),
              port: 8000 + i,
              dataFormat: 'json',
              connectionTimeout: 5000,
              reconnectInterval: 10000,
              keepAlive: true,
              mockMode: true
            },
            pollInterval: 15000,
            commands: {
              status: 'STATUS\r\n',
              restart: 'RESTART\r\n',
              getData: 'GET_DATA\r\n'
            }
          };
          break;
        default:
          // For other device types, randomly assign modbus or mqtt
          protocol = Math.random() > 0.5 ? 'mqtt' : 'modbus';
          if (protocol === 'modbus') {
            protocolConfig = {
              address: 1 + Math.floor(Math.random() * 10),
              connection: {
                type: 'tcp',
                host: '192.168.1.' + (100 + i),
                port: 502
              },
              registers: this.getDefaultRegistersForDeviceType(type)
            };
          }
          break;
      }
      
      // Generate apiKey for authentication
      const apiKey = Buffer.from(randomBytes(32)).toString('hex');
      const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
      
      // Generate device specs based on type and model
      let specs = {};
      
      // Set specs based on device type
      if (type === 'battery_storage') {
        // Extract model number from PowerWall-X format
        const batteryModelNum = parseInt(model.split('-')[1]) || 1;
        
        // Scale specs based on model number
        const baseCapacity = 10; // kWh
        const baseChargeRate = 5; // kW
        const baseDischargeRate = 5; // kW
        
        specs = {
          capacity: baseCapacity * batteryModelNum,
          maxChargeRate: baseChargeRate * Math.min(batteryModelNum, 3),
          maxDischargeRate: baseDischargeRate * Math.min(batteryModelNum, 3),
          efficiency: 0.92 - (Math.random() * 0.04), // 88-92% efficiency
          nominalVoltage: 48,
          cycles: Math.floor(Math.random() * 500), // Random cycles count
          cellType: ['LiFePO4', 'NMC', 'LTO'][Math.floor(Math.random() * 3)],
          warrantyYears: 10
        };
      } else if (type === 'solar_pv') {
        // Generate power rating between 5-20 kW
        const powerVariant = Math.floor(Math.random() * 15) + 5;
        
        specs = {
          maxPower: powerVariant,
          ratedPower: powerVariant * 0.9,
          nominalVoltage: 230,
          mpptChannels: Math.floor(powerVariant / 5) + 1,
          efficiency: 0.96 + (Math.random() * 0.03), // 96-99% efficiency
          warrantyYears: 10
        };
      }
      
      const mockDevice = this.addDevice({
        name: `${type.replace('_', ' ')} ${i + 1}`,
        type,
        model,
        manufacturer,
        serialNumber: `${manufacturer.substring(0, 3).toUpperCase()}${Date.now().toString(36)}${i}`,
        firmwareVersion: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
        protocol,
        protocolConfig,
        status: Math.random() > 0.8 ? 'offline' : 'online',
        authMethod: 'api_key',
        authCredentials: {
          apiKey: this.inDevelopment ? apiKey : undefined, // Only expose in dev mode
          apiKeyHash
        },
        siteId: 1, // Assign all mock devices to site 1
        capabilities: this.getCapabilitiesForDeviceType(type),
        specs, // Add device-specific specifications
        metadata: {
          isMockDevice: true,
          mockDeviceIndex: i
        }
      });
      
      mockDevices.push(mockDevice);
      
      // Initialize device with the appropriate adapter in development mode
      try {
        if (protocol === 'modbus') {
          // Initialize Modbus device
          const modbusManager = getModbusManager();
          const modbusDevice: ModbusDevice = {
            id: mockDevice.id,
            address: mockDevice.protocolConfig.address,
            connection: mockDevice.protocolConfig.connection,
            registers: mockDevice.protocolConfig.registers,
            scanInterval: 5000 // 5 seconds between scans
          };
          
          modbusManager.addDevice(modbusDevice).catch(err => {
            console.error(`Error adding mock Modbus device ${mockDevice.id}:`, err);
          });
        } else if (protocol === 'tcpip') {
          // Initialize TCP/IP device
          const tcpipManager = getTCPIPManager();
          const tcpipDevice: TCPIPDevice = {
            id: mockDevice.id,
            deviceId: mockDevice.id.toString(),
            connection: mockDevice.protocolConfig.connection,
            pollInterval: mockDevice.protocolConfig.pollInterval,
            commands: mockDevice.protocolConfig.commands
          };
          
          tcpipManager.addDevice(tcpipDevice).catch(err => {
            console.error(`Error adding mock TCP/IP device ${mockDevice.id}:`, err);
          });
        } else if (protocol === 'gateway') {
          // Initialize Gateway device
          const gatewayManager = getGatewayManager();
          const gatewayDevice: GatewayDevice = {
            id: mockDevice.id,
            name: mockDevice.name,
            connection: mockDevice.protocolConfig.connection,
            manufacturer: mockDevice.manufacturer,
            model: mockDevice.model,
            serialNumber: mockDevice.serialNumber,
            firmware: mockDevice.firmwareVersion,
            childDevices: mockDevice.protocolConfig.childDevices
          };
          
          gatewayManager.addGateway(gatewayDevice).catch(err => {
            console.error(`Error adding mock Gateway device ${mockDevice.id}:`, err);
          });
        }
      } catch (error) {
        console.error(`Error initializing device manager for mock device ${mockDevice.id} with protocol ${protocol}:`, error);
      }
    }
    
    return mockDevices;
  }
  
  // Helper to get default registers based on device type (for Modbus devices)
  private getDefaultRegistersForDeviceType(type: DeviceType): any[] {
    switch (type) {
      case 'solar_pv':
        return [
          { name: 'power', type: 'holding', address: 100, length: 1, dataType: 'uint16', scale: 1 },
          { name: 'energy', type: 'holding', address: 102, length: 2, dataType: 'uint32', scale: 0.1 },
          { name: 'voltage', type: 'holding', address: 104, length: 1, dataType: 'uint16', scale: 0.1 },
          { name: 'temperature', type: 'holding', address: 106, length: 1, dataType: 'int16', scale: 0.1 }
        ];
      case 'battery_storage':
        return [
          { name: 'power', type: 'holding', address: 100, length: 1, dataType: 'int16', scale: 1 },
          { name: 'energy', type: 'holding', address: 102, length: 2, dataType: 'uint32', scale: 0.1 },
          { name: 'state_of_charge', type: 'holding', address: 104, length: 1, dataType: 'uint16', scale: 0.1 },
          { name: 'temperature', type: 'holding', address: 106, length: 1, dataType: 'int16', scale: 0.1 }
        ];
      case 'ev_charger':
        return [
          { name: 'power', type: 'holding', address: 100, length: 1, dataType: 'uint16', scale: 1 },
          { name: 'energy', type: 'holding', address: 102, length: 2, dataType: 'uint32', scale: 0.1 },
          { name: 'voltage', type: 'holding', address: 104, length: 1, dataType: 'uint16', scale: 0.1 },
          { name: 'charging_state', type: 'holding', address: 106, length: 1, dataType: 'uint16', scale: 1 }
        ];
      case 'smart_meter':
        return [
          { name: 'power', type: 'holding', address: 100, length: 1, dataType: 'int16', scale: 1 },
          { name: 'energy', type: 'holding', address: 102, length: 2, dataType: 'uint32', scale: 0.1 },
          { name: 'voltage', type: 'holding', address: 104, length: 1, dataType: 'uint16', scale: 0.1 },
          { name: 'current', type: 'holding', address: 106, length: 1, dataType: 'uint16', scale: 0.01 },
          { name: 'frequency', type: 'holding', address: 108, length: 1, dataType: 'uint16', scale: 0.01 }
        ];
      case 'heat_pump':
        return [
          { name: 'power', type: 'holding', address: 100, length: 1, dataType: 'uint16', scale: 1 },
          { name: 'energy', type: 'holding', address: 102, length: 2, dataType: 'uint32', scale: 0.1 },
          { name: 'temperature', type: 'holding', address: 104, length: 1, dataType: 'int16', scale: 0.1 },
          { name: 'cop', type: 'holding', address: 106, length: 1, dataType: 'uint16', scale: 0.01 }
        ];
      default:
        return [];
    }
  }
  
  // Helper to get device specs based on device type and model
  private getDeviceSpecsForDeviceType(type: DeviceType, model: string): any {
    switch (type) {
      case 'battery_storage':
        // Extract model number from PowerWall-X format
        const batteryModelNum = parseInt(model.split('-')[1]) || 1;
        
        // Scale specs based on model number
        const baseCapacity = 10; // kWh
        const baseChargeRate = 5; // kW
        const baseDischargeRate = 5; // kW
        
        return {
          capacity: baseCapacity * batteryModelNum,
          maxChargeRate: baseChargeRate * Math.min(batteryModelNum, 3),
          maxDischargeRate: baseDischargeRate * Math.min(batteryModelNum, 3),
          efficiency: 0.92 - (Math.random() * 0.04), // 88-92% efficiency
          nominalVoltage: 48,
          cycles: Math.floor(Math.random() * 500), // Random cycles count
          cellType: ['LiFePO4', 'NMC', 'LTO'][Math.floor(Math.random() * 3)],
          warrantyYears: 10
        };
        
      case 'solar_pv':
        // Generate power rating between 5-20 kW
        const powerVariant = Math.floor(Math.random() * 15) + 5;
        
        return {
          maxPower: powerVariant,
          ratedPower: powerVariant * 0.9,
          nominalVoltage: 230,
          mpptChannels: Math.floor(powerVariant / 5) + 1,
          efficiency: 0.96 + (Math.random() * 0.03), // 96-99% efficiency
          warrantyYears: 10
        };
        
      case 'ev_charger':
        // Extract from ChargePro-X format 
        const chargerVariant = parseInt(model.split('-')[1]) || 1;
        
        return {
          maxPower: 7.4 * chargerVariant, // 7.4kW, 14.8kW, or 22.2kW
          maxCurrent: 32,
          phases: chargerVariant,
          nominalVoltage: 230,
          connectorType: ['Type 2', 'CCS', 'CHAdeMO'][Math.floor(Math.random() * 3)],
          smartChargingEnabled: true
        };
        
      case 'smart_meter':
        return {
          accuracy: 0.5, // 0.5% accuracy
          maxCurrent: 100,
          nominalVoltage: 230,
          phases: 3,
          communicationProtocol: 'Modbus'
        };
        
      case 'heat_pump':
        const pumpVariant = parseInt(model.split('-')[1]) || 1;
        
        return {
          maxPower: 3 * pumpVariant, // 3-30kW depending on model
          cop: 3.5 + (Math.random() * 1.5), // COP between 3.5-5.0
          refrigerantType: 'R32',
          heatingCapacity: 3 * pumpVariant, // kW
          coolingCapacity: 2.8 * pumpVariant, // kW
          temperatureRange: [-20, 45] // Operation between -20°C and 45°C
        };
        
      default:
        return {};
    }
  }
  
  // Helper to get capabilities based on device type
  private getCapabilitiesForDeviceType(type: DeviceType): string[] {
    switch (type) {
      case 'solar_pv':
        return ['power_measurement', 'energy_measurement', 'temperature_measurement', 'remote_control'];
      case 'battery_storage':
        return ['power_measurement', 'energy_measurement', 'charge_control', 'discharge_control', 'temperature_measurement'];
      case 'ev_charger':
        return ['power_measurement', 'energy_measurement', 'charge_control', 'schedule_charging', 'user_authentication'];
      case 'smart_meter':
        return ['power_measurement', 'energy_measurement', 'voltage_measurement', 'frequency_measurement', 'bidirectional_metering'];
      case 'heat_pump':
        return ['power_measurement', 'energy_measurement', 'temperature_control', 'schedule_operation', 'mode_control'];
      case 'gateway':
        return ['device_management', 'protocol_translation', 'data_aggregation', 'remote_configuration', 'device_discovery'];
      case 'generic':
        return ['remote_control', 'telemetry', 'status_monitoring'];
      default:
        return [];
    }
  }
}

// Device management service for handling device operations
export class DeviceManagementService {
  private deviceRegistry: DeviceRegistry;
  private config: DeviceManagementConfig;
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor(config: DeviceManagementConfig = {}) {
    this.config = {
      enableAutoProvisioning: false,
      enableAlerts: true,
      defaultHeartbeatInterval: 60000, // 1 minute
      mockDevicesInDevelopment: this.inDevelopment,
      devModeDeviceCount: 5,
      ...config
    };
    
    this.deviceRegistry = new DeviceRegistry();
    
    // Generate mock devices in development mode
    if (this.inDevelopment && this.config.mockDevicesInDevelopment) {
      console.log(`Development mode: Generating ${this.config.devModeDeviceCount} mock devices`);
      this.deviceRegistry.generateMockDevices(this.config.devModeDeviceCount);
    }
    
    // Set up MQTT handlers for device communication
    this.setupMqttHandlers();
  }
  
  // Setup MQTT message handlers
  private setupMqttHandlers(): void {
    // Handle device status updates
    this.mqttService.addMessageHandler(TOPIC_PATTERNS.STATUS, (topic, message, params) => {
      if (typeof params.deviceId === 'string') {
        const deviceId = parseInt(params.deviceId, 10);
        if (!isNaN(deviceId) && message && message.status) {
          this.updateDeviceStatus(deviceId, message.status, message.details);
        }
      }
    });
    
    // Handle device discovery requests (for auto-provisioning)
    if (this.config.enableAutoProvisioning) {
      this.mqttService.addMessageHandler(TOPIC_PATTERNS.DISCOVERY_REQUEST, (topic, message) => {
        this.handleDiscoveryRequest(message);
      });
    }
  }
  
  // Handle device discovery requests for auto-provisioning
  private async handleDiscoveryRequest(message: any): Promise<void> {
    if (!message || !message.deviceInfo) {
      console.error('Invalid discovery request - missing deviceInfo');
      return;
    }
    
    const { manufacturerId, modelId, serialNumber, firmwareVersion, capabilities } = message.deviceInfo;
    
    if (!manufacturerId || !modelId || !serialNumber) {
      console.error('Invalid discovery request - missing required fields');
      return;
    }
    
    // Check if the device is already registered
    const existingDevice = this.deviceRegistry.getDeviceBySerial(serialNumber);
    if (existingDevice) {
      console.log(`Device ${serialNumber} already registered with ID ${existingDevice.id}`);
      
      // Send discovery response
      const responseTopic = formatTopic(TOPIC_PATTERNS.DISCOVERY_RESPONSE, { 'deviceInfo.serialNumber': serialNumber });
      await this.mqttService.publish(responseTopic, {
        messageType: 'discovery_response',
        timestamp: new Date().toISOString(),
        deviceId: existingDevice.id,
        status: 'accepted',
        message: 'Device already registered'
      });
      
      return;
    }
    
    // Auto-provisioning logic would go here
    // For now, just log the request
    console.log(`Device discovery request from ${manufacturerId} ${modelId} (${serialNumber})`);
    
    // In development mode, auto-provision the device
    if (this.inDevelopment) {
      // Determine device type based on model ID (simple heuristic)
      let deviceType: DeviceType = 'smart_meter';
      if (modelId.toLowerCase().includes('inverter')) {
        deviceType = 'solar_pv';
      } else if (modelId.toLowerCase().includes('battery')) {
        deviceType = 'battery_storage';
      } else if (modelId.toLowerCase().includes('charg')) {
        deviceType = 'ev_charger';
      } else if (modelId.toLowerCase().includes('heat') || modelId.toLowerCase().includes('thermal')) {
        deviceType = 'heat_pump';
      }
      
      // Generate API key for device
      const apiKey = Buffer.from(randomBytes(32)).toString('hex');
      const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
      
      // Register the device
      const newDevice = this.deviceRegistry.addDevice({
        name: `${deviceType.replace('_', ' ')} (${serialNumber})`,
        type: deviceType,
        model: modelId,
        manufacturer: manufacturerId,
        serialNumber,
        firmwareVersion: firmwareVersion || '1.0.0',
        protocol: 'mqtt',
        protocolConfig: {},
        status: 'online',
        authMethod: 'api_key',
        authCredentials: {
          apiKey: this.inDevelopment ? apiKey : undefined,
          apiKeyHash
        },
        siteId: 1, // Assign to default site
        capabilities: capabilities || this.getCapabilitiesForDeviceType(deviceType),
        metadata: {
          autoProvisioned: true,
          discoveryTimestamp: new Date().toISOString()
        }
      });
      
      console.log(`Auto-provisioned device ${serialNumber} with ID ${newDevice.id}`);
      
      // Send discovery response
      const responseTopic = formatTopic(TOPIC_PATTERNS.DISCOVERY_RESPONSE, { 'deviceInfo.serialNumber': serialNumber });
      await this.mqttService.publish(responseTopic, {
        messageType: 'discovery_response',
        timestamp: new Date().toISOString(),
        deviceId: newDevice.id,
        provisioningToken: apiKey,
        status: 'accepted',
        message: 'Device successfully provisioned'
      });
    } else {
      // In production, would typically require manual approval
      const responseTopic = formatTopic(TOPIC_PATTERNS.DISCOVERY_RESPONSE, { 'deviceInfo.serialNumber': serialNumber });
      await this.mqttService.publish(responseTopic, {
        messageType: 'discovery_response',
        timestamp: new Date().toISOString(),
        status: 'pending_approval',
        message: 'Device registration requires approval'
      });
    }
  }
  
  // Get device by ID
  getDevice(id: number): Device | undefined {
    return this.deviceRegistry.getDevice(id);
  }
  
  // Get all devices
  getAllDevices(): Device[] {
    return this.deviceRegistry.getAllDevices();
  }
  
  // Get devices by site
  getDevicesBySite(siteId: number): Device[] {
    return this.deviceRegistry.getDevicesBySite(siteId);
  }
  
  // Get devices by type
  getDevicesByType(type: DeviceType): Device[] {
    return this.deviceRegistry.getDevicesByType(type);
  }
  
  // Get devices by site and type
  getDevicesBySiteAndType(siteId: number, type: DeviceType): Device[] {
    return this.deviceRegistry.getDevicesBySite(siteId)
      .filter(device => device.type === type);
  }
  
  // Add a new device
  addDevice(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Device {
    const newDevice = this.deviceRegistry.addDevice(device);
    
    // Initialize the device with the appropriate protocol adapter
    this.initializeDevice(newDevice);
    
    return newDevice;
  }
  
  // Initialize device with the appropriate protocol adapter
  private async initializeDevice(device: Device): Promise<void> {
    // Skip if device is offline
    if (device.status === 'offline') {
      console.log(`Device ${device.id} is offline, skipping protocol initialization`);
      return;
    }
    
    try {
      switch (device.protocol) {
        case 'modbus':
          await this.initializeModbusDevice(device);
          break;
        case 'ocpp':
          await this.initializeOcppDevice(device);
          break;
        case 'eebus':
          await this.initializeEebusDevice(device);
          break;
        case 'sunspec':
          await this.initializeSunspecDevice(device);
          break;
        case 'tcpip':
          await this.initializeTcpipDevice(device);
          break;
        case 'gateway':
          await this.initializeGatewayDevice(device);
          break;
        case 'mqtt':
          // MQTT devices are already handled through the MQTT service
          console.log(`Device ${device.id} uses MQTT protocol, no additional initialization needed`);
          break;
        case 'rest':
          // REST devices poll on an interval or are polled
          console.log(`Device ${device.id} uses REST protocol, initialization via polling service`);
          break;
        default:
          console.warn(`Unknown protocol '${device.protocol}' for device ${device.id}`);
      }
    } catch (error) {
      console.error(`Error initializing device ${device.id} with ${device.protocol} protocol:`, error);
    }
  }
  
  // Initialize a Modbus device
  private async initializeModbusDevice(device: Device): Promise<void> {
    if (!device.protocolConfig.connection || !device.protocolConfig.registers) {
      console.error(`Invalid Modbus configuration for device ${device.id}`);
      return;
    }
    
    const modbusManager = getModbusManager();
    const modbusDevice: ModbusDevice = {
      id: device.id,
      address: device.protocolConfig.address,
      connection: device.protocolConfig.connection,
      registers: device.protocolConfig.registers,
      scanInterval: device.protocolConfig.scanInterval || 5000
    };
    
    await modbusManager.addDevice(modbusDevice);
    console.log(`Initialized Modbus device ${device.id}`);
  }
  
  // Initialize an OCPP device (EV charger)
  private async initializeOcppDevice(device: Device): Promise<void> {
    if (device.type !== 'ev_charger') {
      console.warn(`Device ${device.id} has OCPP protocol but is not an EV charger`);
    }
    
    // ocppManager is already imported
    const ocppDevice: OCPPDevice = {
      id: device.id,
      chargePointId: device.protocolConfig.chargePointId || `CP${device.id}`,
      version: device.protocolConfig.version || '1.6',
      connectionType: device.protocolConfig.connectionType || 'websocket',
      endpoint: device.protocolConfig.endpoint,
      authEnabled: device.protocolConfig.authEnabled !== undefined ? device.protocolConfig.authEnabled : true,
      maxPower: device.protocolConfig.maxPower,
      connectors: device.protocolConfig.connectors || 1
    };
    
    await ocppManager.addDevice(ocppDevice);
    console.log(`Initialized OCPP device ${device.id}`);
  }
  
  // Initialize an EEBus device (Heat pump or home appliance)
  private async initializeEebusDevice(device: Device): Promise<void> {
    if (device.type !== 'heat_pump' && !device.metadata?.applianceType) {
      console.warn(`Device ${device.id} has EEBus protocol but is not a heat pump or recognized appliance`);
    }
    
    const eebusManager = getEEBusManager();
    const eebusDevice: EEBusDevice = {
      id: device.id,
      deviceId: device.protocolConfig.deviceId || `HP${device.id}`,
      deviceType: device.protocolConfig.deviceType || 'HeatPump',
      endpoint: device.protocolConfig.endpoint,
      secureConnection: device.protocolConfig.secureConnection !== undefined ? device.protocolConfig.secureConnection : true,
      brand: device.manufacturer,
      model: device.model
    };
    
    await eebusManager.addDevice(eebusDevice);
    console.log(`Initialized EEBus device ${device.id}`);
  }
  
  // Initialize a SunSpec device (Solar inverter)
  private async initializeSunspecDevice(device: Device): Promise<void> {
    if (device.type !== 'solar_pv') {
      console.warn(`Device ${device.id} has SunSpec protocol but is not a solar PV device`);
    }
    
    // sunspecManager is already imported
    const sunspecDevice: SunSpecDevice = {
      id: device.id,
      deviceId: device.protocolConfig.deviceId || `INV${device.id}`,
      deviceType: device.protocolConfig.deviceType || 'Inverter',
      connectionType: device.protocolConfig.connectionType || 'Modbus-TCP',
      modbusAddress: device.protocolConfig.modbusAddress,
      modbusIp: device.protocolConfig.modbusIp,
      modbusPort: device.protocolConfig.modbusPort,
      scanInterval: device.protocolConfig.scanInterval || 10000,
      models: device.protocolConfig.models
    };
    
    await sunspecManager.addDevice(sunspecDevice);
    console.log(`Initialized SunSpec device ${device.id}`);
  }
  
  // Initialize a TCP/IP device (Generic TCP/IP based device)
  private async initializeTcpipDevice(device: Device): Promise<void> {
    if (!device.protocolConfig.connection) {
      console.error(`Invalid TCP/IP configuration for device ${device.id}`);
      return;
    }
    
    const tcpipManager = getTCPIPManager();
    const tcpipDevice: TCPIPDevice = {
      id: device.id,
      deviceId: device.id.toString(),
      connection: {
        host: device.protocolConfig.connection.host,
        port: device.protocolConfig.connection.port,
        dataFormat: device.protocolConfig.connection.dataFormat || 'utf8',
        connectionTimeout: device.protocolConfig.connection.connectionTimeout,
        reconnectInterval: device.protocolConfig.connection.reconnectInterval,
        keepAlive: device.protocolConfig.connection.keepAlive,
        mockMode: this.inDevelopment && (device.protocolConfig.connection.mockMode || false)
      },
      pollInterval: device.protocolConfig.pollInterval,
      commands: device.protocolConfig.commands
    };
    
    await tcpipManager.addDevice(tcpipDevice);
    console.log(`Initialized TCP/IP device ${device.id}`);
  }
  
  // Initialize a gateway device (Device that also serves as a connection point)
  private async initializeGatewayDevice(device: Device): Promise<void> {
    if (device.type !== 'gateway') {
      console.warn(`Device ${device.id} has gateway protocol but is not a gateway device`);
    }
    
    if (!device.protocolConfig.connection || !device.protocolConfig.childDevices) {
      console.error(`Invalid gateway configuration for device ${device.id}`);
      return;
    }
    
    const gatewayManager = getGatewayManager();
    const gatewayDevice: GatewayDevice = {
      id: device.id,
      name: device.name,
      connection: {
        host: device.protocolConfig.connection.host,
        port: device.protocolConfig.connection.port,
        type: device.protocolConfig.connection.type || 'modbus_gateway',
        username: device.protocolConfig.connection.username,
        password: device.protocolConfig.connection.password,
        tlsEnabled: device.protocolConfig.connection.tlsEnabled,
        reconnectInterval: device.protocolConfig.connection.reconnectInterval,
        heartbeatInterval: device.protocolConfig.connection.heartbeatInterval,
        mockMode: this.inDevelopment && (device.protocolConfig.connection.mockMode || false)
      },
      manufacturer: device.manufacturer,
      model: device.model,
      serialNumber: device.serialNumber,
      firmware: device.firmwareVersion,
      childDevices: device.protocolConfig.childDevices.map(child => ({
        id: child.id,
        name: child.name,
        type: child.type,
        address: child.address,
        protocol: child.protocol,
        pollInterval: child.pollInterval,
        manufacturer: child.manufacturer,
        model: child.model,
        serialNumber: child.serialNumber,
        commands: child.commands,
        mappings: child.mappings
      }))
    };
    
    await gatewayManager.addGateway(gatewayDevice);
    console.log(`Initialized gateway device ${device.id} with ${gatewayDevice.childDevices.length} child devices`);
  }
  
  // Update an existing device
  updateDevice(id: number, updates: Partial<Omit<Device, 'id' | 'createdAt' | 'updatedAt'>>): Device | undefined {
    return this.deviceRegistry.updateDevice(id, updates);
  }
  
  // Remove a device
  removeDevice(id: number): boolean {
    return this.deviceRegistry.removeDevice(id);
  }
  
  // Update device status
  updateDeviceStatus(id: number, status: DeviceStatus, details?: string): boolean {
    return this.deviceRegistry.updateDeviceStatus(id, status, details);
  }
  
  // Authenticate a device with API key
  authenticateDevice(deviceId: number, apiKey: string): boolean {
    const device = this.deviceRegistry.getDevice(deviceId);
    if (!device || device.authMethod !== 'api_key' || !device.authCredentials.apiKeyHash) {
      return false;
    }
    
    // For development mode, check if we have the plain API key stored
    if (this.inDevelopment && device.authCredentials.apiKey) {
      return device.authCredentials.apiKey === apiKey;
    }
    
    // In production, compute hash and compare
    const providedKeyHash = createHash('sha256').update(apiKey).digest('hex');
    return device.authCredentials.apiKeyHash === providedKeyHash;
  }
  
  // Send command to a device
  async sendDeviceCommand(deviceId: number, command: any): Promise<boolean> {
    const device = this.deviceRegistry.getDevice(deviceId);
    if (!device) {
      console.error(`Cannot send command to non-existent device: ${deviceId}`);
      return false;
    }
    
    // Log the command attempt
    console.log(`Sending command to device ${deviceId} (${device.type}): ${JSON.stringify(command)}`);
    
    try {
      // For MQTT devices, publish to the command topic
      if (device.protocol === 'mqtt') {
        const commandTopic = formatTopic(TOPIC_PATTERNS.COMMANDS, { deviceId: deviceId.toString() });
        await this.mqttService.publish(commandTopic, {
          messageType: 'command',
          timestamp: new Date().toISOString(),
          command,
          deviceId
        });
        return true;
      }
      
      // For other protocol types, use specific protocol managers
      switch (device.protocol) {
        case 'modbus':
          return await getModbusManager().sendCommand(deviceId, command);
          
        case 'ocpp':
          return await ocppManager.sendCommand(deviceId, command);
          
        case 'tcpip':
          return await getTCPIPManager().sendCommand(deviceId, command);
          
        case 'gateway':
          return await getGatewayManager().sendCommandToDevice(deviceId, command);
          
        case 'sunspec':
          return await sunspecManager.sendCommand(deviceId, command);
          
        case 'eebus':
          return await getEEBusManager().sendCommand(deviceId, command);
          
        case 'rest':
          // Implement REST API calls here
          console.log(`REST commands not fully implemented for device ${deviceId}`);
          return false;
          
        default:
          console.error(`Unknown protocol ${device.protocol} for device ${deviceId}`);
          return false;
      }
    } catch (error) {
      console.error(`Error sending command to device ${deviceId}:`, error);
      return false;
    }
  }
  
  // Helper to get capabilities based on device type
  private getCapabilitiesForDeviceType(type: DeviceType): string[] {
    switch (type) {
      case 'solar_pv':
        return ['power_measurement', 'energy_measurement', 'temperature_measurement', 'remote_control'];
      case 'battery_storage':
        return ['power_measurement', 'energy_measurement', 'charge_control', 'discharge_control', 'temperature_measurement'];
      case 'ev_charger':
        return ['power_measurement', 'energy_measurement', 'charge_control', 'schedule_charging', 'user_authentication'];
      case 'smart_meter':
        return ['power_measurement', 'energy_measurement', 'voltage_measurement', 'frequency_measurement', 'bidirectional_metering'];
      case 'heat_pump':
        return ['power_measurement', 'energy_measurement', 'temperature_control', 'schedule_operation', 'mode_control'];
      case 'generic':
        return ['remote_control', 'telemetry', 'status_monitoring'];
      case 'gateway':
        return ['device_management', 'protocol_translation', 'data_aggregation', 'remote_configuration', 'device_discovery'];
      default:
        return [];
    }
  }
  
  // Helper to get device specs based on device type and model
  private getDeviceSpecsForDeviceType(type: DeviceType, model: string): any {
    switch (type) {
      case 'battery_storage':
        // Extract model number from PowerWall-X format
        const batteryModelNum = parseInt(model.split('-')[1]) || 1;
        
        // Scale specs based on model number
        const baseCapacity = 10; // kWh
        const baseChargeRate = 5; // kW
        const baseDischargeRate = 5; // kW
        
        return {
          capacity: baseCapacity * batteryModelNum,
          maxChargeRate: baseChargeRate * Math.min(batteryModelNum, 3),
          maxDischargeRate: baseDischargeRate * Math.min(batteryModelNum, 3),
          efficiency: 0.92 - (Math.random() * 0.04), // 88-92% efficiency
          nominalVoltage: 48,
          cycles: Math.floor(Math.random() * 500), // Random cycles count
          cellType: ['LiFePO4', 'NMC', 'LTO'][Math.floor(Math.random() * 3)],
          warrantyYears: 10
        };
        
      case 'solar_pv':
        // Generate power rating between 5-20 kW
        const powerVariant = Math.floor(Math.random() * 15) + 5;
        
        return {
          maxPower: powerVariant,
          ratedPower: powerVariant * 0.9,
          nominalVoltage: 230,
          mpptChannels: Math.floor(powerVariant / 5) + 1,
          efficiency: 0.96 + (Math.random() * 0.03), // 96-99% efficiency
          warrantyYears: 10
        };
        
      case 'ev_charger':
        // Extract from ChargePro-X format 
        const chargerVariant = parseInt(model.split('-')[1]) || 1;
        
        return {
          maxPower: 7.4 * chargerVariant, // 7.4kW, 14.8kW, or 22.2kW
          maxCurrent: 32,
          phases: chargerVariant,
          nominalVoltage: 230,
          connectorType: ['Type 2', 'CCS', 'CHAdeMO'][Math.floor(Math.random() * 3)],
          smartChargingEnabled: true
        };
        
      case 'smart_meter':
        return {
          accuracy: 0.5, // 0.5% accuracy
          maxCurrent: 100,
          nominalVoltage: 230,
          phases: 3,
          communicationProtocol: 'Modbus'
        };
        
      case 'heat_pump':
        const pumpVariant = parseInt(model.split('-')[1]) || 1;
        
        return {
          maxPower: 3 * pumpVariant, // 3-30kW depending on model
          cop: 3.5 + (Math.random() * 1.5), // COP between 3.5-5.0
          refrigerantType: 'R32',
          heatingCapacity: 3 * pumpVariant, // kW
          coolingCapacity: 2.8 * pumpVariant, // kW
          temperatureRange: [-20, 45] // Operation between -20°C and 45°C
        };
        
      default:
        return {};
    }
  }
}

// Singleton instance
let deviceManagementServiceInstance: DeviceManagementService | null = null;

// Initialize the device management service
export function initDeviceManagementService(config?: DeviceManagementConfig): DeviceManagementService {
  if (!deviceManagementServiceInstance) {
    deviceManagementServiceInstance = new DeviceManagementService(config);
  }
  return deviceManagementServiceInstance;
}

// Get the existing device management service instance
export function getDeviceManagementService(): DeviceManagementService {
  if (!deviceManagementServiceInstance) {
    throw new Error('Device management service not initialized. Call initDeviceManagementService first.');
  }
  return deviceManagementServiceInstance;
}