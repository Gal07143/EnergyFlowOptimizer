import { Request, Response } from 'express';
import { AnalyticsType, TimeGranularity } from '../services/analyticsService';

// We'll initialize the service when needed rather than immediately to prevent circular dependencies
let analyticsService: any;

/**
 * Run analytics
 */
export async function runAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { 
      siteId, 
      analyticsType, 
      granularity, 
      startDate, 
      endDate 
    } = req.body;

    // Validate input parameters
    if (!siteId || !analyticsType || !granularity || !startDate || !endDate) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Validate analytics type
    if (!Object.values(AnalyticsType).includes(analyticsType as AnalyticsType)) {
      res.status(400).json({ error: 'Invalid analytics type' });
      return;
    }

    // Validate granularity
    if (!Object.values(TimeGranularity).includes(granularity as TimeGranularity)) {
      res.status(400).json({ error: 'Invalid time granularity' });
      return;
    }

    // Parse dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    if (parsedEndDate < parsedStartDate) {
      res.status(400).json({ error: 'End date must be after start date' });
      return;
    }

    // Lazy-load the service only when needed to avoid circular dependencies
    if (!analyticsService) {
      const { getAnalyticsService } = require('../services/analyticsService');
      analyticsService = getAnalyticsService();
    }

    // Run analytics
    const result = await analyticsService.runAnalytics(
      Number(siteId),
      analyticsType as AnalyticsType,
      granularity as TimeGranularity,
      parsedStartDate,
      parsedEndDate
    );

    res.json(result);
  } catch (error) {
    console.error('Error running analytics:', error);
    res.status(500).json({ error: 'Failed to run analytics' });
  }
}

/**
 * Get available analytics types
 */
export function getAnalyticsTypes(req: Request, res: Response): void {
  try {
    const analyticsTypes = Object.values(AnalyticsType).map(type => ({
      id: type,
      name: formatAnalyticsTypeName(type),
      description: getAnalyticsTypeDescription(type)
    }));

    res.json(analyticsTypes);
  } catch (error) {
    console.error('Error getting analytics types:', error);
    res.status(500).json({ error: 'Failed to get analytics types' });
  }
}

/**
 * Get available time granularities
 */
export function getTimeGranularities(req: Request, res: Response): void {
  try {
    const timeGranularities = Object.values(TimeGranularity).map(granularity => ({
      id: granularity,
      name: formatTimeGranularityName(granularity),
      description: getTimeGranularityDescription(granularity)
    }));

    res.json(timeGranularities);
  } catch (error) {
    console.error('Error getting time granularities:', error);
    res.status(500).json({ error: 'Failed to get time granularities' });
  }
}

/**
 * Format analytics type name for display
 */
function formatAnalyticsTypeName(analyticsType: AnalyticsType): string {
  switch (analyticsType) {
    case AnalyticsType.ENERGY_USAGE_PATTERN:
      return 'Energy Usage Pattern';
    case AnalyticsType.DEVICE_PERFORMANCE:
      return 'Device Performance';
    case AnalyticsType.COST_OPTIMIZATION:
      return 'Cost Optimization';
    case AnalyticsType.CARBON_FOOTPRINT:
      return 'Carbon Footprint';
    case AnalyticsType.PEAK_DEMAND:
      return 'Peak Demand';
    case AnalyticsType.BATTERY_UTILIZATION:
      return 'Battery Utilization';
    case AnalyticsType.SOLAR_PRODUCTION:
      return 'Solar Production';
    case AnalyticsType.FORECASTING:
      return 'Energy Forecasting';
    default:
      return analyticsType;
  }
}

/**
 * Get analytics type description
 */
function getAnalyticsTypeDescription(analyticsType: AnalyticsType): string {
  switch (analyticsType) {
    case AnalyticsType.ENERGY_USAGE_PATTERN:
      return 'Analyze energy consumption patterns and identify trends';
    case AnalyticsType.DEVICE_PERFORMANCE:
      return 'Assess device performance, efficiency, and identify issues';
    case AnalyticsType.COST_OPTIMIZATION:
      return 'Analyze energy costs and identify optimization opportunities';
    case AnalyticsType.CARBON_FOOTPRINT:
      return 'Calculate carbon emissions and identify reduction strategies';
    case AnalyticsType.PEAK_DEMAND:
      return 'Analyze peak demand patterns and identify peak shaving opportunities';
    case AnalyticsType.BATTERY_UTILIZATION:
      return 'Analyze battery usage patterns and optimization strategies';
    case AnalyticsType.SOLAR_PRODUCTION:
      return 'Analyze solar production performance and optimization strategies';
    case AnalyticsType.FORECASTING:
      return 'Forecast future energy consumption, production, and prices';
    default:
      return 'No description available';
  }
}

/**
 * Format time granularity name for display
 */
function formatTimeGranularityName(granularity: TimeGranularity): string {
  switch (granularity) {
    case TimeGranularity.HOURLY:
      return 'Hourly';
    case TimeGranularity.DAILY:
      return 'Daily';
    case TimeGranularity.WEEKLY:
      return 'Weekly';
    case TimeGranularity.MONTHLY:
      return 'Monthly';
    default:
      return granularity;
  }
}

/**
 * Get time granularity description
 */
function getTimeGranularityDescription(granularity: TimeGranularity): string {
  switch (granularity) {
    case TimeGranularity.HOURLY:
      return 'Data aggregated by hour';
    case TimeGranularity.DAILY:
      return 'Data aggregated by day';
    case TimeGranularity.WEEKLY:
      return 'Data aggregated by week';
    case TimeGranularity.MONTHLY:
      return 'Data aggregated by month';
    default:
      return 'No description available';
  }
}