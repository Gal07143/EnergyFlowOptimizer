import { storage } from '../storage';
import { OptimizationSetting, Device, EnergyReading } from '@shared/schema';
import { broadcastOptimizationRecommendation } from './websocketService';

// Get optimization settings for a site
export async function getOptimizationSettings(
  siteId: number
): Promise<OptimizationSetting | undefined> {
  return await storage.getOptimizationSettings(siteId);
}

// Update optimization settings for a site
export async function updateOptimizationSettings(
  siteId: number,
  settings: Partial<OptimizationSetting>
): Promise<OptimizationSetting | undefined> {
  const existingSettings = await storage.getOptimizationSettings(siteId);
  
  if (!existingSettings) {
    return undefined;
  }
  
  return await storage.updateOptimizationSettings(existingSettings.id, settings);
}

// Get recommendations based on current energy state
export async function generateOptimizationRecommendations(
  siteId: number
): Promise<any[]> {
  // Get the latest energy reading
  const latestReading = await storage.getLatestEnergyReading(siteId);
  
  if (!latestReading) {
    return [];
  }
  
  // Get optimization settings
  const settings = await storage.getOptimizationSettings(siteId);
  
  if (!settings) {
    return [];
  }
  
  // Get devices for the site
  const devices = await storage.getDevicesBySite(siteId);
  const batteries = devices.filter(d => d.type === 'battery_storage');
  const evChargers = devices.filter(d => d.type === 'ev_charger');
  const solarPv = devices.filter(d => d.type === 'solar_pv');
  
  const recommendations: any[] = [];
  
  // Check for excess solar production
  if (
    latestReading.solarPower && 
    latestReading.gridPower && 
    Number(latestReading.solarPower) > 0 && 
    Number(latestReading.gridPower) < 0 // Negative grid power means exporting
  ) {
    // We have excess solar power being exported to the grid
    
    // Check if we have batteries that aren't fully charged
    for (const battery of batteries) {
      const batteryReadings = await storage.getDeviceReadings(battery.id, 1);
      
      if (
        batteryReadings.length > 0 && 
        batteryReadings[0].stateOfCharge && 
        Number(batteryReadings[0].stateOfCharge) < 100
      ) {
        recommendations.push({
          type: 'battery_charging',
          deviceId: battery.id,
          deviceName: battery.name,
          description: 'Excess solar production detected. Consider charging the battery to 100% before evening peak hours.',
          priority: 'high',
          potentialSavings: calculatePotentialSavings(latestReading, 'battery_charging')
        });
      }
    }
    
    // Check if we have EVs that could be charged
    for (const evCharger of evChargers) {
      const evReadings = await storage.getDeviceReadings(evCharger.id, 1);
      
      if (
        evReadings.length > 0 && 
        evCharger.status === 'online' && 
        evReadings[0].stateOfCharge && 
        Number(evReadings[0].stateOfCharge) < 80
      ) {
        recommendations.push({
          type: 'ev_charging',
          deviceId: evCharger.id,
          deviceName: evCharger.name,
          description: 'Excess solar production detected. Consider charging your EV with clean solar energy.',
          priority: 'medium',
          potentialSavings: calculatePotentialSavings(latestReading, 'ev_charging')
        });
      }
    }
  }
  
  // Check for peak shaving opportunities
  if (
    settings.peakShavingEnabled && 
    latestReading.gridPower && 
    settings.peakShavingTarget && 
    Number(latestReading.gridPower) > Number(settings.peakShavingTarget)
  ) {
    // We're exceeding our peak shaving target
    
    // Check if we have batteries that can be discharged
    for (const battery of batteries) {
      const batteryReadings = await storage.getDeviceReadings(battery.id, 1);
      
      if (
        batteryReadings.length > 0 && 
        batteryReadings[0].stateOfCharge && 
        Number(batteryReadings[0].stateOfCharge) > 20 // Don't discharge below 20%
      ) {
        recommendations.push({
          type: 'peak_shaving',
          deviceId: battery.id,
          deviceName: battery.name,
          description: `Grid consumption exceeding peak target. Discharge battery to reduce grid load.`,
          priority: 'high',
          potentialSavings: calculatePotentialSavings(latestReading, 'peak_shaving')
        });
      }
    }
  }
  
  // Broadcast recommendations to clients
  if (recommendations.length > 0) {
    broadcastOptimizationRecommendation(siteId, recommendations);
  }
  
  return recommendations;
}

// Apply optimization strategy
export async function applyOptimizationStrategy(
  siteId: number,
  strategy: string,
  parameters: any
): Promise<boolean> {
  try {
    // Get devices for the site
    const devices = await storage.getDevicesBySite(siteId);
    
    switch (strategy) {
      case 'battery_charging':
        // Find battery device
        const battery = devices.find(d => d.id === parameters.deviceId && d.type === 'battery_storage');
        
        if (!battery) {
          console.error(`Battery device with ID ${parameters.deviceId} not found`);
          return false;
        }
        
        // Implementation would interact with actual battery control system
        console.log(`Setting battery ${battery.name} to charge mode`);
        return true;
        
      case 'ev_charging':
        // Find EV charger device
        const evCharger = devices.find(d => d.id === parameters.deviceId && d.type === 'ev_charger');
        
        if (!evCharger) {
          console.error(`EV charger with ID ${parameters.deviceId} not found`);
          return false;
        }
        
        // Implementation would interact with actual EV charger
        console.log(`Setting EV charger ${evCharger.name} to solar only mode`);
        return true;
        
      case 'peak_shaving':
        // Implementation for peak shaving
        console.log(`Applying peak shaving strategy`);
        return true;
        
      default:
        console.error(`Unknown optimization strategy: ${strategy}`);
        return false;
    }
  } catch (error) {
    console.error('Error applying optimization strategy:', error);
    return false;
  }
}

// Helper function to calculate potential savings
function calculatePotentialSavings(
  reading: EnergyReading,
  strategyType: string
): { amount: number; currency: string } {
  // This is a simplified calculation
  // In a real system, you would use tariff data and more sophisticated algorithms
  
  let savingsAmount = 0;
  
  switch (strategyType) {
    case 'battery_charging':
      // Assuming $0.20 per kWh saved by using solar instead of grid
      savingsAmount = Number(reading.solarPower) * 0.2;
      break;
      
    case 'ev_charging':
      // Assuming $0.20 per kWh saved by using solar instead of grid
      savingsAmount = Number(reading.solarPower) * 0.15;
      break;
      
    case 'peak_shaving':
      // Assuming $0.30 per kWh saved during peak hours
      savingsAmount = Number(reading.gridPower) * 0.3;
      break;
  }
  
  return {
    amount: parseFloat(savingsAmount.toFixed(2)),
    currency: 'USD'
  };
}
