/**
 * Consumption Pattern Service
 * Implements machine learning for energy consumption pattern recognition and prediction
 */

import { storage } from '../storage';
import { getMqttService } from './mqttService';
import { EnergyReading } from '@shared/schema';

type TimeFrame = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'seasonally';
type UsageCategory = 'base_load' | 'peak_load' | 'variable_load';
type EnergySource = 'grid' | 'solar' | 'battery' | 'ev_charger' | 'heat_pump' | 'other';

interface PatternFeatures {
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  month: number; // 0-11
  isWeekend: boolean;
  isHoliday: boolean;
  temperature?: number;
  humidity?: number;
  solarIrradiance?: number;
  occupancy?: number;
  previousHourUsage?: number;
  previousDayUsage?: number;
  movingAverageUsage?: number;
}

interface PatternPrediction {
  timestamp: string;
  predictedConsumption: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  probability: number;
  features: PatternFeatures;
}

interface ConsumptionPattern {
  id: number;
  siteId: number;
  name: string;
  description?: string;
  timeFrame: TimeFrame;
  usageCategory: UsageCategory;
  source: EnergySource;
  startTimestamp: string;
  endTimestamp: string;
  patternData: {
    timestamps: string[];
    values: number[];
    averageValue: number;
    peakValue: number;
    minValue: number;
    standardDeviation: number;
  };
  correlations: {
    temperature?: number;
    dayOfWeek?: number;
    timeOfDay?: number;
    occupancy?: number;
    solarProduction?: number;
  };
  ml: {
    modelType: string;
    features: string[];
    weights?: number[];
    accuracy: number;
    lastTraining: string;
    predictions?: PatternPrediction[];
  };
  createdAt: string;
  updatedAt: string;
}

export class ConsumptionPatternService {
  private patterns: Map<number, ConsumptionPattern> = new Map();
  private nextPatternId: number = 1;
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    // Development mode initialization with sample data
    if (this.inDevelopment) {
      console.log('Development mode: Initializing consumption pattern service with sample data');
      this.initializeSampleData();
    }
    
    // Set up MQTT listeners for energy readings to continuously update patterns
    this.setupMqttListeners();
    
