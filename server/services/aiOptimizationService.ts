import { MqttService } from './mqttService';
import { DeviceManagementService } from './deviceManagementService';
import OpenAI from 'openai';
import { db } from '../db';
import { Device } from '@shared/schema';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = 'gpt-4o';

export type OptimizationMode = 
  | 'cost_saving' 
  | 'self_sufficiency' 
  | 'peak_shaving' 
  | 'battery_life';

export interface OptimizationConfig {
  siteId: number;
  mode: OptimizationMode;
  enableRealTimeControl: boolean;
  lookAheadHours: number;
  preferredDevices?: string[];
  constraints?: Record<string, any>;
}

export interface OptimizationResult {
  id: string;
  siteId: number;
  timestamp: string;
  recommendations: DeviceCommand[];
  predictedSavings: number;
  confidenceScore: number;
  reasoning: string;
}

export interface DeviceCommand {
  deviceId: number;
  command: string;
  params: Record<string, any>;
  priority: number;
  scheduledTime?: string;
}

export interface ForecastData {
  siteId: number;
  timestamp: string;
  forecastType: 'generation' | 'consumption' | 'price';
  values: Array<{
    time: string;
    value: number;
    confidence?: number;
  }>;
}

export interface SiteState {
  siteId: number;
  timestamp: string;
  devices: Array<{
    deviceId: number;
    type: string;
    status: string;
    readings: Record<string, number>;
  }>;
  generation: number;
  consumption: number;
  gridImport: number;
  gridExport: number;
  batteryStateOfCharge?: number;
}

export interface OptimizationFeedback {
  optimizationId: string;
  siteId: number;
  timestamp: string;
  actualSavings: number;
  userRating?: number;
  userComments?: string;
  isSuccessful: boolean;
}

// Singleton instance
let aiOptimizationServiceInstance: AIOptimizationService | null = null;

// Get the singleton instance
export function getAIOptimizationService(): AIOptimizationService {
  if (!aiOptimizationServiceInstance) {
    throw new Error('AI Optimization Service not initialized');
  }
  return aiOptimizationServiceInstance;
}

// Initialize the service
export function initAIOptimizationService(): AIOptimizationService {
  const mqttService = require('./mqttService').getMqttService();
  const deviceService = require('./deviceManagementService').getDeviceManagementService();
  
  aiOptimizationServiceInstance = new AIOptimizationService(mqttService, deviceService);
  return aiOptimizationServiceInstance;
}

export class AIOptimizationService {
  private openai: OpenAI;
  private mqttService: MqttService;
  private deviceService: DeviceManagementService;
  private optimizationConfigs: Map<number, OptimizationConfig> = new Map();
  private siteStates: Map<number, SiteState> = new Map();
  private optimizationHistory: Map<string, OptimizationResult> = new Map();
  private feedbackHistory: OptimizationFeedback[] = [];
  private forecastCache: Map<number, ForecastData[]> = new Map();
  private rlModels: Map<string, any> = new Map();

  constructor(mqttService: MqttService, deviceService: DeviceManagementService) {
    this.mqttService = mqttService;
    this.deviceService = deviceService;
    
    // Initialize OpenAI client
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set. AI optimization will use rule-based fallback only.');
    } else {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    // Subscribe to device telemetry and status updates
    this.subscribeToDeviceUpdates();
    
    console.log('AI Optimization Service initialized');
  }

  private subscribeToDeviceUpdates(): void {
    this.mqttService.subscribe('devices/+/telemetry', (topic, message) => {
      const deviceId = parseInt(topic.split('/')[1]);
      const telemetry = JSON.parse(message.toString());
      this.updateSiteState(deviceId, telemetry);
    });

    this.mqttService.subscribe('devices/+/status', (topic, message) => {
      const deviceId = parseInt(topic.split('/')[1]);
      const status = JSON.parse(message.toString());
      this.updateDeviceStatus(deviceId, status);
    });
  }

