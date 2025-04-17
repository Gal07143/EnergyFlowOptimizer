import ModbusRTU from 'modbus-serial';
import { sendDeviceCommand } from '../services/mqttService';
import { storage } from '../storage';

interface ModbusDevice {
  id: number;
  siteId: number;
  ipAddress: string;
  port: number;
  unitId: number;
  deviceType: string;
  connectionType: 'tcp' | 'rtu' | 'ascii';
  registerMap: RegisterMap;
  client?: ModbusRTU;
  connected: boolean;
  lastError?: string;
  connectionAttempts: number;
  pollingInterval?: NodeJS.Timeout;
}

interface RegisterMap {
  [key: string]: {
    address: number;
    length?: number;
    type: 'coil' | 'discrete' | 'input' | 'holding';
    dataType?: 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32';
    scaleFactor?: number;
    description?: string;
    readOnly?: boolean;
  };
}

// Store active Modbus connections
const modbusDevices: Map<number, ModbusDevice> = new Map();

// Polling interval in milliseconds
const DEFAULT_POLLING_INTERVAL = 60000; // 1 minute
const MAX_CONNECTION_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

// Initialize Modbus adapter for a device
export async function initModbusDevice(deviceId: number): Promise<boolean> {
  try {
    // Skip actual Modbus initialization in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`Development mode: Skipping Modbus initialization for device ${deviceId}`);
      return true;
    }
    
    // Check if device already initialized
    if (modbusDevices.has(deviceId)) {
      const device = modbusDevices.get(deviceId);
      if (device && device.connected) {
        console.log(`Modbus device ${deviceId} already initialized and connected`);
        return true;
      }
    }

    // Fetch device details from storage
    const deviceData = await storage.getDevice(deviceId);
    
    if (!deviceData) {
      console.error(`Device ${deviceId} not found`);
      return false;
    }
    
    // Check if device has connection settings
    if (!deviceData.settings) {
      console.error(`Device ${deviceId} has no connection settings`);
      return false;
    }

    const settings = deviceData.settings as any;
    
    // Ensure we have modbus settings
    if (!settings.modbus) {
      console.error(`Device ${deviceId} has no Modbus settings`);
      return false;
    }

    const modbusSettings = settings.modbus;
    
    // Create a Modbus client
    const client = new ModbusRTU();
    
    // Create device configuration
    const modbusDevice: ModbusDevice = {
      id: deviceId,
      siteId: deviceData.siteId,
      ipAddress: modbusSettings.ipAddress || deviceData.ipAddress,
      port: modbusSettings.port || 502,
      unitId: modbusSettings.unitId || 1,
      deviceType: deviceData.type,
      connectionType: modbusSettings.connectionType || 'tcp',
      registerMap: modbusSettings.registerMap || {},
      client: client,
      connected: false,
      connectionAttempts: 0,
      pollingInterval: undefined
    };

    // Store in device map
    modbusDevices.set(deviceId, modbusDevice);
    
    // Connect to the device
    await connectModbusDevice(deviceId);

    // Start polling
    startDevicePolling(deviceId);

    return true;
  } catch (error) {
    console.error(`Error initializing Modbus device ${deviceId}:`, error);
    return false;
  }
}

