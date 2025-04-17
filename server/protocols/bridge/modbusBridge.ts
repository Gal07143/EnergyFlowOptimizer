/**
 * Modbus Protocol Bridge
 * 
 * Converts between Modbus protocol data and MQTT messages
 * for standardized communication in the EMS platform.
 */

import { ProtocolBridgeAdapter, ProtocolBridgeConfig } from '../../adapters/protocolBridgeAdapter';
import { Protocol, DeviceType, DataMappingRule } from '../common/protocolTypes';
import { QoSLevel } from '@shared/messageSchema';
import { getProtocolAwareQoS } from '../common/qosHelper';

export interface ModbusBridgeConfig {
  deviceId: number;
  deviceType: DeviceType;
  unitId: number;
  registerMappings: ModbusRegisterMapping[];
  qosLevel?: QoSLevel;
  retainMessages?: boolean;
}

export interface ModbusRegisterMapping {
  register: number;
  registerType: 'holding' | 'input' | 'coil' | 'discrete';
  dataField: string;
  dataType: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64' | 'boolean' | 'string';
  scale?: number;
  offset?: number;
  byteOrder?: 'big-endian' | 'little-endian';
  wordOrder?: 'big-endian' | 'little-endian';
  stringLength?: number;
}

/**
 * Creates a Modbus Protocol Bridge adapter
 */
export function createModbusBridge(config: ModbusBridgeConfig): ProtocolBridgeAdapter {
  // Convert Modbus-specific config to the generic bridge config
  const bridgeConfig: ProtocolBridgeConfig = {
    sourceProtocol: 'modbus',
    targetProtocol: 'mqtt',
    deviceId: config.deviceId,
    deviceType: config.deviceType as string,
    qosLevel: getProtocolAwareQoS(Protocol.MODBUS, config.qosLevel),
    retainMessages: config.retainMessages,
    mappingRules: createMappingRulesFromModbusConfig(config)
  };

  return new ProtocolBridgeAdapter(bridgeConfig);
}

/**
 * Converts Modbus register mappings to generic data mapping rules
 */
function createMappingRulesFromModbusConfig(config: ModbusBridgeConfig): DataMappingRule[] {
  const mappingRules: DataMappingRule[] = [];

  for (const mapping of config.registerMappings) {
    // Create a mapping rule for each register
    const rule: DataMappingRule = {
      sourceField: `register_${mapping.register}`,
      targetField: mapping.dataField,
      transformation: mapping.scale !== undefined ? 'scale' : 'none',
      transformationParams: {}
    };

    // Add scale factor if provided
    if (mapping.scale !== undefined) {
      rule.transformationParams!.factor = mapping.scale;
    }

    // Add offset if provided
    if (mapping.offset !== undefined) {
      rule.transformationParams!.offset = mapping.offset;
    }

    // Add data type conversion if needed
    if (mapping.dataType === 'float32' || mapping.dataType === 'float64') {
      rule.transformationParams!.convertToFloat = true;
    } else if (mapping.dataType === 'boolean') {
      rule.transformationParams!.convertToBoolean = true;
    }

    mappingRules.push(rule);
  }

  return mappingRules;
}

/**
 * Parses raw Modbus data according to the device's register mappings
 */
export function parseModbusData(
  rawData: Record<number, Buffer>,
  registerMappings: ModbusRegisterMapping[]
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of registerMappings) {
    const registerData = rawData[mapping.register];
    if (!registerData) continue;

    let value: any;

    // Parse the register data based on data type
    switch (mapping.dataType) {
      case 'int16':
        value = mapping.byteOrder === 'little-endian'
          ? registerData.readInt16LE(0)
          : registerData.readInt16BE(0);
        break;

      case 'uint16':
        value = mapping.byteOrder === 'little-endian'
          ? registerData.readUInt16LE(0)
          : registerData.readUInt16BE(0);
        break;

      case 'int32':
        value = mapping.byteOrder === 'little-endian'
          ? registerData.readInt32LE(0)
          : registerData.readInt32BE(0);
        break;

      case 'uint32':
        value = mapping.byteOrder === 'little-endian'
          ? registerData.readUInt32LE(0)
          : registerData.readUInt32BE(0);
        break;

      case 'float32':
        value = mapping.byteOrder === 'little-endian'
          ? registerData.readFloatLE(0)
          : registerData.readFloatBE(0);
        break;

      case 'float64':
        value = mapping.byteOrder === 'little-endian'
          ? registerData.readDoubleLE(0)
          : registerData.readDoubleBE(0);
        break;

      case 'boolean':
        value = registerData[0] === 1;
        break;

      case 'string':
        value = registerData.toString('utf8', 0, mapping.stringLength || registerData.length);
        break;

      default:
        value = registerData.toString('hex');
    }

    // Apply scaling and offset
    if (mapping.scale !== undefined) {
      value = value * mapping.scale;
    }

    if (mapping.offset !== undefined) {
      value = value + mapping.offset;
    }

    // Store the parsed value
    result[mapping.dataField] = value;
  }

  return result;
}

/**
 * Formats data for writing to Modbus registers
 */
export function formatDataForModbus(
  data: Record<string, any>,
  registerMappings: ModbusRegisterMapping[]
): Record<number, Buffer> {
  const result: Record<number, Buffer> = {};

  for (const mapping of registerMappings) {
    if (data[mapping.dataField] === undefined) continue;

    let value = data[mapping.dataField];

    // Remove scaling and offset for writing
    if (mapping.offset !== undefined) {
      value = value - mapping.offset;
    }

    if (mapping.scale !== undefined && mapping.scale !== 0) {
      value = value / mapping.scale;
    }

    let buffer: Buffer;

    // Create buffer based on data type
    switch (mapping.dataType) {
      case 'int16': {
        buffer = Buffer.alloc(2);
        mapping.byteOrder === 'little-endian'
          ? buffer.writeInt16LE(value, 0)
          : buffer.writeInt16BE(value, 0);
        break;
      }

      case 'uint16': {
        buffer = Buffer.alloc(2);
        mapping.byteOrder === 'little-endian'
          ? buffer.writeUInt16LE(value, 0)
          : buffer.writeUInt16BE(value, 0);
        break;
      }

      case 'int32': {
        buffer = Buffer.alloc(4);
        mapping.byteOrder === 'little-endian'
          ? buffer.writeInt32LE(value, 0)
          : buffer.writeInt32BE(value, 0);
        break;
      }

      case 'uint32': {
        buffer = Buffer.alloc(4);
        mapping.byteOrder === 'little-endian'
          ? buffer.writeUInt32LE(value, 0)
          : buffer.writeUInt32BE(value, 0);
        break;
      }

      case 'float32': {
        buffer = Buffer.alloc(4);
        mapping.byteOrder === 'little-endian'
          ? buffer.writeFloatLE(value, 0)
          : buffer.writeFloatBE(value, 0);
        break;
      }

      case 'float64': {
        buffer = Buffer.alloc(8);
        mapping.byteOrder === 'little-endian'
          ? buffer.writeDoubleLE(value, 0)
          : buffer.writeDoubleBE(value, 0);
        break;
      }

      case 'boolean': {
        buffer = Buffer.from([value ? 1 : 0]);
        break;
      }

      case 'string': {
        const strValue = String(value);
        buffer = Buffer.from(strValue, 'utf8');
        if (mapping.stringLength && buffer.length > mapping.stringLength) {
          buffer = buffer.slice(0, mapping.stringLength);
        }
        break;
      }

      default:
        buffer = Buffer.from([0]);
    }

    result[mapping.register] = buffer;
  }

  return result;
}