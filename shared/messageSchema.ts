import { z } from 'zod';

// Quality of Service levels
export enum QoSLevel {
  AT_MOST_ONCE = 0,  // Fire and forget
  AT_LEAST_ONCE = 1, // Guaranteed delivery but with possible duplicates
  EXACTLY_ONCE = 2   // Guaranteed delivery with exactly once semantics
}

// Base message schema with common fields
export const baseMessageSchema = z.object({
  messageId: z.string().optional(),
  messageType: z.enum([
    'telemetry',
    'status',
    'command_request',
    'command_response',
    'config_update',
    'config_ack',
    'event',
    'discovery_request',
    'discovery_response'
  ]),
  timestamp: z.string().datetime(),
  deviceId: z.number().int().positive(),
  qos: z.nativeEnum(QoSLevel).optional().default(QoSLevel.AT_MOST_ONCE),
  persistent: z.boolean().optional().default(false)
});

// Telemetry message containing device readings
export const telemetrySchema = baseMessageSchema.extend({
  messageType: z.literal('telemetry'),
  readings: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional()
});

// Device status message
export const statusSchema = baseMessageSchema.extend({
  messageType: z.literal('status'),
  status: z.enum(['online', 'offline', 'error', 'maintenance', 'standby']),
  details: z.string().optional()
});

// Command request message for controlling devices
export const commandRequestSchema = baseMessageSchema.extend({
  messageType: z.literal('command_request'),
  command: z.string(),
  parameters: z.record(z.string(), z.any()).optional(),
  correlationId: z.string().optional(),
  timeout: z.number().positive().optional(),
  userId: z.number().int().positive().optional()
});

// Command response message
export const commandResponseSchema = baseMessageSchema.extend({
  messageType: z.literal('command_response'),
  command: z.string(),
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
  correlationId: z.string().optional()
});

// Device configuration update message
export const configUpdateSchema = baseMessageSchema.extend({
  messageType: z.literal('config_update'),
  config: z.record(z.string(), z.any()),
  correlationId: z.string().optional(),
  reason: z.string().optional()
});

// Device configuration acknowledgment message
export const configAckSchema = baseMessageSchema.extend({
  messageType: z.literal('config_ack'),
  success: z.boolean(),
  appliedConfig: z.record(z.string(), z.any()).optional(),
  message: z.string().optional(),
  correlationId: z.string().optional()
});

// Device discovery request message (no deviceId as it's not registered yet)
export const discoveryRequestSchema = z.object({
  messageType: z.literal('discovery_request'),
  timestamp: z.string().datetime(),
  deviceInfo: z.object({
    manufacturerId: z.string(),
    modelId: z.string(),
    serialNumber: z.string(),
    firmwareVersion: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    ipAddress: z.string().optional(),
    macAddress: z.string().optional()
  })
});

// Device discovery response message
export const discoveryResponseSchema = z.object({
  messageType: z.literal('discovery_response'),
  timestamp: z.string().datetime(),
  deviceId: z.number().int().positive().optional(),
  status: z.enum(['accepted', 'rejected', 'pending_approval']),
  message: z.string().optional(),
  provisioningToken: z.string().optional()
});