// Connect to a Modbus device
async function connectModbusDevice(deviceId: number): Promise<boolean> {
  const device = modbusDevices.get(deviceId);
  
  if (!device) {
    console.error(`Modbus device ${deviceId} not found in device map`);
    return false;
  }
  
  // Check if already connected
  if (device.connected) {
    return true;
  }
  
  // Increment connection attempts
  device.connectionAttempts += 1;
  
  try {
    // Connect based on connection type
    switch (device.connectionType) {
      case 'tcp':
        await device.client!.connectTCP(device.ipAddress, { port: device.port });
        break;
        
      case 'rtu':
        // RTU over TCP/IP (RTU over a TCP socket)
        await device.client!.connectTcpRTUBuffered(device.ipAddress, { port: device.port });
        break;
        
      case 'ascii':
        // ASCII over serial (would typically require a serial port)
        console.error('ASCII connection type not supported in this adapter');
        return false;
        
      default:
        console.error(`Unknown connection type: ${device.connectionType}`);
        return false;
    }
    
    // Set the slave ID (unit ID)
    device.client!.setID(device.unitId);
    
    // Mark as connected
    device.connected = true;
    device.connectionAttempts = 0;
    
    console.log(`Connected to Modbus device ${deviceId} at ${device.ipAddress}:${device.port}`);
    
    return true;
  } catch (error) {
    device.connected = false;
    device.lastError = error instanceof Error ? error.message : String(error);
    
    console.error(`Failed to connect to Modbus device ${deviceId}:`, error);
    
    // Check if we should retry
    if (device.connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      console.log(`Will retry connection to device ${deviceId} after delay`);
      
      // Schedule reconnect
      setTimeout(() => {
        connectModbusDevice(deviceId);
      }, RECONNECT_DELAY);
    } else {
      console.error(`Max connection attempts reached for device ${deviceId}`);
      
      // Update device status in storage
      try {
        await storage.updateDevice(deviceId, {
          status: 'error',
          settings: {
            ...device,
            lastError: device.lastError,
            lastConnectionAttempt: new Date()
          }
        });
      } catch (updateError) {
        console.error(`Failed to update device status:`, updateError);
      }
    }
    
    return false;
  }
}

// Start polling a device
function startDevicePolling(deviceId: number) {
  const device = modbusDevices.get(deviceId);
  
  if (!device) {
    console.error(`Modbus device ${deviceId} not found in device map`);
    return;
  }
  
  // Clear existing interval if any
  if (device.pollingInterval) {
    clearInterval(device.pollingInterval);
  }
  
  // Set polling interval
  const pollingInterval = device.pollingInterval = setInterval(async () => {
    try {
      // Only poll if connected
      if (!device.connected) {
        console.log(`Skipping poll for device ${deviceId} - not connected`);
        return;
      }
      
      // Read device data
      await pollDeviceData(deviceId);
    } catch (error) {
      console.error(`Error polling device ${deviceId}:`, error);
      
      // Check if it's a connection error
      if (error instanceof Error && 
          (error.message.includes('Port is closed') || 
           error.message.includes('not connected'))) {
        // Mark as disconnected
        device.connected = false;
        
        // Try to reconnect
        console.log(`Attempting to reconnect to device ${deviceId}`);
        connectModbusDevice(deviceId);
      }
    }
  }, DEFAULT_POLLING_INTERVAL);
  
  console.log(`Started polling for device ${deviceId} at ${DEFAULT_POLLING_INTERVAL}ms intervals`);
}

// Poll device data and create telemetry
async function pollDeviceData(deviceId: number) {
  const device = modbusDevices.get(deviceId);
  
  if (!device || !device.connected) {
    return;
  }
  
  try {
    // Create telemetry data object
    const telemetryData: any = {
      timestamp: new Date()
    };
    
    // Read key registers based on device type
    switch (device.deviceType) {
      case 'solar_pv':
        await readSolarInverterData(device, telemetryData);
        break;
        
      case 'battery_storage':
        await readBatteryData(device, telemetryData);
        break;
        
      case 'smart_meter':
        await readSmartMeterData(device, telemetryData);
        break;
        
      case 'heat_pump':
        await readHeatPumpData(device, telemetryData);
        break;
        
      case 'ev_charger':
        await readEVChargerData(device, telemetryData);
        break;
        
      default:
        console.log(`Unknown device type for Modbus: ${device.deviceType}`);
        return;
    }
    
    // Create device reading via MQTT
    await sendDeviceCommand(device.siteId, deviceId, 'telemetry', telemetryData);
    
    console.log(`Successfully polled data for device ${deviceId}`);
  } catch (error) {
    console.error(`Error polling data for device ${deviceId}:`, error);
    
    // Update device status
    await storage.updateDevice(deviceId, {
      status: 'error',
      updatedAt: new Date()
    });
  }
}

