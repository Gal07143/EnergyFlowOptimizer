/**
 * Tariff Optimization Utilities
 * 
 * This module contains helper functions for making optimization decisions
 * based on tariff information, with specific optimizations for Israeli tariffs.
 */

import { db } from '../db';
import { tariffs, type Device } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Types for tariff data
interface TariffRate {
  period: string;
  rate: number;
  startHour: number;
  endHour: number;
}

interface TariffSchedule {
  [season: string]: {
    peak: number;
    shoulder: number;
    offPeak: number;
  };
}

interface TariffInfo {
  id: number;
  name: string;
  provider: string;
  importRate: number;
  exportRate: number;
  isTimeOfUse: boolean;
  scheduleData?: TariffSchedule;
  currency: string;
  currentRate: number;
  currentPeriod: string;
  isIsraeliTariff: boolean;
}

/**
 * Get comprehensive tariff information for a site
 */
export async function getTariffInfoForSite(siteId: number): Promise<TariffInfo | null> {
  try {
    // Get tariffs for the site
    const siteTariffs = await db.select().from(tariffs).where(eq(tariffs.siteId, siteId));
    
    if (siteTariffs.length === 0) {
      return null;
    }
    
    // For now, we just use the first tariff found
    const tariff = siteTariffs[0];
    
    // Get current rate based on time of day if it's a Time of Use tariff
    let currentRate = Number(tariff.importRate);
    let currentPeriod = 'Standard Rate';
    
    if (tariff.isTimeOfUse && tariff.scheduleData) {
      const now = new Date();
      const hours = now.getHours();
      const schedule = tariff.scheduleData as TariffSchedule;
      
      // Determine current season
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed
      
      let currentSeason;
      if (month >= 6 && month <= 9) {
        currentSeason = 'summer'; // June-September
      } else if (month >= 10 && month <= 11) {
        currentSeason = 'autumn'; // October-November
      } else if (month >= 3 && month <= 5) {
        currentSeason = 'spring'; // March-May
      } else {
        currentSeason = 'winter'; // December-February
      }
      
      const seasonSchedule = schedule[currentSeason];
      
      if (seasonSchedule) {
        if (hours >= 17 && hours < 22) {
          currentRate = seasonSchedule.peak;
          currentPeriod = 'Peak (17:00-22:00)';
        } else if ((hours >= 7 && hours < 17) || (hours >= 22 && hours < 23)) {
          currentRate = seasonSchedule.shoulder;
          currentPeriod = 'Shoulder (7:00-17:00, 22:00-23:00)';
        } else {
          currentRate = seasonSchedule.offPeak;
          currentPeriod = 'Off-Peak (23:00-7:00)';
        }
      }
    }
    
    return {
      id: tariff.id,
      name: tariff.name || "Unnamed Tariff",
      provider: tariff.provider || "Unknown Provider",
      importRate: Number(tariff.importRate),
      exportRate: Number(tariff.exportRate),
      isTimeOfUse: tariff.isTimeOfUse || false,
      scheduleData: tariff.scheduleData as TariffSchedule,
      currency: tariff.currency || "ILS",
      currentRate,
      currentPeriod,
      isIsraeliTariff: tariff.name ? tariff.name.includes('Israeli') : false,
    };
  } catch (error) {
    console.error('Error fetching tariff info:', error);
    return null;
  }
}

/**
 * Determine if it's currently a peak pricing period
 */
export function isPeakPricingPeriod(): boolean {
  const now = new Date();
  const hours = now.getHours();
  
  // In Israeli tariff, peak hours are 17:00-22:00
  return hours >= 17 && hours < 22;
}

/**
 * Determine if it's currently a low-price (off-peak) period
 */
export function isOffPeakPricingPeriod(): boolean {
  const now = new Date();
  const hours = now.getHours();
  
  // In Israeli tariff, off-peak hours are 23:00-7:00
  return hours >= 23 || hours < 7;
}

/**
 * Get the next cheapest rate period start time
 */
export function getNextCheapRatePeriodStart(): Date {
  const now = new Date();
  const hours = now.getHours();
  
  // If we're before 23:00, the next cheap period is at 23:00
  // If we're after 23:00, we're already in the cheap period
  if (hours < 23) {
    const cheapPeriodStart = new Date(now);
    cheapPeriodStart.setHours(23, 0, 0, 0);
    return cheapPeriodStart;
  }
  
  // We're already in the cheap period
  return now;
}

