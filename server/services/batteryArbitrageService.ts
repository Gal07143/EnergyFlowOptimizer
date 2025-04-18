import { initAiOptimizationService } from './ai-optimization';
import { getEnergyPriceService } from './energyPriceService';
import { initDeviceManagementService } from './deviceManagementService';

/**
 * Battery Arbitrage Strategy Service
 * 
 * This service implements advanced strategies for battery energy arbitrage:
 * - Day-ahead price forecasting with AI models
 * - Dynamic charge/discharge scheduling based on real-time price signals
 * - Battery lifecycle optimization for longevity
 * - Grid constraint management and peak shaving
 */
export class BatteryArbitrageService {
  private static instance: BatteryArbitrageService;
  
  // Arbitrage strategies
  private readonly STRATEGIES = {
    SIMPLE_THRESHOLD: 'simple_threshold',
    TIME_OF_USE: 'time_of_use',
    DYNAMIC_PRICE: 'dynamic_price',
    PEAK_SHAVING: 'peak_shaving',
    SELF_CONSUMPTION: 'self_consumption',
    AI_OPTIMIZED: 'ai_optimized',
    LIFECYCLE_OPTIMIZED: 'lifecycle_optimized',
    GRID_SERVICES: 'grid_services'
  };
  
  // Track active strategies by site
  private activeStrategies: Map<number, string[]> = new Map();
  
  // Track arbitrage performance metrics by site
  private arbitragePerformance: Map<number, {
    totalSavings: number,
    cyclesUsed: number,
    lastOptimizationTime: Date,
    forecastAccuracy: number
  }> = new Map();

  private constructor() {
    // Initialize with default values
    this.initialize();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): BatteryArbitrageService {
    if (!BatteryArbitrageService.instance) {
      BatteryArbitrageService.instance = new BatteryArbitrageService();
    }
    return BatteryArbitrageService.instance;
  }

  /**
   * Initialize the service with default values
   */
  private initialize(): void {
    console.log('Initializing Battery Arbitrage Service...');
    
    // Set up periodic optimization
    setInterval(() => {
      this.runOptimizationForAllSites();
    }, 15 * 60 * 1000); // Run every 15 minutes
  }

  /**
   * Get available arbitrage strategies
   */
  public getAvailableStrategies(): string[] {
    return Object.values(this.STRATEGIES);
  }

  /**
   * Get active arbitrage strategies for a site
   */
  public getActiveStrategies(siteId: number): string[] {
    return this.activeStrategies.get(siteId) || [];
  }

  /**
   * Enable a specific strategy for a site
   */
  public enableStrategy(siteId: number, strategy: string): boolean {
    if (!Object.values(this.STRATEGIES).includes(strategy)) {
      return false;
    }

    const currentStrategies = this.activeStrategies.get(siteId) || [];
    if (!currentStrategies.includes(strategy)) {
      currentStrategies.push(strategy);
      this.activeStrategies.set(siteId, currentStrategies);
      
      // Run initial optimization with the new strategy
      this.optimizeSite(siteId);
    }
    
    return true;
  }

  /**
   * Disable a specific strategy for a site
   */
  public disableStrategy(siteId: number, strategy: string): boolean {
    const currentStrategies = this.activeStrategies.get(siteId) || [];
    const index = currentStrategies.indexOf(strategy);
    
    if (index !== -1) {
      currentStrategies.splice(index, 1);
      this.activeStrategies.set(siteId, currentStrategies);
      return true;
    }
    
    return false;
  }

  /**
   * Get performance metrics for arbitrage strategies at a site
   */
  public getArbitragePerformance(siteId: number): any {
    return this.arbitragePerformance.get(siteId) || {
      totalSavings: 0,
      cyclesUsed: 0,
      lastOptimizationTime: null,
      forecastAccuracy: 0
    };
  }
  
  /**
   * Run optimization for all sites
   */
  private async runOptimizationForAllSites(): Promise<void> {
    const deviceService = initDeviceManagementService();
    // Use the getSites method to get all sites
    const sites = await deviceService.getSites();
    
    for (const site of sites) {
      await this.optimizeSite(site.id);
    }
  }

