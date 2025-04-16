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
    const interval = req.query.interval as string | undefined;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const forecast = await storage.getLatestEnergyForecast(siteId, interval);
    
    if (!forecast) {
      return res.status(404).json({ message: 'No forecast found for site' });
    }
    
    res.json(forecast);
  } catch (error) {
    console.error('Error fetching latest energy forecast:', error);
    res.status(500).json({ message: 'Failed to fetch latest energy forecast' });
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