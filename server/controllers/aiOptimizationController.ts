import { Request, Response } from 'express';
import { getAIOptimizationService, initAIOptimizationService } from '../services/aiOptimizationService';
import { db } from '../db';
import { optimizationSettings } from '@shared/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// Schema for validation
const optimizeRequestSchema = z.object({
  siteId: z.number().int().positive(),
  applyResults: z.boolean().optional().default(false),
});

const optimizationSettingsSchema = z.object({
  siteId: z.number().int().positive(),
  mode: z.enum(['cost_saving', 'self_sufficiency', 'peak_shaving', 'carbon_reduction', 'battery_life']),
  priority: z.number().int().min(1).max(10),
  constraints: z.object({
    minBatterySoC: z.number().min(0).max(100).optional(),
    maxGridImport: z.number().min(0).optional(),
    evChargeBy: z.string().optional(),
    reserveCapacity: z.number().min(0).max(100).optional(),
  }).optional(),
  active: z.boolean().optional().default(true),
});

// Run an optimization for a site
export async function runOptimization(req: Request, res: Response) {
  try {
    // Validate request
    const validationResult = optimizeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid request parameters', 
        errors: validationResult.error.errors 
      });
    }

    const { siteId, applyResults } = validationResult.data;
    
    // Initialize the service if needed
    try {
      getAIOptimizationService();
    } catch {
      initAIOptimizationService();
    }

    // Run optimization
    const optimizationService = getAIOptimizationService();
    const result = await optimizationService.optimizeSite(siteId);
    
    if (!result) {
      return res.status(500).json({ 
        message: 'Failed to run optimization for site',
        siteId 
      });
    }
    
    // Apply optimization if requested
    if (applyResults) {
      await optimizationService.applyOptimization(siteId, result);
    }
    
    // Return the optimization result
    return res.status(200).json({
      message: 'Optimization completed successfully',
      result,
      appliedActions: applyResults
    });
  } catch (error) {
    console.error('Error running optimization:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
}

// Get the last optimization result for a site
export async function getLastOptimization(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId) || siteId <= 0) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Initialize the service if needed
    try {
      getAIOptimizationService();
    } catch {
      initAIOptimizationService();
    }
    
    // Get last optimization
    const optimizationService = getAIOptimizationService();
    const result = optimizationService.getLastOptimization(siteId);
    
    if (!result) {
      return res.status(404).json({ 
        message: 'No optimization results found for site',
        siteId 
      });
    }
    
    // Return the result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting last optimization:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
}

// Update optimization settings for a site
export async function updateOptimizationSettings(req: Request, res: Response) {
  try {
    // Validate request
    const validationResult = optimizationSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid optimization settings', 
        errors: validationResult.error.errors 
      });
    }

    const settings = validationResult.data;
    
    // Check if settings exist for this site
    const existingSettings = await db.select({ id: optimizationSettings.id })
      .from(optimizationSettings)
      .where(eq(optimizationSettings.siteId, settings.siteId));
    
    if (existingSettings.length > 0) {
      // Update existing settings - Drizzle maps camelCase to snake_case automatically
      await db.update(optimizationSettings)
        .set({
          mode: settings.mode,
          priority: settings.priority,
          constraints: settings.constraints || {},
          aiOptimizationEnabled: settings.active, // Map to the correct column
          updatedAt: new Date()
        })
        .where(eq(optimizationSettings.siteId, settings.siteId));
    } else {
      // Create new settings - Drizzle maps camelCase to snake_case automatically
      await db.insert(optimizationSettings)
        .values({
          siteId: settings.siteId,
          mode: settings.mode,
          priority: settings.priority,
          constraints: settings.constraints || {},
          aiOptimizationEnabled: settings.active,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }
    
    // Return success response
    return res.status(200).json({
      message: 'Optimization settings updated successfully',
      siteId: settings.siteId
    });
  } catch (error) {
    console.error('Error updating optimization settings:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
}

// Get optimization settings for a site
export async function getOptimizationSettings(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId) || siteId <= 0) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Get settings from database
    const [settings] = await db.select()
      .from(optimizationSettings)
      .where(eq(optimizationSettings.siteId, siteId));
    
    if (!settings) {
      // Return default settings if none exist
      return res.status(200).json({
        siteId,
        mode: 'cost_saving',
        priority: 5,
        constraints: {
          minBatterySoC: 20,
          reserveCapacity: 10
        },
        active: true,
        isDefault: true
      });
    }
    
    // Return the settings
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting optimization settings:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
}

// Get status information about the AI optimization service
export async function getOptimizationStatus(req: Request, res: Response) {
  try {
    // Check if we have OpenAI API key configured
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    let serviceActive = false;
    try {
      getAIOptimizationService();
      serviceActive = true;
    } catch {
      // Service not initialized yet
    }
    
    // Return status information
    return res.status(200).json({
      aiServiceActive: serviceActive,
      hasOpenAIKey: hasOpenAI,
      aiModel: hasOpenAI ? 'gpt-4o' : null,
      fallbackEnabled: true,
      status: serviceActive ? 'active' : 'inactive'
    });
  } catch (error) {
    console.error('Error getting optimization status:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
}

// Apply the last optimization for a site
export async function applyLastOptimization(req: Request, res: Response) {
  try {
    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId) || siteId <= 0) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Initialize the service if needed
    try {
      getAIOptimizationService();
    } catch {
      initAIOptimizationService();
    }
    
    // Get last optimization
    const optimizationService = getAIOptimizationService();
    const lastResult = optimizationService.getLastOptimization(siteId);
    
    if (!lastResult) {
      return res.status(404).json({ 
        message: 'No optimization results found for site',
        siteId 
      });
    }
    
    // Apply the optimization
    const applied = await optimizationService.applyOptimization(siteId, lastResult);
    
    if (!applied) {
      return res.status(500).json({ 
        message: 'Failed to apply optimization',
        siteId 
      });
    }
    
    // Return success
    return res.status(200).json({
      message: 'Optimization applied successfully',
      result: lastResult,
      appliedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error applying optimization:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
}

// Debug function to test AI response generation
export async function testOptimizationAI(req: Request, res: Response) {
  try {
    // Only available in development
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'This endpoint is only available in development mode' });
    }

    const siteId = parseInt(req.params.siteId);
    
    if (isNaN(siteId) || siteId <= 0) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Initialize the service if needed
    try {
      getAIOptimizationService();
    } catch {
      initAIOptimizationService();
    }
    
    // Run test optimization
    const optimizationService = getAIOptimizationService();
    const result = await optimizationService.optimizeSite(siteId);
    
    if (!result) {
      return res.status(500).json({ 
        message: 'Failed to run optimization for site',
        siteId 
      });
    }
    
    // Return the optimization result with additional debug info
    return res.status(200).json({
      message: 'Test optimization completed',
      result,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      mode: process.env.OPENAI_API_KEY ? 'ai' : 'rule-based',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing optimization AI:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
}