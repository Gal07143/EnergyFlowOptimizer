import { Request, Response } from 'express';
import { storage } from '../storage';
import { 
  insertEnergyForecastSchema, 
  InsertEnergyForecast 
} from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import * as forecastService from '../services/forecastService';

// Import ForecastInterval type from service
type ForecastInterval = '1h' | '6h' | '24h' | '7d' | '30d';

/**
 * Get energy forecasts for a site
 */
export async function getEnergyForecasts(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const forecasts = await storage.getEnergyForecasts(siteId);
    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching energy forecasts:', error);
    res.status(500).json({ message: 'Failed to fetch energy forecasts' });
  }
}

/**
 * Get energy forecasts by type for a site
 */
export async function getEnergyForecastsByType(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const { forecastType } = req.params;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    if (!forecastType) {
      return res.status(400).json({ message: 'Forecast type is required' });
    }
    
    const forecasts = await storage.getEnergyForecastsByType(siteId, forecastType);
    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching energy forecasts by type:', error);
    res.status(500).json({ message: 'Failed to fetch energy forecasts' });
  }
}

/**
 * Get latest energy forecast for a site
 */
export async function getLatestEnergyForecast(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const interval = (req.query.interval as ForecastInterval) || '24h';
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    try {
      // Try to get existing forecast first
      let forecast = await storage.getLatestEnergyForecast(siteId, interval);
      
      // If no forecast exists, generate one
      if (!forecast) {
        console.log(`No forecast found for site ${siteId}, generating a new one...`);
        
        // Create a default forecast for this site
        forecast = await forecastService.generateEnergyForecast(siteId, interval);
        
        if (!forecast) {
          throw new Error("Could not generate forecast");
        }
      }
      
      return res.json(forecast);
    } catch (innerError) {
      console.error(`Inner error handling forecast for site ${siteId}:`, innerError);
      
      // Create a simplified baseline forecast as fallback
      const durationHours = 24; // Default to 24 hours
      
      // Generate a very basic forecast with predictable patterns
      const now = new Date();
      const data: Record<string, number[]> = {
        timestamps: [],
        consumption: [],
        production: [],
        gridImport: [],
        gridExport: [],
        batteryCharge: [],
        batteryDischarge: []
      };
      
      // Generate timestamps and baseline data
      for (let i = 0; i < durationHours; i++) {
        const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
        const hour = timestamp.getHours();
        
        // Add timestamp
        data.timestamps.push(timestamp.getTime());
        
        // Add consumption (higher in morning and evening)
        const isHighUsage = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 22);
        data.consumption.push(isHighUsage ? 2.5 : 1.5);
        
        // Add production (only during daylight hours)
        const isDaylight = hour >= 6 && hour <= 18;
        const solarFactor = isDaylight ? 1 - Math.abs(hour - 12) / 6 : 0;
        data.production.push(5 * solarFactor * 0.7); // 5kW system at 70% efficiency
        
        // Simple grid and battery logic
        const netEnergy = data.production[i] - data.consumption[i];
        if (netEnergy > 0) {
          data.batteryCharge.push(Math.min(netEnergy, 2)); // Up to 2kW battery charging
          data.batteryDischarge.push(0);
          data.gridExport.push(Math.max(0, netEnergy - data.batteryCharge[i]));
          data.gridImport.push(0);
        } else {
          data.batteryCharge.push(0);
          data.batteryDischarge.push(Math.min(-netEnergy, 3)); // Up to 3kW discharge
          data.gridImport.push(Math.max(0, -netEnergy - data.batteryDischarge[i]));
          data.gridExport.push(0);
        }
      }
      
      // Create a forecast object
      const newForecast: InsertEnergyForecast = {
        siteId,
        forecastDate: new Date(Date.now() + durationHours * 60 * 60 * 1000),
        forecastType: 'generation',
        value: data.production.reduce((sum, val) => sum + val, 0),
        confidence: 0.7,
        algorithm: 'backup-baseline',
        metadata: {
          forecastInterval: interval,
          data: data,
          factors: ['Time of day', 'Default consumption patterns', 'Fallback data']
        }
      };
      
      console.log("Created fallback forecast due to error");
      
      // Save the fallback forecast to the database
      const savedForecast = await storage.createEnergyForecast(newForecast);
      
      return res.json(savedForecast);
    }
  } catch (error) {
    console.error('Error in forecast controller:', error);
    res.status(500).json({ message: 'Failed to process energy forecast request' });
  }
}

/**
 * Create a new energy forecast
 */
export async function createEnergyForecast(req: Request, res: Response) {
  try {
    // Validate request body
    const forecastData = insertEnergyForecastSchema.parse(req.body);
    
    // Create forecast
    const forecast = await storage.createEnergyForecast(forecastData);
    
    res.status(201).json(forecast);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    
    console.error('Error creating energy forecast:', error);
    res.status(500).json({ message: 'Failed to create energy forecast' });
  }
}

/**
 * Generate an energy forecast for a site
 */
export async function generateEnergyForecast(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const interval = (req.query.interval as string) || '24h';
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Check if site exists
    const site = await storage.getSite(siteId);
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }
    
    // Generate forecast
    const forecast = await forecastService.generateEnergyForecast(siteId, interval);
    
    res.status(201).json(forecast);
  } catch (error) {
    console.error('Error generating energy forecast:', error);
    res.status(500).json({ message: 'Failed to generate energy forecast' });
  }
}