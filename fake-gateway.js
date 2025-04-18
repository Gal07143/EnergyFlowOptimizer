/**
 * Fake Gateway Simulator for Energy Management System
 * 
 * This script simulates a gateway device connecting to the EMS server
 * through both HTTP and MQTT protocols, testing connectivity and
 * data transmission capabilities.
 */

import mqtt from 'mqtt';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Configuration parameters
const config = {
  // Gateway identification
  gatewayId: 'fake-gateway-' + uuidv4().substring(0, 8),
  gatewayName: 'RUT956 Test Gateway',
  
  // Server connection details
  emsServerUrl: 'http://localhost:5000',
  mqttBrokerUrl: 'mqtt://localhost:1883',
  
  // Simulated device details
  deviceId: 'demo-device-' + uuidv4().substring(0, 8),
  deviceType: 'smart_meter',
  deviceName: 'Demo Smart Meter',
  
  // Test parameters
  httpIntervalMs: 10000,  // 10 seconds
  mqttIntervalMs: 5000,   // 5 seconds
  runDurationMs: 60000    // 1 minute
};

// Credentials object (will be populated during registration)
let credentials = {
  apiKey: null,
  apiSecret: null,
  mqttUsername: null,
  mqttPassword: null,
  mqttClientId: null
};

// Statistics tracking
const stats = {
  httpRequests: 0,
  httpSuccess: 0,
  httpErrors: 0,
  mqttMessages: 0,
  mqttSuccess: 0,
  mqttErrors: 0
};

// MQTT client reference
let mqttClient = null;

/**
 * Register the fake gateway with the EMS server
 */
