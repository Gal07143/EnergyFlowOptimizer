import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertOptimizationSettingsSchema, optimizationModeEnum } from '@shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Optimization presets for one-click wizard with enhanced configurations
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
 * with additional customization options for advanced users
 */
export const applyOptimizationPreset = async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.siteId);
    const { 
      presetMode, 
      deviceConfiguration, 
      customizationOptions,
      scheduleAdjustments,
      priorityDevices,
      savingsGoal
    } = req.body;
    
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
    
    // Get site devices for optimization customization
    const siteDevices = await storage.getDevicesBySite(siteId);
    const hasBattery = siteDevices.some(device => device.type === 'battery');
    const hasEV = siteDevices.some(device => device.type === 'ev_charger');
    const hasSolar = siteDevices.some(device => device.type === 'solar_inverter');
    
    // Apply device-specific adjustments
    let adjustedConfig = { ...presetConfig };
    
    // Disable battery features if no battery
    if (!hasBattery) {
      adjustedConfig = {
        ...adjustedConfig,
        batteryArbitrageEnabled: false,
        schedules: {
          ...adjustedConfig.schedules,
          batteryCharging: [],
          batteryDischarging: []
        }
      };
    }
    
    // Disable EV features if no EV charger
    if (!hasEV) {
      adjustedConfig = {
        ...adjustedConfig,
        v2gEnabled: false,
        schedules: {
          ...adjustedConfig.schedules,
          evCharging: []
        }
      };
    }
    
    // Apply custom schedule adjustments if provided
    if (scheduleAdjustments) {
      adjustedConfig = {
        ...adjustedConfig,
        schedules: {
          ...adjustedConfig.schedules,
          ...scheduleAdjustments
        }
      };
    }
    
    // Apply user customization options
    if (customizationOptions) {
      adjustedConfig = {
        ...adjustedConfig,
        ...customizationOptions
      };
    }
    
    // Apply priority devices settings
    if (priorityDevices && priorityDevices.length > 0) {
      adjustedConfig.priorityDevices = priorityDevices;
    }
    
    // Apply savings goal if provided
    if (savingsGoal && !isNaN(Number(savingsGoal))) {
      adjustedConfig.savingsGoal = Number(savingsGoal);
    }
    
    // Get existing settings or create new ones
    let existingSettings = await storage.getOptimizationSettings(siteId);
    
    let resultSettings;
    if (existingSettings) {
      // Update existing settings with adjusted preset values
      resultSettings = await storage.updateOptimizationSettings(existingSettings.id, {
        ...adjustedConfig,
        // Customize based on device configuration if provided
        ...(deviceConfiguration && { deviceConfiguration }),
      });
      
      res.json({
        success: true,
        message: `Optimization settings updated to ${presetMode} mode with custom adjustments`,
        settings: resultSettings,
        deviceSummary: {
          hasBattery,
          hasEV,
          hasSolar
        }
      });
    } else {
      // Create new settings if they don't exist
      resultSettings = await storage.createOptimizationSettings({
        siteId,
        ...adjustedConfig,
        // Customize based on device configuration if provided
        ...(deviceConfiguration && { deviceConfiguration }),
      });
      
      res.status(201).json({
        success: true,
        message: `Optimization settings created with ${presetMode} mode and custom adjustments`,
        settings: resultSettings,
        deviceSummary: {
          hasBattery,
          hasEV,
          hasSolar
        }
      });
    }
    
    // Log the optimization mode change with detailed information
    console.log(`Site ${siteId} optimization settings changed to ${presetMode} mode with custom adjustments`);
    console.log(`Devices available - Battery: ${hasBattery}, EV: ${hasEV}, Solar: ${hasSolar}`);
    
    // Return a detailed response with insights
    return;
  } catch (error: any) {
    console.error('Error applying optimization preset:', error);
    res.status(500).json({ 
      message: 'Failed to apply optimization preset',
      error: error.message || String(error)
    });
  }
};

/**
 * Get available optimization presets for the wizard with enhanced details
 */
