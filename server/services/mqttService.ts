import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { storage } from '../storage';
import { broadcastDeviceReading, broadcastEnergyReading } from './websocketService';
import mqttPattern from 'mqtt-pattern';
import { v4 as uuidv4 } from 'uuid';

// MQTT topic patterns
const TOPIC_PATTERNS = {
  DEVICE_TELEMETRY: 'ems/+siteId/devices/+deviceId/telemetry',
  DEVICE_STATUS: 'ems/+siteId/devices/+deviceId/status',
  DEVICE_COMMAND: 'ems/+siteId/devices/+deviceId/commands',
  DEVICE_COMMAND_RESPONSE: 'ems/+siteId/devices/+deviceId/commands/response',
  SITE_ENERGY: 'ems/+siteId/energy',
  SYSTEM_STATUS: 'ems/system/status',
};

// Store for pending commands
interface PendingCommand {
  id: string;
  deviceId: number;
  siteId: number;
  command: string;
  parameters: any;
  timestamp: Date;
  timeoutId: NodeJS.Timeout;
  callback?: (success: boolean, response?: any) => void;
}

// Command timeout in milliseconds
const COMMAND_TIMEOUT = 30000; // 30 seconds

// Store for pending commands
const pendingCommands: Map<string, PendingCommand> = new Map();

let mqttClient: MqttClient | null = null;
let isConnected = false;

