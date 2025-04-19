import { Request, Response } from "express";
import { db } from "../db";
import {
  batteryTelemetry,
  batteryCapacityTests,
  batteryLifecycleEvents,
  batteryThermalEvents,
  devices,
} from "@shared/schema";
import { eq, and, desc, sql, or as sqlOr } from "drizzle-orm";

/**
 * Get the latest telemetry data for a battery device
 */
export const getLatestBatteryTelemetry = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: "Invalid device ID" });
    }
    
    // Check if device exists and is a battery storage device
    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.id, deviceId),
        eq(devices.type, "battery_storage")
      ),
    });
    
    if (!device) {
      return res.status(404).json({ error: "Battery device not found" });
    }
    
    // Get the latest telemetry record
    const telemetry = await db.query.batteryTelemetry.findFirst({
      where: eq(batteryTelemetry.deviceId, deviceId),
      orderBy: [desc(batteryTelemetry.timestamp)],
    });
    
    if (!telemetry) {
      return res.status(404).json({ error: "No telemetry data found for this device" });
    }
    
    return res.status(200).json(telemetry);
  } catch (error) {
    console.error("Error fetching battery telemetry:", error);
    return res.status(500).json({ error: "Failed to fetch battery telemetry data" });
  }
};

/**
 * Get historical telemetry data for a battery device
 */
export const getBatteryTelemetryHistory = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const startDate = req.query.startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to one week ago
    const endDate = req.query.endDate as string || new Date().toISOString(); // Default to now
    const limit = parseInt(req.query.limit as string) || 100; // Default to 100 records
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: "Invalid device ID" });
    }
    
    // Check if device exists and is a battery storage device
    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.id, deviceId),
        eq(devices.type, "battery_storage")
      ),
    });
    
    if (!device) {
      return res.status(404).json({ error: "Battery device not found" });
    }
    
    // Get historical telemetry records in date range
    const telemetryHistory = await db.query.batteryTelemetry.findMany({
      where: and(
        eq(batteryTelemetry.deviceId, deviceId),
        sql`timestamp >= ${startDate}`,
        sql`timestamp <= ${endDate}`
      ),
      orderBy: [desc(batteryTelemetry.timestamp)],
      limit: limit,
    });
    
    return res.status(200).json(telemetryHistory);
  } catch (error) {
    console.error("Error fetching battery telemetry history:", error);
    return res.status(500).json({ error: "Failed to fetch battery telemetry history" });
  }
};

/**
 * Get capacity test results for a battery device
 */
export const getBatteryCapacityTests = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const limit = parseInt(req.query.limit as string) || 10; // Default to 10 records
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: "Invalid device ID" });
    }
    
    // Check if device exists and is a battery storage device
    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.id, deviceId),
        eq(devices.type, "battery_storage")
      ),
    });
    
    if (!device) {
      return res.status(404).json({ error: "Battery device not found" });
    }
    
    // Get capacity test records
    const capacityTests = await db.query.batteryCapacityTests.findMany({
      where: eq(batteryCapacityTests.deviceId, deviceId),
      orderBy: [desc(batteryCapacityTests.startTime)],
      limit: limit,
    });
    
    return res.status(200).json(capacityTests);
  } catch (error) {
    console.error("Error fetching capacity tests:", error);
    return res.status(500).json({ error: "Failed to fetch battery capacity test data" });
  }
};

/**
 * Get lifecycle events for a battery device
 */
export const getBatteryLifecycleEvents = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const eventType = req.query.eventType as string;
    const limit = parseInt(req.query.limit as string) || 20; // Default to 20 records
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: "Invalid device ID" });
    }
    
    // Check if device exists and is a battery storage device
    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.id, deviceId),
        eq(devices.type, "battery_storage")
      ),
    });
    
    if (!device) {
      return res.status(404).json({ error: "Battery device not found" });
    }
    
    // Prepare query conditions
    let conditions = [eq(batteryLifecycleEvents.deviceId, deviceId)];
    
    if (eventType) {
      conditions.push(eq(batteryLifecycleEvents.eventType, eventType));
    }
    
    // Get lifecycle event records
    const lifecycleEvents = await db.query.batteryLifecycleEvents.findMany({
      where: and(...conditions),
      orderBy: [desc(batteryLifecycleEvents.timestamp)],
      limit: limit,
    });
    
    return res.status(200).json(lifecycleEvents);
  } catch (error) {
    console.error("Error fetching lifecycle events:", error);
    return res.status(500).json({ error: "Failed to fetch battery lifecycle events" });
  }
};

/**
 * Get thermal events for a battery device
 */
export const getBatteryThermalEvents = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const severity = req.query.severity as string;
    const limit = parseInt(req.query.limit as string) || 20; // Default to 20 records
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: "Invalid device ID" });
    }
    
    // Check if device exists and is a battery storage device
    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.id, deviceId),
        eq(devices.type, "battery_storage")
      ),
    });
    
    if (!device) {
      return res.status(404).json({ error: "Battery device not found" });
    }
    
    // Prepare query conditions
    let conditions = [eq(batteryThermalEvents.deviceId, deviceId)];
    
    if (severity) {
      conditions.push(eq(batteryThermalEvents.severity, severity));
    }
    
    // Get thermal event records
    const thermalEvents = await db.query.batteryThermalEvents.findMany({
      where: and(...conditions),
      orderBy: [desc(batteryThermalEvents.timestamp)],
      limit: limit,
    });
    
    return res.status(200).json(thermalEvents);
  } catch (error) {
    console.error("Error fetching thermal events:", error);
    return res.status(500).json({ error: "Failed to fetch battery thermal events" });
  }
};

/**
 * Schedule a capacity test for a battery device
 */
export const scheduleCapacityTest = async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const { testType, initialSoC, targetSoC, chargeRate, dischargeRate, minVoltage, maxVoltage, testMethod } = req.body;
    
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: "Invalid device ID" });
    }
    
    // Check if device exists and is a battery storage device
    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.id, deviceId),
        eq(devices.type, "battery_storage")
      ),
    });
    
    if (!device) {
      return res.status(404).json({ error: "Battery device not found" });
    }
    
    // Create a new capacity test record with status "scheduled"
    const newTest = await db.insert(batteryCapacityTests).values({
      deviceId,
      testType,
      status: "scheduled",
      initialSoC,
      targetSoC,
      chargeRate,
      dischargeRate,
      minVoltage,
      maxVoltage,
      testMethod,
    }).returning();
    
    return res.status(201).json({ 
      message: "Capacity test scheduled successfully", 
      testId: newTest[0].id 
    });
  } catch (error) {
    console.error("Error scheduling capacity test:", error);
    return res.status(500).json({ error: "Failed to schedule capacity test" });
  }
};

function or(...conditions: any[]) {
  return {
    type: "or", 
    conditions 
  };
}