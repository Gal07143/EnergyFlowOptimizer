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
      firmwareVersion: device.firmwareVersion,
      protocol: device.protocol,
      status: device.status,
      siteId: device.siteId,
      capabilities: device.capabilities,
      lastSeenAt: device.lastSeenAt
    }));
    
    res.json(mappedDevices);
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Failed to retrieve devices' });
  }
}

// Get device details by ID
export async function getDeviceById(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    const deviceService = getDeviceManagementService();
    const device = deviceService.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get protocol-specific data
    const protocolData = await getProtocolSpecificData(device);
    
    // Map device to a more frontend-friendly format with protocol details
    const deviceDetails = {
      id: device.id,
      name: device.name,
      type: device.type,
      model: device.model,
      manufacturer: device.manufacturer,
      serialNumber: device.serialNumber,
      firmwareVersion: device.firmwareVersion,
      protocol: device.protocol,
      protocolDetails: device.protocol === 'mqtt' ? undefined : protocolData,
      status: device.status,
      siteId: device.siteId,
      capabilities: device.capabilities,
      lastSeenAt: device.lastSeenAt,
      location: device.location
    };
    
    res.json(deviceDetails);
  } catch (error) {
    console.error(`Error getting device details:`, error);
    res.status(500).json({ error: 'Failed to retrieve device details' });
  }
}

// Get devices by site ID
export async function getDevicesBySite(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    const deviceService = getDeviceManagementService();
    const devices = deviceService.getDevicesBySite(siteId);
    
    // Map devices to a more frontend-friendly format
    const mappedDevices = devices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      model: device.model,
      manufacturer: device.manufacturer,
      protocol: device.protocol,
      status: device.status,
      capabilities: device.capabilities,
      lastSeenAt: device.lastSeenAt
    }));
    
    res.json(mappedDevices);
  } catch (error) {
    console.error(`Error getting devices for site:`, error);
    res.status(500).json({ error: 'Failed to retrieve devices for site' });
  }
}

// Get devices by type
export async function getDevicesByType(req: Request, res: Response) {
  try {
    const deviceType = req.params.type;
    
    const deviceService = getDeviceManagementService();
    const devices = deviceService.getDevicesByType(deviceType as any);
    
    // Map devices to a more frontend-friendly format
    const mappedDevices = devices.map(device => ({
      id: device.id,
      name: device.name,
      model: device.model,
      manufacturer: device.manufacturer,
      protocol: device.protocol,
      status: device.status,
      capabilities: device.capabilities,
      lastSeenAt: device.lastSeenAt
    }));
    
    res.json(mappedDevices);
  } catch (error) {
    console.error(`Error getting devices by type:`, error);
    res.status(500).json({ error: 'Failed to retrieve devices by type' });
  }
}

// Add new device
export async function addDevice(req: Request, res: Response) {
  try {
    const deviceData = req.body;
    
    // Validate required fields
    if (!deviceData.name || !deviceData.type || !deviceData.protocol) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const deviceService = getDeviceManagementService();
    const newDevice = deviceService.addDevice(deviceData);
    
    res.status(201).json(newDevice);
  } catch (error) {
    console.error('Error adding device:', error);
    res.status(500).json({ error: 'Failed to add device' });
  }
}

// Update device
export async function updateDevice(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    const updates = req.body;
    
    const deviceService = getDeviceManagementService();
    const updatedDevice = deviceService.updateDevice(deviceId, updates);
    
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

// Get protocol-specific data for a device
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