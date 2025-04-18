import { initDeviceManagementService } from './deviceManagementService';
import { getEnergyPriceService } from './energyPriceService';
import { getBatteryArbitrageService } from './batteryArbitrageService';

/**
 * Analytics Types
 */
export enum AnalyticsType {
  ENERGY_USAGE_PATTERN = 'energy_usage_pattern',
  DEVICE_PERFORMANCE = 'device_performance',
  COST_OPTIMIZATION = 'cost_optimization',
  CARBON_FOOTPRINT = 'carbon_footprint',
  PEAK_DEMAND = 'peak_demand',
  BATTERY_UTILIZATION = 'battery_utilization',
  SOLAR_PRODUCTION = 'solar_production',
  FORECASTING = 'forecasting'
}

/**
 * Time Granularity
 */
export enum TimeGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Analytics service class
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private deviceService = initDeviceManagementService();
  private priceService = getEnergyPriceService();
  private arbitrageService = getBatteryArbitrageService();

  /**
   * Get singleton instance
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Run analytics based on type, site, and date range
   */
  public async runAnalytics(
    siteId: number,
    analyticsType: AnalyticsType,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    switch (analyticsType) {
      case AnalyticsType.ENERGY_USAGE_PATTERN:
        return this.analyzeEnergyUsagePattern(siteId, granularity, startDate, endDate);
      case AnalyticsType.DEVICE_PERFORMANCE:
        return this.analyzeDevicePerformance(siteId, granularity, startDate, endDate);
      case AnalyticsType.COST_OPTIMIZATION:
        return this.analyzeCostOptimization(siteId, granularity, startDate, endDate);
      case AnalyticsType.CARBON_FOOTPRINT:
        return this.analyzeCarbonFootprint(siteId, granularity, startDate, endDate);
      case AnalyticsType.PEAK_DEMAND:
        return this.analyzePeakDemand(siteId, granularity, startDate, endDate);
      case AnalyticsType.BATTERY_UTILIZATION:
        return this.analyzeBatteryUtilization(siteId, granularity, startDate, endDate);
      case AnalyticsType.SOLAR_PRODUCTION:
        return this.analyzeSolarProduction(siteId, granularity, startDate, endDate);
      case AnalyticsType.FORECASTING:
        return this.analyzeForecasting(siteId, granularity, startDate, endDate);
      default:
        throw new Error(`Unsupported analytics type: ${analyticsType}`);
    }
  }

  /**
   * Analyze energy usage patterns
   */
  private async analyzeEnergyUsagePattern(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Get consumption devices
    const consumptionDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'smart_meter' || d.type === 'ev_charger' || d.type === 'heat_pump');

    if (consumptionDevices.length === 0) {
      return {
        message: 'No consumption devices found at this site',
        siteId,
        analyticsType: AnalyticsType.ENERGY_USAGE_PATTERN,
        granularity,
        startDate,
        endDate
      };
    }

    // Generate time periods based on granularity
    const periods = this.generateTimePeriods(granularity, startDate, endDate);
    
    // Generate consumption data
    const usageData = periods.map(period => {
      // Base consumption varies by time of day/week/month
      let baseConsumption = 10 + Math.random() * 20; // 10-30 kWh base
      
      // Adjust for time of day if hourly
      if (granularity === TimeGranularity.HOURLY) {
        const hour = new Date(period.start).getHours();
        // Higher consumption in morning (7-9) and evening (17-22)
        if (hour >= 7 && hour <= 9) {
          baseConsumption *= 1.5;
        } else if (hour >= 17 && hour <= 22) {
          baseConsumption *= 2;
        } else if (hour >= 0 && hour <= 5) {
          baseConsumption *= 0.5; // Lower at night
        }
      }
      
      // Adjust for day of week if daily
      if (granularity === TimeGranularity.DAILY) {
        const day = new Date(period.start).getDay();
        // Higher on weekdays, lower on weekends
        if (day === 0 || day === 6) {
          baseConsumption *= 1.2; // Weekends
        }
      }
      
      // Adjust for season if monthly
      if (granularity === TimeGranularity.MONTHLY) {
        const month = new Date(period.start).getMonth();
        // Higher in summer (AC) and winter (heating)
        if (month >= 5 && month <= 8) {
          baseConsumption *= 1.4; // Summer
        } else if (month >= 11 || month <= 2) {
          baseConsumption *= 1.6; // Winter
        }
      }
      
      // Calculate device-specific consumption
      const deviceBreakdown = consumptionDevices.map(device => {
        let deviceConsumption = 0;
        
        switch (device.type) {
          case 'smart_meter':
            deviceConsumption = baseConsumption * 0.6; // 60% of base is general consumption
            break;
          case 'ev_charger':
            // EVs tend to charge in evenings
            if (granularity === TimeGranularity.HOURLY) {
              const hour = new Date(period.start).getHours();
              if (hour >= 18 && hour <= 23) {
                deviceConsumption = baseConsumption * 0.3; // 30% of base when charging
              } else {
                deviceConsumption = baseConsumption * 0.05; // 5% otherwise
              }
            } else {
              deviceConsumption = baseConsumption * 0.2; // 20% of base for longer periods
            }
            break;
          case 'heat_pump':
            // Heat pumps run more in extreme temperatures
            if (granularity === TimeGranularity.MONTHLY) {
              const month = new Date(period.start).getMonth();
              if (month >= 5 && month <= 8) {
                deviceConsumption = baseConsumption * 0.3; // 30% in summer (cooling)
              } else if (month >= 11 || month <= 2) {
                deviceConsumption = baseConsumption * 0.4; // 40% in winter (heating)
              } else {
                deviceConsumption = baseConsumption * 0.1; // 10% in mild weather
              }
            } else {
              deviceConsumption = baseConsumption * 0.2; // 20% of base for shorter periods
            }
            break;
        }
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          consumption: deviceConsumption
        };
      });
      
      // Calculate peak time (% of consumption during peak hours)
      const peakPercentage = granularity === TimeGranularity.HOURLY
        ? new Date(period.start).getHours() >= 17 && new Date(period.start).getHours() <= 21
          ? 1 // This hour is a peak hour
          : 0 // This hour is not a peak hour
        : 0.25; // Assume 25% of consumption is during peak hours for longer periods
      
      return {
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          label: period.label
        },
        totalConsumption: deviceBreakdown.reduce((sum, d) => sum + d.consumption, 0),
        peakPercentage,
        devices: deviceBreakdown
      };
    });
    
    // Calculate overall metrics
    const totalConsumption = usageData.reduce((sum, period) => sum + period.totalConsumption, 0);
    const avgPeakPercentage = usageData.reduce((sum, period) => sum + period.peakPercentage, 0) / usageData.length;
    
    // Find patterns
    const patterns = this.findEnergyUsagePatterns(usageData, granularity);
    
    return {
      siteId,
      analyticsType: AnalyticsType.ENERGY_USAGE_PATTERN,
      granularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalConsumption,
      avgPeakPercentage,
      deviceCount: consumptionDevices.length,
      patterns,
      usageData
    };
  }

  /**
   * Find energy usage patterns
   */
  private findEnergyUsagePatterns(
    usageData: any[],
    granularity: TimeGranularity
  ): any[] {
    const patterns = [];
    
    // Pattern 1: Find peak usage periods
    if (usageData.length > 0) {
      // Sort by consumption (descending)
      const sortedByUsage = [...usageData].sort((a, b) => b.totalConsumption - a.totalConsumption);
      const topUsagePeriods = sortedByUsage.slice(0, Math.min(5, sortedByUsage.length));
      
      patterns.push({
        type: 'peak_usage',
        description: 'Periods with highest energy consumption',
        periods: topUsagePeriods.map(p => ({
          period: p.period,
          consumption: p.totalConsumption
        }))
      });
    }
    
    // Pattern 2: Device contribution to peak
    if (usageData.length > 0 && usageData[0].devices.length > 0) {
      const deviceTypes = [...new Set(usageData[0].devices.map((d: any) => d.deviceType))];
      
      const deviceContributions = deviceTypes.map(type => {
        // Calculate average contribution percentage for this device type
        const totalByDevice = usageData.reduce((sum, period) => {
          const deviceConsumption = period.devices
            .filter((d: any) => d.deviceType === type)
            .reduce((devSum: number, d: any) => devSum + d.consumption, 0);
          return sum + deviceConsumption;
        }, 0);
        
        const totalConsumption = usageData.reduce((sum, period) => sum + period.totalConsumption, 0);
        const percentage = totalConsumption > 0 ? (totalByDevice / totalConsumption) * 100 : 0;
        
        return {
          deviceType: type,
          totalConsumption: totalByDevice,
          percentage
        };
      });
      
      patterns.push({
        type: 'device_contribution',
        description: 'Device type contribution to energy consumption',
        deviceContributions: deviceContributions.sort((a, b) => b.percentage - a.percentage)
      });
    }
    
    // Pattern 3: Time-based patterns based on granularity
    if (granularity === TimeGranularity.HOURLY && usageData.length >= 24) {
      // Group by hour of day
      const hourlyAverages: number[] = Array(24).fill(0);
      const hourCounts: number[] = Array(24).fill(0);
      
      usageData.forEach(data => {
        const hour = new Date(data.period.start).getHours();
        hourlyAverages[hour] += data.totalConsumption;
        hourCounts[hour]++;
      });
      
      // Calculate averages
      const hourlyPattern = hourlyAverages.map((total, hour) => ({
        hour,
        avgConsumption: hourCounts[hour] > 0 ? total / hourCounts[hour] : 0
      }));
      
      patterns.push({
        type: 'hourly_pattern',
        description: 'Average consumption by hour of day',
        hourlyPattern: hourlyPattern.sort((a, b) => b.avgConsumption - a.avgConsumption)
      });
    }
    
    if (granularity === TimeGranularity.DAILY && usageData.length >= 7) {
      // Group by day of week
      const dailyAverages: number[] = Array(7).fill(0);
      const dayCounts: number[] = Array(7).fill(0);
      
      usageData.forEach(data => {
        const day = new Date(data.period.start).getDay();
        dailyAverages[day] += data.totalConsumption;
        dayCounts[day]++;
      });
      
      // Calculate averages
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dailyPattern = dailyAverages.map((total, day) => ({
        day: daysOfWeek[day],
        avgConsumption: dayCounts[day] > 0 ? total / dayCounts[day] : 0
      }));
      
      patterns.push({
        type: 'daily_pattern',
        description: 'Average consumption by day of week',
        dailyPattern: dailyPattern.sort((a, b) => b.avgConsumption - a.avgConsumption)
      });
    }
    
    return patterns;
  }

  /**
   * Analyze device performance
   */
  private async analyzeDevicePerformance(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Get all devices at the site
    const devices = this.deviceService.getDevicesBySite(siteId);
    
    if (devices.length === 0) {
      return {
        message: 'No devices found at this site',
        siteId,
        analyticsType: AnalyticsType.DEVICE_PERFORMANCE,
        granularity,
        startDate,
        endDate
      };
    }
    
    // Generate time periods based on granularity
    const periods = this.generateTimePeriods(granularity, startDate, endDate);
    
    // Generate performance data for each device over time
    const performanceData = devices.map(device => {
      // Get baseline values for this device type
      let baselineEfficiency = 0.9; // 90% efficiency
      let baselineAvailability = 0.98; // 98% availability
      let baselineOutput = 1.0; // 100% of rated output
      
      // Adjust baseline based on device type
      switch (device.type) {
        case 'solar_pv':
          baselineEfficiency = 0.85; // 85% efficiency for solar
          baselineOutput = 0.75; // 75% of rated output (due to suboptimal conditions)
          break;
        case 'battery_storage':
          baselineEfficiency = 0.92; // 92% round-trip efficiency
          break;
        case 'ev_charger':
          baselineEfficiency = 0.95; // 95% efficiency for EV chargers
          break;
      }
      
      // Generate performance metrics for each period
      const periodicPerformance = periods.map(period => {
        // Random variation around baseline
        const efficiencyVariation = (Math.random() * 0.1) - 0.05; // +/- 5%
        const availabilityVariation = (Math.random() * 0.05) - 0.025; // +/- 2.5%
        const outputVariation = (Math.random() * 0.2) - 0.1; // +/- 10%
        
        // Calculate metrics with variation
        const efficiency = Math.min(1, Math.max(0, baselineEfficiency + efficiencyVariation));
        const availability = Math.min(1, Math.max(0, baselineAvailability + availabilityVariation));
        const outputRatio = Math.min(1, Math.max(0, baselineOutput + outputVariation));
        
        // Generate simulated issues
        const issues = Math.random() > 0.9 ? [{
          type: ['Connection', 'Performance', 'Error', 'Warning'][Math.floor(Math.random() * 4)],
          severity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
          message: `Simulated issue during ${period.label}`
        }] : [];
        
        return {
          period: {
            start: period.start.toISOString(),
            end: period.end.toISOString(),
            label: period.label
          },
          efficiency,
          availability,
          outputRatio,
          issues
        };
      });
      
      // Calculate overall metrics
      const avgEfficiency = periodicPerformance.reduce((sum, p) => sum + p.efficiency, 0) / periodicPerformance.length;
      const avgAvailability = periodicPerformance.reduce((sum, p) => sum + p.availability, 0) / periodicPerformance.length;
      const avgOutputRatio = periodicPerformance.reduce((sum, p) => sum + p.outputRatio, 0) / periodicPerformance.length;
      const totalIssues = periodicPerformance.reduce((sum, p) => sum + p.issues.length, 0);
      
      // Calculate performance score (0-100)
      const performanceScore = Math.round((avgEfficiency * 0.4 + avgAvailability * 0.4 + avgOutputRatio * 0.2) * 100);
      
      return {
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type,
        installDate: device.installDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        avgEfficiency,
        avgAvailability,
        avgOutputRatio,
        performanceScore,
        totalIssues,
        periodicPerformance
      };
    });
    
    // Calculate site-wide metrics
    const siteAvgPerformanceScore = Math.round(
      performanceData.reduce((sum, device) => sum + device.performanceScore, 0) / performanceData.length
    );
    
    // Group devices by type
    const deviceTypes = [...new Set(devices.map(d => d.type))];
    const performanceByType = deviceTypes.map(type => {
      const typeDevices = performanceData.filter(d => d.deviceType === type);
      return {
        deviceType: type,
        count: typeDevices.length,
        avgPerformanceScore: Math.round(
          typeDevices.reduce((sum, device) => sum + device.performanceScore, 0) / typeDevices.length
        )
      };
    });
    
    // Find performance insights
    const insights = this.findDevicePerformanceInsights(performanceData);
    
    return {
      siteId,
      analyticsType: AnalyticsType.DEVICE_PERFORMANCE,
      granularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      deviceCount: devices.length,
      siteAvgPerformanceScore,
      performanceByType,
      insights,
      devices: performanceData
    };
  }

  /**
   * Find device performance insights
   */
  private findDevicePerformanceInsights(performanceData: any[]): any[] {
    const insights = [];
    
    // Insight 1: Identify underperforming devices
    const underperformingThreshold = 75; // Performance score below 75 is underperforming
    const underperformingDevices = performanceData
      .filter(device => device.performanceScore < underperformingThreshold)
      .map(device => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        performanceScore: device.performanceScore,
        mainIssue: device.avgEfficiency < 0.8 ? 'Low Efficiency' : 
                  device.avgAvailability < 0.9 ? 'Low Availability' : 
                  'Low Output'
      }));
    
    if (underperformingDevices.length > 0) {
      insights.push({
        type: 'underperforming_devices',
        description: `${underperformingDevices.length} devices are performing below target`,
        devices: underperformingDevices
      });
    }
    
    // Insight 2: Identify best performing devices
    const highPerformingThreshold = 90; // Performance score above 90 is high performing
    const highPerformingDevices = performanceData
      .filter(device => device.performanceScore >= highPerformingThreshold)
      .map(device => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        performanceScore: device.performanceScore
      }));
    
    if (highPerformingDevices.length > 0) {
      insights.push({
        type: 'high_performing_devices',
        description: `${highPerformingDevices.length} devices are performing exceptionally well`,
        devices: highPerformingDevices
      });
    }
    
    // Insight 3: Performance trends over time
    const performanceTrends = performanceData.map(device => {
      // Check if performance is improving, steady, or declining
      const periodicScores = device.periodicPerformance.map((p: any) => 
        (p.efficiency * 0.4 + p.availability * 0.4 + p.outputRatio * 0.2) * 100
      );
      
      if (periodicScores.length < 2) {
        return {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          trend: 'steady'
        };
      }
      
      // Simple linear regression to detect trend
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      
      for (let i = 0; i < periodicScores.length; i++) {
        sumX += i;
        sumY += periodicScores[i];
        sumXY += i * periodicScores[i];
        sumXX += i * i;
      }
      
      const n = periodicScores.length;
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      
      let trend = 'steady';
      if (slope > 0.5) trend = 'improving';
      else if (slope < -0.5) trend = 'declining';
      
      return {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        trend,
        slope
      };
    });
    
    const decliningDevices = performanceTrends.filter(d => d.trend === 'declining');
    const improvingDevices = performanceTrends.filter(d => d.trend === 'improving');
    
    if (decliningDevices.length > 0) {
      insights.push({
        type: 'declining_performance',
        description: `${decliningDevices.length} devices show declining performance trends`,
        devices: decliningDevices
      });
    }
    
    if (improvingDevices.length > 0) {
      insights.push({
        type: 'improving_performance',
        description: `${improvingDevices.length} devices show improving performance trends`,
        devices: improvingDevices
      });
    }
    
    return insights;
  }

  /**
   * Analyze cost optimization
   */
  private async analyzeCostOptimization(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Get energy price data
    const priceData = await this.priceService.getPriceHistorical(siteId, startDate, endDate);
    
    // Generate time periods based on granularity
    const periods = this.generateTimePeriods(granularity, startDate, endDate);
    
    // Get devices that can be optimized (batteries, flexible loads)
    const batteries = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'battery_storage');
    
    const flexibleLoads = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'ev_charger' || d.type === 'heat_pump');
    
    // Get solar production capability
    const solarDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'solar_pv');
    
    // Get arbitrage performance if available
    const arbitragePerformance = batteries.length > 0 
      ? this.arbitrageService.getArbitragePerformance(siteId)
      : null;
    
    // Calculate solar capacity
    const solarCapacity = solarDevices.reduce((sum, device) => {
      const capacity = device.specs?.capacity || 5; // kW
      return sum + capacity;
    }, 0);
    
    // Calculate battery capacity and power
    const batteryCapacity = batteries.reduce((sum, device) => {
      const capacity = device.specs?.capacity || 10; // kWh
      return sum + capacity;
    }, 0);
    
    const batteryPower = batteries.reduce((sum, device) => {
      const power = device.specs?.maxDischargeRate || 5; // kW
      return sum + power;
    }, 0);
    
    // Generate optimization scenarios
    const optimizationScenarios = [];
    
    // Scenario 1: Time-of-use optimization
    if (batteries.length > 0) {
      // Calculate potential savings
      const avgPriceDifferential = 0.15; // $0.15/kWh difference between peak and off-peak
      const batteryEfficiency = 0.9; // 90% round-trip efficiency
      const dailyCycles = 0.8; // 0.8 cycles per day on average
      
      const dailySavings = batteryCapacity * dailyCycles * batteryEfficiency * avgPriceDifferential;
      const periodCount = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
      const totalSavings = dailySavings * periodCount;
      
      optimizationScenarios.push({
        type: 'time_of_use_optimization',
        description: 'Charge during off-peak and discharge during peak hours',
        assets: 'Battery Storage',
        potentialSavings: totalSavings,
        batteryCapacity,
        batteryPower,
        avgPriceDifferential,
        dailyCycles,
        currentImplementation: arbitragePerformance ? 'Active' : 'Not Implemented'
      });
    }
    
    // Scenario 2: Demand charge management
    if (batteries.length > 0 || flexibleLoads.length > 0) {
      // Estimate peak demand reduction
      const peakReduction = Math.min(batteryPower, 10); // kW reduction, max 10kW
      const demandCharge = 15; // $/kW-month
      const potentialSavings = peakReduction * demandCharge * (periods.length / 30); // Normalized to monthly periods
      
      optimizationScenarios.push({
        type: 'demand_charge_management',
        description: 'Reduce peak demand to lower demand charges',
        assets: batteries.length > 0 ? 'Battery Storage' : 'Flexible Loads',
        potentialSavings,
        peakReduction,
        demandCharge,
        currentImplementation: 'Not Implemented'
      });
    }
    
    // Scenario 3: Self-consumption optimization
    if (solarDevices.length > 0 && (batteries.length > 0 || flexibleLoads.length > 0)) {
      // Estimate potential self-consumption increase
      const baselineSelfConsumption = 0.7; // 70% self-consumption without optimization
      const optimizedSelfConsumption = 0.9; // 90% self-consumption with optimization
      const dailySolarProduction = solarCapacity * 4; // kWh/day (4h equivalent full production)
      const retailPrice = 0.15; // $/kWh
      
      const additionalSelfConsumption = dailySolarProduction * (optimizedSelfConsumption - baselineSelfConsumption);
      const dailySavings = additionalSelfConsumption * retailPrice;
      const periodCount = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
      const totalSavings = dailySavings * periodCount;
      
      optimizationScenarios.push({
        type: 'self_consumption_optimization',
        description: 'Maximize use of on-site solar production',
        assets: batteries.length > 0 ? 'Solar + Battery' : 'Solar + Flexible Loads',
        potentialSavings: totalSavings,
        baselineSelfConsumption,
        optimizedSelfConsumption,
        solarCapacity,
        currentImplementation: 'Partial Implementation'
      });
    }
    
    // Scenario 4: Dynamic pricing optimization
    if (batteries.length > 0) {
      const marketPriceVolatility = 0.25; // $0.25/kWh range in prices
      const dailyCycles = 1.0; // 1 cycle per day with dynamic pricing
      const batteryEfficiency = 0.9; // 90% round-trip efficiency
      
      const dailySavings = batteryCapacity * dailyCycles * batteryEfficiency * marketPriceVolatility * 0.3; // Capture 30% of volatility
      const periodCount = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
      const totalSavings = dailySavings * periodCount;
      
      optimizationScenarios.push({
        type: 'dynamic_pricing_optimization',
        description: 'Optimize for hourly market price variations',
        assets: 'Battery Storage',
        potentialSavings: totalSavings,
        marketPriceVolatility,
        batteryCapacity,
        dailyCycles,
        currentImplementation: arbitragePerformance ? 'Active' : 'Not Implemented'
      });
    }
    
    // Calculate total potential savings
    const totalPotentialSavings = optimizationScenarios.reduce(
      (sum, scenario) => sum + scenario.potentialSavings, 0
    );
    
    // Calculate current savings if arbitrage is implemented
    const currentSavings = arbitragePerformance ? arbitragePerformance.totalSavings : 0;
    
    // Calculate savings gap
    const savingsGap = totalPotentialSavings - currentSavings;
    
    return {
      siteId,
      analyticsType: AnalyticsType.COST_OPTIMIZATION,
      granularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      batteryCount: batteries.length,
      batteryCapacity,
      batteryPower,
      solarCapacity,
      flexibleLoadCount: flexibleLoads.length,
      totalPotentialSavings,
      currentSavings,
      savingsGap,
      optimizationScenarios
    };
  }

  /**
   * Analyze carbon footprint
   */
  private async analyzeCarbonFootprint(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Generate time periods based on granularity
    const periods = this.generateTimePeriods(granularity, startDate, endDate);
    
    // Get consumption and production devices
    const consumptionDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'smart_meter' || d.type === 'ev_charger' || d.type === 'heat_pump');
    
    const productionDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'solar_pv');
    
    if (consumptionDevices.length === 0 && productionDevices.length === 0) {
      return {
        message: 'No relevant devices found at this site',
        siteId,
        analyticsType: AnalyticsType.CARBON_FOOTPRINT,
        granularity,
        startDate,
        endDate
      };
    }
    
    // Generate carbon intensity data for each period (varies by time)
    const carbonData = periods.map(period => {
      // Base carbon intensity (kg CO2 per kWh)
      let baseIntensity = 0.4;
      
      // Variations based on time of day (hourly)
      if (granularity === TimeGranularity.HOURLY) {
        const hour = new Date(period.start).getHours();
        // Higher intensity during peak demand (more peaker plants online)
        if (hour >= 17 && hour <= 21) {
          baseIntensity *= 1.2;
        }
        // Lower intensity during solar peak hours
        else if (hour >= 10 && hour <= 16) {
          baseIntensity *= 0.8;
        }
      }
      
      // Variations based on month (seasonal)
      const month = new Date(period.start).getMonth();
      // Higher in winter (more fossil fuels for heating)
      if (month <= 1 || month >= 11) {
        baseIntensity *= 1.1;
      }
      // Lower in spring/fall (less heating/cooling need)
      else if (month >= 3 && month <= 4 || month >= 9 && month <= 10) {
        baseIntensity *= 0.9;
      }
      
      // Random daily variation
      const dailyVariation = 0.9 + Math.random() * 0.2; // 0.9-1.1 multiplier
      const gridCarbonIntensity = baseIntensity * dailyVariation;
      
      // Calculate consumption
      let consumption = 0;
      if (consumptionDevices.length > 0) {
        // Base consumption varies by time of day/week/month
        let baseConsumption = 10 + Math.random() * 20; // 10-30 kWh base
        
        // Adjust for time of day if hourly
        if (granularity === TimeGranularity.HOURLY) {
          const hour = new Date(period.start).getHours();
          // Higher consumption in morning (7-9) and evening (17-22)
          if (hour >= 7 && hour <= 9) {
            baseConsumption *= 1.5;
          } else if (hour >= 17 && hour <= 22) {
            baseConsumption *= 2;
          } else if (hour >= 0 && hour <= 5) {
            baseConsumption *= 0.5; // Lower at night
          }
        }
        
        consumption = baseConsumption;
      }
      
      // Calculate production
      let production = 0;
      if (productionDevices.length > 0) {
        const totalCapacity = productionDevices.reduce((sum, device) => {
          const capacity = device.specs?.capacity || 5; // kW
          return sum + capacity;
        }, 0);
        
        // Calculate production factor (0-1 representing efficiency)
        let productionFactor = 0.2; // Base factor
        
        // Adjust for time of day if hourly
        if (granularity === TimeGranularity.HOURLY) {
          const hour = new Date(period.start).getHours();
          // Higher production during solar peak hours
          if (hour >= 10 && hour <= 16) {
            productionFactor = 0.5 + Math.random() * 0.3; // 0.5-0.8
          } else if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
            productionFactor = 0.3 + Math.random() * 0.2; // 0.3-0.5
          } else {
            productionFactor = 0.05 + Math.random() * 0.05; // 0.05-0.1 at night
          }
        }
        
        // Adjust for season
        if (month >= 4 && month <= 8) { // Summer
          productionFactor *= 1.3;
        } else if (month <= 1 || month >= 11) { // Winter
          productionFactor *= 0.7;
        }
        
        production = totalCapacity * productionFactor * getTimePeriodHours(granularity);
      }
      
      // Calculate emissions and savings
      const grossEmissions = consumption * gridCarbonIntensity;
      const emissionsAvoided = production * gridCarbonIntensity;
      const netEmissions = grossEmissions - emissionsAvoided;
      
      return {
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          label: period.label
        },
        gridCarbonIntensity,
        consumption,
        production,
        grossEmissions,
        emissionsAvoided,
        netEmissions
      };
    });
    
    // Calculate overall metrics
    const totalConsumption = carbonData.reduce((sum, period) => sum + period.consumption, 0);
    const totalProduction = carbonData.reduce((sum, period) => sum + period.production, 0);
    const totalGrossEmissions = carbonData.reduce((sum, period) => sum + period.grossEmissions, 0);
    const totalEmissionsAvoided = carbonData.reduce((sum, period) => sum + period.emissionsAvoided, 0);
    const totalNetEmissions = carbonData.reduce((sum, period) => sum + period.netEmissions, 0);
    
    // Calculate self-sufficiency ratio
    const selfSufficiencyRatio = totalConsumption > 0 ? totalProduction / totalConsumption : 0;
    
    // Calculate emissions reduction percentage
    const emissionsReductionPercentage = totalGrossEmissions > 0 
      ? (totalEmissionsAvoided / totalGrossEmissions) * 100
      : 0;
    
    // Calculate average grid carbon intensity
    const avgGridCarbonIntensity = carbonData.reduce((sum, period) => sum + period.gridCarbonIntensity, 0) / carbonData.length;
    
    // Calculate equivalent metrics
    const treeEquivalent = totalEmissionsAvoided / 21; // kg CO2 absorbed by one tree in a year
    const carMilesEquivalent = totalEmissionsAvoided / 0.4; // kg CO2 per mile driven (average car)
    
    // Find emission patterns and insights
    const insights = this.findCarbonFootprintInsights(carbonData, granularity);
    
    return {
      siteId,
      analyticsType: AnalyticsType.CARBON_FOOTPRINT,
      granularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      avgGridCarbonIntensity,
      totalConsumption,
      totalProduction,
      totalGrossEmissions,
      totalEmissionsAvoided,
      totalNetEmissions,
      selfSufficiencyRatio,
      emissionsReductionPercentage,
      treeEquivalent,
      carMilesEquivalent,
      insights,
      carbonData
    };
  }

  /**
   * Find carbon footprint insights
   */
  private findCarbonFootprintInsights(
    carbonData: any[],
    granularity: TimeGranularity
  ): any[] {
    const insights = [];
    
    // Insight 1: Find periods with highest net emissions
    if (carbonData.length > 0) {
      // Sort by net emissions (descending)
      const sortedByEmissions = [...carbonData].sort((a, b) => b.netEmissions - a.netEmissions);
      const highEmissionPeriods = sortedByEmissions.slice(0, Math.min(5, sortedByEmissions.length));
      
      insights.push({
        type: 'high_emission_periods',
        description: 'Periods with highest net carbon emissions',
        periods: highEmissionPeriods.map(p => ({
          period: p.period,
          netEmissions: p.netEmissions,
          consumption: p.consumption,
          gridIntensity: p.gridCarbonIntensity
        }))
      });
    }
    
    // Insight 2: Find periods with best emission avoidance
    if (carbonData.length > 0) {
      // Sort by emissions avoided (descending)
      const sortedByAvoidance = [...carbonData].sort((a, b) => b.emissionsAvoided - a.emissionsAvoided);
      const highAvoidancePeriods = sortedByAvoidance.slice(0, Math.min(5, sortedByAvoidance.length));
      
      insights.push({
        type: 'high_avoidance_periods',
        description: 'Periods with highest carbon emissions avoided',
        periods: highAvoidancePeriods.map(p => ({
          period: p.period,
          emissionsAvoided: p.emissionsAvoided,
          production: p.production,
          gridIntensity: p.gridCarbonIntensity
        }))
      });
    }
    
    // Insight 3: Correlation between grid intensity and consumption
    if (carbonData.length > 2) {
      // Calculate correlation coefficient between intensity and consumption
      const intValues = carbonData.map(p => p.gridCarbonIntensity);
      const consValues = carbonData.map(p => p.consumption);
      
      const intAvg = intValues.reduce((sum, val) => sum + val, 0) / intValues.length;
      const consAvg = consValues.reduce((sum, val) => sum + val, 0) / consValues.length;
      
      let numerator = 0;
      let denomInt = 0;
      let denomCons = 0;
      
      for (let i = 0; i < intValues.length; i++) {
        numerator += (intValues[i] - intAvg) * (consValues[i] - consAvg);
        denomInt += Math.pow(intValues[i] - intAvg, 2);
        denomCons += Math.pow(consValues[i] - consAvg, 2);
      }
      
      const correlation = numerator / (Math.sqrt(denomInt) * Math.sqrt(denomCons));
      
      insights.push({
        type: 'consumption_intensity_correlation',
        description: 'Correlation between grid carbon intensity and consumption',
        correlation,
        interpretation: correlation > 0.5 ? 'Strong positive correlation: consumption tends to be higher when grid is dirtier' :
                        correlation < -0.5 ? 'Strong negative correlation: consumption tends to be lower when grid is dirtier' :
                        'Weak correlation: no clear pattern between consumption and grid carbon intensity'
      });
    }
    
    // Insight 4: Carbon reduction suggestions
    const reductionSuggestions = [];
    
    // Check if consumption is higher during high-carbon periods
    const highCarbonConsumption = carbonData.some(p => 
      p.gridCarbonIntensity > 0.5 && p.consumption > 0 && p.production < p.consumption
    );
    
    if (highCarbonConsumption) {
      reductionSuggestions.push({
        type: 'shift_consumption',
        description: 'Shift consumption to periods with lower carbon intensity',
        potentialImpact: 'Medium to High',
        implementation: 'Moderate difficulty'
      });
    }
    
    // Check if there's substantial consumption with low production
    const lowProductionRatio = carbonData.reduce((sum, p) => sum + p.production, 0) / 
                               carbonData.reduce((sum, p) => sum + p.consumption, 0);
    
    if (lowProductionRatio < 0.5) {
      reductionSuggestions.push({
        type: 'increase_renewables',
        description: 'Increase renewable generation capacity',
        potentialImpact: 'High',
        implementation: 'Higher investment required'
      });
    }
    
    // Check if there's excess production that could be stored
    const excessProduction = carbonData.some(p => p.production > p.consumption * 1.5);
    
    if (excessProduction) {
      reductionSuggestions.push({
        type: 'add_storage',
        description: 'Add energy storage to store excess clean energy',
        potentialImpact: 'Medium',
        implementation: 'Higher investment required'
      });
    }
    
    insights.push({
      type: 'carbon_reduction_suggestions',
      description: 'Suggestions to reduce carbon footprint',
      suggestions: reductionSuggestions
    });
    
    return insights;
  }

  /**
   * Analyze peak demand
   */
  private async analyzePeakDemand(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // This analysis is only meaningful with hourly data
    const effectiveGranularity = granularity === TimeGranularity.HOURLY 
      ? granularity 
      : TimeGranularity.HOURLY;
    
    // Generate time periods based on granularity
    const periods = this.generateTimePeriods(effectiveGranularity, startDate, endDate);
    
    // Get consumption devices
    const consumptionDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'smart_meter' || d.type === 'ev_charger' || d.type === 'heat_pump');
    
    if (consumptionDevices.length === 0) {
      return {
        message: 'No consumption devices found at this site',
        siteId,
        analyticsType: AnalyticsType.PEAK_DEMAND,
        granularity: effectiveGranularity,
        startDate,
        endDate
      };
    }
    
    // Get flexible resources for peak shaving
    const batteries = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'battery_storage');
    
    const flexibleLoads = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'ev_charger' || d.type === 'heat_pump');
    
    // Calculate battery capacity and power
    const batteryCapacity = batteries.reduce((sum, device) => {
      const capacity = device.specs?.capacity || 10; // kWh
      return sum + capacity;
    }, 0);
    
    const batteryPower = batteries.reduce((sum, device) => {
      const power = device.specs?.maxDischargeRate || 5; // kW
      return sum + power;
    }, 0);
    
    // Generate demand data
    const demandData = periods.map(period => {
      // Base demand varies by time of day/week
      let baseDemand = 5 + Math.random() * 5; // 5-10 kW base
      
      // Adjust for time of day (hourly)
      const hour = new Date(period.start).getHours();
      const day = new Date(period.start).getDay();
      
      // Higher demand in morning (7-9) and evening (17-22)
      if (hour >= 7 && hour <= 9) {
        baseDemand *= 1.5;
      } else if (hour >= 17 && hour <= 21) {
        baseDemand *= 2.5;
      } else if (hour >= 0 && hour <= 5) {
        baseDemand *= 0.5; // Lower at night
      }
      
      // Adjust for weekday/weekend
      if (day === 0 || day === 6) {
        baseDemand *= 0.8; // Lower on weekends
      }
      
      // Calculate device-specific demand
      const deviceDemand = consumptionDevices.map(device => {
        let devicePower = 0;
        
        switch (device.type) {
          case 'smart_meter':
            devicePower = baseDemand * 0.6; // 60% of base is general load
            break;
          case 'ev_charger':
            // EVs tend to charge in evenings
            if (hour >= 18 && hour <= 23) {
              devicePower = 7 * Math.random(); // Up to 7kW charger
            } else {
              devicePower = 1 * Math.random(); // Minimal otherwise
            }
            break;
          case 'heat_pump':
            // Heat pumps run more in morning and evening
            if (hour >= 6 && hour <= 9 || hour >= 17 && hour <= 22) {
              devicePower = 3 + 2 * Math.random(); // 3-5kW
            } else {
              devicePower = 1 + Math.random(); // 1-2kW otherwise
            }
            break;
        }
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          demand: devicePower
        };
      });
      
      // Calculate total demand
      const totalDemand = deviceDemand.reduce((sum, device) => sum + device.demand, 0);
      
      // Calculate potential peak shaving capacity
      const peakShavingPotential = Math.min(
        totalDemand * 0.3, // Can shave up to 30% of demand
        batteryPower + flexibleLoads.length * 2 // Battery power plus 2kW per flexible load
      );
      
      return {
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          label: period.label
        },
        totalDemand,
        devices: deviceDemand,
        peakShavingPotential
      };
    });
    
    // Group by day
    const days: Record<string, any[]> = {};
    
    demandData.forEach(data => {
      const date = new Date(data.period.start).toISOString().split('T')[0];
      days[date] = days[date] || [];
      days[date].push(data);
    });
    
    // Calculate daily peaks
    const dailyPeaks = Object.entries(days).map(([date, dayData]) => {
      // Sort by demand (descending)
      const sortedData = [...dayData].sort((a, b) => b.totalDemand - a.totalDemand);
      
      // Get top 3 peaks
      const peaks = sortedData.slice(0, 3);
      
      // Calculate peak durations
      const peakDuration = 1; // 1 hour per peak
      
      // Calculate peak shaving potential
      const weightedAvgShavingPotential = peaks.reduce((sum, peak) => sum + peak.peakShavingPotential, 0) / peaks.length;
      
      return {
        date,
        maxPeak: peaks[0]?.totalDemand || 0,
        peaks: peaks.map(peak => ({
          period: peak.period,
          demand: peak.totalDemand
        })),
        peakDuration,
        shavingPotential: weightedAvgShavingPotential
      };
    });
    
    // Find overall peak
    const overallPeak = demandData.reduce(
      (max, data) => data.totalDemand > max.demand ? { demand: data.totalDemand, period: data.period } : max,
      { demand: 0, period: null }
    );
    
    // Calculate peak consistency
    const dailyMaxPeaks = dailyPeaks.map(day => day.maxPeak);
    const avgPeak = dailyMaxPeaks.reduce((sum, peak) => sum + peak, 0) / dailyMaxPeaks.length;
    const peakVariation = Math.sqrt(
      dailyMaxPeaks.reduce((sum, peak) => sum + Math.pow(peak - avgPeak, 2), 0) / dailyMaxPeaks.length
    ) / avgPeak; // Coefficient of variation
    
    // Calculate demand charge implications
    const demandCharge = 15; // $/kW-month
    const monthlyCost = avgPeak * demandCharge;
    const potentialSavings = Math.min(
      batteryPower, 
      avgPeak * 0.2 // Assume can reduce peak by 20%
    ) * demandCharge;
    
    // Find peak patterns and insights
    const insights = this.findPeakDemandInsights(demandData, dailyPeaks);
    
    return {
      siteId,
      analyticsType: AnalyticsType.PEAK_DEMAND,
      granularity: effectiveGranularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      overallPeak,
      avgPeak,
      peakVariation,
      monthlyCost,
      batteryCapacity,
      batteryPower,
      potentialSavings,
      insights,
      dailyPeaks,
      demandData: granularity === TimeGranularity.HOURLY ? demandData : null // Only include hourly data if requested
    };
  }

  /**
   * Find peak demand insights
   */
  private findPeakDemandInsights(
    demandData: any[],
    dailyPeaks: any[]
  ): any[] {
    const insights = [];
    
    // Insight 1: Peak timing patterns
    const peakHours: Record<number, number> = {};
    
    // Count occurrences of each hour
    demandData.forEach(data => {
      const hour = new Date(data.period.start).getHours();
      
      // Check if this is a high demand period (top 10% of all periods)
      const isHighDemand = data.totalDemand > demandData
        .map(d => d.totalDemand)
        .sort((a, b) => b - a)[Math.floor(demandData.length * 0.1)];
      
      if (isHighDemand) {
        peakHours[hour] = (peakHours[hour] || 0) + 1;
      }
    });
    
    // Find hours with most peaks
    const topPeakHours = Object.entries(peakHours)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: Number(hour),
        count
      }));
    
    insights.push({
      type: 'peak_timing_patterns',
      description: 'Common hours for demand peaks',
      topPeakHours: topPeakHours.map(item => ({
        hour: item.hour,
        formattedHour: `${item.hour}:00 - ${item.hour + 1}:00`,
        frequency: item.count
      }))
    });
    
    // Insight 2: Device contribution to peaks
    if (demandData.length > 0 && demandData[0].devices.length > 0) {
      // Find top 10% peak periods
      const peakThreshold = demandData
        .map(d => d.totalDemand)
        .sort((a, b) => b - a)[Math.floor(demandData.length * 0.1)];
      
      const peakPeriods = demandData.filter(d => d.totalDemand >= peakThreshold);
      
      // Calculate device contributions during peaks
      const deviceTypes: string[] = [...new Set(demandData[0].devices.map((d: any) => d.deviceType))];
      
      const deviceContributions = deviceTypes.map(type => {
        // Calculate average contribution during peak periods
        const totalContribution = peakPeriods.reduce((sum, period) => {
          const deviceDemand = period.devices
            .filter((d: any) => d.deviceType === type)
            .reduce((devSum: number, d: any) => devSum + d.demand, 0);
          return sum + deviceDemand;
        }, 0);
        
        const totalPeakDemand = peakPeriods.reduce((sum, period) => sum + period.totalDemand, 0);
        const percentage = totalPeakDemand > 0 ? (totalContribution / totalPeakDemand) * 100 : 0;
        
        return {
          deviceType: type,
          averageContribution: totalContribution / peakPeriods.length,
          percentage
        };
      });
      
      insights.push({
        type: 'device_peak_contribution',
        description: 'Device type contribution to peak demand',
        deviceContributions: deviceContributions.sort((a, b) => b.percentage - a.percentage)
      });
    }
    
    // Insight 3: Peak shaving potential
    const avgShavingPotential = dailyPeaks.reduce((sum, day) => sum + day.shavingPotential, 0) / dailyPeaks.length;
    const avgPeak = dailyPeaks.reduce((sum, day) => sum + day.maxPeak, 0) / dailyPeaks.length;
    const potentialReduction = (avgShavingPotential / avgPeak) * 100;
    
    insights.push({
      type: 'peak_shaving_potential',
      description: 'Potential for peak demand reduction',
      avgShavingPotential,
      avgPeak,
      potentialReductionPercentage: potentialReduction,
      impact: potentialReduction > 20 ? 'High' : potentialReduction > 10 ? 'Medium' : 'Low'
    });
    
    // Insight 4: Peak demand reduction recommendations
    const recommendations = [];
    
    // Battery recommendation
    if (avgShavingPotential > 0) {
      recommendations.push({
        type: 'battery_peak_shaving',
        description: 'Use battery storage for peak shaving',
        potentialImpact: 'High',
        implementationCost: 'Medium to High',
        details: 'Discharge batteries during peak demand periods to reduce grid draw'
      });
    }
    
    // Load shifting recommendation
    if (topPeakHours.length > 0) {
      recommendations.push({
        type: 'load_shifting',
        description: 'Shift flexible loads away from peak hours',
        potentialImpact: 'Medium',
        implementationCost: 'Low',
        details: `Avoid running flexible loads during ${topPeakHours.map(h => `${h.hour}:00-${h.hour + 1}:00`).join(', ')}`
      });
    }
    
    // Smart charging recommendation
    const evContribution = insights.find((i: any) => 
      i.type === 'device_peak_contribution' && 
      i.deviceContributions.some((d: any) => d.deviceType === 'ev_charger' && d.percentage > 15)
    );
    
    if (evContribution) {
      recommendations.push({
        type: 'smart_ev_charging',
        description: 'Implement smart EV charging schedules',
        potentialImpact: 'Medium to High',
        implementationCost: 'Low to Medium',
        details: 'Stagger EV charging or shift to off-peak hours'
      });
    }
    
    insights.push({
      type: 'peak_reduction_recommendations',
      description: 'Recommendations to reduce peak demand',
      recommendations
    });
    
    return insights;
  }

  /**
   * Analyze battery utilization
   */
  private async analyzeBatteryUtilization(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Get battery devices
    const batteries = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'battery_storage');
    
    if (batteries.length === 0) {
      return {
        message: 'No battery storage devices found at this site',
        siteId,
        analyticsType: AnalyticsType.BATTERY_UTILIZATION,
        granularity,
        startDate,
        endDate
      };
    }
    
    // Generate time periods based on granularity
    const periods = this.generateTimePeriods(granularity, startDate, endDate);
    
    // Get arbitrage performance if available
    const arbitragePerformance = this.arbitrageService.getArbitragePerformance(siteId);
    
    // Generate battery utilization data
    const utilizationData = batteries.map(battery => {
      const capacity = battery.specs?.capacity || 10; // kWh
      const maxChargeRate = battery.specs?.maxChargeRate || 5; // kW
      const maxDischargeRate = battery.specs?.maxDischargeRate || 5; // kW
      const efficiency = battery.specs?.efficiency || 0.9; // 90% round-trip efficiency
      const warrantyYears = battery.specs?.warrantyYears || 10;
      const warrantyCycles = battery.specs?.warrantyCycles || 3650; // 1 cycle per day for 10 years
      
      // Generate period data with state of charge
      let currentSoC = 50; // Start at 50% SoC
      
      const periodData = periods.map(period => {
        // Determine if battery is charging, discharging or idle
        let mode = 'idle';
        let power = 0;
        let socBegin = currentSoC;
        
        // Arbitrage strategy
        if (arbitragePerformance) {
          const hour = new Date(period.start).getHours();
          
          // Charge during off-peak hours (0-6)
          if (hour >= 0 && hour <= 6) {
            mode = 'charge';
            power = maxChargeRate * 0.8; // 80% of max rate
          }
          // Discharge during peak hours (17-21)
          else if (hour >= 17 && hour <= 21) {
            mode = 'discharge';
            power = maxDischargeRate * 0.8; // 80% of max rate
          }
          // Idle otherwise
          else {
            mode = 'idle';
            power = 0;
          }
        } else {
          // Random operation if no arbitrage
          const rand = Math.random();
          if (rand < 0.3 && currentSoC < 80) {
            mode = 'charge';
            power = maxChargeRate * (0.5 + Math.random() * 0.5); // 50-100% of max rate
          } else if (rand < 0.6 && currentSoC > 20) {
            mode = 'discharge';
            power = maxDischargeRate * (0.5 + Math.random() * 0.5); // 50-100% of max rate
          } else {
            mode = 'idle';
            power = 0;
          }
        }
        
        // Calculate energy and SoC change
        const hours = getTimePeriodHours(granularity);
        let energyDelta = 0;
        
        if (mode === 'charge') {
          energyDelta = power * hours;
          const socDelta = (energyDelta / capacity) * 100;
          currentSoC = Math.min(100, currentSoC + socDelta);
        } else if (mode === 'discharge') {
          energyDelta = -power * hours;
          const socDelta = (energyDelta / capacity) * 100;
          currentSoC = Math.max(0, currentSoC + socDelta);
        }
        
        // Calculate partial cycle
        const partialCycle = Math.abs(energyDelta) / (capacity * 2); // Full cycle is charge + discharge
        
        // Calculate degradation impact (simplified)
        const degradationImpact = partialCycle / warrantyCycles * 100;
        
        return {
          period: {
            start: period.start.toISOString(),
            end: period.end.toISOString(),
            label: period.label
          },
          mode,
          power,
          socBegin,
          socEnd: currentSoC,
          energyDelta,
          partialCycle,
          degradationImpact
        };
      });
      
      // Calculate overall metrics
      const totalCharged = periodData
        .filter(p => p.mode === 'charge')
        .reduce((sum, p) => sum + p.energyDelta, 0);
      
      const totalDischarged = periodData
        .filter(p => p.mode === 'discharge')
        .reduce((sum, p) => sum + Math.abs(p.energyDelta), 0);
      
      const totalCycles = periodData.reduce((sum, p) => sum + p.partialCycle, 0);
      
      const chargeTimePercentage = periodData
        .filter(p => p.mode === 'charge')
        .length / periodData.length * 100;
      
      const dischargeTimePercentage = periodData
        .filter(p => p.mode === 'discharge')
        .length / periodData.length * 100;
      
      const idleTimePercentage = periodData
        .filter(p => p.mode === 'idle')
        .length / periodData.length * 100;
      
      // Calculate throughput efficiency
      const throughputEfficiency = totalDischarged / (totalCharged * efficiency) * 100;
      
      // Calculate utilization ratio (actual throughput vs theoretical max)
      const maxThroughput = capacity * (periods.length / 24) * 2; // max 2 full cycles per day
      const actualThroughput = totalCharged + totalDischarged;
      const utilizationRatio = actualThroughput / maxThroughput;
      
      // Calculate degradation projection
      const dailyCycles = totalCycles / (periods.length / 24);
      const yearlyDegradation = (dailyCycles * 365) / warrantyCycles * 100;
      const projectedLifespan = warrantyCycles / dailyCycles / 365;
      
      return {
        batteryId: battery.id,
        batteryName: battery.name,
        capacity,
        maxChargeRate,
        maxDischargeRate,
        efficiency,
        totalCharged,
        totalDischarged,
        totalCycles,
        chargeTimePercentage,
        dischargeTimePercentage,
        idleTimePercentage,
        throughputEfficiency,
        utilizationRatio,
        yearlyDegradation,
        projectedLifespan,
        periodData
      };
    });
    
    // Calculate site-wide metrics
    const totalCapacity = batteries.reduce((sum, b) => {
      const capacity = b.specs?.capacity || 10;
      return sum + capacity;
    }, 0);
    
    const totalPower = batteries.reduce((sum, b) => {
      const power = b.specs?.maxDischargeRate || 5;
      return sum + power;
    }, 0);
    
    const avgUtilizationRatio = utilizationData.reduce((sum, b) => sum + b.utilizationRatio, 0) / utilizationData.length;
    const avgThroughputEfficiency = utilizationData.reduce((sum, b) => sum + b.throughputEfficiency, 0) / utilizationData.length;
    const avgYearlyDegradation = utilizationData.reduce((sum, b) => sum + b.yearlyDegradation, 0) / utilizationData.length;
    const avgProjectedLifespan = utilizationData.reduce((sum, b) => sum + b.projectedLifespan, 0) / utilizationData.length;
    
    // Find utilization patterns and insights
    const insights = this.findBatteryUtilizationInsights(utilizationData);
    
    return {
      siteId,
      analyticsType: AnalyticsType.BATTERY_UTILIZATION,
      granularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      batteryCount: batteries.length,
      totalCapacity,
      totalPower,
      avgUtilizationRatio,
      avgThroughputEfficiency,
      avgYearlyDegradation,
      avgProjectedLifespan,
      insights,
      batteries: utilizationData
    };
  }

  /**
   * Find battery utilization insights
   */
  private findBatteryUtilizationInsights(
    utilizationData: any[]
  ): any[] {
    const insights = [];
    
    // Insight 1: Utilization assessment
    const utilizationBuckets = {
      underutilized: 0,
      optimal: 0,
      overutilized: 0
    };
    
    utilizationData.forEach(battery => {
      if (battery.utilizationRatio < 0.3) {
        utilizationBuckets.underutilized++;
      } else if (battery.utilizationRatio > 0.7) {
        utilizationBuckets.overutilized++;
      } else {
        utilizationBuckets.optimal++;
      }
    });
    
    insights.push({
      type: 'utilization_assessment',
      description: 'Battery utilization assessment',
      underutilized: utilizationBuckets.underutilized,
      optimal: utilizationBuckets.optimal,
      overutilized: utilizationBuckets.overutilized,
      interpretation: utilizationBuckets.underutilized > 0 
        ? 'Some batteries are underutilized, consider additional use cases'
        : utilizationBuckets.overutilized > 0
        ? 'Some batteries may be overutilized, monitor for accelerated degradation'
        : 'All batteries are operating within optimal utilization range'
    });
    
    // Insight 2: Lifecycle projection
    const lifecycleRisk = utilizationData.some(battery => battery.projectedLifespan < 5)
      ? 'High'
      : utilizationData.some(battery => battery.projectedLifespan < 8)
      ? 'Medium'
      : 'Low';
    
    insights.push({
      type: 'lifecycle_projection',
      description: 'Battery lifecycle projection',
      avgProjectedLifespan: utilizationData.reduce((sum, b) => sum + b.projectedLifespan, 0) / utilizationData.length,
      lifecycleRisk,
      interpretation: lifecycleRisk === 'High'
        ? 'Some batteries may not reach their expected lifespan due to current usage patterns'
        : lifecycleRisk === 'Medium'
        ? 'Current usage patterns suggest moderately accelerated degradation'
        : 'Current usage patterns are consistent with expected battery lifespan'
    });
    
    // Insight 3: Utilization patterns
    const timeDistribution = {
      charging: utilizationData.reduce((sum, b) => sum + b.chargeTimePercentage, 0) / utilizationData.length,
      discharging: utilizationData.reduce((sum, b) => sum + b.dischargeTimePercentage, 0) / utilizationData.length,
      idle: utilizationData.reduce((sum, b) => sum + b.idleTimePercentage, 0) / utilizationData.length
    };
    
    insights.push({
      type: 'utilization_patterns',
      description: 'Battery utilization patterns',
      timeDistribution,
      interpretation: timeDistribution.idle > 50
        ? 'Batteries are idle for a significant portion of time, consider additional use cases'
        : timeDistribution.charging > 40
        ? 'Batteries spend more time charging than discharging, check for charge/discharge balance'
        : 'Batteries show a balanced operational pattern'
    });
    
    // Insight 4: Optimization recommendations
    const recommendations = [];
    
    // Check for underutilization
    if (utilizationBuckets.underutilized > 0) {
      recommendations.push({
        type: 'add_use_cases',
        description: 'Add more use cases for underutilized batteries',
        details: 'Consider additional services like peak shaving, demand response, or frequency regulation',
        impact: 'Improved ROI and utilization'
      });
    }
    
    // Check for efficiency issues
    const lowEfficiency = utilizationData.some(battery => battery.throughputEfficiency < 85);
    
    if (lowEfficiency) {
      recommendations.push({
        type: 'improve_efficiency',
        description: 'Improve throughput efficiency',
        details: 'Optimize charge/discharge cycles to minimize energy losses',
        impact: 'Better energy efficiency and reduced waste'
      });
    }
    
    // Check for high degradation
    const highDegradation = utilizationData.some(battery => battery.yearlyDegradation > 12); // >12% per year
    
    if (highDegradation) {
      recommendations.push({
        type: 'reduce_degradation',
        description: 'Reduce battery degradation rate',
        details: 'Limit depth of discharge, avoid frequent full cycles, and maintain optimal temperature',
        impact: 'Extended battery lifespan and improved long-term value'
      });
    }
    
    insights.push({
      type: 'optimization_recommendations',
      description: 'Battery optimization recommendations',
      recommendations
    });
    
    return insights;
  }

  /**
   * Analyze solar production
   */
  private async analyzeSolarProduction(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Get solar devices
    const solarDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'solar_pv');
    
    if (solarDevices.length === 0) {
      return {
        message: 'No solar PV devices found at this site',
        siteId,
        analyticsType: AnalyticsType.SOLAR_PRODUCTION,
        granularity,
        startDate,
        endDate
      };
    }
    
    // Generate time periods based on granularity
    const periods = this.generateTimePeriods(granularity, startDate, endDate);
    
    // Get consumption devices for self-consumption analysis
    const consumptionDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'smart_meter' || d.type === 'ev_charger' || d.type === 'heat_pump');
    
    // Get battery devices for storage analysis
    const batteries = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'battery_storage');
    
    // Calculate solar capacity
    const totalCapacity = solarDevices.reduce((sum, device) => {
      const capacity = device.specs?.capacity || 5; // kW
      return sum + capacity;
    }, 0);
    
    // Generate solar production data
    const productionData = periods.map(period => {
      // Solar production varies by time of day, weather, and season
      let productionFactor = 0;
      
      const hour = new Date(period.start).getHours();
      const month = new Date(period.start).getMonth();
      
      // Solar only produces during daylight
      if (hour >= 6 && hour <= 20) {
        // Peak production mid-day
        if (hour >= 10 && hour <= 15) {
          productionFactor = 0.7 + Math.random() * 0.3; // 70-100% of capacity
        } else if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
          productionFactor = 0.3 + Math.random() * 0.3; // 30-60% of capacity
        } else {
          productionFactor = 0.1 + Math.random() * 0.2; // 10-30% of capacity
        }
        
        // Seasonal adjustment
        if (month >= 4 && month <= 8) { // Summer
          productionFactor *= 1.2;
        } else if (month <= 1 || month >= 10) { // Winter
          productionFactor *= 0.7;
        }
        
        // Weather factor (random)
        const weatherFactor = 0.6 + Math.random() * 0.4; // 60-100% weather factor
        productionFactor *= weatherFactor;
      }
      
      // Calculate production for all devices
      const deviceProduction = solarDevices.map(device => {
        const capacity = device.specs?.capacity || 5; // kW
        const efficiency = device.specs?.efficiency || 0.8;
        
        // Calculate production for this period
        const production = capacity * productionFactor * efficiency * getTimePeriodHours(granularity);
        
        return {
          deviceId: device.id,
          deviceName: device.name,
          capacity,
          efficiency,
          production
        };
      });
      
      // Calculate total production
      const totalProduction = deviceProduction.reduce((sum, device) => sum + device.production, 0);
      
      // Calculate consumption for comparison
      let consumption = 0;
      if (consumptionDevices.length > 0) {
        // Base consumption varies by time of day/week/month
        let baseConsumption = 10 + Math.random() * 20; // 10-30 kWh base for the period
        
        // Adjust for time of day if hourly
        if (granularity === TimeGranularity.HOURLY) {
          // Higher consumption in morning (7-9) and evening (17-22)
          if (hour >= 7 && hour <= 9) {
            baseConsumption *= 1.5;
          } else if (hour >= 17 && hour <= 22) {
            baseConsumption *= 2;
          } else if (hour >= 0 && hour <= 5) {
            baseConsumption *= 0.5; // Lower at night
          }
        }
        
        consumption = baseConsumption * getTimePeriodHours(granularity);
      }
      
      // Calculate self-consumption and export
      let selfConsumption = Math.min(totalProduction, consumption);
      let gridExport = Math.max(0, totalProduction - consumption);
      let gridImport = Math.max(0, consumption - totalProduction);
      
      // Calculate battery impact if present
      let batteryCharge = 0;
      let batteryDischarge = 0;
      
      if (batteries.length > 0 && gridExport > 0) {
        // Calculate available battery capacity
        const totalBatteryCapacity = batteries.reduce((sum, battery) => {
          const capacity = battery.specs?.capacity || 10; // kWh
          return sum + capacity;
        }, 0);
        
        // Assume batteries are initially 50% charged
        const availableCapacity = totalBatteryCapacity * 0.5; // kWh
        
        // Battery can store excess production
        batteryCharge = Math.min(gridExport, availableCapacity);
        gridExport -= batteryCharge;
        
        // Battery can discharge for later use (different period)
        // This is a rough estimation for this period
        if (gridImport > 0 && granularity !== TimeGranularity.HOURLY) {
          batteryDischarge = Math.min(batteryCharge * 0.9, gridImport); // 90% efficiency
          gridImport -= batteryDischarge;
        }
      }
      
      // Calculate self-sufficiency ratio
      const selfSufficiencyRatio = consumption > 0 
        ? (selfConsumption + batteryDischarge) / consumption 
        : 0;
      
      // Calculate self-consumption ratio
      const selfConsumptionRatio = totalProduction > 0 
        ? (selfConsumption + batteryCharge) / totalProduction 
        : 0;
      
      return {
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          label: period.label
        },
        totalProduction,
        consumption,
        selfConsumption,
        gridExport,
        gridImport,
        batteryCharge,
        batteryDischarge,
        selfSufficiencyRatio,
        selfConsumptionRatio,
        devices: deviceProduction
      };
    });
    
    // Calculate overall metrics
    const totalProduction = productionData.reduce((sum, period) => sum + period.totalProduction, 0);
    const totalConsumption = productionData.reduce((sum, period) => sum + period.consumption, 0);
    const totalSelfConsumption = productionData.reduce((sum, period) => sum + period.selfConsumption, 0);
    const totalGridExport = productionData.reduce((sum, period) => sum + period.gridExport, 0);
    const totalGridImport = productionData.reduce((sum, period) => sum + period.gridImport, 0);
    const totalBatteryCharge = productionData.reduce((sum, period) => sum + period.batteryCharge, 0);
    const totalBatteryDischarge = productionData.reduce((sum, period) => sum + period.batteryDischarge, 0);
    
    // Calculate overall ratios
    const overallSelfSufficiencyRatio = totalConsumption > 0 
      ? (totalSelfConsumption + totalBatteryDischarge) / totalConsumption 
      : 0;
    
    const overallSelfConsumptionRatio = totalProduction > 0 
      ? (totalSelfConsumption + totalBatteryCharge) / totalProduction 
      : 0;
    
    // Calculate performance metrics
    const specificYield = totalProduction / totalCapacity; // kWh/kWp
    const expectedYield = calculateExpectedYield(
      totalCapacity, 
      startDate, 
      endDate, 
      solarDevices[0]?.specs?.tilt || 30, 
      solarDevices[0]?.specs?.azimuth || 180
    );
    const performanceRatio = expectedYield > 0 ? specificYield / expectedYield : 0;
    
    // Calculate financial metrics
    const feedInTariff = 0.10; // $/kWh
    const retailPrice = 0.15; // $/kWh
    
    const exportRevenue = totalGridExport * feedInTariff;
    const selfConsumptionSavings = totalSelfConsumption * retailPrice;
    const batteryDischargeValue = totalBatteryDischarge * retailPrice;
    const totalValue = exportRevenue + selfConsumptionSavings + batteryDischargeValue;
    
    // Find production patterns and insights
    const insights = this.findSolarProductionInsights(productionData);
    
    return {
      siteId,
      analyticsType: AnalyticsType.SOLAR_PRODUCTION,
      granularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      deviceCount: solarDevices.length,
      totalCapacity,
      totalProduction,
      specificYield,
      performanceRatio,
      totalConsumption,
      totalSelfConsumption,
      totalGridExport,
      totalGridImport,
      totalBatteryCharge,
      totalBatteryDischarge,
      overallSelfSufficiencyRatio,
      overallSelfConsumptionRatio,
      exportRevenue,
      selfConsumptionSavings,
      batteryDischargeValue,
      totalValue,
      insights,
      productionData
    };
  }

  /**
   * Calculate expected solar yield
   */
  private calculateExpectedYield(
    capacity: number,
    startDate: Date,
    endDate: Date,
    tilt: number,
    azimuth: number
  ): number {
    // This is a simplified calculation
    // In reality, this would use solar resource data for the location
    
    // Base yield in kWh/kWp/day for different months
    const monthlyYields = [
      2.7, 3.5, 4.3, 5.1, 5.8, 6.2, 6.0, 5.7, 4.9, 3.8, 2.8, 2.5
    ]; // Northern hemisphere example
    
    let totalYield = 0;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Accumulate daily yields for the period
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const month = date.getMonth();
      
      // Get base yield for this month
      const baseYield = monthlyYields[month];
      
      // Apply tilt and azimuth correction factor
      // This is very simplified, real solar models are much more complex
      let orientationFactor = 1.0;
      
      // Optimal tilt is roughly latitude, assume 40° for this example
      const optimalTilt = 40;
      const tiltDeviation = Math.abs(tilt - optimalTilt);
      
      // Optimal azimuth is 180° (south in northern hemisphere)
      const azimuthDeviation = Math.abs(azimuth - 180);
      
      if (tiltDeviation > 15 || azimuthDeviation > 45) {
        orientationFactor = 0.9; // 10% reduction for non-optimal orientation
      }
      
      const dailyYield = baseYield * orientationFactor;
      totalYield += dailyYield;
    }
    
    return totalYield * capacity;
  }

  /**
   * Find solar production insights
   */
  private findSolarProductionInsights(
    productionData: any[]
  ): any[] {
    const insights = [];
    
    // Insight 1: Production patterns
    if (productionData.length > 0) {
      // Group by hour of day if hourly data
      const isHourly = productionData.length > 0 && 
        new Date(productionData[1]?.period.start).getTime() - 
        new Date(productionData[0]?.period.start).getTime() === 60 * 60 * 1000;
      
      if (isHourly) {
        const hourlyProduction: Record<number, { sum: number, count: number }> = {};
        
        productionData.forEach(data => {
          const hour = new Date(data.period.start).getHours();
          hourlyProduction[hour] = hourlyProduction[hour] || { sum: 0, count: 0 };
          hourlyProduction[hour].sum += data.totalProduction;
          hourlyProduction[hour].count++;
        });
        
        const hourlyAverages = Object.entries(hourlyProduction).map(([hour, data]) => ({
          hour: Number(hour),
          avgProduction: data.count > 0 ? data.sum / data.count : 0
        }));
        
        // Find peak production hour
        const peakHour = hourlyAverages.sort((a, b) => b.avgProduction - a.avgProduction)[0];
        
        insights.push({
          type: 'hourly_production_pattern',
          description: 'Solar production pattern by hour of day',
          peakHour: peakHour?.hour,
          peakProduction: peakHour?.avgProduction,
          hourlyPattern: hourlyAverages.sort((a, b) => a.hour - b.hour)
        });
      }
    }
    
    // Insight 2: Self-consumption analysis
    const selfConsumptionData = productionData
      .filter(p => p.totalProduction > 0 && p.consumption > 0);
    
    if (selfConsumptionData.length > 0) {
      const avgSelfConsumptionRatio = selfConsumptionData
        .reduce((sum, p) => sum + p.selfConsumptionRatio, 0) / selfConsumptionData.length;
      
      const avgSelfSufficiencyRatio = selfConsumptionData
        .reduce((sum, p) => sum + p.selfSufficiencyRatio, 0) / selfConsumptionData.length;
      
      const batteryImpact = selfConsumptionData.some(p => p.batteryCharge > 0 || p.batteryDischarge > 0)
        ? (selfConsumptionData.reduce((sum, p) => sum + p.batteryCharge + p.batteryDischarge, 0) / 
           selfConsumptionData.reduce((sum, p) => sum + p.totalProduction, 0)) * 100
        : 0;
      
      insights.push({
        type: 'self_consumption_analysis',
        description: 'Analysis of solar self-consumption patterns',
        avgSelfConsumptionRatio,
        avgSelfSufficiencyRatio,
        batteryImpact,
        interpretation: avgSelfConsumptionRatio > 0.7
          ? 'High self-consumption rate, well-matched to consumption pattern'
          : avgSelfConsumptionRatio > 0.4
          ? 'Moderate self-consumption rate, room for improvement'
          : 'Low self-consumption rate, significant mismatch with consumption pattern'
      });
    }
    
    // Insight 3: Performance assessment
    const nonZeroProduction = productionData.filter(p => p.totalProduction > 0);
    if (nonZeroProduction.length > 0) {
      // Calculate variation in production
      const productions = nonZeroProduction.map(p => p.totalProduction);
      const avgProduction = productions.reduce((sum, p) => sum + p, 0) / productions.length;
      const varianceSum = productions.reduce((sum, p) => sum + Math.pow(p - avgProduction, 2), 0);
      const stdDeviation = Math.sqrt(varianceSum / productions.length);
      const variabilityCoefficient = stdDeviation / avgProduction;
      
      // Compare to expected production pattern
      const hasUnexpectedDrops = nonZeroProduction.some((p, i, arr) => {
        if (i === 0 || i === arr.length - 1) return false;
        
        const prev = arr[i - 1].totalProduction;
        const curr = p.totalProduction;
        const next = arr[i + 1].totalProduction;
        
        // Look for unexpected drops (more than 50% from adjacent periods)
        return curr < prev * 0.5 && curr < next * 0.5;
      });
      
      insights.push({
        type: 'performance_assessment',
        description: 'Assessment of solar system performance',
        variabilityCoefficient,
        hasUnexpectedDrops,
        performanceIssues: hasUnexpectedDrops ? 'Potential shading or panel issues detected' : 'No obvious performance issues',
        interpretation: variabilityCoefficient > 0.8
          ? 'High production variability, potentially indicates inconsistent weather or system issues'
          : variabilityCoefficient > 0.5
          ? 'Moderate production variability, typical for the season'
          : 'Low production variability, consistent solar resource or well-performing system'
      });
    }
    
    // Insight 4: Optimization recommendations
    const recommendations = [];
    
    // Check for low self-consumption
    const avgSelfConsumptionRatio = selfConsumptionData.length > 0
      ? selfConsumptionData.reduce((sum, p) => sum + p.selfConsumptionRatio, 0) / selfConsumptionData.length
      : 0;
    
    if (avgSelfConsumptionRatio < 0.5) {
      recommendations.push({
        type: 'improve_self_consumption',
        description: 'Improve solar self-consumption',
        details: 'Shift flexible loads to coincide with solar production peaks',
        impact: 'Can increase self-consumption by 15-30%'
      });
    }
    
    // Check for battery storage
    const hasSignificantExport = productionData.some(p => p.gridExport > 1); // >1kWh export
    
    if (hasSignificantExport && !productionData.some(p => p.batteryCharge > 0)) {
      recommendations.push({
        type: 'add_battery_storage',
        description: 'Add battery storage',
        details: 'Store excess solar production for later use',
        impact: 'Can increase self-consumption by 20-40%'
      });
    }
    
    // Check for load shifting potential
    if (selfConsumptionData.length > 0) {
      const consumptionDuringPeakSolar = selfConsumptionData
        .filter(p => {
          const hour = new Date(p.period.start).getHours();
          return hour >= 10 && hour <= 15; // peak solar hours
        })
        .reduce((sum, p) => sum + p.consumption, 0);
      
      const totalConsumption = selfConsumptionData.reduce((sum, p) => sum + p.consumption, 0);
      const peakSolarConsumptionRatio = totalConsumption > 0 
        ? consumptionDuringPeakSolar / totalConsumption 
        : 0;
      
      if (peakSolarConsumptionRatio < 0.3) {
        recommendations.push({
          type: 'shift_loads',
          description: 'Shift loads to peak solar hours',
          details: 'Schedule energy-intensive tasks during 10am-3pm',
          impact: 'Can increase self-consumption by 10-25%'
        });
      }
    }
    
    insights.push({
      type: 'optimization_recommendations',
      description: 'Recommendations to optimize solar energy usage',
      recommendations
    });
    
    return insights;
  }

  /**
   * Analyze forecasting
   */
  private async analyzeForecasting(
    siteId: number,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // This analysis uses AI to forecast consumption and production
    
    // Get devices for consumption and production
    const consumptionDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'smart_meter' || d.type === 'ev_charger' || d.type === 'heat_pump');
    
    const productionDevices = this.deviceService.getDevicesBySite(siteId)
      .filter(d => d.type === 'solar_pv');
    
    // Generate historical data periods
    const periods = this.generateTimePeriods(granularity, startDate, endDate);
    
    // Generate consumption history
    const consumptionHistory = periods.map(period => {
      const date = new Date(period.start);
      const hour = date.getHours();
      const day = date.getDay();
      const month = date.getMonth();
      
      // Base consumption varies by time of day/week/month
      let consumption = 10 + Math.random() * 20; // 10-30 kWh base
      
      // Adjust for time of day if hourly
      if (granularity === TimeGranularity.HOURLY) {
        // Higher consumption in morning (7-9) and evening (17-22)
        if (hour >= 7 && hour <= 9) {
          consumption *= 1.5;
        } else if (hour >= 17 && hour <= 22) {
          consumption *= 2;
        } else if (hour >= 0 && hour <= 5) {
          consumption *= 0.5; // Lower at night
        }
      }
      
      // Adjust for day of week if daily
      if (granularity === TimeGranularity.DAILY) {
        // Higher on weekdays, lower on weekends
        if (day === 0 || day === 6) {
          consumption *= 0.8; // Weekends
        }
      }
      
      // Adjust for season if monthly
      if (granularity === TimeGranularity.MONTHLY) {
        // Higher in summer (AC) and winter (heating)
        if (month >= 5 && month <= 8) {
          consumption *= 1.4; // Summer
        } else if (month >= 11 || month <= 2) {
          consumption *= 1.6; // Winter
        }
      }
      
      // Add random noise
      consumption *= 0.9 + Math.random() * 0.2; // ±10% random variation
      
      return {
        timestamp: period.start.toISOString(),
        consumption
      };
    });
    
    // Generate production history
    const productionHistory = periods.map(period => {
      const date = new Date(period.start);
      const hour = date.getHours();
      const month = date.getMonth();
      
      // Calculate total capacity
      const totalCapacity = productionDevices.reduce((sum, device) => {
        const capacity = device.specs?.capacity || 5; // kW
        return sum + capacity;
      }, 0);
      
      // Base production factor (0-1)
      let productionFactor = 0;
      
      // Solar only produces during daylight
      if (hour >= 6 && hour <= 20) {
        // Peak production mid-day
        if (hour >= 10 && hour <= 15) {
          productionFactor = 0.7 + Math.random() * 0.3; // 70-100% of capacity
        } else if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
          productionFactor = 0.3 + Math.random() * 0.3; // 30-60% of capacity
        } else {
          productionFactor = 0.1 + Math.random() * 0.2; // 10-30% of capacity
        }
        
        // Seasonal adjustment
        if (month >= 4 && month <= 8) { // Summer
          productionFactor *= 1.2;
        } else if (month <= 1 || month >= 10) { // Winter
          productionFactor *= 0.7;
        }
        
        // Weather factor (random)
        const weatherFactor = 0.6 + Math.random() * 0.4; // 60-100% weather factor
        productionFactor *= weatherFactor;
      }
      
      // Calculate production
      const production = totalCapacity * productionFactor * getTimePeriodHours(granularity);
      
      return {
        timestamp: period.start.toISOString(),
        production
      };
    });
    
    // Create an array of days for forecasts
    const forecastStart = new Date(endDate);
    const forecastPeriods = this.generateTimePeriods(granularity, forecastStart, new Date(forecastStart.getTime() + 7 * 24 * 60 * 60 * 1000));
    
    // Generate consumption forecast
    const consumptionForecast = this.generateForecast(consumptionHistory, forecastPeriods, 'consumption');
    
    // Generate production forecast
    const productionForecast = this.generateForecast(productionHistory, forecastPeriods, 'production');
    
    // Generate price forecast
    const priceForecast = this.generatePriceForecast(forecastPeriods);
    
    // Calculate forecast metrics
    const metrics = this.calculateForecastMetrics(consumptionHistory, productionHistory, granularity);
    
    // Generate forecast insights
    const insights = this.findForecastingInsights(
      consumptionHistory, 
      productionHistory, 
      consumptionForecast, 
      productionForecast, 
      priceForecast
    );
    
    return {
      siteId,
      analyticsType: AnalyticsType.FORECASTING,
      granularity,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      forecastStart: forecastStart.toISOString(),
      forecastEnd: forecastPeriods[forecastPeriods.length - 1].end.toISOString(),
      metrics,
      insights,
      consumptionHistory,
      productionHistory,
      consumptionForecast,
      productionForecast,
      priceForecast
    };
  }

  /**
   * Generate forecast based on historical data
   */
  private generateForecast(
    history: any[],
    forecastPeriods: any[],
    metric: string
  ): any[] {
    // Simple forecasting model based on historical patterns
    return forecastPeriods.map(period => {
      const date = new Date(period.start);
      const hour = date.getHours();
      const day = date.getDay();
      
      // Find similar periods in history
      const similarPeriods = history.filter(h => {
        const hDate = new Date(h.timestamp);
        const hHour = hDate.getHours();
        const hDay = hDate.getDay();
        
        // Match hour of day and similar day of week (weekday/weekend)
        return hHour === hour && ((day < 5 && hDay < 5) || (day >= 5 && hDay >= 5));
      });
      
      // Calculate baseline value from similar periods
      let baseValue = 0;
      if (similarPeriods.length > 0) {
        baseValue = similarPeriods.reduce((sum, p) => sum + p[metric], 0) / similarPeriods.length;
      } else {
        // Fallback if no similar periods found
        baseValue = history.reduce((sum, p) => sum + p[metric], 0) / history.length;
      }
      
      // Add some randomness to forecast (±15%)
      const forecastValue = baseValue * (0.85 + Math.random() * 0.3);
      
      // Add low/high range (±20%)
      const lowRange = forecastValue * 0.8;
      const highRange = forecastValue * 1.2;
      
      // Calculate confidence based on similar periods count
      const confidence = Math.min(0.9, 0.5 + similarPeriods.length * 0.05);
      
      return {
        timestamp: period.start.toISOString(),
        [metric]: forecastValue,
        [`${metric}Low`]: lowRange,
        [`${metric}High`]: highRange,
        confidence
      };
    });
  }

  /**
   * Generate price forecast
   */
  private generatePriceForecast(
    forecastPeriods: any[]
  ): any[] {
    return forecastPeriods.map(period => {
      const date = new Date(period.start);
      const hour = date.getHours();
      const day = date.getDay();
      
      // Base price ($/kWh)
      let basePrice = 0.15;
      
      // Adjust for time of day
      if (hour >= 17 && hour <= 21) {
        basePrice *= 1.5; // Peak hours
      } else if (hour >= 0 && hour <= 5) {
        basePrice *= 0.7; // Off-peak hours
      }
      
      // Adjust for weekend
      if (day === 0 || day === 6) {
        basePrice *= 0.9; // Lower on weekends
      }
      
      // Add some randomness
      const price = basePrice * (0.9 + Math.random() * 0.2);
      
      // Add low/high range
      const lowPrice = price * 0.9;
      const highPrice = price * 1.1;
      
      // Fixed confidence for prices
      const confidence = 0.7;
      
      return {
        timestamp: period.start.toISOString(),
        price,
        priceLow: lowPrice,
        priceHigh: highPrice,
        confidence
      };
    });
  }

  /**
   * Calculate forecast metrics
   */
  private calculateForecastMetrics(
    consumptionHistory: any[],
    productionHistory: any[],
    granularity: TimeGranularity
  ): any {
    // Calculate consumption patterns
    const consumptionPatterns = {
      daily: { min: 0, max: 0, avg: 0, stdDev: 0 },
      weekly: { min: 0, max: 0, avg: 0, stdDev: 0 },
      monthly: { min: 0, max: 0, avg: 0, stdDev: 0 }
    };
    
    // Calculate production patterns
    const productionPatterns = {
      daily: { min: 0, max: 0, avg: 0, stdDev: 0 },
      weekly: { min: 0, max: 0, avg: 0, stdDev: 0 },
      monthly: { min: 0, max: 0, avg: 0, stdDev: 0 }
    };
    
    // Calculate daily values
    if (consumptionHistory.length > 0) {
      // Group by day
      const dailyConsumption: Record<string, number> = {};
      const dailyProduction: Record<string, number> = {};
      
      consumptionHistory.forEach(h => {
        const date = new Date(h.timestamp).toISOString().split('T')[0];
        dailyConsumption[date] = (dailyConsumption[date] || 0) + h.consumption;
      });
      
      productionHistory.forEach(h => {
        const date = new Date(h.timestamp).toISOString().split('T')[0];
        dailyProduction[date] = (dailyProduction[date] || 0) + h.production;
      });
      
      // Calculate daily metrics
      const dailyConsValues = Object.values(dailyConsumption);
      const dailyProdValues = Object.values(dailyProduction);
      
      if (dailyConsValues.length > 0) {
        consumptionPatterns.daily.min = Math.min(...dailyConsValues);
        consumptionPatterns.daily.max = Math.max(...dailyConsValues);
        consumptionPatterns.daily.avg = dailyConsValues.reduce((sum, v) => sum + v, 0) / dailyConsValues.length;
        
        const variance = dailyConsValues.reduce((sum, v) => sum + Math.pow(v - consumptionPatterns.daily.avg, 2), 0) / dailyConsValues.length;
        consumptionPatterns.daily.stdDev = Math.sqrt(variance);
      }
      
      if (dailyProdValues.length > 0) {
        productionPatterns.daily.min = Math.min(...dailyProdValues);
        productionPatterns.daily.max = Math.max(...dailyProdValues);
        productionPatterns.daily.avg = dailyProdValues.reduce((sum, v) => sum + v, 0) / dailyProdValues.length;
        
        const variance = dailyProdValues.reduce((sum, v) => sum + Math.pow(v - productionPatterns.daily.avg, 2), 0) / dailyProdValues.length;
        productionPatterns.daily.stdDev = Math.sqrt(variance);
      }
    }
    
    // Calculate prediction accuracy metrics based on patterns
    const consumptionAccuracy = 0.8 - (consumptionPatterns.daily.stdDev / consumptionPatterns.daily.avg * 0.3);
    const productionAccuracy = 0.7 - (productionPatterns.daily.stdDev / productionPatterns.daily.avg * 0.3);
    
    // Calculate composite metrics
    const forecastHorizon = {
      hourly: 48, // hours
      daily: 14, // days
      weekly: 4, // weeks
      monthly: 3 // months
    };
    
    const forecastAccuracy = {
      consumption: {
        day1: consumptionAccuracy,
        day3: consumptionAccuracy * 0.9,
        day7: consumptionAccuracy * 0.8
      },
      production: {
        day1: productionAccuracy,
        day3: productionAccuracy * 0.85,
        day7: productionAccuracy * 0.7
      },
      price: {
        day1: 0.85,
        day3: 0.75,
        day7: 0.6
      }
    };
    
    return {
      forecastHorizon,
      forecastAccuracy,
      consumptionPatterns,
      productionPatterns
    };
  }

  /**
   * Find forecasting insights
   */
  private findForecastingInsights(
    consumptionHistory: any[],
    productionHistory: any[],
    consumptionForecast: any[],
    productionForecast: any[],
    priceForecast: any[]
  ): any[] {
    const insights = [];
    
    // Insight 1: Peak forecasting
    if (consumptionForecast.length > 0) {
      // Find forecasted consumption peaks
      const sortedConsumption = [...consumptionForecast].sort((a, b) => b.consumption - a.consumption);
      const consumptionPeaks = sortedConsumption.slice(0, 3);
      
      insights.push({
        type: 'consumption_peaks',
        description: 'Forecasted consumption peaks',
        peaks: consumptionPeaks.map(peak => ({
          timestamp: peak.timestamp,
          value: peak.consumption,
          confidence: peak.confidence
        }))
      });
    }
    
    if (productionForecast.length > 0) {
      // Find forecasted production peaks
      const sortedProduction = [...productionForecast].sort((a, b) => b.production - a.production);
      const productionPeaks = sortedProduction.slice(0, 3);
      
      insights.push({
        type: 'production_peaks',
        description: 'Forecasted production peaks',
        peaks: productionPeaks.map(peak => ({
          timestamp: peak.timestamp,
          value: peak.production,
          confidence: peak.confidence
        }))
      });
    }
    
    // Insight 2: Arbitrage opportunities
    if (priceForecast.length > 0) {
      // Find lowest and highest price periods
      const sortedPrices = [...priceForecast].sort((a, b) => a.price - b.price);
      const lowestPrices = sortedPrices.slice(0, 3);
      const highestPrices = sortedPrices.slice(-3).reverse();
      
      insights.push({
        type: 'price_extremes',
        description: 'Forecasted price extremes for arbitrage',
        lowestPrices: lowestPrices.map(p => ({
          timestamp: p.timestamp,
          price: p.price,
          confidence: p.confidence
        })),
        highestPrices: highestPrices.map(p => ({
          timestamp: p.timestamp,
          price: p.price,
          confidence: p.confidence
        })),
        priceDifferential: highestPrices[0]?.price - lowestPrices[0]?.price
      });
    }
    
    // Insight 3: Self-consumption optimization
    if (consumptionForecast.length > 0 && productionForecast.length > 0) {
      // Merge forecasts by timestamp for comparison
      const mergedForecasts: Record<string, any> = {};
      
      consumptionForecast.forEach(f => {
        mergedForecasts[f.timestamp] = { ...mergedForecasts[f.timestamp], consumption: f.consumption };
      });
      
      productionForecast.forEach(f => {
        mergedForecasts[f.timestamp] = { ...mergedForecasts[f.timestamp], production: f.production };
      });
      
      // Find periods with highest production surplus
      const surplusPeriods = Object.entries(mergedForecasts)
        .filter(([_, data]: [string, any]) => data.production > data.consumption)
        .map(([timestamp, data]: [string, any]) => ({
          timestamp,
          surplus: data.production - data.consumption,
          production: data.production,
          consumption: data.consumption
        }))
        .sort((a, b) => b.surplus - a.surplus)
        .slice(0, 3);
      
      // Find periods with highest consumption deficit
      const deficitPeriods = Object.entries(mergedForecasts)
        .filter(([_, data]: [string, any]) => data.consumption > data.production)
        .map(([timestamp, data]: [string, any]) => ({
          timestamp,
          deficit: data.consumption - data.production,
          production: data.production,
          consumption: data.consumption
        }))
        .sort((a, b) => b.deficit - a.deficit)
        .slice(0, 3);
      
      insights.push({
        type: 'self_consumption_optimization',
        description: 'Forecasted periods for self-consumption optimization',
        surplusPeriods,
        deficitPeriods,
        recommendation: 'Consider shifting flexible loads from deficit to surplus periods to maximize self-consumption'
      });
    }
    
    // Insight 4: Correlation analysis
    if (consumptionHistory.length > 0 && productionHistory.length > 0) {
      // Calculate correlation between consumption and production
      const timestamps = consumptionHistory.map(h => h.timestamp);
      const merged: Record<string, any> = {};
      
      consumptionHistory.forEach(h => {
        merged[h.timestamp] = { ...merged[h.timestamp], consumption: h.consumption };
      });
      
      productionHistory.forEach(h => {
        merged[h.timestamp] = { ...merged[h.timestamp], production: h.production };
      });
      
      const pairs = timestamps
        .filter(t => merged[t]?.consumption !== undefined && merged[t]?.production !== undefined)
        .map(t => ({
          consumption: merged[t].consumption,
          production: merged[t].production
        }));
      
      if (pairs.length > 5) {
        // Calculate correlation coefficient
        const consValues = pairs.map(p => p.consumption);
        const prodValues = pairs.map(p => p.production);
        
        const consAvg = consValues.reduce((sum, val) => sum + val, 0) / consValues.length;
        const prodAvg = prodValues.reduce((sum, val) => sum + val, 0) / prodValues.length;
        
        let numerator = 0;
        let denomCons = 0;
        let denomProd = 0;
        
        for (let i = 0; i < pairs.length; i++) {
          numerator += (consValues[i] - consAvg) * (prodValues[i] - prodAvg);
          denomCons += Math.pow(consValues[i] - consAvg, 2);
          denomProd += Math.pow(prodValues[i] - prodAvg, 2);
        }
        
        const correlation = numerator / (Math.sqrt(denomCons) * Math.sqrt(denomProd));
        
        insights.push({
          type: 'consumption_production_correlation',
          description: 'Correlation between consumption and production',
          correlation,
          interpretation: correlation > 0.5
            ? 'Strong positive correlation: consumption tends to be higher when production is higher'
            : correlation < -0.5
            ? 'Strong negative correlation: consumption tends to be lower when production is higher'
            : 'Weak correlation: consumption and production patterns are not well aligned'
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate time periods based on granularity
   */
  private generateTimePeriods(
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date
  ): Array<{ start: Date; end: Date; label: string }> {
    const periods = [];
    let currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      let periodEnd: Date;
      let label: string;
      
      switch (granularity) {
        case TimeGranularity.HOURLY:
          periodEnd = new Date(currentDate);
          periodEnd.setHours(currentDate.getHours() + 1);
          label = `${currentDate.getHours()}:00 - ${periodEnd.getHours()}:00`;
          break;
          
        case TimeGranularity.DAILY:
          periodEnd = new Date(currentDate);
          periodEnd.setDate(currentDate.getDate() + 1);
          label = currentDate.toISOString().split('T')[0];
          break;
          
        case TimeGranularity.WEEKLY:
          periodEnd = new Date(currentDate);
          periodEnd.setDate(currentDate.getDate() + 7);
          label = `Week of ${currentDate.toISOString().split('T')[0]}`;
          break;
          
        case TimeGranularity.MONTHLY:
          periodEnd = new Date(currentDate);
          periodEnd.setMonth(currentDate.getMonth() + 1);
          label = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;
          break;
      }
      
      // Ensure periodEnd doesn't exceed endDate
      if (periodEnd > endDate) {
        periodEnd = new Date(endDate);
      }
      
      periods.push({
        start: new Date(currentDate),
        end: periodEnd,
        label
      });
      
      // Move to next period
      currentDate = new Date(periodEnd);
    }
    
    return periods;
  }
}

/**
 * Get time period hours
 */
function getTimePeriodHours(granularity: TimeGranularity): number {
  switch (granularity) {
    case TimeGranularity.HOURLY:
      return 1;
    case TimeGranularity.DAILY:
      return 24;
    case TimeGranularity.WEEKLY:
      return 24 * 7;
    case TimeGranularity.MONTHLY:
      return 24 * 30; // Simplified
    default:
      return 1;
  }
}

/**
 * Get the analytics service instance
 */
export function getAnalyticsService(): AnalyticsService {
  return AnalyticsService.getInstance();
}