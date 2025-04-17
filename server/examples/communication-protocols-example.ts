/**
 * Communication Protocols Example
 * 
 * This example demonstrates how to use the device adapters with protocol bridges
 * to create a unified communication system with QoS and enhanced topic structure.
 */

import { DeviceType, Protocol } from '../adapters/deviceAdapterFactory';
import { ModbusBatteryAdapter, ModbusBatteryConnectionParams } from '../adapters/modbusBatteryAdapter';
import { QoSLevel, TOPIC_PATTERNS, formatTopic } from '@shared/messageSchema';
import { getMqttService } from '../services/mqttService';

async function demonstrateCommunicationProtocols() {
  console.log('Demonstrating enhanced communication protocols...');
  
  // Initialize MQTT service
  const mqttService = getMqttService();
  
  // Example 1: Connect to a Modbus battery and receive data via standardized MQTT topics
  
  // Battery connection parameters (would be based on device specifications in production)
  const batteryParams: ModbusBatteryConnectionParams = {
    ipAddress: '192.168.1.100',
    port: 502,
    unitId: 1,
    registerMap: {
      soc: 100,
      power: 102,
      voltage: 104,
      current: 106,
      temperature: 108,
      status: 110
    },
    pollInterval: 10000 // 10 seconds
  };
  
  // Create and connect the battery adapter
  const batteryAdapter = new ModbusBatteryAdapter(201, batteryParams);
  await batteryAdapter.connect();
  
  // Set up MQTT subscribers for various topics to demonstrate the enhanced topic structure
  
  // 1. Subscribe to all device telemetry using wildcard
  mqttService.addMessageHandler('devices/+/telemetry', (topic, message, params) => {
    console.log(`Received telemetry from device ${params.deviceId}:`, 
      typeof message === 'object' ? 
        `${Object.keys(message.readings || {}).length} readings` : 
        'Non-JSON message');
  });
  
  // 2. Subscribe specifically to battery SOC updates with high QoS
  const batteryTopic = formatTopic(TOPIC_PATTERNS.BATTERY_SOC, { deviceId: 201 });
  await mqttService.subscribe(batteryTopic, { qos: QoSLevel.EXACTLY_ONCE });
  
  mqttService.addMessageHandler(TOPIC_PATTERNS.BATTERY_SOC, (topic, message, params) => {
    if (params.deviceId === '201') {
      console.log(`Battery ${params.deviceId} SOC update:`, 
        message.soc ? `${message.soc}%` : message);
    }
  });
  
  // 3. Subscribe to device status changes
  mqttService.addMessageHandler(TOPIC_PATTERNS.STATUS, (topic, message, params) => {
    console.log(`Device ${params.deviceId} status changed to: ${message.status}`);
  });
  
  // 4. Send a command to the battery and wait for response
  const commandTopic = formatTopic(TOPIC_PATTERNS.COMMAND_REQUEST, { deviceId: 201 });
  const commandId = Date.now().toString();
  
  // Set up a one-time handler for the command response
  const responsePromise = new Promise((resolve) => {
    const responseHandler = (topic: string, message: any, params: any) => {
      if (params.deviceId === '201' && message.correlationId === commandId) {
        resolve(message);
        mqttService.removeMessageHandler(responseHandler);
      }
    };
    
    mqttService.addMessageHandler(TOPIC_PATTERNS.COMMAND_RESPONSE, responseHandler);
  });
  
  // Send command with QoS 1 (at least once delivery)
  await mqttService.publish(commandTopic, {
    messageType: 'command_request',
    messageId: commandId,
    correlationId: commandId,
    timestamp: new Date().toISOString(),
    deviceId: 201,
    command: 'set_mode',
    parameters: {
      mode: 'discharge',
      power: 3000
    },
    qos: QoSLevel.AT_LEAST_ONCE
  }, { qos: QoSLevel.AT_LEAST_ONCE });
  
  console.log(`Sent command to battery 201. Waiting for response...`);
  
  // Wait for a response or timeout after 5 seconds
  const response = await Promise.race([
    responsePromise,
    new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 5000))
  ]);
  
  console.log('Command response:', response);
  
  // Simulate some activity
  for (let i = 0; i < 3; i++) {
    console.log(`Simulating read cycle ${i+1}...`);
    await batteryAdapter.readData();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between reads
  }
  
  // Clean up
  await batteryAdapter.disconnect();
  
  console.log('Communication protocols demonstration completed.');
}

// Export the demonstration function
export { demonstrateCommunicationProtocols };

// Allow direct execution
if (require.main === module) {
  demonstrateCommunicationProtocols()
    .then(() => console.log('Done!'))
    .catch(err => console.error('Error in demonstration:', err));
}