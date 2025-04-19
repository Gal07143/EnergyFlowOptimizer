import { v4 as uuidv4 } from 'uuid';

/**
 * Generate random mock alarms for a site
 * @param siteId Site ID to generate alarms for
 * @param type Type of alarms to generate (current or history)
 * @returns Array of mock alarms
 */
export function generateMockAlarms(siteId: string, type: 'current' | 'history' = 'current') {
  // Define device types that can have alarms
  const deviceTypes = [
    'solar_pv',
    'battery_storage',
    'ev_charger',
    'smart_meter',
    'heat_pump',
    'inverter',
    'gateway'
  ];
  
  // Define alarm types
  const alarmTypes = [
    'connectivity',
    'performance',
    'threshold_exceeded',
    'maintenance_needed',
    'error',
    'warning',
    'critical'
  ];
  
  // Define alarm severity levels
  const severityLevels = ['critical', 'high', 'medium', 'low'];
  
  // Generate a random number of alarms (3-12)
  const numAlarms = type === 'current' ? 
    Math.floor(Math.random() * 10) + 3 : 
    Math.floor(Math.random() * 20) + 10;
  
  const alarms = [];
  
  for (let i = 0; i < numAlarms; i++) {
    const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const deviceNumber = Math.floor(Math.random() * 5) + 1;
    const deviceId = `site-${siteId}-${deviceType}-${deviceNumber}`;
    const deviceName = `${deviceType.replace('_', ' ')} ${deviceNumber}`;
    const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];
    const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
    
    let status: 'active' | 'acknowledged' | 'resolved';
    
    if (type === 'current') {
      // Current alarms are either active or acknowledged
      status = Math.random() > 0.3 ? 'active' : 'acknowledged';
    } else {
      // History alarms are mostly resolved, some acknowledged
      status = Math.random() > 0.1 ? 'resolved' : 'acknowledged';
    }
    
    // Generate timestamps
    const now = new Date();
    const hoursAgo = type === 'current' ? 
      Math.floor(Math.random() * 24) : 
      Math.floor(Math.random() * 24 * 30); // History alarms up to 30 days old
    
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    // Generate a message based on alarm type
    let message = '';
    let source = 'system';
    let thresholdValue: number | undefined;
    let metricValue: number | undefined;
    let metricName: string | undefined;
    
    switch (alarmType) {
      case 'connectivity':
        message = `${deviceName} has lost connection for ${Math.floor(Math.random() * 120) + 5} minutes`;
        break;
      case 'performance':
        metricName = deviceType === 'solar_pv' ? 'efficiency' : 
                    deviceType === 'battery_storage' ? 'state of charge' : 
                    deviceType === 'ev_charger' ? 'charging rate' : 'power factor';
                    
        metricValue = Math.floor(Math.random() * 100);
        message = `${deviceName} ${metricName} is below expected value (${metricValue}%)`;
        break;
      case 'threshold_exceeded':
        metricName = deviceType === 'solar_pv' ? 'voltage' : 
                    deviceType === 'battery_storage' ? 'temperature' : 
                    deviceType === 'ev_charger' ? 'current' : 'active power';
                    
        metricValue = Math.floor(Math.random() * 100) + 50;
        thresholdValue = Math.floor(Math.random() * 50) + 50;
        message = `${deviceName} ${metricName} exceeded threshold (${metricValue} > ${thresholdValue})`;
        break;
      case 'maintenance_needed':
        message = `${deviceName} requires maintenance: ${Math.floor(Math.random() * 1000) + 500} hours of operation`;
        source = 'maintenance_scheduler';
        break;
      case 'error':
        message = `${deviceName} error: ${Math.random().toString(36).substring(7)}`;
        source = 'device';
        break;
      case 'warning':
        message = `${deviceName} warning: ${Math.random().toString(36).substring(7)}`;
        source = 'device';
        break;
      case 'critical':
        message = `${deviceName} critical issue: ${Math.random().toString(36).substring(7)}`;
        source = 'device';
        break;
    }
    
    // Create the alarm object
    const alarm = {
      id: uuidv4(),
      deviceId,
      deviceName,
      deviceType,
      alarmType,
      severity,
      message,
      timestamp,
      status,
      source,
      thresholdValue,
      metricValue,
      metricName,
    };
    
    // For acknowledged and resolved status, add the appropriate fields
    if (status === 'acknowledged' || status === 'resolved') {
      const ackTime = new Date(new Date(timestamp).getTime() + Math.floor(Math.random() * 2 * 60 * 60 * 1000)).toISOString();
      alarm['acknowledgedBy'] = 'System Operator';
      alarm['acknowledgedAt'] = ackTime;
      
      if (status === 'resolved') {
        const resolveTime = new Date(new Date(ackTime).getTime() + Math.floor(Math.random() * 4 * 60 * 60 * 1000)).toISOString();
        alarm['resolvedBy'] = 'System Engineer';
        alarm['resolvedAt'] = resolveTime;
      }
    }
    
    alarms.push(alarm);
  }
  
  return alarms;
}

/**
 * Generate alarm statistics for a site
 * @param siteId Site ID to generate statistics for
 * @returns Alarm statistics object
 */
export function generateMockAlarmStats(siteId: string) {
  // Generate mock statistics
  const totalAlarms = Math.floor(Math.random() * 100) + 20;
  const totalActive = Math.floor(Math.random() * 15) + 5;
  const totalAcknowledged = Math.floor(Math.random() * 10) + 3;
  const totalResolved = totalAlarms - totalActive - totalAcknowledged;
  
  return {
    siteId,
    totalAlarms,
    activeAlarms: totalActive,
    acknowledgedAlarms: totalAcknowledged,
    resolvedAlarms: totalResolved,
    bySeverity: {
      critical: Math.floor(Math.random() * 5) + 1,
      high: Math.floor(Math.random() * 10) + 5,
      medium: Math.floor(Math.random() * 20) + 10,
      low: Math.floor(Math.random() * 30) + 10
    },
    byType: {
      connectivity: Math.floor(Math.random() * 15) + 5,
      performance: Math.floor(Math.random() * 20) + 10,
      threshold_exceeded: Math.floor(Math.random() * 10) + 5,
      maintenance_needed: Math.floor(Math.random() * 10) + 3,
      error: Math.floor(Math.random() * 15) + 5,
      warning: Math.floor(Math.random() * 15) + 5,
      critical: Math.floor(Math.random() * 5) + 1
    },
    byDevice: {
      solar_pv: Math.floor(Math.random() * 20) + 5,
      battery_storage: Math.floor(Math.random() * 15) + 5,
      ev_charger: Math.floor(Math.random() * 10) + 3,
      smart_meter: Math.floor(Math.random() * 5) + 2,
      heat_pump: Math.floor(Math.random() * 10) + 3,
      inverter: Math.floor(Math.random() * 10) + 3,
      gateway: Math.floor(Math.random() * 10) + 3
    },
    timeline: generateMockTimelineData(7) // Last 7 days
  };
}

/**
 * Generate mock timeline data for alarm statistics
 * @param days Number of days to generate data for
 * @returns Array of daily alarm counts
 */
function generateMockTimelineData(days: number) {
  const timeline = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    timeline.push({
      date: date.toISOString().split('T')[0],
      total: Math.floor(Math.random() * 10) + 1,
      critical: Math.floor(Math.random() * 2),
      high: Math.floor(Math.random() * 3),
      medium: Math.floor(Math.random() * 4),
      low: Math.floor(Math.random() * 5)
    });
  }
  
  return timeline;
}