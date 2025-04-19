/**
 * Tariff Optimization Controller
 * 
 * This controller handles the requests for tariff-based optimization,
 * particularly focusing on Israeli tariff-specific optimizations.
 */

import { Request, Response } from 'express';
import { storage } from '../storage';
import { getTariffInfoForSite, generateTariffBasedRecommendations } from '../utils/tariffOptimizationUtils';
import { getAIOptimizationService } from '../services/aiOptimizationService';
import { OptimizationResult } from '../services/aiOptimizationService';

/**
 * Run tariff-aware optimization for a site
 */
export const optimizeBySiteTariff = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Get site devices
    const devices = await storage.getDevicesBySite(siteId);
    
    if (!devices || devices.length === 0) {
      return res.status(404).json({ message: 'No devices found for this site' });
    }
    
    // Get tariff information
    const tariffInfo = await getTariffInfoForSite(siteId);
    
    if (!tariffInfo) {
      return res.status(404).json({ message: 'No tariff found for this site' });
    }
    
    // Generate optimization recommendations
    const optimizationResult = await generateTariffBasedRecommendations(
      siteId,
      devices,
      req.body.batteryStateOfCharge
    );
    
    // Combine with site and tariff info in the response
    res.json({
      ...optimizationResult,
      siteId,
      timestamp: new Date().toISOString(),
      tariff: {
        name: tariffInfo.name,
        provider: tariffInfo.provider,
        currentRate: tariffInfo.currentRate,
        currentPeriod: tariffInfo.currentPeriod,
        currency: tariffInfo.currency,
        isIsraeliTariff: tariffInfo.isIsraeliTariff
      }
    });
  } catch (error: unknown) {
    console.error('Error optimizing by site tariff:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to optimize by site tariff', error: errorMessage });
  }
};

/**
 * Run AI optimization with enhanced tariff awareness
 */
export const runAIOptimizationWithTariff = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Get tariff information
    const tariffInfo = await getTariffInfoForSite(siteId);
    
    if (!tariffInfo) {
      return res.status(404).json({ message: 'No tariff found for this site' });
    }
    
    // Get the AI optimization service
    const aiOptimizationService = getAIOptimizationService();
    
    // Set optimization config
    aiOptimizationService.setOptimizationConfig({
      siteId,
      mode: req.body.mode || 'cost_saving',
      enableRealTimeControl: req.body.enableRealTimeControl !== undefined ? req.body.enableRealTimeControl : false,
      lookAheadHours: req.body.lookAheadHours || 24,
      preferredDevices: req.body.preferredDevices,
      constraints: {
        ...req.body.constraints,
        tariff: {
          isIsraeliTariff: tariffInfo.isIsraeliTariff,
          isTimeOfUse: tariffInfo.isTimeOfUse,
          currentRate: tariffInfo.currentRate,
          currentPeriod: tariffInfo.currentPeriod
        }
      }
    });
    
    // Run optimization with AI
    const optimizationResult = await aiOptimizationService.optimizeSite(siteId);
    
    if (!optimizationResult) {
      return res.status(500).json({ message: 'Failed to generate optimization' });
    }
    
    // Return the result with tariff info
    res.json({
      ...optimizationResult,
      tariff: {
        name: tariffInfo.name,
        provider: tariffInfo.provider,
        currentRate: tariffInfo.currentRate,
        currentPeriod: tariffInfo.currentPeriod,
        currency: tariffInfo.currency,
        isIsraeliTariff: tariffInfo.isIsraeliTariff
      }
    });
  } catch (error: unknown) {
    console.error('Error running AI optimization with tariff:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to run AI optimization with tariff', error: errorMessage });
  }
};

/**
 * Get a summary of tariff-specific optimization potential for a site
 */
