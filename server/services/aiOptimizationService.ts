import { db } from '../db';
import { getMqttService } from './mqttService';
import { OpenAI } from 'openai';
import { eq } from 'drizzle-orm';
import { sites, devices, deviceReadings, energyReadings, optimizationSettings, tariffs } from '@shared/schema';

// Define the optimization modes
type OptimizationMode = 'cost_saving' | 'self_sufficiency' | 'peak_shaving' | 'carbon_reduction' | 'battery_life';

// Define the optimization strategy
interface OptimizationStrategy {
  mode: OptimizationMode;
  priority: number; // 1-10 where 10 is highest priority
  constraints?: {
    minBatterySoC?: number; // Minimum battery state of charge to maintain
    maxGridImport?: number; // Maximum power to import from grid
    evChargeBy?: string; // Time by which EV should be charged
    reserveCapacity?: number; // Battery capacity to reserve for outages
  };
}

// Define the optimization state
interface OptimizationState {
  timestamp: string;
  siteId: number;
  batteryStateOfCharge: number;
  solarProduction: number;
  gridImport: number;
  gridExport: number;
  homeConsumption: number;
  batteryChargePower: number;
  batteryDischargePower: number;
  evChargingPower: number;
  gridElectricityPrice: number;
  feedInTariff: number;
  forecastedSolarProduction: number[];
  forecastedHomeConsumption: number[];
  forecastedGridPrices: number[];
}

// Define the action space
interface OptimizationAction {
  batteryChargePower: number; // Positive value for charging
  batteryDischargePower: number; // Positive value for discharging
  evChargePower: number;
  heatPumpPower: number;
  deferredLoads: {
    id: number;
    start: boolean;
  }[];
}

// Define the optimization result
interface OptimizationResult {
  timestamp: string;
  siteId: number;
  actions: OptimizationAction;
  projectedSavings: number;
  confidence: number;
  reasoning: string;
  id?: string; // Unique identifier for tracking
}

// Define feedback data for reinforcement learning
interface OptimizationFeedback {
  optimizationId: string;
  timestamp: string;
  actualSavings: number;
  success: boolean;
  metrics: {
    costReduction?: number;
    selfConsumption?: number;
    peakReduction?: number;
    batteryHealth?: number;
    carbonReduction?: number;
    userComfort?: number;
  };
}

// Class for AI-driven optimization service
export class AIOptimizationService {
  private openai: OpenAI | null = null;
  private isInitialized = false;
  private lastOptimizations: Map<number, OptimizationResult> = new Map();
  
  constructor() {
    this.initOpenAI();
  }
  
