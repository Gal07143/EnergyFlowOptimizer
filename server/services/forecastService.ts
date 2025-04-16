import { storage } from '../storage';
import { DeviceReading, EnergyReading, EnergyForecast, InsertEnergyForecast } from '@shared/schema';

// Time intervals for forecasting
export type ForecastInterval = '1h' | '6h' | '24h' | '7d' | '30d';

/**
 * Generate energy forecasts for a site
 * 
 * @param siteId The site ID to generate forecasts for
 * @param interval The time interval to forecast
 * @returns The generated energy forecast
 */
export async function generateEnergyForecast(siteId: number, interval: ForecastInterval): Promise<EnergyForecast> {
  // Get historical energy readings to use as a basis for forecasting
  const readings = await storage.getEnergyReadings(siteId, 100);
  
  // Get devices at the site
  const devices = await storage.getDevicesBySite(siteId);
  
  // Get the latest reading as a starting point
  const latestReading = await storage.getLatestEnergyReading(siteId);
  
  if (!latestReading || readings.length < 24) {
    throw new Error('Insufficient historical data for forecasting');
  }
  
  // Define forecast duration in hours
  const durationHours = getForecastDurationHours(interval);
  
  // Calculate the forecast using time series analysis and device capabilities
  const forecast = calculateForecast(readings, devices, durationHours);
  
  // Save the forecast to the database
  const newForecast: InsertEnergyForecast = {
    siteId,
    forecastDate: new Date(Date.now() + durationHours * 60 * 60 * 1000),
    forecastType: 'generation', // Using the existing enum value that's closest to 'energy'
    value: forecast.data.production.reduce((sum, val) => sum + val, 0), // Summarized value
    confidence: forecast.accuracy,
    algorithm: 'time-series-analysis',
    metadata: {
      forecastInterval: interval,
      data: forecast.data,
      factors: forecast.factors
    }
  };
  
  return await storage.createEnergyForecast(newForecast);
}

/**
 * Get forecast duration in hours based on interval
 */
function getForecastDurationHours(interval: ForecastInterval): number {
  switch (interval) {
    case '1h': return 1;
    case '6h': return 6;
    case '24h': return 24;
    case '7d': return 24 * 7;
    case '30d': return 24 * 30;
    default: return 24;
  }
}

/**
 * Calculate forecast based on historical data and devices
 */
function calculateForecast(
  readings: EnergyReading[], 
  devices: any[], 
  durationHours: number
): { 
  data: Record<string, number[]>, 
  accuracy: number, 
  factors: string[] 
} {
  // Start with empty data structure
  const data: Record<string, number[]> = {
    timestamps: [],
    consumption: [],
    production: [],
    gridImport: [],
    gridExport: [],
    batteryCharge: [],
    batteryDischarge: []
  };
  
  // Current timestamp
  const now = new Date();
  
  // Generate timestamps for the forecast period
  for (let i = 0; i < durationHours; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    data.timestamps.push(timestamp.getTime());
  }
  
  // If we have enough historical data, use time series forecasting
  if (readings.length >= 24) {
    // Get patterns from historical data (last 24 hours)
    const recentReadings = readings.slice(0, 24);
    
    // Calculate daily patterns
    const hourlyPatterns = calculateHourlyPatterns(recentReadings);
    
    // Apply patterns to forecast future values
    applyPatternsToForecast(data, hourlyPatterns, durationHours);
    
    // Adjust forecast based on device capabilities and state
    adjustForecastWithDeviceData(data, devices);
  } else {
    // If we don't have enough data, use a simplified model
    generateSimplifiedForecast(data, readings, durationHours);
  }
  
  // Calculate forecast accuracy (mock value for now)
  // In a real system, this would be based on comparing previous forecasts with actual values
  const accuracy = 0.85; // 85% accuracy
  
  // Factors that influenced the forecast
  const factors = [
    'Historical energy usage patterns',
    'Time of day',
    'Day of week',
    'Device capabilities and state'
  ];
  
  return { data, accuracy, factors };
}

/**
 * Calculate hourly patterns from historical data
 */