// Read solar inverter data
async function readSolarInverterData(device: ModbusDevice, telemetryData: any) {
  const client = device.client!;
  const map = device.registerMap;
  
  // Common solar inverter registers
  if (map.power && map.power.address !== undefined) {
    const powerRegs = await readRegister(client, map.power);
    telemetryData.power = powerRegs;
  }
  
  if (map.energy && map.energy.address !== undefined) {
    const energyRegs = await readRegister(client, map.energy);
    telemetryData.energy = energyRegs;
  }
  
  if (map.voltage && map.voltage.address !== undefined) {
    const voltageRegs = await readRegister(client, map.voltage);
    telemetryData.voltage = voltageRegs;
  }
  
  if (map.current && map.current.address !== undefined) {
    const currentRegs = await readRegister(client, map.current);
    telemetryData.current = currentRegs;
  }
  
  if (map.frequency && map.frequency.address !== undefined) {
    const frequencyRegs = await readRegister(client, map.frequency);
    telemetryData.frequency = frequencyRegs;
  }
  
  if (map.temperature && map.temperature.address !== undefined) {
    const temperatureRegs = await readRegister(client, map.temperature);
    telemetryData.temperature = temperatureRegs;
  }
  
  // Additional data specific to solar inverters
  const additionalData: any = {};
  
  if (map.irradiance && map.irradiance.address !== undefined) {
    const irradianceRegs = await readRegister(client, map.irradiance);
    additionalData.irradiance = irradianceRegs;
  }
  
  if (map.efficiency && map.efficiency.address !== undefined) {
    const efficiencyRegs = await readRegister(client, map.efficiency);
    additionalData.panelEfficiency = efficiencyRegs;
  }
  
  if (Object.keys(additionalData).length > 0) {
    telemetryData.additionalData = additionalData;
  }
}

// Read battery storage data
async function readBatteryData(device: ModbusDevice, telemetryData: any) {
  const client = device.client!;
  const map = device.registerMap;
  
  // Common battery registers
  if (map.power && map.power.address !== undefined) {
    const powerRegs = await readRegister(client, map.power);
    telemetryData.power = powerRegs;
  }
  
  if (map.stateOfCharge && map.stateOfCharge.address !== undefined) {
    const socRegs = await readRegister(client, map.stateOfCharge);
    telemetryData.stateOfCharge = socRegs;
  }
  
  if (map.voltage && map.voltage.address !== undefined) {
    const voltageRegs = await readRegister(client, map.voltage);
    telemetryData.voltage = voltageRegs;
  }
  
  if (map.current && map.current.address !== undefined) {
    const currentRegs = await readRegister(client, map.current);
    telemetryData.current = currentRegs;
  }
  
  if (map.temperature && map.temperature.address !== undefined) {
    const temperatureRegs = await readRegister(client, map.temperature);
    telemetryData.temperature = temperatureRegs;
  }
  
  // Additional data specific to batteries
  const additionalData: any = {};
  
  if (map.cycleCount && map.cycleCount.address !== undefined) {
    const cycleCountRegs = await readRegister(client, map.cycleCount);
    additionalData.cycleCount = cycleCountRegs;
  }
  
  if (map.chargeStatus && map.chargeStatus.address !== undefined) {
    const chargeStatusRegs = await readRegister(client, map.chargeStatus);
    additionalData.chargeStatus = chargeStatusRegs === 1 ? 'charging' : 
                               chargeStatusRegs === 2 ? 'discharging' : 'idle';
  }
  
  if (Object.keys(additionalData).length > 0) {
    telemetryData.additionalData = additionalData;
  }
}

// Read smart meter data
async function readSmartMeterData(device: ModbusDevice, telemetryData: any) {
  const client = device.client!;
  const map = device.registerMap;
  
  // Common smart meter registers
  if (map.power && map.power.address !== undefined) {
    const powerRegs = await readRegister(client, map.power);
    telemetryData.power = powerRegs;
  }
  
  if (map.energy && map.energy.address !== undefined) {
    const energyRegs = await readRegister(client, map.energy);
    telemetryData.energy = energyRegs;
  }
  
  if (map.voltage && map.voltage.address !== undefined) {
    const voltageRegs = await readRegister(client, map.voltage);
    telemetryData.voltage = voltageRegs;
  }
  
  if (map.current && map.current.address !== undefined) {
    const currentRegs = await readRegister(client, map.current);
    telemetryData.current = currentRegs;
  }
  
  if (map.frequency && map.frequency.address !== undefined) {
    const frequencyRegs = await readRegister(client, map.frequency);
    telemetryData.frequency = frequencyRegs;
  }
  
  // Additional data specific to smart meters
  const additionalData: any = {};
  
  if (map.importEnergy && map.importEnergy.address !== undefined) {
    const importEnergyRegs = await readRegister(client, map.importEnergy);
    additionalData.importEnergy = importEnergyRegs;
  }
  
  if (map.exportEnergy && map.exportEnergy.address !== undefined) {
    const exportEnergyRegs = await readRegister(client, map.exportEnergy);
    additionalData.exportEnergy = exportEnergyRegs;
  }
  
  if (map.powerFactor && map.powerFactor.address !== undefined) {
    const powerFactorRegs = await readRegister(client, map.powerFactor);
    additionalData.powerFactor = powerFactorRegs;
  }
  
  if (Object.keys(additionalData).length > 0) {
    telemetryData.additionalData = additionalData;
  }
}