  /**
   * Run optimization for a specific site
   */
  public async optimizeSite(siteId: number): Promise<any> {
    console.log(`Running battery arbitrage optimization for site ${siteId}`);
    
    try {
      const deviceService = initDeviceManagementService();
      const priceService = getEnergyPriceService();
      
      // Get batteries at the site
      const siteDevices = deviceService.getDevicesBySite(siteId);
      const batteries = siteDevices.filter(device => device.type === 'battery_storage');
      if (!batteries || batteries.length === 0) {
        console.log(`No batteries found at site ${siteId}`);
        return null;
      }
      
      // Get current and forecasted prices
      const currentPrice = await priceService.getCurrentPrice(siteId);
      const priceForecasts = await priceService.getPriceForecast(siteId, 24); // 24 hours ahead
      
      // Get active strategies
      const strategies = this.activeStrategies.get(siteId) || [];
      if (strategies.length === 0) {
        console.log(`No active arbitrage strategies for site ${siteId}`);
        return null;
      }
      
      let optimizationResult = {
        schedules: [] as any[],
        expectedSavings: 0,
        batteryImpact: 0,
        strategy: strategies[0], // Default to first strategy
        nextActions: []
      };
      
      // Apply each strategy
      for (const strategy of strategies) {
        let strategyResult;
        
        switch (strategy) {
          case this.STRATEGIES.SIMPLE_THRESHOLD:
            strategyResult = await this.applySimpleThresholdStrategy(siteId, batteries, currentPrice, priceForecasts);
            break;
            
          case this.STRATEGIES.TIME_OF_USE:
            strategyResult = await this.applyTimeOfUseStrategy(siteId, batteries);
            break;
            
          case this.STRATEGIES.DYNAMIC_PRICE:
            strategyResult = await this.applyDynamicPriceStrategy(siteId, batteries, priceForecasts);
            break;
            
          case this.STRATEGIES.PEAK_SHAVING:
            strategyResult = await this.applyPeakShavingStrategy(siteId, batteries);
            break;
            
          case this.STRATEGIES.SELF_CONSUMPTION:
            strategyResult = await this.applySelfConsumptionStrategy(siteId, batteries);
            break;
            
          case this.STRATEGIES.AI_OPTIMIZED:
            strategyResult = await this.applyAIOptimizedStrategy(siteId, batteries, priceForecasts);
            break;
            
          case this.STRATEGIES.LIFECYCLE_OPTIMIZED:
            strategyResult = await this.applyLifecycleOptimizedStrategy(siteId, batteries, priceForecasts);
            break;
            
          case this.STRATEGIES.GRID_SERVICES:
            strategyResult = await this.applyGridServicesStrategy(siteId, batteries);
            break;
            
          default:
            strategyResult = null;
        }
        
        if (strategyResult && strategyResult.expectedSavings > optimizationResult.expectedSavings) {
          optimizationResult = strategyResult;
        }
      }
      
      // Apply the chosen optimization strategy
      if (optimizationResult.schedules.length > 0) {
        await this.applyOptimizationSchedules(siteId, batteries, optimizationResult.schedules);
        
        // Update performance metrics
        const currentPerformance = this.arbitragePerformance.get(siteId) || {
          totalSavings: 0,
          cyclesUsed: 0,
          lastOptimizationTime: new Date(),
          forecastAccuracy: 0
        };
        
        currentPerformance.totalSavings += optimizationResult.expectedSavings;
        currentPerformance.cyclesUsed += optimizationResult.batteryImpact;
        currentPerformance.lastOptimizationTime = new Date();
        
        this.arbitragePerformance.set(siteId, currentPerformance);
      }
      
      return optimizationResult;
    } catch (error) {
      console.error(`Error in battery arbitrage optimization for site ${siteId}:`, error);
      return null;
    }
  }