// Initialize MQTT client
export async function initMqttClient(): Promise<boolean> {
  if (mqttClient) {
    console.log('MQTT client already initialized');
    return isConnected;
  }

  const mqttOptions: IClientOptions = {
    clientId: `ems-server-${uuidv4()}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    // Add credentials if needed
    // username: process.env.MQTT_USERNAME,
    // password: process.env.MQTT_PASSWORD,
  };

  try {
    // Connect to MQTT broker
    // For local development, we can use a local broker or a public one
    // For production, this should be a secured, properly configured broker
    const brokerUrl = process.env.MQTT_BROKER_URL;
    
    // If no broker URL is provided in development, use a fake URL that will gracefully fail
    // but won't block the server from starting
    if (!brokerUrl && process.env.NODE_ENV === 'development') {
      console.log('Development mode: MQTT broker URL not provided, using mock broker.');
      // Return true to allow the system to continue initialization
      // The MQTT client won't be available, but this won't block the server
      return true;
    } else if (!brokerUrl) {
      console.log('No MQTT broker URL provided, MQTT services disabled.');
      return false;
    }
    
    console.log(`Connecting to MQTT broker at ${brokerUrl}`);
    
    // Create a new promise to handle connection
    return new Promise((resolve) => {
      try {
        mqttClient = mqtt.connect(brokerUrl, mqttOptions);
        
        // Handle connection events
        mqttClient.on('connect', () => {
          console.log('Connected to MQTT broker');
          isConnected = true;
          
          // Subscribe to relevant topics
          subscribeToTopics();
          resolve(true);
        });

        mqttClient.on('error', (error) => {
          console.error('MQTT connection error:', error);
          isConnected = false;
        });

        mqttClient.on('offline', () => {
          console.log('MQTT client offline');
          isConnected = false;
        });

        mqttClient.on('reconnect', () => {
          console.log('MQTT client reconnecting');
        });

        mqttClient.on('close', () => {
          console.log('MQTT connection closed');
          isConnected = false;
        });

        // Set up message handler
        mqttClient.on('message', handleMqttMessage);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          resolve(isConnected);
        }, 5000);
      } catch (connectError) {
        console.error('Error connecting to MQTT broker:', connectError);
        resolve(false);
      }
    });
  } catch (error) {
    console.error('Failed to initialize MQTT client:', error);
    return false;
  }
}

// Subscribe to relevant topics
function subscribeToTopics() {
  if (!mqttClient || !isConnected) {
    console.error('MQTT client not connected');
    return;
  }

  // Subscribe to all device telemetry topics
  mqttClient.subscribe('ems/+/devices/+/telemetry', (err) => {
    if (err) {
      console.error('Error subscribing to device telemetry:', err);
    } else {
      console.log('Subscribed to device telemetry topics');
    }
  });

  // Subscribe to all device status topics
  mqttClient.subscribe('ems/+/devices/+/status', (err) => {
    if (err) {
      console.error('Error subscribing to device status:', err);
    } else {
      console.log('Subscribed to device status topics');
    }
  });

  // Subscribe to command responses
  mqttClient.subscribe('ems/+/devices/+/commands/response', (err) => {
    if (err) {
      console.error('Error subscribing to command responses:', err);
    } else {
      console.log('Subscribed to command response topics');
    }
  });

  // Subscribe to site energy topics
  mqttClient.subscribe('ems/+/energy', (err) => {
    if (err) {
      console.error('Error subscribing to site energy:', err);
    } else {
      console.log('Subscribed to site energy topics');
    }
  });

  // Subscribe to system status
  mqttClient.subscribe('ems/system/status', (err) => {
    if (err) {
      console.error('Error subscribing to system status:', err);
    } else {
      console.log('Subscribed to system status topics');
    }
  });
}

interface MqttParams {
  siteId?: string;
  deviceId?: string;
  [key: string]: string | undefined;
}

// Handle incoming MQTT messages
async function handleMqttMessage(topic: string, message: Buffer) {
  try {
    console.log(`MQTT message received on topic: ${topic}`);
    
    let messageData: any;
    try {
      messageData = JSON.parse(message.toString());
    } catch (error) {
      console.error('Failed to parse MQTT message:', error);
      return;
    }

    // Check if the topic matches device telemetry pattern
    if (mqttPattern.matches(TOPIC_PATTERNS.DEVICE_TELEMETRY, topic)) {
      const params = mqttPattern.extract(TOPIC_PATTERNS.DEVICE_TELEMETRY, topic) as MqttParams;
      if (params.siteId && params.deviceId) {
        await handleDeviceTelemetry(parseInt(params.siteId), parseInt(params.deviceId), messageData);
      }
    }
    // Check if the topic matches device status pattern
    else if (mqttPattern.matches(TOPIC_PATTERNS.DEVICE_STATUS, topic)) {
      const params = mqttPattern.extract(TOPIC_PATTERNS.DEVICE_STATUS, topic) as MqttParams;
      if (params.siteId && params.deviceId) {
        await handleDeviceStatus(parseInt(params.siteId), parseInt(params.deviceId), messageData);
      }
    }
    // Check if the topic matches command response pattern
    else if (mqttPattern.matches(TOPIC_PATTERNS.DEVICE_COMMAND_RESPONSE, topic)) {
      const params = mqttPattern.extract(TOPIC_PATTERNS.DEVICE_COMMAND_RESPONSE, topic) as MqttParams;
      if (params.siteId && params.deviceId) {
        handleCommandResponse(parseInt(params.siteId), parseInt(params.deviceId), messageData);
      }
    }
    // Check if the topic matches site energy pattern
    else if (mqttPattern.matches(TOPIC_PATTERNS.SITE_ENERGY, topic)) {
      const params = mqttPattern.extract(TOPIC_PATTERNS.SITE_ENERGY, topic) as MqttParams;
      if (params.siteId) {
        await handleSiteEnergy(parseInt(params.siteId), messageData);
      }
    }
    // Check if the topic matches system status
    else if (topic === TOPIC_PATTERNS.SYSTEM_STATUS) {
      handleSystemStatus(messageData);
    }
    else {
      console.log(`Unhandled MQTT topic: ${topic}`);
    }
  } catch (error) {
    console.error('Error handling MQTT message:', error);
  }
}

// Handle device telemetry data
async function handleDeviceTelemetry(siteId: number, deviceId: number, data: any) {
  try {
    console.log(`Processing telemetry for device ${deviceId} in site ${siteId}`);
    
    // Ensure device exists
    const device = await storage.getDevice(deviceId);
    if (!device) {
      console.error(`Unknown device: ${deviceId}`);
      return;
    }
    
    // Format device reading
    const deviceReading = {
      deviceId,
      timestamp: new Date(data.timestamp) || new Date(),
      power: data.power !== undefined ? Number(data.power) : null,
      energy: data.energy !== undefined ? Number(data.energy) : null,
      stateOfCharge: data.stateOfCharge !== undefined ? Number(data.stateOfCharge) : null,
      voltage: data.voltage !== undefined ? Number(data.voltage) : null,
      current: data.current !== undefined ? Number(data.current) : null,
      frequency: data.frequency !== undefined ? Number(data.frequency) : null,
      temperature: data.temperature !== undefined ? Number(data.temperature) : null,
      additionalData: data.additionalData || null
    };
    
    // Save reading to database
    const savedReading = await storage.createDeviceReading(deviceReading);
    
    // Broadcast to WebSocket clients
    broadcastDeviceReading(deviceId, savedReading);
    
    // Update device status if provided
    if (data.status) {
      await storage.updateDevice(deviceId, { 
        status: data.status,
        updatedAt: new Date()
      });
    }
    
    console.log(`Processed telemetry for device ${deviceId}`);
  } catch (error) {
    console.error(`Error handling device telemetry for device ${deviceId}:`, error);
  }
}

// Handle device status updates
async function handleDeviceStatus(siteId: number, deviceId: number, data: any) {
  try {
    console.log(`Processing status update for device ${deviceId} in site ${siteId}`);
    
    // Ensure device exists
    const device = await storage.getDevice(deviceId);
    if (!device) {
      console.error(`Unknown device: ${deviceId}`);
      return;
    }
    
    // Update device status
    await storage.updateDevice(deviceId, { 
      status: data.status,
      updatedAt: new Date(),
      // Include any additional status information
      ...(data.firmwareVersion ? { firmwareVersion: data.firmwareVersion } : {}),
      ...(data.ipAddress ? { ipAddress: data.ipAddress } : {})
    });
    
    console.log(`Updated status for device ${deviceId} to ${data.status}`);
  } catch (error) {
    console.error(`Error handling device status for device ${deviceId}:`, error);
  }
}

// Handle site energy data
async function handleSiteEnergy(siteId: number, data: any) {
  try {
    console.log(`Processing energy data for site ${siteId}`);
    
    // Ensure site exists
    const site = await storage.getSite(siteId);
    if (!site) {
      console.error(`Unknown site: ${siteId}`);
      return;
    }
    
    // Format energy reading
    const energyReading = {
      siteId,
      timestamp: new Date(data.timestamp) || new Date(),
      gridPower: data.gridPower !== undefined ? Number(data.gridPower) : null,
      solarPower: data.solarPower !== undefined ? Number(data.solarPower) : null,
      batteryPower: data.batteryPower !== undefined ? Number(data.batteryPower) : null,
      evPower: data.evPower !== undefined ? Number(data.evPower) : null,
      homePower: data.homePower !== undefined ? Number(data.homePower) : null,
      gridEnergy: data.gridEnergy !== undefined ? Number(data.gridEnergy) : null,
      solarEnergy: data.solarEnergy !== undefined ? Number(data.solarEnergy) : null,
      batteryEnergy: data.batteryEnergy !== undefined ? Number(data.batteryEnergy) : null,
      evEnergy: data.evEnergy !== undefined ? Number(data.evEnergy) : null,
      homeEnergy: data.homeEnergy !== undefined ? Number(data.homeEnergy) : null,
      selfSufficiency: data.selfSufficiency !== undefined ? Number(data.selfSufficiency) : null,
      carbon: data.carbon !== undefined ? Number(data.carbon) : null
    };
    
    // Save reading to database
    const savedReading = await storage.createEnergyReading(energyReading);
    
    // Broadcast to WebSocket clients
    broadcastEnergyReading(siteId, savedReading);
    
    console.log(`Processed energy data for site ${siteId}`);
  } catch (error) {
    console.error(`Error handling site energy for site ${siteId}:`, error);
  }
}

// Handle system status updates
function handleSystemStatus(data: any) {
  console.log('System status update:', data);
  // Process system-wide status updates
  // This can include server health, broker health, etc.
}

// Handle command responses
function handleCommandResponse(siteId: number, deviceId: number, response: any) {
  if (!response.commandId) {
    console.error('Command response missing commandId');
    return;
  }
  
  const pendingCommand = pendingCommands.get(response.commandId);
  
  if (!pendingCommand) {
    console.log(`No pending command found with ID ${response.commandId}`);
    return;
  }
  
  // Clear the timeout
  clearTimeout(pendingCommand.timeoutId);
  
  // Remove from pending commands
  pendingCommands.delete(response.commandId);
  
  // Call the callback if provided
  if (pendingCommand.callback) {
    pendingCommand.callback(response.success, response);
  }
  
  console.log(`Command ${response.commandId} completed with status: ${response.success ? 'success' : 'failure'}`);
}

// Send command to device
export async function sendDeviceCommand(
  siteId: number,
  deviceId: number,
  command: string,
  parameters: any = {}
): Promise<{ success: boolean; response?: any; error?: string }> {
  // Return mock success in development mode if MQTT is not available
  if (process.env.NODE_ENV === 'development' && (!mqttClient || !isConnected)) {
    console.log(`Development mode: Simulating command ${command} for device ${deviceId}`);
    return { 
      success: true, 
      response: {
        message: 'Command simulated in development mode',
        commandId: 'mock-command',
        timestamp: new Date().toISOString(),
        status: 'simulated'
      }
    };
  }
  
  if (!mqttClient || !isConnected) {
    return { 
      success: false, 
      error: 'MQTT client not connected' 
    };
  }
  
  try {
    // Ensure device exists
    const device = await storage.getDevice(deviceId);
    if (!device) {
      return { 
        success: false, 
        error: `Unknown device: ${deviceId}` 
      };
    }
    
    // Generate a unique command ID
    const commandId = uuidv4();
    
    // Create command payload
    const commandPayload = {
      commandId,
      command,
      parameters,
      timestamp: new Date().toISOString()
    };
    
    // Convert to string
    const payloadString = JSON.stringify(commandPayload);
    
    // Create command topic
    const commandTopic = `ems/${siteId}/devices/${deviceId}/commands`;
    
    return new Promise((resolve) => {
      // Set up timeout for command
      const timeoutId = setTimeout(() => {
        // Remove from pending commands
        pendingCommands.delete(commandId);
        
        resolve({ 
          success: false, 
          error: 'Command timed out' 
        });
      }, COMMAND_TIMEOUT);
      
      // Store pending command
      pendingCommands.set(commandId, {
        id: commandId,
        deviceId,
        siteId,
        command,
        parameters,
        timestamp: new Date(),
        timeoutId,
        callback: (success, response) => {
          resolve({ 
            success, 
            response 
          });
        }
      });
      
      // Publish command
      mqttClient!.publish(commandTopic, payloadString, { qos: 1 }, (err) => {
        if (err) {
          // Clear timeout
          clearTimeout(timeoutId);
          
          // Remove from pending commands
          pendingCommands.delete(commandId);
          
          resolve({ 
            success: false, 
            error: `Failed to publish command: ${err.message}` 
          });
        } else {
          console.log(`Command ${commandId} sent to device ${deviceId}`);
        }
      });
    });
  } catch (error) {
    console.error(`Error sending command to device ${deviceId}:`, error);
    return { 
      success: false, 
      error: `Internal error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// Simulate a device connection and telemetry for development/testing
export async function simulateDeviceTelemetry(deviceId: number) {
  try {
    // Ensure device exists
    const device = await storage.getDevice(deviceId);
    if (!device) {
      console.error(`Cannot simulate unknown device: ${deviceId}`);
      return false;
    }
    
    // Get site ID
    const siteId = device.siteId;
    
    // Create telemetry topic
    const telemetryTopic = `ems/${siteId}/devices/${deviceId}/telemetry`;
    
    // Generate simulated telemetry based on device type
    let telemetryData: any = {
      timestamp: new Date().toISOString()
    };
    
    switch (device.type) {
      case 'solar_pv':
        telemetryData = {
          ...telemetryData,
          power: Math.random() * 5000, // 0-5kW
          energy: Math.random() * 20, // 0-20kWh daily
          voltage: 230 + (Math.random() * 10 - 5), // ~230V
          current: Math.random() * 20, // 0-20A
          temperature: 25 + (Math.random() * 20 - 10), // 15-35°C
          additionalData: {
            irradiance: Math.random() * 1000, // 0-1000 W/m²
            panelEfficiency: 0.18 + (Math.random() * 0.04 - 0.02) // ~18%
          }
        };
        break;
        
      case 'battery_storage':
        telemetryData = {
          ...telemetryData,
          power: (Math.random() > 0.5 ? 1 : -1) * Math.random() * 3000, // -3kW to 3kW
          energy: Math.random() * 10, // 0-10kWh
          stateOfCharge: Math.random() * 100, // 0-100%
          voltage: 48 + (Math.random() * 4 - 2), // ~48V
          current: (Math.random() > 0.5 ? 1 : -1) * Math.random() * 60, // -60A to 60A
          temperature: 20 + (Math.random() * 15), // 20-35°C
          additionalData: {
            cycleCount: Math.floor(Math.random() * 500),
            healthStatus: "good"
          }
        };
        break;
        
      case 'ev_charger':
        const isCharging = Math.random() > 0.3;
        telemetryData = {
          ...telemetryData,
          power: isCharging ? Math.random() * 11000 : 0, // 0-11kW when charging
          energy: Math.random() * 30, // 0-30kWh session
          voltage: 400 + (Math.random() * 20 - 10), // ~400V
          current: isCharging ? Math.random() * 16 : 0, // 0-16A when charging
          additionalData: {
            isCharging,
            chargingMode: isCharging ? "normal" : "idle",
            connectedVehicle: isCharging ? "EV_ID_12345" : null
          }
        };
        break;
        
      case 'smart_meter':
        const importing = Math.random() > 0.5;
        telemetryData = {
          ...telemetryData,
          power: (importing ? 1 : -1) * Math.random() * 5000, // -5kW to 5kW
          energy: Math.random() * 50, // 0-50kWh daily
          voltage: 230 + (Math.random() * 10 - 5), // ~230V
          current: Math.random() * 25, // 0-25A
          frequency: 50 + (Math.random() * 0.2 - 0.1), // ~50Hz
          additionalData: {
            importEnergy: Math.random() * 30,
            exportEnergy: Math.random() * 20,
            powerFactor: 0.95 + (Math.random() * 0.1 - 0.05)
          }
        };
        break;
        
      case 'heat_pump':
        telemetryData = {
          ...telemetryData,
          power: Math.random() * 3000, // 0-3kW
          energy: Math.random() * 15, // 0-15kWh daily
          temperature: 35 + (Math.random() * 10), // 35-45°C output temp
          additionalData: {
            mode: Math.random() > 0.7 ? "cooling" : "heating",
            targetTemp: 21 + (Math.random() * 4 - 2), // 19-23°C
            ambientTemp: 18 + (Math.random() * 10 - 5), // 13-23°C
            cop: 3 + Math.random() * 2 // COP between 3-5
          }
        };
        break;
        
      default:
        console.log(`Unknown device type: ${device.type}`);
        return false;
    }
    
    // Publish telemetry if MQTT client is connected
    if (mqttClient && isConnected) {
      mqttClient.publish(telemetryTopic, JSON.stringify(telemetryData), { qos: 1 }, (err) => {
        if (err) {
          console.error(`Failed to publish simulated telemetry: ${err.message}`);
          return false;
        } else {
          console.log(`Simulated telemetry sent for device ${deviceId}`);
          return true;
        }
      });
    } else {
      // If MQTT client not ready, simulate direct data handling
      console.log(`MQTT not connected, directly handling simulated telemetry for device ${deviceId}`);
      await handleDeviceTelemetry(siteId, deviceId, telemetryData);
      return true;
    }
  } catch (error) {
    console.error(`Error simulating device telemetry:`, error);
    return false;
  }
}

// Close MQTT connection
export function closeMqttConnection() {
  if (mqttClient) {
    console.log('Closing MQTT connection');
    mqttClient.end(true);
    mqttClient = null;
    isConnected = false;
  }
}

// Check if MQTT client is connected
export function isMqttConnected(): boolean {
  return isConnected && mqttClient !== null;
}