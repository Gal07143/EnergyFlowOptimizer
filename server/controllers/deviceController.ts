import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertDeviceSchema, insertDeviceReadingSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export const getDevices = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const devices = await storage.getDevicesBySite(siteId);
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Failed to fetch devices' });
  }
};

export const getDevicesByType = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    const { type } = req.params;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const devices = await storage.getDevicesByType(siteId, type);
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices by type:', error);
    res.status(500).json({ message: 'Failed to fetch devices by type' });
  }
};

export const getDevice = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ message: 'Failed to fetch device' });
  }
};

export const createDevice = async (req: Request, res: Response) => {
  try {
    const deviceData = insertDeviceSchema.parse(req.body);
    const device = await storage.createDevice(deviceData);
    res.status(201).json(device);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error('Error creating device:', error);
    res.status(500).json({ message: 'Failed to create device' });
  }
};

export const updateDevice = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    const existingDevice = await storage.getDevice(deviceId);
    
    if (!existingDevice) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    const deviceData = req.body;
    const updatedDevice = await storage.updateDevice(deviceId, deviceData);
    res.json(updatedDevice);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ message: 'Failed to update device' });
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    const success = await storage.deleteDevice(deviceId);
    
    if (!success) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ message: 'Failed to delete device' });
  }
};

export const getDeviceReadings = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    const readings = await storage.getDeviceReadings(deviceId, limit);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching device readings:', error);
    res.status(500).json({ message: 'Failed to fetch device readings' });
  }
};

export const getDeviceReadingsByTimeRange = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    const { startTime, endTime } = req.query;
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    
    const startDate = new Date(startTime as string);
    const endDate = new Date(endTime as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time' });
    }
    
    const readings = await storage.getDeviceReadingsByTimeRange(deviceId, startDate, endDate);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching device readings by time range:', error);
    res.status(500).json({ message: 'Failed to fetch device readings by time range' });
  }
};

export const createDeviceReading = async (req: Request, res: Response) => {
  try {
    const readingData = insertDeviceReadingSchema.parse(req.body);
    const reading = await storage.createDeviceReading(readingData);
    res.status(201).json(reading);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error('Error creating device reading:', error);
    res.status(500).json({ message: 'Failed to create device reading' });
  }
};

export const controlDevice = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    const { action, parameters } = req.body;
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    if (!action) {
      return res.status(400).json({ message: 'Action is required' });
    }
    
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    // Create a response object with status
    const response: any = {
      status: 'success',
      deviceId,
      action,
      timestamp: new Date().toISOString()
    };
    
    // Handle device-specific actions
    switch (device.type) {
      case 'heat_pump':
        if (action === 'setTemperature' && parameters?.temperature) {
          // Create a new device reading with the updated target temperature
          const newReading = {
            deviceId,
            timestamp: new Date(),
            power: parameters.power ? Number(parameters.power) : 1.2,
            energy: null,
            stateOfCharge: null,
            voltage: null,
            current: null,
            frequency: null,
            temperature: null,
            additionalData: {
              targetTemp: Number(parameters.temperature),
              // Preserve other data if any
              ...(parameters.additionalData || {})
            }
          };
          
          const reading = await storage.createDeviceReading(newReading);
          response.reading = reading;
        } 
        else if (action === 'setMode' && parameters?.mode) {
          // Create a new device reading with the updated mode
          const newReading = {
            deviceId,
            timestamp: new Date(),
            power: parameters.power ? Number(parameters.power) : 1.2,
            energy: null,
            stateOfCharge: null,
            voltage: null,
            current: null,
            frequency: null,
            temperature: null,
            additionalData: {
              mode: parameters.mode,
              // Preserve other data if any
              ...(parameters.additionalData || {})
            }
          };
          
          const reading = await storage.createDeviceReading(newReading);
          response.reading = reading;
        }
        else {
          return res.status(400).json({ 
            message: 'Invalid action for heat pump device',
            supportedActions: ['setTemperature', 'setMode']
          });
        }
        break;
        
      case 'battery_storage':
        if (action === 'setChargingMode' && parameters?.mode) {
          // Handle battery charging mode
          const newReading = {
            deviceId,
            timestamp: new Date(),
            power: parameters.power ? Number(parameters.power) : 0,
            energy: null,
            stateOfCharge: parameters.stateOfCharge ? Number(parameters.stateOfCharge) : null,
            voltage: null,
            current: null,
            frequency: null,
            temperature: null,
            additionalData: {
              mode: parameters.mode,
              ...(parameters.additionalData || {})
            }
          };
          
          const reading = await storage.createDeviceReading(newReading);
          response.reading = reading;
        } 
        else {
          return res.status(400).json({ 
            message: 'Invalid action for battery device',
            supportedActions: ['setChargingMode']
          });
        }
        break;
        
      case 'ev_charger':
        if (action === 'startCharging') {
          // Handle EV charger start
          const newReading = {
            deviceId,
            timestamp: new Date(),
            power: parameters?.power ? Number(parameters.power) : 7.4,
            energy: null,
            stateOfCharge: null,
            voltage: null,
            current: null,
            frequency: null,
            temperature: null,
            additionalData: {
              isCharging: true,
              ...(parameters?.additionalData || {})
            }
          };
          
          const reading = await storage.createDeviceReading(newReading);
          response.reading = reading;
        } 
        else if (action === 'stopCharging') {
          // Handle EV charger stop
          const newReading = {
            deviceId,
            timestamp: new Date(),
            power: 0,
            energy: null,
            stateOfCharge: null,
            voltage: null,
            current: null,
            frequency: null,
            temperature: null,
            additionalData: {
              isCharging: false,
              ...(parameters?.additionalData || {})
            }
          };
          
          const reading = await storage.createDeviceReading(newReading);
          response.reading = reading;
        }
        else {
          return res.status(400).json({ 
            message: 'Invalid action for EV charger device',
            supportedActions: ['startCharging', 'stopCharging']
          });
        }
        break;
        
      default:
        return res.status(400).json({ 
          message: `Control actions not supported for device type: ${device.type}` 
        });
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error controlling device:', error);
    res.status(500).json({ message: 'Failed to control device' });
  }
};
