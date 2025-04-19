import { Request, Response } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { tariffs, devices } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Get all tariffs for a site
export const getTariffs = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const tariffs = await storage.getTariffs(siteId);
    res.json(tariffs);
  } catch (error: any) {
    console.error('Error fetching tariffs:', error);
    res.status(500).json({ message: 'Failed to fetch tariffs', error: error?.message || 'Unknown error' });
  }
};

// Get tariff details for a specific site
export const getTariffBySite = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const siteTariffs = await storage.getTariffs(siteId);
    
    // If no tariffs found, return 404
    if (!siteTariffs || siteTariffs.length === 0) {
      return res.status(404).json({ message: 'No tariff found for this site' });
    }
    
    // Return the first tariff for now (in the future, we might allow multiple tariffs)
    res.json(siteTariffs[0]);
  } catch (error: any) {
    console.error('Error fetching tariff:', error);
    res.status(500).json({ message: 'Failed to fetch tariff', error: error?.message || 'Unknown error' });
  }
};

// Get current tariff rate based on time of day
export const getCurrentTariffRate = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const siteTariffs = await storage.getTariffs(siteId);
    
    if (!siteTariffs || siteTariffs.length === 0) {
      return res.status(404).json({ message: 'No tariff found for this site' });
    }
    
    const tariff = siteTariffs[0];
    const now = new Date();
    
    // Default to the regular import rate
    let rate = Number(tariff.importRate);
    let period = 'Standard Rate';
    
    // If it's a time-of-use tariff, determine the current rate based on time of day
    if (tariff.isTimeOfUse && tariff.scheduleData) {
      const schedule = tariff.scheduleData as Record<string, Record<string, number>>;
      const hours = now.getHours();
      
      // Determine the current season
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed
      
      let currentSeason;
      if (month >= 6 && month <= 9) {
        currentSeason = 'summer'; // June-September
      } else if (month >= 10 && month <= 11) {
        currentSeason = 'autumn'; // October-November
      } else if (month >= 3 && month <= 5) {
        currentSeason = 'spring'; // March-May
      } else {
        currentSeason = 'winter'; // December-February
      }
      
      const seasonSchedule = schedule[currentSeason];
      
      if (seasonSchedule) {
        if (hours >= 17 && hours < 22) {
          rate = Number(seasonSchedule.peak) || Number(rate);
          period = 'Peak (17:00-22:00)';
        } else if ((hours >= 7 && hours < 17) || (hours >= 22 && hours < 23)) {
          rate = Number(seasonSchedule.shoulder) || Number(rate);
          period = 'Shoulder (7:00-17:00, 22:00-23:00)';
        } else {
          rate = Number(seasonSchedule.offPeak) || Number(rate);
          period = 'Off-Peak (23:00-7:00)';
        }
      }
    }
    
    res.json({
      rate,
      period,
      timestamp: now,
      isTimeOfUse: tariff.isTimeOfUse,
      currency: tariff.currency
    });
  } catch (error: any) {
    console.error('Error fetching current tariff rate:', error);
    res.status(500).json({ message: 'Failed to determine current tariff rate', error: error?.message || 'Unknown error' });
  }
};

// Create a new tariff for a site
export const createTariff = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Check if site exists
    const site = await storage.getSite(siteId);
    
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }
    
    // Create the tariff
    const tariff = await storage.createTariff({
      siteId,
      ...req.body,
      importRate: parseFloat(req.body.importRate) || 0,
      exportRate: parseFloat(req.body.exportRate) || 0,
    });
    
    res.status(201).json(tariff);
  } catch (error: any) {
    console.error('Error creating tariff:', error);
    res.status(500).json({ message: 'Failed to create tariff', error: error?.message || 'Unknown error' });
  }
};