function calculateHourlyPatterns(readings: EnergyReading[]): Record<string, number[]> {
  const patterns: Record<string, number[]> = {
    consumption: new Array(24).fill(0),
    production: new Array(24).fill(0),
    gridImport: new Array(24).fill(0),
    gridExport: new Array(24).fill(0),
    batteryCharge: new Array(24).fill(0),
    batteryDischarge: new Array(24).fill(0)
  };
  
  // Count readings per hour for averaging
  const counts = new Array(24).fill(0);
  
  // Aggregate readings by hour
  for (const reading of readings) {
    const hour = new Date(reading.timestamp).getHours();
    counts[hour]++;
    
    patterns.consumption[hour] += reading.consumption || 0;
    patterns.production[hour] += reading.production || 0;
    patterns.gridImport[hour] += reading.gridImport || 0;
    patterns.gridExport[hour] += reading.gridExport || 0;
    patterns.batteryCharge[hour] += reading.batteryCharge || 0;
    patterns.batteryDischarge[hour] += reading.batteryDischarge || 0;
  }
  
  // Calculate hourly averages
  for (let i = 0; i < 24; i++) {
    if (counts[i] > 0) {
      patterns.consumption[i] /= counts[i];
      patterns.production[i] /= counts[i];
      patterns.gridImport[i] /= counts[i];
      patterns.gridExport[i] /= counts[i];
      patterns.batteryCharge[i] /= counts[i];
      patterns.batteryDischarge[i] /= counts[i];
    }
  }
  
  return patterns;
}

/**
 * Apply hourly patterns to forecast data
 */
function applyPatternsToForecast(
  data: Record<string, number[]>,
  patterns: Record<string, number[]>,
  durationHours: number
): void {
  for (let i = 0; i < durationHours; i++) {
    const hour = new Date(data.timestamps[i]).getHours();
    
    // Apply pattern with some randomness for more realistic forecasts
    const randomFactor = 0.9 + Math.random() * 0.2; // Random factor between 0.9 and 1.1
    
    data.consumption[i] = patterns.consumption[hour] * randomFactor;
    data.production[i] = patterns.production[hour] * randomFactor;
    data.gridImport[i] = patterns.gridImport[hour] * randomFactor;
    data.gridExport[i] = patterns.gridExport[hour] * randomFactor;
    data.batteryCharge[i] = patterns.batteryCharge[hour] * randomFactor;
    data.batteryDischarge[i] = patterns.batteryDischarge[hour] * randomFactor;
  }
}

/**
 * Adjust forecast based on device capabilities and state
 */
function adjustForecastWithDeviceData(
  data: Record<string, number[]>,
  devices: any[]
): void {
  // Find solar panels to adjust production forecast
  const solarPanels = devices.filter(device => device.type === 'solar_pv');
  const totalCapacity = solarPanels.reduce((sum, panel) => sum + (panel.capacity || 0), 0);
  
  // Find batteries to adjust charge/discharge forecast
  const batteries = devices.filter(device => device.type === 'battery');
  const totalBatteryCapacity = batteries.reduce((sum, battery) => sum + (battery.capacity || 0), 0);
  
  // Adjust solar production based on time of day
  for (let i = 0; i < data.timestamps.length; i++) {
    const date = new Date(data.timestamps[i]);
    const hour = date.getHours();
    
    // Adjust solar production based on daylight hours
    if (hour >= 6 && hour <= 18) {
      // Peak sunlight hours are around noon
      const solarFactor = 1 - Math.abs(hour - 12) / 6;
      data.production[i] = Math.max(data.production[i], totalCapacity * solarFactor * 0.7);
    } else {
      // No solar production at night
      data.production[i] = 0;
    }
    
    // Logic for battery charge/discharge
    // Charge when production > consumption, discharge when consumption > production
    if (data.production[i] > data.consumption[i] && totalBatteryCapacity > 0) {
      data.batteryCharge[i] = Math.min(data.production[i] - data.consumption[i], totalBatteryCapacity * 0.3);
      data.batteryDischarge[i] = 0;
    } else if (data.consumption[i] > data.production[i] && totalBatteryCapacity > 0) {
      data.batteryDischarge[i] = Math.min(data.consumption[i] - data.production[i], totalBatteryCapacity * 0.3);
      data.batteryCharge[i] = 0;
    }
    
    // Adjust grid import/export
    const netEnergy = data.production[i] + data.batteryDischarge[i] - data.consumption[i] - data.batteryCharge[i];
    if (netEnergy > 0) {
      data.gridExport[i] = netEnergy;
      data.gridImport[i] = 0;
    } else {
      data.gridImport[i] = -netEnergy;
      data.gridExport[i] = 0;
    }
  }
}

