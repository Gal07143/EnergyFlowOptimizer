import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertOptimizationSettingsSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export const getOptimizationSettings = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const settings = await storage.getOptimizationSettings(siteId);
    
    if (!settings) {
      return res.status(404).json({ message: 'Optimization settings not found' });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching optimization settings:', error);
    res.status(500).json({ message: 'Failed to fetch optimization settings' });
  }
};

export const createOptimizationSettings = async (req: Request, res: Response) => {
  try {
    const settingsData = insertOptimizationSettingsSchema.parse(req.body);
    const settings = await storage.createOptimizationSettings(settingsData);
    res.status(201).json(settings);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error('Error creating optimization settings:', error);
    res.status(500).json({ message: 'Failed to create optimization settings' });
  }
};

export const updateOptimizationSettings = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const existingSettings = await storage.getOptimizationSettings(siteId);
    
    if (!existingSettings) {
      return res.status(404).json({ message: 'Optimization settings not found' });
    }
    
    const updatedSettings = await storage.updateOptimizationSettings(existingSettings.id, req.body);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating optimization settings:', error);
    res.status(500).json({ message: 'Failed to update optimization settings' });
  }
};

export const getTariffs = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const tariffs = await storage.getTariffs(siteId);
    res.json(tariffs);
  } catch (error) {
    console.error('Error fetching tariffs:', error);
    res.status(500).json({ message: 'Failed to fetch tariffs' });
  }
};

export const getTariff = async (req: Request, res: Response) => {
  try {
    const tariffId = parseInt(req.params.id);
    
    if (isNaN(tariffId)) {
      return res.status(400).json({ message: 'Invalid tariff ID' });
    }
    
    const tariff = await storage.getTariff(tariffId);
    
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    
    res.json(tariff);
  } catch (error) {
    console.error('Error fetching tariff:', error);
    res.status(500).json({ message: 'Failed to fetch tariff' });
  }
};

export const createTariff = async (req: Request, res: Response) => {
  try {
    const tariffData = req.body;
    const tariff = await storage.createTariff(tariffData);
    res.status(201).json(tariff);
  } catch (error) {
    console.error('Error creating tariff:', error);
    res.status(500).json({ message: 'Failed to create tariff' });
  }
};

export const updateTariff = async (req: Request, res: Response) => {
  try {
    const tariffId = parseInt(req.params.id);
    
    if (isNaN(tariffId)) {
      return res.status(400).json({ message: 'Invalid tariff ID' });
    }
    
    const existingTariff = await storage.getTariff(tariffId);
    
    if (!existingTariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    
    const tariffData = req.body;
    const updatedTariff = await storage.updateTariff(tariffId, tariffData);
    res.json(updatedTariff);
  } catch (error) {
    console.error('Error updating tariff:', error);
    res.status(500).json({ message: 'Failed to update tariff' });
  }
};