/**
 * Get the next expensive rate period start time
 */
export function getNextExpensiveRatePeriodStart(): Date {
  const now = new Date();
  const hours = now.getHours();
  
  // If we're before 17:00, the next expensive period is at 17:00
  // If we're after 17:00 but before 22:00, we're already in the expensive period
  // If we're after 22:00, the next expensive period is at 17:00 tomorrow
  if (hours < 17) {
    const expensivePeriodStart = new Date(now);
    expensivePeriodStart.setHours(17, 0, 0, 0);
    return expensivePeriodStart;
  }
  
  if (hours >= 22) {
    const expensivePeriodStart = new Date(now);
    expensivePeriodStart.setDate(expensivePeriodStart.getDate() + 1);
    expensivePeriodStart.setHours(17, 0, 0, 0);
    return expensivePeriodStart;
  }
  
  // We're already in the expensive period
  return now;
}

/**
 * Calculate potential savings from price arbitrage between rate periods
 */
export function calculateArbitrageSavings(
  batteryCapacityKWh: number,
  batteryEfficiency: number,
  currentRatePerKWh: number,
  nextCheapRatePerKWh: number
): number {
  const usableCapacity = batteryCapacityKWh * 0.8; // Typical usable capacity is 80% of nominal
  const roundTripEfficiency = batteryEfficiency; // e.g., 0.9 for 90% efficiency
  
  // Calculate the cost difference between charging at the cheap rate and using at the expensive rate
  const savingsPerKWh = currentRatePerKWh - (nextCheapRatePerKWh / roundTripEfficiency);
  
  // Total potential savings
  const potentialSavings = usableCapacity * savingsPerKWh;
  
  return potentialSavings;
}

/**
 * Determine if battery arbitrage is profitable with current tariff
 */
export function isArbitrageProfitable(tariffInfo: TariffInfo): boolean {
  if (!tariffInfo.isTimeOfUse) {
    return false; // Arbitrage only makes sense with time-of-use tariffs
  }
  
  // For Israeli tariffs, the price differential is large enough to make 
  // arbitrage profitable despite battery inefficiencies
  if (tariffInfo.isIsraeliTariff) {
    const schedule = tariffInfo.scheduleData;
    if (!schedule) return false;
    
    // Determine current season
    const now = new Date();
    const month = now.getMonth() + 1;
    
    let currentSeason;
    if (month >= 6 && month <= 9) {
      currentSeason = 'summer';
    } else if (month >= 10 && month <= 11) {
      currentSeason = 'autumn';
    } else if (month >= 3 && month <= 5) {
      currentSeason = 'spring';
    } else {
      currentSeason = 'winter';
    }
    
    const peakRate = schedule[currentSeason].peak;
    const offPeakRate = schedule[currentSeason].offPeak;
    
    // Assuming battery round-trip efficiency of 85%
    const efficiencyFactor = 0.85;
    
    // Arbitrage is profitable if: peakRate > offPeakRate / efficiencyFactor
    return peakRate > (offPeakRate / efficiencyFactor);
  }
  
  return false;
}

/**
 * Get optimal battery charge timing based on tariff
 */
export function getOptimalChargeTiming(tariffInfo: TariffInfo): { startTime: Date; endTime: Date } {
  const now = new Date();
  
  // For Israeli tariffs, optimal charge time is during off-peak hours (23:00-7:00)
  const startTime = new Date(now);
  if (now.getHours() < 23 && now.getHours() >= 7) {
    // If current time is outside off-peak, set start time to next off-peak period
    startTime.setHours(23, 0, 0, 0);
  } else {
    // Already in off-peak period, start now
    startTime.setTime(now.getTime());
  }
  
  // End time is the end of off-peak period (7:00 AM)
  const endTime = new Date(startTime);
  if (endTime.getHours() >= 23) {
    // If we're starting in the evening, the end is 7:00 AM next day
    endTime.setDate(endTime.getDate() + 1);
  }
  endTime.setHours(7, 0, 0, 0);
  
  return { startTime, endTime };
}

/**
 * Get optimal battery discharge timing based on tariff
 */
