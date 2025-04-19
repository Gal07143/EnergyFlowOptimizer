import { EventEmitter } from 'events';
import { getMqttService, formatDeviceTopic, formatTopic } from '../services/mqttService';
import { QoSLevel, TOPIC_PATTERNS } from '@shared/messageSchema';

/**
 * Protocol Bridge Adapter - For converting between protocols like Modbus/OCPP/EEBus/SunSpec
 * to MQTT for unified data handling as shown in the communication protocol standards
 */

// Supported source protocols
export type SourceProtocolType = 'modbus' | 'ocpp' | 'eebus' | 'sunspec' | 'tcpip';

// Configuration for the protocol bridge
export interface ProtocolBridgeConfig {
  sourceProtocol: SourceProtocolType;
  targetProtocol: 'mqtt'; // Currently only MQTT is supported as target
  deviceId: number;
  deviceType: string;
  qosLevel?: QoSLevel;
  retainMessages?: boolean;
  mappingRules?: DataMappingRule[];
}

// Data mapping rule for field transformations
export interface DataMappingRule {
  sourceField: string;
  targetField: string;
  transformation?: 'none' | 'scale' | 'lookup' | 'custom';
  transformationParams?: Record<string, any>;
}

// Bridge adapter to convert between protocols
export class ProtocolBridgeAdapter {
  private config: ProtocolBridgeConfig;
  private mqttService = getMqttService();
  private eventEmitter = new EventEmitter();
  private deviceId: number;
  private deviceType: string;
  
  constructor(config: ProtocolBridgeConfig) {
    this.config = {
      ...config,
      qosLevel: config.qosLevel || QoSLevel.AT_MOST_ONCE,
      retainMessages: config.retainMessages || false
    };
    
    this.deviceId = config.deviceId;
    this.deviceType = config.deviceType;
    
    console.log(`Initialized Protocol Bridge: ${config.sourceProtocol} -> ${config.targetProtocol} for device ${config.deviceId}`);
  }
  
  // Bridge telemetry data from source protocol to MQTT
  async bridgeTelemetry(data: any): Promise<void> {
    // Format data according to the device type
    const formattedData = this.formatTelemetryByDeviceType(data);
    
    // Publish to the appropriate MQTT topic with QoS
    const topic = formatDeviceTopic(TOPIC_PATTERNS.TELEMETRY, this.deviceId);
    
    await this.mqttService.publish(topic, formattedData, {
      qos: this.config.qosLevel,
      retain: this.config.retainMessages
    });
    
    // For certain device types, also publish to type-specific topics
    await this.publishToTypeSpecificTopics(formattedData);
    
    this.eventEmitter.emit('telemetry_bridged', {
      deviceId: this.deviceId,
      data: formattedData,
      timestamp: new Date().toISOString()
    });
  }
  