  /**
   * Apply Simple Threshold Strategy
   * - Charge when price below threshold
   * - Discharge when price above threshold
   */
  private async applySimpleThresholdStrategy(
    siteId: number,
    batteries: any[],
    currentPrice: number,
    priceForecasts: any[]
  ): Promise<any> {
    console.log(`Applying Simple Threshold strategy for site ${siteId}`);
    
    // Calculate price percentiles to determine thresholds
    const prices = priceForecasts.map(p => p.price);
    prices.sort((a, b) => a - b);
    
    const lowThreshold = prices[Math.floor(prices.length * 0.25)]; // 25th percentile
    const highThreshold = prices[Math.floor(prices.length * 0.75)]; // 75th percentile
    
    // Create schedule for each battery
    const schedules = [];
    let totalExpectedSavings = 0;
    
    for (const battery of batteries) {
      const batteryCapacity = battery.specs?.capacity || 10; // kWh
      const maxChargeRate = battery.specs?.maxChargeRate || 5; // kW
      const maxDischargeRate = battery.specs?.maxDischargeRate || 5; // kW
      const efficiency = battery.specs?.efficiency || 0.9; // 90% round trip efficiency
      
      const schedule = [];
      
      // Create 24-hour schedule with hourly intervals
      for (let hour = 0; hour < 24; hour++) {
        const forecast = priceForecasts[hour] || { price: currentPrice };
        const price = forecast.price;
        
        let action = 'idle';
        let power = 0;
        
        if (price <= lowThreshold) {
          // Low price - charge the battery
          action = 'charge';
          power = maxChargeRate;
        } else if (price >= highThreshold) {
          // High price - discharge the battery
          action = 'discharge';
          power = maxDischargeRate;
        }
        
        schedule.push({
          time: new Date(Date.now() + hour * 60 * 60 * 1000),
          action,
          power,
          price
        });
        
        // Calculate expected savings for this hour
        if (action === 'charge') {
          totalExpectedSavings -= power * price; // Cost to charge
        } else if (action === 'discharge') {
          totalExpectedSavings += power * price * efficiency; // Revenue from discharge
        }
      }
      
      schedules.push({
        batteryId: battery.id,
        schedule
      });
    }
    
    return {
      schedules,
      expectedSavings: totalExpectedSavings,
      batteryImpact: 0.5, // Estimate of battery cycle usage
      strategy: this.STRATEGIES.SIMPLE_THRESHOLD,
      nextActions: schedules.map(s => s.schedule[0])
    };
  }

  /**
   * Apply Time of Use Strategy
   * Based on fixed time-of-use tariff schedules
   */
  private async applyTimeOfUseStrategy(siteId: number, batteries: any[]): Promise<any> {
    console.log(`Applying Time of Use strategy for site ${siteId}`);
    
    // Get energy price service
    const priceService = getEnergyPriceService();
    
    // Get TOU periods for the site
    const touPeriods = await priceService.getTOUPeriods(siteId);
    
    // Create schedule for each battery
    const schedules = [];
    let totalExpectedSavings = 0;
    
    for (const battery of batteries) {
      const batteryCapacity = battery.specs?.capacity || 10; // kWh
      const maxChargeRate = battery.specs?.maxChargeRate || 5; // kW
      const maxDischargeRate = battery.specs?.maxDischargeRate || 5; // kW
      const efficiency = battery.specs?.efficiency || 0.9; // 90% round trip efficiency
      
      const schedule = [];
      
      // Create 24-hour schedule with hourly intervals
      for (let hour = 0; hour < 24; hour++) {
        const currentHour = new Date().getHours();
        const targetHour = (currentHour + hour) % 24;
        
        // Find TOU period for this hour
        const period = touPeriods.find(p => {
          const startHour = parseInt(p.startTime.split(':')[0]);
          const endHour = parseInt(p.endTime.split(':')[0]);
          return targetHour >= startHour && targetHour < endHour;
        });
        
        let action = 'idle';
        let power = 0;
        
        if (period) {
          if (period.type === 'off_peak') {
            // Off-peak - charge the battery
            action = 'charge';
            power = maxChargeRate;
          } else if (period.type === 'peak') {
            // Peak - discharge the battery
            action = 'discharge';
            power = maxDischargeRate;
          }
        }
        
        schedule.push({
          time: new Date(Date.now() + hour * 60 * 60 * 1000),
          action,
          power,
          period: period?.type || 'standard'
        });
        
        // Calculate expected savings
        if (action === 'charge') {
          totalExpectedSavings -= power * (period?.price || 0.1); // Cost to charge
        } else if (action === 'discharge') {
          totalExpectedSavings += power * (period?.price || 0.3) * efficiency; // Revenue from discharge
        }
      }
      
      schedules.push({
        batteryId: battery.id,
        schedule
      });
    }
    
    return {
      schedules,
      expectedSavings: totalExpectedSavings,
      batteryImpact: 0.7, // Estimate of battery cycle usage
      strategy: this.STRATEGIES.TIME_OF_USE,
      nextActions: schedules.map(s => s.schedule[0])
    };
  }

