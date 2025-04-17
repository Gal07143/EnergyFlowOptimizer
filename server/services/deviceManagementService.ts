import { storage } from '../storage';
import { initMqttClient, sendDeviceCommand, simulateDeviceTelemetry } from './mqttService';
import { initModbusDevice, executeModbusCommand } from '../adapters/modbusAdapter';
import { v4 as uuidv4 } from 'uuid';

// Initialize all services
export async function initDeviceServices(): Promise<boolean> {
  try {
    // In development mode, use a faster initialization path
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using simplified device service initialization');
      // Still initialize MQTT for communication capabilities
      const mqttConnected = await initMqttClient();
      console.log(`MQTT client initialization ${mqttConnected ? 'successful' : 'failed'}`);
      return true;
    }
    
    // Production path
    // Initialize MQTT client for device communications
    const mqttConnected = await initMqttClient();
    console.log(`MQTT client initialization ${mqttConnected ? 'successful' : 'failed'}`);
    
    // Load all devices - continue even if MQTT fails
    try {
      const devices = await loadAllDevices();
      console.log(`Loaded ${devices.length} devices`);
    } catch (deviceLoadError) {
      console.error('Error loading devices:', deviceLoadError);
      // Continue with server initialization even if device loading fails
    }
    
    return true; // Return true to allow server to start even with partial initialization
  } catch (error) {
    console.error('Error initializing device services:', error);
    // Still return true to allow server to start even with initialization issues
    return true;
  }
}

// Load all devices
async function loadAllDevices(): Promise<any[]> {
  try {
    // Get all sites
    const sites = await storage.getSites();
    
    // For each site, get all devices
    let allDevices: any[] = [];
    
    for (const site of sites) {
      try {
        const devices = await storage.getDevicesBySite(site.id);
        allDevices = [...allDevices, ...devices];
      } catch (siteDevicesError) {
        console.error(`Error loading devices for site ${site.id}:`, siteDevicesError);
        // Continue with other sites
      }
    }
    
    // Initialize protocol adapters for each device
    for (const device of allDevices) {
      try {
        await initDeviceAdapter(device);
      } catch (deviceError) {
        console.error(`Error initializing device ${device.id}:`, deviceError);
        // Continue with other devices
      }
    }
    
    return allDevices;
  } catch (error) {
    console.error('Error loading devices:', error);
    return [];
  }
}

// Initialize the appropriate protocol adapter for a device
async function initDeviceAdapter(device: any): Promise<boolean> {
  if (!device || !device.settings) {
    console.log(`Device ${device?.id} has no settings, skipping protocol initialization`);
    return false;
  }
  
  const settings = device.settings as any;
  
  // Check the configured connection protocol
  const protocol = device.connectionProtocol?.toLowerCase() || 
                  (settings.connectionProtocol || '').toLowerCase();
  
  switch (protocol) {
    case 'modbus':
      return (await initModbusDevice(device.id)) || false;
      
    case 'mqtt':
      console.log(`MQTT device ${device.id}, already supported through main MQTT client`);
      return true;
      
    case 'http':
      console.log(`HTTP device ${device.id}, standard protocol`);
      return true;
      
    default:
      console.log(`Unknown protocol ${protocol} for device ${device.id}`);
      return false;
  }
}