  // Bridge status data from source protocol to MQTT
  async bridgeStatus(status: string, details?: string): Promise<void> {
    const statusData = {
      messageType: 'status',
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      status,
      details,
      qos: this.config.qosLevel
    };
    
    // Publish to the device status topic
    const topic = formatDeviceTopic(TOPIC_PATTERNS.STATUS, this.deviceId);
    
    await this.mqttService.publish(topic, statusData, {
      qos: this.config.qosLevel,
      retain: true // Status should be retained
    });
    
    // Also publish to device-type specific status topic if applicable
    if (this.isTypeWithSpecificTopic()) {
      const typeStatusTopic = this.getTypeSpecificStatusTopic();
      if (typeStatusTopic) {
        await this.mqttService.publish(typeStatusTopic, statusData, {
          qos: this.config.qosLevel,
          retain: true
        });
      }
    }
    
    this.eventEmitter.emit('status_bridged', {
      deviceId: this.deviceId,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  // Bridge command responses back from device
  async bridgeCommandResponse(command: string, success: boolean, result?: any, error?: string): Promise<void> {
    const responseData = {
      messageType: 'command_response',
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      command,
      success,
      data: result,
      message: error,
      qos: this.config.qosLevel
    };
    
    // Publish to the device command response topic
    const topic = formatDeviceTopic(TOPIC_PATTERNS.COMMAND_RESPONSE, this.deviceId);
    
    await this.mqttService.publish(topic, responseData, {
      qos: this.config.qosLevel,
      retain: false
    });
    
    this.eventEmitter.emit('command_response_bridged', {
      deviceId: this.deviceId,
      command,
      success,
      result,
      error,
      timestamp: new Date().toISOString()
    });
  }
  
  // Format telemetry data based on device type
  private formatTelemetryByDeviceType(data: any): any {
    // Apply mapping rules if provided
    const mappedData = this.applyMappingRules(data);
    
    const formattedData = {
      messageType: 'telemetry',
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      readings: mappedData,
      metadata: {
        source: this.config.sourceProtocol,
        deviceType: this.deviceType
      },
      qos: this.config.qosLevel
    };
    
    return formattedData;
  }
  
  // Apply mapping rules to transform data
  private applyMappingRules(data: any): any {
    if (!this.config.mappingRules || this.config.mappingRules.length === 0) {
      return data;
    }
    
    const result: Record<string, any> = { ...data };
    
    for (const rule of this.config.mappingRules) {
      if (data[rule.sourceField] !== undefined) {
        let value = data[rule.sourceField];
        
        // Apply transformation if specified
        switch(rule.transformation) {
          case 'scale':
            const factor = rule.transformationParams?.factor || 1;
            value = value * factor;
            break;
          case 'lookup':
            const lookupTable = rule.transformationParams?.lookup || {};
            value = lookupTable[value] !== undefined ? lookupTable[value] : value;
            break;
          case 'custom':
            const customFunction = rule.transformationParams?.function;
            if (typeof customFunction === 'function') {
              value = customFunction(value);
            }
            break;
        }
        
        result[rule.targetField] = value;
      }
    }
    
    return result;
  }
  
  // Check if this device type has specific topics
  private isTypeWithSpecificTopic(): boolean {
    const typesWithSpecificTopics = ['ev_charger', 'battery', 'solar', 'heat_pump', 'meter'];
    return typesWithSpecificTopics.includes(this.deviceType);
  }
  
  // Get type-specific status topic
  private getTypeSpecificStatusTopic(): string | null {
    switch(this.deviceType) {
      case 'ev_charger':
        return formatDeviceTopic(TOPIC_PATTERNS.EV_CHARGER_STATUS, this.deviceId, {
          connectorId: 1 // Default to first connector
        });
      case 'battery':
        return formatDeviceTopic(TOPIC_PATTERNS.BATTERY_STATUS, this.deviceId);
      case 'solar':
        return formatDeviceTopic(TOPIC_PATTERNS.SOLAR_STATUS, this.deviceId);
      case 'heat_pump':
        return formatDeviceTopic(TOPIC_PATTERNS.HEAT_PUMP_STATUS, this.deviceId);
      case 'meter':
        return null; // Meters don't have a specific status topic in our schema
      default:
        return null;
    }
  }
  
  // Publish to type-specific topics in addition to the main telemetry topic
  private async publishToTypeSpecificTopics(data: any): Promise<void> {
    const readings = data.readings || {};
    
    switch(this.deviceType) {
      case 'ev_charger':
        if (readings.power !== undefined || readings.energy !== undefined) {
          const evSessionData = {
            ...data,
            connectorId: readings.connectorId || 1,
            chargingPower: readings.power,
            energyDelivered: readings.energy,
            sessionStatus: readings.status
          };
          
          const topic = formatDeviceTopic(TOPIC_PATTERNS.EV_CHARGER_SESSION, this.deviceId, {
            connectorId: readings.connectorId || 1
          });
          
          await this.mqttService.publish(topic, evSessionData, {
            qos: this.config.qosLevel,
            retain: false
          });
        }
        break;
        
      case 'battery':
        if (readings.soc !== undefined) {
          const topic = formatTopic(TOPIC_PATTERNS.BATTERY_SOC, { deviceId: this.deviceId });
          await this.mqttService.publish(topic, {
            ...data,
            soc: readings.soc
          }, {
            qos: this.config.qosLevel,
            retain: true
          });
        }
        
        if (readings.power !== undefined) {
          const topic = formatTopic(TOPIC_PATTERNS.BATTERY_POWER, { deviceId: this.deviceId });
          await this.mqttService.publish(topic, {
            ...data,
            power: readings.power
          }, {
            qos: this.config.qosLevel,
            retain: false
          });
        }
        break;
        
      case 'solar':
        if (readings.production !== undefined) {
          const topic = formatTopic(TOPIC_PATTERNS.SOLAR_PRODUCTION, { deviceId: this.deviceId });
          await this.mqttService.publish(topic, {
            ...data,
            production: readings.production
          }, {
            qos: this.config.qosLevel,
            retain: false
          });
        }
        break;
        
      case 'heat_pump':
        if (readings.temperature !== undefined) {
          const topic = formatTopic(TOPIC_PATTERNS.HEAT_PUMP_TEMPERATURE, { deviceId: this.deviceId });
          await this.mqttService.publish(topic, {
            ...data,
            temperature: readings.temperature
          }, {
            qos: this.config.qosLevel,
            retain: true
          });
        }
        break;
        
      case 'meter':
        if (readings.reading !== undefined) {
          const topic = formatTopic(TOPIC_PATTERNS.METER_READING, { deviceId: this.deviceId });
          await this.mqttService.publish(topic, {
            ...data,
            reading: readings.reading
          }, {
            qos: this.config.qosLevel,
            retain: true
          });
        }
        
        if (readings.power !== undefined) {
          const topic = formatTopic(TOPIC_PATTERNS.METER_POWER, { deviceId: this.deviceId });
          await this.mqttService.publish(topic, {
            ...data,
            power: readings.power
          }, {
            qos: this.config.qosLevel,
            retain: false
          });
        }
        break;
    }
  }
  
  // Get event emitter for listening to bridge events
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
}

// Protocol Bridge Manager to handle multiple bridges
export class ProtocolBridgeManager {
  private bridges: Map<number, ProtocolBridgeAdapter> = new Map();
  
  // Create a new protocol bridge
  createBridge(config: ProtocolBridgeConfig): ProtocolBridgeAdapter {
    const bridge = new ProtocolBridgeAdapter(config);
    this.bridges.set(config.deviceId, bridge);
    return bridge;
  }
  
  // Get an existing bridge
  getBridge(deviceId: number): ProtocolBridgeAdapter | undefined {
    return this.bridges.get(deviceId);
  }
  
  // Remove a bridge
  removeBridge(deviceId: number): boolean {
    return this.bridges.delete(deviceId);
  }
  
  // Get all bridges
  getAllBridges(): ProtocolBridgeAdapter[] {
    return Array.from(this.bridges.values());
  }
}

// Singleton instance
let protocolBridgeManagerInstance: ProtocolBridgeManager | null = null;

// Get the protocol bridge manager instance
export function getProtocolBridgeManager(): ProtocolBridgeManager {
  if (!protocolBridgeManagerInstance) {
    protocolBridgeManagerInstance = new ProtocolBridgeManager();
  }
  return protocolBridgeManagerInstance;
}