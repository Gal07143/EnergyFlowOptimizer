import { getMqttService } from './mqttService';
import { getDeviceManagementService } from './deviceManagementService';
import { broadcastDeviceReading, broadcastDeviceStatus } from './websocketService';
import { DeviceStatus } from './deviceManagementService';

// Define types for our MQTT messages
interface MqttStatusMessage {
  status: DeviceStatus;
  timestamp?: string;
  details?: string;
}

interface MqttTelemetryMessage {
  timestamp?: string;
  readings?: Record<string, any>;
  metadata?: {
    source?: string;
    [key: string]: any;
  };
}

interface MqttCommandResponse {
  command: string;
  success: boolean;
  result?: any;
  error?: string;
}

// Topic patterns for MQTT messages
const TOPIC_PATTERNS = {
  TELEMETRY: 'devices/{deviceId}/telemetry',
  STATUS: 'devices/{deviceId}/status',
  COMMAND: 'devices/{deviceId}/commands', 
  COMMAND_RESPONSE: 'devices/{deviceId}/commands/response',
};

// Initialize WebSocket publisher service
export function initWebSocketPublisher() {
  console.log('Initializing WebSocket publisher service');
  
  const mqttService = getMqttService();
  
  // Subscribe to device status updates
  mqttService.subscribe('devices/+/status', (topic: string, message: any) => {
    try {
      // Extract device ID from topic
      const deviceIdMatch = topic.match(/devices\/(\d+)\/status/);
      if (!deviceIdMatch) return;
      
      const deviceId = parseInt(deviceIdMatch[1]);
      
      // Parse message
      const statusMessage = typeof message === 'string' 
        ? JSON.parse(message) 
        : message;
      
      // Format the status update for WebSocket clients
      const statusUpdate = {
        deviceId,
        status: statusMessage.status as DeviceStatus,
        timestamp: statusMessage.timestamp || new Date().toISOString(),
        details: statusMessage.details
      };
      
      // Update device status in device registry
      const deviceService = getDeviceManagementService();
      deviceService.updateDeviceStatus(deviceId, statusMessage.status, statusMessage.details);
      
      // Broadcast status update to WebSocket clients
      broadcastDeviceStatus(deviceId, statusUpdate);
      
    } catch (error) {
      console.error('Error processing device status update:', error);
    }
  });
  
  // Subscribe to device telemetry
  mqttService.subscribe('devices/+/telemetry', async (topic, message) => {
    try {
      // Extract device ID from topic
      const deviceIdMatch = topic.match(/devices\/(\d+)\/telemetry/);
      if (!deviceIdMatch) return;
      
      const deviceId = parseInt(deviceIdMatch[1]);
      
      // Parse message
      const telemetryMessage = typeof message === 'string' 
        ? JSON.parse(message) 
        : message;
      
      // Get the device type
      const deviceService = getDeviceManagementService();
      const device = deviceService.getDevice(deviceId);
      
      if (!device) {
        console.warn(`Received telemetry for unknown device: ${deviceId}`);
        return;
      }
      
      // Format the reading for WebSocket clients based on device type and protocol
      const deviceReading = {
        deviceId,
        type: device.type,
        protocol: device.protocol,
        timestamp: telemetryMessage.timestamp || new Date().toISOString(),
        readings: telemetryMessage.readings || {},
        metadata: {
          source: telemetryMessage.metadata?.source || device.protocol,
          ...telemetryMessage.metadata
        }
      };
      
      // Broadcast telemetry to WebSocket clients
      broadcastDeviceReading(deviceId, deviceReading);
      
    } catch (error) {
      console.error('Error processing device telemetry:', error);
    }
  });
  
  // Subscribe to command responses
  mqttService.subscribe('devices/+/commands/response', async (topic, message) => {
    try {
      // Extract device ID from topic
      const deviceIdMatch = topic.match(/devices\/(\d+)\/commands\/response/);
      if (!deviceIdMatch) return;
      
      const deviceId = parseInt(deviceIdMatch[1]);
      
      // Parse message
      const responseMessage = typeof message === 'string' 
        ? JSON.parse(message) 
        : message;
      
      // Broadcast command response to WebSocket clients
      broadcastCommandExecution(
        deviceId, 
        responseMessage.command,
        {
          success: responseMessage.success,
          result: responseMessage.result,
          error: responseMessage.error
        }
      );
      
    } catch (error) {
      console.error('Error processing command response:', error);
    }
  });
  
  console.log('WebSocket publisher initialized successfully');
  return {
    // Return any methods that might be useful externally
    publishDeviceReading: (deviceId: number, reading: any) => {
      broadcastDeviceReading(deviceId, reading);
    },
    publishDeviceStatus: (deviceId: number, status: any) => {
      broadcastDeviceStatus(deviceId, status);
    }
  };
}

// Helper function to format a device topic
export function formatDeviceTopic(topicPattern: string, deviceId: number): string {
  return topicPattern.replace('{deviceId}', deviceId.toString());
}

// Export the function that will broadcast command execution results
// This is used by the websocketService but defined here to avoid circular imports
function broadcastCommandExecution(deviceId: number, command: string, result: any) {
  // Implementation is in the websocketService
  // This is just a stub to avoid circular dependencies
}