export function getOptimalDischargeTiming(tariffInfo: TariffInfo): { startTime: Date; endTime: Date } {
  const now = new Date();
  
  // For Israeli tariffs, optimal discharge time is during peak hours (17:00-22:00)
  const startTime = new Date(now);
  if (now.getHours() < 17) {
    // If current time is before peak, set start time to beginning of peak period
    startTime.setHours(17, 0, 0, 0);
  } else if (now.getHours() >= 22) {
    // If current time is after peak, set start time to beginning of peak period next day
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(17, 0, 0, 0);
  } else {
    // Already in peak period, start now
    startTime.setTime(now.getTime());
  }
  
  // End time is the end of peak period (22:00)
  const endTime = new Date(startTime);
  endTime.setHours(22, 0, 0, 0);
  
  return { startTime, endTime };
}

/**
 * Get battery charge recommendations based on tariff
 */
export function getBatteryChargeRecommendations(
  tariffInfo: TariffInfo,
  batteryStateOfCharge: number
): { shouldCharge: boolean; targetSoC: number; reason: string } {
  // Default values
  let shouldCharge = false;
  let targetSoC = batteryStateOfCharge;
  let reason = 'No specific recommendation based on current conditions.';
  
  // If it's off-peak and battery is not full, recommend charging
  if (isOffPeakPricingPeriod() && batteryStateOfCharge < 90) {
    shouldCharge = true;
    targetSoC = 90; // Charge to 90% during off-peak
    reason = 'Currently in off-peak period with lower electricity rates. Optimal time to charge battery.';
    
    // For Israeli tariff, add more specific guidance
    if (tariffInfo.isIsraeliTariff) {
      reason += ' Israeli tariff has significant price differential between peak and off-peak periods, making this especially advantageous.';
    }
  }
  // If it's peak or shoulder and battery is low, still charge a bit to ensure minimal reserve
  else if (!isOffPeakPricingPeriod() && batteryStateOfCharge < 20) {
    shouldCharge = true;
    targetSoC = 30; // Charge to 30% minimum during peak/shoulder periods
    reason = 'Battery state of charge is low. Charging to minimum level to ensure reserve capacity.';
  }
  
  return { shouldCharge, targetSoC, reason };
}

/**
 * Get battery discharge recommendations based on tariff
 */
export function getBatteryDischargeRecommendations(
  tariffInfo: TariffInfo,
  batteryStateOfCharge: number
): { shouldDischarge: boolean; targetSoC: number; reason: string } {
  // Default values
  let shouldDischarge = false;
  let targetSoC = batteryStateOfCharge;
  let reason = 'No specific recommendation based on current conditions.';
  
  // If it's peak and battery has sufficient charge, recommend discharging
  if (isPeakPricingPeriod() && batteryStateOfCharge > 30) {
    shouldDischarge = true;
    targetSoC = 20; // Discharge to 20% during peak
    reason = 'Currently in peak period with higher electricity rates. Optimal time to use battery power.';
    
    // For Israeli tariff, add more specific guidance
    if (tariffInfo.isIsraeliTariff) {
      reason += ' Israeli peak tariff rates are significantly higher, making battery discharge highly economical.';
    }
  }
  
  return { shouldDischarge, targetSoC, reason };
}

/**
 * Get EV charging recommendations based on tariff
 */
