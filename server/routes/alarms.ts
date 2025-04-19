import express from 'express';
import { requireAuth, requireManager } from '../middleware/auth';
import { generateMockAlarms, generateMockAlarmStats } from '../utils/mockDataGenerator';

const router = express.Router();

// Get current active alarms for a site
router.get('/sites/:siteId/alarms/current', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status } = req.query;
    
    // In a real implementation, this would fetch from the database
    const alarms = generateMockAlarms(siteId);
    
    // Filter by status if provided
    if (status && typeof status === 'string') {
      return res.json(alarms.filter(alarm => alarm.status === status));
    }
    
    return res.json(alarms);
  } catch (error) {
    console.error('Error fetching current alarms:', error);
    return res.status(500).json({ message: 'Failed to fetch alarms' });
  }
});

// Get historical alarms for a site
router.get('/sites/:siteId/alarms/history', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // In a real implementation, this would fetch from the database
    const alarms = generateMockAlarms(siteId, 'history');
    
    return res.json(alarms);
  } catch (error) {
    console.error('Error fetching alarm history:', error);
    return res.status(500).json({ message: 'Failed to fetch alarm history' });
  }
});

// Get alarm statistics for a site
router.get('/sites/:siteId/alarms/stats', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // In a real implementation, this would calculate statistics from the database
    const stats = generateMockAlarmStats(siteId);
    
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching alarm statistics:', error);
    return res.status(500).json({ message: 'Failed to fetch alarm statistics' });
  }
});

// Acknowledge an alarm
router.post('/alarms/:alarmId/acknowledge', requireAuth, async (req, res) => {
  try {
    const { alarmId } = req.params;
    
    // In a real implementation, this would update the database
    // For now, just return success
    return res.json({ 
      success: true, 
      message: 'Alarm acknowledged successfully',
      alarmId
    });
  } catch (error) {
    console.error('Error acknowledging alarm:', error);
    return res.status(500).json({ message: 'Failed to acknowledge alarm' });
  }
});

// Resolve an alarm
router.post('/alarms/:alarmId/resolve', requireAuth, async (req, res) => {
  try {
    const { alarmId } = req.params;
    
    // In a real implementation, this would update the database
    // For now, just return success
    return res.json({ 
      success: true, 
      message: 'Alarm resolved successfully',
      alarmId
    });
  } catch (error) {
    console.error('Error resolving alarm:', error);
    return res.status(500).json({ message: 'Failed to resolve alarm' });
  }
});

// Get operations summary for a site
router.get('/sites/:siteId/operations/summary', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // In a real implementation, this would fetch from the database
    // For now, return a mock operation summary
    return res.json({
      status: 'optimal',
      batteryLevel: 78,
      batteryStatus: 'charging',
      solarStatus: 'producing',
      gridStatus: 'connected',
      optimizationActive: true,
      optimizationCount: 3,
      lastOptimizationTime: '2 hours ago',
      currentPowerFlow: {
        fromSolar: 4.2,
        fromGrid: 0.8,
        toBattery: 1.5,
        toLoad: 3.2,
        toGrid: 0.3,
      },
      systemMode: 'eco',
      peakShavingActive: true,
      evCharging: true,
      heatPumpActive: false
    });
  } catch (error) {
    console.error('Error fetching operations summary:', error);
    return res.status(500).json({ message: 'Failed to fetch operations summary' });
  }
});

export default router;