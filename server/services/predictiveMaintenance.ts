/**
 * Predictive Maintenance Service
 * 
 * This service handles predictive maintenance for battery and solar systems,
 * including health monitoring, anomaly detection, and failure prediction.
 */

import { db } from '../db';
import {
  devices,
  deviceHealthMetrics,
  deviceMaintenancePredictions,
  deviceMaintenanceIssues,
  deviceMaintenanceAlerts,
  deviceMaintenanceThresholds,
  deviceMaintenanceModels,
  deviceReadings,
  deviceMaintenanceSchedules,
  type DeviceHealthMetrics,
  type DeviceMaintenancePrediction,
  type DeviceMaintenanceIssue,
  type DeviceMaintenanceAlert,
  type DeviceMaintenanceThreshold,
  type DeviceMaintenanceModel,
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { OpenAI } from 'openai';
import type { Device } from '@shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class PredictiveMaintenanceService {
  /**
   * Get health metrics for a specific device
   */
  async getDeviceHealthMetrics(deviceId: number, limit = 100): Promise<DeviceHealthMetrics[]> {
    const metrics = await db
      .select()
      .from(deviceHealthMetrics)
      .where(eq(deviceHealthMetrics.deviceId, deviceId))
      .orderBy(desc(deviceHealthMetrics.timestamp))
      .limit(limit);
    
    return metrics;
  }

  /**
   * Get the latest health metrics for a specific device
   */
  async getLatestDeviceHealthMetrics(deviceId: number): Promise<DeviceHealthMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(deviceHealthMetrics)
      .where(eq(deviceHealthMetrics.deviceId, deviceId))
      .orderBy(desc(deviceHealthMetrics.timestamp))
      .limit(1);
    
    return metrics;
  }

  /**
   * Calculate health score for a device
   * This represents an overall assessment of device health from 0-100
   */
  async calculateDeviceHealthScore(deviceId: number, deviceType: string): Promise<number> {
    // First, check if we have recent metrics for this device
    const recentMetrics = await this.getLatestDeviceHealthMetrics(deviceId);
    
    // If we already have a recent health score, return it
    if (recentMetrics?.overallHealthScore) {
      return Number(recentMetrics.overallHealthScore);
    }
    
    // Otherwise, let's calculate the health score based on device type
    if (deviceType === 'battery_storage') {
      return await this.calculateBatteryHealthScore(deviceId);
    } else if (deviceType === 'solar_pv') {
      return await this.calculateSolarHealthScore(deviceId);
    }
    
    // Default score for other device types
    return 85; // Assume generally good health as default
  }

  /**
   * Calculate health score for a battery
   */
  private async calculateBatteryHealthScore(deviceId: number): Promise<number> {
    try {
      // Get the latest device readings
      const [latestReading] = await db
        .select()
        .from(deviceReadings)
        .where(eq(deviceReadings.deviceId, deviceId))
        .orderBy(desc(deviceReadings.timestamp))
        .limit(1);
        
      if (!latestReading) return 85; // Default score if no readings
      
      // Get device information
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
        
      if (!device) return 85; // Default score if no device info
      
      // Get historical readings for cycle analysis
      const recentReadings = await db
        .select()
        .from(deviceReadings)
        .where(eq(deviceReadings.deviceId, deviceId))
        .orderBy(desc(deviceReadings.timestamp))
        .limit(100);
        
      // Get specific metrics
      const batteryCapacity = Number(device.capacity) || 10; // Default 10kWh if not specified
      const stateOfCharge = Number(latestReading.stateOfCharge) || 50;
      
      // Calculate estimated cycle count
      // This is a simplified estimate, in reality would use more sophisticated methods
      const cycleCount = Math.floor((recentReadings.length / 24) * 0.8); // Rough estimation
      
      // Calculate capacity fade - simplified model
      // A typical Li-ion battery loses 20% capacity after 1000 cycles
      // So we estimate capacity fade as: cycles / 1000 * 20%
      const estimatedCapacityFade = (cycleCount / 1000) * 20;
      
      // Get temperature if available
      const temperature = Number(latestReading.temperature) || 25; // Default 25°C
      const temperatureImpact = this.calculateTemperatureImpact(temperature);
      
      // Calculate overall health score (0-100)
      // Weighted formula based on multiple factors
      let healthScore = 100;
      
      // Reduce score based on capacity fade
      healthScore -= estimatedCapacityFade;
      
      // Reduce score based on extreme state of charge (too high or too low)
      if (stateOfCharge < 10 || stateOfCharge > 90) {
        healthScore -= 5;
      }
      
      // Reduce score based on temperature impact
      healthScore -= temperatureImpact;
      
      // Ensure score is within 0-100 range
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      // Save the calculated metrics
      await db.insert(deviceHealthMetrics).values({
        deviceId,
        cycleCount: Number(cycleCount),
        capacityFading: Number(estimatedCapacityFade),
        operatingTemperature: Number(temperature),
        overallHealthScore: Number(healthScore),
        remainingUsefulLife: Number(this.estimateRemainingLife(healthScore, cycleCount)),
        failureProbability: Number(100 - healthScore),
        healthStatus: this.getHealthStatusFromScore(healthScore),
      });
      
      return healthScore;
    } catch (error) {
      console.error('Error calculating battery health score:', error);
      return 75; // Default score on error
    }
  }

  /**
   * Calculate health score for a solar system
   */
  private async calculateSolarHealthScore(deviceId: number): Promise<number> {
    try {
      // Get the latest device reading
      const [latestReading] = await db
        .select()
        .from(deviceReadings)
        .where(eq(deviceReadings.deviceId, deviceId))
        .orderBy(desc(deviceReadings.timestamp))
        .limit(1);
        
      if (!latestReading) return 85; // Default score if no readings
      
      // Get device information
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
        
      if (!device) return 85; // Default score if no device info
      
      // Get historical readings for performance analysis
      const recentReadings = await db
        .select()
        .from(deviceReadings)
        .where(eq(deviceReadings.deviceId, deviceId))
        .orderBy(desc(deviceReadings.timestamp))
        .limit(100);
        
      // Get system age in years (assuming installation date info would be in settings)
      const settings = device.settings as any || {};
      const installationYear = settings.installationYear || new Date().getFullYear() - 2; // Default 2 years
      const systemAgeYears = new Date().getFullYear() - installationYear;
      
      // Calculate efficiency ratio (PR - Performance Ratio)
      // This is typically actual output / theoretical output
      // For a simplified version, we'll use relative performance to capacity
      const capacity = Number(device.capacity) || 5; // Default 5kW if not specified
      const currentPower = Number(latestReading.power) || 0;
      const timeOfDay = latestReading.timestamp ? new Date(latestReading.timestamp).getHours() : new Date().getHours();
      const irradianceEstimate = this.estimateIrradiance(timeOfDay);
      const expectedPower = capacity * irradianceEstimate;
      const performanceRatio = expectedPower > 0 ? currentPower / expectedPower : 0.8;
      
      // Calculate degradation
      // Typical degradation is 0.5-1% per year for quality panels
      const estimatedDegradation = systemAgeYears * 0.7; // 0.7% per year
      
      // Estimate soiling loss
      // This would normally use weather data and time since cleaning
      const soilingLoss = 2.5; // Default 2.5%
      
      // Calculate overall health score (0-100)
      let healthScore = 100;
      
      // Reduce score based on degradation
      healthScore -= estimatedDegradation;
      
      // Reduce score based on soiling
      healthScore -= soilingLoss;
      
      // Reduce score based on performance ratio
      if (performanceRatio < 0.7) {
        healthScore -= (0.7 - performanceRatio) * 100;
      }
      
      // Ensure score is within 0-100 range
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      // Save the calculated metrics
      await db.insert(deviceHealthMetrics).values({
        deviceId,
        efficiencyRatio: Number(performanceRatio),
        degradationRate: Number(estimatedDegradation / systemAgeYears),
        soilingLossRate: Number(soilingLoss),
        overallHealthScore: Number(healthScore),
        remainingUsefulLife: Number(this.estimateRemainingLife(healthScore, systemAgeYears * 365)),
        failureProbability: Number(100 - healthScore),
        healthStatus: this.getHealthStatusFromScore(healthScore),
      });
      
      return healthScore;
    } catch (error) {
      console.error('Error calculating solar health score:', error);
      return 80; // Default score on error
    }
  }

  /**
   * Calculate impact of temperature on battery health
   * Temperatures too high or too low can negatively impact battery
   */
  private calculateTemperatureImpact(temperature: number): number {
    // Optimal temperature range is generally 15-30°C
    if (temperature >= 15 && temperature <= 30) {
      return 0; // No negative impact
    } else if (temperature > 30) {
      // High temperatures have severe impact
      return (temperature - 30) * 1.5;
    } else {
      // Cold temperatures have moderate impact
      return (15 - temperature) * 0.8;
    }
  }

  /**
   * Estimate remaining useful life in days
   */
  private estimateRemainingLife(healthScore: number, cycleCount: number): number {
    // An average battery might last 3000-5000 cycles
    const maxCycles = 4000;
    // Calculate remaining cycles
    const remainingCycles = (healthScore / 100) * (maxCycles - cycleCount);
    // Convert to days (assuming average 1 cycle per day)
    return Math.max(0, Math.round(remainingCycles));
  }

  /**
   * Get health status text from numeric score
   */
  private getHealthStatusFromScore(score: number): string {
    if (score >= 90) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 50) return 'poor';
    return 'critical';
  }

  /**
   * Helper to estimate solar irradiance based on time of day
   * Very simplified model - would use actual weather data in production
   */
  private estimateIrradiance(hour: number): number {
    // Simple bell curve for daylight hours (6am to 6pm)
    if (hour < 6 || hour > 18) return 0;
    return Math.sin(((hour - 6) / 12) * Math.PI) * 0.9;
  }

  /**
   * Detect anomalies in device metrics
   */
  async detectAnomalies(deviceId: number): Promise<{
    hasAnomaly: boolean;
    anomalyType?: string;
    confidence?: number;
    message?: string;
  }> {
    try {
      // Get the latest metrics
      const latestMetrics = await this.getLatestDeviceHealthMetrics(deviceId);
      if (!latestMetrics) {
        return { hasAnomaly: false };
      }
      
      // Get device info
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
        
      if (!device) {
        return { hasAnomaly: false };
      }
      
      // Get previous metrics for trend analysis
      const recentMetrics = await this.getDeviceHealthMetrics(deviceId, 10);
      
      // Detect anomalies based on device type
      if (device.type === 'battery_storage') {
        return this.detectBatteryAnomalies(device, latestMetrics, recentMetrics);
      } else if (device.type === 'solar_pv') {
        return this.detectSolarAnomalies(device, latestMetrics, recentMetrics);
      }
      
      return { hasAnomaly: false };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { hasAnomaly: false };
    }
  }

  /**
   * Detect anomalies in battery metrics
   */
  private detectBatteryAnomalies(
    device: Device,
    latestMetrics: DeviceHealthMetrics,
    historicalMetrics: DeviceHealthMetrics[]
  ): { hasAnomaly: boolean; anomalyType?: string; confidence?: number; message?: string } {
    // Check for potential issues
    const issues = [];
    let highestConfidence = 0;
    let primaryAnomaly = '';
    
    // Check for rapid capacity fading
    if (latestMetrics.capacityFading && Number(latestMetrics.capacityFading) > 1) {
      const avgHistoricalFading = this.calculateAverage(
        historicalMetrics.filter(m => m.capacityFading).map(m => Number(m.capacityFading))
      );
      
      if (Number(latestMetrics.capacityFading) > avgHistoricalFading * 1.5) {
        issues.push({
          type: 'capacity_degradation',
          confidence: 85,
          message: 'Abnormal capacity degradation detected',
        });
        if (85 > highestConfidence) {
          highestConfidence = 85;
          primaryAnomaly = 'capacity_degradation';
        }
      }
    }
    
    // Check for high internal resistance
    if (latestMetrics.internalResistance) {
      const avgResistance = this.calculateAverage(
        historicalMetrics.filter(m => m.internalResistance).map(m => Number(m.internalResistance))
      );
      
      if (Number(latestMetrics.internalResistance) > avgResistance * 1.3) {
        issues.push({
          type: 'internal_resistance',
          confidence: 75,
          message: 'Increasing internal resistance detected',
        });
        if (75 > highestConfidence) {
          highestConfidence = 75;
          primaryAnomaly = 'internal_resistance';
        }
      }
    }
    
    // Check for temperature issues
    if (latestMetrics.operatingTemperature) {
      if (Number(latestMetrics.operatingTemperature) > 40) {
        issues.push({
          type: 'high_temperature',
          confidence: 95,
          message: 'Battery operating at high temperature',
        });
        if (95 > highestConfidence) {
          highestConfidence = 95;
          primaryAnomaly = 'high_temperature';
        }
      } else if (Number(latestMetrics.operatingTemperature) < 5) {
        issues.push({
          type: 'low_temperature',
          confidence: 90,
          message: 'Battery operating at low temperature',
        });
        if (90 > highestConfidence) {
          highestConfidence = 90;
          primaryAnomaly = 'low_temperature';
        }
      }
    }
    
    // Return results
    return {
      hasAnomaly: issues.length > 0,
      anomalyType: primaryAnomaly,
      confidence: highestConfidence > 0 ? highestConfidence : undefined,
      message: issues.length > 0 ? issues[0].message : undefined,
    };
  }

  /**
   * Detect anomalies in solar metrics
   */
  private detectSolarAnomalies(
    device: Device,
    latestMetrics: DeviceHealthMetrics,
    historicalMetrics: DeviceHealthMetrics[]
  ): { hasAnomaly: boolean; anomalyType?: string; confidence?: number; message?: string } {
    // Check for potential issues
    const issues = [];
    let highestConfidence = 0;
    let primaryAnomaly = '';
    
    // Check for efficiency drop
    if (latestMetrics.efficiencyRatio) {
      const avgEfficiency = this.calculateAverage(
        historicalMetrics.filter(m => m.efficiencyRatio).map(m => Number(m.efficiencyRatio))
      );
      
      if (Number(latestMetrics.efficiencyRatio) < avgEfficiency * 0.8) {
        issues.push({
          type: 'efficiency_drop',
          confidence: 80,
          message: 'Significant drop in system efficiency',
        });
        if (80 > highestConfidence) {
          highestConfidence = 80;
          primaryAnomaly = 'efficiency_drop';
        }
      }
    }
    
    // Check for high soiling rate
    if (latestMetrics.soilingLossRate && latestMetrics.soilingLossRate > 5) {
      issues.push({
        type: 'high_soiling',
        confidence: 70,
        message: 'High soiling loss detected, panels may need cleaning',
      });
      if (70 > highestConfidence) {
        highestConfidence = 70;
        primaryAnomaly = 'high_soiling';
      }
    }
    
    // Check for hot spots
    if (latestMetrics.hotspotCount && latestMetrics.hotspotCount > 0) {
      issues.push({
        type: 'hotspots',
        confidence: 90,
        message: `${latestMetrics.hotspotCount} hotspots detected on panels`,
      });
      if (90 > highestConfidence) {
        highestConfidence = 90;
        primaryAnomaly = 'hotspots';
      }
    }
    
    // Check for connection integrity issues
    if (latestMetrics.connectionIntegrityScore && latestMetrics.connectionIntegrityScore < 70) {
      issues.push({
        type: 'connection_issues',
        confidence: 85,
        message: 'Potential electrical connection issues detected',
      });
      if (85 > highestConfidence) {
        highestConfidence = 85;
        primaryAnomaly = 'connection_issues';
      }
    }
    
    // Return results
    return {
      hasAnomaly: issues.length > 0,
      anomalyType: primaryAnomaly,
      confidence: highestConfidence > 0 ? highestConfidence : undefined,
      message: issues.length > 0 ? issues[0].message : undefined,
    };
  }

  /**
   * Helper function to calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Predict maintenance needs and generate alerts
   */
  async generatePredictiveMaintenanceAlerts(deviceId: number): Promise<DeviceMaintenanceAlert[]> {
    try {
      // Get device info
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
        
      if (!device) {
        return [];
      }
      
      // Check for anomalies
      const anomalyResult = await this.detectAnomalies(deviceId);
      const alerts: any[] = [];
      
      if (anomalyResult.hasAnomaly && anomalyResult.anomalyType && anomalyResult.message) {
        // Create a maintenance issue for this anomaly
        const [issue] = await db
          .insert(deviceMaintenanceIssues)
          .values({
            deviceId,
            title: `${device.type === 'battery_storage' ? 'Battery' : 'Solar'} issue detected: ${anomalyResult.anomalyType}`,
            description: anomalyResult.message,
            type: 'predictive',
            severity: this.getSeverityFromConfidence(anomalyResult.confidence || 0),
            confidenceScore: anomalyResult.confidence,
            anomalyScore: anomalyResult.confidence,
            detectedAt: new Date(),
            predictedFailureAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // Default 30 days
          })
          .returning();
          
        // Create an alert
        const [alert] = await db
          .insert(deviceMaintenanceAlerts)
          .values({
            deviceId,
            alertType: 'anomaly_detected',
            message: anomalyResult.message,
            severity: this.getSeverityFromConfidence(anomalyResult.confidence || 0),
            relatedIssueId: issue.id,
            triggerValue: anomalyResult.confidence,
            metricName: anomalyResult.anomalyType,
          })
          .returning();
          
        alerts.push(alert);
      }
      
      // Check thresholds
      const healthMetrics = await this.getLatestDeviceHealthMetrics(deviceId);
      if (healthMetrics) {
        // Get applicable thresholds for this device
        const thresholds = await db
          .select()
          .from(deviceMaintenanceThresholds)
          .where(
            and(
              eq(deviceMaintenanceThresholds.deviceId, deviceId),
              eq(deviceMaintenanceThresholds.enabled, true)
            )
          );
        
        // Check each threshold
        for (const threshold of thresholds) {
          const valueToCheck = (healthMetrics as any)[threshold.metricName];
          if (valueToCheck === undefined) continue;
          
          let thresholdTriggered = false;
          
          switch (threshold.direction) {
            case 'above':
              thresholdTriggered = valueToCheck > (threshold.warningThreshold || 0);
              break;
            case 'below':
              thresholdTriggered = valueToCheck < (threshold.warningThreshold || 0);
              break;
            case 'equal':
              thresholdTriggered = valueToCheck === threshold.warningThreshold;
              break;
            case 'between':
              thresholdTriggered = 
                valueToCheck >= (threshold.warningThreshold || 0) && 
                valueToCheck <= (threshold.secondaryThreshold || 0);
              break;
          }
          
          if (thresholdTriggered) {
            // Create an alert for this threshold
            const [alert] = await db
              .insert(deviceMaintenanceAlerts)
              .values({
                deviceId,
                thresholdId: threshold.id,
                alertType: 'threshold_exceeded',
                message: threshold.alertMessage || `${threshold.metricName} threshold exceeded`,
                severity: threshold.severity,
                triggerValue: valueToCheck,
                thresholdValue: threshold.warningThreshold,
                metricName: threshold.metricName,
              })
              .returning();
              
            alerts.push(alert);
          }
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Error generating predictive maintenance alerts:', error);
      return [];
    }
  }

  /**
   * Use AI to analyze device health and provide insights
   */
  async getAiHealthAnalysis(deviceId: number): Promise<{
    analysis: string;
    recommendations: string[];
    potentialIssues: string[];
    remainingLifeEstimate?: string;
  }> {
    try {
      // Get device information
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
        
      if (!device) {
        throw new Error('Device not found');
      }
      
      // Get health metrics
      const healthMetrics = await this.getLatestDeviceHealthMetrics(deviceId);
      if (!healthMetrics) {
        throw new Error('No health metrics available');
      }
      
      // Get recent readings
      const recentReadings = await db
        .select()
        .from(deviceReadings)
        .where(eq(deviceReadings.deviceId, deviceId))
        .orderBy(desc(deviceReadings.timestamp))
        .limit(20);
        
      // Get any maintenance alerts
      const maintenanceAlerts = await db
        .select()
        .from(deviceMaintenanceAlerts)
        .where(eq(deviceMaintenanceAlerts.deviceId, deviceId))
        .orderBy(desc(deviceMaintenanceAlerts.triggeredAt))
        .limit(5);
        
      // Prepare data for AI analysis
      const deviceData = {
        id: device.id,
        name: device.name,
        type: device.type,
        model: device.model,
        manufacturer: device.manufacturer,
        healthMetrics,
        recentReadings,
        alerts: maintenanceAlerts,
      };
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert energy systems analyst specializing in predictive maintenance for ${
              device.type === 'battery_storage' ? 'battery storage systems' : 'solar PV systems'
            }. Analyze the provided data and provide insights on system health, potential issues, and maintenance recommendations.`,
          },
          {
            role: "user",
            content: JSON.stringify(deviceData),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      
      // Parse the response
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Save prediction if applicable
      if (result.remainingLifeEstimate) {
        await db.insert(deviceMaintenancePredictions).values({
          deviceId,
          metricName: 'remaining_useful_life',
          predictionType: 'failure',
          predictionForTimestamp: new Date(Date.now() + (parseInt(result.remainingLifeDays) || 365) * 24 * 60 * 60 * 1000),
          probabilityPercentage: result.failureProbability || 0,
          confidenceScore: result.confidenceScore || 70,
          predictedValue: parseInt(result.remainingLifeDays) || 365,
          algorithmUsed: 'gpt-4o',
          modelVersion: '2024-05',
          affectedComponents: device.type === 'battery_storage' ? ['battery_cells', 'bms'] : ['panels', 'inverter'],
          recommendedActions: result.recommendations || [],
          potentialImpact: result.impactAssessment || '',
          businessImpactScore: result.businessImpactScore || 50,
        });
      }
      
      return {
        analysis: result.analysis || 'No analysis available',
        recommendations: result.recommendations || [],
        potentialIssues: result.potentialIssues || [],
        remainingLifeEstimate: result.remainingLifeEstimate,
      };
    } catch (error) {
      console.error('Error getting AI health analysis:', error);
      return {
        analysis: 'Unable to analyze device health due to an error.',
        recommendations: ['Schedule a manual inspection of the system.'],
        potentialIssues: ['Unknown - system requires manual inspection'],
      };
    }
  }

  /**
   * Create a maintenance schedule for a device
   */
  async createMaintenanceSchedule(
    deviceId: number,
    title: string,
    description: string,
    frequency: string,
    startDate: Date,
    userId?: number
  ): Promise<DeviceMaintenanceSchedule> {
    try {
      // Get device info
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));
        
      if (!device) {
        throw new Error('Device not found');
      }
      
      // Calculate next due date based on frequency
      const nextDueDate = this.calculateNextDueDate(startDate, frequency);
      
      // Determine recommended checklist items based on device type
      const checklistItems = this.getDefaultChecklistItems(device.type);
      
      // Create the schedule
      const [schedule] = await db
        .insert(deviceMaintenanceSchedules)
        .values({
          deviceId,
          title,
          description,
          type: 'preventive',
          frequency,
          startDate,
          nextDueDate,
          assignedTo: userId,
          createdBy: userId,
          checklistItems,
          priorityLevel: 'medium',
          isActive: true,
          notificationDays: 7,
        })
        .returning();
        
      return schedule;
    } catch (error) {
      console.error('Error creating maintenance schedule:', error);
      throw error;
    }
  }

  /**
   * Calculate next due date based on frequency
   */
  private calculateNextDueDate(startDate: Date, frequency: string): Date {
    const date = new Date(startDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'bi-annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        // Default to monthly
        date.setMonth(date.getMonth() + 1);
    }
    
    return date;
  }

  /**
   * Get default checklist items based on device type
   */
  private getDefaultChecklistItems(deviceType: string): any[] {
    if (deviceType === 'battery_storage') {
      return [
        { task: 'Inspect battery connections for corrosion', completed: false },
        { task: 'Check temperature sensors and cooling systems', completed: false },
        { task: 'Verify BMS (Battery Management System) functionality', completed: false },
        { task: 'Test voltage on all cells/modules', completed: false },
        { task: 'Inspect for physical damage or leaks', completed: false },
        { task: 'Check ventilation systems', completed: false },
        { task: 'Clean battery terminals', completed: false },
        { task: 'Verify safety systems', completed: false },
      ];
    } else if (deviceType === 'solar_pv') {
      return [
        { task: 'Clean solar panels', completed: false },
        { task: 'Inspect for damaged or cracked panels', completed: false },
        { task: 'Check mounting hardware', completed: false },
        { task: 'Inspect electrical connections', completed: false },
        { task: 'Test inverter operation', completed: false },
        { task: 'Clear debris from around array', completed: false },
        { task: 'Check for shading issues', completed: false },
        { task: 'Verify monitoring system', completed: false },
      ];
    } else {
      return [
        { task: 'Perform general visual inspection', completed: false },
        { task: 'Check electrical connections', completed: false },
        { task: 'Test device operation', completed: false },
        { task: 'Clean device exterior', completed: false },
        { task: 'Verify safety systems', completed: false },
      ];
    }
  }

  /**
   * Convert confidence score to severity level
   */
  private getSeverityFromConfidence(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 90) return 'critical';
    if (confidence >= 75) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  /**
   * Get maintenance issues for a device
   */
  async getDeviceMaintenanceIssues(deviceId: number): Promise<DeviceMaintenanceIssue[]> {
    return db
      .select()
      .from(deviceMaintenanceIssues)
      .where(eq(deviceMaintenanceIssues.deviceId, deviceId))
      .orderBy(desc(deviceMaintenanceIssues.createdAt));
  }

  /**
   * Get all maintenance issues
   */
  async getAllMaintenanceIssues(
    limit = 100,
    offset = 0,
    status?: string,
    severity?: string
  ): Promise<DeviceMaintenanceIssue[]> {
    let query = db
      .select()
      .from(deviceMaintenanceIssues)
      .orderBy(desc(deviceMaintenanceIssues.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(eq(deviceMaintenanceIssues.status, status as any));
    }

    if (severity) {
      query = query.where(eq(deviceMaintenanceIssues.severity, severity as any));
    }

    return query;
  }

  /**
   * Get maintenance alerts for a device
   */
  async getDeviceMaintenanceAlerts(deviceId: number): Promise<DeviceMaintenanceAlert[]> {
    return db
      .select()
      .from(deviceMaintenanceAlerts)
      .where(eq(deviceMaintenanceAlerts.deviceId, deviceId))
      .orderBy(desc(deviceMaintenanceAlerts.triggeredAt));
  }

  /**
   * Get all maintenance alerts
   */
  async getAllMaintenanceAlerts(
    limit = 100,
    offset = 0,
    severity?: string,
    acknowledged = false
  ): Promise<DeviceMaintenanceAlert[]> {
    let query = db
      .select()
      .from(deviceMaintenanceAlerts)
      .orderBy(desc(deviceMaintenanceAlerts.triggeredAt))
      .limit(limit)
      .offset(offset);

    if (severity) {
      query = query.where(eq(deviceMaintenanceAlerts.severity, severity as any));
    }

    if (!acknowledged) {
      query = query.where(sql`${deviceMaintenanceAlerts.acknowledgedAt} IS NULL`);
    }

    return query;
  }

  /**
   * Acknowledge a maintenance alert
   */
  async acknowledgeAlert(alertId: number, userId: number): Promise<DeviceMaintenanceAlert | undefined> {
    const [alert] = await db
      .update(deviceMaintenanceAlerts)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      })
      .where(eq(deviceMaintenanceAlerts.id, alertId))
      .returning();
      
    return alert;
  }

  /**
   * Resolve a maintenance issue
   */
  async resolveMaintenanceIssue(
    issueId: number,
    userId: number,
    resolution: string,
    notes?: string,
    maintenanceCost?: number
  ): Promise<DeviceMaintenanceIssue | undefined> {
    const [issue] = await db
      .update(deviceMaintenanceIssues)
      .set({
        status: 'completed',
        resolvedAt: new Date(),
        resolution,
        resolutionNotes: notes,
        maintenanceCost,
      })
      .where(eq(deviceMaintenanceIssues.id, issueId))
      .returning();
      
    return issue;
  }

  /**
   * Generate a maintenance report for a site
   */
  async generateMaintenanceReport(siteId: number): Promise<any> {
    try {
      // Get all devices for the site
      const siteDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.siteId, siteId));
        
      const deviceIds = siteDevices.map(d => d.id);
      
      // Get health metrics for all devices
      const healthMetricsPromises = deviceIds.map(id => this.getLatestDeviceHealthMetrics(id));
      const deviceHealthMetrics = await Promise.all(healthMetricsPromises);
      
      // Get maintenance issues for all devices
      const maintenanceIssues = await db
        .select()
        .from(deviceMaintenanceIssues)
        .where(sql`${deviceMaintenanceIssues.deviceId} IN (${deviceIds.join(',')})`);
        
      // Get maintenance alerts for all devices
      const maintenanceAlerts = await db
        .select()
        .from(deviceMaintenanceAlerts)
        .where(sql`${deviceMaintenanceAlerts.deviceId} IN (${deviceIds.join(',')})`);
        
      // Organize data by device
      const deviceReports = siteDevices.map((device, index) => {
        const healthMetrics = deviceHealthMetrics[index];
        const issues = maintenanceIssues.filter(issue => issue.deviceId === device.id);
        const alerts = maintenanceAlerts.filter(alert => alert.deviceId === device.id);
        
        return {
          device,
          healthMetrics,
          issues,
          alerts,
          healthScore: healthMetrics?.overallHealthScore || 0,
          healthStatus: healthMetrics?.healthStatus || 'unknown',
          activeIssues: issues.filter(i => i.status !== 'completed').length,
          resolvedIssues: issues.filter(i => i.status === 'completed').length,
          activeAlerts: alerts.filter(a => !a.acknowledgedAt).length,
        };
      });
      
      // Calculate site-wide metrics
      const totalDevices = deviceReports.length;
      const devicesWithIssues = deviceReports.filter(r => r.activeIssues > 0).length;
      const devicesWithAlerts = deviceReports.filter(r => r.activeAlerts > 0).length;
      const avgHealthScore = deviceReports.reduce((sum, r) => sum + r.healthScore, 0) / totalDevices;
      
      // Prepare the report
      return {
        siteId,
        generatedAt: new Date(),
        totalDevices,
        devicesWithIssues,
        devicesWithAlerts,
        avgHealthScore,
        deviceReports,
        summary: {
          healthStatus: this.getSiteHealthStatus(avgHealthScore),
          totalIssues: maintenanceIssues.length,
          activeIssues: maintenanceIssues.filter(i => i.status !== 'completed').length,
          resolvedIssues: maintenanceIssues.filter(i => i.status === 'completed').length,
          totalAlerts: maintenanceAlerts.length,
          activeAlerts: maintenanceAlerts.filter(a => !a.acknowledgedAt).length,
          acknowledgedAlerts: maintenanceAlerts.filter(a => !!a.acknowledgedAt).length,
        },
      };
    } catch (error) {
      console.error('Error generating maintenance report:', error);
      throw error;
    }
  }

  /**
   * Get site health status based on average health score
   */
  private getSiteHealthStatus(avgHealthScore: number): string {
    if (avgHealthScore >= 90) return 'Excellent';
    if (avgHealthScore >= 80) return 'Good';
    if (avgHealthScore >= 70) return 'Fair';
    if (avgHealthScore >= 50) return 'Poor';
    return 'Critical';
  }
}

export const predictiveMaintenanceService = new PredictiveMaintenanceService();