  /**
   * Apply Dynamic Price Strategy
   * Optimize based on forecasted prices and price volatility
   */
  private async applyDynamicPriceStrategy(
    siteId: number,
    batteries: any[],
    priceForecasts: any[]
  ): Promise<any> {
    console.log(`Applying Dynamic Price strategy for site ${siteId}`);
    
    // Sort price forecasts to find best charge/discharge times
    const sortedForecasts = [...priceForecasts].sort((a, b) => a.price - b.price);
    
    // Create schedule for each battery
    const schedules = [];
    let totalExpectedSavings = 0;
    
    for (const battery of batteries) {
      const batteryCapacity = battery.specs?.capacity || 10; // kWh
      const maxChargeRate = battery.specs?.maxChargeRate || 5; // kW
      const maxDischargeRate = battery.specs?.maxDischargeRate || 5; // kW
      const efficiency = battery.specs?.efficiency || 0.9; // 90% round trip efficiency
      
      // Calculate how many hours to charge/discharge based on battery capacity
      const chargingHours = Math.ceil(batteryCapacity / maxChargeRate);
      const dischargingHours = Math.ceil(batteryCapacity / maxDischargeRate);
      
      // Find best hours to charge (lowest prices)
      const bestChargingHours = sortedForecasts.slice(0, chargingHours);
      
      // Find best hours to discharge (highest prices)
      const bestDischargingHours = sortedForecasts.slice(sortedForecasts.length - dischargingHours);
      
      const hourlySchedule = new Array(24).fill({ action: 'idle', power: 0 });
      
      // Set charging hours
      for (const forecast of bestChargingHours) {
        const hour = new Date(forecast.time).getHours();
        hourlySchedule[hour] = { 
          action: 'charge', 
          power: maxChargeRate,
          price: forecast.price
        };
      }
      
      // Set discharging hours
      for (const forecast of bestDischargingHours) {
        const hour = new Date(forecast.time).getHours();
        hourlySchedule[hour] = { 
          action: 'discharge', 
          power: maxDischargeRate,
          price: forecast.price
        };
      }
      
      // Calculate expected savings and format schedule
      const schedule = [];
      const now = new Date();
      
      for (let hour = 0; hour < 24; hour++) {
        const time = new Date(now);
        time.setHours(now.getHours() + hour);
        
        const hourData = hourlySchedule[hour];
        
        schedule.push({
          time,
          action: hourData.action,
          power: hourData.power,
          price: hourData.price || 0
        });
        
        // Calculate expected savings
        if (hourData.action === 'charge') {
          totalExpectedSavings -= hourData.power * hourData.price; // Cost to charge
        } else if (hourData.action === 'discharge') {
          totalExpectedSavings += hourData.power * hourData.price * efficiency; // Revenue from discharge
        }
      }
      
      schedules.push({
        batteryId: battery.id,
        schedule
      });
    }
    
    return {
      schedules,
      expectedSavings: totalExpectedSavings,
      batteryImpact: 1.0, // Full cycle usage
      strategy: this.STRATEGIES.DYNAMIC_PRICE,
      nextActions: schedules.map(s => s.schedule[0])
    };
  }

