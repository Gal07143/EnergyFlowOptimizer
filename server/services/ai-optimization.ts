/**
 * AI Optimization Engine for Energy Management System
 * 
 * This service integrates with OpenAI to provide intelligent optimization
 * for energy usage, storage, and production across the system.
 */

import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optimization modes
export enum OptimizationMode {
  COST_SAVING = 'cost_saving',       // Minimize energy costs
  SELF_SUFFICIENCY = 'self_sufficiency', // Maximize self-consumption
  PEAK_SHAVING = 'peak_shaving',     // Reduce peak demand
  BATTERY_LIFE = 'battery_life',     // Optimize battery longevity
  CO2_REDUCTION = 'co2_reduction',   // Minimize carbon emissions
  GRID_SUPPORT = 'grid_support'      // Support grid stability
}

// Data structure for optimization request
export interface OptimizationRequest {
  siteId: number;
  mode: OptimizationMode;
  timestamp: string;
  timeHorizon: number; // Hours to look ahead
  devices: {
    id: number;
    type: string;
    status: string;
    readings: Record<string, number>;
    constraints?: Record<string, any>;
  }[];
  energyPrices?: {
    current: number;
    forecast: number[];
    unit: string;
  };
  weatherForecast?: {
    temperature: number[];
    solarIrradiance: number[];
    cloudCover: number[];
  };
  gridStatus?: {
    currentLoad: number;
    frequency: number;
    voltageLevel: number;
  };
  carbonIntensity?: {
    current: number;
    forecast: number[];
    unit: string;
  };
  userPreferences?: {
    comfortLevel: number; // 1-5 scale
    priorityDevices: number[];
    schedules: Record<string, any>[];
  };
}

// Data structure for device control recommendation
export interface DeviceControl {
  deviceId: number;
  deviceType: string;
  action: string;
  setpoint?: number;
  schedule?: {
    startTime: string;
    endTime: string;
    value: number;
  }[];
  priority: number; // 1-10 scale, higher is more important
  reasoning: string;
  expectedImpact: {
    energy: number;
    cost: number;
    comfort: number;
    carbon: number;
  };
}

// Optimization result structure
export interface OptimizationResult {
  id: string;
  timestamp: string;
  siteId: number;
  mode: OptimizationMode;
  recommendations: DeviceControl[];
  summary: {
    estimatedSavings: number;
    co2Reduction: number;
    peakReduction: number;
    selfConsumption: number;
  };
  explanation: string;
  confidenceScore: number; // 0-1 scale
}

/**
 * Generate an energy optimization plan using AI
 */