// Update an existing tariff
export const updateTariff = async (req: Request, res: Response) => {
  try {
    const tariffId = parseInt(req.params.id);
    
    if (isNaN(tariffId)) {
      return res.status(400).json({ message: 'Invalid tariff ID' });
    }
    
    // Get the existing tariff
    const existingTariff = await storage.getTariff(tariffId);
    
    if (!existingTariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    
    // Prepare the update data
    const updateData = {
      ...req.body,
    };
    
    // Parse numeric values if provided
    if (req.body.importRate !== undefined) {
      updateData.importRate = parseFloat(req.body.importRate);
    }
    
    if (req.body.exportRate !== undefined) {
      updateData.exportRate = parseFloat(req.body.exportRate);
    }
    
    // Update the tariff
    const updatedTariff = await storage.updateTariff(tariffId, updateData);
    
    res.json(updatedTariff);
  } catch (error: any) {
    console.error('Error updating tariff:', error);
    res.status(500).json({ message: 'Failed to update tariff', error: error?.message || 'Unknown error' });
  }
};

// Create Israeli tariff data for a site
export const createIsraeliTariffData = async (siteId: number) => {
  try {
    // Check if site already has a tariff
    const existingTariffs = await storage.getTariffs(siteId);
    
    // If Israeli tariff already exists, return it
    const existingIsraeliTariff = existingTariffs.find(
      (t) => t.name === 'Israeli Electricity Tariff' && t.provider === 'Israel Electric Corporation'
    );
    
    if (existingIsraeliTariff) {
      return existingIsraeliTariff;
    }
    
    // Israeli tariff data with Time-of-Use (TOU) rates
    // Updated April 2025 rates for Israeli Electric Corporation
    const israeliTariffData = {
      siteId,
      name: 'Israeli Electricity Tariff (TOU)',
      provider: 'Israel Electric Corporation',
      importRate: 0.58, // Base rate in ILS for Low Voltage
      exportRate: 0.24, // Updated feed-in tariff for solar in ILS
      isTimeOfUse: true,
      currency: 'ILS',
      dataIntervalSeconds: 60,
      scheduleData: {
        // Summer rates (June-September) - Higher due to AC usage
        summer: {
          peak: 0.92,     // Peak: 17:00-22:00 (High demand period)
          shoulder: 0.58, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.32   // Off-peak: 23:00-7:00
        },
        // Winter rates (December-February)
        winter: {
          peak: 0.68,     // Peak: 17:00-22:00 (Evenings with heating)
          shoulder: 0.49, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.29   // Off-peak: 23:00-7:00
        },
        // Transition seasons (March-May, October-November)
        spring: {
          peak: 0.59,     // Peak: 17:00-22:00
          shoulder: 0.46, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.27   // Off-peak: 23:00-7:00
        },
        autumn: {
          peak: 0.59,     // Peak: 17:00-22:00
          shoulder: 0.46, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.27   // Off-peak: 23:00-7:00
        }
      }
    };
    
    // Create the Israeli tariff in the database
    const createdTariff = await storage.createTariff(israeliTariffData);
    
    return createdTariff;
  } catch (error) {
    console.error('Error creating Israeli tariff data:', error);
    throw error;
  }
};

// Create Israeli LV (Low Voltage) static tariff data
export const createIsraeliLVTariffData = async (siteId: number) => {
  try {
    // Check if site already has a tariff
    const existingTariffs = await storage.getTariffs(siteId);
    
    // If Israeli LV tariff already exists, return it
    const existingLVTariff = existingTariffs.find(
      (t) => t.name === 'Israeli LV Tariff' && t.provider === 'Israel Electric Corporation'
    );
    
    if (existingLVTariff) {
      return existingLVTariff;
    }
    
    // Israeli Low Voltage static tariff data
    const israeliLVTariffData = {
      siteId,
      name: 'Israeli LV Tariff',
      provider: 'Israel Electric Corporation',
      importRate: 0.48, // Base static rate in ILS for Low Voltage
      exportRate: 0.23, // Feed-in tariff for solar in ILS
      isTimeOfUse: false,
      currency: 'ILS',
      dataIntervalSeconds: 60
    };
    
    // Create the Israeli LV tariff in the database
    const createdTariff = await storage.createTariff(israeliLVTariffData);
    
    return createdTariff;
  } catch (error) {
    console.error('Error creating Israeli LV tariff data:', error);
    throw error;
  }
};

// Create Israeli HV (High Voltage) static tariff data
export const createIsraeliHVTariffData = async (siteId: number) => {
  try {
    // Check if site already has a tariff
    const existingTariffs = await storage.getTariffs(siteId);
    
    // If Israeli HV tariff already exists, return it
    const existingHVTariff = existingTariffs.find(
      (t) => t.name === 'Israeli HV Tariff' && t.provider === 'Israel Electric Corporation'
    );
    
    if (existingHVTariff) {
      return existingHVTariff;
    }
    
    // Israeli High Voltage static tariff data
    const israeliHVTariffData = {
      siteId,
      name: 'Israeli HV Tariff',
      provider: 'Israel Electric Corporation',
      importRate: 0.43, // Base static rate in ILS for High Voltage
      exportRate: 0.23, // Feed-in tariff for solar in ILS
      isTimeOfUse: false,
      currency: 'ILS',
      dataIntervalSeconds: 60
    };
    
    // Create the Israeli HV tariff in the database
    const createdTariff = await storage.createTariff(israeliHVTariffData);
    
    return createdTariff;
  } catch (error) {
    console.error('Error creating Israeli HV tariff data:', error);
    throw error;
  }
};

// API endpoint to create Israeli tariff
export const createIsraeliTariff = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    const tariffType = req.query.type as string || 'tou'; // Default to TOU if not specified
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    let israeliTariff;
    
    // Create tariff based on requested type
    switch (tariffType.toLowerCase()) {
      case 'lv':
        israeliTariff = await createIsraeliLVTariffData(siteId);
        break;
      case 'hv':
        israeliTariff = await createIsraeliHVTariffData(siteId);
        break;
      case 'tou':
      default:
        israeliTariff = await createIsraeliTariffData(siteId);
        break;
    }
    
    res.status(201).json(israeliTariff);
  } catch (error: any) {
    console.error('Error creating Israeli tariff:', error);
    res.status(500).json({ message: 'Failed to create Israeli tariff', error: error?.message || 'Unknown error' });
  }
};

