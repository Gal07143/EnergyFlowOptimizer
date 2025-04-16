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

// Import controllers
import * as deviceController from './controllers/deviceController';
import * as energyController from './controllers/energyController';
import * as forecastController from './controllers/forecastController';
import * as optimizationController from './controllers/optimizationController';
import * as authController from './controllers/authController';
import * as setupController from './controllers/setupController';
import * as initController from './controllers/initController';

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
  
  // Energy forecast routes
  app.get('/api/sites/:siteId/forecasts', forecastController.getEnergyForecasts);
  app.get('/api/sites/:siteId/forecasts/type/:forecastType', forecastController.getEnergyForecastsByType);
  app.get('/api/sites/:siteId/forecasts/latest', forecastController.getLatestEnergyForecast);
  app.post('/api/forecasts', forecastController.createEnergyForecast);
  app.post('/api/sites/:siteId/forecasts/generate', forecastController.generateEnergyForecast);
  
  // Optimization routes
  app.get('/api/sites/:siteId/optimization-settings', optimizationController.getOptimizationSettings);
  app.post('/api/optimization-settings', optimizationController.createOptimizationSettings);
  app.put('/api/sites/:siteId/optimization-settings', optimizationController.updateOptimizationSettings);
  
  // Tariff routes
  app.get('/api/sites/:siteId/tariffs', optimizationController.getTariffs);
  app.get('/api/tariffs/:id', optimizationController.getTariff);
  app.post('/api/tariffs', optimizationController.createTariff);
  app.put('/api/tariffs/:id', optimizationController.updateTariff);
  
  // Setup routes
  app.post('/api/create-demo-user', setupController.createDemoUser);
  app.post('/api/demo-setup', setupController.createDemoData);
  app.post('/api/initialize', initController.initSystem);

  return httpServer;
}