export function getEVChargingRecommendations(
  tariffInfo: TariffInfo,
  currentTime: Date = new Date()
): { 
  shouldCharge: boolean; 
  recommendedStartTime: Date | null;
  chargePower: number;
  reason: string;
} {
  const hours = currentTime.getHours();
  
  // Default recommendation
  let shouldCharge = false;
  let recommendedStartTime = null;
  let chargePower = 11; // Default max power
  let reason = '';
  
  // For Israeli tariffs with time-of-use pricing
  if (tariffInfo.isIsraeliTariff && tariffInfo.isTimeOfUse) {
    // Off-peak period (23:00-7:00): Best time to charge at full power
    if (hours >= 23 || hours < 7) {
      shouldCharge = true;
      recommendedStartTime = new Date(currentTime);
      reason = 'Currently in off-peak period with lowest electricity rates. Optimal time to charge EV at full power.';
    }
    // Shoulder period (7:00-17:00, 22:00-23:00): Acceptable time to charge at medium power
    else if ((hours >= 7 && hours < 17) || (hours >= 22 && hours < 23)) {
      shouldCharge = true;
      recommendedStartTime = new Date(currentTime);
      chargePower = 7.4; // Reduced power during shoulder periods
      reason = 'Currently in shoulder period with medium electricity rates. Acceptable time to charge EV at reduced power.';
    }
    // Peak period (17:00-22:00): Avoid charging unless necessary
    else {
      shouldCharge = false;
      
      // Recommend the next off-peak period
      recommendedStartTime = new Date(currentTime);
      if (hours < 23) {
        recommendedStartTime.setHours(23, 0, 0, 0);
      } else {
        recommendedStartTime.setDate(recommendedStartTime.getDate() + 1);
        recommendedStartTime.setHours(0, 0, 0, 0);
      }
      
      reason = 'Currently in peak period with highest electricity rates. Recommend delaying charging until off-peak period.';
    }
    
    // Add additional information for Israeli tariff
    reason += ' Israeli electricity tariffs have significant price variation between periods.';
  } else {
    // For non-TOU tariffs, charging anytime is fine
    shouldCharge = true;
    recommendedStartTime = new Date(currentTime);
    reason = 'Fixed-rate tariff without time variations. Charging can occur at any time.';
  }
  
  return { shouldCharge, recommendedStartTime, chargePower, reason };
}

/**
 * Get heat pump operation recommendations based on tariff
 */
export function getHeatPumpRecommendations(
  tariffInfo: TariffInfo,
  currentTime: Date = new Date()
): { 
  shouldRun: boolean;
  optimizationMode: 'normal' | 'economy' | 'boost';
  preheatingRecommended: boolean;
  reason: string;
} {
  const hours = currentTime.getHours();
  
  // Default values
  let shouldRun = true;
  let optimizationMode: 'normal' | 'economy' | 'boost' = 'normal';
  let preheatingRecommended = false;
  let reason = '';
  
  // For Israeli tariffs with time-of-use pricing
  if (tariffInfo.isIsraeliTariff && tariffInfo.isTimeOfUse) {
    // Off-peak period (23:00-7:00): Best time to run at full capacity
    if (hours >= 23 || hours < 7) {
      shouldRun = true;
      optimizationMode = 'boost';
      preheatingRecommended = true;
      reason = 'Currently in off-peak period. Recommend running heat pump in boost mode and pre-heating/cooling.';
    }
    // Shoulder period (7:00-17:00, 22:00-23:00): Run in normal mode
    else if ((hours >= 7 && hours < 17) || (hours >= 22 && hours < 23)) {
      shouldRun = true;
      optimizationMode = 'normal';
      preheatingRecommended = false;
      reason = 'Currently in shoulder period. Recommend running heat pump in normal mode.';
    }
    // Peak period (17:00-22:00): Run in economy mode or avoid if possible
    else {
      shouldRun = true; // Still run for comfort, but in economy mode
      optimizationMode = 'economy';
      preheatingRecommended = false;
      reason = 'Currently in peak period. Recommend running heat pump in economy mode to reduce energy consumption.';
    }
    
    // Add additional context for Israeli tariff
    reason += ' Israeli electricity tariffs have significant price variation between periods.';
  } else {
    // For non-TOU tariffs, normal operation is fine
    shouldRun = true;
    optimizationMode = 'normal';
    preheatingRecommended = false;
    reason = 'Fixed-rate tariff without time variations. Normal operation recommended.';
  }
  
  return { shouldRun, optimizationMode, preheatingRecommended, reason };
}

/**
 * Generate comprehensive optimization recommendations based on tariff
 */