export const getTariffOptimizationSummary = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Get site devices
    const devices = await storage.getDevicesBySite(siteId);
    
    if (!devices || devices.length === 0) {
      return res.status(404).json({ message: 'No devices found for this site' });
    }
    
    // Get tariff information
    const tariffInfo = await getTariffInfoForSite(siteId);
    
    if (!tariffInfo) {
      return res.status(404).json({ message: 'No tariff found for this site' });
    }
    
    // Analyze optimization potential
    const summary = {
      siteId,
      tariffName: tariffInfo.name,
      isIsraeliTariff: tariffInfo.isIsraeliTariff,
      isTimeOfUse: tariffInfo.isTimeOfUse,
      currentRate: tariffInfo.currentRate,
      currentPeriod: tariffInfo.currentPeriod,
      currency: tariffInfo.currency,
      optimizationPotential: {
        batteryArbitrage: false,
        evSmartCharging: false,
        heatPumpOptimization: false,
        estimatedMonthlySavings: 0
      },
      devices: {
        hasBattery: false,
        hasEVCharger: false,
        hasHeatPump: false,
        hasSolar: false
      }
    };
    
    // Check available devices
    let hasBattery = false;
    let hasEVCharger = false;
    let hasHeatPump = false;
    let hasSolar = false;
    
    for (const device of devices) {
      const deviceType = device.type;
      if (deviceType === 'battery_storage') {
        hasBattery = true;
      } else if (deviceType === 'ev_charger') {
        hasEVCharger = true;
      } else if (deviceType === 'heat_pump') {
        hasHeatPump = true;
      } else if (deviceType === 'solar_pv') {
        hasSolar = true;
      }
    }
    
    summary.devices = {
      hasBattery,
      hasEVCharger,
      hasHeatPump,
      hasSolar
    };
    
    // Analyze optimization potential based on tariff and devices
    if (tariffInfo.isTimeOfUse) {
      // Calculate rate differentials
      const scheduleData = tariffInfo.scheduleData;
      
      if (scheduleData) {
        // Get current season
        const month = new Date().getMonth() + 1;
        let currentSeason;
        
        if (month >= 6 && month <= 9) {
          currentSeason = 'summer';
        } else if (month >= 10 && month <= 11) {
          currentSeason = 'autumn';
        } else if (month >= 3 && month <= 5) {
          currentSeason = 'spring';
        } else {
          currentSeason = 'winter';
        }
        
        const seasonRates = scheduleData[currentSeason];
        if (seasonRates) {
          const peakRate = seasonRates.peak;
          const offPeakRate = seasonRates.offPeak;
          const rateDifferential = peakRate - offPeakRate;
          
          // Israeli tariffs have particularly large differentials
          const isLargeDifferential = rateDifferential > 0.3; // More than 0.3 ILS difference
          
          if (hasBattery && isLargeDifferential) {
            summary.optimizationPotential.batteryArbitrage = true;
            summary.optimizationPotential.estimatedMonthlySavings += hasBattery ? 
              estimateBatteryArbitrageSavings(peakRate, offPeakRate, tariffInfo.isIsraeliTariff) : 0;
          }
          
          if (hasEVCharger && isLargeDifferential) {
            summary.optimizationPotential.evSmartCharging = true;
            summary.optimizationPotential.estimatedMonthlySavings += hasEVCharger ? 
              estimateEVChargingSavings(peakRate, offPeakRate, tariffInfo.isIsraeliTariff) : 0;
          }
          
          if (hasHeatPump && isLargeDifferential) {
            summary.optimizationPotential.heatPumpOptimization = true;
            summary.optimizationPotential.estimatedMonthlySavings += hasHeatPump ? 
              estimateHeatPumpSavings(peakRate, offPeakRate, tariffInfo.isIsraeliTariff) : 0;
          }
        }
      }
    }
    
    res.json(summary);
  } catch (error: unknown) {
    console.error('Error getting tariff optimization summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to get tariff optimization summary', error: errorMessage });
  }
};

/**
 * Apply a specific tariff-based optimization strategy
 */