// Read heat pump data
async function readHeatPumpData(device: ModbusDevice, telemetryData: any) {
  const client = device.client!;
  const map = device.registerMap;
  
  // Common heat pump registers
  if (map.power && map.power.address !== undefined) {
    const powerRegs = await readRegister(client, map.power);
    telemetryData.power = powerRegs;
  }
  
  if (map.energy && map.energy.address !== undefined) {
    const energyRegs = await readRegister(client, map.energy);
    telemetryData.energy = energyRegs;
  }
  
  if (map.temperature && map.temperature.address !== undefined) {
    const temperatureRegs = await readRegister(client, map.temperature);
    telemetryData.temperature = temperatureRegs;
  }
  
  // Additional data specific to heat pumps
  const additionalData: any = {};
  
  if (map.mode && map.mode.address !== undefined) {
    const modeRegs = await readRegister(client, map.mode);
    additionalData.mode = modeRegs === 1 ? 'heating' : 
                      modeRegs === 2 ? 'cooling' : 
                      modeRegs === 3 ? 'hot_water' : 'off';
  }
  
  if (map.targetTemp && map.targetTemp.address !== undefined) {
    const targetTempRegs = await readRegister(client, map.targetTemp);
    additionalData.targetTemp = targetTempRegs;
  }
  
  if (map.ambientTemp && map.ambientTemp.address !== undefined) {
    const ambientTempRegs = await readRegister(client, map.ambientTemp);
    additionalData.ambientTemp = ambientTempRegs;
  }
  
  if (map.cop && map.cop.address !== undefined) {
    const copRegs = await readRegister(client, map.cop);
    additionalData.cop = copRegs;
  }
  
  if (Object.keys(additionalData).length > 0) {
    telemetryData.additionalData = additionalData;
  }
}

// Read EV charger data
async function readEVChargerData(device: ModbusDevice, telemetryData: any) {
  const client = device.client!;
  const map = device.registerMap;
  
  // Common EV charger registers
  if (map.power && map.power.address !== undefined) {
    const powerRegs = await readRegister(client, map.power);
    telemetryData.power = powerRegs;
  }
  
  if (map.energy && map.energy.address !== undefined) {
    const energyRegs = await readRegister(client, map.energy);
    telemetryData.energy = energyRegs;
  }
  
  if (map.voltage && map.voltage.address !== undefined) {
    const voltageRegs = await readRegister(client, map.voltage);
    telemetryData.voltage = voltageRegs;
  }
  
  if (map.current && map.current.address !== undefined) {
    const currentRegs = await readRegister(client, map.current);
    telemetryData.current = currentRegs;
  }
  
  // Additional data specific to EV chargers
  const additionalData: any = {};
  
  if (map.chargingStatus && map.chargingStatus.address !== undefined) {
    const statusRegs = await readRegister(client, map.chargingStatus);
    additionalData.isCharging = statusRegs === 1;
    additionalData.chargingMode = statusRegs === 1 ? 'charging' : 
                               statusRegs === 2 ? 'connected' : 'idle';
  }
  
  if (map.connectedVehicle && map.connectedVehicle.address !== undefined) {
    const vehicleRegs = await readRegister(client, map.connectedVehicle);
    additionalData.connectedVehicle = vehicleRegs === 1 ? 'connected' : null;
  }
  
  if (Object.keys(additionalData).length > 0) {
    telemetryData.additionalData = additionalData;
  }
}

