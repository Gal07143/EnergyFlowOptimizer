import { broadcastDeviceReading } from './websocketService';
import { storage } from '../storage';
import { DeviceType } from './deviceManagementService';

// Map to store active device simulation intervals
const deviceSimulationIntervals: Map<number, NodeJS.Timeout> = new Map();

// Default simulation interval (in milliseconds)
const DEFAULT_SIMULATION_INTERVAL = 5000; // 5 seconds

// Subscribe to device readings (start simulation for dev mode)
export function subscribeToDevice(deviceId: number): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  // If already simulating, return true
  if (deviceSimulationIntervals.has(deviceId)) {
    return true;
  }

  // Start simulation
  startDeviceSimulation(deviceId);
  return true;
}

// Unsubscribe from device readings (stop simulation)
export function unsubscribeFromDevice(deviceId: number): boolean {
  // If not simulating, return false
  if (!deviceSimulationIntervals.has(deviceId)) {
    return false;
  }

  // Stop simulation
  stopDeviceSimulation(deviceId);
  return true;
}

// Start device simulation
async function startDeviceSimulation(deviceId: number): Promise<void> {
  try {
    // Get the device to determine its type
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      console.warn(`Cannot simulate device ${deviceId}: Device not found`);
      return;
    }
    
    console.log(`Starting simulation for device ${deviceId} (${device.type})`);
    
    // Create interval for simulation
    const interval = setInterval(() => {
      generateAndBroadcastReading(deviceId, device.type as DeviceType);
    }, DEFAULT_SIMULATION_INTERVAL);
    
    // Store the interval
    deviceSimulationIntervals.set(deviceId, interval);
    
    // Generate initial reading immediately
    generateAndBroadcastReading(deviceId, device.type as DeviceType);
  } catch (error) {
    console.error(`Error starting device simulation for device ${deviceId}:`, error);
  }
}

// Stop device simulation
function stopDeviceSimulation(deviceId: number): void {
  const interval = deviceSimulationIntervals.get(deviceId);
  
  if (interval) {
    clearInterval(interval);
    deviceSimulationIntervals.delete(deviceId);
    console.log(`Stopped simulation for device ${deviceId}`);
  }
}

// Generate and broadcast simulated reading
function generateAndBroadcastReading(deviceId: number, deviceType: DeviceType): void {
  try {
    const reading = generateSimulatedReading(deviceId, deviceType);
    broadcastDeviceReading(deviceId, reading);
    
    // Store the reading in the database (optional)
    storage.createDeviceReading({ 
      deviceId, 
      timestamp: new Date(), 
      readings: reading.data 
    }).catch(error => {
      console.error(`Error storing simulated reading for device ${deviceId}:`, error);
    });
  } catch (error) {
    console.error(`Error generating simulated reading for device ${deviceId}:`, error);
  }
}

