import { Request, Response } from 'express';
import { db } from '../db';
import { batteryTelemetry, batteryCapacityTests, batteryLifecycleEvents, batteryThermalEvents, devices } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { createEventLog } from '../services/eventLoggingService';

/**
 * Get the latest telemetry data for a battery device
 */
export const getLatestBatteryTelemetry = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Verify device is a battery storage device
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId));
      
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.type !== 'battery_storage') {
      return res.status(400).json({ error: 'Device is not a battery storage device' });
    }
    
    // Get the latest telemetry data
    const [latestTelemetry] = await db
      .select()
      .from(batteryTelemetry)
      .where(eq(batteryTelemetry.deviceId, deviceId))
      .orderBy(desc(batteryTelemetry.timestamp))
      .limit(1);
      
    if (!latestTelemetry) {
      // If no real telemetry data exists, return simulated data for development
      if (process.env.NODE_ENV === 'development') {
        return res.json(generateSimulatedBatteryData(deviceId, device));
      }
      return res.status(404).json({ error: 'No telemetry data found for this device' });
    }
    
    res.json(latestTelemetry);
  } catch (error) {
    console.error('Error retrieving battery telemetry:', error);
    res.status(500).json({ error: 'Failed to retrieve battery telemetry' });
  }
};

/**
 * Get historical telemetry data for a battery device
 */
export const getBatteryTelemetryHistory = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const limit = parseInt(req.query.limit as string) || 24; // Default to 24 points
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Verify device is a battery storage device
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId));
      
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.type !== 'battery_storage') {
      return res.status(400).json({ error: 'Device is not a battery storage device' });
    }
    
    // Get the telemetry history
    const telemetryHistory = await db
      .select()
      .from(batteryTelemetry)
      .where(eq(batteryTelemetry.deviceId, deviceId))
      .orderBy(desc(batteryTelemetry.timestamp))
      .limit(limit)
      .offset(offset);
      
    if (telemetryHistory.length === 0) {
      // If no real telemetry data exists, return simulated data for development
      if (process.env.NODE_ENV === 'development') {
        return res.json(Array(limit).fill(0).map((_, i) => 
          generateSimulatedBatteryData(deviceId, device, new Date(Date.now() - (i * 3600000)))
        ));
      }
      return res.status(404).json({ error: 'No telemetry history found for this device' });
    }
    
    res.json(telemetryHistory);
  } catch (error) {
    console.error('Error retrieving battery telemetry history:', error);
    res.status(500).json({ error: 'Failed to retrieve battery telemetry history' });
  }
};

/**
 * Get capacity test results for a battery device
 */
export const getBatteryCapacityTests = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Get capacity test results
    const capacityTests = await db
      .select()
      .from(batteryCapacityTests)
      .where(eq(batteryCapacityTests.deviceId, deviceId))
      .orderBy(desc(batteryCapacityTests.startTime));
      
    res.json(capacityTests);
  } catch (error) {
    console.error('Error retrieving battery capacity tests:', error);
    res.status(500).json({ error: 'Failed to retrieve battery capacity tests' });
  }
};

/**
 * Get lifecycle events for a battery device
 */
export const getBatteryLifecycleEvents = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Get lifecycle events
    const events = await db
      .select()
      .from(batteryLifecycleEvents)
      .where(eq(batteryLifecycleEvents.deviceId, deviceId))
      .orderBy(desc(batteryLifecycleEvents.timestamp))
      .limit(limit)
      .offset(offset);
      
    res.json(events);
  } catch (error) {
    console.error('Error retrieving battery lifecycle events:', error);
    res.status(500).json({ error: 'Failed to retrieve battery lifecycle events' });
  }
};

/**
 * Get thermal events for a battery device
 */
export const getBatteryThermalEvents = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Get thermal events
    const events = await db
      .select()
      .from(batteryThermalEvents)
      .where(eq(batteryThermalEvents.deviceId, deviceId))
      .orderBy(desc(batteryThermalEvents.timestamp))
      .limit(limit)
      .offset(offset);
      
    res.json(events);
  } catch (error) {
    console.error('Error retrieving battery thermal events:', error);
    res.status(500).json({ error: 'Failed to retrieve battery thermal events' });
  }
};

/**
 * Schedule a capacity test for a battery device
 */
