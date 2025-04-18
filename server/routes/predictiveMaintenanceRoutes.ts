/**
 * Predictive Maintenance Routes
 * 
 * API routes for the predictive maintenance system, providing endpoints
 * for health metrics, maintenance alerts, issue tracking, and AI analysis.
 */

import express from 'express';
import { z } from 'zod';
import { predictiveMaintenanceService } from '../services/predictiveMaintenance';
import { requireAuthenticated, validateParams, validateBody } from '../middleware';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// ===== Validation Schemas =====

const deviceIdParamSchema = z.object({
  deviceId: z.coerce.number()
});

const createMaintenanceScheduleSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'bi-annual', 'annual', 'custom']),
  startDate: z.coerce.date(),
  intervalDays: z.number().optional()
});

const acknowledgeAlertSchema = z.object({
  alertId: z.number()
});

const resolveIssueSchema = z.object({
  issueId: z.number(),
  resolution: z.string().min(3),
  notes: z.string().optional(),
  maintenanceCost: z.number().optional()
});

// ===== Routes =====

// Get device health metrics
router.get(
  '/devices/:deviceId/health',
  requireAuthenticated,
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const healthMetrics = await predictiveMaintenanceService.getLatestDeviceHealthMetrics(deviceId);
      
      if (!healthMetrics) {
        return res.status(404).json({ message: 'No health metrics found for this device' });
      }
      
      res.json(healthMetrics);
    } catch (error) {
      next(error);
    }
  }
);

// Get device health history
router.get(
  '/devices/:deviceId/health/history',
  requireAuthenticated,
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const limit = parseInt(req.query.limit as string) || 100;
      const healthMetrics = await predictiveMaintenanceService.getDeviceHealthMetrics(deviceId, limit);
      
      res.json(healthMetrics);
    } catch (error) {
      next(error);
    }
  }
);

// Calculate health score for a device
router.post(
  '/devices/:deviceId/health/calculate',
  requireAuthenticated,
  requireRole(['admin', 'partner_admin', 'manager']),
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const deviceType = req.body.deviceType || 'battery_storage';
      
      const healthScore = await predictiveMaintenanceService.calculateDeviceHealthScore(deviceId, deviceType);
      res.json({ deviceId, healthScore });
    } catch (error) {
      next(error);
    }
  }
);

// Get AI health analysis for a device
router.get(
  '/devices/:deviceId/health/analysis',
  requireAuthenticated,
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const analysis = await predictiveMaintenanceService.getAiHealthAnalysis(deviceId);
      
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  }
);

// Detect anomalies for a device
router.get(
  '/devices/:deviceId/anomalies',
  requireAuthenticated,
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const anomalyResult = await predictiveMaintenanceService.detectAnomalies(deviceId);
      
      res.json(anomalyResult);
    } catch (error) {
      next(error);
    }
  }
);

// Generate predictive maintenance alerts
router.post(
  '/devices/:deviceId/alerts/generate',
  requireAuthenticated,
  requireRole(['admin', 'partner_admin', 'manager']),
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const alerts = await predictiveMaintenanceService.generatePredictiveMaintenanceAlerts(deviceId);
      
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  }
);

// Get maintenance issues for a device
router.get(
  '/devices/:deviceId/issues',
  requireAuthenticated,
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const issues = await predictiveMaintenanceService.getDeviceMaintenanceIssues(deviceId);
      
      res.json(issues);
    } catch (error) {
      next(error);
    }
  }
);

// Get all maintenance issues
router.get(
  '/issues',
  requireAuthenticated,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const severity = req.query.severity as string;
      
      const issues = await predictiveMaintenanceService.getAllMaintenanceIssues(
        limit,
        offset,
        status,
        severity
      );
      
      res.json(issues);
    } catch (error) {
      next(error);
    }
  }
);

// Get maintenance alerts for a device
router.get(
  '/devices/:deviceId/alerts',
  requireAuthenticated,
  validateParams(deviceIdParamSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const alerts = await predictiveMaintenanceService.getDeviceMaintenanceAlerts(deviceId);
      
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  }
);

// Get all maintenance alerts
router.get(
  '/alerts',
  requireAuthenticated,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const severity = req.query.severity as string;
      const acknowledged = req.query.acknowledged === 'true';
      
      const alerts = await predictiveMaintenanceService.getAllMaintenanceAlerts(
        limit,
        offset,
        severity,
        acknowledged
      );
      
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  }
);

// Acknowledge an alert
router.post(
  '/alerts/acknowledge',
  requireAuthenticated,
  requireRole(['admin', 'partner_admin', 'manager']),
  validateBody(acknowledgeAlertSchema),
  async (req, res, next) => {
    try {
      const { alertId } = req.body as z.infer<typeof acknowledgeAlertSchema>;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const alert = await predictiveMaintenanceService.acknowledgeAlert(alertId, userId);
      
      if (!alert) {
        return res.status(404).json({ message: 'Alert not found' });
      }
      
      res.json(alert);
    } catch (error) {
      next(error);
    }
  }
);

// Resolve a maintenance issue
router.post(
  '/issues/resolve',
  requireAuthenticated,
  requireRole(['admin', 'partner_admin', 'manager']),
  validateBody(resolveIssueSchema),
  async (req, res, next) => {
    try {
      const { issueId, resolution, notes, maintenanceCost } = req.body as z.infer<typeof resolveIssueSchema>;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const issue = await predictiveMaintenanceService.resolveMaintenanceIssue(
        issueId,
        userId,
        resolution,
        notes,
        maintenanceCost
      );
      
      if (!issue) {
        return res.status(404).json({ message: 'Issue not found' });
      }
      
      res.json(issue);
    } catch (error) {
      next(error);
    }
  }
);

// Create a maintenance schedule
router.post(
  '/devices/:deviceId/schedules',
  requireAuthenticated,
  requireRole(['admin', 'partner_admin', 'manager']),
  validateParams(deviceIdParamSchema),
  validateBody(createMaintenanceScheduleSchema),
  async (req, res, next) => {
    try {
      const { deviceId } = req.params as unknown as z.infer<typeof deviceIdParamSchema>;
      const { title, description, frequency, startDate } = req.body as z.infer<typeof createMaintenanceScheduleSchema>;
      const userId = req.user?.id;
      
      const schedule = await predictiveMaintenanceService.createMaintenanceSchedule(
        deviceId,
        title,
        description || '',
        frequency,
        startDate,
        userId
      );
      
      res.status(201).json(schedule);
    } catch (error) {
      next(error);
    }
  }
);

// Generate a maintenance report for a site
router.get(
  '/sites/:siteId/report',
  requireAuthenticated,
  async (req, res, next) => {
    try {
      const siteId = parseInt(req.params.siteId);
      
      if (isNaN(siteId)) {
        return res.status(400).json({ message: 'Invalid site ID' });
      }
      
      const report = await predictiveMaintenanceService.generateMaintenanceReport(siteId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

export const predictiveMaintenanceRoutes = router;