export const getOptimizationPresets = async (req: Request, res: Response) => {
  try {
    // Check if we should include device-specific information
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : null;
    const includeDeviceDetails = req.query.includeDeviceDetails === 'true';
    
    // Get device information if requested
    let deviceSummary = null;
    if (siteId && includeDeviceDetails) {
      try {
        const devices = await storage.getDevicesBySite(siteId);
        deviceSummary = {
          hasBattery: devices.some(device => device.type === 'battery'),
          hasEV: devices.some(device => device.type === 'ev_charger'),
          hasSolar: devices.some(device => device.type === 'solar_inverter'),
          hasHeatPump: devices.some(device => device.type === 'heat_pump'),
          deviceCount: devices.length,
          deviceTypes: [...new Set(devices.map(device => device.type))]
        };
      } catch (err) {
        console.warn('Could not fetch device information for site', siteId, err);
      }
    }
    
    // Get existing optimization settings if available
    let existingSettings = null;
    if (siteId) {
      try {
        existingSettings = await storage.getOptimizationSettings(siteId);
      } catch (err) {
        console.warn('Could not fetch existing optimization settings for site', siteId, err);
      }
    }
    
    // Enhanced preset information with benefits and requirements
    const presetsWithEnhancedInfo = Object.entries(OPTIMIZATION_PRESETS).map(([key, preset]) => {
      const presetKey = key as keyof typeof OPTIMIZATION_PRESETS;
      
      // Calculate compatibility score if device information is available
      let compatibilityScore = 1; // Default: full compatibility
      let compatibilityNotes = [];
      
      if (deviceSummary) {
        // Check battery requirements
        if ((preset.batteryArbitrageEnabled || preset.schedules?.batteryCharging?.length) && !deviceSummary.hasBattery) {
          compatibilityScore = 0.5; // Partial compatibility
          compatibilityNotes.push('Battery recommended for full benefits');
        }
        
        // Check EV requirements
        if (preset.v2gEnabled && !deviceSummary.hasEV) {
          compatibilityScore = Math.min(compatibilityScore, 0.5);
          compatibilityNotes.push('EV charger recommended for full benefits');
        }
        
        // Check PV requirements for self-consumption
        if (preset.selfConsumptionEnabled && !deviceSummary.hasSolar) {
          compatibilityScore = Math.min(compatibilityScore, 0.6);
          compatibilityNotes.push('Solar PV recommended for optimal performance');
        }
      }
      
      // Check if this preset is currently active
      const isActive = existingSettings?.mode === presetKey;
      
      return {
        id: presetKey,
        name: presetKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        description: getPresetDescription(presetKey),
        benefits: getPresetBenefits(presetKey),
        requirements: getPresetRequirements(presetKey),
        estimatedSavings: getEstimatedSavings(presetKey),
        compatibilityScore: deviceSummary ? compatibilityScore : null,
        compatibilityNotes: compatibilityNotes.length > 0 ? compatibilityNotes : null,
        isCurrentlyActive: isActive,
        mainFeatures: getMainFeatures(presetKey),
        iconType: getPresetIconType(presetKey),
        ...preset
      };
    });
    
    res.json({
      presets: presetsWithEnhancedInfo,
      deviceSummary,
      currentSettings: existingSettings
    });
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

/**
 * Helper function to get preset benefits
 */
function getPresetBenefits(preset: keyof typeof OPTIMIZATION_PRESETS): string[] {
  const benefitsMap = {
    cost_saving: [
      "Reduced electricity bills",
      "Automatic charge/discharge at optimal times",
      "Lower energy costs during peak price periods",
      "Minimized grid import during expensive tariff periods",
      "Returns on investment through energy arbitrage"
    ],
    self_sufficiency: [
      "Maximized use of self-generated energy",
      "Reduced reliance on utility grid",
      "Higher energy independence",
      "Minimized energy export during peak production",
      "Protection against utility price increases"
    ],
    peak_shaving: [
      "Significant demand charge reductions",
      "Lower maximum peak power consumption",
      "Smoother power consumption profile",
      "Predictable energy costs",
      "Prevention of power threshold violations"
    ],
    carbon_reduction: [
      "Minimized carbon footprint of energy usage",
      "Optimized consumption of green energy",
      "Reduced fossil fuel reliance",
      "Environmental impact tracking",
      "Support for sustainability goals"
    ],
    grid_relief: [
      "Support for local grid stability",
      "Possible participation in grid services",
      "Readiness for demand response programs",
      "Protection against grid outages",
      "Reduced load during grid stress periods"
    ]
  };
  
  return benefitsMap[preset] || ["Optimized energy management", "Improved efficiency", "Better control of energy assets"];
}

/**
 * Helper function to get preset requirements
 */
function getPresetRequirements(preset: keyof typeof OPTIMIZATION_PRESETS): string[] {
  const requirementsMap = {
    cost_saving: [
      "Time-of-use or dynamic electricity tariff",
      "Battery storage (recommended)",
      "Smart meter with consumption data",
      "Internet connection for tariff data"
    ],
    self_sufficiency: [
      "Solar PV or other generation",
      "Battery storage (recommended)",
      "Smart meter with generation/consumption data"
    ],
    peak_shaving: [
      "Smart meter with power measurements",
      "Battery storage or controllable loads",
      "Historical consumption data",
      "Tariff with demand charges"
    ],
    carbon_reduction: [
      "Access to grid carbon intensity data",
      "Smart meter with consumption data",
      "Controllable loads or storage devices"
    ],
    grid_relief: [
      "Smart meter with bidirectional capabilities",
      "Battery storage system",
      "Grid-connected inverter",
      "Participation agreement with utility (optional)"
    ]
  };
  
  return requirementsMap[preset] || ["Smart meter", "Internet connection"];
}

/**
 * Helper function to get estimated savings
 */
function getEstimatedSavings(preset: keyof typeof OPTIMIZATION_PRESETS): { percentage: number, note: string } {
  const savingsMap = {
    cost_saving: {
      percentage: 30,
      note: "Up to 30% reduction in electricity costs with time-of-use tariff"
    },
    self_sufficiency: {
      percentage: 80,
      note: "Up to 80% grid independence with adequate solar and battery capacity"
    },
    peak_shaving: {
      percentage: 50,
      note: "Up to 50% reduction in demand charges with sufficient battery capacity"
    },
    carbon_reduction: {
      percentage: 60,
      note: "Up to 60% reduction in carbon footprint with renewable energy sources"
    },
    grid_relief: {
      percentage: 25,
      note: "Up to 25% additional value through grid service participation"
    }
  };
  
  return savingsMap[preset] || { percentage: 20, note: "Estimated 20% improvement in energy efficiency" };
}

/**
 * Helper function to get main features
 */
function getMainFeatures(preset: keyof typeof OPTIMIZATION_PRESETS): string[] {
  const featuresMap = {
    cost_saving: [
      "Price-based battery charging/discharging",
      "Smart EV charging during low-price periods",
      "Load shifting to low-price periods",
      "Tariff optimization",
      "Energy arbitrage"
    ],
    self_sufficiency: [
      "Maximum solar self-consumption",
      "Battery charging from excess solar",
      "Minimal grid import",
      "Grid export only after battery is full",
      "Prioritized local energy use"
    ],
    peak_shaving: [
      "Power consumption capping",
      "Automatic peak detection",
      "Demand prediction",
      "Grid import limiting",
      "Battery discharge during peak periods"
    ],
    carbon_reduction: [
      "Carbon intensity monitoring",
      "Clean energy prioritization",
      "Carbon-aware scheduling",
      "Emission reduction tracking",
      "Green energy maximization"
    ],
    grid_relief: [
      "Grid frequency response",
      "Load management during grid stress",
      "Demand response readiness",
      "Virtual power plant integration",
      "Flexible power flows"
    ]
  };
  
  return featuresMap[preset] || ["Energy optimization", "Smart scheduling", "Control automation"];
}

/**
 * Helper function to get preset icon type
 */
function getPresetIconType(preset: keyof typeof OPTIMIZATION_PRESETS): string {
  const iconMap = {
    cost_saving: "dollar",
    self_sufficiency: "sun",
    peak_shaving: "bar-chart",
    carbon_reduction: "leaf",
    grid_relief: "zap"
  };
  
  return iconMap[preset] || "settings";
}
