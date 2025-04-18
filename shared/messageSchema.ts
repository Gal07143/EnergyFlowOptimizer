/**
 * Message Schema Definitions
 * 
 * Defines the standard message formats and types used for device communication
 * across different protocols and interfaces.
 */

import { z } from 'zod';

// QoS levels for MQTT messaging
export enum QoSLevel {
  AT_MOST_ONCE = 0,  // Fire and forget
  AT_LEAST_ONCE = 1, // Guaranteed delivery, may duplicate
  EXACTLY_ONCE = 2   // Guaranteed delivery, no duplicates
}

// Standard MQTT topic patterns
export const TOPIC_PATTERNS = {
  // Device message topics
  TELEMETRY: 'devices/{deviceId}/telemetry',
  STATUS: 'devices/{deviceId}/status',
  COMMANDS: 'devices/{deviceId}/commands',
  COMMANDS_RESPONSE: 'devices/{deviceId}/commands/response',
  
  // Gateway message topics
  GATEWAY_STATUS: 'gateways/{gatewayId}/status',
  GATEWAY_TELEMETRY: 'gateways/{gatewayId}/telemetry',
  GATEWAY_COMMANDS: 'gateways/{gatewayId}/commands',
  
  // Site-level topics
  SITE_ENERGY: 'sites/{siteId}/energy',
  SITE_STATUS: 'sites/{siteId}/status',
  
  // Virtual Power Plant topics
  VPP_EVENTS: 'vpp/events/{eventId}',
  VPP_RESPONSES: 'vpp/events/{eventId}/responses/{deviceId}'
};

// Message types for device communication
export enum MessageType {
  // Telemetry messages (device → server)
  TELEMETRY = 'telemetry',
  MEASUREMENT = 'measurement',
  READING = 'reading',
  
  // Status messages (device → server)
  STATUS = 'status',
  HEARTBEAT = 'heartbeat',
  DIAGNOSTIC = 'diagnostic',
  EVENT = 'event',
  ALARM = 'alarm',
  
  // Command messages (server → device)
  COMMAND = 'command',
  CONTROL = 'control',
  SET_POINT = 'setpoint',
  CONFIG = 'config',
  
  // Command responses (device → server)
  COMMAND_RESPONSE = 'command_response',
  ACKNOWLEDGEMENT = 'ack',
  
  // Discovery and provisioning
  DISCOVERY = 'discovery',
  REGISTRATION = 'registration',
  PROVISION = 'provision'
}

// Base message schema
export const baseMessageSchema = z.object({
  type: z.string(),
  timestamp: z.number().default(() => Date.now()),
  deviceId: z.string().optional(),
  gatewayId: z.string().optional(),
  messageId: z.string().optional()
});

// Telemetry message schema
export const telemetryMessageSchema = baseMessageSchema.extend({
  type: z.literal(MessageType.TELEMETRY),
  readings: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  units: z.record(z.string(), z.string()).optional(),
  interval: z.number().optional() // Sampling interval in milliseconds
});

// Status message schema
export const statusMessageSchema = baseMessageSchema.extend({
  type: z.literal(MessageType.STATUS),
  status: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  level: z.enum(['info', 'warning', 'error', 'critical']).optional()
});

// Command message schema
export const commandMessageSchema = baseMessageSchema.extend({
  type: z.literal(MessageType.COMMAND),
  command: z.string(),
  parameters: z.record(z.string(), z.any()).optional(),
  timeout: z.number().optional() // Command timeout in milliseconds
});

// Command response schema
export const commandResponseSchema = baseMessageSchema.extend({
  type: z.literal(MessageType.COMMAND_RESPONSE),
  command: z.string(),
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  originalMessageId: z.string().optional()
});

// Discovery message schema
export const discoveryMessageSchema = baseMessageSchema.extend({
  type: z.literal(MessageType.DISCOVERY),
  capabilities: z.array(z.string()).optional(),
  deviceType: z.string().optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  firmwareVersion: z.string().optional()
});

