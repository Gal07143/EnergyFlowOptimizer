import { getAIOptimizationService } from './ai-optimization';

/**
 * Energy Price Service
 * 
 * This service handles energy pricing data, including:
 * - Real-time price fetching
 * - Price forecasting
 * - Time-of-Use (TOU) tariffs
 * - Dynamic pricing
 * - Historical pricing data
 */
export class EnergyPriceService {
  private static instance: EnergyPriceService;
  
  // Cache for price data
  private priceCache: Map<number, {
    currentPrice: number;
    priceForecasts: any[];
    lastUpdated: Date;
  }> = new Map();
  
  // Time of Use periods by site
  private touPeriods: Map<number, any[]> = new Map();
  
  // Price update interval in ms (5 minutes)
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000;
  
  // Tariff types for sites
  private siteTariffs: Map<number, {
    type: 'fixed' | 'tou' | 'dynamic';
    details: any;
  }> = new Map();

  private constructor() {
    this.initializeDemoData();
    
    // Set up periodic price updates
    setInterval(() => {
      this.updateAllPrices();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): EnergyPriceService {
    if (!EnergyPriceService.instance) {
      EnergyPriceService.instance = new EnergyPriceService();
    }
    return EnergyPriceService.instance;
  }

  /**
   * Initialize with demo data
   */
  private initializeDemoData(): void {
    console.log('Initializing Energy Price Service with demo data...');
    
    // Demo site 1 - TOU tariff
    this.siteTariffs.set(1, {
      type: 'tou',
      details: {
        providerName: 'EnergyUtility',
        planName: 'Time of Use Plan',
        currency: 'USD',
        unit: 'kWh'
      }
    });
    
    // Set up TOU periods for site 1
    this.touPeriods.set(1, [
      {
        type: 'off_peak',
        price: 0.08,
        startTime: '00:00',
        endTime: '06:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
      },
      {
        type: 'standard',
        price: 0.15,
        startTime: '06:00',
        endTime: '16:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
      },
      {
        type: 'peak',
        price: 0.32,
        startTime: '16:00',
        endTime: '20:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
      },
      {
        type: 'standard',
        price: 0.15,
        startTime: '20:00',
        endTime: '24:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
      }
    ]);
    
    // Generate initial price forecasts for site 1
    this.updatePriceForecasts(1);
  }

  /**
   * Get the current energy price for a site
   */
  public async getCurrentPrice(siteId: number): Promise<number> {
    const cacheData = this.priceCache.get(siteId);
    
    // Check if cache is valid (not older than 5 minutes)
    if (cacheData && (new Date().getTime() - cacheData.lastUpdated.getTime() < this.UPDATE_INTERVAL)) {
      return cacheData.currentPrice;
    }
    
    // Update price data
    await this.updatePriceForecasts(siteId);
    
    // Return from cache (which should now be updated)
    const updatedCacheData = this.priceCache.get(siteId);
    return updatedCacheData ? updatedCacheData.currentPrice : 0;
  }

  /**
   * Get price forecast for a specified number of hours ahead
   */
  public async getPriceForecast(siteId: number, hours: number = 24): Promise<any[]> {
    const cacheData = this.priceCache.get(siteId);
    
    // Check if cache is valid (not older than 5 minutes)
    if (cacheData && (new Date().getTime() - cacheData.lastUpdated.getTime() < this.UPDATE_INTERVAL)) {
      return cacheData.priceForecasts.slice(0, hours);
    }
    
    // Update price data
    await this.updatePriceForecasts(siteId);
    
    // Return from cache (which should now be updated)
    const updatedCacheData = this.priceCache.get(siteId);
    return updatedCacheData ? updatedCacheData.priceForecasts.slice(0, hours) : [];
  }

  /**
   * Get Time of Use periods for a site
   */
  public async getTOUPeriods(siteId: number): Promise<any[]> {
    return this.touPeriods.get(siteId) || [];
  }

  /**
   * Get tariff information for a site
   */
  public getTariffInfo(siteId: number): any {
    return this.siteTariffs.get(siteId) || { type: 'fixed', details: { price: 0.15 } };
  }

  /**
   * Update prices for all sites
   */
  private async updateAllPrices(): Promise<void> {
    for (const siteId of this.siteTariffs.keys()) {
      await this.updatePriceForecasts(siteId);
    }
  }

  /**
   * Update price forecasts for a specific site
   */
  private async updatePriceForecasts(siteId: number): Promise<void> {
    try {
      const tariffInfo = this.siteTariffs.get(siteId);
      
      if (!tariffInfo) {
        console.log(`No tariff information found for site ${siteId}`);
        return;
      }
      
      let currentPrice = 0;
      let priceForecasts: any[] = [];
      
      switch (tariffInfo.type) {
        case 'fixed':
          currentPrice = tariffInfo.details.price || 0.15;
          priceForecasts = this.generateFixedPriceForecasts(currentPrice);
          break;
          
        case 'tou':
          const touPeriods = this.touPeriods.get(siteId) || [];
          currentPrice = this.getCurrentTOUPrice(touPeriods);
          priceForecasts = this.generateTOUPriceForecasts(touPeriods);
          break;
          
        case 'dynamic':
          // For dynamic pricing, we would fetch from an external API
          // For demo, we'll generate random prices with a trend
          const result = await this.generateDynamicPriceForecasts();
          currentPrice = result.currentPrice;
          priceForecasts = result.forecasts;
          break;
      }
      
      // Update cache
      this.priceCache.set(siteId, {
        currentPrice,
        priceForecasts,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      console.error(`Error updating price forecasts for site ${siteId}:`, error);
    }
  }

  /**
   * Get the current price based on Time of Use periods
   */
  private getCurrentTOUPrice(touPeriods: any[]): number {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Find the matching TOU period
    const matchingPeriod = touPeriods.find(period => {
      // Check if today is in the days of week for this period
      if (!period.daysOfWeek.includes(currentDay)) {
        return false;
      }
      
      // Check if current time is within the period's time range
      return currentTime >= period.startTime && currentTime < period.endTime;
    });
    
    return matchingPeriod ? matchingPeriod.price : 0.15; // Default to 0.15 if no match
  }

  /**
   * Generate fixed price forecasts
   */
  private generateFixedPriceForecasts(price: number): any[] {
    const forecasts = [];
    const now = new Date();
    
    for (let hour = 0; hour < 24; hour++) {
      const forecastTime = new Date(now);
      forecastTime.setHours(now.getHours() + hour);
      
      forecasts.push({
        time: forecastTime.toISOString(),
        price
      });
    }
    
    return forecasts;
  }

  /**
   * Generate Time of Use price forecasts
   */
  private generateTOUPriceForecasts(touPeriods: any[]): any[] {
    const forecasts = [];
    const now = new Date();
    
    for (let hour = 0; hour < 24; hour++) {
      const forecastTime = new Date(now);
      forecastTime.setHours(now.getHours() + hour);
      
      const forecastHour = forecastTime.getHours();
      const forecastMinute = forecastTime.getMinutes();
      const forecastTimeStr = `${forecastHour.toString().padStart(2, '0')}:${forecastMinute.toString().padStart(2, '0')}`;
      const forecastDay = forecastTime.getDay();
      
      // Find the matching TOU period
      const matchingPeriod = touPeriods.find(period => {
        // Check if forecast day is in the days of week for this period
        if (!period.daysOfWeek.includes(forecastDay)) {
          return false;
        }
        
        // Check if forecast time is within the period's time range
        return forecastTimeStr >= period.startTime && forecastTimeStr < period.endTime;
      });
      
      forecasts.push({
        time: forecastTime.toISOString(),
        price: matchingPeriod ? matchingPeriod.price : 0.15,
        periodType: matchingPeriod ? matchingPeriod.type : 'standard'
      });
    }
    
    return forecasts;
  }

  /**
   * Generate dynamic price forecasts
   * In a real implementation, this would fetch from market data APIs
   */
  private async generateDynamicPriceForecasts(): Promise<{ currentPrice: number, forecasts: any[] }> {
    const forecasts = [];
    const now = new Date();
    
    // Base price and volatility
    const basePrice = 0.12;
    const volatility = 0.08;
    
    // Add time-of-day pattern (higher during peak hours)
    const peakHourBoost = 0.15;
    
    // Add some random price shocks
    const hasShock = Math.random() > 0.7;
    const shockHour = Math.floor(Math.random() * 24);
    const shockMagnitude = Math.random() * 0.2 + 0.1;
    
    // Try to use AI for optimized forecasting if available
    try {
      const aiService = getAIOptimizationService();
      const aiForecasts = await aiService.generatePriceForecasts({
        basePrice,
        volatility,
        peakHourBoost
      });
      
      if (aiForecasts && aiForecasts.length > 0) {
        return {
          currentPrice: aiForecasts[0].price,
          forecasts: aiForecasts
        };
      }
    } catch (error) {
      console.log('AI price forecasting not available, using fallback method');
    }
    
    // Fallback to algorithmic forecasting
    let currentPrice = 0;
    
    for (let hour = 0; hour < 24; hour++) {
      const forecastTime = new Date(now);
      forecastTime.setHours(now.getHours() + hour);
      const forecastHour = forecastTime.getHours();
      
      // Calculate price with patterns
      let price = basePrice;
      
      // Add daily pattern (higher during day)
      if (forecastHour >= 8 && forecastHour <= 20) {
        price += 0.04;
      }
      
      // Add peak hours boost (5pm - 9pm)
      if (forecastHour >= 17 && forecastHour <= 21) {
        price += peakHourBoost;
      }
      
      // Add overnight dip (1am - 5am)
      if (forecastHour >= 1 && forecastHour <= 5) {
        price -= 0.05;
      }
      
      // Add random variation
      price += (Math.random() * 2 - 1) * volatility;
      
      // Add price shock if applicable
      if (hasShock && hour === shockHour) {
        price += shockMagnitude;
      }
      
      // Ensure price is non-negative
      price = Math.max(0.01, price);
      
      // Round to 4 decimal places
      price = Math.round(price * 10000) / 10000;
      
      forecasts.push({
        time: forecastTime.toISOString(),
        price
      });
      
      // Set current price from first forecast
      if (hour === 0) {
        currentPrice = price;
      }
    }
    
    return {
      currentPrice,
      forecasts
    };
  }

  /**
   * Get historical price data for a site
   */
  public async getHistoricalPrices(siteId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // In a real implementation, this would fetch from a database
    // For demo purposes, we'll generate synthetic data based on the tariff type
    
    const tariffInfo = this.siteTariffs.get(siteId);
    if (!tariffInfo) {
      return [];
    }
    
    const priceHistory = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      let price = 0;
      
      switch (tariffInfo.type) {
        case 'fixed':
          price = tariffInfo.details.price || 0.15;
          break;
          
        case 'tou':
          const touPeriods = this.touPeriods.get(siteId) || [];
          const hour = currentDate.getHours();
          const minute = currentDate.getMinutes();
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const day = currentDate.getDay();
          
          const matchingPeriod = touPeriods.find(period => {
            return period.daysOfWeek.includes(day) && 
                   timeStr >= period.startTime && 
                   timeStr < period.endTime;
          });
          
          price = matchingPeriod ? matchingPeriod.price : 0.15;
          break;
          
        case 'dynamic':
          // Generate pseudo-random historical prices with patterns
          const basePrice = 0.12;
          const hour = currentDate.getHours();
          const day = currentDate.getDay();
          const isWeekend = day === 0 || day === 6;
          
          price = basePrice;
          
          // Add time-of-day pattern
          if (hour >= 17 && hour <= 21) {
            price += 0.08; // Evening peak
          } else if (hour >= 1 && hour <= 5) {
            price -= 0.05; // Overnight dip
          }
          
          // Weekend pricing tends to be lower
          if (isWeekend) {
            price -= 0.03;
          }
          
          // Add some randomness
          price += (Math.random() * 0.06) - 0.03;
          
          // Ensure price is non-negative and round
          price = Math.max(0.01, price);
          price = Math.round(price * 10000) / 10000;
          break;
      }
      
      priceHistory.push({
        timestamp: new Date(currentDate).toISOString(),
        price
      });
      
      // Move to next hour
      currentDate.setHours(currentDate.getHours() + 1);
    }
    
    return priceHistory;
  }
}

/**
 * Get the energy price service instance
 */
export function getEnergyPriceService(): EnergyPriceService {
  return EnergyPriceService.getInstance();
}