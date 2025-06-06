import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from 'ws';
import { initWebSocketServer } from './services/websocketService';
import { initWebSocketPublisher } from './services/websocketPublisher';
import { setupAuth, hashPassword } from './auth';
import { users, deviceCatalog, deviceManufacturers, deviceTechnicalSpecs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { requireRole, requireAdmin, requireManager, requirePartnerAccess, requireDeviceAccess } from './middleware/roleAuth';
import { isAuthenticated } from './middleware/auth';
import { initDeviceManagementService } from './services/deviceManagementService';
import { 
  getLatestBatteryTelemetry, 
  getBatteryTelemetryHistory, 
  getBatteryCapacityTests,
  getBatteryLifecycleEvents,
  getBatteryThermalEvents,
  scheduleCapacityTest
} from './controllers/batteryController';
import { initMqttService } from './services/mqttService';
import { ocppManager } from './adapters/ocppAdapter';
import { getEEBusManager } from './adapters/eebusAdapter';

// Import controllers
import * as deviceController from './controllers/deviceController';
import * as arbitrageController from './controllers/arbitrageController';
import * as energyController from './controllers/energyController';
import * as forecastController from './controllers/forecastController';
import * as optimizationController from './controllers/optimizationController';
import * as tariffOptimizationController from './controllers/tariffOptimizationController';
import * as demandResponseController from './controllers/demandResponseController';
import * as tariffController from './controllers/tariffController';
import * as authController from './controllers/authController';
import * as profileController from './controllers/profileController';
import * as setupController from './controllers/setupController';
import * as edgeComputingController from './controllers/edgeComputingController';
import * as initController from './controllers/initController';
import { weatherController } from './controllers/weatherController';
import * as aiOptimizationController from './controllers/aiOptimizationController';
import * as reportController from './controllers/reportController';
import * as analyticsController from './controllers/analyticsController';
import partnerController from './controllers/partnerController';
import { VPPController } from './controllers/vppController';
import { initVPPService } from './services/vppService';
import { ConsumptionPatternController } from './controllers/consumptionPatternController';
import { initConsumptionPatternService } from './services/consumptionPatternService';
import * as v2gController from './controllers/v2gController';
import { v2gOptimizationService } from './services/v2gOptimizationService';
import deviceRegistryRoutes from './routes/deviceRegistry';
import { electricalDiagramRoutes } from './routes/electricalDiagram';
import { predictiveMaintenanceRoutes } from './routes/predictiveMaintenanceRoutes';
import gatewayRoutes from './routes/gatewayRoutes';
import alarmsRoutes from './routes/alarms';
import * as gatewayController from './controllers/gatewayController';
import * as connectionTemplateController from './controllers/connectionTemplateController';
import * as batteryController from './controllers/batteryController';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Add health check endpoints that don't require authentication
  app.get('/api/healthcheck', (req, res) => {
    console.log('Health check request received');
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      service: 'Energy Management System API',
      environment: process.env.NODE_ENV || 'development' 
    });
  });
  
  // Add a second endpoint for the test page
  app.get('/api/health', (req, res) => {
    console.log('Health check request received from test page');
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      service: 'Energy Management System API',
      environment: process.env.NODE_ENV || 'development',
      message: 'API is accessible from the frontend'
    });
  });
  
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
    
    // Initialize WebSocket publisher to connect MQTT to WebSockets
    const wsPublisher = initWebSocketPublisher();
    console.log('WebSocket publisher service initialized');
    
    // Initialize Gateway controller with MQTT service
    gatewayController.initGatewayController(mqttService);
    console.log('Gateway controller initialized');
    
    // Initialize V2G optimization service
    try {
      await v2gOptimizationService.initialize();
      console.log('V2G optimization service initialized');
    } catch (v2gError) {
      console.error('Error initializing V2G optimization service:', v2gError);
    }
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // If the user is not an admin, filter sites by their partner ID
      if (req.user.role !== 'admin' && req.user.partnerId) {
        const sites = await storage.getSitesByPartner(req.user.partnerId);
        return res.json(sites);
      }
      
      // Admin users can see all sites
      const sites = await storage.getSites();
      res.json(sites);
    } catch (error) {
      console.error('Error fetching sites:', error);
      res.status(500).json({ message: 'Failed to fetch sites' });
    }
  });
  
  app.get('/api/sites/:id', requirePartnerAccess('id', 'site'), async (req, res) => {
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
  app.get('/api/sites/:siteId/telemetry', deviceController.getSiteDevicesTelemetry);
  
  // Device catalog routes
  app.get('/api/device-catalog', async (req, res) => {
    try {
      const manufacturerId = req.query.manufacturer as string;
      const deviceType = req.query.type as string;
      
      // Build the query based on the provided parameters
      let query = db.select().from(deviceCatalog);
      
      if (manufacturerId) {
        query = query.where(eq(deviceCatalog.manufacturerId, parseInt(manufacturerId)));
      }
      
      if (deviceType) {
        query = query.where(eq(deviceCatalog.type, deviceType));
      }
      
      const devices = await query;
      res.json(devices);
    } catch (error) {
      console.error('Error fetching device catalog:', error);
      res.status(500).json({ message: 'Failed to fetch device catalog' });
    }
  });
  
  // Connection templates routes
  app.get('/api/connection-templates', connectionTemplateController.getConnectionTemplates);
  app.post('/api/connection-templates', requireManager, connectionTemplateController.createConnectionTemplate);
  app.put('/api/connection-templates/:id', requireManager, connectionTemplateController.updateConnectionTemplate);
  app.delete('/api/connection-templates/:id', requireAdmin, connectionTemplateController.deleteConnectionTemplate);
  
  // Device technical specifications routes - Allow unauthenticated access for GET
  app.get('/api/device-catalog/:id/technical-specs', async (req, res) => {
    try {
      const deviceCatalogId = parseInt(req.params.id);
      
      if (isNaN(deviceCatalogId)) {
        return res.status(400).json({ message: 'Invalid device catalog ID' });
      }
      
      const [specs] = await db
        .select()
        .from(deviceTechnicalSpecs)
        .where(eq(deviceTechnicalSpecs.deviceCatalogId, deviceCatalogId));
      
      if (!specs) {
        return res.status(404).json({ 
          message: 'Technical specifications not found for this device model',
          deviceCatalogId
        });
      }
      
      res.json(specs);
    } catch (error) {
      console.error('Error fetching technical specifications:', error);
      res.status(500).json({ message: 'Failed to fetch technical specifications' });
    }
  });
  
  // Save technical specifications for a device model - Requires manager role
  app.post('/api/device-catalog/:id/technical-specs', requireManager, async (req, res) => {
    try {
      const deviceCatalogId = parseInt(req.params.id);
      
      if (isNaN(deviceCatalogId)) {
        return res.status(400).json({ message: 'Invalid device catalog ID' });
      }
      
      // Check if the device catalog entry exists
      const [deviceModel] = await db
        .select()
        .from(deviceCatalog)
        .where(eq(deviceCatalog.id, deviceCatalogId));
      
      if (!deviceModel) {
        return res.status(404).json({ message: 'Device model not found' });
      }
      
      // Check if specs already exist for this model
      const [existingSpecs] = await db
        .select()
        .from(deviceTechnicalSpecs)
        .where(eq(deviceTechnicalSpecs.deviceCatalogId, deviceCatalogId));
      
      // Initialize the technical specs object with the request body
      const techSpecs = {
        ...req.body,
        deviceCatalogId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      let result;
      
      if (existingSpecs) {
        // Update existing specs
        [result] = await db
          .update(deviceTechnicalSpecs)
          .set({
            ...techSpecs,
            updatedAt: new Date() // Always update the updatedAt timestamp
          })
          .where(eq(deviceTechnicalSpecs.id, existingSpecs.id))
          .returning();
        
        res.json(result);
      } else {
        // Create new specs
        [result] = await db
          .insert(deviceTechnicalSpecs)
          .values(techSpecs)
          .returning();
        
        res.status(201).json(result);
      }
    } catch (error) {
      console.error('Error saving technical specifications:', error);
      res.status(500).json({ message: 'Failed to save technical specifications' });
    }
  });
  
  // Device manufacturers route
  app.get('/api/device-manufacturers', async (req, res) => {
    try {
      const manufacturers = await db.select().from(deviceManufacturers);
      res.json(manufacturers);
    } catch (error) {
      console.error('Error fetching device manufacturers:', error);
      res.status(500).json({ message: 'Failed to fetch device manufacturers' });
    }
  });
  
  // Protocol-specific device endpoints
  app.post('/api/devices/:id/ocpp/start', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { connectorId, tagId } = req.body;
      
      if (isNaN(deviceId) || !connectorId) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      
      // ocppManager is already imported at the top
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
      
      // ocppManager is already imported at the top
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
  
  // Device-specific tariff routes
  app.get('/api/devices/:deviceId/tariff', tariffController.getDeviceTariff);
  app.post('/api/devices/:deviceId/tariff/:tariffId', requireManager, tariffController.setDeviceTariff);
  app.delete('/api/devices/:deviceId/tariff', requireManager, tariffController.removeDeviceTariff);
  
  // Device connection settings routes
  app.get('/api/devices/:deviceId/connection', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: 'Invalid device ID' });
      }
      
      // Get device connection settings
      const [connectionSettings] = await db
        .select()
        .from(deviceConnectionSettings)
        .where(eq(deviceConnectionSettings.deviceId, deviceId));
      
      if (!connectionSettings) {
        return res.status(404).json({ message: 'Connection settings not found for this device' });
      }
      
      // Get the connection template if available
      if (connectionSettings.connectionTemplateId) {
        const [template] = await db
          .select()
          .from(deviceConnectionTemplates)
          .where(eq(deviceConnectionTemplates.id, connectionSettings.connectionTemplateId));
          
        if (template) {
          return res.json({
            ...connectionSettings,
            template
          });
        }
      }
      
      return res.json(connectionSettings);
    } catch (error) {
      console.error('Error fetching device connection settings:', error);
      return res.status(500).json({ message: 'Failed to fetch connection settings' });
    }
  });
  
  app.post('/api/devices/:deviceId/connection', requireManager, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: 'Invalid device ID' });
      }
      
      const { connectionTemplateId, protocol, settings, status } = req.body;
      
      // Check if the device exists
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
      
      if (!device) {
        return res.status(404).json({ message: 'Device not found' });
      }
      
      // Check if connection settings already exist for this device
      const [existingSettings] = await db
        .select()
        .from(deviceConnectionSettings)
        .where(eq(deviceConnectionSettings.deviceId, deviceId));
      
      let result;
      
      if (existingSettings) {
        // Update existing connection settings
        [result] = await db
          .update(deviceConnectionSettings)
          .set({
            connectionTemplateId,
            protocol: protocol || existingSettings.protocol,
            settings: settings || existingSettings.settings,
            status: status || existingSettings.status,
            updatedAt: new Date()
          })
          .where(eq(deviceConnectionSettings.id, existingSettings.id))
          .returning();
        
        return res.json(result);
      } else {
        // Create new connection settings
        [result] = await db
          .insert(deviceConnectionSettings)
          .values({
            deviceId,
            connectionTemplateId,
            protocol,
            settings,
            status: status || 'disconnected',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return res.status(201).json(result);
      }
    } catch (error) {
      console.error('Error saving device connection settings:', error);
      return res.status(500).json({ message: 'Failed to save connection settings' });
    }
  });
  
  // Tariff Optimization routes
  app.post('/api/sites/:siteId/optimize/tariff', tariffOptimizationController.optimizeBySiteTariff);
  app.post('/api/sites/:siteId/optimize/ai-tariff', tariffOptimizationController.runAIOptimizationWithTariff);
  app.get('/api/sites/:siteId/optimize/tariff-summary', tariffOptimizationController.getTariffOptimizationSummary);
  app.post('/api/sites/:siteId/optimize/strategy/:strategy', tariffOptimizationController.applyTariffStrategy);
  
  // Additional specialized Israeli tariff types
  app.post('/api/sites/:siteId/tariff/israeli/lv', requireManager, (req, res) => {
    req.query.type = 'lv';
    return tariffController.createIsraeliTariff(req, res);
  });
  app.post('/api/sites/:siteId/tariff/israeli/hv', requireManager, (req, res) => {
    req.query.type = 'hv';
    return tariffController.createIsraeliTariff(req, res);
  });
  app.post('/api/sites/:siteId/tariff/israeli/tou', requireManager, (req, res) => {
    req.query.type = 'tou';
    return tariffController.createIsraeliTariff(req, res);
  });
  
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
  
  // Initialize VPP service
  const vppService = initVPPService();
  
  // VPP Program routes
  app.get('/api/vpp/programs', VPPController.getAllPrograms);
  app.get('/api/vpp/programs/active', VPPController.getActivePrograms);
  app.get('/api/vpp/programs/:id', VPPController.getProgramById);
  app.post('/api/vpp/programs', requireManager, VPPController.createProgram);
  app.put('/api/vpp/programs/:id', requireManager, VPPController.updateProgram);
  app.delete('/api/vpp/programs/:id', requireAdmin, VPPController.deleteProgram);
  
  // Battery Arbitrage routes
  app.get('/api/arbitrage/strategies', arbitrageController.getArbitrageStrategies);
  app.get('/api/sites/:siteId/arbitrage/strategies', arbitrageController.getActiveStrategies);
  app.post('/api/sites/:siteId/arbitrage/strategies/enable', requireManager, arbitrageController.enableStrategy);
  app.post('/api/sites/:siteId/arbitrage/strategies/disable', requireManager, arbitrageController.disableStrategy);
  app.post('/api/sites/:siteId/arbitrage/optimize', requireManager, arbitrageController.runOptimization);
  app.get('/api/sites/:siteId/arbitrage/performance', arbitrageController.getArbitragePerformance);
  app.get('/api/sites/:siteId/prices/forecast', arbitrageController.getPriceForecast);
  app.get('/api/sites/:siteId/prices/historical', arbitrageController.getHistoricalPrices);
  
  // VPP Enrollment routes
  app.get('/api/vpp/sites/:siteId/enrollments', VPPController.getSiteEnrollments);
  app.get('/api/vpp/programs/:programId/enrollments', VPPController.getProgramEnrollments);
  app.post('/api/vpp/enrollments', requireManager, VPPController.enrollSite);
  app.put('/api/vpp/enrollments/:id', requireManager, VPPController.updateEnrollment);
  app.delete('/api/vpp/enrollments/:id', requireManager, VPPController.unenrollSite);
  
  // VPP Event routes
  app.get('/api/vpp/events', VPPController.getAllEvents);
  app.get('/api/vpp/events/active', VPPController.getActiveEvents);
  app.get('/api/vpp/events/upcoming', VPPController.getUpcomingEvents);
  app.get('/api/vpp/sites/:siteId/events', VPPController.getSiteEvents);
  app.get('/api/vpp/programs/:programId/events', VPPController.getProgramEvents);
  app.post('/api/vpp/events', requireManager, VPPController.createEvent);
  app.put('/api/vpp/events/:id', requireManager, VPPController.updateEvent);
  app.post('/api/vpp/events/:id/cancel', requireManager, VPPController.cancelEvent);
  
  // VPP Participation routes
  app.post('/api/vpp/events/:eventId/sites/:siteId/accept', VPPController.acceptEvent);
  app.post('/api/vpp/events/:eventId/sites/:siteId/reject', VPPController.rejectEvent);
  app.get('/api/vpp/events/:eventId/participations', VPPController.getEventParticipations);
  app.get('/api/vpp/sites/:siteId/participations', VPPController.getSiteParticipations);
  
  // VPP Metrics routes
  app.get('/api/vpp/participations/:participationId/metrics', VPPController.getParticipationMetrics);
  app.get('/api/vpp/participations/:participationId/metrics/latest', VPPController.getLatestParticipationMetrics);
  
  // Initialize Consumption Pattern Service
  const consumptionPatternService = initConsumptionPatternService();
  
  // Consumption Pattern routes
  app.get('/api/sites/:siteId/consumption-patterns', ConsumptionPatternController.getPatternsBySite);
  app.get('/api/consumption-patterns/:id', ConsumptionPatternController.getPatternById);
  app.get('/api/sites/:siteId/consumption-patterns/timeframe/:timeFrame', ConsumptionPatternController.getPatternsByTimeframe);
  app.get('/api/sites/:siteId/consumption-patterns/category/:category', ConsumptionPatternController.getPatternsByCategory);
  app.get('/api/sites/:siteId/consumption-patterns/source/:source', ConsumptionPatternController.getPatternsBySource);
  app.post('/api/consumption-patterns', requireManager, ConsumptionPatternController.createPattern);
  app.put('/api/consumption-patterns/:id', requireManager, ConsumptionPatternController.updatePattern);
  app.delete('/api/consumption-patterns/:id', requireAdmin, ConsumptionPatternController.deletePattern);
  
  // Device Registry & Provisioning routes
  app.use('/api/device-registry', deviceRegistryRoutes);
  
  // Electrical diagram routes
  app.use('/api/electrical-diagrams', electricalDiagramRoutes);
  
  // Gateway routes
  app.use('/api/gateways', gatewayRoutes);
  
  // Battery Management System (BMS) routes
  app.get('/api/devices/:deviceId/battery/telemetry/latest', batteryController.getLatestBatteryTelemetry);
  app.get('/api/devices/:deviceId/battery/telemetry/history', batteryController.getBatteryTelemetryHistory);
  app.get('/api/devices/:deviceId/battery/capacity-tests', batteryController.getBatteryCapacityTests);
  app.get('/api/devices/:deviceId/battery/lifecycle-events', batteryController.getBatteryLifecycleEvents);
  app.get('/api/devices/:deviceId/battery/thermal-events', batteryController.getBatteryThermalEvents);
  app.post('/api/devices/:deviceId/battery/capacity-test', requireManager, batteryController.scheduleCapacityTest);
  
  // Development endpoint without auth for testing ML models
  app.post('/api/test/consumption-patterns/:id/train', ConsumptionPatternController.trainPatternModel);
  
  // Original endpoint with auth
  app.post('/api/consumption-patterns/:id/train', requireManager, ConsumptionPatternController.trainPatternModel);
  app.get('/api/consumption-patterns/:id/predictions', ConsumptionPatternController.generatePredictions);
  app.post('/api/sites/:siteId/consumption-patterns/anomalies', ConsumptionPatternController.detectAnomalies);
  app.get('/api/sites/:siteId/consumption-features', ConsumptionPatternController.getConsumptionFeatures);

  // Battery Arbitrage Routes
  app.get('/api/arbitrage/strategies', arbitrageController.getArbitrageStrategies);
  app.get('/api/sites/:siteId/arbitrage/strategies', arbitrageController.getActiveStrategies);
  app.post('/api/sites/:siteId/arbitrage/strategies/enable', requireManager, arbitrageController.enableStrategy);
  app.post('/api/sites/:siteId/arbitrage/strategies/disable', requireManager, arbitrageController.disableStrategy);
  app.post('/api/sites/:siteId/arbitrage/optimize', requireManager, arbitrageController.runOptimization);
  app.get('/api/sites/:siteId/arbitrage/performance', arbitrageController.getArbitragePerformance);
  app.get('/api/sites/:siteId/prices/historical', arbitrageController.getHistoricalPrices);
  app.get('/api/sites/:siteId/prices/forecast', arbitrageController.getPriceForecast);

  // Report Generator Routes
  app.post('/api/reports/generate', reportController.generateReport);
  app.get('/api/reports/types', reportController.getReportTypes);
  app.get('/api/reports/formats', reportController.getReportFormats);
  app.get('/api/reports/time-periods', reportController.getTimePeriods);
  app.get('/api/reports/templates', reportController.getReportTemplates);
  app.post('/api/reports/generate-from-template', reportController.generateReportFromTemplate);

  // Analytics Routes
  app.post('/api/analytics/run', analyticsController.runAnalytics);
  app.get('/api/analytics/types', analyticsController.getAnalyticsTypes);
  app.get('/api/analytics/granularities', analyticsController.getTimeGranularities);

  // Partner Organization Routes
  app.get('/api/partners', requireAdmin, partnerController.getAllPartners);
  app.get('/api/partners/current', isAuthenticated, partnerController.getCurrentPartner);
  app.get('/api/partners/:id', requirePartnerAccess('id', 'partner'), partnerController.getPartnerById);
  app.post('/api/partners', requireAdmin, partnerController.createPartner);
  app.put('/api/partners/:id', requirePartnerAccess('id', 'partner'), partnerController.updatePartner);
  app.get('/api/partners/:id/users', requirePartnerAccess('id', 'partner'), partnerController.getPartnerUsers);
  app.get('/api/partners/:id/sites', requirePartnerAccess('id', 'partner'), partnerController.getPartnerSites);

  // Predictive Maintenance Routes
  app.use('/api/maintenance', predictiveMaintenanceRoutes);
  
  // Alarms Routes
  app.use('/api', alarmsRoutes);

  // Edge Computing Routes
  app.get('/api/edge/nodes', isAuthenticated, edgeComputingController.getEdgeNodes);
  app.get('/api/edge/nodes/:id', isAuthenticated, edgeComputingController.getEdgeNodeById);
  app.post('/api/edge/nodes', requireManager, edgeComputingController.createEdgeNode);
  app.put('/api/edge/nodes/:id', requireManager, edgeComputingController.updateEdgeNode);
  app.delete('/api/edge/nodes/:id', requireAdmin, edgeComputingController.deleteEdgeNode);
  
  // Edge Node Connectivity
  app.get('/api/edge/nodes/:nodeId/connectivity', isAuthenticated, edgeComputingController.getNodeConnectivity);
  app.post('/api/edge/nodes/:nodeId/connectivity', requireManager, edgeComputingController.createNodeConnectivity);
  
  // Edge Node Applications
  app.get('/api/edge/nodes/:nodeId/applications', isAuthenticated, edgeComputingController.getNodeApplications);
  app.post('/api/edge/nodes/:nodeId/applications', requireManager, edgeComputingController.createNodeApplication);
  
  // Edge Node Device Controls
  app.get('/api/edge/nodes/:nodeId/device-controls', isAuthenticated, edgeComputingController.getNodeDeviceControls);
  app.post('/api/edge/nodes/:nodeId/device-controls', requireManager, edgeComputingController.createNodeDeviceControl);
  
  // Edge Node Metrics
  app.get('/api/edge/nodes/:nodeId/metrics', isAuthenticated, edgeComputingController.getNodeMetrics);
  app.post('/api/edge/nodes/:nodeId/metrics', requireManager, edgeComputingController.createNodeMetrics);
  
  // Low-Latency Control Operations
  app.post('/api/edge/nodes/:nodeId/devices/:deviceId/control', requireManager, edgeComputingController.sendControlCommand);
  
  // Edge Node Status
  app.get('/api/edge/nodes/:nodeId/status', isAuthenticated, edgeComputingController.getNodeStatus);

  // V2G/V2H bidirectional EV charging routes
  app.get('/api/v2g/vehicles', isAuthenticated, v2gController.getEVVehicles);
  app.get('/api/v2g/vehicles/:id', isAuthenticated, v2gController.getEVVehicleById);
  app.post('/api/v2g/vehicles', isAuthenticated, v2gController.createEVVehicle);
  app.put('/api/v2g/vehicles/:id', isAuthenticated, v2gController.updateEVVehicle);
  app.delete('/api/v2g/vehicles/:id', isAuthenticated, v2gController.deleteEVVehicle);
  
  app.get('/api/v2g/charging-sessions', isAuthenticated, v2gController.getChargingSessions);
  app.get('/api/v2g/charging-sessions/:id', isAuthenticated, v2gController.getChargingSessionById);
  app.post('/api/v2g/charging-sessions', isAuthenticated, v2gController.createChargingSession);
  app.put('/api/v2g/charging-sessions/:id', isAuthenticated, v2gController.updateChargingSession);
  app.post('/api/v2g/charging-sessions/:id/end', isAuthenticated, v2gController.endChargingSession);
  
  app.get('/api/v2g/service-providers', v2gController.getV2GServiceProviders);
  app.get('/api/v2g/enrollments', isAuthenticated, v2gController.getServiceEnrollments);
  app.post('/api/v2g/enrollments', isAuthenticated, v2gController.createServiceEnrollment);
  app.post('/api/v2g/enrollments/:id/terminate', isAuthenticated, v2gController.terminateServiceEnrollment);
  
  app.get('/api/v2g/statistics/:userId', isAuthenticated, v2gController.getV2GUserStatistics);

  return httpServer;
}