// Delete a tariff
export const deleteTariff = async (req: Request, res: Response) => {
  try {
    const tariffId = parseInt(req.params.id);
    
    if (isNaN(tariffId)) {
      return res.status(400).json({ message: 'Invalid tariff ID' });
    }
    
    // Check if tariff exists
    const existingTariff = await storage.getTariff(tariffId);
    
    if (!existingTariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    
    // Delete the tariff
    const result = await storage.deleteTariff(tariffId);
    
    if (result) {
      res.status(200).json({ message: 'Tariff deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete tariff' });
    }
  } catch (error: any) {
    console.error('Error deleting tariff:', error);
    res.status(500).json({ message: 'Failed to delete tariff', error: error?.message || 'Unknown error' });
  }
};

// Device-specific tariff operations

// Get the tariff for a specific device
export const getDeviceTariff = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    // Check if device exists
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    // Get the device's tariff (will fallback to site tariff if no device-specific tariff)
    const tariff = await storage.getDeviceTariff(deviceId);
    
    if (!tariff) {
      return res.status(404).json({ message: 'No tariff found for this device or its site' });
    }
    
    // Add info about whether this is a device-specific tariff or site default
    const result = {
      ...tariff,
      isDeviceSpecific: device.tariffId === tariff.id,
      source: device.tariffId === tariff.id ? 'device' : 'site'
    };
    
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching device tariff:', error);
    res.status(500).json({ message: 'Failed to fetch device tariff', error: error?.message || 'Unknown error' });
  }
};

// Assign a specific tariff to a device
export const setDeviceTariff = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const tariffId = parseInt(req.params.tariffId);
    
    if (isNaN(deviceId) || isNaN(tariffId)) {
      return res.status(400).json({ message: 'Invalid device ID or tariff ID' });
    }
    
    // Check if device exists
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    // Check if tariff exists
    const tariff = await storage.getTariff(tariffId);
    
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    
    // Set the device-specific tariff
    const success = await storage.setDeviceTariff(deviceId, tariffId);
    
    if (success) {
      res.status(200).json({ 
        message: 'Device tariff set successfully',
        deviceId,
        tariffId,
        tariffName: tariff.name,
        deviceName: device.name
      });
    } else {
      res.status(500).json({ message: 'Failed to set device tariff' });
    }
  } catch (error: any) {
    console.error('Error setting device tariff:', error);
    res.status(500).json({ message: 'Failed to set device tariff', error: error?.message || 'Unknown error' });
  }
};

// Remove device-specific tariff (revert to site tariff)
export const removeDeviceTariff = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }
    
    // Check if device exists
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    // Check if device actually has a specific tariff
    if (!device.tariffId) {
      return res.status(400).json({ message: 'Device is already using the site default tariff' });
    }
    
    // Remove the device-specific tariff
    const success = await storage.removeDeviceTariff(deviceId);
    
    if (success) {
      // Get the site tariff that will now be used
      const siteTariffs = await storage.getTariffs(device.siteId);
      const siteTariff = siteTariffs.length > 0 ? siteTariffs[0] : null;
      
      res.status(200).json({ 
        message: 'Device-specific tariff removed successfully, now using site tariff',
        deviceId,
        deviceName: device.name,
        siteTariffId: siteTariff?.id,
        siteTariffName: siteTariff?.name
      });
    } else {
      res.status(500).json({ message: 'Failed to remove device-specific tariff' });
    }
  } catch (error: any) {
    console.error('Error removing device tariff:', error);
    res.status(500).json({ message: 'Failed to remove device tariff', error: error?.message || 'Unknown error' });
  }
};