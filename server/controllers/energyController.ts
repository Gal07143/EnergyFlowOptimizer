import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertEnergyReadingSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export const getEnergyReadings = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const readings = await storage.getEnergyReadings(siteId, limit);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching energy readings:', error);
    res.status(500).json({ message: 'Failed to fetch energy readings' });
  }
};

export const getEnergyReadingsByTimeRange = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    const { startTime, endTime } = req.query;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    
    const startDate = new Date(startTime as string);
    const endDate = new Date(endTime as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time' });
    }
    
    const readings = await storage.getEnergyReadingsByTimeRange(siteId, startDate, endDate);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching energy readings by time range:', error);
    res.status(500).json({ message: 'Failed to fetch energy readings by time range' });
  }
};

export const getLatestEnergyReading = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    const reading = await storage.getLatestEnergyReading(siteId);
    
    if (!reading) {
      return res.status(404).json({ message: 'No energy readings found for the site' });
    }
    
    res.json(reading);
  } catch (error) {
    console.error('Error fetching latest energy reading:', error);
    res.status(500).json({ message: 'Failed to fetch latest energy reading' });
  }
};

export const createEnergyReading = async (req: Request, res: Response) => {
  try {
    const readingData = insertEnergyReadingSchema.parse(req.body);
    const reading = await storage.createEnergyReading(readingData);
    res.status(201).json(reading);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error('Error creating energy reading:', error);
    res.status(500).json({ message: 'Failed to create energy reading' });
  }
};