  /**
   * Apply Peak Shaving Strategy
   * Focus on reducing peak demand charges
   */
  private async applyPeakShavingStrategy(siteId: number, batteries: any[]): Promise<any> {
    console.log(`Applying Peak Shaving strategy for site ${siteId}`);
    
    // This is a placeholder implementation
    // A real implementation would:
    // 1. Get historical load profile for the site
    // 2. Predict peak demand periods
    // 3. Schedule battery to discharge during predicted peaks
    
    const schedules = [];
    let totalExpectedSavings = 0;
    
    // Simple implementation assuming peaks around 6-9pm
    for (const battery of batteries) {
      const maxDischargeRate = battery.specs?.maxDischargeRate || 5; // kW
      
      const schedule = [];
      
      // Create 24-hour schedule with hourly intervals
      for (let hour = 0; hour < 24; hour++) {
        const currentHour = new Date().getHours();
        const targetHour = (currentHour + hour) % 24;
        
        let action = 'idle';
        let power = 0;
        
        // Charge during night hours (low demand)
        if (targetHour >= 1 && targetHour <= 5) {
          action = 'charge';
          power = battery.specs?.maxChargeRate || 5;
        }
        // Discharge during peak hours (typically evening)
        else if (targetHour >= 18 && targetHour <= 21) {
          action = 'discharge';
          power = maxDischargeRate;
        }
        
        schedule.push({
          time: new Date(Date.now() + hour * 60 * 60 * 1000),
          action,
          power
        });
      }
      
      schedules.push({
        batteryId: battery.id,
        schedule
      });
      
      // Estimated savings from peak demand reduction
      // Assuming peak demand charge of $15/kW
      const peakReduction = maxDischargeRate; // kW
      const demandCharge = 15; // $/kW
      totalExpectedSavings = peakReduction * demandCharge;
    }
    
    return {
      schedules,
      expectedSavings: totalExpectedSavings,
      batteryImpact: 0.5, // Half cycle usage
      strategy: this.STRATEGIES.PEAK_SHAVING,
      nextActions: schedules.map(s => s.schedule[0])
    };
  }

  /**
   * Apply Self Consumption Strategy
   * Optimize for maximum solar self-consumption
   */
  private async applySelfConsumptionStrategy(siteId: number, batteries: any[]): Promise<any> {
    console.log(`Applying Self Consumption strategy for site ${siteId}`);
    
    // Get device management service
    const deviceService = initDeviceManagementService();
    
    // Get solar devices at the site
    const solarDevices = deviceService.getDevicesBySiteAndType(siteId, 'solar_pv');
    
    if (!solarDevices || solarDevices.length === 0) {
      console.log(`No solar devices found at site ${siteId} for self-consumption strategy`);
      return null;
    }
    
    // Create schedule for each battery
    const schedules = [];
    let totalExpectedSavings = 0;
    
    // Simple implementation assuming solar production between 9am-4pm
    for (const battery of batteries) {
      const schedule = [];
      
      // Create 24-hour schedule with hourly intervals
      for (let hour = 0; hour < 24; hour++) {
        const currentHour = new Date().getHours();
        const targetHour = (currentHour + hour) % 24;
        
        let action = 'idle';
        let power = 0;
        
        // Charge during solar production hours
        if (targetHour >= 9 && targetHour <= 16) {
          action = 'charge';
          power = battery.specs?.maxChargeRate || 5;
        }
        // Discharge during evening hours when there's no solar
        else if (targetHour >= 18 && targetHour <= 23) {
          action = 'discharge';
          power = battery.specs?.maxDischargeRate || 5;
        }
        
        schedule.push({
          time: new Date(Date.now() + hour * 60 * 60 * 1000),
          action,
          power
        });
      }
      
      schedules.push({
        batteryId: battery.id,
        schedule
      });
      
      // Estimate savings based on retail electricity rate
      const retailRate = 0.3; // $/kWh
      const feedInTariff = 0.1; // $/kWh
      
      // Assume 8 hours of charging and 6 hours of discharging
      const energyCharged = 8 * (battery.specs?.maxChargeRate || 5); // kWh
      const energyDischarged = 6 * (battery.specs?.maxDischargeRate || 5); // kWh
      
      // Benefit = avoided retail purchases - lost feed-in tariff
      totalExpectedSavings = (energyDischarged * retailRate) - (energyCharged * feedInTariff);
    }
    
    return {
      schedules,
      expectedSavings: totalExpectedSavings,
      batteryImpact: 0.8, // Battery cycle usage
      strategy: this.STRATEGIES.SELF_CONSUMPTION,
      nextActions: schedules.map(s => s.schedule[0])
    };
  }