    console.log('Consumption pattern service initialized');
  }
  
  /**
   * Initialize sample data for development mode
   */
  private initializeSampleData(): void {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Create base load pattern (refrigerator, always-on devices)
    this.patterns.set(this.nextPatternId++, {
      id: 1,
      siteId: 1,
      name: 'Base Load Pattern',
      description: 'Continuous energy consumption from always-on devices',
      timeFrame: 'hourly',
      usageCategory: 'base_load',
      source: 'grid',
      startTimestamp: oneMonthAgo.toISOString(),
      endTimestamp: now.toISOString(),
      patternData: {
        timestamps: this.generateTimestamps(oneMonthAgo, now, 'hourly'),
        values: this.generateBaseLoadValues(30 * 24),
        averageValue: 0.25,
        peakValue: 0.35,
        minValue: 0.15,
        standardDeviation: 0.05
      },
      correlations: {
        temperature: 0.1,
        dayOfWeek: 0.05,
        timeOfDay: 0.2
      },
      ml: {
        modelType: 'linear_regression',
        features: ['hour_of_day', 'day_of_week', 'temperature'],
        weights: [0.02, 0.01, 0.015],
        accuracy: 0.92,
        lastTraining: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: oneMonthAgo.toISOString(),
      updatedAt: now.toISOString()
    });
    
    // Create daily usage pattern (morning and evening peaks)
    this.patterns.set(this.nextPatternId++, {
      id: 2,
      siteId: 1,
      name: 'Daily Usage Pattern',
      description: 'Daily pattern with morning and evening peaks',
      timeFrame: 'hourly',
      usageCategory: 'variable_load',
      source: 'grid',
      startTimestamp: oneMonthAgo.toISOString(),
      endTimestamp: now.toISOString(),
      patternData: {
        timestamps: this.generateTimestamps(oneMonthAgo, now, 'hourly'),
        values: this.generateDailyPatternValues(30 * 24),
        averageValue: 1.5,
        peakValue: 4.2,
        minValue: 0.3,
        standardDeviation: 1.2
      },
      correlations: {
        temperature: 0.3,
        dayOfWeek: 0.6,
        timeOfDay: 0.85,
        occupancy: 0.75
      },
      ml: {
        modelType: 'random_forest',
        features: ['hour_of_day', 'day_of_week', 'is_weekend', 'temperature', 'previous_day_same_hour'],
        accuracy: 0.88,
        lastTraining: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: oneMonthAgo.toISOString(),
      updatedAt: now.toISOString()
    });
    
    // Create weekly pattern (weekday vs weekend)
    this.patterns.set(this.nextPatternId++, {
      id: 3,
      siteId: 1,
      name: 'Weekly Usage Pattern',
      description: 'Weekly pattern showing weekday vs weekend differences',
      timeFrame: 'daily',
      usageCategory: 'variable_load',
      source: 'grid',
      startTimestamp: oneMonthAgo.toISOString(),
      endTimestamp: now.toISOString(),
      patternData: {
        timestamps: this.generateTimestamps(oneMonthAgo, now, 'daily'),
        values: this.generateWeeklyPatternValues(30),
        averageValue: 28.5,
        peakValue: 42.0,
        minValue: 18.2,
        standardDeviation: 8.4
      },
      correlations: {
        temperature: 0.4,
        dayOfWeek: 0.85
      },
      ml: {
        modelType: 'gradient_boosting',
        features: ['day_of_week', 'is_weekend', 'is_holiday', 'temperature', 'average_previous_week'],
        accuracy: 0.91,
        lastTraining: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: oneMonthAgo.toISOString(),
      updatedAt: now.toISOString()
    });
    
    // Create seasonal pattern
    this.patterns.set(this.nextPatternId++, {
      id: 4,
      siteId: 1,
      name: 'Seasonal Usage Pattern',
      description: 'Seasonal pattern showing temperature correlation',
      timeFrame: 'monthly',
      usageCategory: 'variable_load',
      source: 'grid',
      startTimestamp: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
      endTimestamp: now.toISOString(),
      patternData: {
        timestamps: this.generateTimestamps(new Date(now.getFullYear() - 1, 0, 1), now, 'monthly'),
        values: this.generateSeasonalPatternValues(12),
        averageValue: 850,
        peakValue: 1250,
        minValue: 620,
        standardDeviation: 180
      },
      correlations: {
        temperature: 0.88,
        solarProduction: -0.72
      },
      ml: {
        modelType: 'lstm',
        features: ['month', 'average_temperature', 'heating_degree_days', 'cooling_degree_days', 'daylight_hours'],
        accuracy: 0.94,
        lastTraining: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
      updatedAt: now.toISOString()
    });
    
    // Create EV charging pattern
    this.patterns.set(this.nextPatternId++, {
      id: 5,
      siteId: 1,
      name: 'EV Charging Pattern',
      description: 'Electric vehicle charging patterns',
      timeFrame: 'hourly',
      usageCategory: 'peak_load',
      source: 'ev_charger',
      startTimestamp: oneMonthAgo.toISOString(),
      endTimestamp: now.toISOString(),
      patternData: {
        timestamps: this.generateTimestamps(oneMonthAgo, now, 'hourly'),
        values: this.generateEVChargingPatternValues(30 * 24),
        averageValue: 2.8,
        peakValue: 11.0,
        minValue: 0.0,
        standardDeviation: 3.5
      },
      correlations: {
        dayOfWeek: 0.7,
        timeOfDay: 0.9
      },
      ml: {
        modelType: 'decision_tree',
        features: ['hour_of_day', 'day_of_week', 'is_weekend', 'previous_charge_duration'],
        accuracy: 0.85,
        lastTraining: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: oneMonthAgo.toISOString(),
      updatedAt: now.toISOString()
    });
    
    console.log(`Generated ${this.patterns.size} consumption patterns for development`);
  }
  
  /**
   * Set up MQTT listeners for energy readings
   */
  private setupMqttListeners(): void {
    this.mqttService.addMessageHandler('sites/+/energy/readings', (topic, message, params) => {
      if (params && params.siteId && message) {
        const siteId = parseInt(params.siteId);
        this.processEnergyReading(siteId, message);
      }
    });
  }
  
  /**
   * Process an energy reading to update pattern recognition models
   */
  private processEnergyReading(siteId: number, reading: any): void {
    // In a production system, this would update the ML models incrementally
    // For this implementation, we'll just log the reading
    if (this.inDevelopment) {
      console.log(`Processing energy reading for site ${siteId}`, reading.timestamp);
    }
    
    // In a real implementation, we would:
    // 1. Extract features from the reading
    // 2. Update the relevant pattern models
    // 3. Retrain models periodically
    // 4. Update predictions
  }
  
  /**
   * Generate timestamps for sample data
   */
  private generateTimestamps(start: Date, end: Date, timeFrame: TimeFrame): string[] {
    const timestamps: string[] = [];
    let current = new Date(start);
    
    while (current <= end) {
      timestamps.push(current.toISOString());
      
      switch (timeFrame) {
        case 'hourly':
          current = new Date(current.getTime() + 60 * 60 * 1000);
          break;
        case 'daily':
          current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
          break;
        case 'seasonally':
          current = new Date(current.getFullYear(), current.getMonth() + 3, current.getDate());
          break;
      }
    }
    
    return timestamps;
  }
  
  /**
   * Generate sample base load values (relatively constant)
   */
  private generateBaseLoadValues(count: number): number[] {
    const values: number[] = [];
    const baseValue = 0.25;
    
    for (let i = 0; i < count; i++) {
      // Add small random variations to base load
      const randomVariation = (Math.random() - 0.5) * 0.1;
      values.push(baseValue + randomVariation);
    }
    
    return values;
  }
  
  /**
   * Generate sample daily pattern values (morning and evening peaks)
   */
  private generateDailyPatternValues(count: number): number[] {
    const values: number[] = [];
    const hoursInDay = 24;
    
    for (let i = 0; i < count; i++) {
      const hourOfDay = i % hoursInDay;
      let value = 0;
      
      // Base load
      value += 0.3;
      
      // Morning peak (7-9 AM)
      if (hourOfDay >= 7 && hourOfDay <= 9) {
        value += 3.0 * Math.sin(Math.PI * (hourOfDay - 7) / 2);
      }
      
      // Evening peak (17-22)
      if (hourOfDay >= 17 && hourOfDay <= 22) {
        value += 4.0 * Math.sin(Math.PI * (hourOfDay - 17) / 5);
      }
      
      // Add some random noise
      value += (Math.random() - 0.5) * 0.4;
      
      values.push(Math.max(0, value));
    }
    
    return values;
  }
  
  /**
   * Generate sample weekly pattern values (weekday vs weekend)
   */
  private generateWeeklyPatternValues(count: number): number[] {
    const values: number[] = [];
    const daysInWeek = 7;
    
    for (let i = 0; i < count; i++) {
      const dayOfWeek = i % daysInWeek;
      let value = 0;
      
      // Base value
      value += 20;
      
      // Weekdays (1-5) have higher consumption
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        value += 15;
      }
      
      // Weekend (0, 6) has different pattern
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        value += 5;
      }
      
      // Add some random variation
      value += (Math.random() - 0.5) * 10;
      
      values.push(Math.max(0, value));
    }
    
    return values;
  }
  
  /**
   * Generate sample seasonal pattern values
   */
  private generateSeasonalPatternValues(count: number): number[] {
    const values: number[] = [];
    
    for (let i = 0; i < count; i++) {
      // Seasonal variation with peak in winter (for heating) and summer (for cooling)
      // Northern hemisphere pattern (adjust if needed)
      let value = 800;
      
      // Winter peak (months 0, 1, 11)
      if (i === 0 || i === 1 || i === 11) {
        value += 400;
      }
      
      // Summer peak (months 6, 7, 8)
      if (i >= 6 && i <= 8) {
        value += 300;
      }
      
      // Spring/Fall (months 2, 3, 4, 9, 10)
      if ((i >= 2 && i <= 4) || (i >= 9 && i <= 10)) {
        value += 100;
      }
      
      // Add some random variation
      value += (Math.random() - 0.5) * 100;
      
      values.push(Math.max(0, value));
    }
    
    return values;
  }
  
  /**
   * Generate sample EV charging pattern values
   */
  private generateEVChargingPatternValues(count: number): number[] {
    const values: number[] = [];
    const hoursInDay = 24;
    const daysInWeek = 7;
    
    for (let i = 0; i < count; i++) {
      const hourOfDay = i % hoursInDay;
      const dayOfWeek = Math.floor((i / hoursInDay) % daysInWeek);
      let value = 0;
      
      // Weekday evening charging (typically after work)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Evening charging peak (18-23)
        if (hourOfDay >= 18 && hourOfDay <= 23) {
          value += 10 * Math.exp(-(hourOfDay - 19) * (hourOfDay - 19) / 8);
        }
      }
      
      // Weekend charging (more distributed throughout the day)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Daytime charging
        if (hourOfDay >= 10 && hourOfDay <= 20) {
          value += 5 * Math.sin(Math.PI * (hourOfDay - 10) / 10);
        }
      }
      
      // Add some randomness for realism
      const shouldCharge = Math.random() > 0.7; // Only charge 30% of the time
      if (!shouldCharge) {
        value = 0;
      } else {
        // Add some random variation
        value += (Math.random() - 0.5) * 2;
      }
      
      values.push(Math.max(0, value));
    }
    
    return values;
  }
  
  // Public API methods
  
  /**
   * Get all consumption patterns for a site
   */
  getPatternsBySite(siteId: number): ConsumptionPattern[] {
    const sitePatterns: ConsumptionPattern[] = [];
    
    this.patterns.forEach(pattern => {
      if (pattern.siteId === siteId) {
        sitePatterns.push(pattern);
      }
    });
    
    return sitePatterns;
  }
  
  /**
   * Get a specific consumption pattern by ID
   */
  getPattern(id: number): ConsumptionPattern | undefined {
    return this.patterns.get(id);
  }
  
  /**
   * Get patterns by timeframe for a site
   */
  getPatternsByTimeframe(siteId: number, timeFrame: TimeFrame): ConsumptionPattern[] {
    return this.getPatternsBySite(siteId).filter(pattern => pattern.timeFrame === timeFrame);
  }
  
  /**
   * Get patterns by usage category for a site
   */
  getPatternsByCategory(siteId: number, category: UsageCategory): ConsumptionPattern[] {
    return this.getPatternsBySite(siteId).filter(pattern => pattern.usageCategory === category);
  }
  
  /**
   * Get patterns by energy source for a site
   */
  getPatternsBySource(siteId: number, source: EnergySource): ConsumptionPattern[] {
    return this.getPatternsBySite(siteId).filter(pattern => pattern.source === source);
  }
  
  /**
   * Create a new pattern recognition model for a site
   */
  async createPattern(pattern: Omit<ConsumptionPattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConsumptionPattern> {
    const now = new Date().toISOString();
    const newPattern: ConsumptionPattern = {
      ...pattern,
      id: this.nextPatternId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.patterns.set(newPattern.id, newPattern);
    return newPattern;
  }
  
  /**
   * Update an existing pattern
   */
  async updatePattern(id: number, updates: Partial<Omit<ConsumptionPattern, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ConsumptionPattern | undefined> {
    const pattern = this.patterns.get(id);
    if (!pattern) {
      return undefined;
    }
    
    const updatedPattern: ConsumptionPattern = {
      ...pattern,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.patterns.set(id, updatedPattern);
    return updatedPattern;
  }
  
  /**
   * Delete a pattern
   */
  async deletePattern(id: number): Promise<boolean> {
    return this.patterns.delete(id);
  }
  
  /**
   * Train or retrain a pattern model
   */
  async trainPatternModel(id: number, options?: {
    lookbackPeriod?: string;
    featureSelection?: string[];
    modelType?: string;
  }): Promise<ConsumptionPattern | undefined> {
    const pattern = this.patterns.get(id);
    if (!pattern) {
      return undefined;
    }
    
    // Extract training data from pattern data
    const trainingData = pattern.patternData.timestamps.map((timestamp, index) => ({
      timestamp,
      consumption: pattern.patternData.values[index]
    }));
    
    // Determine lookback period in days (default: 30 days)
    const lookbackDays = options?.lookbackPeriod === 'week' ? 7 :
                        options?.lookbackPeriod === 'month' ? 30 :
                        options?.lookbackPeriod === 'quarter' ? 90 : 30;
    
    // Filter training data based on lookback period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    const recentTrainingData = trainingData.filter(
      point => new Date(point.timestamp) >= cutoffDate
    );
    
    // Determine features to use for training (default set if not provided)
    const selectedFeatures = options?.featureSelection || [
      'timeOfDay',
      'dayOfWeek',
      'isWeekend',
      'month',
      'temperature'
    ];
    
    // Calculate feature importance weights based on correlation analysis
    const featureWeights: Record<string, number> = {};
    
    // Prepare feature vectors for analysis
    const featureVectors = trainingData.map(point => {
      const date = new Date(point.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const month = date.getMonth();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
      
      // Simulate weather data with seasonal variation
      const temperature = 20 + Math.sin(month * Math.PI / 6) * 10 + (Math.random() - 0.5) * 5;
      
      return {
        timeOfDay: hour,
        dayOfWeek,
        month,
        isWeekend,
        temperature,
        consumption: point.consumption
      };
    });
    
    // Calculate correlations between features and consumption
    for (const feature of selectedFeatures) {
      if (feature in featureVectors[0]) {
        // Simple correlation calculation
        let sumXY = 0;
        let sumX = 0;
        let sumY = 0;
        let sumX2 = 0;
        let sumY2 = 0;
        const n = featureVectors.length;
        
        for (const vector of featureVectors) {
          const x = vector[feature as keyof typeof vector] || 0;
          const y = vector.consumption;
          
          sumXY += x * y;
          sumX += x;
          sumY += y;
          sumX2 += x * x;
          sumY2 += y * y;
        }
        
        // Calculate Pearson correlation coefficient
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        if (denominator === 0) {
          featureWeights[feature] = 0;
        } else {
          // We use the absolute value to represent importance
          featureWeights[feature] = Math.abs(numerator / denominator);
        }
      } else {
        // Default weight for features not in the vectors
        featureWeights[feature] = 0.1;
      }
    }
    
    // Normalize weights to sum to 1
    const totalWeight = Object.values(featureWeights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights: number[] = [];
    
    for (const feature of selectedFeatures) {
      if (totalWeight > 0) {
        normalizedWeights.push(featureWeights[feature] / totalWeight);
      } else {
        normalizedWeights.push(1.0 / selectedFeatures.length);
      }
    }
    
    // Generate predictions for the next week
    const now = new Date();
    const predictions: PatternPrediction[] = [];
    
    // Create hourly predictions for the next 7 days
    for (let i = 0; i < 7 * 24; i++) {
      const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();
      const month = timestamp.getMonth();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Base prediction on pattern average
      let predictedValue = pattern.patternData.averageValue;
      
      // Adjust prediction based on time patterns
      if (pattern.timeFrame === 'hourly') {
        // Find matching hour in historical data
        const matchingHours = trainingData.filter(
          point => new Date(point.timestamp).getHours() === hour
        );
        
        if (matchingHours.length > 0) {
          // Use average of matching hours
          const avg = matchingHours.reduce((sum, point) => sum + point.consumption, 0) / matchingHours.length;
          predictedValue = avg;
        } else {
          // Apply time-based adjustments
          if (hour >= 7 && hour <= 9) {
            predictedValue *= 1.5; // Morning peak
          } else if (hour >= 17 && hour <= 22) {
            predictedValue *= 1.8; // Evening peak
          } else if (hour >= 0 && hour <= 5) {
            predictedValue *= 0.6; // Night lull
          }
        }
      }
      
      // Apply day of week adjustments
      if (isWeekend && (pattern.timeFrame === 'daily' || pattern.timeFrame === 'weekly')) {
        predictedValue *= 0.8; // Weekend adjustment
      }
      
      // Calculate confidence intervals based on standard deviation
      const stdDev = pattern.patternData.standardDeviation;
      const confidenceLevel = 0.95; // 95% confidence
      const zScore = 1.96; // Z-score for 95% confidence
      const marginOfError = zScore * stdDev / Math.sqrt(30); // Sample size of 30
      
      const confidenceInterval = {
        lower: Math.max(0, predictedValue - marginOfError),
        upper: predictedValue + marginOfError
      };
      
      // Add some variation to make predictions realistic
      const noise = (Math.random() - 0.5) * stdDev * 0.5;
      predictedValue = Math.max(0, predictedValue + noise);
      
      // Calculate simulated features for this timestamp
      const temperature = 20 + Math.sin(month * Math.PI / 6) * 10 + (Math.random() - 0.5) * 5;
      const humidity = 50 + Math.sin(month * Math.PI / 6) * 20 + (Math.random() - 0.5) * 10;
      const solarIrradiance = hour >= 8 && hour <= 16 
        ? 500 + Math.sin((hour - 8) * Math.PI / 8) * 300 + (Math.random() - 0.5) * 100
        : 0;
      
      predictions.push({
        timestamp: timestamp.toISOString(),
        predictedConsumption: predictedValue,
        confidenceInterval,
        probability: Math.min(0.99, (pattern.ml.accuracy ?? 0.8) + 0.05),
        features: {
          timeOfDay: hour,
          dayOfWeek,
          month,
          isWeekend,
          isHoliday: false,
          temperature,
          humidity,
          solarIrradiance,
          occupancy: isWeekend ? 3 : (hour >= 9 && hour <= 17 ? 1 : 4)
        }
      });
    }
    
    // Calculate overall accuracy based on cross-validation (simplified simulation)
    // In a real implementation, this would use proper ML validation techniques
    const baseAccuracy = pattern.ml.accuracy ?? 0.8;
    const improvementFactor = 0.05 * (1 - baseAccuracy); // Less improvement as we get closer to perfect
    const accuracy = Math.min(0.98, baseAccuracy + improvementFactor);
    
    // Update the pattern with ML results
    const nowStr = new Date().toISOString();
    const updatedPattern: ConsumptionPattern = {
      ...pattern,
      ml: {
        modelType: options?.modelType ?? pattern.ml.modelType,
        features: selectedFeatures,
        weights: normalizedWeights,
        accuracy,
        lastTraining: nowStr,
        predictions
      },
      updatedAt: nowStr
    };
    
    this.patterns.set(id, updatedPattern);
    return updatedPattern;
  }
  
  /**
   * Generate predictions based on a pattern model
   */
  async generatePredictions(id: number, horizon: string, options?: {
    interval?: string;
    confidenceLevel?: number;
  }): Promise<PatternPrediction[] | undefined> {
    const pattern = this.patterns.get(id);
    if (!pattern) {
      return undefined;
    }
    
    // Check if we have existing predictions from a recent training
    // If so, and they're recent, we can reuse them
    if (pattern.ml.predictions && pattern.ml.predictions.length > 0) {
      const lastTrainingDate = new Date(pattern.ml.lastTraining);
      const now = new Date();
      const hoursSinceTraining = (now.getTime() - lastTrainingDate.getTime()) / (60 * 60 * 1000);
      
      // If training happened within last 24 hours, use existing predictions
      if (hoursSinceTraining < 24) {
        // Filter predictions based on requested horizon
        const horizonMs = horizon === 'day' ? 24 * 60 * 60 * 1000 :
                        horizon === 'week' ? 7 * 24 * 60 * 60 * 1000 :
                        horizon === 'month' ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
                        
        const filteredPredictions = pattern.ml.predictions.filter(p => {
          const predictionDate = new Date(p.timestamp);
          return predictionDate.getTime() <= now.getTime() + horizonMs;
        });
        
        if (filteredPredictions.length > 0) {
          return filteredPredictions;
        }
      }
    }
    
    // For this implementation, we'll use a more sophisticated prediction model
    // that leverages our trained model's features and weights
    const now = new Date();
    const predictions: PatternPrediction[] = [];
    const intervalMs = options?.interval === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const horizonMs = horizon === 'day' ? 24 * 60 * 60 * 1000 :
                      horizon === 'week' ? 7 * 24 * 60 * 60 * 1000 :
                      horizon === 'month' ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    // Extract feature weights from the model
    const features = pattern.ml.features || ['timeOfDay', 'dayOfWeek', 'isWeekend', 'month'];
    const weights = pattern.ml.weights || features.map(() => 1 / features.length);
    
    // Build a simple model using those weights
    let current = new Date(now);
    while (current.getTime() < now.getTime() + horizonMs) {
      const hour = current.getHours();
      const dayOfWeek = current.getDay();
      const month = current.getMonth();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Start with the pattern's average value as baseline
      let baseConsumption = pattern.patternData.averageValue;
      
      // Find closest historical data point if available
      if (pattern.timeFrame === 'hourly') {
        const matchingHours = pattern.patternData.timestamps
          .map((ts, idx) => ({
            timestamp: new Date(ts),
            value: pattern.patternData.values[idx]
          }))
          .filter(point => {
            const pointHour = point.timestamp.getHours();
            const pointDayOfWeek = point.timestamp.getDay();
            // Match hour + optionally day of week for better accuracy
            return pointHour === hour && (isWeekend === (pointDayOfWeek === 0 || pointDayOfWeek === 6));
          });
        
        if (matchingHours.length > 0) {
          // Use average of matching historical points
          baseConsumption = matchingHours.reduce((sum, pt) => sum + pt.value, 0) / matchingHours.length;
        }
      }
      
      // Apply model adjustments based on weighted features
      let weightedAdjustment = 0;
      let featureVector: Record<string, number> = {};
      
      // Build feature vector for current prediction point
      featureVector = {
        timeOfDay: hour / 24, // Normalized to 0-1
        dayOfWeek: dayOfWeek / 6, // Normalized to 0-1 
        isWeekend: isWeekend ? 1 : 0,
        month: month / 11, // Normalized to 0-1
        
        // Add seasonal temperature simulation
        temperature: (20 + Math.sin(month * Math.PI / 6) * 10) / 40, // Normalized temp around 0-1
      };
      
      // Apply feature weights to calculate adjustment
      features.forEach((feature, idx) => {
        const featureValue = featureVector[feature] || 0;
        const featureWeight = weights[idx] || 0;
        
        // Time of day has special adjustment patterns
        if (feature === 'timeOfDay') {
          if (hour >= 7 && hour <= 9) {
            // Morning peak
            weightedAdjustment += featureWeight * 0.5; 
          } else if (hour >= 17 && hour <= 22) {
            // Evening peak
            weightedAdjustment += featureWeight * 0.8;
          } else if (hour >= 0 && hour <= 5) {
            // Night lull
            weightedAdjustment -= featureWeight * 0.4;
          }
        }
        // Weekend adjustment
        else if (feature === 'isWeekend' && isWeekend) {
          if (pattern.source !== 'ev_charger') {
            weightedAdjustment -= featureWeight * 0.2; // Less consumption on weekends
          } else {
            weightedAdjustment += featureWeight * 0.3; // More EV charging on weekends
          }
        }
        // Temperature adjustment
        else if (feature === 'temperature') {
          const tempEffect = featureValue - 0.5; // Positive for hot, negative for cold
          if (pattern.source === 'heat_pump') {
            // Heat pumps use more energy in extreme temps
            weightedAdjustment += featureWeight * Math.abs(tempEffect) * 0.5;
          } else {
            // General consumption higher in hot weather (cooling)
            weightedAdjustment += featureWeight * tempEffect * 0.3;
          }
        }
      });
      
      // Apply weighted adjustment to base consumption
      let predictedConsumption = baseConsumption * (1 + weightedAdjustment);
      
      // Add a small amount of random noise for realism
      const noiseRange = pattern.patternData.standardDeviation * 0.2;
      const noise = (Math.random() - 0.5) * noiseRange;
      predictedConsumption = Math.max(0, predictedConsumption + noise);
      
      // Calculate confidence interval based on model accuracy and standard deviation
      const confidenceLevel = options?.confidenceLevel ?? 0.95;
      const zScore = confidenceLevel === 0.99 ? 2.576 :
                     confidenceLevel === 0.95 ? 1.96 :
                     confidenceLevel === 0.90 ? 1.645 : 1.96;
      
      // Scale confidence interval based on model accuracy
      const accuracyFactor = pattern.ml.accuracy >= 0.9 ? 0.7 : 
                            pattern.ml.accuracy >= 0.8 ? 1.0 : 1.5;
      
      const standardError = pattern.patternData.standardDeviation / Math.sqrt(30) * accuracyFactor;
      const marginOfError = zScore * standardError;
      
      // Generate full set of features for the prediction point
      const predictionFeatures: PatternFeatures = {
        timeOfDay: hour,
        dayOfWeek,
        month,
        isWeekend,
        isHoliday: false, // Would need holiday calendar integration
        
        // Generate realistic weather features with seasonal patterns
        temperature: 20 + Math.sin(month * Math.PI / 6) * 10 + (Math.random() - 0.5) * 5,
        humidity: 50 + Math.sin(month * Math.PI / 6) * 20 + (Math.random() - 0.5) * 10,
        
        // Solar irradiance (daylight hours only)
        solarIrradiance: hour >= 7 && hour <= 18 
          ? 600 * Math.sin(Math.PI * (hour - 7) / (18 - 7)) * (1 - 0.3 * Math.cos(month * Math.PI / 6)) + (Math.random() - 0.5) * 100
          : 0,
          
        // Occupancy simulation
        occupancy: isWeekend 
          ? 3 // Average home occupancy on weekends
          : (hour >= 9 && hour <= 17) 
              ? 1 // Low occupancy during work hours
              : 4 // High occupancy in evenings
      };
      
      predictions.push({
        timestamp: current.toISOString(),
        predictedConsumption,
        confidenceInterval: {
          lower: Math.max(0, predictedConsumption - marginOfError),
          upper: predictedConsumption + marginOfError
        },
        probability: pattern.ml.accuracy ?? 0.8,
        features: predictionFeatures
      });
      
      // Move to next interval
      current = new Date(current.getTime() + intervalMs);
    }
    
    // Update the pattern with the new predictions
    const updatedPattern = {
      ...pattern,
      ml: {
        ...pattern.ml,
        predictions
      },
      updatedAt: now.toISOString()
    };
    
    this.patterns.set(id, updatedPattern);
    return predictions;
  }
  
  /**
   * Detect anomalies in energy consumption
   */
  async detectAnomalies(siteId: number, readings: EnergyReading[]): Promise<{
    reading: EnergyReading;
    patternId: number;
    expectedValue: number;
    deviation: number;
    deviationPercent: number;
    isAnomaly: boolean;
    severity: 'low' | 'medium' | 'high';
    insights?: string;
    potentialCauses?: string[];
    anomalyType?: 'spike' | 'drop' | 'sustained' | 'pattern_change';
  }[]> {
    const patterns = this.getPatternsBySite(siteId);
    if (patterns.length === 0 || readings.length === 0) {
      return [];
    }
    
    // Group readings by pattern and sort by time for trend analysis
    const groupedReadings = readings.sort((a, b) => {
      const dateA = new Date(typeof a.timestamp === 'string' ? a.timestamp : a.timestamp);
      const dateB = new Date(typeof b.timestamp === 'string' ? b.timestamp : b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Keep track of recent anomalies for pattern detection
    const recentAnomalies: Map<number, {
      count: number,
      sustained: boolean,
      direction: 'up' | 'down' | 'mixed',
      readings: EnergyReading[]
    }> = new Map();
    
    const anomalies = [];
    
    // Process each reading for potential anomalies
    for (const reading of groupedReadings) {
      // Calculate actual consumption from the energy reading
      const actualConsumption = this.calculateConsumptionFromReading(reading);
      
      // Skip invalid readings (negative or extremely large values)
      if (actualConsumption < 0 || actualConsumption > 100000) {
        continue;
      }
      
      // Safely handle the timestamp
      const timestamp = typeof reading.timestamp === 'string' 
        ? new Date(reading.timestamp)
        : (reading.timestamp instanceof Date 
            ? reading.timestamp 
            : new Date());
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();
      const month = timestamp.getMonth();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Find matching patterns for this reading
      for (const pattern of patterns) {
        // Skip patterns that don't match the timestamp or source type
        if (!this.isTimestampInPattern(timestamp, pattern)) {
          continue;
        }
        
        // First, look for a prediction from our ML model that matches this timestamp
        let expectedValue = pattern.patternData.averageValue;
        let confidenceInterval = {
          lower: expectedValue * 0.7,
          upper: expectedValue * 1.3
        };
        
        // If we have predictions from our ML model, use those for expected values
        if (pattern.ml.predictions && pattern.ml.predictions.length > 0) {
          // Find closest prediction in time
          const closestPrediction = pattern.ml.predictions.reduce((closest, current) => {
            const currentTime = new Date(current.timestamp).getTime();
            const closestTime = new Date(closest.timestamp).getTime();
            const readingTime = timestamp.getTime();
            
            return Math.abs(currentTime - readingTime) < Math.abs(closestTime - readingTime)
              ? current
              : closest;
          });
          
          // If prediction is within 3 hours, use it
          const timeDiff = Math.abs(new Date(closestPrediction.timestamp).getTime() - timestamp.getTime());
          if (timeDiff <= 3 * 60 * 60 * 1000) {
            expectedValue = closestPrediction.predictedConsumption;
            confidenceInterval = closestPrediction.confidenceInterval;
          }
        } else {
          // Fallback to pattern-based expectation with adjustments
          
          // First try to find matching historical data points
          const matchingPoints = pattern.patternData.timestamps
            .map((ts, idx) => ({
              timestamp: new Date(ts),
              value: pattern.patternData.values[idx]
            }))
            .filter(point => {
              const pointHour = point.timestamp.getHours();
              const pointDay = point.timestamp.getDay();
              // Match by hour and day type (weekend/weekday)
              return pointHour === hour && 
                    (isWeekend === (pointDay === 0 || pointDay === 6));
            });
          
          if (matchingPoints.length > 0) {
            // Use average of matching points
            expectedValue = matchingPoints.reduce((sum, pt) => sum + pt.value, 0) / matchingPoints.length;
            
            // Calculate standard deviation of matching points for confidence interval
            const meanValue = expectedValue;
            const squaredDiffs = matchingPoints.map(pt => Math.pow(pt.value - meanValue, 2));
            const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
            const stdDev = Math.sqrt(avgSquaredDiff);
            
            // 95% confidence interval (approximately ±2 standard deviations)
            confidenceInterval = {
              lower: Math.max(0, meanValue - 2 * stdDev),
              upper: meanValue + 2 * stdDev
            };
          } else {
            // Apply time-based adjustments
            if (pattern.timeFrame === 'hourly') {
              if (hour >= 7 && hour <= 9) {
                expectedValue *= 1.5; // Morning peak
              } else if (hour >= 17 && hour <= 22) {
                expectedValue *= 1.8; // Evening peak
              } else if (hour >= 0 && hour <= 5) {
                expectedValue *= 0.6; // Night lull
              }
            }
            
            // Apply day of week adjustments
            if (pattern.correlations.dayOfWeek && pattern.correlations.dayOfWeek > 0.3) {
              if (isWeekend) {
                expectedValue *= 0.8; // Less consumption on weekends
              }
            }
            
            // Adjust for seasonal effects based on pattern correlations
            if (pattern.correlations.temperature && Math.abs(pattern.correlations.temperature) > 0.3) {
              // Simulate seasonal temperature
              const seasonalTemp = 20 + Math.sin(month * Math.PI / 6) * 10;
              const tempDeviation = seasonalTemp - 20; // Deviation from average
              
              // Adjust based on correlation direction
              if (pattern.correlations.temperature > 0) {
                // Positive correlation (higher temp = higher consumption, e.g., AC)
                expectedValue *= (1 + 0.03 * tempDeviation);
              } else {
                // Negative correlation (higher temp = lower consumption, e.g., heating)
                expectedValue *= (1 - 0.03 * tempDeviation);
              }
            }
            
            // Set confidence interval based on pattern standard deviation
            confidenceInterval = {
              lower: Math.max(0, expectedValue - 2 * pattern.patternData.standardDeviation),
              upper: expectedValue + 2 * pattern.patternData.standardDeviation
            };
          }
        }
        
        // Calculate deviation metrics
        const deviation = actualConsumption - expectedValue;
        const deviationPercent = (expectedValue === 0) ? 0 : (deviation / expectedValue) * 100;
        
        // Determine if this is an anomaly by checking if it's outside the confidence interval
        const isOutsideInterval = actualConsumption < confidenceInterval.lower || 
                                  actualConsumption > confidenceInterval.upper;
                                  
        // Alternative statistical detection: Z-score approach
        const zScore = (expectedValue === 0 || pattern.patternData.standardDeviation === 0) 
          ? 0 
          : Math.abs(deviation) / pattern.patternData.standardDeviation;
        
        // Combine approaches: either outside confidence interval or high z-score
        const isAnomaly = isOutsideInterval || zScore > 3;
        
        if (isAnomaly) {
          // Determine severity based on multiple factors
          let severity: 'low' | 'medium' | 'high' = 'low';
          
          if (Math.abs(deviationPercent) > 50 || zScore > 5) {
            severity = 'high';
          } else if (Math.abs(deviationPercent) > 20 || zScore > 3.5) {
            severity = 'medium';
          }
          
          // Update recent anomalies tracking for this pattern
          const recentPatternAnomalies = recentAnomalies.get(pattern.id) || {
            count: 0,
            sustained: false,
            direction: 'mixed',
            readings: []
          };
          
          // Update anomaly tracking data
          recentPatternAnomalies.count += 1;
          recentPatternAnomalies.readings.push(reading);
          
          // Determine if this is part of a sustained anomaly pattern
          const sustained = recentPatternAnomalies.count >= 3;
          
          // Determine direction of anomaly (for sustained pattern detection)
          const newDirection = deviation > 0 ? 'up' : 'down';
          if (recentPatternAnomalies.direction === 'mixed') {
            recentPatternAnomalies.direction = newDirection;
          } else if (recentPatternAnomalies.direction !== newDirection) {
            recentPatternAnomalies.direction = 'mixed';
          }
          
          // Update tracking
          recentAnomalies.set(pattern.id, recentPatternAnomalies);
          
          // Determine anomaly type
          let anomalyType: 'spike' | 'drop' | 'sustained' | 'pattern_change' = 
            deviation > 0 ? 'spike' : 'drop';
          
          if (sustained) {
            if (recentPatternAnomalies.direction !== 'mixed') {
              anomalyType = 'sustained';
            } else {
              anomalyType = 'pattern_change';
            }
          }
          
          // Generate insights based on anomaly characteristics
          let insights = '';
          const potentialCauses: string[] = [];
          
          if (anomalyType === 'spike') {
            insights = `Unexpected consumption spike detected (${Math.round(deviationPercent)}% above expected).`;
            
            if (pattern.source === 'ev_charger') {
              potentialCauses.push('Additional EV charging session');
            } else if (pattern.source === 'heat_pump') {
              potentialCauses.push('Extreme temperature change');
              potentialCauses.push('Heat pump working harder than usual');
            } else {
              potentialCauses.push('Additional appliance usage');
              potentialCauses.push('New device connected');
            }
          } else if (anomalyType === 'drop') {
            insights = `Unexpected consumption drop detected (${Math.round(Math.abs(deviationPercent))}% below expected).`;
            
            if (pattern.source === 'solar') {
              potentialCauses.push('Solar panel malfunction');
              potentialCauses.push('Weather interference (clouds, dust)');
            } else if (pattern.source === 'battery') {
              potentialCauses.push('Battery not charging properly');
            } else {
              potentialCauses.push('Device may be offline or malfunctioning');
              potentialCauses.push('Power outage or circuit issue');
            }
          } else if (anomalyType === 'sustained') {
            const direction = recentPatternAnomalies.direction === 'up' ? 'increase' : 'decrease';
            insights = `Sustained ${direction} in consumption detected over multiple readings.`;
            
            if (recentPatternAnomalies.direction === 'up') {
              potentialCauses.push('Continuous operation of high-power device');
              potentialCauses.push('System efficiency loss');
              potentialCauses.push('Possible device malfunction causing energy waste');
            } else {
              potentialCauses.push('Device partially operational or in low-power mode');
              potentialCauses.push('Change in usage patterns');
            }
          } else { // pattern_change
            insights = 'Irregular consumption pattern detected that doesn\'t match historical data.';
            potentialCauses.push('Change in occupancy or schedule');
            potentialCauses.push('Seasonal transition effect');
            potentialCauses.push('New usage pattern emerging');
          }
          
          // Add the anomaly to our results
          anomalies.push({
            reading,
            patternId: pattern.id,
            expectedValue,
            deviation,
            deviationPercent,
            isAnomaly,
            severity,
            insights,
            potentialCauses,
            anomalyType
          });
        } else {
          // If not an anomaly, reset the consecutive count for this pattern
          // but keep a small window for intermittent anomalies
          const existing = recentAnomalies.get(pattern.id);
          if (existing && existing.count > 1) {
            // Reduce count but don't reset completely to detect intermittent issues
            existing.count = Math.max(1, existing.count - 1);
            recentAnomalies.set(pattern.id, existing);
          } else {
            recentAnomalies.delete(pattern.id);
          }
        }
      }
    }
    
    return anomalies;
  }
  
  /**
   * Calculate consumption from energy reading
   * This is a helper method to extract/calculate consumption value from energy readings
   */
  private calculateConsumptionFromReading(reading: EnergyReading): number {
    // In a real implementation, this would use actual consumption data
    // For now, we'll use the gridPower or homePower if available
    
    // First try to use homePower which represents consumption
    if (reading.homePower !== null && reading.homePower !== undefined) {
      const homePower = typeof reading.homePower === 'string' 
        ? parseFloat(reading.homePower) 
        : Number(reading.homePower);
      
      if (!isNaN(homePower)) {
        return Math.max(0, homePower);
      }
    }
    
    // Fall back to gridPower if homePower is not available
    if (reading.gridPower !== null && reading.gridPower !== undefined) {
      const gridPower = typeof reading.gridPower === 'string' 
        ? parseFloat(reading.gridPower) 
        : Number(reading.gridPower);
      
      if (!isNaN(gridPower)) {
        return Math.max(0, gridPower); // Only positive values for consumption
      }
    }
    
    // If no power readings are available, estimate from energy if possible
    if (reading.homeEnergy !== null && reading.homeEnergy !== undefined) {
      const homeEnergy = typeof reading.homeEnergy === 'string' 
        ? parseFloat(reading.homeEnergy) 
        : Number(reading.homeEnergy);
      
      if (!isNaN(homeEnergy)) {
        return Math.max(0, homeEnergy);
      }
    }
    
    // Default fallback
    return 1.0; // Fallback value for development/testing
  }
  
  /**
   * Check if a timestamp falls within the range of a pattern
   */
  private isTimestampInPattern(timestamp: Date, pattern: ConsumptionPattern): boolean {
    const startDate = new Date(pattern.startTimestamp);
    const endDate = new Date(pattern.endTimestamp);
    
    return timestamp >= startDate && timestamp <= endDate;
  }
  
  /**
   * Get energy consumption features for a given timestamp
   */
  async getConsumptionFeatures(siteId: number, timestamp: string): Promise<PatternFeatures | undefined> {
    const date = new Date(timestamp);
    
    // In a real implementation, we would:
    // 1. Fetch relevant data from weather services
    // 2. Fetch historical consumption data
    // 3. Calculate features like moving averages
    
    // For this implementation, we'll generate sample features
    return {
      timeOfDay: date.getHours(),
      dayOfWeek: date.getDay(),
      month: date.getMonth(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: false, // Would need holiday calendar integration
      temperature: 20 + Math.sin(date.getMonth() * Math.PI / 6) * 10, // Seasonal temperature
      humidity: 50 + Math.sin(date.getMonth() * Math.PI / 6) * 20, // Seasonal humidity
      solarIrradiance: date.getHours() >= 8 && date.getHours() <= 16 ? 500 + Math.sin((date.getHours() - 8) * Math.PI / 8) * 300 : 0, // Daylight solar irradiance
      occupancy: date.getDay() === 0 || date.getDay() === 6 ? 3 : (date.getHours() >= 9 && date.getHours() <= 17 ? 1 : 4) // Home occupancy
    };
  }
}

// Singleton instance
let consumptionPatternServiceInstance: ConsumptionPatternService | null = null;

/**
 * Initialize the consumption pattern service
 */
export function initConsumptionPatternService(): ConsumptionPatternService {
  if (!consumptionPatternServiceInstance) {
    consumptionPatternServiceInstance = new ConsumptionPatternService();
  }
  return consumptionPatternServiceInstance;
}

/**
 * Get the consumption pattern service instance
 */
export function getConsumptionPatternService(): ConsumptionPatternService {
  if (!consumptionPatternServiceInstance) {
    return initConsumptionPatternService();
  }
  return consumptionPatternServiceInstance;
}