import { Request, Response } from 'express';
import { getDeviceManagementService } from '../services/deviceManagementService';
import { getModbusManager } from '../adapters/modbusAdapter';
import { ocppManager } from '../adapters/ocppAdapter';
import { getEEBusManager } from '../adapters/eebusAdapter';
import { sunspecManager } from '../adapters/sunspecAdapter';

// Get all devices
export async function getAllDevices(req: Request, res: Response) {
  try {
    const deviceService = getDeviceManagementService();
    const devices = deviceService.getAllDevices();
    
    // Map devices to a more frontend-friendly format
    const mappedDevices = devices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      model: device.model,
      manufacturer: device.manufacturer,
      serialNumber: device.serialNumber,
      status: device.status,
      siteId: device.siteId,
      capabilities: device.capabilities,
      protocol: device.protocol,
      protocolConfig: device.protocolConfig,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    }));
    
    res.json(mappedDevices);
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Failed to retrieve devices' });
  }
}

// Get device by ID
export async function getDeviceById(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    const deviceService = getDeviceManagementService();
    const device = deviceService.getDeviceById(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(device);
  } catch (error) {
    console.error('Error getting device:', error);
    res.status(500).json({ error: 'Failed to retrieve device' });
  }
}

// Get devices by site
export async function getDevicesBySite(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    const deviceService = getDeviceManagementService();
    const devices = deviceService.getDevicesBySite(siteId);
    
    res.json(devices);
  } catch (error) {
    console.error('Error getting devices by site:', error);
    res.status(500).json({ error: 'Failed to retrieve devices' });
  }
}

// Get devices by type
export async function getDevicesByType(req: Request, res: Response) {
  try {
    const deviceType = req.params.type;
    if (!deviceType) {
      return res.status(400).json({ error: 'Device type is required' });
    }
    
    const deviceService = getDeviceManagementService();
    const devices = deviceService.getDevicesByType(deviceType);
    
    res.json(devices);
  } catch (error) {
    console.error('Error getting devices by type:', error);
    res.status(500).json({ error: 'Failed to retrieve devices' });
  }
}

// Add a new device
export async function addDevice(req: Request, res: Response) {
  try {
    const deviceData = req.body;
    
    // Validate required fields
    if (!deviceData.name || !deviceData.type || !deviceData.siteId) {
      return res.status(400).json({ error: 'Name, type, and siteId are required' });
    }
    
    const deviceService = getDeviceManagementService();
    const newDevice = deviceService.addDevice(deviceData);
    
    res.status(201).json(newDevice);
  } catch (error) {
    console.error('Error adding device:', error);
    res.status(500).json({ error: 'Failed to add device' });
  }
}