// Event message schema
export const eventMessageSchema = baseMessageSchema.extend({
  type: z.literal(MessageType.EVENT),
  eventType: z.string(),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  description: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

// Union of all message types
export const messageSchema = z.union([
  telemetryMessageSchema,
  statusMessageSchema,
  commandMessageSchema,
  commandResponseSchema,
  discoveryMessageSchema,
  eventMessageSchema,
  // Allow other message types with just the base schema
  baseMessageSchema
]);

// Message type definitions
export type BaseMessage = z.infer<typeof baseMessageSchema>;
export type TelemetryMessage = z.infer<typeof telemetryMessageSchema>;
export type StatusMessage = z.infer<typeof statusMessageSchema>;
export type CommandMessage = z.infer<typeof commandMessageSchema>;
export type CommandResponseMessage = z.infer<typeof commandResponseSchema>;
export type DiscoveryMessage = z.infer<typeof discoveryMessageSchema>;
export type EventMessage = z.infer<typeof eventMessageSchema>;
export type Message = z.infer<typeof messageSchema>;

// Validation functions
export function validateMessage(message: any): { valid: boolean; errors?: z.ZodError } {
  try {
    messageSchema.parse(message);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error };
    }
    throw error;
  }
}

// Message creation helpers
export function createTelemetryMessage(
  deviceId: string,
  readings: Record<string, number | string | boolean>,
  options: Partial<Omit<TelemetryMessage, 'type' | 'deviceId' | 'readings' | 'timestamp'>> & { timestamp?: number } = {}
): TelemetryMessage {
  return {
    type: MessageType.TELEMETRY,
    deviceId,
    readings,
    timestamp: options.timestamp || Date.now(),
    ...options
  };
}

export function createStatusMessage(
  deviceId: string,
  status: string,
  options: Partial<Omit<StatusMessage, 'type' | 'deviceId' | 'status' | 'timestamp'>> & { timestamp?: number } = {}
): StatusMessage {
  return {
    type: MessageType.STATUS,
    deviceId,
    status,
    timestamp: options.timestamp || Date.now(),
    ...options
  };
}

export function createCommandMessage(
  deviceId: string,
  command: string,
  options: Partial<Omit<CommandMessage, 'type' | 'deviceId' | 'command' | 'timestamp'>> & { timestamp?: number } = {}
): CommandMessage {
  return {
    type: MessageType.COMMAND,
    deviceId,
    command,
    timestamp: options.timestamp || Date.now(),
    messageId: options.messageId || generateMessageId(),
    ...options
  };
}

export function createCommandResponseMessage(
  deviceId: string,
  command: string,
  success: boolean,
  options: Partial<Omit<CommandResponseMessage, 'type' | 'deviceId' | 'command' | 'success' | 'timestamp'>> & { timestamp?: number } = {}
): CommandResponseMessage {
  return {
    type: MessageType.COMMAND_RESPONSE,
    deviceId,
    command,
    success,
    timestamp: options.timestamp || Date.now(),
    ...options
  };
}

export function createEventMessage(
  deviceId: string,
  eventType: string,
  severity: 'info' | 'warning' | 'error' | 'critical',
  description: string,
  options: Partial<Omit<EventMessage, 'type' | 'deviceId' | 'eventType' | 'severity' | 'description' | 'timestamp'>> & { timestamp?: number } = {}
): EventMessage {
  return {
    type: MessageType.EVENT,
    deviceId,
    eventType,
    severity,
    description,
    timestamp: options.timestamp || Date.now(),
    ...options
  };
}

// Helper function to generate a unique message ID
export function generateMessageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Topic generation helpers
export function getDeviceTopicPrefix(deviceId: string): string {
  return `devices/${deviceId}`;
}

export function getGatewayTopicPrefix(gatewayId: string): string {
  return `gateways/${gatewayId}`;
}

export function getDeviceTelemetryTopic(deviceId: string): string {
  return `${getDeviceTopicPrefix(deviceId)}/telemetry`;
}

export function getDeviceStatusTopic(deviceId: string): string {
  return `${getDeviceTopicPrefix(deviceId)}/status`;
}

export function getDeviceCommandTopic(deviceId: string): string {
  return `${getDeviceTopicPrefix(deviceId)}/commands`;
}

export function getDeviceCommandResponseTopic(deviceId: string): string {
  return `${getDeviceTopicPrefix(deviceId)}/commands/response`;
}

export function getGatewayStatusTopic(gatewayId: string): string {
  return `${getGatewayTopicPrefix(gatewayId)}/status`;
}

export function getGatewayTelemetryTopic(gatewayId: string): string {
  return `${getGatewayTopicPrefix(gatewayId)}/telemetry`;
}