  /**
   * Apply AI Optimized Strategy
   * Use AI models to optimize battery operation
   */
  private async applyAIOptimizedStrategy(
    siteId: number,
    batteries: any[],
    priceForecasts: any[]
  ): Promise<any> {
    console.log(`Applying AI Optimized strategy for site ${siteId}`);
    
    // Get AI optimization service
    const aiService = getAIOptimizationService();
    
    try {
      // Prepare context for AI optimization
      const optimizationContext = {
        siteId,
        batteries: batteries.map(b => ({
          id: b.id,
          capacity: b.specs?.capacity || 10,
          maxChargeRate: b.specs?.maxChargeRate || 5,
          maxDischargeRate: b.specs?.maxDischargeRate || 5,
          efficiency: b.specs?.efficiency || 0.9,
          currentSoC: b.telemetry?.soc || 50
        })),
        priceForecasts: priceForecasts.map(p => ({
          time: p.time,
          price: p.price
        })),
        objective: 'maximize_profit',
        constraints: {
          minSoC: 20, // Minimum state of charge (%)
          maxSoC: 90, // Maximum state of charge (%)
          maxCycles: 1 // Maximum daily cycles
        }
      };
      
      // Run AI optimization
      const aiResult = await aiService.optimizeBatterySchedule(optimizationContext);
      
      if (!aiResult || !aiResult.schedules) {
        console.log(`AI optimization failed for site ${siteId}`);
        return null;
      }
      
      return {
        schedules: aiResult.schedules,
        expectedSavings: aiResult.expectedSavings || 0,
        batteryImpact: aiResult.batteryImpact || 0.9,
        strategy: this.STRATEGIES.AI_OPTIMIZED,
        nextActions: aiResult.schedules.map((s: any) => s.schedule[0])
      };
    } catch (error) {
      console.error(`Error in AI optimization for site ${siteId}:`, error);
      return null;
    }
  }

  /**
   * Apply Lifecycle Optimized Strategy
   * Optimize for battery longevity while still capturing value
   */
  private async applyLifecycleOptimizedStrategy(
    siteId: number,
    batteries: any[],
    priceForecasts: any[]
  ): Promise<any> {
    console.log(`Applying Lifecycle Optimized strategy for site ${siteId}`);
    
    // Sort price forecasts to find extreme price points only
    const sortedForecasts = [...priceForecasts].sort((a, b) => a.price - b.price);
    
    // Only use the most extreme prices (top/bottom 10%)
    const lowestPrices = sortedForecasts.slice(0, Math.floor(sortedForecasts.length * 0.1));
    const highestPrices = sortedForecasts.slice(Math.floor(sortedForecasts.length * 0.9));
    
    // Create schedule for each battery
    const schedules = [];
    let totalExpectedSavings = 0;
    
    for (const battery of batteries) {
      const batteryCapacity = battery.specs?.capacity || 10; // kWh
      const maxChargeRate = battery.specs?.maxChargeRate || 5; // kW
      const maxDischargeRate = battery.specs?.maxDischargeRate || 5; // kW
      const efficiency = battery.specs?.efficiency || 0.9; // 90% round trip efficiency
      
      // Limit depth of discharge to optimize lifecycle
      const maxDoD = 0.6; // Maximum 60% depth of discharge
      const usableCapacity = batteryCapacity * maxDoD;
      
      // Calculate how many hours to charge/discharge based on usable capacity
      const chargingHours = Math.ceil(usableCapacity / maxChargeRate);
      const dischargingHours = Math.ceil(usableCapacity / maxDischargeRate);
      
      // Create hourly schedule (default to idle)
      const hourlySchedule = new Array(24).fill({ action: 'idle', power: 0 });
      
      // Apply charging schedule during lowest price hours
      for (let i = 0; i < Math.min(chargingHours, lowestPrices.length); i++) {
        const forecast = lowestPrices[i];
        const hour = new Date(forecast.time).getHours();
        hourlySchedule[hour] = { 
          action: 'charge', 
          power: maxChargeRate * 0.8, // Reduce charging rate to 80% for battery health
          price: forecast.price
        };
      }
      
      // Apply discharging schedule during highest price hours
      for (let i = 0; i < Math.min(dischargingHours, highestPrices.length); i++) {
        const forecast = highestPrices[i];
        const hour = new Date(forecast.time).getHours();
        hourlySchedule[hour] = { 
          action: 'discharge', 
          power: maxDischargeRate * 0.8, // Reduce discharging rate to 80% for battery health
          price: forecast.price
        };
      }
      
      // Format final schedule
      const schedule = [];
      const now = new Date();
      
      for (let hour = 0; hour < 24; hour++) {
        const time = new Date(now);
        time.setHours(now.getHours() + hour);
        
        const hourData = hourlySchedule[hour];
        
        schedule.push({
          time,
          action: hourData.action,
          power: hourData.power,
          price: hourData.price || 0
        });
        
        // Calculate expected savings
        if (hourData.action === 'charge') {
          totalExpectedSavings -= hourData.power * hourData.price; // Cost to charge
        } else if (hourData.action === 'discharge') {
          totalExpectedSavings += hourData.power * hourData.price * efficiency; // Revenue from discharge
        }
      }
      
      schedules.push({
        batteryId: battery.id,
        schedule
      });
    }
    
    return {
      schedules,
      expectedSavings: totalExpectedSavings,
      batteryImpact: 0.4, // Reduced cycle usage for battery longevity
      strategy: this.STRATEGIES.LIFECYCLE_OPTIMIZED,
      nextActions: schedules.map(s => s.schedule[0])
    };
  }