async function registerGateway() {
  console.log(`\n===== REGISTERING GATEWAY: ${config.gatewayName} =====`);
  
  try {
    // Step 1: Create the gateway in the system
    console.log('Step 1: Creating gateway in EMS...');
    const createResponse = await fetch(`${config.emsServerUrl}/api/gateways`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: config.gatewayName,
        type: 'energy_gateway',
        model: 'RUT956',
        manufacturer: 'Teltonika',
        serialNumber: config.gatewayId,
        firmwareVersion: '1.0.0',
        ipAddress: '192.168.1.100',
        macAddress: '00:11:22:33:44:55',
        connectionStatus: 'online'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create gateway: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const gateway = await createResponse.json();
    console.log(`  ✓ Gateway created with ID: ${gateway.id || 'unknown'}`);
    
    // Step 2: Generate credentials for the gateway
    console.log('Step 2: Generating gateway credentials...');
    const credentialsResponse = await fetch(`${config.emsServerUrl}/api/gateways/${gateway.id || 1}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!credentialsResponse.ok) {
      throw new Error(`Failed to generate credentials: ${credentialsResponse.status} ${credentialsResponse.statusText}`);
    }
    
    credentials = await credentialsResponse.json();
    console.log('  ✓ Generated credentials successfully');
    console.log(`    API Key: ${credentials.apiKey || 'not provided'}`);
    console.log(`    MQTT Username: ${credentials.mqttUsername || 'not provided'}`);
    
    return gateway.id || 1; // Return gateway ID for further operations
  } catch (error) {
    console.error('❌ Gateway registration failed:', error.message);
    
    // If we can't register, create some fake credentials for testing
    console.log('  ⚠️ Using fallback credentials for testing');
    credentials = {
      apiKey: `test-api-key-${uuidv4().substring(0, 8)}`,
      apiSecret: `test-api-secret-${uuidv4().substring(0, 8)}`,
      mqttUsername: `test-user-${uuidv4().substring(0, 8)}`,
      mqttPassword: `test-password-${uuidv4().substring(0, 8)}`,
      mqttClientId: `test-client-${uuidv4().substring(0, 8)}`
    };
    
    return 1; // Return default gateway ID
  }
}

/**
 * Register a demo device through the gateway
 */
async function registerDevice(gatewayId) {
  console.log(`\n===== REGISTERING DEVICE: ${config.deviceName} =====`);
  
  try {
    const response = await fetch(`${config.emsServerUrl}/api/gateways/${gatewayId}/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': credentials.apiKey || 'test-key'
      },
      body: JSON.stringify({
        name: config.deviceName,
        type: config.deviceType,
        serialNumber: config.deviceId,
        manufacturer: 'Demo Manufacturer',
        model: 'Demo Model',
        firmwareVersion: '1.0.0',
        protocol: 'modbus',
        connectionStatus: 'connected'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register device: ${response.status} ${response.statusText}`);
    }
    
    const device = await response.json();
    console.log(`  ✓ Device registered with ID: ${device.id || 'unknown'}`);
    return device.id || 999; // Return device ID for further operations
  } catch (error) {
    console.error('❌ Device registration failed:', error.message);
    return 999; // Return default device ID
  }
}

/**
 * Initialize MQTT connection to the broker
 */
function setupMqttConnection() {
  console.log('\n===== SETTING UP MQTT CONNECTION =====');
  
  try {
    // Setup connection options
    const mqttOptions = {
      clientId: credentials.mqttClientId || `test-gateway-${uuidv4().substring(0, 8)}`,
      username: credentials.mqttUsername || 'test-user',
      password: credentials.mqttPassword || 'test-password',
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      will: {
        topic: `gateways/${config.gatewayId}/status`,
        payload: JSON.stringify({ status: 'offline', timestamp: new Date().toISOString() }),
        qos: 1,
        retain: false
      }
    };
    
    console.log(`Connecting to MQTT broker at ${config.mqttBrokerUrl}...`);
    console.log(`Using client ID: ${mqttOptions.clientId}`);
    
    // Connect to the broker
    mqttClient = mqtt.connect(config.mqttBrokerUrl, mqttOptions);
    
    // Setup event handlers
    mqttClient.on('connect', () => {
      console.log('  ✓ Successfully connected to MQTT broker');
      
      // Subscribe to topics
      const topics = [
        `gateways/${config.gatewayId}/commands`,
        `devices/+/commands`
      ];
      
      topics.forEach(topic => {
        mqttClient.subscribe(topic, { qos: 1 }, (err) => {
          if (!err) {
            console.log(`  ✓ Subscribed to ${topic}`);
          } else {
            console.error(`  ❌ Failed to subscribe to ${topic}: ${err.message}`);
          }
        });
      });
      
      // Publish gateway online status
      publishGatewayStatus('online');
    });
    
    mqttClient.on('error', (error) => {
      console.error(`  ❌ MQTT connection error: ${error.message}`);
      stats.mqttErrors++;
    });
    
    mqttClient.on('reconnect', () => {
      console.log('  ⟲ Attempting to reconnect to MQTT broker...');
    });
    
    mqttClient.on('message', (topic, message) => {
      console.log(`  ← Received message on ${topic}: ${message.toString()}`);
      
      try {
        const data = JSON.parse(message.toString());
        
        // If it's a command, send a response
        if (topic.includes('/commands')) {
          const responseTopic = topic.replace('/commands', '/commands/response');
          const response = {
            commandId: data.commandId || uuidv4(),
            status: 'completed',
            result: { success: true, message: 'Command executed successfully' },
            timestamp: new Date().toISOString()
          };
          
          mqttClient.publish(responseTopic, JSON.stringify(response), { qos: 1 }, (err) => {
            if (!err) {
              console.log(`  → Sent response to ${responseTopic}`);
              stats.mqttSuccess++;
            } else {
              console.error(`  ❌ Failed to send response: ${err.message}`);
              stats.mqttErrors++;
            }
          });
        }
      } catch (error) {
        console.error(`  ❌ Failed to process message: ${error.message}`);
      }
    });
    
    mqttClient.on('close', () => {
      console.log('  ⚠️ MQTT connection closed');
    });
    
  } catch (error) {
    console.error(`❌ Failed to setup MQTT connection: ${error.message}`);
  }
}

/**
 * Publish gateway status via MQTT
 */
function publishGatewayStatus(status) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('  ❌ Cannot publish gateway status: MQTT client not connected');
    return;
  }
  
  const topic = `gateways/${config.gatewayId}/status`;
  const payload = JSON.stringify({
    status: status,
    gatewayId: config.gatewayId,
    timestamp: new Date().toISOString()
  });
  
  mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
    if (!err) {
      console.log(`  → Published gateway status (${status}) to ${topic}`);
      stats.mqttSuccess++;
    } else {
      console.error(`  ❌ Failed to publish gateway status: ${err.message}`);
      stats.mqttErrors++;
    }
  });
}

/**
 * Publish device telemetry data via MQTT
 */
function publishDeviceTelemetry(deviceId) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('  ❌ Cannot publish telemetry: MQTT client not connected');
    stats.mqttErrors++;
    return;
  }
  
  stats.mqttMessages++;
  
  // Generate random telemetry data based on device type
  let telemetry;
  if (config.deviceType === 'smart_meter') {
    telemetry = {
      power: Math.round(Math.random() * 5000), // Watts
      energy: Math.round(Math.random() * 100 * 100) / 100, // kWh
      voltage: 230 + (Math.random() * 10 - 5), // Volts
      current: Math.round(Math.random() * 20 * 100) / 100, // Amps
      frequency: 50 + (Math.random() * 0.2 - 0.1), // Hz
      powerFactor: 0.9 + (Math.random() * 0.1), // 0-1
      reactiveEnergy: Math.round(Math.random() * 50 * 100) / 100, // kVArh
      timestamp: new Date().toISOString()
    };
  } else {
    telemetry = {
      status: Math.random() > 0.1 ? 'operational' : 'warning',
      value: Math.round(Math.random() * 100 * 10) / 10,
      timestamp: new Date().toISOString()
    };
  }
  
  const topic = `devices/${deviceId}/telemetry`;
  const payload = JSON.stringify(telemetry);
  
  mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
    if (!err) {
      console.log(`  → Published telemetry to ${topic}`);
      stats.mqttSuccess++;
    } else {
      console.error(`  ❌ Failed to publish telemetry: ${err.message}`);
      stats.mqttErrors++;
    }
  });
}

/**
 * Send device status update via HTTP API
 */
async function sendDeviceStatusHttp(deviceId) {
  console.log(`\n----- Sending HTTP device status update -----`);
  stats.httpRequests++;
  
  try {
    const status = Math.random() > 0.1 ? 'online' : 'maintenance';
    const response = await fetch(`${config.emsServerUrl}/api/devices/${deviceId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': credentials.apiKey || 'test-key'
      },
      body: JSON.stringify({
        status: status,
        connectionQuality: Math.round(Math.random() * 100),
        lastCommunication: new Date().toISOString(),
        errorCode: status === 'online' ? null : Math.floor(Math.random() * 100),
        errorMessage: status === 'online' ? null : 'Simulated error condition'
      })
    });
    
    if (response.ok) {
      console.log(`  ✓ Device status updated via HTTP: ${status}`);
      stats.httpSuccess++;
    } else {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`  ❌ Failed to update device status via HTTP: ${error.message}`);
    stats.httpErrors++;
  }
}

/**
 * Test gateway connection via HTTP API
 */
async function testGatewayConnection(gatewayId) {
  console.log(`\n----- Testing gateway connection via HTTP -----`);
  stats.httpRequests++;
  
  try {
    const response = await fetch(`${config.emsServerUrl}/api/gateways/${gatewayId}/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': credentials.apiKey || 'test-key'
      },
      body: JSON.stringify({
        testId: uuidv4(),
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`  ✓ Gateway connection test successful: ${JSON.stringify(result)}`);
      stats.httpSuccess++;
    } else {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`  ❌ Gateway connection test failed: ${error.message}`);
    stats.httpErrors++;
  }
}

/**
 * Display test statistics
 */
function displayStats() {
  console.log('\n\n=========== TEST RESULTS ===========');
  console.log('HTTP Communication:');
  console.log(`  Total Requests: ${stats.httpRequests}`);
  console.log(`  Successful: ${stats.httpSuccess}`);
  console.log(`  Errors: ${stats.httpErrors}`);
  console.log(`  Success Rate: ${stats.httpRequests > 0 ? Math.round((stats.httpSuccess / stats.httpRequests) * 100) : 0}%`);
  
  console.log('\nMQTT Communication:');
  console.log(`  Total Messages: ${stats.mqttMessages}`);
  console.log(`  Successful: ${stats.mqttSuccess}`);
  console.log(`  Errors: ${stats.mqttErrors}`);
  console.log(`  Success Rate: ${stats.mqttMessages > 0 ? Math.round((stats.mqttSuccess / stats.mqttMessages) * 100) : 0}%`);
  
  console.log('\nOverall Assessment:');
  const httpSuccess = stats.httpRequests > 0 && (stats.httpSuccess / stats.httpRequests) >= 0.8;
  const mqttSuccess = stats.mqttMessages > 0 && (stats.mqttSuccess / stats.mqttMessages) >= 0.8;
  
  if (httpSuccess && mqttSuccess) {
    console.log('✅ Both HTTP and MQTT communications are WORKING PROPERLY');
  } else if (httpSuccess) {
    console.log('⚠️ HTTP communication is working, but MQTT has issues');
  } else if (mqttSuccess) {
    console.log('⚠️ MQTT communication is working, but HTTP has issues');
  } else {
    console.log('❌ Both HTTP and MQTT communications are FAILING');
  }
  
  console.log('====================================\n');
}

/**
 * Clean up connections and exit
 */
function cleanup() {
  console.log('\n===== CLEANING UP =====');
  
  if (mqttClient && mqttClient.connected) {
    console.log('Publishing offline status...');
    publishGatewayStatus('offline');
    
    console.log('Disconnecting MQTT client...');
    mqttClient.end(true, {}, () => {
      console.log('MQTT client disconnected');
    });
  }
  
  displayStats();
  console.log('Fake gateway simulation complete');
}

/**
 * Main function to run the fake gateway simulation
 */
async function main() {
  console.log('\n========================================');
  console.log('   FAKE GATEWAY SIMULATOR STARTING');
  console.log(' Testing EMS Server Connectivity & Data');
  console.log('========================================\n');
  
  try {
    // Register gateway and get gateway ID
    const gatewayId = await registerGateway();
    
    // Register a demo device
    const deviceId = await registerDevice(gatewayId);
    
    // Setup MQTT connection
    setupMqttConnection();
    
    // Test gateway connection
    await testGatewayConnection(gatewayId);
    
    // Setup HTTP device status updates
    const httpInterval = setInterval(() => {
      sendDeviceStatusHttp(deviceId);
    }, config.httpIntervalMs);
    
    // Setup MQTT telemetry publishing
    const mqttInterval = setInterval(() => {
      publishDeviceTelemetry(deviceId);
    }, config.mqttIntervalMs);
    
    // Set timeout to stop the test after specified duration
    setTimeout(() => {
      console.log(`\nTest duration (${config.runDurationMs / 1000} seconds) completed`);
      clearInterval(httpInterval);
      clearInterval(mqttInterval);
      cleanup();
    }, config.runDurationMs);
    
  } catch (error) {
    console.error('Error in main execution:', error);
    cleanup();
  }
}

// Start the simulation
main().catch(console.error);