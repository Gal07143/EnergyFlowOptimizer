/**
 * Consumption Pattern Controller
 * Handles API routes for machine learning consumption pattern recognition
 */

import { Request, Response } from 'express';
import { getConsumptionPatternService } from '../services/consumptionPatternService';
import { 
  CreateConsumptionPatternSchema, 
  UpdateConsumptionPatternSchema, 
  TrainPatternModelSchema,
  TimeFrameEnum,
  UsageCategoryEnum,
  EnergySourceEnum
} from '@shared/consumptionPatternSchema';

export class ConsumptionPatternController {
  /**
   * Get all consumption patterns for a site
   */
  static async getPatternsBySite(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const patterns = consumptionPatternService.getPatternsBySite(siteId);
      
      res.status(200).json(patterns);
    } catch (error) {
      console.error(`Error getting consumption patterns for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve consumption patterns' });
    }
  }
  
  /**
   * Get a specific consumption pattern by ID
   */
  static async getPatternById(req: Request, res: Response) {
    try {
      const patternId = parseInt(req.params.id);
      if (isNaN(patternId)) {
        return res.status(400).json({ error: 'Invalid pattern ID' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const pattern = consumptionPatternService.getPattern(patternId);
      
      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      
      res.status(200).json(pattern);
    } catch (error) {
      console.error(`Error getting consumption pattern ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve consumption pattern' });
    }
  }
  
