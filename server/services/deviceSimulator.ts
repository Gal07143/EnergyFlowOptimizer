import { simulateDeviceReading } from './websocketService';
import { storage } from '../storage';

// Time between simulated readings in milliseconds
const SIMULATION_INTERVAL = 10000; // 10 seconds

// Map to store simulation interval IDs by deviceId
const simulationIntervals: Map<number, NodeJS.Timeout> = new Map();

// Map to track active device subscriptions
const activeDeviceSubscriptions: Map<number, number> = new Map();

/**
 * Increment the subscription count for a device
 * @param deviceId The device ID to subscribe to
 */
export function subscribeToDevice(deviceId: number): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Increment subscription count
  const currentCount = activeDeviceSubscriptions.get(deviceId) || 0;
  activeDeviceSubscriptions.set(deviceId, currentCount + 1);

  // Start simulation if this is the first subscription
  if (currentCount === 0) {
    startDeviceSimulation(deviceId);
  }
}

/**
 * Decrement the subscription count for a device
 * @param deviceId The device ID to unsubscribe from
 */
export function unsubscribeFromDevice(deviceId: number): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Get current subscription count
  const currentCount = activeDeviceSubscriptions.get(deviceId) || 0;
  
  if (currentCount <= 1) {
    // This was the last subscription, stop simulation
    activeDeviceSubscriptions.delete(deviceId);
    stopDeviceSimulation(deviceId);
  } else {
    // Decrement subscription count
    activeDeviceSubscriptions.set(deviceId, currentCount - 1);
  }
}

/**
 * Start simulating device readings
 * @param deviceId The device ID to simulate readings for
 */
async function startDeviceSimulation(deviceId: number): Promise<void> {
  if (simulationIntervals.has(deviceId)) {
    // Simulation already running
    return;
  }

  try {
    // Get device details to determine type
    const device = await storage.getDevice(deviceId);
    
    if (!device) {
      console.log(`Cannot simulate readings for device ${deviceId}: Device not found`);
      return;
    }

    console.log(`Starting simulation for device ${deviceId} (${device.type})`);

    // Send initial reading immediately
    simulateDeviceReading(deviceId, device.type);

    // Set up interval for periodic readings
    const intervalId = setInterval(() => {
      simulateDeviceReading(deviceId, device.type);
    }, SIMULATION_INTERVAL);

    // Store interval ID for later cleanup
    simulationIntervals.set(deviceId, intervalId);
  } catch (error) {
    console.error(`Error starting device simulation for device ${deviceId}:`, error);
  }
}

/**
 * Stop simulating device readings
 * @param deviceId The device ID to stop simulating readings for
 */
function stopDeviceSimulation(deviceId: number): void {
  const intervalId = simulationIntervals.get(deviceId);
  
  if (intervalId) {
    console.log(`Stopping simulation for device ${deviceId}`);
    clearInterval(intervalId);
    simulationIntervals.delete(deviceId);
  }
}

/**
 * Clean up all simulations on service shutdown
 */
export function cleanupAllSimulations(): void {
  console.log(`Cleaning up ${simulationIntervals.size} device simulations`);
  
  for (const [deviceId, intervalId] of simulationIntervals.entries()) {
    clearInterval(intervalId);
  }
  
  simulationIntervals.clear();
  activeDeviceSubscriptions.clear();
}

// Handle process shutdown
process.on('SIGINT', cleanupAllSimulations);
process.on('SIGTERM', cleanupAllSimulations);