export async function generateOptimizationPlan(
  request: OptimizationRequest
): Promise<OptimizationResult> {
  try {
    // Create a detailed prompt for the AI model
    const prompt = createOptimizationPrompt(request);

    // Call OpenAI API with the prompt
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an advanced Energy Management System AI optimizer. 
          Your goal is to create optimal control strategies for energy devices based on the provided data.
          You should provide detailed recommendations that balance the user's selected optimization mode,
          device constraints, energy prices, weather forecasts, and user preferences.
          Format your response as a valid JSON object with the structure defined in the prompt.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    // Parse and validate the response
    const result = JSON.parse(response.choices[0].message.content) as OptimizationResult;
    
    // Add timestamp and request ID if not present
    result.timestamp = result.timestamp || new Date().toISOString();
    result.id = result.id || `opt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    result.siteId = request.siteId;
    result.mode = request.mode;
    
    return result;
  } catch (error) {
    console.error("Error generating optimization plan:", error);
    throw new Error(`Failed to generate optimization plan: ${error.message}`);
  }
}

/**
 * Create a detailed prompt for the AI optimization
 */
function createOptimizationPrompt(request: OptimizationRequest): string {
  // Format the optimization request into a detailed prompt
  const modeDescriptions = {
    [OptimizationMode.COST_SAVING]: "Minimize energy costs by optimizing when energy is consumed, produced, and stored based on electricity prices.",
    [OptimizationMode.SELF_SUFFICIENCY]: "Maximize self-consumption of locally generated energy to reduce grid dependency.",
    [OptimizationMode.PEAK_SHAVING]: "Reduce peak demand charges by minimizing the maximum power drawn from the grid.",
    [OptimizationMode.BATTERY_LIFE]: "Extend battery lifetime by optimizing charging/discharging patterns and avoiding stress factors.",
    [OptimizationMode.CO2_REDUCTION]: "Minimize carbon emissions by optimizing energy usage based on grid carbon intensity.",
    [OptimizationMode.GRID_SUPPORT]: "Support grid stability by responding to grid frequency and voltage signals."
  };

  return `
  ENERGY OPTIMIZATION REQUEST
  ===========================
  Site ID: ${request.siteId}
  Timestamp: ${request.timestamp}
  Time Horizon: ${request.timeHorizon} hours
  
  OPTIMIZATION MODE
  ----------------
  Mode: ${request.mode}
  Description: ${modeDescriptions[request.mode]}
  
  DEVICES
  -------
  ${request.devices.map(device => `
  Device ID: ${device.id}
  Type: ${device.type}
  Status: ${device.status}
  Readings: ${JSON.stringify(device.readings)}
  Constraints: ${device.constraints ? JSON.stringify(device.constraints) : "None"}
  `).join('\n')}
  
  ENERGY PRICES
  ------------
  ${request.energyPrices ? `
  Current: ${request.energyPrices.current} ${request.energyPrices.unit}
  Forecast: ${JSON.stringify(request.energyPrices.forecast)}
  ` : "No price data available"}
  
  WEATHER FORECAST
  --------------
  ${request.weatherForecast ? `
  Temperature: ${JSON.stringify(request.weatherForecast.temperature)}
  Solar Irradiance: ${JSON.stringify(request.weatherForecast.solarIrradiance)}
  Cloud Cover: ${JSON.stringify(request.weatherForecast.cloudCover)}
  ` : "No weather data available"}
  
  GRID STATUS
  ----------
  ${request.gridStatus ? `
  Current Load: ${request.gridStatus.currentLoad}
  Frequency: ${request.gridStatus.frequency}
  Voltage Level: ${request.gridStatus.voltageLevel}
  ` : "No grid status data available"}
  
  CARBON INTENSITY
  --------------
  ${request.carbonIntensity ? `
  Current: ${request.carbonIntensity.current} ${request.carbonIntensity.unit}
  Forecast: ${JSON.stringify(request.carbonIntensity.forecast)}
  ` : "No carbon intensity data available"}
  
  USER PREFERENCES
  --------------
  ${request.userPreferences ? `
  Comfort Level: ${request.userPreferences.comfortLevel}
  Priority Devices: ${JSON.stringify(request.userPreferences.priorityDevices)}
  Schedules: ${JSON.stringify(request.userPreferences.schedules)}
  ` : "No user preference data available"}
  
  REQUIRED OUTPUT FORMAT
  --------------------
  Please provide an optimization result in the following JSON format:
  {
    "id": "string",
    "timestamp": "ISO date string",
    "siteId": number,
    "mode": "optimization mode string",
    "recommendations": [
      {
        "deviceId": number,
        "deviceType": "string",
        "action": "string",
        "setpoint": number,
        "schedule": [
          {
            "startTime": "ISO date string",
            "endTime": "ISO date string",
            "value": number
          }
        ],
        "priority": number,
        "reasoning": "string",
        "expectedImpact": {
          "energy": number,
          "cost": number,
          "comfort": number,
          "carbon": number
        }
      }
    ],
    "summary": {
      "estimatedSavings": number,
      "co2Reduction": number,
      "peakReduction": number,
      "selfConsumption": number
    },
    "explanation": "string",
    "confidenceScore": number
  }
  `;
}

/**
 * Get personalized energy insights using AI
 */
export async function getEnergyInsights(
  siteId: number,
  deviceData: any[],
  consumptionHistory: any[],
  timeframe: string = 'week'
): Promise<any> {
  try {
    // Prepare the data for analysis
    const prompt = `
    ENERGY INSIGHTS REQUEST
    ======================
    Site ID: ${siteId}
    Timeframe: ${timeframe}
    
    DEVICE DATA
    -----------
    ${JSON.stringify(deviceData, null, 2)}
    
    CONSUMPTION HISTORY
    ------------------
    ${JSON.stringify(consumptionHistory, null, 2)}
    
    Please analyze this energy data and provide the following insights in JSON format:
    1. Consumption patterns and trends
    2. Anomalies or unexpected usage
    3. Energy saving opportunities
    4. Device optimization recommendations
    5. Comparative analysis with similar properties
    6. Seasonal adjustments recommended
    7. Peak usage analysis
    8. Renewable energy utilization assessment
    
    FORMAT YOUR RESPONSE AS A VALID JSON OBJECT with the insights clearly categorized.
    `;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an energy analytics expert providing detailed insights on energy consumption patterns and optimization opportunities."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating energy insights:", error);
    throw new Error(`Failed to generate energy insights: ${error.message}`);
  }
}

/**
 * Runs reinforcement learning for optimization improvement
 */
export async function runReinforcementLearning(
  historicalOptimizations: OptimizationResult[], 
  actualOutcomes: any[]
): Promise<any> {
  try {
    // Combine the historical optimization plans with actual outcomes
    const trainingData = historicalOptimizations.map((opt, index) => ({
      optimization: opt,
      actualOutcome: actualOutcomes[index] || null
    }));

    const prompt = `
    REINFORCEMENT LEARNING REQUEST
    ============================
    Training data set size: ${trainingData.length} optimization cycles
    
    HISTORICAL OPTIMIZATION AND OUTCOMES
    ----------------------------------
    ${JSON.stringify(trainingData.slice(0, 3), null, 2)}
    ... (more data truncated for brevity)
    
    Please analyze this historical data of energy optimization plans and their actual outcomes.
    Identify patterns of success and failure, and provide recommendations for improving the 
    optimization algorithm. Focus on the relationship between recommendations and actual outcomes.
    
    FORMAT YOUR RESPONSE AS A VALID JSON OBJECT with the following structure:
    {
      "patterns": {
        "successful": [list of successful patterns],
        "unsuccessful": [list of unsuccessful patterns]
      },
      "learningInsights": [list of key insights],
      "algorithmImprovements": [list of specific algorithm improvements],
      "parameterAdjustments": {
        [parameter]: {
          "currentValue": value,
          "recommendedValue": value,
          "reasoning": "explanation"
        }
      },
      "confidenceScore": number between 0-1
    }
    `;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI reinforcement learning expert specializing in energy optimization algorithms. Your task is to analyze historical optimizations and their outcomes to improve future optimizations."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error running reinforcement learning:", error);
    throw new Error(`Failed to run reinforcement learning: ${error.message}`);
  }
}

/**
 * Generate load forecasts using AI and historical data
 */
export async function generateLoadForecast(
  siteId: number,
  historicalData: any[],
  forecastHorizon: number,
  externalFactors?: any
): Promise<any> {
  try {
    const prompt = `
    LOAD FORECAST REQUEST
    ====================
    Site ID: ${siteId}
    Forecast Horizon: ${forecastHorizon} hours
    
    HISTORICAL DATA
    --------------
    ${JSON.stringify(historicalData.slice(-24), null, 2)}
    ... (more historical data available but truncated for brevity)
    
    EXTERNAL FACTORS
    ---------------
    ${externalFactors ? JSON.stringify(externalFactors, null, 2) : "No external factors provided"}
    
    Please generate a detailed load forecast for the specified site and forecast horizon.
    Take into account historical patterns, time of day, day of week, seasonal factors,
    and any external factors provided.
    
    FORMAT YOUR RESPONSE AS A VALID JSON OBJECT with the following structure:
    {
      "siteId": number,
      "generatedAt": "ISO date string",
      "forecastHorizon": number,
      "intervals": [
        {
          "startTime": "ISO date string",
          "endTime": "ISO date string",
          "predictedLoad": number,
          "confidenceInterval": {
            "lower": number,
            "upper": number
          },
          "factors": {
            "timeOfDay": number,
            "dayOfWeek": number,
            "seasonality": number,
            "weather": number,
            "other": number
          }
        }
      ],
      "aggregates": {
        "minLoad": number,
        "maxLoad": number,
        "averageLoad": number,
        "peakTime": "ISO date string",
        "totalEnergy": number
      },
      "anomalies": [
        {
          "time": "ISO date string",
          "description": "string",
          "severity": number
        }
      ],
      "confidenceScore": number,
      "methodology": "string"
    }
    `;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an energy load forecasting expert. Your task is to generate accurate energy load forecasts based on historical data and external factors."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating load forecast:", error);
    throw new Error(`Failed to generate load forecast: ${error.message}`);
  }
}

// Initialize the AI optimization service
export function initAiOptimizationService(): void {
  console.log("AI Optimization Service initialized");
}

export default {
  generateOptimizationPlan,
  getEnergyInsights,
  runReinforcementLearning,
  generateLoadForecast,
  initAiOptimizationService,
  OptimizationMode
};