  /**
   * Get patterns by timeframe for a site
   */
  static async getPatternsByTimeframe(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      const timeFrame = req.params.timeFrame;
      
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      if (!timeFrame || !['hourly', 'daily', 'weekly', 'monthly', 'seasonally'].includes(timeFrame)) {
        return res.status(400).json({ error: 'Invalid timeframe' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const patterns = consumptionPatternService.getPatternsByTimeframe(
        siteId, 
        timeFrame as 'hourly' | 'daily' | 'weekly' | 'monthly' | 'seasonally'
      );
      
      res.status(200).json(patterns);
    } catch (error) {
      console.error(`Error getting ${req.params.timeFrame} patterns for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve consumption patterns' });
    }
  }
  
  /**
   * Get patterns by usage category for a site
   */
  static async getPatternsByCategory(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      const category = req.params.category;
      
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      if (!category || !['base_load', 'peak_load', 'variable_load'].includes(category)) {
        return res.status(400).json({ error: 'Invalid usage category' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const patterns = consumptionPatternService.getPatternsByCategory(
        siteId, 
        category as 'base_load' | 'peak_load' | 'variable_load'
      );
      
      res.status(200).json(patterns);
    } catch (error) {
      console.error(`Error getting ${req.params.category} patterns for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve consumption patterns' });
    }
  }
  
  /**
   * Get patterns by energy source for a site
   */
  static async getPatternsBySource(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      const source = req.params.source;
      
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      if (!source || !['grid', 'solar', 'battery', 'ev_charger', 'heat_pump', 'other'].includes(source)) {
        return res.status(400).json({ error: 'Invalid energy source' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const patterns = consumptionPatternService.getPatternsBySource(
        siteId, 
        source as 'grid' | 'solar' | 'battery' | 'ev_charger' | 'heat_pump' | 'other'
      );
      
      res.status(200).json(patterns);
    } catch (error) {
      console.error(`Error getting ${req.params.source} patterns for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve consumption patterns' });
    }
  }
  
  /**
   * Create a new pattern recognition model
   */
  static async createPattern(req: Request, res: Response) {
    try {
      // Validate input data against schema
      const result = CreateConsumptionPatternSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid pattern data', 
          details: result.error.errors 
        });
      }
      
      const consumptionPatternService = getConsumptionPatternService();
      const pattern = await consumptionPatternService.createPattern(result.data);
      
      res.status(201).json(pattern);
    } catch (error) {
      console.error('Error creating consumption pattern:', error);
      res.status(500).json({ error: 'Failed to create consumption pattern' });
    }
  }
  
  /**
   * Update an existing pattern
   */
  static async updatePattern(req: Request, res: Response) {
    try {
      const patternId = parseInt(req.params.id);
      if (isNaN(patternId)) {
        return res.status(400).json({ error: 'Invalid pattern ID' });
      }
      
      // Validate input data against schema
      const result = UpdateConsumptionPatternSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid update data', 
          details: result.error.errors 
        });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const updatedPattern = await consumptionPatternService.updatePattern(patternId, result.data);
      
      if (!updatedPattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      
      res.status(200).json(updatedPattern);
    } catch (error) {
      console.error(`Error updating consumption pattern ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update consumption pattern' });
    }
  }
  
  /**
   * Delete a pattern
   */
  static async deletePattern(req: Request, res: Response) {
    try {
      const patternId = parseInt(req.params.id);
      if (isNaN(patternId)) {
        return res.status(400).json({ error: 'Invalid pattern ID' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const success = await consumptionPatternService.deletePattern(patternId);
      
      if (!success) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting consumption pattern ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete consumption pattern' });
    }
  }
  
  /**
   * Train or retrain a pattern model
   */
  static async trainPatternModel(req: Request, res: Response) {
    try {
      const patternId = parseInt(req.params.id);
      if (isNaN(patternId)) {
        return res.status(400).json({ error: 'Invalid pattern ID' });
      }
      
      // Validate training parameters
      const result = TrainPatternModelSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid training parameters', 
          details: result.error.errors 
        });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const updatedPattern = await consumptionPatternService.trainPatternModel(patternId, result.data);
      
      if (!updatedPattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      
      res.status(200).json(updatedPattern);
    } catch (error) {
      console.error(`Error training consumption pattern ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to train pattern model' });
    }
  }
  
  /**
   * Generate predictions based on a pattern model
   */
  static async generatePredictions(req: Request, res: Response) {
    try {
      const patternId = parseInt(req.params.id);
      if (isNaN(patternId)) {
        return res.status(400).json({ error: 'Invalid pattern ID' });
      }
      
      if (!req.query.horizon || typeof req.query.horizon !== 'string') {
        return res.status(400).json({ error: 'Horizon parameter is required' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const predictions = await consumptionPatternService.generatePredictions(
        patternId, 
        req.query.horizon, 
        {
          interval: req.query.interval as string,
          confidenceLevel: req.query.confidenceLevel ? parseFloat(req.query.confidenceLevel as string) : undefined
        }
      );
      
      if (!predictions) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      
      res.status(200).json(predictions);
    } catch (error) {
      console.error(`Error generating predictions for pattern ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to generate predictions' });
    }
  }
  
  /**
   * Detect anomalies in energy consumption
   */
  static async detectAnomalies(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      if (!req.body || !Array.isArray(req.body.readings) || req.body.readings.length === 0) {
        return res.status(400).json({ error: 'Energy readings are required' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const anomalies = await consumptionPatternService.detectAnomalies(siteId, req.body.readings);
      
      res.status(200).json(anomalies);
    } catch (error) {
      console.error(`Error detecting anomalies for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to detect anomalies' });
    }
  }
  
  /**
   * Get energy consumption features for a given timestamp
   */
  static async getConsumptionFeatures(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      if (!req.query.timestamp || typeof req.query.timestamp !== 'string') {
        return res.status(400).json({ error: 'Timestamp parameter is required' });
      }

      const consumptionPatternService = getConsumptionPatternService();
      const features = await consumptionPatternService.getConsumptionFeatures(siteId, req.query.timestamp);
      
      if (!features) {
        return res.status(404).json({ error: 'Cannot get features for the specified timestamp' });
      }
      
      res.status(200).json(features);
    } catch (error) {
      console.error(`Error getting consumption features for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to get consumption features' });
    }
  }
}