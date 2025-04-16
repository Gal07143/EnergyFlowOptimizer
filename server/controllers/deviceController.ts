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
