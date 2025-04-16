import { Request, Response } from 'express';
import { weatherService } from '../services/weatherService';

export const weatherController = {
  // Get current weather for a site
  async getCurrentWeather(req: Request, res: Response) {
    try {
      const siteId = Number(req.params.siteId);
      
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      const weather = await weatherService.getCurrentWeather(siteId);
      
      if (!weather) {
        return res.status(404).json({ error: 'Weather data not found' });
      }
      
      return res.status(200).json(weather);
    } catch (error) {
      console.error('Error in getCurrentWeather:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch weather data',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  },
  
  // Get weather forecast for a site
  async getWeatherForecast(req: Request, res: Response) {
    try {
      const siteId = Number(req.params.siteId);
      const days = Number(req.query.days) || 5;
      
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      if (days < 1 || days > 7) {
        return res.status(400).json({ error: 'Days parameter must be between 1 and 7' });
      }
      
      const forecast = await weatherService.getWeatherForecast(siteId, days);
      
      if (!forecast || forecast.length === 0) {
        return res.status(404).json({ error: 'Weather forecast not found' });
      }
      
      return res.status(200).json(forecast);
    } catch (error) {
      console.error('Error in getWeatherForecast:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch weather forecast',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  },
  
  // Get recent weather data for a site
  async getRecentWeatherData(req: Request, res: Response) {
    try {
      const siteId = Number(req.params.siteId);
      const limit = Number(req.query.limit) || 10;
      
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      const weatherData = await weatherService.getRecentWeatherData(siteId, limit);
      
      return res.status(200).json(weatherData);
    } catch (error) {
      console.error('Error in getRecentWeatherData:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch recent weather data',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  },
  
  // Set OpenWeatherMap API key
  async setApiKey(req: Request, res: Response) {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ error: 'Invalid API key' });
      }
      
      weatherService.setApiKey(apiKey);
      
      return res.status(200).json({ 
        success: true,
        message: 'API key set successfully' 
      });
    } catch (error) {
      console.error('Error in setApiKey:', error);
      return res.status(500).json({ 
        error: 'Failed to set API key',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  },
  
  // Check if API key is available
  async checkApiKey(req: Request, res: Response) {
    try {
      const hasApiKey = weatherService.hasApiKey();
      
      return res.status(200).json({ 
        hasApiKey,
        message: hasApiKey ? 'API key is available' : 'API key is not set' 
      });
    } catch (error) {
      console.error('Error in checkApiKey:', error);
      return res.status(500).json({ 
        error: 'Failed to check API key',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};