export const applyTariffStrategy = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    const strategy = req.params.strategy; // e.g., 'battery-arbitrage', 'ev-smart-charging', etc.
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Get site devices
    const devices = await storage.getDevicesBySite(siteId);
    
    if (!devices || devices.length === 0) {
      return res.status(404).json({ message: 'No devices found for this site' });
    }
    
    // Generate and apply strategy-specific recommendations
    const aiOptimizationService = getAIOptimizationService();
    let result: OptimizationResult | null = null;
    
    switch (strategy) {
      case 'battery-arbitrage':
        // Set optimization config focused on cost savings with battery
        aiOptimizationService.setOptimizationConfig({
          siteId,
          mode: 'cost_saving',
          enableRealTimeControl: true,
          lookAheadHours: 24,
          preferredDevices: devices
            .filter(d => d.type === 'battery_storage')
            .map(d => d.id.toString())
        });
        
        // Run optimization
        result = await aiOptimizationService.optimizeSite(siteId);
        break;
        
      case 'ev-smart-charging':
        // Set optimization config focused on EV charging
        aiOptimizationService.setOptimizationConfig({
          siteId,
          mode: 'cost_saving',
          enableRealTimeControl: true,
          lookAheadHours: 24,
          preferredDevices: devices
            .filter(d => d.type === 'ev_charger')
            .map(d => d.id.toString())
        });
        
        // Run optimization
        result = await aiOptimizationService.optimizeSite(siteId);
        break;
        
      case 'heat-pump-optimization':
        // Set optimization config focused on heat pump
        aiOptimizationService.setOptimizationConfig({
          siteId,
          mode: 'cost_saving',
          enableRealTimeControl: true,
          lookAheadHours: 24,
          preferredDevices: devices
            .filter(d => d.type === 'heat_pump')
            .map(d => d.id.toString())
        });
        
        // Run optimization
        result = await aiOptimizationService.optimizeSite(siteId);
        break;
        
      case 'israeli-tou':
        // Special optimization for Israeli Time-of-Use strategy
        const tariffInfo = await getTariffInfoForSite(siteId);
        
        if (!tariffInfo || !tariffInfo.isIsraeliTariff || !tariffInfo.isTimeOfUse) {
          return res.status(400).json({ 
            message: 'Israeli Time-of-Use tariff not configured for this site' 
          });
        }
        
        // Set optimization config with Israeli ToU constraints
        aiOptimizationService.setOptimizationConfig({
          siteId,
          mode: 'cost_saving',
          enableRealTimeControl: true,
          lookAheadHours: 24,
          constraints: {
            tariff: {
              isIsraeliTariff: true,
              isTimeOfUse: true,
              currentRate: tariffInfo.currentRate,
              currentPeriod: tariffInfo.currentPeriod
            },
            israeliTariffStrategy: true
          }
        });
        
        // Run optimization
        result = await aiOptimizationService.optimizeSite(siteId);
        break;
        
      default:
        return res.status(400).json({ message: 'Unknown tariff strategy' });
    }
    
    if (!result) {
      return res.status(500).json({ message: 'Failed to generate optimization' });
    }
    
    res.json(result);
  } catch (error: unknown) {
    console.error('Error applying tariff strategy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to apply tariff strategy', error: errorMessage });
  }
};

// Helper functions for estimating savings
function estimateBatteryArbitrageSavings(peakRate: number, offPeakRate: number, isIsraeliTariff: boolean): number {
  // Assuming 10 kWh daily arbitrage with 85% efficiency
  const batteryCapacity = 10;
  const roundTripEfficiency = 0.85;
  const dailyArbitrageCycles = 1;
  const daysPerMonth = 30;
  
  const savingsPerCycle = batteryCapacity * (peakRate - (offPeakRate / roundTripEfficiency));
  const monthlySavings = savingsPerCycle * dailyArbitrageCycles * daysPerMonth;
  
  // Israeli tariffs have larger peak-to-offpeak differentials, especially in summer
  return isIsraeliTariff ? monthlySavings * 1.2 : monthlySavings;
}

function estimateEVChargingSavings(peakRate: number, offPeakRate: number, isIsraeliTariff: boolean): number {
  // Assuming 50 kWh per charge, 3 charges per week
  const evBatterySize = 50;
  const chargesPerWeek = 3;
  const weeksPerMonth = 4.3;
  
  const savingsPerCharge = evBatterySize * (peakRate - offPeakRate);
  const monthlySavings = savingsPerCharge * chargesPerWeek * weeksPerMonth;
  
  return isIsraeliTariff ? monthlySavings * 1.1 : monthlySavings;
}

function estimateHeatPumpSavings(peakRate: number, offPeakRate: number, isIsraeliTariff: boolean): number {
  // Assuming 15 kWh daily usage that can be shifted
  const dailyConsumption = 15;
  const shiftablePercentage = 0.6;
  const daysPerMonth = 30;
  
  const shiftableConsumption = dailyConsumption * shiftablePercentage;
  const savingsPerDay = shiftableConsumption * (peakRate - offPeakRate);
  const monthlySavings = savingsPerDay * daysPerMonth;
  
  return isIsraeliTariff ? monthlySavings * 1.15 : monthlySavings;
}