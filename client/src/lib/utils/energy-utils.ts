import { EnergyReading } from '@/types/energy';

/**
 * Calculate savings from self-generated energy
 * @param reading - Energy reading data
 * @returns Calculated savings amount
 */
export function calculateSavings(reading: EnergyReading): number {
  if (!reading) return 0;
  
  // Simple saving calculation:
  // - Solar energy that was used locally (avoided grid import)
  // - Battery discharge (avoided grid import)
  // Assuming electricity cost of $0.20 per kWh
  
  const electricityRate = 0.20; // $0.20 per kWh
  
  // Calculate solar savings (solar production that wasn't exported)
  let solarSavings = 0;
  if (reading.solarEnergy) {
    solarSavings = Number(reading.solarEnergy) * electricityRate;
  }
  
  // Calculate battery discharge savings
  let batterySavings = 0;
  if (reading.batteryEnergy && Number(reading.batteryEnergy) < 0) {
    // Negative battery energy means discharge (battery to home)
    batterySavings = Math.abs(Number(reading.batteryEnergy)) * electricityRate;
  }
  
  return parseFloat((solarSavings + batterySavings).toFixed(2));
}

/**
 * Calculate carbon emissions avoided by using renewable energy
 * @param solarEnergyProduced - Amount of solar energy produced in kWh
 * @param gridCarbonIntensity - Carbon intensity of grid electricity in kg CO2/kWh
 * @returns Carbon emissions avoided in kg CO2
 */
export function calculateCarbonEmissionsAvoided(
  solarEnergyProduced: number,
  gridCarbonIntensity: number = 0.5 // Default: 0.5 kg CO2 per kWh
): number {
  return solarEnergyProduced * gridCarbonIntensity;
}

/**
 * Calculate self-sufficiency percentage
 * @param totalConsumption - Total energy consumption
 * @param gridImport - Energy imported from the grid
 * @returns Self-sufficiency percentage
 */
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

/**
 * Determine battery charging mode based on energy data
 * @param batteryPower - Battery power flow (positive for charging, negative for discharging)
 * @param solarPower - Solar power generation
 * @param gridPower - Grid power flow (positive for import, negative for export)
 * @returns Charging mode description
 */
export function determineBatteryChargingMode(
  batteryPower: number,
  solarPower: number,
  gridPower: number
): string {
  if (batteryPower > 0) {
    // Battery is charging
    if (solarPower > 0 && solarPower >= batteryPower) {
      return 'Charging from Solar';
    } else if (gridPower > 0) {
      return 'Charging from Grid';
    } else {
      return 'Charging';
    }
  } else if (batteryPower < 0) {
    // Battery is discharging
    return 'Discharging';
  } else {
    // Battery is idle
    return 'Idle';
  }
}

/**
 * Generate forecast data for energy production and consumption
 * @param days - Number of days to forecast
 * @param interval - Interval in hours between data points
 * @returns Array of forecast data points
 */
export function generateForecastData(days: number = 7, interval: number = 1) {
  const data = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  
  for (let day = 0; day < days; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    
    for (let hour = 0; hour < 24; hour += interval) {
      const timestamp = new Date(currentDate);
      timestamp.setHours(hour);
      
      // Generate realistic energy patterns
      // - Solar peaks during midday
      // - Consumption peaks in morning and evening
      // - Battery charges midday, discharges evening
      
      const isDaytime = hour >= 7 && hour <= 19;
      const solarFactor = isDaytime 
        ? Math.sin((hour - 7) * Math.PI / 12) * 0.8 + 0.2 
        : 0;
      
      const solar = isDaytime ? (5 + Math.random() * 2) * solarFactor : 0;
      
      const consumptionBase = 1.2;
      const morningPeak = hour >= 6 && hour <= 9 ? 1.5 + Math.random() * 0.5 : 1;
      const eveningPeak = hour >= 17 && hour <= 22 ? 2 + Math.random() * 1 : 1;
      const consumption = consumptionBase * morningPeak * eveningPeak + Math.random() * 0.5;
      
      let battery = 0;
      if (solar > consumption) {
        // Charging with excess solar
        battery = (solar - consumption) * 0.8;
      } else if (hour >= 18 && hour <= 23) {
        // Discharging in evening
        battery = -Math.min(1.5, Math.random() + 0.8);
      }
      
      // Grid = consumption - solar - battery discharge (or + battery charging)
      const grid = consumption - solar - battery;
      
      data.push({
        timestamp,
        solar: parseFloat(solar.toFixed(2)),
        consumption: parseFloat(consumption.toFixed(2)),
        battery: parseFloat(battery.toFixed(2)),
        grid: parseFloat(grid.toFixed(2)),
      });
    }
  }
  
  return data;
}
