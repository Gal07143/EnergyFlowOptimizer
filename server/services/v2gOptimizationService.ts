import { db } from '../db';
import { getMqttService, formatTopic } from './mqttService';
import { evVehicles, evChargingSessions, v2gServiceProviders, v2gServiceEnrollments, v2gDischargeEvents, sites } from '@shared/schema';
import { eq, and, desc, isNull, lte, gte, not, sql } from 'drizzle-orm';
import { devices } from '@shared/schema';
import { getOpenAiService } from './openAiService';
import { optimizeUsingAI } from './optimizationService';

// Optimization strategies for V2G/V2H
export type V2GOptimizationMode = 
  'cost_saving' | 
  'grid_relief' | 
  'backup_power' | 
  'energy_arbitrage' | 
  'self_sufficiency' | 
  'peak_shaving' | 
  'carbon_reduction' | 
  'v2g_revenue' |
  'reactive_power';

// Timeslot interval in minutes
const TIME_INTERVAL = 15;

// Result of a V2G optimization
export interface V2GOptimizationResult {
  vehicleId: number;
  deviceId: number;
  mode: V2GOptimizationMode;
  startTime: Date;
  schedule: V2GScheduleSlot[];
  totalDischargeKwh: number;
  totalChargeKwh: number;
  totalCostSavings: number;
  totalRevenue: number;
  totalCarbonSavings: number;
  constraints: V2GConstraints;
  optimizationMetadata: any;
}

// Time slots for scheduling
export interface V2GScheduleSlot {
  startTime: Date;
  endTime: Date;
  powerKw: number;  // positive for charging, negative for discharging
  pricePerKwh?: number;
  gridCarbonIntensity?: number;
  isV2G: boolean;
  isV2H: boolean;
  soc?: number;  // State of charge at the end of this timeslot (%)
}

// Constraints for V2G/V2H optimization
export interface V2GConstraints {
  minSoc: number;  // Minimum SoC to maintain (%)
  maxSoc: number;  // Maximum SoC to allow (%)
  initialSoc: number;  // Initial SoC at start (%)
  targetSoc?: number;  // Target SoC at departure time (%) if known
  departureTime?: Date;  // Expected departure time if known
  maxDischargeRateKw: number;  // Maximum discharge power
  maxChargeRateKw: number;  // Maximum charge power
  batteryCapacityKwh: number;  // Total battery capacity
  prioritizeHomeConsumption: boolean;  // Prioritize home consumption over grid export
  v2gEnabled: boolean;  // Allow V2G (grid export)
  v2hEnabled: boolean;  // Allow V2H (home consumption)
}

export class V2GOptimizationService {
  private static instance: V2GOptimizationService;
  private mqttService = getMqttService();
  private openAiService = getOpenAiService();
  
  // Singleton pattern
  static getInstance(): V2GOptimizationService {
    if (!V2GOptimizationService.instance) {
      V2GOptimizationService.instance = new V2GOptimizationService();
    }
    return V2GOptimizationService.instance;
  }
  
  // Initialize the service
  async initialize() {
    console.log('Initializing V2G optimization service');
    
    // Subscribe to EV state changes
    this.mqttService.subscribe('devices/+/status', (topic, message) => {
      const deviceId = this.extractDeviceIdFromTopic(topic);
      if (deviceId) {
        this.handleDeviceStatusUpdate(deviceId, message);
      }
    });
    
    // Subscribe to grid pricing updates
    this.mqttService.subscribe('grid/pricing/+', (topic, message) => {
      this.handleGridPricingUpdate(topic, message);
    });
    
    // Subscribe to site load forecasts
    this.mqttService.subscribe('sites/+/load/forecast', (topic, message) => {
      const siteId = this.extractSiteIdFromTopic(topic);
      if (siteId) {
        this.handleSiteLoadForecast(siteId, message);
      }
    });
    
    // Subscribe to V2G service provider events
    this.mqttService.subscribe('v2g/providers/+/events', (topic, message) => {
      const providerId = this.extractProviderIdFromTopic(topic);
      if (providerId) {
        this.handleProviderEvent(providerId, message);
      }
    });
    
    console.log('V2G optimization service initialized');
  }
  
  // Extract device ID from MQTT topic
  private extractDeviceIdFromTopic(topic: string): number | null {
    const match = topic.match(/devices\/(\d+)\/status/);
    return match ? Number(match[1]) : null;
  }
  
  // Extract site ID from MQTT topic
  private extractSiteIdFromTopic(topic: string): number | null {
    const match = topic.match(/sites\/(\d+)\/load\/forecast/);
    return match ? Number(match[1]) : null;
  }
  
  // Extract provider ID from MQTT topic
  private extractProviderIdFromTopic(topic: string): number | null {
    const match = topic.match(/v2g\/providers\/(\d+)\/events/);
    return match ? Number(match[1]) : null;
  }
  
