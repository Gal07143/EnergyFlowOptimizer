import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from 'ws';
import { initWebSocketServer } from './services/websocketService';
import { setupAuth } from './auth';

// Import controllers
import * as deviceController from './controllers/deviceController';
import * as energyController from './controllers/energyController';
import * as optimizationController from './controllers/optimizationController';
import * as authController from './controllers/authController';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = initWebSocketServer(httpServer);
  
  // Setup authentication
  setupAuth(app);
  
  // API routes
  
  // Email verification routes
  app.post('/api/verify-email', authController.verifyEmail);
  app.post('/api/resend-verification', authController.resendVerificationCode);
  app.get('/api/email-verification-status', authController.checkEmailVerification);
  
  // Site routes
  app.get('/api/sites', async (req, res) => {
    try {
      const sites = await storage.getSites();
      res.json(sites);
    } catch (error) {
      console.error('Error fetching sites:', error);
      res.status(500).json({ message: 'Failed to fetch sites' });
    }
  });
  
  app.get('/api/sites/:id', async (req, res) => {
    try {
      const siteId = parseInt(req.params.id);
      const site = await storage.getSite(siteId);
      
      if (!site) {
        return res.status(404).json({ message: 'Site not found' });
      }
      
      res.json(site);
    } catch (error) {
      console.error('Error fetching site:', error);
      res.status(500).json({ message: 'Failed to fetch site' });
    }
  });
  
  // Device routes
  app.get('/api/sites/:siteId/devices', deviceController.getDevices);
  app.get('/api/sites/:siteId/devices/type/:type', deviceController.getDevicesByType);
  app.get('/api/devices/:id', deviceController.getDevice);
  app.post('/api/devices', deviceController.createDevice);
  app.put('/api/devices/:id', deviceController.updateDevice);
  app.delete('/api/devices/:id', deviceController.deleteDevice);
  
  // Device readings routes
  app.get('/api/devices/:id/readings', deviceController.getDeviceReadings);
  app.get('/api/devices/:id/readings/timerange', deviceController.getDeviceReadingsByTimeRange);
  app.post('/api/devices/readings', deviceController.createDeviceReading);
  
  // Energy readings routes
  app.get('/api/sites/:siteId/energy-readings', energyController.getEnergyReadings);
  app.get('/api/sites/:siteId/energy-readings/timerange', energyController.getEnergyReadingsByTimeRange);
  app.get('/api/sites/:siteId/energy-readings/latest', energyController.getLatestEnergyReading);
  app.post('/api/energy-readings', energyController.createEnergyReading);
  
  // Optimization routes
  app.get('/api/sites/:siteId/optimization-settings', optimizationController.getOptimizationSettings);
  app.post('/api/optimization-settings', optimizationController.createOptimizationSettings);
  app.put('/api/sites/:siteId/optimization-settings', optimizationController.updateOptimizationSettings);
  
  // Tariff routes
  app.get('/api/sites/:siteId/tariffs', optimizationController.getTariffs);
  app.get('/api/tariffs/:id', optimizationController.getTariff);
  app.post('/api/tariffs', optimizationController.createTariff);
  app.put('/api/tariffs/:id', optimizationController.updateTariff);
  
  // Demo data route - for initial setup
  app.post('/api/demo-setup', async (req, res) => {
    try {
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
        peakShavingEnabled: true,
        peakShavingTarget: 5,
        selfConsumptionEnabled: true,
        batteryArbitrageEnabled: false,
        v2gEnabled: false,
        vppEnabled: false,
        p2pEnabled: false,
        aiRecommendationsEnabled: true,
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
        currency: 'USD'
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
        frequency: null
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
        frequency: null
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
        temperature: null
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
        temperature: null
      });
      
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
        readings: {
          energy: energyReading,
          solar: solarReading,
          battery: batteryReading,
          ev: evReading,
          meter: meterReading
        }
      });
    } catch (error) {
      console.error('Error setting up demo data:', error);
      res.status(500).json({ message: 'Failed to set up demo data' });
    }
  });

  return httpServer;
}
