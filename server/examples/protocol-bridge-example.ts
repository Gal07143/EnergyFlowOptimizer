/**
 * Protocol Bridge Adapter Usage Example
 * 
 * This example demonstrates how to use the Protocol Bridge Adapter
 * to convert between different protocols and MQTT for standardized communication.
 */

import { ProtocolBridgeAdapter, ProtocolBridgeManager, ProtocolBridgeConfig } from '../adapters/protocolBridgeAdapter';
import { QoSLevel } from '@shared/messageSchema';

// Example usage function
async function demonstrateProtocolBridge() {
  console.log('Demonstrating Protocol Bridge Adapter usage...');
  
  // Get the singleton bridge manager instance
  const bridgeManager = new ProtocolBridgeManager();
  
  // Example configuration for a Modbus battery device
  const batteryConfig: ProtocolBridgeConfig = {
    sourceProtocol: 'modbus',
    targetProtocol: 'mqtt',
    deviceId: 101,
    deviceType: 'battery',
    qosLevel: QoSLevel.AT_LEAST_ONCE, // Use QoS 1 for important device data
    retainMessages: true,
    mappingRules: [
      {
        sourceField: 'state_of_charge',
        targetField: 'soc',
        transformation: 'scale',
        transformationParams: { factor: 0.01 } // Convert from 0-10000 to 0-100%
      },
      {
        sourceField: 'power_watts',
        targetField: 'power',
        transformation: 'scale',
        transformationParams: { factor: 0.001 } // Convert from watts to kilowatts
      },
      {
        sourceField: 'temp_celsius',
        targetField: 'temperature',
        transformation: 'none'
      }
    ]
  };
  
  // Create a bridge for the battery device
  const batteryBridge = bridgeManager.createBridge(batteryConfig);
  
  // Subscribe to bridge events
  batteryBridge.getEventEmitter().on('telemetry_bridged', (data) => {
    console.log('Battery telemetry bridged successfully:', data);
  });
  
  // Example raw data from Modbus device
  const rawModbusData = {
    state_of_charge: 8532, // 0-10000 scale (85.32%)
    power_watts: -2500,    // Negative means discharging, positive means charging
    temp_celsius: 25.5,
    voltage: 48.2,
    current: -52.1
  };
  
  // Bridge the telemetry data
  await batteryBridge.bridgeTelemetry(rawModbusData);
  
  // Update device status
  await batteryBridge.bridgeStatus('online', 'Battery operating normally');
  
  // Example configuration for an OCPP EV charger
  const evChargerConfig: ProtocolBridgeConfig = {
    sourceProtocol: 'ocpp',
    targetProtocol: 'mqtt',
    deviceId: 102,
    deviceType: 'ev_charger',
    qosLevel: QoSLevel.AT_LEAST_ONCE, 
    retainMessages: false, // Don't retain transient charging data
    mappingRules: [
      {
        sourceField: 'currentChargingPower',
        targetField: 'power',
        transformation: 'none'
      },
      {
        sourceField: 'energyDelivered',
        targetField: 'energy',
        transformation: 'none'
      },
      {
        sourceField: 'chargePointStatus',
        targetField: 'status',
        transformation: 'lookup',
        transformationParams: { 
          lookup: {
            'Available': 'available',
            'Preparing': 'preparing',
            'Charging': 'charging',
            'SuspendedEVSE': 'suspended',
            'SuspendedEV': 'suspended',
            'Finishing': 'finishing',
            'Reserved': 'reserved',
            'Unavailable': 'unavailable',
            'Faulted': 'error'
          }
        }
      }
    ]
  };
  
  // Create a bridge for the EV charger
  const evChargerBridge = bridgeManager.createBridge(evChargerConfig);
  
  // Example raw data from OCPP
  const rawOcppData = {
    connectorId: 1,
    chargePointStatus: 'Charging',
    currentChargingPower: 11.2,
    energyDelivered: 5.7,
    meterValue: 5700,
    timestamp: '2024-04-17T12:34:56Z'
  };
  
  // Bridge the telemetry data
  await evChargerBridge.bridgeTelemetry(rawOcppData);
  
  // Example of bridging a command response
  await evChargerBridge.bridgeCommandResponse(
    'remote_start_transaction', 
    true, 
    { transactionId: '12345', started: true },
    undefined
  );
  
  // Print all active bridges
  console.log(`Active bridges: ${bridgeManager.getAllBridges().length}`);
  
  // Test if we can get a bridge by device ID
  const retrievedBridge = bridgeManager.getBridge(101);
  console.log(`Retrieved bridge for device 101: ${retrievedBridge ? 'Yes' : 'No'}`);
  
  console.log('Protocol Bridge demonstration completed.');
}

// Export the demonstration function
export { demonstrateProtocolBridge };

// Allow direct execution
if (require.main === module) {
  demonstrateProtocolBridge()
    .then(() => console.log('Done!'))
    .catch(err => console.error('Error in demonstration:', err));
}