export async function generateTariffBasedRecommendations(
  siteId: number,
  devices: any[],
  batteryStateOfCharge?: number
): Promise<any> {
  // Get tariff information
  const tariffInfo = await getTariffInfoForSite(siteId);
  if (!tariffInfo) {
    return {
      recommendations: [],
      reasoning: 'No tariff information available for this site.'
    };
  }
  
  const now = new Date();
  const recommendations = [];
  let reasoning = '';
  
  // Add tariff context to reasoning
  reasoning += `Current tariff: ${tariffInfo.name}, Current rate: ${tariffInfo.currentRate} ${tariffInfo.currency}/kWh (${tariffInfo.currentPeriod}).\n`;
  
  // Israeli-specific logic
  if (tariffInfo.isIsraeliTariff) {
    reasoning += 'Using specialized Israeli tariff optimization strategies based on the significant price differentials between peak and off-peak periods.\n';
  }
  
  // Process each device
  for (const device of devices) {
    switch (device.type) {
      case 'battery_storage':
      case 'battery':
        const currentSoC = batteryStateOfCharge || (device.readings?.soc || 50);
        
        if (isPeakPricingPeriod()) {
          // During peak hours, recommend discharging the battery
          const dischargeRecommendation = getBatteryDischargeRecommendations(tariffInfo, currentSoC);
          
          if (dischargeRecommendation.shouldDischarge) {
            recommendations.push({
              deviceId: device.id,
              command: 'setDischargeMode',
              params: { mode: 'grid', target: dischargeRecommendation.targetSoC },
              priority: 1,
              scheduledTime: now.toISOString()
            });
            
            reasoning += `Battery ${device.name}: ${dischargeRecommendation.reason}\n`;
          }
        } else if (isOffPeakPricingPeriod()) {
          // During off-peak hours, recommend charging the battery
          const chargeRecommendation = getBatteryChargeRecommendations(tariffInfo, currentSoC);
          
          if (chargeRecommendation.shouldCharge) {
            recommendations.push({
              deviceId: device.id,
              command: 'setChargeMode',
              params: { mode: 'grid', target: chargeRecommendation.targetSoC },
              priority: 1,
              scheduledTime: now.toISOString()
            });
            
            reasoning += `Battery ${device.name}: ${chargeRecommendation.reason}\n`;
          }
        }
        break;
        
      case 'ev_charger':
        const evRecommendation = getEVChargingRecommendations(tariffInfo, now);
        
        if (evRecommendation.shouldCharge) {
          recommendations.push({
            deviceId: device.id,
            command: 'setChargingCurrent',
            params: { current: evRecommendation.chargePower / 230 }, // Convert power to current (A)
            priority: 2,
            scheduledTime: now.toISOString()
          });
        } else if (evRecommendation.recommendedStartTime) {
          // Schedule charging for the recommended time
          recommendations.push({
            deviceId: device.id,
            command: 'setChargingCurrent',
            params: { current: 0 }, // Stop charging now
            priority: 2,
            scheduledTime: now.toISOString()
          });
          
          recommendations.push({
            deviceId: device.id,
            command: 'setChargingCurrent',
            params: { current: 16 }, // Start charging at recommended time
            priority: 2,
            scheduledTime: evRecommendation.recommendedStartTime.toISOString()
          });
        }
        
        reasoning += `EV Charger ${device.name}: ${evRecommendation.reason}\n`;
        break;
        
      case 'heat_pump':
        const heatPumpRecommendation = getHeatPumpRecommendations(tariffInfo, now);
        
        if (heatPumpRecommendation.shouldRun) {
          recommendations.push({
            deviceId: device.id,
            command: 'setOperationMode',
            params: { mode: heatPumpRecommendation.optimizationMode },
            priority: 3,
            scheduledTime: now.toISOString()
          });
          
          if (heatPumpRecommendation.preheatingRecommended) {
            recommendations.push({
              deviceId: device.id,
              command: 'activatePreheating',
              params: { duration: 60 }, // 60 minutes of preheating
              priority: 3,
              scheduledTime: now.toISOString()
            });
          }
        }
        
        reasoning += `Heat Pump ${device.name}: ${heatPumpRecommendation.reason}\n`;
        break;
    }
  }
  
  // If there are no device-specific recommendations, add a general recommendation
  if (recommendations.length === 0) {
    reasoning += 'No specific device control recommendations based on current tariff conditions.\n';
  }
  
  // Calculate expected savings
  let expectedSavings = 0;
  if (tariffInfo.isTimeOfUse) {
    // Simple estimate based on typical daily consumption
    const dailyConsumptionKWh = 15; // Average household daily consumption
    const standardRate = tariffInfo.importRate;
    const currentRate = tariffInfo.currentRate;
    
    // Basic savings calculation
    if (currentRate < standardRate) {
      expectedSavings = (standardRate - currentRate) * dailyConsumptionKWh;
    }
    
    reasoning += `Estimated daily savings: ${expectedSavings.toFixed(2)} ${tariffInfo.currency} based on typical consumption patterns and current rates.\n`;
  }
  
  return {
    recommendations,
    predictedSavings: expectedSavings,
    confidenceScore: 0.8,
    reasoning: reasoning
  };
}