// Helper function to read registers based on type
async function readRegister(client: ModbusRTU, register: RegisterMap[string]): Promise<number> {
  try {
    // Default length is 1 if not specified
    const length = register.length || 1;
    
    let data;
    
    // Read based on register type
    switch (register.type) {
      case 'coil':
        data = await client.readCoils(register.address, length);
        break;
        
      case 'discrete':
        data = await client.readDiscreteInputs(register.address, length);
        break;
        
      case 'input':
        data = await client.readInputRegisters(register.address, length);
        break;
        
      case 'holding':
        data = await client.readHoldingRegisters(register.address, length);
        break;
        
      default:
        throw new Error(`Unknown register type: ${register.type}`);
    }
    
    // Get the raw value based on data type
    let value = 0;
    
    // Handle different data types
    if (register.dataType === 'int16') {
      value = data.buffer.readInt16BE(0);
    } else if (register.dataType === 'uint32') {
      value = data.buffer.readUInt32BE(0);
    } else if (register.dataType === 'int32') {
      value = data.buffer.readInt32BE(0);
    } else if (register.dataType === 'float32') {
      value = data.buffer.readFloatBE(0);
    } else {
      // Default to uint16
      value = data.buffer.readUInt16BE(0);
    }
    
    // Apply scale factor if provided
    if (register.scaleFactor !== undefined) {
      value = value * register.scaleFactor;
    }
    
    return value;
  } catch (error) {
    console.error(`Error reading register ${register.address}:`, error);
    throw error;
  }
}

// Write to a register
export async function writeModbusRegister(
  deviceId: number,
  registerName: string,
  value: number
): Promise<boolean> {
  // In development mode, simulate successful register write
  if (process.env.NODE_ENV === 'development') {
    console.log(`Development mode: Simulating Modbus register write for device ${deviceId}, register ${registerName}, value ${value}`);
    return true;
  }

  const device = modbusDevices.get(deviceId);
  
  if (!device || !device.connected) {
    console.error(`Device ${deviceId} not found or not connected`);
    return false;
  }
  
  const register = device.registerMap[registerName];
  
  if (!register) {
    console.error(`Register ${registerName} not found in device ${deviceId} register map`);
    return false;
  }
  
  if (register.readOnly) {
    console.error(`Register ${registerName} is read-only`);
    return false;
  }
  
  try {
    // Handle different register types
    switch (register.type) {
      case 'coil':
        await device.client!.writeCoil(register.address, value === 1);
        break;
        
      case 'holding':
        // Apply scale factor in reverse if provided
        let scaledValue = value;
        if (register.scaleFactor !== undefined && register.scaleFactor !== 0) {
          scaledValue = value / register.scaleFactor;
        }
        
        // Handle different data types
        if (register.dataType === 'int16') {
          const buffer = Buffer.alloc(2);
          buffer.writeInt16BE(scaledValue, 0);
          await device.client!.writeRegisters(register.address, [buffer.readUInt16BE(0)]);
        } else if (register.dataType === 'uint32' || register.dataType === 'int32' || register.dataType === 'float32') {
          const buffer = Buffer.alloc(4);
          
          if (register.dataType === 'uint32') {
            buffer.writeUInt32BE(scaledValue, 0);
          } else if (register.dataType === 'int32') {
            buffer.writeInt32BE(scaledValue, 0);
          } else if (register.dataType === 'float32') {
            buffer.writeFloatBE(scaledValue, 0);
          }
          
          // For 32-bit values, we need to write two 16-bit registers
          await device.client!.writeRegisters(
            register.address, 
            [buffer.readUInt16BE(0), buffer.readUInt16BE(2)]
          );
        } else {
          // Default to uint16
          await device.client!.writeRegister(register.address, scaledValue);
        }
        break;
        
      default:
        console.error(`Cannot write to register type: ${register.type}`);
        return false;
    }
    
    console.log(`Successfully wrote ${value} to register ${registerName} on device ${deviceId}`);
    return true;
  } catch (error) {
    console.error(`Error writing to register ${registerName} on device ${deviceId}:`, error);
    return false;
  }
}