// Send a device command based on device type and protocol
export async function executeDeviceCommand(
  deviceId: number,
  command: string,
  parameters: any = {}
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    // In development mode, simulate successful commands for faster testing
    if (process.env.NODE_ENV === 'development') {
      // Allow telemetry simulation in dev mode
      if (command === 'simulateTelemetry') {
        const simulationResult = await simulateDeviceTelemetry(deviceId);
        return {
          success: simulationResult === true,
          message: simulationResult ? 'Telemetry simulated successfully' : 'Failed to simulate telemetry',
          data: { timestamp: new Date().toISOString() }
        };
      }
      
      console.log(`Development mode: Simulating command ${command} for device ${deviceId}`);
      return {
        success: true,
        message: `Command ${command} simulated successfully`,
        data: {
          ...parameters,
          deviceId,
          timestamp: new Date().toISOString(),
          simulatedResponse: true
        }
      };
    }
    
    // Get device details
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return { 
        success: false, 
        message: `Device ${deviceId} not found` 
      };
    }
    
    // Check device protocol
    const protocol = device.connectionProtocol?.toLowerCase() || 
                    ((device.settings as any)?.connectionProtocol || '').toLowerCase();
                    
    // Check device connection setting and execute command via the appropriate adapter
    switch (protocol) {
      case 'modbus':
        return await executeModbusCommand(deviceId, command, parameters);
        
      case 'mqtt':
        // Execute via MQTT
        const commandResult = await sendDeviceCommand(device.siteId, deviceId, command, parameters);
        return commandResult;
        
      case 'http':
        // HTTP commands would be implemented here
        return { 
          success: false, 
          message: 'HTTP device control not implemented yet' 
        };
        
      default:
        if (process.env.NODE_ENV === 'development') {
          // In development, simulate telemetry if requested
          if (command === 'simulateTelemetry') {
            const simulationResult = await simulateDeviceTelemetry(deviceId);
            // Ensure boolean value
            const success = simulationResult === true;
            return {
              success,
              message: success ? 'Telemetry simulated' : 'Failed to simulate telemetry'
            };
          }
        }
        
        return { 
          success: false, 
          message: `Unsupported protocol: ${protocol}` 
        };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Error executing command: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Register a new device
export async function registerDevice(
  siteId: number,
  deviceData: any
): Promise<{ success: boolean; device?: any; message?: string }> {
  try {
    // Validate required fields
    if (!deviceData.name || !deviceData.type) {
      return { 
        success: false, 
        message: 'Device name and type are required' 
      };
    }
    
    // Set the site ID
    deviceData.siteId = siteId;
    
    // Generate a unique identifier if not provided
    if (!deviceData.serialNumber) {
      deviceData.serialNumber = `gen_${uuidv4().substring(0, 8)}`;
    }
    
    // Default status is offline until connected
    if (!deviceData.status) {
      deviceData.status = 'offline';
    }
    
    // Add default settings based on device type
    if (!deviceData.settings) {
      deviceData.settings = createDefaultDeviceSettings(deviceData.type);
    }
    
    // Create the device in storage
    const newDevice = await storage.createDevice(deviceData);
    
    // Initialize device adapter
    await initDeviceAdapter(newDevice);
    
    return { 
      success: true, 
      device: newDevice,
      message: 'Device registered successfully' 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error registering device: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Create default device settings based on device type
function createDefaultDeviceSettings(deviceType: string): any {
  const settings: any = {
    description: `${deviceType.toUpperCase()} device`,
  };
  
  switch (deviceType) {
    case 'solar_pv':
      settings.maxPower = 5000; // 5kW
      settings.panelType = 'monocrystalline';
      settings.orientation = 'south';
      settings.tilt = 30; // 30 degrees
      settings.efficiency = 0.18; // 18%
      break;
      
    case 'battery_storage':
      settings.capacity = 10000; // 10kWh
      settings.maxChargePower = 3000; // 3kW
      settings.maxDischargePower = 3000; // 3kW
      settings.minSoC = 10; // 10%
      settings.maxSoC = 95; // 95%
      break;
      
    case 'ev_charger':
      settings.maxPower = 7400; // 7.4kW
      settings.phases = 1; // Single phase
      settings.maxCurrent = 32; // 32A
      settings.connectorType = 'Type 2';
      break;
      
    case 'smart_meter':
      settings.measurementPoints = ['grid'];
      settings.dataInterval = 60; // 60 seconds
      break;
      
    case 'heat_pump':
      settings.maxPower = 3000; // 3kW
      settings.cop = 4.0; // COP of 4
      settings.maxTemperature = 60; // 60°C
      settings.minTemperature = 35; // 35°C
      break;
  }
  
  return settings;
}

// Update device status
export async function updateDeviceStatus(
  deviceId: number,
  status: string,
  additionalData: any = {}
): Promise<{ success: boolean; message?: string }> {
  try {
    // Update device status
    const updatedDevice = await storage.updateDevice(deviceId, {
      status,
      updatedAt: new Date(),
      ...additionalData
    });
    
    if (!updatedDevice) {
      return { 
        success: false, 
        message: `Device ${deviceId} not found` 
      };
    }
    
    return { 
      success: true,
      message: `Device status updated to ${status}` 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error updating device status: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Get device readings
export async function getLatestDeviceReadings(
  deviceId: number,
  limit: number = 1
): Promise<{ success: boolean; readings?: any[]; message?: string }> {
  try {
    // Get device readings
    const readings = await storage.getDeviceReadings(deviceId, limit);
    
    return { 
      success: true, 
      readings 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error getting device readings: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Check device connectivity
export async function pingDevice(
  deviceId: number
): Promise<{ success: boolean; message?: string; status?: string }> {
  try {
    // Get device
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return { 
        success: false, 
        message: `Device ${deviceId} not found` 
      };
    }
    
    // Execute a status check command based on protocol
    const result = await executeDeviceCommand(deviceId, 'getStatus');
    
    if (result.success) {
      // Update device status to online
      await updateDeviceStatus(deviceId, 'online');
      
      return { 
        success: true, 
        message: 'Device is online',
        status: 'online'
      };
    } else {
      // Update device status to offline
      await updateDeviceStatus(deviceId, 'offline');
      
      return { 
        success: false, 
        message: 'Device is offline',
        status: 'offline'
      };
    }
  } catch (error) {
    // Update device status to error
    await updateDeviceStatus(deviceId, 'error');
    
    return { 
      success: false, 
      message: `Error pinging device: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error'
    };
  }
}

// Update device firmware (placeholder for future implementation)
export async function updateDeviceFirmware(
  deviceId: number,
  firmwareVersion: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Update device firmware version
    const updatedDevice = await storage.updateDevice(deviceId, {
      firmwareVersion,
      updatedAt: new Date()
    });
    
    if (!updatedDevice) {
      return { 
        success: false, 
        message: `Device ${deviceId} not found` 
      };
    }
    
    return { 
      success: true,
      message: `Device firmware updated to ${firmwareVersion}` 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error updating device firmware: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Generic device configuration update
export async function updateDeviceConfiguration(
  deviceId: number,
  configuration: any
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get existing device
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return { 
        success: false, 
        message: `Device ${deviceId} not found` 
      };
    }
    
    // Merge existing settings with new configuration
    const currentSettings = device.settings || {};
    const updatedSettings = { ...currentSettings, ...configuration };
    
    // Update device settings
    const updatedDevice = await storage.updateDevice(deviceId, {
      settings: updatedSettings,
      updatedAt: new Date()
    });
    
    return { 
      success: true,
      message: 'Device configuration updated' 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error updating device configuration: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}