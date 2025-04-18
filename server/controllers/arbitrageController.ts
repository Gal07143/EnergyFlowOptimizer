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
    
    res.json(strategies);
  } catch (error) {
    console.error('Error getting arbitrage strategies:', error);
    res.status(500).json({ error: 'Failed to retrieve arbitrage strategies' });
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
    
    res.json(strategies);
  } catch (error) {
    console.error('Error getting active strategies:', error);
    res.status(500).json({ error: 'Failed to retrieve active strategies' });
  }
}

/**
 * Enable an arbitrage strategy for a site
 */
export async function enableStrategy(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    const { strategy } = req.body;
    if (!strategy) {
      return res.status(400).json({ error: 'Strategy name is required' });
    }
    
    const arbitrageService = getBatteryArbitrageService();
    const success = arbitrageService.enableStrategy(siteId, strategy);
    
    if (success) {
      res.json({ message: `Strategy ${strategy} enabled for site ${siteId}` });
    } else {
      res.status(400).json({ error: `Invalid strategy: ${strategy}` });
    }
  } catch (error) {
    console.error('Error enabling strategy:', error);
    res.status(500).json({ error: 'Failed to enable strategy' });
  }
}

/**
 * Disable an arbitrage strategy for a site
 */
export async function disableStrategy(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    const { strategy } = req.body;
    if (!strategy) {
      return res.status(400).json({ error: 'Strategy name is required' });
    }
    
    const arbitrageService = getBatteryArbitrageService();
    const success = arbitrageService.disableStrategy(siteId, strategy);
    
    if (success) {
      res.json({ message: `Strategy ${strategy} disabled for site ${siteId}` });
    } else {
      res.status(400).json({ error: `Strategy ${strategy} not active for site ${siteId}` });
    }
  } catch (error) {
    console.error('Error disabling strategy:', error);
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
      res.json(result);
    } else {
      res.status(404).json({ error: `No active strategies or batteries found for site ${siteId}` });
    }
  } catch (error) {
    console.error('Error running optimization:', error);
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
    
    res.json(performance);
  } catch (error) {
    console.error('Error getting arbitrage performance:', error);
    res.status(500).json({ error: 'Failed to retrieve arbitrage performance' });
  }
}

/**
 * Get historical prices for a site
 */
export async function getHistoricalPrices(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const priceService = getEnergyPriceService();
    const prices = await priceService.getHistoricalPrices(
      siteId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json(prices);
  } catch (error) {
    console.error('Error getting historical prices:', error);
    res.status(500).json({ error: 'Failed to retrieve historical prices' });
  }
}

/**
 * Get price forecast for a site
 */
export async function getPriceForecast(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    
    const priceService = getEnergyPriceService();
    const forecast = await priceService.getPriceForecast(siteId, hours);
    
    res.json(forecast);
  } catch (error) {
    console.error('Error getting price forecast:', error);
    res.status(500).json({ error: 'Failed to retrieve price forecast' });
  }
}