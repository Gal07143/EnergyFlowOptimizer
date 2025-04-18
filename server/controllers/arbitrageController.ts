import { Request, Response } from 'express';
import { getBatteryArbitrageService } from '../services/batteryArbitrageService';
import { getEnergyPriceService } from '../services/energyPriceService';

/**
 * Get all available arbitrage strategies
 */
export async function getArbitrageStrategies(req: Request, res: Response) {
  try {
    const arbitrageService = getBatteryArbitrageService();
    const strategies = arbitrageService.getAvailableStrategies();
    res.status(200).json(strategies);
  } catch (error) {
    console.error('Error fetching arbitrage strategies:', error);
    res.status(500).json({ error: 'Failed to fetch arbitrage strategies' });
  }
}

/**
 * Get active arbitrage strategies for a site
 */
export async function getActiveStrategies(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    const arbitrageService = getBatteryArbitrageService();
    const strategies = arbitrageService.getActiveStrategies(siteId);
    res.status(200).json(strategies);
  } catch (error) {
    console.error(`Error fetching active strategies for site ${req.params.siteId}:`, error);
    res.status(500).json({ error: 'Failed to fetch active strategies' });
  }
}

/**
 * Enable an arbitrage strategy for a site
 */
export async function enableStrategy(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const { strategy } = req.body;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    if (!strategy) {
      return res.status(400).json({ error: 'Strategy name is required' });
    }

    const arbitrageService = getBatteryArbitrageService();
    const success = arbitrageService.enableStrategy(siteId, strategy);
    
    if (success) {
      res.status(200).json({ success: true, message: `Strategy '${strategy}' enabled for site ${siteId}` });
    } else {
      res.status(400).json({ success: false, error: 'Invalid strategy or already enabled' });
    }
  } catch (error) {
    console.error(`Error enabling strategy for site ${req.params.siteId}:`, error);
    res.status(500).json({ error: 'Failed to enable strategy' });
  }
}

/**
 * Disable an arbitrage strategy for a site
 */
export async function disableStrategy(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const { strategy } = req.body;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    if (!strategy) {
      return res.status(400).json({ error: 'Strategy name is required' });
    }

    const arbitrageService = getBatteryArbitrageService();
    const success = arbitrageService.disableStrategy(siteId, strategy);
    
    if (success) {
      res.status(200).json({ success: true, message: `Strategy '${strategy}' disabled for site ${siteId}` });
    } else {
      res.status(400).json({ success: false, error: 'Strategy not found or already disabled' });
    }
  } catch (error) {
    console.error(`Error disabling strategy for site ${req.params.siteId}:`, error);
    res.status(500).json({ error: 'Failed to disable strategy' });
  }
}

/**
 * Run optimization for a site
 */
export async function runOptimization(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    const arbitrageService = getBatteryArbitrageService();
    const result = await arbitrageService.optimizeSite(siteId);
    
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: 'Optimization failed. No active strategies or batteries found for this site.' });
    }
  } catch (error) {
    console.error(`Error running optimization for site ${req.params.siteId}:`, error);
    res.status(500).json({ error: 'Failed to run optimization' });
  }
}

/**
 * Get arbitrage performance for a site
 */
export async function getArbitragePerformance(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }

    const arbitrageService = getBatteryArbitrageService();
    const performance = arbitrageService.getArbitragePerformance(siteId);
    res.status(200).json(performance);
  } catch (error) {
    console.error(`Error fetching arbitrage performance for site ${req.params.siteId}:`, error);
    res.status(500).json({ error: 'Failed to fetch arbitrage performance' });
  }
}

/**
 * Get historical prices for a site
 */
export async function getHistoricalPrices(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(); // Default to now
    
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const priceService = getEnergyPriceService();
    const prices = await priceService.getHistoricalPrices(siteId, startDate, endDate);
    res.status(200).json(prices);
  } catch (error) {
    console.error(`Error fetching historical prices for site ${req.params.siteId}:`, error);
    res.status(500).json({ error: 'Failed to fetch historical prices' });
  }
}

/**
 * Get price forecast for a site
 */
export async function getPriceForecast(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24; // Default to 24 hours
    
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    if (isNaN(hours) || hours <= 0 || hours > 72) {
      return res.status(400).json({ error: 'Hours must be between 1 and 72' });
    }

    const priceService = getEnergyPriceService();
    const forecast = await priceService.getPriceForecast(siteId, hours);
    res.status(200).json(forecast);
  } catch (error) {
    console.error(`Error fetching price forecast for site ${req.params.siteId}:`, error);
    res.status(500).json({ error: 'Failed to fetch price forecast' });
  }
}