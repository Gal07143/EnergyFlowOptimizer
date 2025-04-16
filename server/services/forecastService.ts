import { storage } from '../storage';
import { EnergyReading, InsertEnergyForecast, EnergyForecast } from '@shared/schema';

// Types for forecast intervals
type ForecastInterval = '1h' | '6h' | '24h' | '7d' | '30d';

/**
 * Generate an energy forecast for a site
 * 
 * @param siteId The site ID to generate a forecast for
 * @param interval The time interval for the forecast
 * @returns The generated energy forecast
 */
export async function generateEnergyForecast(
  siteId: number, 
  interval: string = '24h'
): Promise<EnergyForecast> {
  try {
    // Get duration in hours based on interval
    const durationHours = getForecastDurationHours(interval as ForecastInterval);
    
    // Get historical data to base forecast on
    let readings: EnergyReading[] = [];
    try {
      readings = await storage.getEnergyReadings(siteId, 48); // Last 48 readings
    } catch (error) {
      console.warn(`Failed to get readings for site ${siteId}, using empty set:`, error);
      // Proceed with empty readings
    }
    
    // Get site devices to factor into forecast
    let devices: any[] = [];
    try {
      devices = await storage.getDevicesBySite(siteId);
    } catch (error) {
      console.warn(`Failed to get devices for site ${siteId}, using default devices:`, error);
      // Proceed with default device assumptions
    }
    
    // Calculate the forecast using available data and devices
    // Even if no historical data, we'll generate a basic forecast based on device capabilities
    const forecast = calculateForecast(readings || [], devices || [], durationHours);
    
    console.log("Generated forecast with data:", 
      `Site ID: ${siteId}, `, 
      `Readings count: ${readings?.length || 0}, `,
      `Devices count: ${devices?.length || 0}, `,
      `Interval: ${interval}, `,
      `Duration: ${durationHours}h`);
    
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
  } catch (error: any) {
    console.error(`Failed to generate forecast for site ${siteId}:`, error);
    throw new Error(`Failed to generate forecast: ${error?.message || 'Unknown error'}`);
  }
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
    
    // Calculate daily patterns from the energy readings
    // For these calculations, we'll use the energy reading fields that are available
    // Map the reading properties to our forecast properties
    const hourlyPatterns = {
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
    for (const reading of recentReadings) {
      if (!reading.timestamp) continue;
      
      const hour = new Date(reading.timestamp).getHours();
      counts[hour]++;
      
      // Map reading properties to forecast properties
      hourlyPatterns.consumption[hour] += Number(reading.homePower || 0);
      hourlyPatterns.production[hour] += Number(reading.solarPower || 0);
      hourlyPatterns.gridImport[hour] += Number(reading.gridPower || 0) > 0 ? Number(reading.gridPower || 0) : 0;
      hourlyPatterns.gridExport[hour] += Number(reading.gridPower || 0) < 0 ? -Number(reading.gridPower || 0) : 0;
      hourlyPatterns.batteryCharge[hour] += Number(reading.batteryPower || 0) < 0 ? -Number(reading.batteryPower || 0) : 0;
      hourlyPatterns.batteryDischarge[hour] += Number(reading.batteryPower || 0) > 0 ? Number(reading.batteryPower || 0) : 0;
    }
    
    // Calculate hourly averages
    for (let i = 0; i < 24; i++) {
      if (counts[i] > 0) {
        hourlyPatterns.consumption[i] /= counts[i];
        hourlyPatterns.production[i] /= counts[i];
        hourlyPatterns.gridImport[i] /= counts[i];
        hourlyPatterns.gridExport[i] /= counts[i];
        hourlyPatterns.batteryCharge[i] /= counts[i];
        hourlyPatterns.batteryDischarge[i] /= counts[i];
      }
    }
    
    // Apply patterns to forecast future values
    for (let i = 0; i < durationHours; i++) {
      const hour = new Date(data.timestamps[i]).getHours();
      
      // Apply pattern with some randomness for more realistic forecasts
      const randomFactor = 0.9 + Math.random() * 0.2; // Random factor between 0.9 and 1.1
      
      data.consumption[i] = hourlyPatterns.consumption[hour] * randomFactor;
      data.production[i] = hourlyPatterns.production[hour] * randomFactor;
      data.gridImport[i] = hourlyPatterns.gridImport[hour] * randomFactor;
      data.gridExport[i] = hourlyPatterns.gridExport[hour] * randomFactor;
      data.batteryCharge[i] = hourlyPatterns.batteryCharge[hour] * randomFactor;
      data.batteryDischarge[i] = hourlyPatterns.batteryDischarge[hour] * randomFactor;
    }
    
    // Adjust forecast based on device capabilities and state
    adjustForecastWithDeviceData(data, devices);
  } else {
    // If we don't have enough data, use a simplified model
    generateSimplifiedForecast(data, devices, durationHours);
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
 * Adjust forecast based on device capabilities and state
 */
function adjustForecastWithDeviceData(
  data: Record<string, number[]>,
  devices: any[]
): void {
  // Find solar panels to adjust production forecast
  const solarPanels = devices.filter(device => device.type === 'solar_pv');
  const totalCapacity = solarPanels.reduce((sum, panel) => sum + (Number(panel.capacity) || 0), 0);
  
  // Find batteries to adjust charge/discharge forecast
  const batteries = devices.filter(device => device.type === 'battery');
  const totalBatteryCapacity = batteries.reduce((sum, battery) => sum + (Number(battery.capacity) || 0), 0);
  
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
  devices: any[],
  durationHours: number
): void {
  // Use device capabilities to create a baseline
  // If we have no devices, we'll use default values for a typical home
  
  // For solar panels, use capacity from devices if available, or default to 5kW
  const solarPanels = devices.filter(device => device.type === 'solar_pv');
  const totalSolarCapacity = solarPanels.length > 0 
    ? solarPanels.reduce((sum, panel) => sum + (Number(panel.capacity) || 0), 0)
    : 5.0; // Default to 5kW solar if no panels
  
  // For batteries, use capacity from devices if available, or default to 10kWh
  const batteries = devices.filter(device => device.type === 'battery');
  const totalBatteryCapacity = batteries.length > 0
    ? batteries.reduce((sum, battery) => sum + (Number(battery.capacity) || 0), 0)
    : 10.0; // Default to 10kWh battery if no batteries
  
  // For EV chargers, use capacity from devices if available, or default to 7.4kW
  const evChargers = devices.filter(device => device.type === 'ev_charger');
  const totalChargerCapacity = evChargers.length > 0
    ? evChargers.reduce((sum, charger) => sum + (Number(charger.capacity) || 0), 0)
    : 7.4; // Default to 7.4kW EV charger if no chargers
  
  // Baseline consumption (average household ~1kW with some appliances)
  const baseConsumption = 1 + Math.random(); // 1-2 kW
  
  // Apply time-of-day variations
  for (let i = 0; i < durationHours; i++) {
    const date = new Date(data.timestamps[i]);
    const hour = date.getHours();
    
    // Higher consumption in morning and evening
    const consumptionFactor = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 22) ? 1.5 : 1.0;
    
    // Higher production during daylight hours
    const productionFactor = (hour >= 8 && hour <= 16) ? 1.0 : (hour >= 6 && hour <= 18) ? 0.7 : 0.0;
    
    // Apply factors with some randomness
    const randomFactor = 0.9 + Math.random() * 0.2;
    
    data.consumption[i] = baseConsumption * consumptionFactor * randomFactor;
    
    // Solar production based on capacity and time of day
    if (totalSolarCapacity > 0) {
      data.production[i] = totalSolarCapacity * productionFactor * randomFactor * 0.7; // ~70% efficiency
    } else {
      data.production[i] = 0;
    }
    
    // Basic energy balance calculations
    const netEnergy = data.production[i] - data.consumption[i];
    
    if (netEnergy > 0 && totalBatteryCapacity > 0) {
      // We have excess energy - store in battery or export
      data.batteryCharge[i] = Math.min(netEnergy, totalBatteryCapacity * 0.2); // Charge at 20% of capacity max
      data.batteryDischarge[i] = 0;
      data.gridExport[i] = Math.max(0, netEnergy - data.batteryCharge[i]);
      data.gridImport[i] = 0;
    } else {
      // We need more energy - use battery or import
      data.batteryCharge[i] = 0;
      
      if (totalBatteryCapacity > 0) {
        data.batteryDischarge[i] = Math.min(-netEnergy, totalBatteryCapacity * 0.3); // Discharge at 30% of capacity max
      } else {
        data.batteryDischarge[i] = 0;
      }
      
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
  interval?: string
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
  if (latestForecast && latestForecast.timestamp &&
     (new Date().getTime() - new Date(latestForecast.timestamp).getTime() < 60 * 60 * 1000)) {
    return latestForecast;
  }
  
  // Generate a new forecast
  return await generateEnergyForecast(siteId, interval);
}