import { Request, Response } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { tariffs } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
    
    // Israeli tariff data with seasonal time-of-use rates
    const israeliTariffData = {
      siteId,
      name: 'Israeli Electricity Tariff',
      provider: 'Israel Electric Corporation',
      importRate: 0.55, // Base rate in ILS
      exportRate: 0.23, // Feed-in tariff for solar in ILS
      isTimeOfUse: true,
      currency: 'ILS',
      dataIntervalSeconds: 60,
      scheduleData: {
        // Summer rates (June-September)
        summer: {
          peak: 0.85,     // Peak: 17:00-22:00
          shoulder: 0.55, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.31   // Off-peak: 23:00-7:00
        },
        // Winter rates (December-February)
        winter: {
          peak: 0.65,     // Peak: 17:00-22:00
          shoulder: 0.48, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.28   // Off-peak: 23:00-7:00
        },
        // Transition seasons (March-May, October-November)
        spring: {
          peak: 0.57,     // Peak: 17:00-22:00
          shoulder: 0.45, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.26   // Off-peak: 23:00-7:00
        },
        autumn: {
          peak: 0.57,     // Peak: 17:00-22:00
          shoulder: 0.45, // Shoulder: 7:00-17:00, 22:00-23:00
          offPeak: 0.26   // Off-peak: 23:00-7:00
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

// API endpoint to create Israeli tariff
export const createIsraeliTariff = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const israeliTariff = await createIsraeliTariffData(siteId);
    
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