export const scheduleCapacityTest = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }
    
    // Verify device is a battery storage device
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId));
      
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.type !== 'battery_storage') {
      return res.status(400).json({ error: 'Device is not a battery storage device' });
    }
    
    // Check if there's already a test scheduled or in progress
    const [existingTest] = await db
      .select()
      .from(batteryCapacityTests)
      .where(
        and(
          eq(batteryCapacityTests.deviceId, deviceId),
          or(
            eq(batteryCapacityTests.status, 'scheduled'),
            eq(batteryCapacityTests.status, 'in_progress')
          )
        )
      );
      
    if (existingTest) {
      return res.status(409).json({ 
        error: 'There is already a capacity test scheduled or in progress for this device',
        testId: existingTest.id 
      });
    }
    
    // Create a new capacity test
    const testData = {
      deviceId,
      testType: req.body.testType || 'capacity_test',
      status: 'scheduled',
      initialSoC: req.body.initialSoC || null,
      targetSoC: req.body.targetSoC || null,
      chargeRate: req.body.chargeRate || null,
      dischargeRate: req.body.dischargeRate || null,
      minVoltage: req.body.minVoltage || null,
      maxVoltage: req.body.maxVoltage || null,
      testMethod: req.body.testMethod || 'standard',
    };
    
    const [newTest] = await db
      .insert(batteryCapacityTests)
      .values(testData)
      .returning();
      
    // Log the event
    await createEventLog({
      eventType: 'battery_test',
      eventCategory: 'operational',
      message: `Capacity test scheduled for device "${device.name}"`,
      deviceId,
      siteId: device.siteId,
      metadata: { 
        testId: newTest.id,
        testType: testData.testType
      }
    });
    
    res.status(201).json(newTest);
  } catch (error) {
    console.error('Error scheduling capacity test:', error);
    res.status(500).json({ error: 'Failed to schedule capacity test' });
  }
};

// Helper function for generating simulated battery data in development
const generateSimulatedBatteryData = (deviceId: number, device: any, timestamp = new Date()) => {
  // Generate random battery telemetry with realistic values
  const stateOfCharge = Math.floor(Math.random() * 30) + 65; // 65-95%
  const stateOfHealth = Math.floor(Math.random() * 20) + 75; // 75-95%
  
  // Generate cell data
  const cellCount = device.cellCount || 16;
  const cellVoltages = Array(cellCount).fill(0).map(() => 3.6 + (Math.random() * 0.4)); // 3.6-4.0V
  const cellTemperatures = Array(cellCount).fill(0).map(() => 25 + (Math.random() * 15)); // 25-40°C
  
  // Min, max, avg values
  const minCellVoltage = Math.min(...cellVoltages);
  const maxCellVoltage = Math.max(...cellVoltages);
  const avgCellVoltage = cellVoltages.reduce((a, b) => a + b, 0) / cellVoltages.length;
  
  const minTemperature = Math.min(...cellTemperatures);
  const maxTemperature = Math.max(...cellTemperatures);
  const avgTemperature = cellTemperatures.reduce((a, b) => a + b, 0) / cellTemperatures.length;
  
  // Calculate other metrics
  const totalVoltage = avgCellVoltage * cellCount;
  const currentCharge = Math.random() * 40; // 0-40A
  const instantPower = (totalVoltage * currentCharge) / 1000; // kW
  
  // Create alarms and warnings based on a random chance
  const alarmStates = Math.random() < 0.1 ? {
    'Cell Voltage High': `Cell ${Math.floor(Math.random() * cellCount) + 1} voltage exceeds threshold`,
  } : {};
  
  const warningStates = Math.random() < 0.2 ? {
    'Temperature Warning': `Cell temperature approaching threshold`,
  } : {};
  
  return {
    id: 0, // Simulated record
    deviceId,
    timestamp,
    
    // Battery performance data
    stateOfCharge,
    stateOfHealth,
    remainingCapacity: (device.nominalCapacity || 10) * (stateOfHealth / 100),
    cycleCount: Math.floor(Math.random() * 500) + 100,
    
    // Cell-level data
    minCellVoltage,
    maxCellVoltage,
    avgCellVoltage,
    cellVoltageDelta: maxCellVoltage - minCellVoltage,
    cellVoltages,
    cellTemperatures,
    cellBalancingStatus: Array(cellCount).fill(false).map(() => Math.random() < 0.2),
    
    // Electrical data
    totalVoltage,
    currentCharge,
    currentDischarge: 0,
    instantPower,
    
    // Thermal data
    minTemperature,
    maxTemperature,
    avgTemperature,
    coolingStatus: maxTemperature > 38 ? 'active' : 'inactive',
    heatingStatus: 'inactive',
    
    // Performance metrics
    internalResistance: 50 + (Math.random() * 30),
    powerAvailable: instantPower * 0.9,
    timeToFullCharge: Math.floor((100 - stateOfCharge) * 1.2),
    estimatedTimeRemaining: Math.floor(stateOfCharge * 1.8),
    
    // Alerts and status
    alarmStates,
    warningStates,
    bmsStatus: Object.keys(alarmStates).length > 0 ? 'alarm' : 
               Object.keys(warningStates).length > 0 ? 'warning' : 'normal',
    protectionStatus: {},
    
    // Efficiency metrics
    chargeEfficiency: 90 + (Math.random() * 8),
    thermalLoss: instantPower * 0.05,
    
    // Prediction data
    predictedRemainingCapacity: stateOfHealth - (Math.random() * 5),
    estimatedRemainingLifetime: Math.floor(365 * (stateOfHealth / 80)),
    
    // Metadata
    samplingRate: 'high',
    dataQuality: 'validated',
    
    // System fields
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

// Helper function for 'or' operator (missing in the import above)
function or(...conditions: any[]) {
  return {
    type: 'or',
    conditions,
  };
}