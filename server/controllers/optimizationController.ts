import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertOptimizationSettingsSchema, optimizationModeEnum } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Optimization presets for one-click wizard
const OPTIMIZATION_PRESETS = {
  cost_saving: {
    mode: 'cost_saving',
    peakShavingEnabled: true,
    peakShavingTarget: 5,
    selfConsumptionEnabled: true,
    batteryArbitrageEnabled: true,
    v2gEnabled: false,
    vppEnabled: false,
    p2pEnabled: false,
    demandResponseEnabled: true,
    aiRecommendationsEnabled: true,
    schedules: {
      batteryCharging: [
        { startTime: '01:00', endTime: '06:00', priority: 'high' },
        { startTime: '10:00', endTime: '14:00', priority: 'medium' }
      ],
      evCharging: [
        { startTime: '02:00', endTime: '06:00', priority: 'high' }
      ]
    }
  },
  self_sufficiency: {
    mode: 'self_sufficiency',
    peakShavingEnabled: false,
    peakShavingTarget: null,
    selfConsumptionEnabled: true,
    batteryArbitrageEnabled: false,
    v2gEnabled: false,
    vppEnabled: false,
    p2pEnabled: false,
    demandResponseEnabled: false,
    aiRecommendationsEnabled: true,
    schedules: {
      batteryCharging: [
        { startTime: '10:00', endTime: '15:00', priority: 'high' }
      ],
      evCharging: [
        { startTime: '10:00', endTime: '14:00', priority: 'high' }
      ]
    }
  },
  peak_shaving: {
    mode: 'peak_shaving',
    peakShavingEnabled: true,
    peakShavingTarget: 4,
    selfConsumptionEnabled: true,
    batteryArbitrageEnabled: false,
    v2gEnabled: false,
    vppEnabled: false,
    p2pEnabled: false,
    demandResponseEnabled: true,
    aiRecommendationsEnabled: true,
    schedules: {
      batteryDischarging: [
        { startTime: '17:00', endTime: '21:00', priority: 'high' }
      ],
      evCharging: [
        { startTime: '01:00', endTime: '05:00', priority: 'high' }
      ]
    }
  },
  carbon_reduction: {
    mode: 'carbon_reduction',
    peakShavingEnabled: false,
    peakShavingTarget: null,
    selfConsumptionEnabled: true,
    batteryArbitrageEnabled: false,
    v2gEnabled: true,
    vppEnabled: false,
    p2pEnabled: false,
    demandResponseEnabled: true,
    aiRecommendationsEnabled: true,
    schedules: {
      batteryCharging: [
        { startTime: '10:00', endTime: '16:00', priority: 'high' }
      ],
      evCharging: [
        { startTime: '10:00', endTime: '15:00', priority: 'high' }
      ]
    }
  },
  grid_relief: {
    mode: 'grid_relief',
    peakShavingEnabled: true,
    peakShavingTarget: 3,
    selfConsumptionEnabled: true,
    batteryArbitrageEnabled: false,
    v2gEnabled: true,
    vppEnabled: true,
    p2pEnabled: true,
    demandResponseEnabled: true,
    aiRecommendationsEnabled: true,
    schedules: {
      batteryDischarging: [
        { startTime: '17:00', endTime: '22:00', priority: 'high' }
      ],
      evCharging: [
        { startTime: '01:00', endTime: '06:00', priority: 'high' }
      ]
    }
  }
};

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

/**
 * Apply an optimization preset to a site using the one-click wizard
 * This endpoint allows users to quickly apply predefined optimization settings
 */
export const applyOptimizationPreset = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    const { presetMode, deviceConfiguration } = req.body;
    
    if (isNaN(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }
    
    // Check if preset exists
    if (!presetMode || !Object.keys(OPTIMIZATION_PRESETS).includes(presetMode)) {
      return res.status(400).json({ 
        message: 'Invalid optimization preset',
        availablePresets: Object.keys(OPTIMIZATION_PRESETS)
      });
    }
    
    // Get the preset configuration
    const presetConfig = OPTIMIZATION_PRESETS[presetMode as keyof typeof OPTIMIZATION_PRESETS];
    
    // Get existing settings or create new ones
    let existingSettings = await storage.getOptimizationSettings(siteId);
    
    if (existingSettings) {
      // Update existing settings with preset values
      const updatedSettings = await storage.updateOptimizationSettings(existingSettings.id, {
        ...presetConfig,
        // Customize based on device configuration if provided
        ...(deviceConfiguration && { deviceConfiguration }),
      });
      
      res.json({
        success: true,
        message: `Optimization settings updated to ${presetMode} mode`,
        settings: updatedSettings
      });
    } else {
      // Create new settings if they don't exist
      const newSettings = await storage.createOptimizationSettings({
        siteId,
        ...presetConfig,
        // Customize based on device configuration if provided
        ...(deviceConfiguration && { deviceConfiguration }),
      });
      
      res.status(201).json({
        success: true,
        message: `Optimization settings created with ${presetMode} mode`,
        settings: newSettings
      });
    }
    
    // Log the optimization mode change
    console.log(`Site ${siteId} optimization settings changed to ${presetMode} mode`);
  } catch (error: any) {
    console.error('Error applying optimization preset:', error);
    res.status(500).json({ 
      message: 'Failed to apply optimization preset',
      error: error.message || String(error)
    });
  }
};

/**
 * Get available optimization presets for the wizard
 */
export const getOptimizationPresets = async (_req: Request, res: Response) => {
  try {
    const presets = Object.entries(OPTIMIZATION_PRESETS).map(([key, preset]) => ({
      id: key,
      name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: getPresetDescription(key as keyof typeof OPTIMIZATION_PRESETS),
      ...preset
    }));
    
    res.json(presets);
  } catch (error: any) {
    console.error('Error fetching optimization presets:', error);
    res.status(500).json({ 
      message: 'Failed to fetch optimization presets',
      error: error.message || String(error)
    });
  }
};

/**
 * Helper function to get preset descriptions
 */
function getPresetDescription(preset: keyof typeof OPTIMIZATION_PRESETS): string {
  const descriptions = {
    cost_saving: "Minimize energy costs by charging during off-peak hours and using battery for peak times",
    self_sufficiency: "Maximize use of your own generated energy to reduce grid dependence",
    peak_shaving: "Reduce peak demand charges by limiting maximum power consumption",
    carbon_reduction: "Optimize for lowest carbon footprint by prioritizing renewable energy",
    grid_relief: "Support grid stability by providing flexibility and responding to grid needs"
  };
  
  return descriptions[preset] || "Optimize your energy usage";
}