// Event message for device events
export const eventSchema = baseMessageSchema.extend({
  messageType: z.literal('event'),
  eventType: z.string(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  data: z.any().optional(),
  message: z.string().optional()
});

// Export types derived from schemas
export type BaseMessage = z.infer<typeof baseMessageSchema>;
export type TelemetryMessage = z.infer<typeof telemetrySchema>;
export type StatusMessage = z.infer<typeof statusSchema>;
export type CommandRequestMessage = z.infer<typeof commandRequestSchema>;
export type CommandResponseMessage = z.infer<typeof commandResponseSchema>;
export type ConfigUpdateMessage = z.infer<typeof configUpdateSchema>;
export type ConfigAckMessage = z.infer<typeof configAckSchema>;
export type DiscoveryRequestMessage = z.infer<typeof discoveryRequestSchema>;
export type DiscoveryResponseMessage = z.infer<typeof discoveryResponseSchema>;
export type EventMessage = z.infer<typeof eventSchema>;

// Union type for all device messages
export type DeviceMessage = 
  | TelemetryMessage
  | StatusMessage
  | CommandRequestMessage
  | CommandResponseMessage
  | ConfigUpdateMessage
  | ConfigAckMessage
  | EventMessage;

// Function to validate messages against schemas
export function validateMessage(message: any): { valid: boolean; errors?: any; data?: DeviceMessage } {
  try {
    // Check the message type
    if (!message || !message.messageType) {
      return { valid: false, errors: 'Missing messageType' };
    }
    
    let result;
    
    switch (message.messageType) {
      case 'telemetry':
        result = telemetrySchema.safeParse(message);
        break;
      case 'status':
        result = statusSchema.safeParse(message);
        break;
      case 'command_request':
        result = commandRequestSchema.safeParse(message);
        break;
      case 'command_response':
        result = commandResponseSchema.safeParse(message);
        break;
      case 'config_update':
        result = configUpdateSchema.safeParse(message);
        break;
      case 'config_ack':
        result = configAckSchema.safeParse(message);
        break;
      case 'discovery_request':
        result = discoveryRequestSchema.safeParse(message);
        break;
      case 'discovery_response':
        result = discoveryResponseSchema.safeParse(message);
        break;
      case 'event':
        result = eventSchema.safeParse(message);
        break;
      default:
        return { valid: false, errors: `Unknown message type: ${message.messageType}` };
    }
    
    if (result.success) {
      return { valid: true, data: result.data as DeviceMessage };
    } else {
      return { valid: false, errors: result.error.format() };
    }
  } catch (error) {
    return { valid: false, errors: `Validation error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Topic patterns for MQTT messaging
export const TOPIC_PATTERNS = {
  // Core device messaging topics with enhanced structure
  TELEMETRY: 'devices/:deviceId/telemetry',
  STATUS: 'devices/:deviceId/status',
  COMMAND_REQUEST: 'devices/:deviceId/commands/request',
  COMMAND_RESPONSE: 'devices/:deviceId/commands/response',
  CONFIG_UPDATE: 'devices/:deviceId/config/update',
  CONFIG_ACK: 'devices/:deviceId/config/ack',
  EVENT: 'devices/:deviceId/events',
  
  // Device type specific topics for more granular control
  EV_CHARGER: 'devices/:deviceId/ev_charger/:connectorId',
  EV_CHARGER_STATUS: 'devices/:deviceId/ev_charger/:connectorId/status',
  EV_CHARGER_SESSION: 'devices/:deviceId/ev_charger/:connectorId/session',
  EV_CHARGER_COMMAND: 'devices/:deviceId/ev_charger/:connectorId/command',
  
  BATTERY: 'devices/:deviceId/battery',
  BATTERY_STATUS: 'devices/:deviceId/battery/status',
  BATTERY_SOC: 'devices/:deviceId/battery/soc',
  BATTERY_POWER: 'devices/:deviceId/battery/power',
  BATTERY_COMMAND: 'devices/:deviceId/battery/command',
  
  SOLAR: 'devices/:deviceId/solar',
  SOLAR_STATUS: 'devices/:deviceId/solar/status',
  SOLAR_PRODUCTION: 'devices/:deviceId/solar/production',
  SOLAR_COMMAND: 'devices/:deviceId/solar/command',
  
  HEAT_PUMP: 'devices/:deviceId/heat_pump',
  HEAT_PUMP_STATUS: 'devices/:deviceId/heat_pump/status',
  HEAT_PUMP_TEMPERATURE: 'devices/:deviceId/heat_pump/temperature',
  HEAT_PUMP_COMMAND: 'devices/:deviceId/heat_pump/command',
  
  METER: 'devices/:deviceId/meter',
  METER_READING: 'devices/:deviceId/meter/reading',
  METER_POWER: 'devices/:deviceId/meter/power',
  
  // Discovery and provisioning topics
  DISCOVERY_REQUEST: 'system/discovery/request',
  DISCOVERY_RESPONSE: 'system/discovery/response/devices/:deviceInfo.serialNumber',
  
  // Site level topics
  SITE_TELEMETRY: 'sites/:siteId/telemetry',
  SITE_STATUS: 'sites/:siteId/status',
  SITE_COMMANDS: 'sites/:siteId/commands',
  SITE_ENERGY: 'sites/:siteId/energy',
  SITE_FORECAST: 'sites/:siteId/forecast/:forecastType',
  SITE_OPTIMIZATION: 'sites/:siteId/optimization/:optimizationType',
  
  // Virtual Power Plant (VPP) topics
  VPP_EVENT: 'vpp/events/:eventId',
  VPP_RESPONSE: 'vpp/events/:eventId/responses/:siteId',
  VPP_ENROLLMENT: 'vpp/programs/:programId/enrollments/:siteId',
  
  // Device groups by type
  DEVICE_TYPE: 'devices/type/:deviceType/#',
  
  // System topics
  SYSTEM_STATUS: 'system/status',
  SYSTEM_COMMANDS: 'system/commands/#',
  SYSTEM_ALERTS: 'system/alerts/:alertLevel',
  
  // Heartbeat and monitoring
  HEARTBEAT: 'system/heartbeat/:componentId',
  DIAGNOSTICS: 'system/diagnostics/:componentId'
};

// Function to format a topic pattern with parameters
export function formatTopic(topicPattern: string, params: Record<string, any>): string {
  let formattedTopic = topicPattern;
  
  for (const [key, value] of Object.entries(params)) {
    formattedTopic = formattedTopic.replace(`:${key}`, value.toString());
  }
  
  return formattedTopic;
}