// Execute a command on a Modbus device
export async function executeModbusCommand(
  deviceId: number,
  command: string,
  parameters: any = {}
): Promise<{ success: boolean; message?: string; data?: any }> {
  // In development mode, simulate successful command execution
  if (process.env.NODE_ENV === 'development') {
    console.log(`Development mode: Simulating Modbus command ${command} for device ${deviceId}`);
    return {
      success: true,
      message: `Command ${command} simulated in development mode`,
      data: { 
        ...parameters,
        simulatedAt: new Date().toISOString(),
        deviceId
      }
    };
  }

  const device = modbusDevices.get(deviceId);
  
  if (!device) {
    return { 
      success: false, 
      message: `Device ${deviceId} not found in Modbus device map` 
    };
  }
  
  if (!device.connected) {
    return { 
      success: false, 
      message: `Device ${deviceId} not connected` 
    };
  }
  
  try {
    // Execute commands based on device type and command
    switch (device.deviceType) {
      case 'solar_pv':
        return executeSolarInverterCommand(device, command, parameters);
        
      case 'battery_storage':
        return executeBatteryCommand(device, command, parameters);
        
      case 'heat_pump':
        return executeHeatPumpCommand(device, command, parameters);
        
      case 'ev_charger':
        return executeEVChargerCommand(device, command, parameters);
        
      case 'smart_meter':
        return { 
          success: false, 
          message: `Smart meters typically don't support commands` 
        };
        
      default:
        return { 
          success: false, 
          message: `Unknown device type: ${device.deviceType}` 
        };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Error executing command: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Execute a command on a solar inverter
async function executeSolarInverterCommand(
  device: ModbusDevice,
  command: string,
  parameters: any
): Promise<{ success: boolean; message?: string; data?: any }> {
  switch (command) {
    case 'setLimits':
      if (parameters.powerLimit !== undefined && device.registerMap.powerLimit) {
        const success = await writeModbusRegister(device.id, 'powerLimit', parameters.powerLimit);
        return { 
          success, 
          message: success 
            ? `Power limit set to ${parameters.powerLimit}W` 
            : 'Failed to set power limit' 
        };
      }
      return { 
        success: false, 
        message: 'Power limit parameter missing or register not defined' 
      };
      
    case 'getStatus':
      // Poll the device immediately
      await pollDeviceData(device.id);
      return { 
        success: true, 
        message: 'Status updated' 
      };
      
    default:
      return { 
        success: false, 
        message: `Unknown command for solar inverter: ${command}` 
      };
  }
}

// Execute a command on a battery storage device
async function executeBatteryCommand(
  device: ModbusDevice,
  command: string,
  parameters: any
): Promise<{ success: boolean; message?: string; data?: any }> {
  switch (command) {
    case 'setChargingMode':
      if (parameters.mode !== undefined && device.registerMap.chargeMode) {
        let modeValue = 0;
        
        // Convert mode string to register value
        if (parameters.mode === 'charge') {
          modeValue = 1;
        } else if (parameters.mode === 'discharge') {
          modeValue = 2;
        } else if (parameters.mode === 'idle') {
          modeValue = 0;
        } else {
          return { 
            success: false, 
            message: `Invalid charging mode: ${parameters.mode}` 
          };
        }
        
        const success = await writeModbusRegister(device.id, 'chargeMode', modeValue);
        return { 
          success, 
          message: success 
            ? `Charging mode set to ${parameters.mode}` 
            : 'Failed to set charging mode' 
        };
      }
      return { 
        success: false, 
        message: 'Mode parameter missing or register not defined' 
      };
      
    case 'setChargeLimits':
      if (parameters.chargeLimit !== undefined && device.registerMap.chargeLimit) {
        const success = await writeModbusRegister(device.id, 'chargeLimit', parameters.chargeLimit);
        return { 
          success, 
          message: success 
            ? `Charge limit set to ${parameters.chargeLimit}W` 
            : 'Failed to set charge limit' 
        };
      }
      return { 
        success: false, 
        message: 'Charge limit parameter missing or register not defined' 
      };
      
    case 'setDischargeLimits':
      if (parameters.dischargeLimit !== undefined && device.registerMap.dischargeLimit) {
        const success = await writeModbusRegister(device.id, 'dischargeLimit', parameters.dischargeLimit);
        return { 
          success, 
          message: success 
            ? `Discharge limit set to ${parameters.dischargeLimit}W` 
            : 'Failed to set discharge limit' 
        };
      }
      return { 
        success: false, 
        message: 'Discharge limit parameter missing or register not defined' 
      };
      
    default:
      return { 
        success: false, 
        message: `Unknown command for battery storage: ${command}` 
      };
  }
}

// Execute a command on a heat pump
async function executeHeatPumpCommand(
  device: ModbusDevice,
  command: string,
  parameters: any
): Promise<{ success: boolean; message?: string; data?: any }> {
  switch (command) {
    case 'setMode':
      if (parameters.mode !== undefined && device.registerMap.mode) {
        let modeValue = 0;
        
        // Convert mode string to register value
        if (parameters.mode === 'heating') {
          modeValue = 1;
        } else if (parameters.mode === 'cooling') {
          modeValue = 2;
        } else if (parameters.mode === 'hot_water') {
          modeValue = 3;
        } else if (parameters.mode === 'off') {
          modeValue = 0;
        } else {
          return { 
            success: false, 
            message: `Invalid mode: ${parameters.mode}` 
          };
        }
        
        const success = await writeModbusRegister(device.id, 'mode', modeValue);
        return { 
          success, 
          message: success 
            ? `Mode set to ${parameters.mode}` 
            : 'Failed to set mode' 
        };
      }
      return { 
        success: false, 
        message: 'Mode parameter missing or register not defined' 
      };
      
    case 'setTemperature':
      if (parameters.temperature !== undefined && device.registerMap.targetTemp) {
        const success = await writeModbusRegister(device.id, 'targetTemp', parameters.temperature);
        return { 
          success, 
          message: success 
            ? `Temperature set to ${parameters.temperature}°C` 
            : 'Failed to set temperature' 
        };
      }
      return { 
        success: false, 
        message: 'Temperature parameter missing or register not defined' 
      };
      
    default:
      return { 
        success: false, 
        message: `Unknown command for heat pump: ${command}` 
      };
  }
}

// Execute a command on an EV charger
async function executeEVChargerCommand(
  device: ModbusDevice,
  command: string,
  parameters: any
): Promise<{ success: boolean; message?: string; data?: any }> {
  switch (command) {
    case 'startCharging':
      if (device.registerMap.chargingStatus) {
        const success = await writeModbusRegister(device.id, 'chargingStatus', 1);
        return { 
          success, 
          message: success 
            ? 'Charging started' 
            : 'Failed to start charging' 
        };
      }
      return { 
        success: false, 
        message: 'Charging status register not defined' 
      };
      
    case 'stopCharging':
      if (device.registerMap.chargingStatus) {
        const success = await writeModbusRegister(device.id, 'chargingStatus', 0);
        return { 
          success, 
          message: success 
            ? 'Charging stopped' 
            : 'Failed to stop charging' 
        };
      }
      return { 
        success: false, 
        message: 'Charging status register not defined' 
      };
      
    case 'setChargingCurrent':
      if (parameters.current !== undefined && device.registerMap.chargingCurrent) {
        const success = await writeModbusRegister(device.id, 'chargingCurrent', parameters.current);
        return { 
          success, 
          message: success 
            ? `Charging current set to ${parameters.current}A` 
            : 'Failed to set charging current' 
        };
      }
      return { 
        success: false, 
        message: 'Current parameter missing or register not defined' 
      };
      
    default:
      return { 
        success: false, 
        message: `Unknown command for EV charger: ${command}` 
      };
  }
}

// Close all Modbus connections
export function closeAllModbusConnections() {
  // Use Array.from to convert the iterator to an array to avoid downlevelIteration issues
  Array.from(modbusDevices.entries()).forEach(([deviceId, device]) => {
    // Clear polling interval
    if (device.pollingInterval) {
      clearInterval(device.pollingInterval);
    }
    
    // Close connection
    if (device.client && device.connected) {
      device.client.close(() => {
        console.log(`Closed Modbus connection for device ${deviceId}`);
      });
    }
  });
  
  // Clear device map
  modbusDevices.clear();
}

// Get all connected Modbus devices
export function getConnectedModbusDevices(): { deviceId: number; connected: boolean; deviceType: string }[] {
  const connectedDevices: { deviceId: number; connected: boolean; deviceType: string }[] = [];
  
  // Use Array.from to convert the iterator to an array to avoid downlevelIteration issues
  Array.from(modbusDevices.entries()).forEach(([deviceId, device]) => {
    connectedDevices.push({
      deviceId,
      connected: device.connected,
      deviceType: device.deviceType
    });
  });
  
  return connectedDevices;
}