import { Request, Response } from 'express';
import { getReportGeneratorService, ReportType, ReportFormat, ReportTimePeriod } from '../services/reportGeneratorService';

const reportGeneratorService = getReportGeneratorService();

/**
 * Generate a report
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
  try {
    const { 
      siteId, 
      reportType, 
      format, 
      timePeriod, 
      startDate, 
      endDate 
    } = req.body;

    // Validate input parameters
    if (!siteId || !reportType || !format || !timePeriod) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Validate report type
    if (!Object.values(ReportType).includes(reportType as ReportType)) {
      res.status(400).json({ error: 'Invalid report type' });
      return;
    }

    // Validate format
    if (!Object.values(ReportFormat).includes(format as ReportFormat)) {
      res.status(400).json({ error: 'Invalid report format' });
      return;
    }

    // Validate time period
    if (!Object.values(ReportTimePeriod).includes(timePeriod as ReportTimePeriod)) {
      res.status(400).json({ error: 'Invalid time period' });
      return;
    }

    // Parse dates if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (timePeriod === ReportTimePeriod.CUSTOM) {
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start and end dates required for custom time period' });
        return;
      }

      parsedStartDate = new Date(startDate);
      parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      if (parsedEndDate < parsedStartDate) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
      }
    }

    // Generate the report
    const reportBuffer = await reportGeneratorService.generateReport(
      Number(siteId),
      reportType as ReportType,
      format as ReportFormat,
      timePeriod as ReportTimePeriod,
      parsedStartDate,
      parsedEndDate
    );

    // Set the appropriate content type and filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const fileExtension = format === ReportFormat.PDF ? 'pdf' : 'xlsx';
    const filename = `${reportType}_${siteId}_${timestamp}.${fileExtension}`;
    const contentType = format === ReportFormat.PDF 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(reportBuffer);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Get available report types
 */
export function getReportTypes(req: Request, res: Response): void {
  try {
    const reportTypes = Object.values(ReportType).map(type => ({
      id: type,
      name: formatReportTypeName(type),
      description: getReportTypeDescription(type)
    }));

    res.json(reportTypes);
  } catch (error) {
    console.error('Error getting report types:', error);
    res.status(500).json({ error: 'Failed to get report types' });
  }
}

/**
 * Get available report formats
 */
export function getReportFormats(req: Request, res: Response): void {
  try {
    const reportFormats = Object.values(ReportFormat).map(format => ({
      id: format,
      name: formatReportFormatName(format),
      description: getReportFormatDescription(format)
    }));

    res.json(reportFormats);
  } catch (error) {
    console.error('Error getting report formats:', error);
    res.status(500).json({ error: 'Failed to get report formats' });
  }
}

/**
 * Get available time periods
 */
export function getTimePeriods(req: Request, res: Response): void {
  try {
    const timePeriods = Object.values(ReportTimePeriod).map(period => ({
      id: period,
      name: formatTimePeriodName(period),
      description: getTimePeriodDescription(period)
    }));

    res.json(timePeriods);
  } catch (error) {
    console.error('Error getting time periods:', error);
    res.status(500).json({ error: 'Failed to get time periods' });
  }
}

/**
 * Format report type name for display
 */
function formatReportTypeName(reportType: ReportType): string {
  switch (reportType) {
    case ReportType.DEVICE_PERFORMANCE:
      return 'Device Performance';
    case ReportType.ENERGY_CONSUMPTION:
      return 'Energy Consumption';
    case ReportType.ENERGY_PRODUCTION:
      return 'Energy Production';
    case ReportType.BATTERY_ARBITRAGE:
      return 'Battery Arbitrage';
    case ReportType.BILL_SAVINGS:
      return 'Bill Savings';
    case ReportType.CARBON_REDUCTION:
      return 'Carbon Reduction';
    case ReportType.MAINTENANCE:
      return 'Maintenance';
    default:
      return reportType;
  }
}

/**
 * Get report type description
 */
function getReportTypeDescription(reportType: ReportType): string {
  switch (reportType) {
    case ReportType.DEVICE_PERFORMANCE:
      return 'Performance metrics for all devices including uptime, efficiency, and issues';
    case ReportType.ENERGY_CONSUMPTION:
      return 'Energy consumption patterns, costs, and usage trends';
    case ReportType.ENERGY_PRODUCTION:
      return 'Energy production from renewable sources like solar PV';
    case ReportType.BATTERY_ARBITRAGE:
      return 'Battery arbitrage strategies, performance, and savings';
    case ReportType.BILL_SAVINGS:
      return 'Comprehensive analysis of all bill savings from energy management';
    case ReportType.CARBON_REDUCTION:
      return 'Carbon emissions reduction from renewable generation and optimization';
    case ReportType.MAINTENANCE:
      return 'Maintenance records, costs, and scheduled maintenance';
    default:
      return 'No description available';
  }
}

/**
 * Format report format name for display
 */
function formatReportFormatName(format: ReportFormat): string {
  switch (format) {
    case ReportFormat.PDF:
      return 'PDF Document';
    case ReportFormat.EXCEL:
      return 'Excel Spreadsheet';
    default:
      return format;
  }
}

/**
 * Get report format description
 */
function getReportFormatDescription(format: ReportFormat): string {
  switch (format) {
    case ReportFormat.PDF:
      return 'Portable Document Format, ideal for viewing and sharing';
    case ReportFormat.EXCEL:
      return 'Microsoft Excel format, ideal for further data analysis';
    default:
      return 'No description available';
  }
}

/**
 * Format time period name for display
 */
function formatTimePeriodName(period: ReportTimePeriod): string {
  switch (period) {
    case ReportTimePeriod.DAY:
      return 'Day';
    case ReportTimePeriod.WEEK:
      return 'Week';
    case ReportTimePeriod.MONTH:
      return 'Month';
    case ReportTimePeriod.QUARTER:
      return 'Quarter';
    case ReportTimePeriod.YEAR:
      return 'Year';
    case ReportTimePeriod.CUSTOM:
      return 'Custom Date Range';
    default:
      return period;
  }
}

/**
 * Get time period description
 */
function getTimePeriodDescription(period: ReportTimePeriod): string {
  switch (period) {
    case ReportTimePeriod.DAY:
      return 'Data for the current day';
    case ReportTimePeriod.WEEK:
      return 'Data for the past 7 days';
    case ReportTimePeriod.MONTH:
      return 'Data for the current month';
    case ReportTimePeriod.QUARTER:
      return 'Data for the current quarter';
    case ReportTimePeriod.YEAR:
      return 'Data for the current year';
    case ReportTimePeriod.CUSTOM:
      return 'Custom date range defined by start and end dates';
    default:
      return 'No description available';
  }
}