  // Handle device status updates
  private async handleDeviceStatusUpdate(deviceId: number, message: any) {
    try {
      const deviceData = JSON.parse(message.toString());
      
      // Check if this is a bidirectional EV charger with a connected vehicle
      if (
        (deviceData.type === 'ev_charger' || deviceData.type === 'bidirectional_ev_charger') && 
        deviceData.connectedVehicleId
      ) {
        // Check for active charging session
        const [activeSession] = await db
          .select()
          .from(evChargingSessions)
          .where(and(
            eq(evChargingSessions.deviceId, deviceId),
            isNull(evChargingSessions.endTime)
          ));
        
        if (activeSession) {
          // If session is bidirectional, potentially trigger optimization
          if (
            activeSession.bidirectionalEnabled && 
            (
              activeSession.chargingMode === 'v2g' || 
              activeSession.chargingMode === 'v2h' ||
              activeSession.chargingMode === 'v2g_scheduled' ||
              activeSession.chargingMode === 'v2h_scheduled' ||
              activeSession.chargingMode === 'bidirectional_optimized'
            )
          ) {
            // Get vehicle data
            const [vehicle] = await db
              .select()
              .from(evVehicles)
              .where(eq(evVehicles.id, deviceData.connectedVehicleId));
            
            if (vehicle && vehicle.bidirectionalCapable) {
              // Check if state of charge changed significantly (>5%)
              const newSoc = deviceData.batteryLevel || deviceData.stateOfCharge;
              if (newSoc !== undefined && Math.abs(newSoc - (vehicle.currentSoc || 0)) > 5) {
                // Update vehicle SoC
                await db
                  .update(evVehicles)
                  .set({ 
                    currentSoc: newSoc,
                    updatedAt: new Date()
                  })
                  .where(eq(evVehicles.id, vehicle.id));
                
                // Re-optimize if in bidirectional optimized mode
                if (activeSession.chargingMode === 'bidirectional_optimized') {
                  await this.optimizeVehicleCharging(
                    vehicle.id,
                    deviceId,
                    'v2g_revenue',
                    activeSession.id
                  );
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling device status update for V2G optimization:', error);
    }
  }
  
  // Handle grid pricing updates
  private async handleGridPricingUpdate(topic: string, message: any) {
    try {
      const pricingData = JSON.parse(message.toString());
      
      // If there are significant price changes, re-evaluate all active V2G sessions
      if (pricingData.significantChange) {
        const activeBidirectionalSessions = await db
          .select()
          .from(evChargingSessions)
          .where(and(
            isNull(evChargingSessions.endTime),
            eq(evChargingSessions.bidirectionalEnabled, true),
            eq(evChargingSessions.chargingMode, 'bidirectional_optimized')
          ));
        
        // Re-optimize each session
        for (const session of activeBidirectionalSessions) {
          if (session.vehicleId) {
            await this.optimizeVehicleCharging(
              session.vehicleId,
              session.deviceId,
              'v2g_revenue',
              session.id
            );
          }
        }
      }
    } catch (error) {
      console.error('Error handling grid pricing update for V2G optimization:', error);
    }
  }
  
  // Handle site load forecasts
  private async handleSiteLoadForecast(siteId: number, message: any) {
    try {
      const forecastData = JSON.parse(message.toString());
      
      // Get active V2G sessions at this site
      const devices = await db
        .select()
        .from(devices)
        .where(eq(devices.siteId, siteId));
      
      const deviceIds = devices.map(d => d.id);
      
      if (deviceIds.length > 0) {
        const activeBidirectionalSessions = await db
          .select()
          .from(evChargingSessions)
          .where(and(
            isNull(evChargingSessions.endTime),
            eq(evChargingSessions.bidirectionalEnabled, true),
            sql`${evChargingSessions.deviceId} IN (${deviceIds.join(',')})`
          ));
        
        // Re-optimize each session based on new forecast
        for (const session of activeBidirectionalSessions) {
          if (
            session.chargingMode === 'bidirectional_optimized' &&
            session.vehicleId
          ) {
            await this.optimizeVehicleCharging(
              session.vehicleId,
              session.deviceId,
              'v2g_revenue',
              session.id
            );
          }
        }
      }
    } catch (error) {
      console.error('Error handling site load forecast for V2G optimization:', error);
    }
  }
  
  // Handle V2G service provider events
  private async handleProviderEvent(providerId: number, message: any) {
    try {
      const eventData = JSON.parse(message.toString());
      
      // If this is an emergency grid event (like frequency regulation)
      if (
        eventData.type === 'grid_event' && 
        eventData.priority === 'high' &&
        eventData.serviceDuration
      ) {
        // Find all active enrollments with this provider
        const activeEnrollments = await db
          .select()
          .from(v2gServiceEnrollments)
          .where(and(
            eq(v2gServiceEnrollments.serviceProviderId, providerId),
            eq(v2gServiceEnrollments.status, 'active')
          ));
        
        // Create discharge events for enrolled vehicles
        for (const enrollment of activeEnrollments) {
          // Check if vehicle is connected and has an active session
          const [activeSession] = await db
            .select({
              session: evChargingSessions,
              vehicle: evVehicles
            })
            .from(evChargingSessions)
            .innerJoin(evVehicles, eq(evChargingSessions.vehicleId, evVehicles.id))
            .where(and(
              eq(evChargingSessions.vehicleId, enrollment.vehicleId),
              isNull(evChargingSessions.endTime),
              eq(evVehicles.bidirectionalCapable, true),
              gte(evVehicles.currentSoc || 0, enrollment.minSocLimit || 20)
            ));
          
          if (activeSession?.session) {
            // Create a V2G discharge event
            const event = {
              enrollmentId: enrollment.id,
              vehicleId: enrollment.vehicleId,
              deviceId: activeSession.session.deviceId,
              serviceType: eventData.serviceType || 'frequency_regulation',
              requestedPowerKw: Math.min(
                eventData.requestedPowerKw || 3, 
                activeSession.vehicle.maxDischargingRateKw || 0
              ),
              startSoc: activeSession.vehicle.currentSoc,
              eventSource: 'service_provider',
              eventStatus: 'in_progress',
              pricePerkWh: eventData.compensationRate
            };
            
            const [dischargeEvent] = await db
              .insert(v2gDischargeEvents)
              .values(event)
              .returning();
            
            // Send discharge command to device
            const command = {
              command: 'set_discharge_power',
              params: {
                powerKw: event.requestedPowerKw,
                duration: eventData.serviceDuration,
                eventId: dischargeEvent.id,
                serviceType: event.serviceType
              }
            };
            
            this.mqttService.publish(
              formatTopic(`devices/${activeSession.session.deviceId}/commands`),
              JSON.stringify(command)
            );
            
            console.log(`Started V2G discharge event ${dischargeEvent.id} for vehicle ${enrollment.vehicleId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error handling V2G provider event:', error);
    }
  }
  
  // Optimize vehicle charging/discharging schedule
  async optimizeVehicleCharging(
    vehicleId: number,
    deviceId: number,
    mode: V2GOptimizationMode,
    sessionId?: number
  ): Promise<V2GOptimizationResult | null> {
    try {
      // Get vehicle data
      const [vehicle] = await db
        .select()
        .from(evVehicles)
        .where(eq(evVehicles.id, vehicleId));
      
      if (!vehicle) {
        console.error(`Vehicle ${vehicleId} not found for V2G optimization`);
        return null;
      }
      
      if (!vehicle.bidirectionalCapable) {
        console.error(`Vehicle ${vehicleId} is not bidirectional capable`);
        return null;
      }
      
      // Get device data
      const [deviceData] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
      
      if (!deviceData) {
        console.error(`Device ${deviceId} not found for V2G optimization`);
        return null;
      }
      
      // Get site data for grid connection and pricing
      const [siteData] = await db
        .select()
        .from(sites)
        .where(eq(sites.id, deviceData.siteId));
      
      if (!siteData) {
        console.error(`Site not found for device ${deviceId}`);
        return null;
      }
      
      // Get session if exists
      let sessionData;
      if (sessionId) {
        const [session] = await db
          .select()
          .from(evChargingSessions)
          .where(eq(evChargingSessions.id, sessionId));
        sessionData = session;
      } else {
        // Try to find active session
        const [activeSession] = await db
          .select()
          .from(evChargingSessions)
          .where(and(
            eq(evChargingSessions.vehicleId, vehicleId),
            eq(evChargingSessions.deviceId, deviceId),
            isNull(evChargingSessions.endTime)
          ));
        sessionData = activeSession;
      }
      
      // Set up constraints
      const constraints: V2GConstraints = {
        minSoc: vehicle.minSocLimit ? Number(vehicle.minSocLimit) : 20,
        maxSoc: vehicle.maxSocLimit ? Number(vehicle.maxSocLimit) : 90,
        initialSoc: vehicle.currentSoc ? Number(vehicle.currentSoc) : 50,
        maxDischargeRateKw: vehicle.maxDischargingRateKw ? Number(vehicle.maxDischargingRateKw) : 7,
        maxChargeRateKw: vehicle.maxChargingRateKw ? Number(vehicle.maxChargingRateKw) : 11,
        batteryCapacityKwh: vehicle.batteryCapacityKwh ? Number(vehicle.batteryCapacityKwh) : 60,
        prioritizeHomeConsumption: true,
        v2gEnabled: true,
        v2hEnabled: true
      };
      
      // Check for active enrollments to determine V2G service availability
      const activeEnrollments = await db
        .select()
        .from(v2gServiceEnrollments)
        .leftJoin(
          v2gServiceProviders, 
          eq(v2gServiceEnrollments.serviceProviderId, v2gServiceProviders.id)
        )
        .where(and(
          eq(v2gServiceEnrollments.vehicleId, vehicleId),
          eq(v2gServiceEnrollments.status, 'active')
        ));
      
      // V2G service data for optimization
      const v2gServices = activeEnrollments.map(e => ({
        enrollmentId: e.v2g_service_enrollments.id,
        serviceType: e.v2g_service_providers?.serviceType,
        pricePerKwh: e.v2g_service_providers?.pricePerKwh ? 
          Number(e.v2g_service_providers.pricePerKwh) : undefined,
        availableTimeStart: e.v2g_service_providers?.availableTimeStart,
        availableTimeEnd: e.v2g_service_providers?.availableTimeEnd,
        minSocLimit: e.v2g_service_enrollments.minSocLimit ? 
          Number(e.v2g_service_enrollments.minSocLimit) : undefined,
        maxPowerKw: e.v2g_service_enrollments.maxPowerKw ? 
          Number(e.v2g_service_enrollments.maxPowerKw) : undefined
      }));
      
      // If we have a min SoC override from enrollments, use the highest value
      if (v2gServices.length > 0) {
        const highestMinSoc = Math.max(
          constraints.minSoc,
          ...v2gServices
            .filter(s => s.minSocLimit !== undefined && s.minSocLimit !== null)
            .map(s => s.minSocLimit || 0)
        );
        constraints.minSoc = highestMinSoc;
      }
      
      // Call the appropriate optimization method based on mode
      let result: V2GOptimizationResult;
      
      if (mode === 'v2g_revenue') {
        // Optimize for revenue generation
        result = await this.optimizeForRevenue(
          vehicleId, 
          deviceId, 
          constraints, 
          v2gServices
        );
      } else if (mode === 'cost_saving') {
        // Optimize for cost saving
        result = await this.optimizeForCostSaving(
          vehicleId, 
          deviceId,
          constraints,
          siteData.id
        );
      } else if (mode === 'self_sufficiency') {
        // Optimize for self-sufficiency
        result = await this.optimizeForSelfSufficiency(
          vehicleId,
          deviceId,
          constraints, 
          siteData.id
        );
      } else if (mode === 'carbon_reduction') {
        // Optimize for carbon reduction
        result = await this.optimizeForCarbonReduction(
          vehicleId, 
          deviceId,
          constraints
        );
      } else {
        // Default optimization using AI
        result = await this.optimizeUsingAI(
          vehicleId, 
          deviceId,
          mode, 
          constraints, 
          v2gServices
        );
      }
      
      // If we have a session, update the charging mode
      if (sessionData) {
        await db
          .update(evChargingSessions)
          .set({
            chargingMode: 'bidirectional_optimized',
            bidirectionalEnabled: true,
            updatedAt: new Date()
          })
          .where(eq(evChargingSessions.id, sessionData.id));
      }
      
      // Send commands to the device with the new schedule
      await this.sendScheduleToDevice(deviceId, result);
      
      return result;
    } catch (error) {
      console.error('Error in V2G optimization:', error);
      return null;
    }
  }
  
  // Optimize charging/discharging for revenue generation
  private async optimizeForRevenue(
    vehicleId: number,
    deviceId: number,
    constraints: V2GConstraints,
    v2gServices: any[]
  ): Promise<V2GOptimizationResult> {
    // Calculate 24-hour schedule with 15-minute intervals
    const now = new Date();
    const schedule: V2GScheduleSlot[] = [];
    
    // Get electricity prices for next 24 hours if available
    // This is a simplified version - in a real system we would fetch actual prices
    const priceData = this.generateSamplePrices(now, 96);
    
    // Find peak price periods for discharging and low price periods for charging
    const peakPricePeriods = this.findPeakPricePeriods(priceData, 10);
    const lowPricePeriods = this.findLowPricePeriods(priceData, 10);
    
    // Generate initial schedule
    let currentSoc = constraints.initialSoc;
    let totalDischargeKwh = 0;
    let totalChargeKwh = 0;
    let totalRevenue = 0;
    let totalCostSavings = 0;
    
    // Create 96 time slots (15 min each for 24 hours)
    for (let i = 0; i < 96; i++) {
      const startTime = new Date(now.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const endTime = new Date(now.getTime() + (i + 1) * TIME_INTERVAL * 60 * 1000);
      const price = priceData[i].price;
      const isPeak = peakPricePeriods.includes(i);
      const isLow = lowPricePeriods.includes(i);
      
      // Check if any V2G service is available at this time
      const availableService = this.findAvailableService(v2gServices, startTime);
      
      let powerKw = 0;
      let isV2G = false;
      let isV2H = false;
      
      // If it's a peak period and we have enough battery, discharge to grid (V2G)
      if (isPeak && currentSoc > constraints.minSoc + 10 && availableService) {
        // Discharge to grid for V2G service
        const maxDischarge = Math.min(
          constraints.maxDischargeRateKw, 
          availableService.maxPowerKw || constraints.maxDischargeRateKw
        );
        
        // Calculate how much we can discharge without going below minSoc + buffer
        const dischargeableEnergyKwh = ((currentSoc - constraints.minSoc - 5) / 100) * constraints.batteryCapacityKwh;
        const maxDischargeKwh = maxDischarge * (TIME_INTERVAL / 60);
        const actualDischargeKwh = Math.min(dischargeableEnergyKwh, maxDischargeKwh);
        
        if (actualDischargeKwh > 0) {
          // Negative power for discharging
          powerKw = -actualDischargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socReduction = (actualDischargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc -= socReduction;
          
          // Track discharge amount
          totalDischargeKwh += actualDischargeKwh;
          
          // Calculate revenue
          const revenueRate = availableService.pricePerKwh || price * 1.2; // 20% premium over retail price
          const slotRevenue = actualDischargeKwh * revenueRate;
          totalRevenue += slotRevenue;
          
          isV2G = true;
        }
      } 
      // If it's a low price period and battery isn't full, charge
      else if (isLow && currentSoc < constraints.maxSoc - 5) {
        // Calculate how much we can charge without exceeding maxSoc
        const chargeableEnergyKwh = ((constraints.maxSoc - currentSoc) / 100) * constraints.batteryCapacityKwh;
        const maxChargeKwh = constraints.maxChargeRateKw * (TIME_INTERVAL / 60);
        const actualChargeKwh = Math.min(chargeableEnergyKwh, maxChargeKwh);
        
        if (actualChargeKwh > 0) {
          // Positive power for charging
          powerKw = actualChargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socIncrease = (actualChargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc += socIncrease;
          
          // Track charge amount
          totalChargeKwh += actualChargeKwh;
          
          // Calculate cost
          const chargeCost = actualChargeKwh * price;
          totalCostSavings -= chargeCost;
        }
      }
      
      // Add time slot to schedule
      schedule.push({
        startTime,
        endTime,
        powerKw,
        pricePerKwh: price,
        isV2G,
        isV2H,
        soc: currentSoc
      });
    }
    
    return {
      vehicleId,
      deviceId,
      mode: 'v2g_revenue',
      startTime: now,
      schedule,
      totalDischargeKwh,
      totalChargeKwh,
      totalCostSavings,
      totalRevenue,
      totalCarbonSavings: 0, // Not calculated in this mode
      constraints,
      optimizationMetadata: {
        v2gServices,
        priceData
      }
    };
  }
  
  // Optimize charging/discharging for cost saving
  private async optimizeForCostSaving(
    vehicleId: number,
    deviceId: number,
    constraints: V2GConstraints,
    siteId: number
  ): Promise<V2GOptimizationResult> {
    // This is a simplified implementation - a complete implementation would use site load data
    const now = new Date();
    const schedule: V2GScheduleSlot[] = [];
    
    // Get electricity prices for next 24 hours if available
    const priceData = this.generateSamplePrices(now, 96);
    
    // Get site load forecast if available
    const loadForecast = this.generateSampleLoadForecast(now, 96, siteId);
    
    // Find peak load periods for potential home discharge (V2H)
    const peakLoadPeriods = this.findPeakLoadPeriods(loadForecast, 15);
    
    // Generate initial schedule
    let currentSoc = constraints.initialSoc;
    let totalDischargeKwh = 0;
    let totalChargeKwh = 0;
    let totalCostSavings = 0;
    let totalRevenue = 0;
    
    // Create 96 time slots (15 min each for 24 hours)
    for (let i = 0; i < 96; i++) {
      const startTime = new Date(now.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const endTime = new Date(now.getTime() + (i + 1) * TIME_INTERVAL * 60 * 1000);
      const price = priceData[i].price;
      const load = loadForecast[i].loadKw;
      const isPeakLoad = peakLoadPeriods.includes(i);
      
      let powerKw = 0;
      let isV2G = false;
      let isV2H = false;
      
      // If it's a peak load period and price is high, discharge to home (V2H)
      if (isPeakLoad && currentSoc > constraints.minSoc + 10 && price > 0.15) {
        // Discharge to home (V2H)
        // Calculate how much we can discharge without going below minSoc + buffer
        const dischargeableEnergyKwh = ((currentSoc - constraints.minSoc - 5) / 100) * constraints.batteryCapacityKwh;
        const desiredDischargeKwh = Math.min(load, constraints.maxDischargeRateKw) * (TIME_INTERVAL / 60);
        const actualDischargeKwh = Math.min(dischargeableEnergyKwh, desiredDischargeKwh);
        
        if (actualDischargeKwh > 0) {
          // Negative power for discharging
          powerKw = -actualDischargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socReduction = (actualDischargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc -= socReduction;
          
          // Track discharge amount
          totalDischargeKwh += actualDischargeKwh;
          
          // Calculate cost savings (energy not purchased from grid)
          const costSaving = actualDischargeKwh * price;
          totalCostSavings += costSaving;
          
          isV2H = true;
        }
      } 
      // If price is very low and battery isn't full, charge
      else if (price < 0.1 && currentSoc < constraints.maxSoc - 5) {
        // Calculate how much we can charge without exceeding maxSoc
        const chargeableEnergyKwh = ((constraints.maxSoc - currentSoc) / 100) * constraints.batteryCapacityKwh;
        const maxChargeKwh = constraints.maxChargeRateKw * (TIME_INTERVAL / 60);
        const actualChargeKwh = Math.min(chargeableEnergyKwh, maxChargeKwh);
        
        if (actualChargeKwh > 0) {
          // Positive power for charging
          powerKw = actualChargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socIncrease = (actualChargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc += socIncrease;
          
          // Track charge amount
          totalChargeKwh += actualChargeKwh;
        }
      }
      
      // Add time slot to schedule
      schedule.push({
        startTime,
        endTime,
        powerKw,
        pricePerKwh: price,
        isV2G,
        isV2H,
        soc: currentSoc
      });
    }
    
    return {
      vehicleId,
      deviceId,
      mode: 'cost_saving',
      startTime: now,
      schedule,
      totalDischargeKwh,
      totalChargeKwh,
      totalCostSavings,
      totalRevenue,
      totalCarbonSavings: 0, // Not calculated in this mode
      constraints,
      optimizationMetadata: {
        priceData,
        loadForecast
      }
    };
  }
  
  // Optimize charging/discharging for self-sufficiency
  private async optimizeForSelfSufficiency(
    vehicleId: number,
    deviceId: number,
    constraints: V2GConstraints,
    siteId: number
  ): Promise<V2GOptimizationResult> {
    // This is a simplified implementation - a real implementation would use
    // solar production forecasts, site load forecasts, etc.
    const now = new Date();
    const schedule: V2GScheduleSlot[] = [];
    
    // Get site load forecast
    const loadForecast = this.generateSampleLoadForecast(now, 96, siteId);
    
    // Get solar production forecast
    const solarForecast = this.generateSampleSolarForecast(now, 96, siteId);
    
    // Identify periods of excess solar (for charging) and deficit (for discharging)
    const surplusPeriods: number[] = [];
    const deficitPeriods: number[] = [];
    
    for (let i = 0; i < 96; i++) {
      const netPower = solarForecast[i].powerKw - loadForecast[i].loadKw;
      if (netPower > 1) { // Surplus threshold of 1 kW
        surplusPeriods.push(i);
      } else if (netPower < -1) { // Deficit threshold of 1 kW
        deficitPeriods.push(i);
      }
    }
    
    // Generate schedule
    let currentSoc = constraints.initialSoc;
    let totalDischargeKwh = 0;
    let totalChargeKwh = 0;
    let totalCostSavings = 0;
    
    for (let i = 0; i < 96; i++) {
      const startTime = new Date(now.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const endTime = new Date(now.getTime() + (i + 1) * TIME_INTERVAL * 60 * 1000);
      const solarPower = solarForecast[i].powerKw;
      const load = loadForecast[i].loadKw;
      const netPower = solarPower - load;
      const isSurplus = surplusPeriods.includes(i);
      const isDeficit = deficitPeriods.includes(i);
      
      let powerKw = 0;
      let isV2G = false;
      let isV2H = false;
      
      // If there's surplus solar and battery isn't full, charge from solar
      if (isSurplus && currentSoc < constraints.maxSoc - 5) {
        // Calculate how much we can charge without exceeding maxSoc
        const chargeableEnergyKwh = ((constraints.maxSoc - currentSoc) / 100) * constraints.batteryCapacityKwh;
        const availableSurplusKwh = netPower * (TIME_INTERVAL / 60);
        const maxChargeKwh = constraints.maxChargeRateKw * (TIME_INTERVAL / 60);
        const actualChargeKwh = Math.min(chargeableEnergyKwh, availableSurplusKwh, maxChargeKwh);
        
        if (actualChargeKwh > 0) {
          // Positive power for charging
          powerKw = actualChargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socIncrease = (actualChargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc += socIncrease;
          
          // Track charge amount
          totalChargeKwh += actualChargeKwh;
        }
      } 
      // If there's a deficit and battery has charge, discharge to home
      else if (isDeficit && currentSoc > constraints.minSoc + 5) {
        // Calculate how much we can discharge without going below minSoc + buffer
        const dischargeableEnergyKwh = ((currentSoc - constraints.minSoc - 5) / 100) * constraints.batteryCapacityKwh;
        const deficitEnergyKwh = Math.abs(netPower) * (TIME_INTERVAL / 60);
        const maxDischargeKwh = constraints.maxDischargeRateKw * (TIME_INTERVAL / 60);
        const actualDischargeKwh = Math.min(dischargeableEnergyKwh, deficitEnergyKwh, maxDischargeKwh);
        
        if (actualDischargeKwh > 0) {
          // Negative power for discharging
          powerKw = -actualDischargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socReduction = (actualDischargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc -= socReduction;
          
          // Track discharge amount
          totalDischargeKwh += actualDischargeKwh;
          
          // Estimate cost savings (assume average price of 0.2 per kWh)
          totalCostSavings += actualDischargeKwh * 0.2;
          
          isV2H = true;
        }
      }
      
      // Add time slot to schedule
      schedule.push({
        startTime,
        endTime,
        powerKw,
        isV2G,
        isV2H,
        soc: currentSoc
      });
    }
    
    return {
      vehicleId,
      deviceId,
      mode: 'self_sufficiency',
      startTime: now,
      schedule,
      totalDischargeKwh,
      totalChargeKwh,
      totalCostSavings,
      totalRevenue: 0, // Not applicable in this mode
      totalCarbonSavings: 0, // Not calculated in this mode
      constraints,
      optimizationMetadata: {
        solarForecast,
        loadForecast,
        surplusPeriods,
        deficitPeriods
      }
    };
  }
  
  // Optimize charging/discharging for carbon reduction
  private async optimizeForCarbonReduction(
    vehicleId: number,
    deviceId: number,
    constraints: V2GConstraints
  ): Promise<V2GOptimizationResult> {
    const now = new Date();
    const schedule: V2GScheduleSlot[] = [];
    
    // Get carbon intensity forecast
    const carbonForecast = this.generateSampleCarbonIntensity(now, 96);
    
    // Identify high and low carbon intensity periods
    const highCarbonPeriods = this.findHighCarbonPeriods(carbonForecast, 15);
    const lowCarbonPeriods = this.findLowCarbonPeriods(carbonForecast, 15);
    
    // Generate schedule
    let currentSoc = constraints.initialSoc;
    let totalDischargeKwh = 0;
    let totalChargeKwh = 0;
    let totalCarbonSavings = 0;
    
    for (let i = 0; i < 96; i++) {
      const startTime = new Date(now.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const endTime = new Date(now.getTime() + (i + 1) * TIME_INTERVAL * 60 * 1000);
      const carbonIntensity = carbonForecast[i].intensity;
      const isHighCarbon = highCarbonPeriods.includes(i);
      const isLowCarbon = lowCarbonPeriods.includes(i);
      
      let powerKw = 0;
      let isV2G = false;
      let isV2H = false;
      
      // If it's a low carbon period and battery isn't full, charge
      if (isLowCarbon && currentSoc < constraints.maxSoc - 5) {
        // Calculate how much we can charge without exceeding maxSoc
        const chargeableEnergyKwh = ((constraints.maxSoc - currentSoc) / 100) * constraints.batteryCapacityKwh;
        const maxChargeKwh = constraints.maxChargeRateKw * (TIME_INTERVAL / 60);
        const actualChargeKwh = Math.min(chargeableEnergyKwh, maxChargeKwh);
        
        if (actualChargeKwh > 0) {
          // Positive power for charging
          powerKw = actualChargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socIncrease = (actualChargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc += socIncrease;
          
          // Track charge amount
          totalChargeKwh += actualChargeKwh;
        }
      } 
      // If it's a high carbon period and we have charge, discharge to grid or home
      else if (isHighCarbon && currentSoc > constraints.minSoc + 10) {
        // Calculate how much we can discharge without going below minSoc + buffer
        const dischargeableEnergyKwh = ((currentSoc - constraints.minSoc - 5) / 100) * constraints.batteryCapacityKwh;
        const maxDischargeKwh = constraints.maxDischargeRateKw * (TIME_INTERVAL / 60);
        const actualDischargeKwh = Math.min(dischargeableEnergyKwh, maxDischargeKwh);
        
        if (actualDischargeKwh > 0) {
          // Negative power for discharging
          powerKw = -actualDischargeKwh / (TIME_INTERVAL / 60);
          
          // Update SoC
          const socReduction = (actualDischargeKwh / constraints.batteryCapacityKwh) * 100;
          currentSoc -= socReduction;
          
          // Track discharge amount
          totalDischargeKwh += actualDischargeKwh;
          
          // Calculate carbon savings - this is simplified
          // In reality would depend on grid mix and offsetting
          const carbonSaved = actualDischargeKwh * (carbonIntensity - 50) / 1000; // kg CO2
          totalCarbonSavings += carbonSaved;
          
          // Prioritize V2H if home needs energy, otherwise V2G
          isV2H = true; // Simplified - always assume home can use energy
        }
      }
      
      // Add time slot to schedule
      schedule.push({
        startTime,
        endTime,
        powerKw,
        gridCarbonIntensity: carbonIntensity,
        isV2G,
        isV2H,
        soc: currentSoc
      });
    }
    
    return {
      vehicleId,
      deviceId,
      mode: 'carbon_reduction',
      startTime: now,
      schedule,
      totalDischargeKwh,
      totalChargeKwh,
      totalCostSavings: 0, // Not the focus of this mode
      totalRevenue: 0, // Not the focus of this mode
      totalCarbonSavings,
      constraints,
      optimizationMetadata: {
        carbonForecast,
        highCarbonPeriods,
        lowCarbonPeriods
      }
    };
  }
  
  // Use AI for optimization
  private async optimizeUsingAI(
    vehicleId: number,
    deviceId: number,
    mode: V2GOptimizationMode,
    constraints: V2GConstraints,
    v2gServices: any[]
  ): Promise<V2GOptimizationResult> {
    const now = new Date();
    
    // Get necessary forecasts and data
    const priceData = this.generateSamplePrices(now, 96);
    const carbonForecast = this.generateSampleCarbonIntensity(now, 96);
    
    try {
      // Use the AI optimization service
      const aiResult = await optimizeUsingAI({
        modelName: 'gpt-4o',
        optimizationGoals: {
          primaryGoal: mode,
          secondaryGoals: ['battery_life']
        },
        constraints: {
          ...constraints,
          timeHorizonHours: 24,
          timeIntervalMinutes: TIME_INTERVAL,
          currentTime: now.toISOString()
        },
        forecasts: {
          electricityPrices: priceData.map(p => ({ 
            timestamp: p.time.toISOString(), 
            pricePerKwh: p.price 
          })),
          carbonIntensity: carbonForecast.map(c => ({ 
            timestamp: c.time.toISOString(), 
            gCO2PerKwh: c.intensity 
          }))
        },
        v2gServices: v2gServices.map(s => ({
          serviceType: s.serviceType,
          pricePerKwh: s.pricePerKwh,
          availableTimeStart: s.availableTimeStart,
          availableTimeEnd: s.availableTimeEnd,
          minSocLimit: s.minSocLimit,
          maxPowerKw: s.maxPowerKw
        }))
      });
      
      // Process the AI result and build our schedule format
      let schedule: V2GScheduleSlot[] = [];
      let totalDischargeKwh = 0;
      let totalChargeKwh = 0;
      let totalRevenue = 0;
      let totalCostSavings = 0;
      let totalCarbonSavings = 0;
      
      if (aiResult && aiResult.schedule) {
        for (const slot of aiResult.schedule) {
          const startTime = new Date(slot.startTime);
          const endTime = new Date(slot.endTime);
          const powerKw = slot.powerKw;
          const isV2G = slot.isV2G || false;
          const isV2H = slot.isV2H || false;
          const soc = slot.soc;
          const pricePerKwh = slot.pricePerKwh;
          const gridCarbonIntensity = slot.carbonIntensity;
          
          // Calculate energy
          const durationHours = (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000);
          const energyKwh = Math.abs(powerKw * durationHours);
          
          if (powerKw < 0) {
            // Discharging
            totalDischargeKwh += energyKwh;
            
            // Calculate financial benefit
            if (isV2G && pricePerKwh) {
              // Revenue from V2G
              totalRevenue += energyKwh * pricePerKwh;
            } else if (isV2H && pricePerKwh) {
              // Cost savings from V2H
              totalCostSavings += energyKwh * pricePerKwh;
            }
            
            // Calculate carbon savings if applicable
            if (gridCarbonIntensity && (isV2G || isV2H)) {
              // kg CO2 saved - simplified calculation
              totalCarbonSavings += energyKwh * (gridCarbonIntensity - 50) / 1000;
            }
          } else if (powerKw > 0) {
            // Charging
            totalChargeKwh += energyKwh;
            
            // Calculate charging cost if price available
            if (pricePerKwh) {
              totalCostSavings -= energyKwh * pricePerKwh;
            }
          }
          
          schedule.push({
            startTime,
            endTime,
            powerKw,
            pricePerKwh,
            gridCarbonIntensity,
            isV2G,
            isV2H,
            soc
          });
        }
      } else {
        // If AI optimization failed, use a fallback strategy
        console.log('AI optimization failed, using fallback strategy');
        const fallbackResult = await this.optimizeForRevenue(vehicleId, deviceId, constraints, v2gServices);
        return fallbackResult;
      }
      
      return {
        vehicleId,
        deviceId,
        mode,
        startTime: now,
        schedule,
        totalDischargeKwh,
        totalChargeKwh,
        totalCostSavings,
        totalRevenue,
        totalCarbonSavings,
        constraints,
        optimizationMetadata: {
          aiResult,
          v2gServices,
          priceData,
          carbonForecast
        }
      };
    } catch (error) {
      console.error('Error in AI optimization:', error);
      // Fallback to basic optimization
      return this.optimizeForRevenue(vehicleId, deviceId, constraints, v2gServices);
    }
  }
  
  // Find available V2G service for a given time
  private findAvailableService(services: any[], time: Date): any | null {
    if (!services || services.length === 0) {
      return null;
    }
    
    const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');
    
    for (const service of services) {
      // If no time restrictions, service is available
      if (!service.availableTimeStart || !service.availableTimeEnd) {
        return service;
      }
      
      // Check if current time is within the available time window
      if (this.isTimeInRange(timeStr, service.availableTimeStart, service.availableTimeEnd)) {
        return service;
      }
    }
    
    return null;
  }
  
  // Check if time is within range (handling 24-hour wraparound)
  private isTimeInRange(time: string, rangeStart: string, rangeEnd: string): boolean {
    // Convert to minutes for easy comparison
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(rangeStart);
    const endMinutes = this.timeToMinutes(rangeEnd);
    
    // If start time is less than end time, normal range check
    if (startMinutes <= endMinutes) {
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    } else {
      // Handle wraparound (e.g., 22:00 to 06:00)
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
  }
  
  // Convert time string to minutes from midnight
  private timeToMinutes(time: string): number {
    const parts = time.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  
  // Find periods with peak electricity prices
  private findPeakPricePeriods(priceData: { time: Date; price: number }[], count: number): number[] {
    // Create array of indices with prices
    const pricesWithIndex = priceData.map((p, i) => ({ index: i, price: p.price }));
    
    // Sort by price descending
    pricesWithIndex.sort((a, b) => b.price - a.price);
    
    // Return top indices
    return pricesWithIndex.slice(0, count).map(p => p.index);
  }
  
  // Find periods with low electricity prices
  private findLowPricePeriods(priceData: { time: Date; price: number }[], count: number): number[] {
    // Create array of indices with prices
    const pricesWithIndex = priceData.map((p, i) => ({ index: i, price: p.price }));
    
    // Sort by price ascending
    pricesWithIndex.sort((a, b) => a.price - b.price);
    
    // Return lowest indices
    return pricesWithIndex.slice(0, count).map(p => p.index);
  }
  
  // Find periods with peak load
  private findPeakLoadPeriods(loadData: { time: Date; loadKw: number }[], count: number): number[] {
    // Create array of indices with load
    const loadsWithIndex = loadData.map((p, i) => ({ index: i, load: p.loadKw }));
    
    // Sort by load descending
    loadsWithIndex.sort((a, b) => b.load - a.load);
    
    // Return top indices
    return loadsWithIndex.slice(0, count).map(p => p.index);
  }
  
  // Find periods with high carbon intensity
  private findHighCarbonPeriods(carbonData: { time: Date; intensity: number }[], count: number): number[] {
    // Create array of indices with intensity
    const carbonWithIndex = carbonData.map((p, i) => ({ index: i, intensity: p.intensity }));
    
    // Sort by intensity descending
    carbonWithIndex.sort((a, b) => b.intensity - a.intensity);
    
    // Return top indices
    return carbonWithIndex.slice(0, count).map(p => p.index);
  }
  
  // Find periods with low carbon intensity
  private findLowCarbonPeriods(carbonData: { time: Date; intensity: number }[], count: number): number[] {
    // Create array of indices with intensity
    const carbonWithIndex = carbonData.map((p, i) => ({ index: i, intensity: p.intensity }));
    
    // Sort by intensity ascending
    carbonWithIndex.sort((a, b) => a.intensity - b.intensity);
    
    // Return lowest indices
    return carbonWithIndex.slice(0, count).map(p => p.index);
  }
  
  // Send charging schedule to device
  private async sendScheduleToDevice(deviceId: number, result: V2GOptimizationResult) {
    const command = {
      command: 'set_charging_schedule',
      params: {
        vehicleId: result.vehicleId,
        schedule: result.schedule.map(slot => ({
          startTime: slot.startTime.toISOString(),
          endTime: slot.endTime.toISOString(),
          powerKw: slot.powerKw,
          isV2G: slot.isV2G,
          isV2H: slot.isV2H
        })),
        mode: result.mode
      }
    };
    
    // Send command to device via MQTT
    this.mqttService.publish(
      formatTopic(`devices/${deviceId}/commands`),
      JSON.stringify(command)
    );
    
    console.log(`Sent V2G/V2H schedule to device ${deviceId}`);
  }
  
  // Sample data generator for electricity prices ($/kWh)
  private generateSamplePrices(startTime: Date, count: number): { time: Date; price: number }[] {
    const prices = [];
    const hour = startTime.getHours();
    
    for (let i = 0; i < count; i++) {
      const time = new Date(startTime.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const timeHour = (hour + Math.floor(i * TIME_INTERVAL / 60)) % 24;
      
      // Higher prices during peak hours (7-9am and 6-10pm)
      let price;
      if ((timeHour >= 7 && timeHour < 9) || (timeHour >= 18 && timeHour < 22)) {
        price = 0.25 + Math.random() * 0.1; // 0.25 - 0.35 peak
      } else if (timeHour >= 23 || timeHour < 5) {
        price = 0.08 + Math.random() * 0.04; // 0.08 - 0.12 off-peak night
      } else {
        price = 0.15 + Math.random() * 0.05; // 0.15 - 0.20 normal
      }
      
      prices.push({ time, price });
    }
    
    return prices;
  }
  
  // Sample data generator for site load (kW)
  private generateSampleLoadForecast(startTime: Date, count: number, siteId: number): { time: Date; loadKw: number }[] {
    const forecast = [];
    const hour = startTime.getHours();
    
    // Base load depends on site
    const baseLoad = 2 + (siteId % 5); // 2-6 kW base load
    
    for (let i = 0; i < count; i++) {
      const time = new Date(startTime.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const timeHour = (hour + Math.floor(i * TIME_INTERVAL / 60)) % 24;
      
      // Higher load during morning (7-9am) and evening (6-10pm)
      let load;
      if ((timeHour >= 7 && timeHour < 9)) {
        load = baseLoad + 3 + Math.random() * 2; // Morning peak
      } else if (timeHour >= 18 && timeHour < 22) {
        load = baseLoad + 5 + Math.random() * 3; // Evening peak
      } else if (timeHour >= 23 || timeHour < 5) {
        load = baseLoad + Math.random(); // Night low load
      } else {
        load = baseLoad + 1 + Math.random() * 2; // Normal daytime
      }
      
      forecast.push({ time, loadKw: load });
    }
    
    return forecast;
  }
  
  // Sample data generator for solar production (kW)
  private generateSampleSolarForecast(startTime: Date, count: number, siteId: number): { time: Date; powerKw: number }[] {
    const forecast = [];
    const hour = startTime.getHours();
    
    // Solar capacity depends on site
    const solarCapacity = 4 + (siteId % 7); // 4-10 kW solar
    
    for (let i = 0; i < count; i++) {
      const time = new Date(startTime.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const timeHour = (hour + Math.floor(i * TIME_INTERVAL / 60)) % 24;
      
      // Solar production curve based on hour
      let production = 0;
      if (timeHour >= 6 && timeHour < 20) {
        // Bell curve with peak at midday
        const hourFromNoon = Math.abs(timeHour - 13);
        const factor = Math.max(0, 1 - hourFromNoon / 7);
        production = solarCapacity * factor * (0.8 + Math.random() * 0.2);
      }
      
      forecast.push({ time, powerKw: production });
    }
    
    return forecast;
  }
  
  // Sample data generator for carbon intensity (gCO2/kWh)
  private generateSampleCarbonIntensity(startTime: Date, count: number): { time: Date; intensity: number }[] {
    const forecast = [];
    const hour = startTime.getHours();
    
    for (let i = 0; i < count; i++) {
      const time = new Date(startTime.getTime() + i * TIME_INTERVAL * 60 * 1000);
      const timeHour = (hour + Math.floor(i * TIME_INTERVAL / 60)) % 24;
      
      // Carbon intensity varies with time of day
      // Higher during evening peak (fossil fuels) and lower during midday (solar)
      let intensity;
      if (timeHour >= 18 && timeHour < 22) {
        intensity = 400 + Math.random() * 100; // Evening peak (coal/gas)
      } else if (timeHour >= 10 && timeHour < 16) {
        intensity = 150 + Math.random() * 50; // Midday (solar)
      } else {
        intensity = 250 + Math.random() * 100; // Other times (mixed)
      }
      
      forecast.push({ time, intensity });
    }
    
    return forecast;
  }
}

// Export singleton instance
export const v2gOptimizationService = V2GOptimizationService.getInstance();