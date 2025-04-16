import { Request, Response } from 'express';
import { db } from '../db';
import { users, sites, devices, optimizationSettings, tariffs } from '@shared/schema';
import { sql } from 'drizzle-orm';
import * as setupController from './setupController';

/**
 * Initialize the Energy Management System with a complete installation
 * - Creates admin user if needed
 * - Sets up demo data if needed
 * - Can be called at any time and is safe to call multiple times
 */
export const initSystem = async (req: Request, res: Response) => {
  try {
    // Check if we're already initialized
    const existingUsers = await db.select({ 
      count: sql<string>`count(*)` 
    }).from(users);
    const userCount = parseInt(existingUsers[0].count);
    
    const existingSites = await db.select({ 
      count: sql<string>`count(*)` 
    }).from(sites);
    const siteCount = parseInt(existingSites[0].count);
    
    // If we already have users and sites, we're initialized
    if (userCount > 0 && siteCount > 0) {
      return res.status(200).json({
        message: 'System already initialized',
        status: 'initialized',
        counts: {
          users: userCount,
          sites: siteCount
        }
      });
    }
    
    // Otherwise, run the setup process
    // Create admin user if needed
    if (userCount === 0) {
      await setupController.createDemoUser(req, {} as Response);
    }
    
    // Create demo data if needed (will create admin user too)
    if (siteCount === 0) {
      await setupController.createDemoData(req, {} as Response);
    }
    
    // Count everything now
    const updatedUsers = await db.select({ 
      count: sql<string>`count(*)` 
    }).from(users);
    
    const updatedSites = await db.select({ 
      count: sql<string>`count(*)` 
    }).from(sites);
    
    const deviceCount = await db.select({ 
      count: sql<string>`count(*)`
    }).from(devices);
    
    const settingsCount = await db.select({ 
      count: sql<string>`count(*)`
    }).from(optimizationSettings);
    
    const tariffCount = await db.select({ 
      count: sql<string>`count(*)`
    }).from(tariffs);
    
    return res.status(200).json({
      message: 'System initialized successfully',
      status: 'initialized',
      counts: {
        users: parseInt(updatedUsers[0].count),
        sites: parseInt(updatedSites[0].count),
        devices: parseInt(deviceCount[0].count),
        optimizationSettings: parseInt(settingsCount[0].count),
        tariffs: parseInt(tariffCount[0].count)
      }
    });
  } catch (error: any) {
    console.error('Error initializing system:', error);
    res.status(500).json({ message: 'Failed to initialize system', error: error?.message || 'Unknown error' });
  }
};