// Update an existing device
export async function updateDevice(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    const deviceData = req.body;
    
    const deviceService = getDeviceManagementService();
    const existingDevice = deviceService.getDeviceById(deviceId);
    
    if (!existingDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const updatedDevice = deviceService.updateDevice(deviceId, deviceData);
    if (!updatedDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(updatedDevice);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
}

// Delete device
export async function deleteDevice(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    const deviceService = getDeviceManagementService();
    const success = deviceService.removeDevice(deviceId);
    
    if (!success) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
}

/**
 * Get telemetry data for all devices at a specific site
 */
export async function getSiteDevicesTelemetry(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    const deviceService = getDeviceManagementService();
    const devices = deviceService.getDevicesBySite(siteId);
    
    if (!devices || devices.length === 0) {
      return res.status(404).json({ error: 'No devices found for this site' });
    }
    
    // Collect telemetry data for each device
    const telemetryData: Record<string, any> = {};
    
    for (const device of devices) {
      let deviceTelemetry: any = {};
      
      // Try to get real-time data from the appropriate protocol adapter
      try {
        switch (device.protocol) {
          case 'modbus': {
            const modbusManager = getModbusManager();
            const adapter = modbusManager.getAdapter(device.id);
            if (adapter) {
              deviceTelemetry = adapter.getLastReadings();
            }
            break;
          }
          
          case 'ocpp': {
            const adapter = ocppManager.getAdapter(device.id);
            if (adapter) {
              deviceTelemetry = {
                status: adapter.getStatus(),
                activeTransactions: adapter.getActiveTransactions()
              };
            }
            break;
          }
          
          case 'eebus': {
            const eebusManager = getEEBusManager();
            const adapter = eebusManager.getAdapter(device.id);
            if (adapter) {
              deviceTelemetry = adapter.getStatus();
            }
            break;
          }
          
          case 'sunspec': {
            const adapter = sunspecManager.getAdapter(device.id);
            if (adapter) {
              deviceTelemetry = adapter.getSunSpecData();
            }
            break;
          }
          
          case 'mqtt': {
            // For MQTT devices, use the latest received data from the device manager
            deviceTelemetry = deviceService.getDeviceTelemetry(device.id);
            break;
          }
        }
      } catch (error) {
        console.error(`Error getting telemetry for device ${device.id}:`, error);
      }
      
      // If we couldn't get real telemetry, generate some realistic demo values
      // based on the device type
      if (!deviceTelemetry || Object.keys(deviceTelemetry).length === 0) {
        switch (device.type) {
          case 'solar_pv':
            // Solar inverter telemetry
            deviceTelemetry = {
              power: Math.random() * 5, // kW
              dailyEnergy: Math.random() * 30, // kWh
              voltage: 230 + (Math.random() * 10 - 5), // V
              current: Math.random() * 10, // A
              frequency: 49.8 + (Math.random() * 0.4), // Hz
              temperature: 35 + (Math.random() * 10), // Celsius
              efficiency: 95 + (Math.random() * 5), // %
              status: 'producing'
            };
            break;
            
          case 'battery_storage':
            // Battery telemetry
            deviceTelemetry = {
              power: Math.random() * 4, // kW
              soc: 50 + (Math.random() * 30), // %
              voltage: 48 + (Math.random() * 2), // V
              current: Math.random() * 20, // A
              temperature: 30 + (Math.random() * 8), // Celsius
              cycles: Math.floor(Math.random() * 100), // Count
              status: Math.random() > 0.5 ? 'charging' : 'discharging'
            };
            break;
            
          case 'ev_charger':
            // EV charger telemetry
            deviceTelemetry = {
              power: Math.random() * 7, // kW
              connectorStatus: Math.random() > 0.7 ? 'connected' : 'available',
              energy: Math.random() * 20, // kWh
              voltage: 230 + (Math.random() * 10 - 5), // V
              current: Math.random() * 32, // A
              temperature: 25 + (Math.random() * 10), // Celsius
              status: Math.random() > 0.7 ? 'charging' : 'idle'
            };
            break;
            
          case 'smart_meter':
            // Smart meter telemetry
            deviceTelemetry = {
              activePower: Math.random() * 10 - 2, // kW (negative = export)
              reactivePower: Math.random() * 2, // kVAr
              voltage: 230 + (Math.random() * 10 - 5), // V
              current: Math.random() * 20, // A
              frequency: 49.9 + (Math.random() * 0.2), // Hz
              powerFactor: 0.9 + (Math.random() * 0.1), // PF
              totalEnergy: 1000 + (Math.random() * 200), // kWh
              status: 'measuring'
            };
            break;
            
          default:
            // Generic telemetry
            deviceTelemetry = {
              status: 'online',
              lastUpdated: new Date().toISOString()
            };
        }
      }
      
      telemetryData[device.id] = {
        ...deviceTelemetry,
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type,
        lastUpdated: new Date().toISOString()
      };
    }
    
    res.json(telemetryData);
  } catch (error) {
    console.error('Error fetching device telemetry:', error);
    res.status(500).json({ error: 'Failed to retrieve device telemetry' });
  }
}

/**
 * Get protocol-specific data for a device
 */
async function getProtocolSpecificData(device: any): Promise<any> {
  try {
    switch (device.protocol) {
      case 'modbus': {
        const modbusManager = getModbusManager();
        const adapter = modbusManager.getAdapter(device.id);
        if (!adapter) return null;
        
        return {
          connectionType: device.protocolConfig?.connection?.type || 'tcp',
          address: device.protocolConfig?.address,
          registers: device.protocolConfig?.registers?.length || 0,
          scanInterval: device.protocolConfig?.scanInterval || 5000,
          lastReadings: adapter.getLastReadings()
        };
      }
      
      case 'ocpp': {
        // ocppManager is already imported
        const adapter = ocppManager.getAdapter(device.id);
        if (!adapter) return null;
        
        return {
          version: device.protocolConfig?.version || '1.6',
          status: adapter.getStatus(),
          connectors: device.protocolConfig?.connectors || 1,
          activeTransactions: adapter.getActiveTransactions(),
          maxPower: device.protocolConfig?.maxPower
        };
      }
      
      case 'eebus': {
        const eebusManager = getEEBusManager();
        const adapter = eebusManager.getAdapter(device.id);
        if (!adapter) return null;
        
        const status = adapter.getStatus();
        return {
          deviceType: device.protocolConfig?.deviceType || 'HeatPump',
          operationMode: status.operationMode,
          currentPower: status.currentPower,
          currentTemperature: status.currentTemperature,
          targetTemperature: status.targetTemperature,
          isFlexible: status.isFlexible
        };
      }
      
      case 'sunspec': {
        // sunspecManager is already imported
        const adapter = sunspecManager.getAdapter(device.id);
        if (!adapter) return null;
        
        const data = adapter.getSunSpecData();
        return {
          deviceType: device.protocolConfig?.deviceType || 'Inverter',
          status: data.status,
          activePower: data.activePower,
          energyTotal: data.energyTotal / 1000, // Convert to kWh
          efficiency: data.efficiency,
          temperature: data.temperature,
          dayProduction: data.dayProduction
        };
      }
      
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error getting protocol data for device ${device.id}:`, error);
    return null;
  }
}