// Generate simulated reading based on device type
function generateSimulatedReading(deviceId: number, deviceType: DeviceType): any {
  const currentTime = new Date();
  const hour = currentTime.getHours();
  const baseReading = {
    type: 'deviceReading',
    deviceId,
    timestamp: currentTime.toISOString(),
    data: {}
  };
  
  // Add time-based factors (more solar during day, more EV charging at night)
  const isDaytime = hour >= 6 && hour <= 18;
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  const randomFactor = 0.7 + (Math.random() * 0.6); // 0.7-1.3 randomness
  
  switch (deviceType) {
    case 'solar_pv':
      // Solar production depends on time of day
      let solarFactor = 0;
      if (hour >= 6 && hour <= 18) {
        // Bell curve for solar production, peak at noon
        solarFactor = 1 - Math.abs((hour - 12) / 6);
        solarFactor = Math.pow(solarFactor, 2) * randomFactor;
      }
      
      baseReading.data = {
        power: Math.round(5000 * solarFactor * 10) / 10, // 0-5kW
        energy: Math.round(20 * solarFactor * 100) / 100, // 0-20kWh
        voltage: Math.round((230 + (Math.random() * 10 - 5)) * 10) / 10, // ~230V
        temperature: Math.round((25 + (Math.random() * 20 - 10)) * 10) / 10, // 15-35°C
        irradiance: Math.round(1000 * solarFactor * randomFactor),
        panelEfficiency: Math.round((0.18 + (Math.random() * 0.04 - 0.02)) * 1000) / 1000
      };
      break;
      
    case 'battery_storage':
      // Battery typically charges during solar production and discharges at night
      const isCharging = isDaytime && Math.random() > 0.3;
      const powerFactor = isPeakHour ? 0.8 : 0.5;
      const batteryLevel = 20 + Math.random() * 60; // 20-80%
      
      baseReading.data = {
        power: Math.round((isCharging ? 1 : -1) * 3000 * powerFactor * randomFactor),
        energy: Math.round(10 * randomFactor * 100) / 100, // 10kWh capacity
        stateOfCharge: Math.round(batteryLevel * 10) / 10,
        temperature: Math.round((25 + (Math.random() * 10 - 5)) * 10) / 10,
        cycling: Math.floor(Math.random() * 1000),
        efficiency: Math.round((0.92 + (Math.random() * 0.06 - 0.03)) * 100) / 100
      };
      break;
      
    case 'ev_charger':
      // EV typically charges at night or during off-peak hours
      const isEVCharging = Math.random() > (isDaytime && isPeakHour ? 0.8 : 0.4);
      const chargingLevel = isEVCharging ? (0.2 + Math.random() * 0.8) : 0;
      
      baseReading.data = {
        power: Math.round(7400 * chargingLevel * randomFactor),
        energy: Math.round(40 * Math.random() * 100) / 100, // Energy delivered
        voltage: Math.round((230 + (Math.random() * 10 - 5)) * 10) / 10,
        current: Math.round(32 * chargingLevel * randomFactor * 10) / 10,
        chargingState: isEVCharging ? 'charging' : (Math.random() > 0.7 ? 'connected' : 'idle'),
        chargePercentage: Math.round(Math.random() * 100)
      };
      break;
      
    case 'smart_meter':
      // Smart meter shows net consumption, higher during peak hours
      const baseConsumption = isPeakHour ? 3000 : 1500;
      const solarOffset = isDaytime ? Math.random() * 4000 : 0;
      const netPower = baseConsumption - solarOffset;
      
      baseReading.data = {
        power: Math.round(netPower * randomFactor),
        importEnergy: Math.round(30 * randomFactor * 100) / 100,
        exportEnergy: Math.round(20 * (isDaytime ? randomFactor : 0.1) * 100) / 100,
        voltage: Math.round((230 + (Math.random() * 10 - 5)) * 10) / 10,
        current: Math.round(Math.abs(netPower / 230) * 100) / 100,
        frequency: Math.round((50 + (Math.random() * 0.2 - 0.1)) * 100) / 100
      };
      break;
      
    case 'heat_pump':
      // Heat pump usage depends on temperature
      const isHeating = !isDaytime || hour < 10;
      const heatPumpLoad = isHeating ? (0.3 + Math.random() * 0.7) : (Math.random() * 0.3);
      
      baseReading.data = {
        power: Math.round(2000 * heatPumpLoad * randomFactor),
        energy: Math.round(10 * heatPumpLoad * randomFactor * 100) / 100,
        flowTemperature: Math.round((35 + (Math.random() * 10)) * 10) / 10,
        returnTemperature: Math.round((25 + (Math.random() * 8)) * 10) / 10,
        cop: Math.round((3.2 + (Math.random() * 1.5)) * 100) / 100,
        mode: isHeating ? 'heating' : 'idle'
      };
      break;
      
    default:
      // Generic readings for unknown device types
      baseReading.data = {
        power: Math.round(1000 * randomFactor),
        energy: Math.round(5 * randomFactor * 100) / 100,
        status: Math.random() > 0.9 ? 'warning' : 'normal'
      };
  }
  
  return baseReading;
}

// Clean up all active simulations
export function cleanupAllSimulations(): void {
  console.log(`Cleaning up ${deviceSimulationIntervals.size} device simulations`);
  
  for (const [deviceId, interval] of deviceSimulationIntervals) {
    clearInterval(interval);
    console.log(`Stopped simulation for device ${deviceId}`);
  }
  
  deviceSimulationIntervals.clear();
}

// Clean up on process exit
process.on('exit', () => {
  cleanupAllSimulations();
});

// Register other cleanup handlers
process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up device simulations');
  cleanupAllSimulations();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up device simulations');
  cleanupAllSimulations();
  process.exit(0);
});