/**
 * Generate a simplified forecast when we don't have enough historical data
 */
function generateSimplifiedForecast(
  data: Record<string, number[]>,
  readings: EnergyReading[],
  durationHours: number
): void {
  // Use the available readings to create a simple baseline
  const baseConsumption = readings.reduce((sum, r) => sum + (r.consumption || 0), 0) / readings.length;
  const baseProduction = readings.reduce((sum, r) => sum + (r.production || 0), 0) / readings.length;
  const baseGridImport = readings.reduce((sum, r) => sum + (r.gridImport || 0), 0) / readings.length;
  const baseGridExport = readings.reduce((sum, r) => sum + (r.gridExport || 0), 0) / readings.length;
  const baseBatteryCharge = readings.reduce((sum, r) => sum + (r.batteryCharge || 0), 0) / readings.length;
  const baseBatteryDischarge = readings.reduce((sum, r) => sum + (r.batteryDischarge || 0), 0) / readings.length;
  
  // Apply simple time-of-day variations
  for (let i = 0; i < durationHours; i++) {
    const date = new Date(data.timestamps[i]);
    const hour = date.getHours();
    
    // Higher consumption in morning and evening
    const consumptionFactor = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 22) ? 1.5 : 1.0;
    
    // Higher production during daylight hours
    const productionFactor = (hour >= 8 && hour <= 16) ? 1.5 : (hour >= 6 && hour <= 18) ? 1.0 : 0.1;
    
    // Apply factors with some randomness
    const randomFactor = 0.9 + Math.random() * 0.2;
    
    data.consumption[i] = baseConsumption * consumptionFactor * randomFactor;
    data.production[i] = baseProduction * productionFactor * randomFactor;
    
    // Basic energy balance calculations
    const netEnergy = data.production[i] - data.consumption[i];
    
    if (netEnergy > 0) {
      // We have excess energy - store in battery or export
      data.batteryCharge[i] = baseBatteryCharge * randomFactor;
      data.batteryDischarge[i] = 0;
      data.gridExport[i] = Math.max(0, netEnergy - data.batteryCharge[i]);
      data.gridImport[i] = 0;
    } else {
      // We need more energy - use battery or import
      data.batteryCharge[i] = 0;
      data.batteryDischarge[i] = baseBatteryDischarge * randomFactor;
      data.gridImport[i] = Math.max(0, -netEnergy - data.batteryDischarge[i]);
      data.gridExport[i] = 0;
    }
  }
}

/**
 * Get energy forecasts for a site
 * 
 * @param siteId The site ID to get forecasts for
 * @returns The energy forecasts
 */
export async function getEnergyForecasts(siteId: number): Promise<EnergyForecast[]> {
  return await storage.getEnergyForecasts(siteId);
}

/**
 * Get the latest energy forecast for a site
 * 
 * @param siteId The site ID to get the forecast for
 * @param interval Optional time interval
 * @returns The latest energy forecast
 */
export async function getLatestEnergyForecast(
  siteId: number, 
  interval?: ForecastInterval
): Promise<EnergyForecast | undefined> {
  return await storage.getLatestEnergyForecast(siteId, interval);
}

/**
 * Generate or retrieve forecast for a site
 * If a recent forecast exists, return it, otherwise generate a new one
 */
export async function getOrCreateForecast(
  siteId: number, 
  interval: ForecastInterval
): Promise<EnergyForecast> {
  // Try to get the latest forecast
  const latestForecast = await storage.getLatestEnergyForecast(siteId, interval);
  
  // Check if the forecast is recent enough (less than 1 hour old)
  if (latestForecast && 
     (new Date().getTime() - new Date(latestForecast.timestamp).getTime() < 60 * 60 * 1000)) {
    return latestForecast;
  }
  
  // Generate a new forecast
  return await generateEnergyForecast(siteId, interval);
}