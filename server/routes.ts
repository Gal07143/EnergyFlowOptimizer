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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = initWebSocketServer(httpServer);
  
  // Setup authentication
  setupAuth(app);
  
  // Initialize device management services
  try {
    const deviceService = initDeviceManagementService();
    console.log('Device management service successfully initialized');
  } catch (error) {
    console.error('Error initializing device management service:', error);
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
  app.get('/api/sites/:siteId/devices', deviceController.getDevices);
  app.get('/api/sites/:siteId/devices/type/:type', deviceController.getDevicesByType);
  app.get('/api/devices/:id', deviceController.getDevice);
  app.post('/api/devices', requireManager, deviceController.createDevice);
  app.put('/api/devices/:id', requireManager, deviceController.updateDevice);
  app.delete('/api/devices/:id', requireAdmin, deviceController.deleteDevice);
  
  // Device readings routes
  app.get('/api/devices/:id/readings', deviceController.getDeviceReadings);
  app.get('/api/devices/:id/readings/timerange', deviceController.getDeviceReadingsByTimeRange);
  app.post('/api/devices/readings', deviceController.createDeviceReading);
  
  // Device control routes
  app.post('/api/devices/:id/control', deviceController.controlDevice);
  app.get('/api/devices/:id/status', deviceController.checkDeviceStatus);
  
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

  return httpServer;
}
