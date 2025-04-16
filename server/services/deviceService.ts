import { storage } from '../storage';
import { Device, DeviceReading, insertDeviceReadingSchema } from '@shared/schema';
import { broadcastDeviceReading } from './websocketService';

// Get all devices for a site
export async function getDevicesBySite(siteId: number): Promise<Device[]> {
  return await storage.getDevicesBySite(siteId);
}

// Get devices by type for a site
export async function getDevicesByType(siteId: number, type: string): Promise<Device[]> {
  return await storage.getDevicesByType(siteId, type);
}

// Get a single device by ID
export async function getDevice(id: number): Promise<Device | undefined> {
  return await storage.getDevice(id);
}

// Update device status
export async function updateDeviceStatus(
  deviceId: number,
  status: string
): Promise<Device | undefined> {
  const device = await storage.getDevice(deviceId);
  
  if (!device) {
    return undefined;
  }
  
  return await storage.updateDevice(deviceId, { status: status as any });
}

// Process device telemetry data
export async function processDeviceTelemetry(
  deviceId: number,
  telemetry: any
): Promise<DeviceReading | undefined> {
  try {
    // Validate the device exists
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      console.error(`Device with ID ${deviceId} not found`);
      return undefined;
    }
    
    // Prepare reading data
    const readingData = {
      deviceId,
      timestamp: new Date(),
      ...telemetry
    };
    
    // Validate and create reading
    const validatedData = insertDeviceReadingSchema.parse(readingData);
    const reading = await storage.createDeviceReading(validatedData);
    
    // Broadcast to subscribed clients
    broadcastDeviceReading(deviceId, reading);
    
    // Update device status if it was offline
    if (device.status === 'offline') {
      await storage.updateDevice(deviceId, { status: 'online' });
    }
    
    return reading;
  } catch (error) {
    console.error('Error processing device telemetry:', error);
    return undefined;
  }
}

// Get recent device readings with limit
export async function getRecentDeviceReadings(
  deviceId: number,
  limit: number = 100
): Promise<DeviceReading[]> {
  return await storage.getDeviceReadings(deviceId, limit);
}

// Get device readings for a time range
export async function getDeviceReadingsByTimeRange(
  deviceId: number,
  startTime: Date,
  endTime: Date
): Promise<DeviceReading[]> {
  return await storage.getDeviceReadingsByTimeRange(deviceId, startTime, endTime);
}

// Check device connection status
export async function checkDeviceConnection(deviceId: number): Promise<boolean> {
  const device = await storage.getDevice(deviceId);
  
  if (!device) {
    return false;
  }
  
  // Check last reading timestamp
  const readings = await storage.getDeviceReadings(deviceId, 1);
  
  if (readings.length === 0) {
    // No readings yet, consider offline
    return false;
  }
  
  const lastReading = readings[0];
  const now = new Date();
  const lastReadingTime = new Date(lastReading.timestamp);
  
  // Consider offline if no readings in the last 5 minutes
  const offlineThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
  const isOnline = (now.getTime() - lastReadingTime.getTime()) < offlineThreshold;
  
  // Update device status if needed
  if (isOnline && device.status !== 'online') {
    await storage.updateDevice(deviceId, { status: 'online' });
  } else if (!isOnline && device.status === 'online') {
    await storage.updateDevice(deviceId, { status: 'offline' });
  }
  
  return isOnline;
}

// Send control command to device
// This would integrate with actual device control protocols
export async function sendDeviceCommand(
  deviceId: number,
  command: string,
  parameters: any
): Promise<boolean> {
  const device = await storage.getDevice(deviceId);
  
  if (!device) {
    console.error(`Device with ID ${deviceId} not found`);
    return false;
  }
  
  console.log(`Sending command to device ${deviceId}:`, command, parameters);
  
  // Implementation would depend on the specific device protocol
  // For now, we'll just log it and return success
  return true;
}