  /**
   * Apply Grid Services Strategy
   * Optimize for providing grid services and capturing incentives
   */
  private async applyGridServicesStrategy(siteId: number, batteries: any[]): Promise<any> {
    console.log(`Applying Grid Services strategy for site ${siteId}`);
    
    // This would integrate with grid service programs
    // For demonstration, we'll use a fixed schedule for frequency regulation
    
    const schedules = [];
    let totalExpectedSavings = 0;
    
    for (const battery of batteries) {
      const schedule = [];
      
      // Create 24-hour schedule with 15-minute intervals for frequency regulation
      for (let hour = 0; hour < 24; hour++) {
        for (let quarter = 0; quarter < 4; quarter++) {
          const time = new Date();
          time.setHours(time.getHours() + hour);
          time.setMinutes(quarter * 15);
          
          // Alternate between charge and discharge for frequency regulation
          const action = (hour + quarter) % 2 === 0 ? 'charge' : 'discharge';
          
          // Use 20% of capacity for grid services
          const power = action === 'charge' 
            ? (battery.specs?.maxChargeRate || 5) * 0.2
            : (battery.specs?.maxDischargeRate || 5) * 0.2;
          
          schedule.push({
            time,
            action,
            power,
            serviceType: 'frequency_regulation'
          });
        }
      }
      
      schedules.push({
        batteryId: battery.id,
        schedule
      });
      
      // Calculate expected revenue from grid services
      // Assuming $30/MW-hour for frequency regulation
      const serviceCapacity = (battery.specs?.maxChargeRate || 5) * 0.2 / 1000; // MW
      const serviceHours = 24; // Hours per day
      const serviceRate = 30; // $/MW-hour
      
      totalExpectedSavings = serviceCapacity * serviceHours * serviceRate;
    }
    
    return {
      schedules,
      expectedSavings: totalExpectedSavings,
      batteryImpact: 0.3, // Low cycle usage for frequency regulation
      strategy: this.STRATEGIES.GRID_SERVICES,
      nextActions: schedules.map(s => s.schedule[0])
    };
  }

  /**
   * Apply battery schedules to actual devices
   */
  private async applyOptimizationSchedules(
    siteId: number,
    batteries: any[],
    schedules: any[]
  ): Promise<void> {
    console.log(`Applying optimization schedules to batteries at site ${siteId}`);
    
    const deviceService = initDeviceManagementService();
    
    for (const schedule of schedules) {
      const batteryId = schedule.batteryId;
      const battery = batteries.find(b => b.id === batteryId);
      
      if (!battery) {
        console.log(`Battery ${batteryId} not found at site ${siteId}`);
        continue;
      }
      
      // Find the next action to take
      const now = new Date();
      const nextAction = schedule.schedule.find((s: any) => {
        const actionTime = new Date(s.time);
        return actionTime >= now;
      });
      
      if (!nextAction) {
        console.log(`No next action found for battery ${batteryId}`);
        continue;
      }
      
      // Send command to the battery
      if (nextAction.action !== 'idle') {
        try {
          const command = {
            action: nextAction.action,
            power: nextAction.power,
            duration: 3600 // 1 hour in seconds
          };
          
          await deviceService.sendDeviceCommand(batteryId, command);
          console.log(`Command sent to battery ${batteryId}: ${nextAction.action} at ${nextAction.power}kW`);
        } catch (error) {
          console.error(`Error sending command to battery ${batteryId}:`, error);
        }
      }
    }
  }
}

/**
 * Get the battery arbitrage service instance
 */
export function getBatteryArbitrageService(): BatteryArbitrageService {
  return BatteryArbitrageService.getInstance();
}