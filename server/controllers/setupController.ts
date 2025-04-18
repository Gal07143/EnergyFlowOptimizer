import { Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { users } from '@shared/schema';
import { hashPassword } from '../auth';
import { createDemoDemandResponseData } from './demandResponseController';
import { createIsraeliTariffData } from './tariffController';

/**
 * Create demo admin user
 */
export const createDemoUser = async (req: Request, res: Response) => {
  try {
    // See if user already exists
    const existingUser = await storage.getUserByUsername('admin');
    if (existingUser) {
      return res.status(200).json({
        message: 'Demo user already exists',
        user: {
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }
    
    // Create a password hash directly using the hashPassword utility
    const hashedPassword = await hashPassword('password123');
    
    // Use db directly to insert the user to bypass any potential issues
    const [demoUser] = await db.insert(users)
      .values({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin',
        isEmailVerified: true // Set as verified by default
      })
      .returning();
    
    if (!demoUser) {
      throw new Error('Failed to create demo user');
    }
    
    res.status(201).json({
      message: 'Demo user created successfully',
      user: {
        username: demoUser.username,
        email: demoUser.email,
        role: demoUser.role
      }
    });
  } catch (error: any) {
    console.error('Error creating demo user:', error);
    res.status(500).json({ message: 'Failed to create demo user', error: error?.message || 'Unknown error' });
  }
};

/**
 * Create demo data for initial setup
 */
export const createDemoData = async (req: Request, res: Response) => {
  try {
    // First check if admin user exists
    const existingUser = await storage.getUserByUsername('admin');
    if (!existingUser) {
      // Create the admin user but don't send the response yet
      const hashedPassword = await hashPassword('password123');
      const [demoUser] = await db.insert(users)
        .values({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@example.com',
          role: 'admin',
          isEmailVerified: true
        })
        .returning();
      
      if (!demoUser) {
        throw new Error('Failed to create demo user');
      }
    }
    
    // Create a demo site
    const site = await storage.createSite({
      name: 'Home Site',
      address: '123 Solar Avenue',
      maxCapacity: 20,
      gridConnectionPoint: 11,
      timezone: 'UTC'
    });
    
    // Create demo devices
    const solarPv = await storage.createDevice({
      name: 'Solar PV System',
      type: 'solar_pv',
      model: 'SunPower X-Series',
      manufacturer: 'SunPower',
      serialNumber: 'SP12345678',
      firmwareVersion: '1.2.3',
      capacity: 10.5,
      siteId: site.id,
      settings: {
        orientation: 'south',
        tilt: 30,
        panels: 30,
        inverterType: 'string'
      }
    });
    
    const battery = await storage.createDevice({
      name: 'Battery Storage',
      type: 'battery_storage',
      model: 'Powerwall 2',
      manufacturer: 'Tesla',
      serialNumber: 'TL98765432',
      firmwareVersion: '2.1.0',
      capacity: 13.5,
      status: 'online',
      siteId: site.id,
      settings: {
        maxChargeRate: 5,
        maxDischargeRate: 5,
        minSoC: 10
      }
    });
    
    const evCharger = await storage.createDevice({
      name: 'EV Charger',
      type: 'ev_charger',
      model: 'Wall Connector',
      manufacturer: 'Tesla',
      serialNumber: 'WC56789012',
      firmwareVersion: '1.0.2',
      capacity: 11,
      status: 'online',
      siteId: site.id,
      settings: {
        maxCurrent: 16,
        phases: 3,
        cableType: 'type2'
      }
    });
    
    const smartMeter = await storage.createDevice({
      name: 'Smart Meter',
      type: 'smart_meter',
      model: 'Grid Monitor',
      manufacturer: 'GridCo',
      serialNumber: 'GM12340987',
      firmwareVersion: '3.2.1',
      siteId: site.id,
      status: 'online',
      settings: {
        meterType: 'bidirectional',
        interval: 60
      }
    });
    
    // Create optimization settings
    const optimizationSettings = await storage.createOptimizationSettings({
      siteId: site.id,
      mode: 'self_sufficiency',
      priority: 7,
      peakShavingEnabled: true,
      peakShavingTarget: 5,
      selfConsumptionEnabled: true,
      batteryArbitrageEnabled: false,
      v2gEnabled: false,
      vppEnabled: false,
      p2pEnabled: false,
      aiRecommendationsEnabled: true,
      aiOptimizationEnabled: true,
      aiModel: 'gpt-4o',
      reinforcementLearningEnabled: true, 
      constraints: {
        minBatterySoC: 20,
        reserveCapacity: 10,
        maxGridImport: 10
      },
      demandResponseEnabled: true,
      schedules: {
        batteryCharge: [
          { start: '00:00', end: '06:00', priority: 'high' }
        ],
        batteryDischarge: [
          { start: '17:00', end: '21:00', priority: 'high' }
        ],
        evCharging: [
          { start: '10:00', end: '15:00', priority: 'medium', mode: 'solar_only' }
        ]
      }
    });
    
    // Create tariff
    const tariff = await storage.createTariff({
      siteId: site.id,
      name: 'Standard Tariff',
      provider: 'Energy Co',
      importRate: 0.20,
      exportRate: 0.05,
      isTimeOfUse: false,
      currency: 'USD',
      dataIntervalSeconds: 60
    });
    
    // Create current energy reading
    const energyReading = await storage.createEnergyReading({
      siteId: site.id,
      timestamp: new Date(),
      gridPower: 3.2,
      solarPower: 5.6,
      batteryPower: -2.8,
      evPower: 7.4,
      homePower: 1.6,
      gridEnergy: 12.8,
      solarEnergy: 12.4,
      batteryEnergy: -5.2,
      evEnergy: 11.1,
      homeEnergy: 8.9,
      selfSufficiency: 72,
      carbon: 2.4
    });
    
    // Create device readings
    const solarReading = await storage.createDeviceReading({
      deviceId: solarPv.id,
      timestamp: new Date(),
      power: 5.6,
      energy: 12.4,
      voltage: 230,
      current: 24.3,
      temperature: 42.5,
      stateOfCharge: null,
      frequency: null,
      statusCode: 0,
      operationalMode: 'normal'
    });
    
    const batteryReading = await storage.createDeviceReading({
      deviceId: battery.id,
      timestamp: new Date(),
      power: -2.8,
      energy: -5.2,
      stateOfCharge: 82,
      voltage: 48.2,
      current: 58.1,
      temperature: 32.8,
      frequency: null,
      statusCode: 0,
      operationalMode: 'discharging'
    });
    
    const evReading = await storage.createDeviceReading({
      deviceId: evCharger.id,
      timestamp: new Date(),
      power: 7.4,
      energy: 11.1,
      voltage: 230,
      current: 32.2,
      stateOfCharge: 67,
      frequency: null,
      temperature: null,
      statusCode: 0,
      operationalMode: 'charging'
    });
    
    const meterReading = await storage.createDeviceReading({
      deviceId: smartMeter.id,
      timestamp: new Date(),
      power: 3.2,
      energy: 12.8,
      voltage: 230,
      current: 13.9,
      frequency: 49.9,
      stateOfCharge: null,
      temperature: null,
      statusCode: 0,
      operationalMode: 'metering'
    });
    
    // Create demand response demo data
    const demandResponseData = await createDemoDemandResponseData(site.id);
    
    // Create Israeli tariff data for demo
    const israeliTariffResult = await createIsraeliTariffData(site.id);
    
    res.status(201).json({
      message: 'Demo data created successfully',
      site,
      devices: {
        solarPv,
        battery,
        evCharger,
        smartMeter
      },
      optimizationSettings,
      tariff,
      israeliTariff: israeliTariffResult,
      readings: {
        energy: energyReading,
        solar: solarReading,
        battery: batteryReading,
        ev: evReading,
        meter: meterReading
      },
      demandResponse: demandResponseData
    });
  } catch (error: any) {
    console.error('Error setting up demo data:', error);
    res.status(500).json({ message: 'Failed to set up demo data', error: error?.message || 'Unknown error' });
  }
};