  private initOpenAI() {
    try {
      // Initialize OpenAI API if key is available
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.isInitialized = true;
        console.log('AI Optimization Service initialized with OpenAI');
      } else {
        console.log('OpenAI API key not found. Running in simulation mode.');
      }
    } catch (error) {
      console.error('Failed to initialize OpenAI:', error);
    }
  }
  
  // Get current state for a site
  private async getCurrentState(siteId: number): Promise<OptimizationState | null> {
    try {
      // Fetch the site to verify it exists
      const [siteData] = await db.select().from(sites).where(eq(sites.id, siteId));
      if (!siteData) {
        console.error(`Site ${siteId} not found`);
        return null;
      }
      
      // Get device readings from the last hour
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Get all devices for the site
      const siteDevices = await db.select().from(devices).where(eq(devices.siteId, siteId));
      
      // Get the latest readings for each device type
      let batteryDevice = siteDevices.find(d => d.type === 'battery_storage');
      let solarDevice = siteDevices.find(d => d.type === 'solar_pv');
      let evChargerDevice = siteDevices.find(d => d.type === 'ev_charger');
      let smartMeterDevice = siteDevices.find(d => d.type === 'smart_meter');
      
      // Get battery readings
      let batteryStateOfCharge = 0;
      let batteryChargePower = 0;
      let batteryDischargePower = 0;
      
      if (batteryDevice) {
        const latestBatteryReadings = await db.select()
          .from(deviceReadings)
          .where(eq(deviceReadings.deviceId, batteryDevice.id))
          .orderBy(deviceReadings.timestamp);
        
        const latestBatteryReading = latestBatteryReadings.length > 0 ? latestBatteryReadings[latestBatteryReadings.length - 1] : null;
        
        if (latestBatteryReading) {
          batteryStateOfCharge = Number(latestBatteryReading.stateOfCharge) || 0;
          // Determine charge/discharge based on power value (positive = charge, negative = discharge)
          const power = Number(latestBatteryReading.power) || 0;
          if (power > 0) {
            batteryChargePower = power;
            batteryDischargePower = 0;
          } else {
            batteryChargePower = 0;
            batteryDischargePower = Math.abs(power);
          }
        }
      }
      
      // Get solar readings
      let solarProduction = 0;
      if (solarDevice) {
        const solarReadings = await db.select()
          .from(deviceReadings)
          .where(eq(deviceReadings.deviceId, solarDevice.id))
          .orderBy(deviceReadings.timestamp);
          
        const latestSolarReading = solarReadings.length > 0 ? solarReadings[solarReadings.length - 1] : null;
        
        if (latestSolarReading) {
          solarProduction = Number(latestSolarReading.power) || 0;
        }
      }
      
      // Get EV charger readings
      let evChargingPower = 0;
      if (evChargerDevice) {
        const evReadings = await db.select()
          .from(deviceReadings)
          .where(eq(deviceReadings.deviceId, evChargerDevice.id))
          .orderBy(deviceReadings.timestamp);
          
        const latestEVReading = evReadings.length > 0 ? evReadings[evReadings.length - 1] : null;
        
        if (latestEVReading) {
          evChargingPower = Number(latestEVReading.power) || 0;
        }
      }
      
      // Get smart meter readings
      let gridImport = 0;
      let gridExport = 0;
      let homeConsumption = 0;
      
      if (smartMeterDevice) {
        const meterReadings = await db.select()
          .from(deviceReadings)
          .where(eq(deviceReadings.deviceId, smartMeterDevice.id))
          .orderBy(deviceReadings.timestamp);
          
        const latestMeterReading = meterReadings.length > 0 ? meterReadings[meterReadings.length - 1] : null;
        
        if (latestMeterReading && latestMeterReading.additionalData) {
          const meterData = latestMeterReading.additionalData as any;
          gridImport = meterData.importPower || 0;
          gridExport = meterData.exportPower || 0;
          
          // Calculate home consumption: solar + grid import - battery charging - grid export
          homeConsumption = solarProduction + gridImport - batteryChargePower - gridExport;
          if (homeConsumption < 0) homeConsumption = 0; // Safety check
        }
      }
      
      // Get energy tariff information
      const energyData = await db.select()
        .from(energyReadings)
        .where(eq(energyReadings.siteId, siteId))
        .orderBy(energyReadings.timestamp);
        
      const siteEnergyData = energyData.length > 0 ? energyData[energyData.length - 1] : null;
      
      let gridElectricityPrice = 0.15; // Default price
      let feedInTariff = 0.05; // Default feed-in tariff
      
      // Try to get tariff information from the site or use defaults
      try {
        const [tariff] = await db.select()
          .from(tariffs)
          .where(eq(tariffs.siteId, siteId));
          
        if (tariff) {
          gridElectricityPrice = Number(tariff.importRate) || gridElectricityPrice;
          feedInTariff = Number(tariff.exportRate) || feedInTariff;
        }
      } catch (error) {
        console.error('Error fetching tariff data:', error);
        // Continue with default values
      }
      
      // Forecasts would be fetched from forecasting service
      // Here we create simplified placeholders
      const forecastedSolarProduction: number[] = new Array(24).fill(0);
      const forecastedHomeConsumption: number[] = new Array(24).fill(0);
      const forecastedGridPrices: number[] = new Array(24).fill(0);
      
      // Construct the state
      const state: OptimizationState = {
        timestamp: new Date().toISOString(),
        siteId,
        batteryStateOfCharge,
        solarProduction,
        gridImport,
        gridExport,
        homeConsumption,
        batteryChargePower,
        batteryDischargePower,
        evChargingPower,
        gridElectricityPrice,
        feedInTariff,
        forecastedSolarProduction,
        forecastedHomeConsumption,
        forecastedGridPrices
      };
      
      return state;
    } catch (error) {
      console.error('Error getting current state:', error);
      return null;
    }
  }
  
  // Get optimization strategy for a site
  private async getOptimizationStrategy(siteId: number): Promise<OptimizationStrategy | null> {
    try {
      const [settings] = await db.select()
        .from(optimizationSettings)
        .where(eq(optimizationSettings.siteId, siteId));
      
      if (!settings) {
        // Return default strategy
        return {
          mode: 'cost_saving',
          priority: 5,
          constraints: {
            minBatterySoC: 20,
            reserveCapacity: 10
          }
        };
      }
      
      return {
        mode: settings.mode as OptimizationMode,
        priority: settings.priority || 5,
        constraints: settings.constraints as any || {}
      };
    } catch (error) {
      console.error('Error getting optimization strategy:', error);
      return null;
    }
  }
  
  // Run the AI optimization
  private async runAIOptimization(state: OptimizationState, strategy: OptimizationStrategy): Promise<OptimizationResult | null> {
    if (!this.isInitialized || !this.openai) {
      // Use rule-based fallback if OpenAI is not available
      return this.runRuleBasedOptimization(state, strategy);
    }
    
    try {
      // Format the prompt for OpenAI
      const prompt = this.createOptimizationPrompt(state, strategy);
      
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an advanced energy management AI that optimizes battery storage, EV charging, and flexible loads based on real-time data and forecasts. Provide specific numerical actions based on the energy state and optimization goals. Output response in JSON format."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse the response
      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        console.error('Empty response from OpenAI');
        return this.runRuleBasedOptimization(state, strategy);
      }
      
      try {
        const aiResponse = JSON.parse(responseContent);
        
        // Format and validate the response
        const result: OptimizationResult = {
          timestamp: new Date().toISOString(),
          siteId: state.siteId,
          actions: {
            batteryChargePower: Math.max(0, Number(aiResponse.actions.batteryChargePower) || 0),
            batteryDischargePower: Math.max(0, Number(aiResponse.actions.batteryDischargePower) || 0),
            evChargePower: Math.max(0, Number(aiResponse.actions.evChargePower) || 0),
            heatPumpPower: Math.max(0, Number(aiResponse.actions.heatPumpPower) || 0),
            deferredLoads: aiResponse.actions.deferredLoads || []
          },
          projectedSavings: Number(aiResponse.projectedSavings) || 0,
          confidence: Number(aiResponse.confidence) || 0.5,
          reasoning: aiResponse.reasoning || 'No reasoning provided'
        };
        
        // For consistent format, ensure we only have one battery power value
        if (result.actions.batteryChargePower > 0 && result.actions.batteryDischargePower > 0) {
          // Keep the larger value, set the other to 0
          if (result.actions.batteryChargePower >= result.actions.batteryDischargePower) {
            result.actions.batteryDischargePower = 0;
          } else {
            result.actions.batteryChargePower = 0;
          }
        }
        
        return result;
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        return this.runRuleBasedOptimization(state, strategy);
      }
    } catch (error) {
      console.error('Error running AI optimization:', error);
      return this.runRuleBasedOptimization(state, strategy);
    }
  }
  
  // Create the optimization prompt based on state and strategy
  private createOptimizationPrompt(state: OptimizationState, strategy: OptimizationStrategy): string {
    // Format constraints into string
    let constraintsText = '';
    if (strategy.constraints) {
      if (strategy.constraints.minBatterySoC !== undefined) {
        constraintsText += `- Maintain battery state of charge above ${strategy.constraints.minBatterySoC}%\n`;
      }
      if (strategy.constraints.maxGridImport !== undefined) {
        constraintsText += `- Keep grid import below ${strategy.constraints.maxGridImport} kW\n`;
      }
      if (strategy.constraints.evChargeBy) {
        constraintsText += `- Ensure EV is charged by ${strategy.constraints.evChargeBy}\n`;
      }
      if (strategy.constraints.reserveCapacity !== undefined) {
        constraintsText += `- Reserve ${strategy.constraints.reserveCapacity}% of battery capacity for outages\n`;
      }
    }
    
    // Create time-of-use pricing text if available
    let pricingText = `Current electricity price: ${state.gridElectricityPrice.toFixed(2)}/kWh\n`;
    pricingText += `Current feed-in tariff: ${state.feedInTariff.toFixed(2)}/kWh\n`;
    
    // Format the prompt
    return `
# Energy System State
- Site ID: ${state.siteId}
- Time: ${new Date(state.timestamp).toLocaleString()}
- Battery state of charge: ${state.batteryStateOfCharge}%
- Current solar production: ${state.solarProduction} kW
- Current home consumption: ${state.homeConsumption} kW
- Grid import: ${state.gridImport} kW
- Grid export: ${state.gridExport} kW
- EV charging: ${state.evChargingPower} kW
- Battery charging: ${state.batteryChargePower} kW
- Battery discharging: ${state.batteryDischargePower} kW

# Pricing Information
${pricingText}

# Optimization Goal
Primary goal: ${this.formatOptimizationMode(strategy.mode)}
Priority level: ${strategy.priority}/10

# Constraints
${constraintsText || 'No specific constraints defined'}

# Task
Based on the current energy state, determine the optimal actions to take for the next hour to meet the specified optimization goal. 
Provide the following in your response:
1. Specific power levels for battery charging/discharging (kW)
2. EV charging power (kW)
3. Any recommendations for deferrable loads
4. Projected savings from these actions
5. Confidence level (0-1) in your recommendation
6. Brief reasoning for your recommendations

Format your response as JSON with the following structure:
{
  "actions": {
    "batteryChargePower": number,
    "batteryDischargePower": number,
    "evChargePower": number,
    "heatPumpPower": number,
    "deferredLoads": [{"id": number, "start": boolean}]
  },
  "projectedSavings": number,
  "confidence": number,
  "reasoning": "string"
}
`;
  }
  
  // Format the optimization mode for the prompt
  private formatOptimizationMode(mode: OptimizationMode): string {
    switch (mode) {
      case 'cost_saving':
        return 'Minimize electricity costs';
      case 'self_sufficiency':
        return 'Maximize self-consumption of solar energy';
      case 'peak_shaving':
        return 'Reduce peak demand from the grid';
      case 'carbon_reduction':
        return 'Minimize carbon emissions';
      case 'battery_life':
        return 'Optimize for battery longevity';
      default:
        return 'Minimize electricity costs';
    }
  }
  
  // Fallback rule-based optimization
  private runRuleBasedOptimization(state: OptimizationState, strategy: OptimizationStrategy): OptimizationResult {
    // Implement rule-based fallback strategy when AI is not available
    let batteryChargePower = 0;
    let batteryDischargePower = 0;
    let evChargePower = 0;
    let projected_savings = 0;
    let reasoning = '';
    
    // Get minimum SoC constraint or use default
    const minSoC = strategy.constraints?.minBatterySoC ?? 20;
    
    // Rule-based logic based on optimization mode
    switch (strategy.mode) {
      case 'cost_saving':
        // Simple time-of-use optimization
        if (state.gridElectricityPrice < 0.10) {
          // Cheap electricity - charge battery if not full
          if (state.batteryStateOfCharge < 90) {
            batteryChargePower = 3000; // Example: 3kW charge rate
            reasoning = 'Charging battery during low-price period';
          }
          // Charge EV during cheap hours too
          evChargePower = 7000; // Example: 7kW charge rate
        } else if (state.gridElectricityPrice > 0.25) {
          // Expensive electricity - discharge battery if above min SoC
          if (state.batteryStateOfCharge > minSoC) {
            batteryDischargePower = 3000;
            reasoning = 'Discharging battery during high-price period';
          }
          // Defer EV charging until cheaper hours
          evChargePower = 0;
        } else {
          // Medium price - use solar excess to charge battery
          if (state.solarProduction > state.homeConsumption && state.batteryStateOfCharge < 90) {
            batteryChargePower = Math.min(3000, state.solarProduction - state.homeConsumption);
            reasoning = 'Charging battery with excess solar production';
          }
          // Charge EV at reduced rate
          evChargePower = 3500;
        }
        
        // Calculate projected savings (simple estimate)
        const baselineCost = state.homeConsumption * state.gridElectricityPrice;
        const optimizedCost = Math.max(0, state.homeConsumption - batteryDischargePower) * state.gridElectricityPrice;
        projected_savings = baselineCost - optimizedCost;
        
        break;
        
      case 'self_sufficiency':
        // Maximize self-consumption
        if (state.solarProduction > state.homeConsumption) {
          // Excess solar - charge battery if not full
          if (state.batteryStateOfCharge < 95) {
            batteryChargePower = Math.min(3000, state.solarProduction - state.homeConsumption);
            reasoning = 'Storing excess solar production in battery';
          }
          // Use remaining excess for EV if available
          const remainingSolar = Math.max(0, state.solarProduction - state.homeConsumption - batteryChargePower);
          evChargePower = Math.min(7000, remainingSolar);
        } else {
          // Not enough solar - discharge battery to cover deficit if above min SoC
          if (state.batteryStateOfCharge > minSoC) {
            batteryDischargePower = Math.min(3000, state.homeConsumption - state.solarProduction);
            reasoning = 'Using battery to cover energy deficit';
          }
          // Defer EV charging when solar is available
          evChargePower = 0;
        }
        
        // Calculate self-sufficiency improvement (simple estimate)
        const baselineSelfConsumption = Math.min(state.solarProduction, state.homeConsumption) / state.homeConsumption;
        const optimizedSelfConsumption = Math.min(state.solarProduction + batteryDischargePower, state.homeConsumption) / state.homeConsumption;
        projected_savings = (optimizedSelfConsumption - baselineSelfConsumption) * 100; // Percentage points improvement
        
        break;
        
      case 'peak_shaving':
        // Reduce peak grid loads
        if (state.gridImport > 5) {
          // High grid import - discharge battery to reduce peak
          if (state.batteryStateOfCharge > minSoC) {
            batteryDischargePower = Math.min(3000, state.gridImport - 5);
            reasoning = 'Discharging battery to reduce grid peak';
          }
          // Reduce or pause EV charging during peak
          evChargePower = Math.max(0, state.evChargingPower - 3500);
        } else if (state.gridImport < 2 && state.solarProduction > 1) {
          // Low grid usage - opportunity to charge battery
          if (state.batteryStateOfCharge < 90) {
            batteryChargePower = Math.min(3000, 2 - state.gridImport + state.solarProduction);
            reasoning = 'Charging battery during low grid usage';
          }
          // Allow EV charging at full rate
          evChargePower = 7000;
        }
        
        // Estimate peak reduction savings
        projected_savings = Math.max(0, state.gridImport - Math.max(0, state.gridImport - batteryDischargePower)) * 5; // Rough estimate of peak demand charges
        
        break;
        
      default:
        // Default to battery management with solar priority
        if (state.solarProduction > state.homeConsumption) {
          // Excess solar - charge battery
          if (state.batteryStateOfCharge < 90) {
            batteryChargePower = Math.min(3000, state.solarProduction - state.homeConsumption);
            reasoning = 'Default: Charging battery with excess solar';
          }
        } else if (state.batteryStateOfCharge > minSoC + 10) {
          // Discharge battery if we have capacity above minimum plus buffer
          batteryDischargePower = Math.min(3000, state.homeConsumption - state.solarProduction);
          reasoning = 'Default: Using battery to supplement solar production';
        }
        
        // Set moderate EV charging when possible
        evChargePower = state.solarProduction > 2 ? 5000 : 3000;
        
        projected_savings = Math.max(0, state.gridImport - Math.max(0, state.gridImport - batteryDischargePower)) * state.gridElectricityPrice;
    }
    
    // Apply constraints as override
    if (strategy.constraints) {
      // Ensure minimum SoC is maintained
      if (strategy.constraints.minBatterySoC !== undefined && 
          state.batteryStateOfCharge <= strategy.constraints.minBatterySoC + 5) {
        batteryDischargePower = 0;
        reasoning += ' | Battery discharge restricted due to minimum SoC constraint';
      }
      
      // Ensure maximum grid import
      if (strategy.constraints.maxGridImport !== undefined) {
        const projectedGridImport = state.gridImport + batteryChargePower + evChargePower - state.solarProduction;
        if (projectedGridImport > strategy.constraints.maxGridImport) {
          // Reduce battery charging and EV charging to meet constraint
          const excessImport = projectedGridImport - strategy.constraints.maxGridImport;
          const batteryReduction = Math.min(batteryChargePower, excessImport);
          batteryChargePower -= batteryReduction;
          
          const remainingExcess = excessImport - batteryReduction;
          evChargePower = Math.max(0, evChargePower - remainingExcess);
          
          reasoning += ' | Charging reduced to meet maximum grid import constraint';
        }
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      siteId: state.siteId,
      actions: {
        batteryChargePower: batteryChargePower,
        batteryDischargePower: batteryDischargePower,
        evChargePower: evChargePower,
        heatPumpPower: 0, // Not controlled in rule-based approach
        deferredLoads: [] // Not controlled in rule-based approach
      },
      projectedSavings: projected_savings,
      confidence: 0.7, // Rule-based has moderate confidence
      reasoning: reasoning
    };
  }
  
  // Public method to optimize a site's energy usage
  public async optimizeSite(siteId: number): Promise<OptimizationResult | null> {
    try {
      // Get current state and optimization strategy
      const state = await this.getCurrentState(siteId);
      if (!state) {
        console.error(`Failed to get state for site ${siteId}`);
        return null;
      }
      
      const strategy = await this.getOptimizationStrategy(siteId);
      if (!strategy) {
        console.error(`Failed to get optimization strategy for site ${siteId}`);
        return null;
      }
      
      // Run the optimization
      const result = await this.runAIOptimization(state, strategy);
      
      // Store the result for future reference
      if (result) {
        this.lastOptimizations.set(siteId, result);
        
        // Publish optimization result to MQTT
        try {
          const mqttService = getMqttService();
          mqttService.publish(`sites/${siteId}/optimization`, JSON.stringify(result));
        } catch (mqttErr) {
          console.warn(`Failed to publish optimization result to MQTT: ${mqttErr}`);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error optimizing site ${siteId}:`, error);
      return null;
    }
  }
  
  // Get the last optimization result for a site
  public getLastOptimization(siteId: number): OptimizationResult | null {
    return this.lastOptimizations.get(siteId) || null;
  }
  
  // Apply optimization actions to devices
  public async applyOptimization(siteId: number, result: OptimizationResult): Promise<boolean> {
    try {
      // Get site devices
      const siteDevices = await db.select().from(devices).where(eq(devices.siteId, siteId));
      
      // Find battery, EV charger and heat pump devices
      const batteryDevice = siteDevices.find(d => d.type === 'battery_storage');
      const evChargerDevice = siteDevices.find(d => d.type === 'ev_charger');
      const heatPumpDevice = siteDevices.find(d => d.type === 'heat_pump');
      
      const actions = result.actions;
      
      // Apply battery setpoints
      if (batteryDevice) {
        // Determine charge or discharge mode
        if (actions.batteryChargePower > 0) {
          // Set device to charge mode with power setpoint
          await this.sendDeviceCommand(batteryDevice.id, 'set_charge_power', { power: actions.batteryChargePower });
        } else if (actions.batteryDischargePower > 0) {
          // Set device to discharge mode with power setpoint
          await this.sendDeviceCommand(batteryDevice.id, 'set_discharge_power', { power: actions.batteryDischargePower });
        }
      }
      
      // Apply EV charging setpoints
      if (evChargerDevice && actions.evChargePower >= 0) {
        if (actions.evChargePower > 0) {
          // Set charging power
          await this.sendDeviceCommand(evChargerDevice.id, 'set_charge_power', { power: actions.evChargePower });
        } else {
          // Pause charging
          await this.sendDeviceCommand(evChargerDevice.id, 'pause_charging', {});
        }
      }
      
      // Apply heat pump setpoints
      if (heatPumpDevice && actions.heatPumpPower >= 0) {
        await this.sendDeviceCommand(heatPumpDevice.id, 'set_power', { power: actions.heatPumpPower });
      }
      
      // Apply deferred loads commands if applicable
      for (const load of actions.deferredLoads) {
        // Find the device for this load if it exists
        const loadDevice = siteDevices.find(d => d.id === load.id);
        if (loadDevice) {
          await this.sendDeviceCommand(loadDevice.id, load.start ? 'start' : 'stop', {});
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error applying optimization to site ${siteId}:`, error);
      return false;
    }
  }
  
  // Helper method to send commands to devices
  private async sendDeviceCommand(deviceId: number, command: string, parameters: any): Promise<boolean> {
    try {
      // Get MQTT service
      const mqttService = getMqttService();
      
      // Publish command to device topic
      const topic = `devices/${deviceId}/commands`;
      const payload = {
        command,
        parameters,
        timestamp: new Date().toISOString(),
        messageId: `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      
      mqttService.publish(topic, JSON.stringify(payload));
      console.log(`Sent command to device ${deviceId}: ${command}`);
      return true;
    } catch (error) {
      console.error(`Error sending command to device ${deviceId}:`, error);
      return false;
    }
  }
}

// Singleton instance
let aiOptimizationServiceInstance: AIOptimizationService | null = null;

// Initialize the AI optimization service
export function initAIOptimizationService(): AIOptimizationService {
  if (!aiOptimizationServiceInstance) {
    aiOptimizationServiceInstance = new AIOptimizationService();
  }
  
  return aiOptimizationServiceInstance;
}

// Get the existing AI optimization service instance
export function getAIOptimizationService(): AIOptimizationService {
  if (!aiOptimizationServiceInstance) {
    throw new Error('AI optimization service not initialized. Call initAIOptimizationService first.');
  }
  
  return aiOptimizationServiceInstance;
}