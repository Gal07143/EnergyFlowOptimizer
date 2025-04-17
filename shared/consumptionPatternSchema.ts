import { z } from 'zod';

// Consumption Pattern Types
export const TimeFrameEnum = z.enum(['hourly', 'daily', 'weekly', 'monthly', 'seasonally']);
export type TimeFrame = z.infer<typeof TimeFrameEnum>;

export const UsageCategoryEnum = z.enum(['base_load', 'peak_load', 'variable_load']);
export type UsageCategory = z.infer<typeof UsageCategoryEnum>;

export const EnergySourceEnum = z.enum(['grid', 'solar', 'battery', 'ev_charger', 'heat_pump', 'other']);
export type EnergySource = z.infer<typeof EnergySourceEnum>;

// Pattern Features Schema
export const PatternFeaturesSchema = z.object({
  timeOfDay: z.number().min(0).max(23),
  dayOfWeek: z.number().min(0).max(6),
  month: z.number().min(0).max(11),
  isWeekend: z.boolean(),
  isHoliday: z.boolean(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  solarIrradiance: z.number().optional(),
  occupancy: z.number().optional(),
  previousHourUsage: z.number().optional(),
  previousDayUsage: z.number().optional(),
  movingAverageUsage: z.number().optional()
});
export type PatternFeatures = z.infer<typeof PatternFeaturesSchema>;

// Pattern Prediction Schema
export const PatternPredictionSchema = z.object({
  timestamp: z.string(),
  predictedConsumption: z.number(),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number()
  }),
  probability: z.number(),
  features: PatternFeaturesSchema
});
export type PatternPrediction = z.infer<typeof PatternPredictionSchema>;

// Consumption Pattern Schema
export const ConsumptionPatternSchema = z.object({
  id: z.number(),
  siteId: z.number(),
  name: z.string(),
  description: z.string().optional(),
  timeFrame: TimeFrameEnum,
  usageCategory: UsageCategoryEnum,
  source: EnergySourceEnum,
  startTimestamp: z.string(),
  endTimestamp: z.string(),
  patternData: z.object({
    timestamps: z.array(z.string()),
    values: z.array(z.number()),
    averageValue: z.number(),
    peakValue: z.number(),
    minValue: z.number(),
    standardDeviation: z.number()
  }),
  correlations: z.object({
    temperature: z.number().optional(),
    dayOfWeek: z.number().optional(),
    timeOfDay: z.number().optional(),
    occupancy: z.number().optional(),
    solarProduction: z.number().optional()
  }),
  ml: z.object({
    modelType: z.string(),
    features: z.array(z.string()),
    weights: z.array(z.number()).optional(),
    accuracy: z.number(),
    lastTraining: z.string(),
    predictions: z.array(PatternPredictionSchema).optional()
  }),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ConsumptionPattern = z.infer<typeof ConsumptionPatternSchema>;

// Input schemas for creating and updating consumption patterns
export const CreateConsumptionPatternSchema = ConsumptionPatternSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type CreateConsumptionPattern = z.infer<typeof CreateConsumptionPatternSchema>;

export const UpdateConsumptionPatternSchema = ConsumptionPatternSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type UpdateConsumptionPattern = z.infer<typeof UpdateConsumptionPatternSchema>;

// Train Pattern Model Input Schema
export const TrainPatternModelSchema = z.object({
  lookbackPeriod: z.string().optional(),
  featureSelection: z.array(z.string()).optional(),
  modelType: z.string().optional()
});
export type TrainPatternModel = z.infer<typeof TrainPatternModelSchema>;

// Anomaly Detection Result Schema
export const AnomalyDetectionResultSchema = z.object({
  reading: z.any(), // This would be the EnergyReading type
  patternId: z.number(),
  expectedValue: z.number(),
  deviation: z.number(),
  deviationPercent: z.number(),
  isAnomaly: z.boolean(),
  severity: z.enum(['low', 'medium', 'high'])
});
export type AnomalyDetectionResult = z.infer<typeof AnomalyDetectionResultSchema>;