import { storage } from '../storage';
import { EnergyReading, InsertEnergyReading } from '@shared/schema';
import { broadcastEnergyReading } from './websocketService';

// Get all energy readings for a site with limit
export async function getEnergyReadings(
  siteId: number,
  limit: number = 100
): Promise<EnergyReading[]> {
  return await storage.getEnergyReadings(siteId, limit);
}

// Get latest energy reading for a site
export async function getLatestEnergyReading(
  siteId: number
): Promise<EnergyReading | undefined> {
  return await storage.getLatestEnergyReading(siteId);
}

// Get energy readings for a time range
export async function getEnergyReadingsByTimeRange(
  siteId: number,
  startTime: Date,
  endTime: Date
): Promise<EnergyReading[]> {
  return await storage.getEnergyReadingsByTimeRange(siteId, startTime, endTime);
}

// Create a new energy reading and broadcast it
export async function createEnergyReading(
  reading: InsertEnergyReading
): Promise<EnergyReading> {
  const newReading = await storage.createEnergyReading(reading);
  
  // Broadcast the new reading to subscribed clients
  broadcastEnergyReading(reading.siteId, newReading);
  
  return newReading;
}

// Calculate self-sufficiency percentage
export function calculateSelfSufficiency(
  totalConsumption: number,
  gridImport: number
): number {
  if (totalConsumption <= 0) {
    return 0;
  }
  
  const selfConsumed = totalConsumption - gridImport;
  return Math.min(100, Math.max(0, (selfConsumed / totalConsumption) * 100));
}

// Calculate cost savings
export async function calculateCostSavings(
  siteId: number,
  timeRange: { start: Date; end: Date }
): Promise<{ savings: number; currency: string }> {
  // Get the site's tariff information
  const tariffs = await storage.getTariffs(siteId);
  
  if (tariffs.length === 0) {
    return { savings: 0, currency: 'USD' };
  }
  
  const tariff = tariffs[0]; // Use the first tariff
  
  // Get energy readings for the time range
  const readings = await storage.getEnergyReadingsByTimeRange(
    siteId,
    timeRange.start,
    timeRange.end
  );
  
  if (readings.length === 0) {
    return { savings: 0, currency: tariff.currency };
  }
  
  // Calculate savings based on self-generated energy (avoided grid imports)
  let totalSavings = 0;
  
  for (const reading of readings) {
    // If we have solar energy, calculate how much grid import was avoided
    if (reading.solarEnergy) {
      // Assuming all solar energy that wasn't exported was used locally
      // This is a simplification - in a real system, you'd need more detailed data
      const avoidedGridImport = Number(reading.solarEnergy);
      
      // Calculate savings based on import rate
      totalSavings += avoidedGridImport * Number(tariff.importRate);
    }
    
    // If we have battery discharge, that also represents avoided grid imports
    if (reading.batteryEnergy && Number(reading.batteryEnergy) < 0) {
      // Negative battery energy means discharge
      const batteryDischarge = Math.abs(Number(reading.batteryEnergy));
      totalSavings += batteryDischarge * Number(tariff.importRate);
    }
  }
  
  return { 
    savings: parseFloat(totalSavings.toFixed(2)), 
    currency: tariff.currency 
  };
}

// Calculate carbon emissions avoided
export function calculateCarbonEmissionsAvoided(
  solarEnergyProduced: number,
  gridCarbonIntensity: number = 0.5 // Default: 0.5 kg CO2 per kWh
): number {
  return solarEnergyProduced * gridCarbonIntensity;
}

// Aggregate energy data for reporting
export async function aggregateEnergyData(
  siteId: number,
  timeRange: { start: Date; end: Date },
  interval: 'hour' | 'day' | 'week' | 'month'
): Promise<any[]> {
  // Get all readings for the time range
  const readings = await storage.getEnergyReadingsByTimeRange(
    siteId,
    timeRange.start,
    timeRange.end
  );
  
  // Group readings by interval
  const aggregatedData: any[] = [];
  
  // This is a simplified implementation - a real one would use SQL aggregations
  // or more sophisticated time-series grouping
  
  // For simplicity, we'll just group by day in this example
  const dateGroups = new Map<string, EnergyReading[]>();
  
  for (const reading of readings) {
    const date = new Date(reading.timestamp);
    let key: string;
    
    switch (interval) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        break;
      case 'week':
        // Get the week number
        const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
        key = `${date.getFullYear()}-${date.getMonth() + 1}-W${weekNumber}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        break;
    }
    
    if (!dateGroups.has(key)) {
      dateGroups.set(key, []);
    }
    
    dateGroups.get(key)?.push(reading);
  }
  
  // Calculate aggregates for each group
  for (const [key, groupReadings] of dateGroups.entries()) {
    // Calculate sums and averages
    let totalGridEnergy = 0;
    let totalSolarEnergy = 0;
    let totalBatteryEnergy = 0;
    let totalEvEnergy = 0;
    let totalHomeEnergy = 0;
    
    for (const reading of groupReadings) {
      totalGridEnergy += Number(reading.gridEnergy || 0);
      totalSolarEnergy += Number(reading.solarEnergy || 0);
      totalBatteryEnergy += Number(reading.batteryEnergy || 0);
      totalEvEnergy += Number(reading.evEnergy || 0);
      totalHomeEnergy += Number(reading.homeEnergy || 0);
    }
    
    // Calculate self-sufficiency
    const totalConsumption = totalHomeEnergy + totalEvEnergy;
    const selfSufficiency = calculateSelfSufficiency(totalConsumption, totalGridEnergy);
    
    aggregatedData.push({
      period: key,
      gridEnergy: parseFloat(totalGridEnergy.toFixed(2)),
      solarEnergy: parseFloat(totalSolarEnergy.toFixed(2)),
      batteryEnergy: parseFloat(totalBatteryEnergy.toFixed(2)),
      evEnergy: parseFloat(totalEvEnergy.toFixed(2)),
      homeEnergy: parseFloat(totalHomeEnergy.toFixed(2)),
      selfSufficiency: parseFloat(selfSufficiency.toFixed(2)),
      readingCount: groupReadings.length
    });
  }
  
  return aggregatedData;
}
