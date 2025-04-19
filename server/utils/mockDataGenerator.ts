import { v4 as uuidv4 } from 'uuid';

// Generate mock alarms for development
export function generateMockAlarms(siteId: string, type: 'current' | 'history' = 'current') {
  const deviceTypes = ['solar_inverter', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump', 'gateway'];
  const alarmTypes = ['connection_lost', 'threshold_exceeded', 'power_outage', 'efficiency_drop', 'system_error', 'firmware_update'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = type === 'current' 
    ? ['active', 'acknowledged'] 
    : ['resolved', 'acknowledged'];
  
  // Generate a random number of alarms (3-8 for current, 5-15 for history)
  const count = type === 'current' 
    ? Math.floor(Math.random() * 6) + 3 
    : Math.floor(Math.random() * 11) + 5;
  
  const alarms = [];
  
  for (let i = 0; i < count; i++) {
    // Create random device ID and name
    const deviceId = `dev-${Math.floor(Math.random() * 10) + 1}`;
    const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    let deviceName;
    
    switch (deviceType) {
      case 'solar_inverter':
        deviceName = `Solar Inverter ${deviceId.split('-')[1]}`;
        break;
      case 'battery_storage':
        deviceName = `Battery System ${deviceId.split('-')[1]}`;
        break;
      case 'ev_charger':
        deviceName = `EV Charger ${deviceId.split('-')[1]}`;
        break;
      case 'smart_meter':
        deviceName = `Smart Meter ${deviceId.split('-')[1]}`;
        break;
      case 'heat_pump':
        deviceName = `Heat Pump ${deviceId.split('-')[1]}`;
        break;
      case 'gateway':
        deviceName = `Gateway ${deviceId.split('-')[1]}`;
        break;
      default:
        deviceName = `Device ${deviceId.split('-')[1]}`;
    }
    
    // Select random alarm type and severity
    const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    // Generate message based on alarm type
    let message;
    let metricName;
    let metricValue;
    let thresholdValue;
    
    switch (alarmType) {
      case 'connection_lost':
        message = `${deviceName} connection lost. Device is not responding.`;
        break;
      case 'threshold_exceeded':
        metricName = 'temperature';
        metricValue = Math.floor(Math.random() * 30) + 70; // 70-100
        thresholdValue = 65;
        message = `${deviceName} temperature (${metricValue}°C) exceeds threshold (${thresholdValue}°C).`;
        break;
      case 'power_outage':
        message = `Power outage detected on ${deviceName}.`;
        break;
      case 'efficiency_drop':
        metricName = 'efficiency';
        metricValue = Math.floor(Math.random() * 30) + 50; // 50-80%
        thresholdValue = 85;
        message = `${deviceName} efficiency drop detected (${metricValue}%).`;
        break;
      case 'system_error':
        message = `System error detected on ${deviceName}: Error code E-${Math.floor(Math.random() * 900) + 100}.`;
        break;
      case 'firmware_update':
        message = `${deviceName} requires firmware update.`;
        break;
      default:
        message = `Unknown issue with ${deviceName}.`;
    }
    
    // Determine timestamp (newer for current, older for history)
    const now = new Date();
    let timestamp;
    
    if (type === 'current') {
      // Last 24 hours
      timestamp = new Date(now.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000));
    } else {
      // Last 30 days
      timestamp = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    }
    
    // Determine status
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Create the alarm object
    const alarm = {
      id: uuidv4(),
      deviceId,
      deviceName,
      deviceType,
      alarmType,
      severity,
      message,
      timestamp: timestamp.toISOString(),
      status,
      source: 'system',
      ...(metricName && { metricName }),
      ...(metricValue !== undefined && { metricValue }),
      ...(thresholdValue !== undefined && { thresholdValue }),
    };
    
    // Add acknowledgement/resolution info for non-active alarms
    if (status === 'acknowledged') {
      alarm.acknowledgedBy = 'System Admin';
      alarm.acknowledgedAt = new Date(timestamp.getTime() + Math.floor(Math.random() * 60 * 60 * 1000)).toISOString();
    } else if (status === 'resolved') {
      alarm.resolvedBy = 'System Admin';
      alarm.resolvedAt = new Date(timestamp.getTime() + Math.floor(Math.random() * 2 * 60 * 60 * 1000)).toISOString();
    }
    
    alarms.push(alarm);
  }
  
  return alarms;
}

// Generate mock alarm statistics
export function generateMockAlarmStats(siteId: string) {
  // Generate random counts for different statuses
  const active = Math.floor(Math.random() * 5) + 1;
  const acknowledged = Math.floor(Math.random() * 8) + 2;
  const resolved = Math.floor(Math.random() * 15) + 5;
  
  // Generate random counts for different severities
  const critical = Math.floor(Math.random() * 3);
  const high = Math.floor(Math.random() * 4) + 1;
  const medium = Math.floor(Math.random() * 6) + 2;
  const low = Math.floor(Math.random() * 8) + 3;
  
  // Create byDevice data
  const byDevice = [
    {
      deviceId: 'dev-1',
      deviceName: 'Solar Inverter 1',
      count: Math.floor(Math.random() * 5) + 1
    },
    {
      deviceId: 'dev-2',
      deviceName: 'Battery System 2',
      count: Math.floor(Math.random() * 6) + 1
    },
    {
      deviceId: 'dev-3',
      deviceName: 'EV Charger 3',
      count: Math.floor(Math.random() * 4) + 1
    },
    {
      deviceId: 'dev-4',
      deviceName: 'Smart Meter 4',
      count: Math.floor(Math.random() * 3) + 1
    }
  ];
  
  // Create byType data
  const byType = [
    {
      type: 'connection_lost',
      count: Math.floor(Math.random() * 7) + 2
    },
    {
      type: 'threshold_exceeded',
      count: Math.floor(Math.random() * 5) + 3
    },
    {
      type: 'power_outage',
      count: Math.floor(Math.random() * 3) + 1
    },
    {
      type: 'efficiency_drop',
      count: Math.floor(Math.random() * 4) + 2
    },
    {
      type: 'system_error',
      count: Math.floor(Math.random() * 6) + 1
    }
  ];
  
  // Calculate the total
  const total = active + acknowledged + resolved;
  
  return {
    total,
    active,
    acknowledged,
    resolved,
    critical,
    high,
    medium,
    low,
    byDevice,
    byType
  };
}