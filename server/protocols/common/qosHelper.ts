/**
 * QoS Helper Utilities
 * 
 * This file provides utilities for managing Quality of Service (QoS) levels
 * for different message types and device communications.
 */

import { QoSLevel } from '@shared/messageSchema';
import { DeviceType, Protocol } from './protocolTypes';

/**
 * Determines the appropriate QoS level for a specific message type
 * based on message criticality and device type.
 * 
 * @param messageType - The type of message being sent
 * @param deviceType - The type of device sending/receiving the message
 * @param isCommand - Whether the message is a command (vs telemetry/status)
 * @returns The appropriate QoS level to use
 */
export function getRecommendedQoS(
  messageType: 'telemetry' | 'status' | 'command' | 'config' | 'event', 
  deviceType: DeviceType,
  isCommand: boolean = false
): QoSLevel {
  // Commands generally need higher QoS
  if (isCommand) {
    return QoSLevel.AT_LEAST_ONCE;
  }

  // High-frequency telemetry data can use QoS 0 to reduce overhead
  if (messageType === 'telemetry') {
    return QoSLevel.AT_MOST_ONCE;
  }

  // Status updates should have at least QoS 1
  if (messageType === 'status') {
    return QoSLevel.AT_LEAST_ONCE;
  }

  // Configuration changes need reliable delivery
  if (messageType === 'config') {
    return QoSLevel.EXACTLY_ONCE;
  }

  // Critical device types need higher QoS
  if (
    deviceType === DeviceType.BATTERY || 
    deviceType === DeviceType.EV_CHARGER ||
    deviceType === DeviceType.SMART_METER
  ) {
    return messageType === 'event' ? QoSLevel.AT_LEAST_ONCE : QoSLevel.AT_MOST_ONCE;
  }

  // Default to QoS 0 for regular telemetry and non-critical devices
  return QoSLevel.AT_MOST_ONCE;
}

/**
 * Determines if messages for a specific device type should be retained
 * 
 * @param deviceType - The type of device
 * @param messageType - The type of message
 * @returns Whether the message should be retained
 */
export function shouldRetainMessage(
  deviceType: DeviceType,
  messageType: 'telemetry' | 'status' | 'command' | 'config' | 'event'
): boolean {
  // Status updates are typically retained for late subscribers
  if (messageType === 'status') {
    return true;
  }

  // Config updates should be retained
  if (messageType === 'config') {
    return true;
  }

  // For battery state of charge, retain the latest value
  if (deviceType === DeviceType.BATTERY && messageType === 'telemetry') {
    return true;
  }

  // Commands should never be retained
  if (messageType === 'command') {
    return false;
  }

  // By default, don't retain messages
  return false;
}

/**
 * Calculates the QoS level based on the source protocol
 * Some protocols have more reliability built-in than others
 */
export function getProtocolAwareQoS(
  protocol: Protocol, 
  defaultQoS: QoSLevel = QoSLevel.AT_MOST_ONCE
): QoSLevel {
  switch (protocol) {
    // Modbus has no built-in reliability, so use higher QoS
    case Protocol.MODBUS:
      return Math.max(defaultQoS, QoSLevel.AT_LEAST_ONCE);
      
    // OCPP has its own reliability, can use lower QoS
    case Protocol.OCPP:
      return defaultQoS;
      
    // EEBus has good reliability, can use lower QoS
    case Protocol.EEBUS:
      return defaultQoS;
      
    // SunSpec has variable reliability, use default
    case Protocol.SUNSPEC:
      return defaultQoS;
      
    // Generic TCP/IP might need higher QoS
    case Protocol.TCPIP:
      return Math.max(defaultQoS, QoSLevel.AT_LEAST_ONCE);
      
    default:
      return defaultQoS;
  }
}