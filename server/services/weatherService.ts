import fetch from 'node-fetch';
import { db } from '../db';
import { weatherData, InsertWeatherData, sites } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';

// OpenWeatherMap API constants
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const FORECAST_URL = `${API_BASE_URL}/forecast`;
const CURRENT_URL = `${API_BASE_URL}/weather`;
const ONE_CALL_URL = `${API_BASE_URL}/onecall`;
const UNITS = 'metric'; // Use metric units (Celsius, meters/sec, etc.)

class WeatherService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
  }

  // Initialize API key (can be called later if not available at startup)
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Check if API key is available
  hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  // Get current weather for a site
  async getCurrentWeather(siteId: number): Promise<InsertWeatherData | null> {
    // If no API key, use fallback weather
    if (!this.hasApiKey()) {
      console.warn('OpenWeatherMap API key not available, using fallback weather data.');
      return this.getFallbackWeather(siteId, false);
    }

    try {
      // Get site details to get location
      const site = await storage.getSite(siteId);
      
      if (!site) {
        throw new Error(`Site with ID ${siteId} not found`);
      }

      // Fetch coordinates based on address if not already available
      // In a real implementation, we would geocode the address
      // For now we use a default location for demo purposes
      const latitude = 40.7128; // Default to New York
      const longitude = -74.0060;

      // Make API call
      const response = await fetch(
        `${CURRENT_URL}?lat=${latitude}&lon=${longitude}&units=${UNITS}&appid=${this.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;

      // Process response and convert to our data format
      const weatherDataEntry: InsertWeatherData = {
        siteId,
        timestamp: new Date(),
        temperature: data.main.temp,
        humidity: data.main.humidity,
        cloudCover: data.clouds?.all || 0,
        windSpeed: data.wind?.speed || 0,
        windDirection: data.wind?.deg || 0,
        precipitation: data.rain?.['1h'] || 0,
        pressure: data.main.pressure,
        uvIndex: data.uvi || 0,
        sunriseTime: new Date(data.sys.sunrise * 1000),
        sunsetTime: new Date(data.sys.sunset * 1000),
        condition: this.mapWeatherCondition(data.weather[0].main),
        icon: data.weather[0].icon,
        isForecasted: false,
        source: 'openweathermap',
        locationName: data.name,
        latitude,
        longitude,
        metadata: {
          originalResponse: data,
          visibility: data.visibility,
          feelsLike: data.main.feels_like,
        },
      };

      // Save to database
      const [savedWeather] = await db.insert(weatherData).values(weatherDataEntry).returning();
      return weatherDataEntry;
    }
    catch (error) {
      console.error('Error fetching current weather:', error);
      // Use fallback in case of error
      return this.getFallbackWeather(siteId, false);
    }
  }

  // Get weather forecast for a site
  async getWeatherForecast(siteId: number, days: number = 5): Promise<InsertWeatherData[] | null> {
    // If no API key, use fallback forecast
    if (!this.hasApiKey()) {
      console.warn('OpenWeatherMap API key not available, using fallback forecast data.');
      
      // Generate an array of forecasts for the requested number of days
      const forecasts: InsertWeatherData[] = [];
      
      for (let i = 0; i < days; i++) {
        const forecast = await this.getFallbackWeather(siteId, true, i);
        if (forecast) {
          forecasts.push(forecast);
        }
      }
      
      return forecasts;
    }

    try {
      // Get site details to get location
      const site = await storage.getSite(siteId);
      
      if (!site) {
        throw new Error(`Site with ID ${siteId} not found`);
      }

      // Fetch coordinates based on address if not already available
      const latitude = 40.7128; // Default to New York
      const longitude = -74.0060;

      // Make API call
      const response = await fetch(
        `${FORECAST_URL}?lat=${latitude}&lon=${longitude}&units=${UNITS}&cnt=${days * 8}&appid=${this.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      const forecasts: InsertWeatherData[] = [];

      // Process response and convert to our data format
      // The forecast API returns data in 3-hour increments
      for (const item of data.list) {
        const forecastTime = new Date(item.dt * 1000);
        
        const weatherDataEntry: InsertWeatherData = {
          siteId,
          timestamp: new Date(),
          forecastTime,
          temperature: item.main.temp,
          humidity: item.main.humidity,
          cloudCover: item.clouds?.all || 0,
          windSpeed: item.wind?.speed || 0,
          windDirection: item.wind?.deg || 0,
          precipitation: item.rain?.['3h'] || 0,
          pressure: item.main.pressure,
          condition: this.mapWeatherCondition(item.weather[0].main),
          icon: item.weather[0].icon,
          isForecasted: true,
          source: 'openweathermap',
          locationName: data.city.name,
          latitude,
          longitude,
          metadata: {
            originalResponse: item,
            city: data.city,
            feelsLike: item.main.feels_like,
          },
        };

        forecasts.push(weatherDataEntry);
        
        // Save to database
        await db.insert(weatherData).values(weatherDataEntry);
      }

      return forecasts;
    }
    catch (error) {
      console.error('Error fetching weather forecast:', error);
      // Use fallback in case of error
      const forecasts: InsertWeatherData[] = [];
      
      for (let i = 0; i < days; i++) {
        const forecast = await this.getFallbackWeather(siteId, true, i);
        if (forecast) {
          forecasts.push(forecast);
        }
      }
      
      return forecasts;
    }
  }

  // Get recent weather data for a site from database
  async getRecentWeatherData(siteId: number, limit: number = 10): Promise<any[]> {
    try {
      // Get the most recent weather data entries
      const results = await db.select()
        .from(weatherData)
        .where(eq(weatherData.siteId, siteId))
        .orderBy(weatherData.timestamp)
        .limit(limit);
        
      return results;
    } catch (error) {
      console.error('Error fetching recent weather data:', error);
      return [];
    }
  }

  // Generate fallback weather data when API is not available
  private async getFallbackWeather(siteId: number, isForecast: boolean, daysOffset: number = 0): Promise<InsertWeatherData> {
    // Base time is now for current weather or future for forecast
    const baseTime = new Date();
    if (isForecast) {
      baseTime.setDate(baseTime.getDate() + daysOffset);
    }

    // Generate some semi-realistic weather data
    const hourOfDay = baseTime.getHours();
    const isDaytime = hourOfDay >= 6 && hourOfDay <= 18;
    
    // Temperature variations based on time of day
    let temperature = 22; // Base temperature
    if (isDaytime) {
      temperature += 5; // Warmer during day
    } else {
      temperature -= 3; // Cooler at night
    }
    
    // Add some random variation
    temperature += (Math.random() * 4) - 2;
    
    // Conditions are more likely to be clear during day
    const conditions = ['clear', 'clouds', 'rain'];
    const weights = isDaytime ? [0.6, 0.3, 0.1] : [0.3, 0.5, 0.2];
    
    // Choose a condition based on weights
    let condition = 'clear';
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < conditions.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        condition = conditions[i];
        break;
      }
    }
    
    // Set sunrise and sunset times
    const today = new Date(baseTime);
    const sunriseTime = new Date(today.setHours(6, 30, 0, 0));
    const sunsetTime = new Date(today.setHours(19, 30, 0, 0));
    
    // Icon based on condition and time of day
    let icon = '';
    if (condition === 'clear') {
      icon = isDaytime ? '01d' : '01n';
    } else if (condition === 'clouds') {
      icon = isDaytime ? '03d' : '03n';
    } else {
      icon = isDaytime ? '10d' : '10n';
    }

    // Create fallback weather data
    const fallbackData: InsertWeatherData = {
      siteId,
      timestamp: new Date(),
      forecastTime: isForecast ? baseTime : undefined,
      temperature,
      humidity: 65 + (Math.random() * 20) - 10,
      cloudCover: condition === 'clear' ? 10 : condition === 'clouds' ? 70 : 90,
      windSpeed: 3 + (Math.random() * 5),
      windDirection: Math.floor(Math.random() * 360),
      precipitation: condition === 'rain' ? 1 + Math.random() * 3 : 0,
      pressure: 1013 + (Math.random() * 10) - 5,
      uvIndex: isDaytime ? 5 + (Math.random() * 3) - 1.5 : 0,
      sunriseTime,
      sunsetTime,
      condition: condition as any,
      icon,
      isForecasted: isForecast,
      source: 'fallback',
      locationName: 'Default Location',
      latitude: 40.7128,
      longitude: -74.0060,
      metadata: {
        generatedAt: new Date().toISOString(),
        isFallback: true,
        daysOffset,
        hourOfDay,
      },
    };
    
    try {
      // Save to database
      const [savedWeather] = await db.insert(weatherData).values(fallbackData).returning();
      return fallbackData;
    } catch (error) {
      console.error('Error saving fallback weather data:', error);
      return fallbackData;
    }
  }

  // Map OpenWeatherMap weather conditions to our enum
  private mapWeatherCondition(condition: string): string {
    // Map the OpenWeatherMap condition to our enum values
    const mapping: Record<string, string> = {
      'Clear': 'clear',
      'Clouds': 'clouds',
      'Rain': 'rain',
      'Drizzle': 'drizzle',
      'Thunderstorm': 'thunderstorm',
      'Snow': 'snow',
      'Mist': 'mist',
      'Smoke': 'smoke',
      'Haze': 'haze',
      'Dust': 'dust',
      'Fog': 'fog',
      'Sand': 'dust',
      'Ash': 'smoke',
      'Squall': 'rain',
      'Tornado': 'tornado'
    };
    
    return mapping[condition] || 'clear';
  }
  
  // Helper function to calculate solar radiation based on weather
  calculateSolarRadiation(weatherData: any): number {
    // In a real implementation, this would use more sophisticated models
    // Such as the Bird Clear Sky Model or similar
    
    // For now, use a simplified approach based on cloud cover and time of day
    const cloudCover = weatherData.cloudCover || 0;
    const clearSkyFactor = 1 - (cloudCover / 100);
    
    // Time of day factor (0 at night, max at noon)
    let timeOfDayFactor = 0;
    if (weatherData.sunriseTime && weatherData.sunsetTime) {
      const currentTime = weatherData.forecastTime || weatherData.timestamp || new Date();
      const sunriseTime = new Date(weatherData.sunriseTime);
      const sunsetTime = new Date(weatherData.sunsetTime);
      
      // If it's nighttime, no solar radiation
      if (currentTime < sunriseTime || currentTime > sunsetTime) {
        return 0;
      }
      
      // Calculate time of day factor (max at solar noon)
      const dayDuration = sunsetTime.getTime() - sunriseTime.getTime();
      const timeSinceSunrise = currentTime.getTime() - sunriseTime.getTime();
      const dayProgress = timeSinceSunrise / dayDuration;
      
      // Peak at solar noon (around 0.5)
      timeOfDayFactor = 1 - Math.abs(dayProgress - 0.5) * 2;
    }
    
    // Base max radiation (W/m²) - peak radiation on a clear day
    const maxRadiation = 1000;
    
    // Calculate estimated radiation
    const radiation = maxRadiation * clearSkyFactor * timeOfDayFactor;
    return Math.max(0, radiation);
  }
  
  // Use weather data to adjust PV production forecasts
  adjustPvForecast(baseProduction: number, weatherData: any): number {
    // In a real implementation, this would use more sophisticated models
    // For now, use a simplified approach based on cloud cover
    const cloudCover = weatherData.cloudCover || 0;
    const clearSkyFactor = 1 - (cloudCover / 100);
    
    // Calculate a weather adjustment factor
    let weatherFactor = clearSkyFactor;
    
    // If it's raining or snowing, reduce even more
    if (
      weatherData.condition === 'rain' || 
      weatherData.condition === 'drizzle' || 
      weatherData.condition === 'thunderstorm' || 
      weatherData.condition === 'snow'
    ) {
      weatherFactor *= 0.7;
    }
    
    // If it's foggy/misty/hazy, also reduce
    if (
      weatherData.condition === 'fog' || 
      weatherData.condition === 'mist' || 
      weatherData.condition === 'haze'
    ) {
      weatherFactor *= 0.8;
    }
    
    // Check if it's daytime (simplified)
    let isDaytime = true;
    if (weatherData.sunriseTime && weatherData.sunsetTime) {
      const currentTime = weatherData.forecastTime || weatherData.timestamp || new Date();
      const sunriseTime = new Date(weatherData.sunriseTime);
      const sunsetTime = new Date(weatherData.sunsetTime);
      
      isDaytime = currentTime >= sunriseTime && currentTime <= sunsetTime;
    }
    
    // If it's nighttime, no production
    if (!isDaytime) {
      return 0;
    }
    
    // Adjust the base production using the weather factor
    return baseProduction * weatherFactor;
  }
}

export const weatherService = new WeatherService();