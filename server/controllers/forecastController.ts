import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertEnergyForecastSchema } from '@shared/schema';
import * as forecastService from '../services/forecastService';

/**
 * Get energy forecasts for a site
 */
export async function getEnergyForecasts(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
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
    const forecastType = req.params.forecastType;
    const forecasts = await storage.getEnergyForecastsByType(siteId, forecastType);
    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching energy forecasts by type:', error);
    res.status(500).json({ message: 'Failed to fetch energy forecasts by type' });
  }
}

/**
 * Get latest energy forecast for a site
 */
export async function getLatestEnergyForecast(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const interval = req.query.interval as string | undefined;
    
    const forecast = await storage.getLatestEnergyForecast(siteId, interval);
    
    if (!forecast) {
      res.status(404).json({ message: 'Energy forecast not found' });
      return;
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
    const validatedData = insertEnergyForecastSchema.parse(req.body);
    const forecast = await storage.createEnergyForecast(validatedData);
    res.status(201).json(forecast);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid forecast data', errors: error.errors });
    } else {
      console.error('Error creating energy forecast:', error);
      res.status(500).json({ message: 'Failed to create energy forecast' });
    }
  }
}

/**
 * Generate an energy forecast for a site
 */
export async function generateEnergyForecast(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const interval = (req.query.interval as forecastService.ForecastInterval) || '24h';
    
    // Validate interval
    const validIntervals = ['1h', '6h', '24h', '7d', '30d'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ 
        message: 'Invalid interval', 
        validIntervals 
      });
    }
    
    // Generate or get recent forecast
    const forecast = await forecastService.getOrCreateForecast(siteId, interval);
    res.json(forecast);
  } catch (error) {
    console.error('Error generating energy forecast:', error);
    res.status(500).json({ 
      message: 'Failed to generate energy forecast',
      error: error.message
    });
  }
}