  private updateSiteState(deviceId: number, telemetry: any): void {
    const device = this.deviceService.getDevice(deviceId);
    if (!device || !device.siteId) return;
    
    const siteId = device.siteId;
    let siteState = this.siteStates.get(siteId);
    
    if (!siteState) {
      siteState = {
        siteId,
        timestamp: new Date().toISOString(),
        devices: [],
        generation: 0,
        consumption: 0,
        gridImport: 0,
        gridExport: 0
      };
      this.siteStates.set(siteId, siteState);
    }
    
    // Update the device readings in the site state
    const deviceIndex = siteState.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex >= 0) {
      siteState.devices[deviceIndex].readings = { 
        ...siteState.devices[deviceIndex].readings, 
        ...telemetry 
      };
    } else {
      siteState.devices.push({
        deviceId,
        type: device.type || 'unknown',
        status: 'online',
        readings: telemetry
      });
    }
    
    // Recalculate site totals
    this.recalculateSiteTotals(siteId);
    
    // Check if optimization should run based on new data
    this.checkAndRunOptimization(siteId);
  }

  private updateDeviceStatus(deviceId: number, status: any): void {
    const device = this.deviceService.getDevice(deviceId);
    if (!device || !device.siteId) return;
    
    const siteId = device.siteId;
    let siteState = this.siteStates.get(siteId);
    
    if (!siteState) {
      // Initialize site state if it doesn't exist
      siteState = {
        siteId,
        timestamp: new Date().toISOString(),
        devices: [],
        generation: 0,
        consumption: 0,
        gridImport: 0,
        gridExport: 0
      };
      this.siteStates.set(siteId, siteState);
    }
    
    // Update device status
    const deviceIndex = siteState.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex >= 0) {
      siteState.devices[deviceIndex].status = status.status;
    } else {
      siteState.devices.push({
        deviceId,
        type: device.type || 'unknown',
        status: status.status,
        readings: {}
      });
    }
  }

  private recalculateSiteTotals(siteId: number): void {
    const siteState = this.siteStates.get(siteId);
    if (!siteState) return;
    
    let totalGeneration = 0;
    let totalConsumption = 0;
    let batteryStateOfCharge = undefined;
    
    // Calculate totals based on device readings
    siteState.devices.forEach(device => {
      if (device.type === 'solar' || device.type === 'solar pv') {
        totalGeneration += device.readings.power || 0;
      } else if (device.type === 'ev charger' || device.type === 'heat pump' || device.type === 'load') {
        totalConsumption += device.readings.power || 0;
      } else if (device.type === 'battery' || device.type === 'battery storage') {
        // Battery can either consume (charging) or generate (discharging)
        if (device.readings.power < 0) {
          totalConsumption += Math.abs(device.readings.power || 0);
        } else {
          totalGeneration += device.readings.power || 0;
        }
        
        // Update battery state of charge
        if (device.readings.soc !== undefined) {
          batteryStateOfCharge = device.readings.soc;
        }
      } else if (device.type === 'smart meter') {
        // Smart meter readings for grid import/export
        if (device.readings.import !== undefined) {
          siteState.gridImport = device.readings.import;
        }
        if (device.readings.export !== undefined) {
          siteState.gridExport = device.readings.export;
        }
      }
    });
    
    // Update site state
    siteState.generation = totalGeneration;
    siteState.consumption = totalConsumption;
    siteState.timestamp = new Date().toISOString();
    if (batteryStateOfCharge !== undefined) {
      siteState.batteryStateOfCharge = batteryStateOfCharge;
    }
  }

  private checkAndRunOptimization(siteId: number): void {
    const config = this.optimizationConfigs.get(siteId);
    if (!config || !config.enableRealTimeControl) return;
    
    // Check if we need to run an optimization (based on changes or scheduled interval)
    // For simplicity, we'll run it every time for now
    this.runOptimization(siteId);
  }

  public async optimizeSite(siteId: number): Promise<OptimizationResult | null> {
    const config = this.optimizationConfigs.get(siteId);
    if (!config) {
      console.error(`No optimization config found for site ${siteId}`);
      return null;
    }
    
    const siteState = this.siteStates.get(siteId);
    if (!siteState) {
      console.error(`No site state available for site ${siteId}`);
      return null;
    }
    
    try {
      // Try AI-based optimization first
      const result = await this.runAIOptimization(siteId, config, siteState);
      
      // Store the result in history
      this.optimizationHistory.set(result.id, result);
      
      // Apply the recommendations if real-time control is enabled
      if (config.enableRealTimeControl) {
        await this.applyOptimizationRecommendations(result);
      }
      
      return result;
    } catch (error) {
      console.error('AI optimization failed, falling back to rule-based approach', error);
      // Fall back to rule-based optimization
      return this.runRuleBasedOptimization(siteId, config, siteState);
    }
  }
  
  public async runOptimization(siteId: number): Promise<OptimizationResult | null> {
    // This is a legacy method, now redirects to optimizeSite
    return this.optimizeSite(siteId);
  }
  
  public getLastOptimization(siteId: number): OptimizationResult | null {
    // Find the most recent optimization for the site
    let latestResult: OptimizationResult | null = null;
    let latestTimestamp = 0;
    
    for (const [id, result] of this.optimizationHistory.entries()) {
      if (result.siteId === siteId) {
        const timestamp = new Date(result.timestamp).getTime();
        if (timestamp > latestTimestamp) {
          latestResult = result;
          latestTimestamp = timestamp;
        }
      }
    }
    
    return latestResult;
  }
  
  public async applyOptimization(siteId: number, result: OptimizationResult): Promise<boolean> {
    try {
      await this.applyOptimizationRecommendations(result);
      return true;
    } catch (error) {
      console.error(`Error applying optimization for site ${siteId}:`, error);
      return false;
    }
  }
  
  public processFeedback(siteId: number, feedback: any): boolean {
    try {
      this.feedbackHistory.push(feedback);
      this.updateReinforcementLearningModel(feedback);
      return true;
    } catch (error) {
      console.error(`Error processing feedback for site ${siteId}:`, error);
      return false;
    }
  }

  private async runAIOptimization(
    siteId: number, 
    config: OptimizationConfig, 
    siteState: SiteState
  ): Promise<OptimizationResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    // Get forecasts for better decision-making
    const forecasts = await this.getForecastsForSite(siteId);
    
    // Get available devices
    const devices = await this.getDevicesForSite(siteId);
    
    // Create prompt for the AI model
    const prompt = this.createOptimizationPrompt(siteId, config, siteState, forecasts, devices);
    
    // Call OpenAI API for optimization
    const response = await this.openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are an Energy Management System optimization engine. You analyze energy usage patterns, device states, and forecasts to provide optimal control recommendations.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500
    });
    
    // Parse and validate the response
    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error('Empty response from AI model');
    }
    
    const aiResponse = JSON.parse(responseContent);
    
    // Apply reinforcement learning improvements if available
    const enhancedRecommendations = this.applyReinforcementLearning(
      config.mode, 
      aiResponse.recommendations, 
      siteState
    );
    
    // Construct the result
    const optimizationResult: OptimizationResult = {
      id: `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      siteId,
      timestamp: new Date().toISOString(),
      recommendations: enhancedRecommendations || aiResponse.recommendations,
      predictedSavings: aiResponse.predictedSavings || 0,
      confidenceScore: aiResponse.confidenceScore || 0.7,
      reasoning: aiResponse.reasoning || 'No reasoning provided'
    };
    
    return optimizationResult;
  }

  private async runRuleBasedOptimization(
    siteId: number, 
    config: OptimizationConfig, 
    siteState: SiteState
  ): Promise<OptimizationResult> {
    // Implement rule-based optimization as a fallback
    const recommendations: DeviceCommand[] = [];
    
    // Basic rules based on optimization mode
    switch (config.mode) {
      case 'cost_saving':
        // Example: If importing from grid and battery available, charge during low-price periods
        const battery = siteState.devices.find(d => d.type === 'battery' || d.type === 'battery storage');
        if (battery && siteState.gridImport > 0 && (battery.readings.soc || 0) < 80) {
          recommendations.push({
            deviceId: battery.deviceId,
            command: 'setChargeLimit',
            params: { limit: 80 },
            priority: 1
          });
        }
        break;
        
      case 'self_sufficiency':
        // Example: If generating excess solar, store in battery
        const solar = siteState.devices.find(d => d.type === 'solar' || d.type === 'solar pv');
        const batteryForSolar = siteState.devices.find(d => d.type === 'battery' || d.type === 'battery storage');
        
        if (solar && batteryForSolar && siteState.generation > siteState.consumption && 
            (batteryForSolar.readings.soc || 0) < 95) {
          recommendations.push({
            deviceId: batteryForSolar.deviceId,
            command: 'setChargeMode',
            params: { mode: 'solar_only' },
            priority: 1
          });
        }
        break;
        
      case 'peak_shaving':
        // Example: If approaching peak usage, use battery to offset
        if (siteState.consumption > 8 && siteState.gridImport > 5) {
          const batteryForPeak = siteState.devices.find(d => d.type === 'battery' || d.type === 'battery storage');
          if (batteryForPeak && (batteryForPeak.readings.soc || 0) > 20) {
            recommendations.push({
              deviceId: batteryForPeak.deviceId,
              command: 'setDischargeRate',
              params: { rate: Math.min(5, siteState.gridImport) },
              priority: 1
            });
          }
          
          // Also reduce non-essential loads if possible
          const evCharger = siteState.devices.find(d => d.type === 'ev charger');
          if (evCharger && (evCharger.readings.power || 0) > 0) {
            recommendations.push({
              deviceId: evCharger.deviceId,
              command: 'setChargingLimit',
              params: { limit: Math.max(6, (evCharger.readings.power || 0) - 2) },
              priority: 2
            });
          }
        }
        break;
        
      case 'battery_life':
        // Example: Keep battery between 20% and 80% for optimal lifespan
        const batteryForLife = siteState.devices.find(d => d.type === 'battery' || d.type === 'battery storage');
        if (batteryForLife) {
          const soc = batteryForLife.readings.soc || 0;
          if (soc < 20) {
            recommendations.push({
              deviceId: batteryForLife.deviceId,
              command: 'setChargeMode',
              params: { mode: 'standard', target: 50 },
              priority: 1
            });
          } else if (soc > 80) {
            recommendations.push({
              deviceId: batteryForLife.deviceId,
              command: 'setDischargeMode',
              params: { mode: 'standard', target: 60 },
              priority: 1
            });
          }
        }
        break;
    }
    
    // Create optimization result
    const optimizationResult: OptimizationResult = {
      id: `opt-rb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      siteId,
      timestamp: new Date().toISOString(),
      recommendations,
      predictedSavings: 0, // Hard to estimate without AI
      confidenceScore: 0.6, // Lower confidence for rule-based approach
      reasoning: `Rule-based optimization applied for ${config.mode} mode. AI optimization was not available.`
    };
    
    return optimizationResult;
  }

  private async getForecastsForSite(siteId: number): Promise<ForecastData[]> {
    // Check cache first
    const cachedForecasts = this.forecastCache.get(siteId);
    if (cachedForecasts) {
      // Check if forecasts are still valid (not older than 1 hour)
      const latestForecast = cachedForecasts[0];
      const forecastAge = Date.now() - new Date(latestForecast.timestamp).getTime();
      
      if (forecastAge < 3600000) { // 1 hour in milliseconds
        return cachedForecasts;
      }
    }
    
    // If no cache or expired, generate new forecasts
    // In a real system, these would come from external APIs or ML models
    const forecasts: ForecastData[] = [];
    
    // Generate sample forecasts
    const now = new Date();
    
    // Solar generation forecast (based on time of day)
    const generationForecast: ForecastData = {
      siteId,
      timestamp: now.toISOString(),
      forecastType: 'generation',
      values: []
    };
    
    // Consumption forecast
    const consumptionForecast: ForecastData = {
      siteId,
      timestamp: now.toISOString(),
      forecastType: 'consumption',
      values: []
    };
    
    // Price forecast
    const priceForecast: ForecastData = {
      siteId,
      timestamp: now.toISOString(),
      forecastType: 'price',
      values: []
    };
    
    // Generate 24 hours of forecasts
    for (let i = 0; i < 24; i++) {
      const forecastTime = new Date(now.getTime() + i * 3600000);
      const hour = forecastTime.getHours();
      
      // Simple solar generation model (peak at noon)
      let solarGeneration = 0;
      if (hour >= 6 && hour <= 18) {
        // Parabolic curve with peak at noon
        const normalizedHour = (hour - 6) / 12; // 0 to 1 from 6am to 6pm
        const curve = 4 * normalizedHour * (1 - normalizedHour); // Parabola with peak of 1 at 0.5
        solarGeneration = 5 * curve; // Scale to max 5 kW
      }
      
      // Simple consumption model with morning and evening peaks
      let consumption = 1; // Base load
      if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 21)) {
        // Morning and evening peaks
        consumption = 3;
      }
      
      // Simple price model with peak pricing in the evening
      let price = 0.10; // Base price
      if (hour >= 16 && hour <= 20) {
        // Evening peak pricing
        price = 0.25;
      } else if (hour >= 22 || hour <= 6) {
        // Nighttime discount
        price = 0.07;
      }
      
      generationForecast.values.push({
        time: forecastTime.toISOString(),
        value: solarGeneration,
        confidence: 0.8 - (i * 0.02) // Decreasing confidence over time
      });
      
      consumptionForecast.values.push({
        time: forecastTime.toISOString(),
        value: consumption,
        confidence: 0.85 - (i * 0.01)
      });
      
      priceForecast.values.push({
        time: forecastTime.toISOString(),
        value: price,
        confidence: 0.9 // Price forecasts often have high confidence
      });
    }
    
    forecasts.push(generationForecast, consumptionForecast, priceForecast);
    
    // Update cache
    this.forecastCache.set(siteId, forecasts);
    
    return forecasts;
  }

  private async getDevicesForSite(siteId: number): Promise<Device[]> {
    try {
      // In a real implementation, this would come from the database
      // For now, use the device service
      return this.deviceService.getDevicesBySite(siteId);
    } catch (error) {
      console.error(`Error getting devices for site ${siteId}:`, error);
      return [];
    }
  }

  private createOptimizationPrompt(
    siteId: number,
    config: OptimizationConfig,
    siteState: SiteState,
    forecasts: ForecastData[],
    devices: Device[]
  ): string {
    // Create a detailed prompt for the AI model with all the context it needs
    return `
Please analyze the current state of energy site ${siteId} and provide optimization recommendations.

Optimization objective: ${config.mode}

Current site state:
- Timestamp: ${siteState.timestamp}
- Total generation: ${siteState.generation} kW
- Total consumption: ${siteState.consumption} kW
- Grid import: ${siteState.gridImport} kW
- Grid export: ${siteState.gridExport} kW
- Battery state of charge: ${siteState.batteryStateOfCharge !== undefined ? `${siteState.batteryStateOfCharge}%` : 'N/A'}

Devices:
${devices.map(device => `- Device ${device.id}: ${device.name} (${device.type}), Status: ${device.status}`).join('\n')}

Current device readings:
${siteState.devices.map(device => {
  const readings = Object.entries(device.readings)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  return `- Device ${device.deviceId} (${device.type}): Status: ${device.status}, Readings: ${readings}`;
}).join('\n')}

Forecasts for the next ${config.lookAheadHours} hours:
${forecasts.map(forecast => {
  const relevantValues = forecast.values.slice(0, config.lookAheadHours);
  return `- ${forecast.forecastType.charAt(0).toUpperCase() + forecast.forecastType.slice(1)} forecast:
  ${relevantValues.map((v, i) => `Hour ${i+1}: ${v.value} (confidence: ${v.confidence || 'N/A'})`).join('\n  ')}`;
}).join('\n')}

Based on the ${config.mode} optimization objective, please provide:
1. A list of recommended device commands with parameters
2. The expected savings or benefits
3. A confidence score for your recommendations
4. Your reasoning for these recommendations

Please respond in the following JSON format:
{
  "recommendations": [
    {
      "deviceId": number,
      "command": string,
      "params": object,
      "priority": number,
      "scheduledTime": string (optional ISO timestamp)
    }
  ],
  "predictedSavings": number,
  "confidenceScore": number,
  "reasoning": string
}
`;
  }

  private applyReinforcementLearning(
    mode: OptimizationMode,
    recommendations: DeviceCommand[],
    siteState: SiteState
  ): DeviceCommand[] | null {
    // Check if we have a RL model for this mode
    const modelKey = `${mode}`;
    const model = this.rlModels.get(modelKey);
    
    if (!model) {
      // No model available, return original recommendations
      return null;
    }
    
    // Apply the model to enhance recommendations
    // This is a placeholder for actual RL implementation
    // In a real system, we would run the recommendations through the model
    
    // For now, just return the original recommendations
    return recommendations;
  }

  private async applyOptimizationRecommendations(result: OptimizationResult): Promise<void> {
    // Sort recommendations by priority
    const sortedRecommendations = [...result.recommendations].sort((a, b) => a.priority - b.priority);
    
    // Apply each recommendation
    for (const recommendation of sortedRecommendations) {
      try {
        // Check if this recommendation has a scheduled time in the future
        if (recommendation.scheduledTime) {
          const scheduledTime = new Date(recommendation.scheduledTime).getTime();
          const now = Date.now();
          
          if (scheduledTime > now) {
            // Schedule this command for later
            const delay = scheduledTime - now;
            setTimeout(() => {
              this.executeDeviceCommand(recommendation);
            }, delay);
            continue;
          }
        }
        
        // Execute immediately
        await this.executeDeviceCommand(recommendation);
      } catch (error) {
        console.error(`Error applying recommendation to device ${recommendation.deviceId}:`, error);
      }
    }
  }

  private async executeDeviceCommand(command: DeviceCommand): Promise<void> {
    // Use the device service to execute the command
    try {
      await this.deviceService.sendCommand(
        command.deviceId,
        command.command,
        command.params
      );
      console.log(`Executed command ${command.command} on device ${command.deviceId}`);
    } catch (error) {
      console.error(`Failed to execute command ${command.command} on device ${command.deviceId}:`, error);
    }
  }

  public setOptimizationConfig(config: OptimizationConfig): void {
    this.optimizationConfigs.set(config.siteId, config);
  }

  public getOptimizationConfig(siteId: number): OptimizationConfig | undefined {
    return this.optimizationConfigs.get(siteId);
  }

  public getSiteState(siteId: number): SiteState | undefined {
    return this.siteStates.get(siteId);
  }

  public getOptimizationHistory(siteId: number): OptimizationResult[] {
    return Array.from(this.optimizationHistory.values())
      .filter(result => result.siteId === siteId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public submitFeedback(feedback: OptimizationFeedback): void {
    // Store feedback for learning
    this.feedbackHistory.push(feedback);
    
    // Update optimization result with actual outcomes
    const result = this.optimizationHistory.get(feedback.optimizationId);
    if (result) {
      // We could update the result here if needed
    }
    
    // This feedback could be used to train the RL model
    this.updateReinforcementLearningModel(feedback);
  }

  private updateReinforcementLearningModel(feedback: OptimizationFeedback): void {
    // Find the original optimization
    const optimization = this.optimizationHistory.get(feedback.optimizationId);
    if (!optimization) return;
    
    // Get or create the RL model for this mode
    const modelKey = `${optimization.siteId}`;
    let model = this.rlModels.get(modelKey);
    
    if (!model) {
      // Initialize a new model
      model = {
        successCount: 0,
        failureCount: 0,
        totalFeedback: 0,
        successfulPatterns: [],
        failedPatterns: []
      };
      this.rlModels.set(modelKey, model);
    }
    
    // Update model statistics
    model.totalFeedback++;
    if (feedback.isSuccessful) {
      model.successCount++;
      
      // Extract patterns from successful optimization
      const pattern = this.extractOptimizationPattern(optimization);
      model.successfulPatterns.push(pattern);
    } else {
      model.failureCount++;
      
      // Extract patterns from failed optimization
      const pattern = this.extractOptimizationPattern(optimization);
      model.failedPatterns.push(pattern);
    }
    
    // For a real RL system, we would train the model here
    console.log(`Updated RL model for site ${optimization.siteId} with new feedback`);
  }

  private extractOptimizationPattern(optimization: OptimizationResult): any {
    // Extract features that might be useful for learning
    // This is a simplified representation of what would happen in a real system
    return {
      deviceCommands: optimization.recommendations.map(r => ({ 
        deviceType: this.deviceService.getDevice(r.deviceId)?.type || 'unknown',
        command: r.command,
        params: r.params
      })),
      timing: {
        hour: new Date(optimization.timestamp).getHours(),
        day: new Date(optimization.timestamp).getDay()
      },
      confidence: optimization.confidenceScore
    };
  }
}