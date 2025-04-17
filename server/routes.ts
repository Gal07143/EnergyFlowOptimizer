import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from 'ws';
import { initWebSocketServer } from './services/websocketService';
import { setupAuth, hashPassword } from './auth';
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { requireAdmin, requireManager, canManageSite } from './middleware/roleAuth';
import { initDeviceManagementService } from './services/deviceManagementService';
import { initMqttService } from './services/mqttService';
import { getOCPPManager } from './adapters/ocppAdapter';
import { getEEBusManager } from './adapters/eebusAdapter';

// Import controllers
import * as deviceController from './controllers/deviceController';
import * as energyController from './controllers/energyController';
import * as forecastController from './controllers/forecastController';
import * as optimizationController from './controllers/optimizationController';
import * as demandResponseController from './controllers/demandResponseController';
import * as tariffController from './controllers/tariffController';
import * as authController from './controllers/authController';
import * as profileController from './controllers/profileController';
import * as setupController from './controllers/setupController';
import * as initController from './controllers/initController';
import { weatherController } from './controllers/weatherController';
import * as aiOptimizationController from './controllers/aiOptimizationController';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = initWebSocketServer(httpServer);
  
  // Setup authentication
  setupAuth(app);
  
  // Initialize MQTT service first, then device management service
  try {
    // Initialize MQTT service with development mode options
    const mqttService = initMqttService({
      // For development, use a mock MQTT broker
      // In production, this would be the actual broker URL
      brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
      clientId: `ems-server-${Math.floor(Math.random() * 10000)}`,
      reconnectPeriod: 5000,
      keepalive: 60,
      clean: true
    });
    console.log('MQTT service successfully initialized');
    
    // Then initialize device management service
    const deviceService = initDeviceManagementService();
    console.log('Device management service successfully initialized');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
  
  // API routes
  
  // Email verification routes
  app.post('/api/verify-email', authController.verifyEmail);
  app.post('/api/resend-verification', authController.resendVerificationCode);
  app.get('/api/email-verification-status', authController.checkEmailVerification);
  
  // User profile routes
  app.get('/api/profile', profileController.getProfile);
  app.put('/api/profile', profileController.updateProfile);
  app.post('/api/change-password', profileController.changePassword);
  
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
  app.get('/api/devices', deviceController.getAllDevices);
  app.get('/api/sites/:siteId/devices', deviceController.getDevicesBySite);
  app.get('/api/devices/type/:type', deviceController.getDevicesByType);
  app.get('/api/devices/:id', deviceController.getDeviceById);
  app.post('/api/devices', requireManager, deviceController.addDevice);
  app.put('/api/devices/:id', requireManager, deviceController.updateDevice);
  app.delete('/api/devices/:id', requireAdmin, deviceController.deleteDevice);
  
  // Protocol-specific device endpoints
  app.post('/api/devices/:id/ocpp/start', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { connectorId, tagId } = req.body;
      
      if (isNaN(deviceId) || !connectorId) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      
      const ocppManager = getOCPPManager();
      const adapter = ocppManager.getAdapter(deviceId);
      
      if (!adapter) {
        return res.status(404).json({ error: 'OCPP device not found' });
      }
      
      const result = await adapter.startTransaction(connectorId, tagId);
      if (!result) {
        return res.status(400).json({ error: 'Failed to start transaction' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error starting OCPP transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/devices/:id/ocpp/stop', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { connectorId } = req.body;
      
      if (isNaN(deviceId) || !connectorId) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      
      const ocppManager = getOCPPManager();
      const adapter = ocppManager.getAdapter(deviceId);
      
      if (!adapter) {
        return res.status(404).json({ error: 'OCPP device not found' });
      }
      
      const result = await adapter.stopTransaction(connectorId);
      if (!result) {
        return res.status(400).json({ error: 'Failed to stop transaction' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error stopping OCPP transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/devices/:id/eebus/mode', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { mode } = req.body;
      
      if (isNaN(deviceId) || !mode) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      
      const eebusManager = getEEBusManager();
      const adapter = eebusManager.getAdapter(deviceId);
      
      if (!adapter) {
        return res.status(404).json({ error: 'EEBus device not found' });
      }
      
      const result = await adapter.setOperationMode(mode);
      if (!result) {
        return res.status(400).json({ error: 'Failed to set operation mode' });
      }
      
      res.json({ success: true, mode });
    } catch (error) {
      console.error('Error setting EEBus operation mode:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/devices/:id/eebus/temperature', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { temperature } = req.body;
      
      if (isNaN(deviceId) || typeof temperature !== 'number') {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      
      const eebusManager = getEEBusManager();
      const adapter = eebusManager.getAdapter(deviceId);
      
      if (!adapter) {
        return res.status(404).json({ error: 'EEBus device not found' });
      }
      
      const result = await adapter.setTargetTemperature(temperature);
      if (!result) {
        return res.status(400).json({ error: 'Failed to set target temperature' });
      }
      
      res.json({ success: true, temperature });
    } catch (error) {
      console.error('Error setting EEBus target temperature:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Energy readings routes
  app.get('/api/sites/:siteId/energy-readings', energyController.getEnergyReadings);
  app.get('/api/sites/:siteId/energy-readings/timerange', energyController.getEnergyReadingsByTimeRange);
  app.get('/api/sites/:siteId/energy-readings/latest', energyController.getLatestEnergyReading);
  app.post('/api/energy-readings', energyController.createEnergyReading);
  
  // Energy forecast routes
  app.get('/api/sites/:siteId/forecasts', forecastController.getEnergyForecasts);
  app.get('/api/sites/:siteId/forecasts/type/:forecastType', forecastController.getEnergyForecastsByType);
  app.get('/api/sites/:siteId/forecasts/latest', forecastController.getLatestEnergyForecast);
  app.post('/api/forecasts', forecastController.createEnergyForecast);
  app.post('/api/sites/:siteId/forecasts/generate', forecastController.generateEnergyForecast);
  
  // Optimization routes
  app.get('/api/sites/:siteId/optimization-settings', optimizationController.getOptimizationSettings);
  app.post('/api/optimization-settings', requireManager, optimizationController.createOptimizationSettings);
  app.put('/api/sites/:siteId/optimization-settings', requireManager, optimizationController.updateOptimizationSettings);
  
  // Optimization wizard routes
  app.get('/api/optimization/presets', optimizationController.getOptimizationPresets);
  app.post('/api/sites/:siteId/optimization/apply-preset', requireManager, optimizationController.applyOptimizationPreset);
  
  // Tariff routes
  app.get('/api/sites/:siteId/tariffs', tariffController.getTariffs);
  app.get('/api/sites/:siteId/tariff', tariffController.getTariffBySite);
  app.get('/api/sites/:siteId/tariff/rate', tariffController.getCurrentTariffRate);
  app.post('/api/sites/:siteId/tariff', requireManager, tariffController.createTariff);
  app.put('/api/tariffs/:id', requireManager, tariffController.updateTariff);
  app.delete('/api/tariffs/:id', requireAdmin, tariffController.deleteTariff);
  app.post('/api/sites/:siteId/tariff/israeli', requireManager, tariffController.createIsraeliTariff);
  
  // Setup routes
  app.post('/api/create-demo-user', setupController.createDemoUser);
  app.post('/api/demo-setup', setupController.createDemoData);
  app.post('/api/initialize', initController.initSystem);
  
  // Weather routes
  app.get('/api/sites/:siteId/weather/current', weatherController.getCurrentWeather);
  app.get('/api/sites/:siteId/weather/forecast', weatherController.getWeatherForecast);
  app.get('/api/sites/:siteId/weather/recent', weatherController.getRecentWeatherData);
  app.post('/api/weather/api-key', weatherController.setApiKey);
  app.get('/api/weather/api-key/status', weatherController.checkApiKey);

  // Demand Response routes
  app.get('/api/sites/:siteId/demand-response/programs', demandResponseController.getDemandResponsePrograms);
  app.get('/api/demand-response/programs/:id', demandResponseController.getDemandResponseProgram);
  app.post('/api/demand-response/programs', demandResponseController.createDemandResponseProgram);
  app.put('/api/demand-response/programs/:id', demandResponseController.updateDemandResponseProgram);
  
  app.get('/api/sites/:siteId/demand-response/events', demandResponseController.getDemandResponseEvents);
  app.get('/api/demand-response/events/:id', demandResponseController.getDemandResponseEvent);
  app.post('/api/demand-response/events', demandResponseController.createDemandResponseEvent);
  app.put('/api/demand-response/events/:id', demandResponseController.updateDemandResponseEvent);
  
  app.get('/api/sites/:siteId/demand-response/settings', demandResponseController.getSiteDemandResponseSettings);
  app.post('/api/demand-response/settings', demandResponseController.createSiteDemandResponseSettings);
  app.put('/api/sites/:siteId/demand-response/settings', demandResponseController.updateSiteDemandResponseSettings);
  
  app.get('/api/sites/:siteId/demand-response/participations', demandResponseController.getSiteEventParticipations);
  app.get('/api/demand-response/participations/:id', demandResponseController.getSiteEventParticipation);
  app.post('/api/demand-response/participations', demandResponseController.createSiteEventParticipation);
  app.put('/api/demand-response/participations/:id', demandResponseController.updateSiteEventParticipation);
  
  app.get('/api/demand-response/events/:eventId/actions', demandResponseController.getDemandResponseActions);
  app.post('/api/demand-response/actions', demandResponseController.createDemandResponseAction);

  // AI Optimization routes
  app.post('/api/optimization/run/:siteId', aiOptimizationController.runOptimization);
  app.get('/api/optimization/last/:siteId', aiOptimizationController.getLastOptimization);
  app.get('/api/optimization/settings/:siteId', aiOptimizationController.getOptimizationSettings);
  app.put('/api/optimization/settings', aiOptimizationController.updateOptimizationSettings);
  app.get('/api/optimization/status', aiOptimizationController.getOptimizationStatus);
  app.post('/api/optimization/apply/:siteId', aiOptimizationController.applyLastOptimization);
  app.post('/api/optimization/feedback', aiOptimizationController.submitOptimizationFeedback);
  app.post('/api/optimization/test/:siteId', aiOptimizationController.testOptimizationAI);

  return httpServer;
}
