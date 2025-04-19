# MQTT Communication Guide for Energy Management System

This guide details the MQTT implementation for device communication in the EMS platform, focusing on both direct MQTT device connections and gateway-mediated connections.

## 1. MQTT Architecture Overview

MQTT (Message Queuing Telemetry Transport) is used as the primary protocol for real-time device communication in the EMS platform. It provides a lightweight, publish-subscribe model ideal for IoT and energy management applications.

```
                        ┌─────────────────┐
                        │                 │
                        │   MQTT Broker   │
                        │                 │
                        └─────────────────┘
                         ▲               ▲
                         │               │
                         │               │
┌─────────────────┐      │               │      ┌─────────────────┐
│                 │      │               │      │                 │
│  EMS Platform   │◄─────┘               └─────►│   Devices &     │
│  & Services     │                             │   Gateways      │
│                 │                             │                 │
└─────────────────┘                             └─────────────────┘
```

## 2. MQTT Topic Structure

The EMS platform uses a hierarchical topic structure to organize device communication:

### 2.1 Device Topics

```
devices/{deviceId}/telemetry              # Regular device readings
devices/{deviceId}/status                 # Connection and operational status
devices/{deviceId}/commands/request       # Incoming commands
devices/{deviceId}/commands/response      # Command responses
devices/{deviceId}/{deviceType}/{metric}  # Device-specific metrics
```

### 2.2 Site Topics

```
sites/{siteId}/status                     # Site operational status
sites/{siteId}/energy/consumption         # Total site energy consumption
sites/{siteId}/energy/production          # Total site energy production
sites/{siteId}/energy/storage             # Total site storage state
sites/{siteId}/load/forecast              # Load forecasting data
```

### 2.3 Gateway Topics

```
gateways/{gatewayId}/status               # Gateway operational status
gateways/{gatewayId}/devices              # Device discovery information
gateways/{gatewayId}/events               # Gateway events
gateways/{gatewayId}/commands             # Gateway-level commands
gateways/{gatewayId}/heartbeat            # Gateway heartbeat
```

### 2.4 Grid Topics

```
grid/pricing/{regionId}                   # Electricity pricing information
grid/events/{regionId}                    # Grid events (demand response, etc.)
grid/status/{regionId}                    # Grid status information
```

### 2.5 Virtual Power Plant (VPP) Topics

```
vpp/events/external/{providerId}          # External VPP event notifications
vpp/events/{eventId}/responses/{siteId}   # Site responses to VPP events
vpp/programs/{programId}/status           # VPP program status updates
```

### 2.6 V2G (Vehicle-to-Grid) Topics

```
v2g/providers/{providerId}/events         # V2G service provider events
v2g/vehicles/{vehicleId}/status           # V2G vehicle status
v2g/sessions/{sessionId}/telemetry        # V2G session telemetry
```

## 3. MQTT Message Structure

All MQTT messages follow a standardized JSON format:

```json
{
  "timestamp": "2025-04-19T08:30:00.000Z",    // ISO 8601 timestamp
  "deviceId": "bat-001",                      // Source device ID (optional)
  "messageType": "telemetry",                 // Type of message
  "data": {                                   // Message data
    "metric1": 123.45,
    "metric2": "value",
    "nestedData": {
      "subMetric1": true
    }
  },
  "metadata": {                               // Optional metadata
    "version": "1.0.0",
    "gatewayId": "gw-001"                     // If via gateway
  }
}
```

## 4. MQTT Quality of Service (QoS) Levels

The EMS platform uses different QoS levels based on message importance:

| Message Type               | QoS Level | Description                        |
|----------------------------|-----------|-----------------------------------|
| Telemetry (regular)        | 0         | At most once delivery             |
| Status updates             | 1         | At least once delivery            |
| Critical telemetry         | 1         | At least once delivery            |
| Commands                   | 1         | At least once delivery            |
| Configuration changes      | 2         | Exactly once delivery             |
| Alarms and alerts          | 1         | At least once delivery            |

## 5. MQTT Implementation by Device Type

### 5.1 Native MQTT-Enabled Devices

Some modern energy devices support MQTT natively. For these devices:

- Configure device to connect directly to the EMS MQTT broker
- Set up device-specific topic mapping
- Configure authentication credentials
- Set appropriate QoS levels

Example configuration for a native MQTT device:

```json
{
  "deviceId": "mqtt-001",
  "connection": {
    "protocol": "mqtt",
    "brokerUrl": "mqtt.ems-platform.com",
    "port": 8883,
    "useTls": true,
    "username": "${DEVICE_USERNAME}",
    "password": "${DEVICE_PASSWORD}",
    "clientId": "device-mqtt-001"
  },
  "topics": {
    "telemetryPublish": "devices/mqtt-001/telemetry",
    "statusPublish": "devices/mqtt-001/status",
    "commandsSubscribe": "devices/mqtt-001/commands/request",
    "responsePublish": "devices/mqtt-001/commands/response"
  },
  "qos": {
    "telemetry": 0,
    "status": 1,
    "commands": 1,
    "response": 1
  }
}
```

### 5.2 OCPP Charging Stations via MQTT Bridge

For OCPP-based charging stations, the system implements an OCPP-to-MQTT bridge:

```
[OCPP Charger] <--WebSocket--> [OCPP-MQTT Bridge] <--MQTT--> [EMS Platform]
```

The bridge translates OCPP messages (StartTransaction, MeterValues, etc.) to MQTT topics:

| OCPP Message      | MQTT Topic                                       |
|-------------------|--------------------------------------------------|
| BootNotification  | devices/{deviceId}/status                        |
| StatusNotification| devices/{deviceId}/status                        |
| MeterValues       | devices/{deviceId}/evcharger/metervalues         |
| StartTransaction  | devices/{deviceId}/evcharger/transaction/start   |
| StopTransaction   | devices/{deviceId}/evcharger/transaction/stop    |

Example message for MeterValues:

```json
{
  "timestamp": "2025-04-19T08:35:20.000Z",
  "deviceId": "charger-001",
  "messageType": "meterValues",
  "data": {
    "connectorId": 1,
    "transactionId": 12345,
    "meterValue": [
      {
        "timestamp": "2025-04-19T08:35:15.000Z",
        "sampledValue": [
          {
            "value": "22.5",
            "context": "Sample.Periodic",
            "format": "Raw",
            "measurand": "Energy.Active.Import.Register",
            "unit": "kWh"
          },
          {
            "value": "11.8",
            "context": "Sample.Periodic",
            "format": "Raw",
            "measurand": "Power.Active.Import",
            "unit": "kW"
          }
        ]
      }
    ]
  }
}
```

### 5.3 SunSpec Solar Devices via MQTT Bridge

For SunSpec-compatible solar inverters, the system implements a SunSpec-to-MQTT bridge:

```
[SunSpec Device] <--Modbus--> [SunSpec-MQTT Bridge] <--MQTT--> [EMS Platform]
```

The bridge periodically polls SunSpec models and publishes to device-specific topics:

| SunSpec Model     | MQTT Topic                                      |
|-------------------|------------------------------------------------|
| Common (1)        | devices/{deviceId}/status                       |
| Inverter (101-103)| devices/{deviceId}/solar/production             |
| Meter (201-204)   | devices/{deviceId}/solar/meter                  |
| Storage (124)     | devices/{deviceId}/solar/storage                |

Example message for solar production:

```json
{
  "timestamp": "2025-04-19T12:15:30.000Z",
  "deviceId": "inv-001",
  "messageType": "telemetry",
  "data": {
    "production": 5280,         // W
    "voltage": {
      "phaseA": 242.1,          // V
      "phaseB": 241.8,          // V
      "phaseC": 242.3           // V
    },
    "current": {
      "phaseA": 7.3,            // A
      "phaseB": 7.2,            // A
      "phaseC": 7.4             // A
    },
    "frequency": 50.02,         // Hz
    "temperature": 41.2,        // °C
    "dailyYield": 32.5,         // kWh
    "totalYield": 28540.7       // kWh
  }
}
```

### 5.4 EEBus Heat Pumps via MQTT Bridge

For EEBus-compatible heat pumps, the system implements an EEBus-to-MQTT bridge:

```
[EEBus Device] <--SHIP/SPINE--> [EEBus-MQTT Bridge] <--MQTT--> [EMS Platform]
```

The bridge translates EEBus SPINE messages to MQTT topics:

| EEBus Function    | MQTT Topic                                         |
|-------------------|----------------------------------------------------|
| DeviceConfiguration | devices/{deviceId}/status                         |
| Measurements      | devices/{deviceId}/heatpump/measurements           |
| SetPoints         | devices/{deviceId}/heatpump/setpoints              |
| OperatingModes    | devices/{deviceId}/heatpump/modes                  |
| LoadControl       | devices/{deviceId}/heatpump/loadcontrol            |

Example message for heat pump measurements:

```json
{
  "timestamp": "2025-04-19T15:42:10.000Z",
  "deviceId": "hp-001",
  "messageType": "telemetry",
  "data": {
    "flowTemperature": 45.5,     // °C
    "returnTemperature": 35.2,   // °C
    "outdoorTemperature": 6.8,   // °C
    "power": 2150,               // W
    "cop": 3.8,                  // Coefficient of Performance
    "compressorSpeed": 65,       // %
    "mode": "heating",           // operating mode
    "totalEnergyConsumption": 8720.5, // kWh
    "totalHeatProduction": 33142.0    // kWh
  }
}
```

## 6. Gateway-Mediated MQTT Communication

For devices that connect through a gateway, the gateway handles the protocol translation and MQTT communication.

### 6.1 Gateway Connection Flow

1. Gateway registers with EMS platform and receives credentials
2. Gateway establishes secure MQTT connection to broker
3. Gateway publishes its status to `gateways/{gatewayId}/status`
4. Gateway subscribes to its command topic `gateways/{gatewayId}/commands`
5. Gateway discovers local devices or uses configured device list
6. Gateway connects to local devices via appropriate protocols
7. Gateway publishes device data to relevant MQTT topics
8. Gateway subscribes to device command topics to receive control instructions

### 6.2 Gateway Authentication

Gateways use client certificate authentication or username/password with TLS:

```
Username: gateway-{gatewayId}
Password: [Securely provisioned during registration]
Client ID: gateway-{gatewayId}
```

### 6.3 Gateway Heartbeat

Gateways publish periodic heartbeats to verify connectivity:

```json
{
  "timestamp": "2025-04-19T08:45:00.000Z",
  "gatewayId": "gw-001",
  "messageType": "heartbeat",
  "data": {
    "uptimeSeconds": 86400,
    "deviceCount": 5,
    "deviceIds": ["inv-001", "bat-001", "meter-001", "charger-001", "hp-001"],
    "cpuLoad": 12.5,
    "memoryUsage": 38.2,
    "connectionQuality": 98
  }
}
```

### 6.4 Gateway Device Mapping

The gateway maintains a mapping between local device IDs and EMS platform device IDs:

```json
{
  "localDevices": [
    {
      "localId": "modbus-1",
      "deviceId": "inv-001",
      "status": "online",
      "lastCommunication": "2025-04-19T08:44:55.000Z"
    },
    {
      "localId": "modbus-2",
      "deviceId": "bat-001",
      "status": "online",
      "lastCommunication": "2025-04-19T08:44:50.000Z"
    }
  ]
}
```

## 7. MQTT Security Implementation

The EMS platform implements multiple security layers for MQTT communication:

### 7.1 Transport Security

- TLS 1.3 for all MQTT connections
- Certificate verification for broker authentication
- Secure cipher suites and key exchange

### 7.2 Authentication

- Client certificate authentication for critical systems
- Username/password authentication with strong password policies
- OAuth2 token-based authentication for web/mobile clients

### 7.3 Authorization

- Topic-based access control
- Device can only publish/subscribe to its own topics
- Role-based permissions for administrative operations

### 7.4 Message Security

- JSON message validation
- Rate limiting to prevent DoS attacks
- Message integrity checks

## 8. MQTT Monitoring and Diagnostics

The EMS platform includes comprehensive MQTT monitoring:

### 8.1 Connection Monitoring

- Status of all device and gateway connections
- Last seen timestamps
- Connection quality metrics
- Reconnection frequency

### 8.2 Message Flow Analytics

- Message rates by topic
- Message size statistics
- Delivery latency monitoring
- QoS delivery success rates

### 8.3 Diagnostic Topics

Special diagnostic topics allow troubleshooting:

```
$SYS/broker/clients/connected           # Number of connected clients
$SYS/broker/messages/published          # Total messages published
diagnostics/devices/{deviceId}/logs     # Device-specific logs
diagnostics/gateways/{gatewayId}/logs   # Gateway-specific logs
```

## 9. MQTT Persistent Sessions and Message Retention

The EMS platform utilizes MQTT features for reliability:

### 9.1 Persistent Sessions

- Critical devices use persistent sessions
- Subscriptions are maintained across disconnections
- QoS 1 and 2 messages delivered after reconnection

### 9.2 Retained Messages

- Status topics use retained messages
- Last value always available for new subscribers
- Device configuration uses retained messages

### 9.3 Message Expiry

- Telemetry messages expire after defined interval
- Status updates remain until replaced
- Commands expire if not processed within timeout

## 10. MQTT Implementation Examples

### 10.1 Subscribing to Device Telemetry

```typescript
// TypeScript example using MQTT.js
import * as mqtt from 'async-mqtt';

async function subscribeToDeviceTelemetry(deviceId: string) {
  const client = await mqtt.connectAsync('mqtts://mqtt.ems-platform.com:8883', {
    username: 'service-account',
    password: process.env.MQTT_PASSWORD,
    clientId: `service-${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    rejectUnauthorized: true
  });
  
  // Subscribe to device telemetry
  await client.subscribe(`devices/${deviceId}/telemetry`, { qos: 0 });
  
  // Handle incoming messages
  client.on('message', (topic, message) => {
    try {
      const telemetry = JSON.parse(message.toString());
      console.log(`Received telemetry from ${deviceId}:`, telemetry);
      
      // Process telemetry data
      processTelemetry(telemetry);
    } catch (error) {
      console.error('Error processing telemetry:', error);
    }
  });
}

function processTelemetry(telemetry: any) {
  // Implementation depends on application logic
  // Store in database, trigger alerts, update UI, etc.
}
```

### 10.2 Sending a Command to a Device

```typescript
// TypeScript example using MQTT.js
import * as mqtt from 'async-mqtt';

async function sendDeviceCommand(deviceId: string, command: string, params: any) {
  const client = await mqtt.connectAsync('mqtts://mqtt.ems-platform.com:8883', {
    username: 'service-account',
    password: process.env.MQTT_PASSWORD,
    clientId: `service-${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    rejectUnauthorized: true
  });
  
  // Generate unique command ID
  const commandId = `cmd-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  // Prepare command message
  const commandMessage = {
    timestamp: new Date().toISOString(),
    deviceId: deviceId,
    messageType: 'command',
    commandId: commandId,
    data: {
      action: command,
      params: params
    }
  };
  
  // Subscribe to response topic
  await client.subscribe(`devices/${deviceId}/commands/response`, { qos: 1 });
  
  // Set up response handler with timeout
  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Command timeout for deviceId ${deviceId}, commandId ${commandId}`));
    }, 30000); // 30 second timeout
    
    const messageHandler = (topic: string, message: Buffer) => {
      try {
        const response = JSON.parse(message.toString());
        
        // Check if this is the response to our command
        if (response.commandId === commandId) {
          cleanup();
          resolve(response);
        }
      } catch (error) {
        console.error('Error processing response:', error);
      }
    };
    
    client.on('message', messageHandler);
    
    function cleanup() {
      clearTimeout(timeout);
      client.off('message', messageHandler);
    }
  });
  
  // Publish command
  await client.publish(
    `devices/${deviceId}/commands/request`,
    JSON.stringify(commandMessage),
    { qos: 1 }
  );
  
  // Wait for response
  try {
    const response = await responsePromise;
    await client.end();
    return response;
  } catch (error) {
    await client.end();
    throw error;
  }
}

// Example usage
async function setBatteryChargePower(batteryId: string, powerKw: number) {
  try {
    const response = await sendDeviceCommand(batteryId, 'setChargePower', { powerKw });
    console.log('Battery charge power set, response:', response);
    return response.success;
  } catch (error) {
    console.error('Failed to set battery charge power:', error);
    return false;
  }
}
```

### 10.3 Publishing Gateway Status

```typescript
// TypeScript example for a gateway device
import * as mqtt from 'async-mqtt';
import { getSystemInfo } from './system-info';

class GatewayMqttClient {
  private client: mqtt.AsyncMqttClient | null = null;
  private gatewayId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(gatewayId: string) {
    this.gatewayId = gatewayId;
  }
  
  async connect() {
    this.client = await mqtt.connectAsync('mqtts://mqtt.ems-platform.com:8883', {
      username: `gateway-${this.gatewayId}`,
      password: process.env.GATEWAY_PASSWORD,
      clientId: `gateway-${this.gatewayId}`,
      clean: false, // Use persistent session
      rejectUnauthorized: true,
      keepalive: 60
    });
    
    // Subscribe to gateway command topic
    await this.client.subscribe(`gateways/${this.gatewayId}/commands`, { qos: 1 });
    
    // Handle incoming commands
    this.client.on('message', this.handleIncomingMessage.bind(this));
    
    // Publish online status (retained)
    await this.publishStatus('online');
    
    // Start heartbeat
    this.startHeartbeat();
    
    console.log(`Gateway ${this.gatewayId} connected to MQTT broker`);
  }
  
  private async publishStatus(status: 'online' | 'offline') {
    if (!this.client) return;
    
    const statusMessage = {
      timestamp: new Date().toISOString(),
      gatewayId: this.gatewayId,
      messageType: 'status',
      data: {
        status,
        version: process.env.GATEWAY_VERSION || '1.0.0',
        deviceCount: this.getConnectedDeviceCount()
      }
    };
    
    await this.client.publish(
      `gateways/${this.gatewayId}/status`,
      JSON.stringify(statusMessage),
      { qos: 1, retain: true }
    );
  }
  
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      await this.publishHeartbeat();
    }, 60000); // Every minute
  }
  
  private async publishHeartbeat() {
    if (!this.client) return;
    
    const systemInfo = await getSystemInfo();
    const connectedDevices = this.getConnectedDevices();
    
    const heartbeatMessage = {
      timestamp: new Date().toISOString(),
      gatewayId: this.gatewayId,
      messageType: 'heartbeat',
      data: {
        uptimeSeconds: systemInfo.uptime,
        deviceCount: connectedDevices.length,
        deviceIds: connectedDevices.map(d => d.deviceId),
        cpuLoad: systemInfo.cpuLoad,
        memoryUsage: systemInfo.memoryUsage,
        diskUsage: systemInfo.diskUsage,
        connectionQuality: this.getConnectionQuality()
      }
    };
    
    await this.client.publish(
      `gateways/${this.gatewayId}/heartbeat`,
      JSON.stringify(heartbeatMessage),
      { qos: 1 }
    );
  }
  
  private handleIncomingMessage(topic: string, message: Buffer) {
    try {
      const command = JSON.parse(message.toString());
      console.log(`Received command:`, command);
      
      // Process command based on action
      this.processCommand(command);
    } catch (error) {
      console.error('Error processing command:', error);
    }
  }
  
  private processCommand(command: any) {
    // Implementation depends on gateway capabilities
    // Handle device scans, restarts, configuration updates, etc.
  }
  
  private getConnectedDeviceCount(): number {
    // Implementation depends on gateway design
    return this.getConnectedDevices().length;
  }
  
  private getConnectedDevices(): any[] {
    // Implementation depends on gateway design
    // Return array of connected device metadata
    return [];
  }
  
  private getConnectionQuality(): number {
    // Implementation depends on gateway metrics
    // Return a connection quality percentage (0-100)
    return 100;
  }
  
  async publishDeviceTelemetry(deviceId: string, telemetry: any) {
    if (!this.client) return false;
    
    const telemetryMessage = {
      timestamp: new Date().toISOString(),
      deviceId,
      messageType: 'telemetry',
      data: telemetry,
      metadata: {
        gatewayId: this.gatewayId
      }
    };
    
    await this.client.publish(
      `devices/${deviceId}/telemetry`,
      JSON.stringify(telemetryMessage),
      { qos: 0 } // Regular telemetry uses QoS 0
    );
    
    return true;
  }
  
  async publishDeviceStatus(deviceId: string, status: string) {
    if (!this.client) return false;
    
    const statusMessage = {
      timestamp: new Date().toISOString(),
      deviceId,
      messageType: 'status',
      data: {
        status
      },
      metadata: {
        gatewayId: this.gatewayId
      }
    };
    
    await this.client.publish(
      `devices/${deviceId}/status`,
      JSON.stringify(statusMessage),
      { qos: 1, retain: true } // Status updates use QoS 1 and retain
    );
    
    return true;
  }
  
  async disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.client) {
      // Publish offline status before disconnecting
      await this.publishStatus('offline');
      await this.client.end();
      this.client = null;
    }
    
    console.log(`Gateway ${this.gatewayId} disconnected from MQTT broker`);
  }
}
```

## 11. MQTT Bridge Adapters for Protocol Translation

The EMS platform provides adapters to bridge other protocols to MQTT:

### 11.1 Modbus-to-MQTT Adapter

This adapter reads Modbus registers and publishes values to MQTT topics.

```typescript
// Simplified Modbus-to-MQTT bridge example
import * as mqtt from 'async-mqtt';
import ModbusRTU from 'modbus-serial';

class ModbusToMqttBridge {
  private mqttClient: mqtt.AsyncMqttClient | null = null;
  private modbusClient: ModbusRTU | null = null;
  private deviceId: string;
  private deviceTemplate: any;
  private scanInterval: NodeJS.Timeout | null = null;
  
  constructor(deviceId: string, deviceTemplate: any) {
    this.deviceId = deviceId;
    this.deviceTemplate = deviceTemplate;
  }
  
  async connect() {
    // Connect to MQTT broker
    this.mqttClient = await mqtt.connectAsync('mqtts://mqtt.ems-platform.com:8883', {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: `modbus-bridge-${this.deviceId}`,
      clean: true,
      rejectUnauthorized: true
    });
    
    // Connect to Modbus device
    this.modbusClient = new ModbusRTU();
    
    if (this.deviceTemplate.connection.type === 'tcp') {
      await this.modbusClient.connectTCP(
        this.deviceTemplate.connection.host,
        { port: this.deviceTemplate.connection.port || 502 }
      );
    } else if (this.deviceTemplate.connection.type === 'rtu') {
      await this.modbusClient.connectRTUBuffered(
        this.deviceTemplate.connection.serialPort,
        {
          baudRate: this.deviceTemplate.connection.baudRate || 9600,
          dataBits: this.deviceTemplate.connection.dataBits || 8,
          parity: this.deviceTemplate.connection.parity || 'none',
          stopBits: this.deviceTemplate.connection.stopBits || 1
        }
      );
    } else {
      throw new Error(`Unsupported Modbus connection type: ${this.deviceTemplate.connection.type}`);
    }
    
    this.modbusClient.setID(this.deviceTemplate.connection.unitId || 1);
    this.modbusClient.setTimeout(this.deviceTemplate.connection.timeout || 3000);
    
    // Publish device status
    await this.publishDeviceStatus('online');
    
    // Start regular scanning
    this.startScanning();
    
    console.log(`Modbus-to-MQTT bridge started for device ${this.deviceId}`);
  }
  
  private startScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    const scanIntervalMs = this.deviceTemplate.scanInterval || 5000;
    
    this.scanInterval = setInterval(async () => {
      try {
        await this.scanAndPublish();
      } catch (error) {
        console.error(`Error scanning device ${this.deviceId}:`, error);
        
        // Try to reconnect on error
        await this.reconnectIfNeeded();
      }
    }, scanIntervalMs);
    
    console.log(`Scanning device ${this.deviceId} every ${scanIntervalMs}ms`);
  }
  
  private async reconnectIfNeeded() {
    if (!this.modbusClient) return;
    
    try {
      // Test connection with a simple read
      await this.modbusClient.readHoldingRegisters(0, 1);
    } catch (error) {
      console.log(`Connection lost to device ${this.deviceId}, attempting to reconnect...`);
      
      try {
        // Close current connection
        await this.modbusClient.close();
        
        // Reconnect
        if (this.deviceTemplate.connection.type === 'tcp') {
          await this.modbusClient.connectTCP(
            this.deviceTemplate.connection.host,
            { port: this.deviceTemplate.connection.port || 502 }
          );
        } else if (this.deviceTemplate.connection.type === 'rtu') {
          await this.modbusClient.connectRTUBuffered(
            this.deviceTemplate.connection.serialPort,
            {
              baudRate: this.deviceTemplate.connection.baudRate || 9600,
              dataBits: this.deviceTemplate.connection.dataBits || 8,
              parity: this.deviceTemplate.connection.parity || 'none',
              stopBits: this.deviceTemplate.connection.stopBits || 1
            }
          );
        }
        
        this.modbusClient.setID(this.deviceTemplate.connection.unitId || 1);
        this.modbusClient.setTimeout(this.deviceTemplate.connection.timeout || 3000);
        
        console.log(`Successfully reconnected to device ${this.deviceId}`);
        
        // Update device status
        await this.publishDeviceStatus('online');
      } catch (reconnectError) {
        console.error(`Failed to reconnect to device ${this.deviceId}:`, reconnectError);
        
        // Update device status
        await this.publishDeviceStatus('offline');
      }
    }
  }
  
  private async scanAndPublish() {
    if (!this.modbusClient || !this.mqttClient) return;
    
    const readings: Record<string, any> = {
      timestamp: new Date().toISOString()
    };
    
    // Read all registers defined in template
    for (const register of this.deviceTemplate.registers) {
      try {
        let value: number | boolean;
        
        switch (register.type) {
          case 'int16':
            const int16Result = await this.modbusClient.readHoldingRegisters(register.address, 1);
            value = int16Result.data[0];
            if (value > 32767) value -= 65536; // Convert to signed
            break;
            
          case 'uint16':
            const uint16Result = await this.modbusClient.readHoldingRegisters(register.address, 1);
            value = uint16Result.data[0];
            break;
            
          case 'int32':
            const int32Result = await this.modbusClient.readHoldingRegisters(register.address, 2);
            value = (int32Result.data[0] << 16) | int32Result.data[1];
            if (value > 2147483647) value -= 4294967296; // Convert to signed
            break;
            
          case 'uint32':
            const uint32Result = await this.modbusClient.readHoldingRegisters(register.address, 2);
            value = (uint32Result.data[0] << 16) | uint32Result.data[1];
            break;
            
          case 'float32':
            const float32Result = await this.modbusClient.readHoldingRegisters(register.address, 2);
            const buf = Buffer.alloc(4);
            buf.writeUInt16BE(float32Result.data[0], 0);
            buf.writeUInt16BE(float32Result.data[1], 2);
            value = buf.readFloatBE(0);
            break;
            
          case 'coil':
            const coilResult = await this.modbusClient.readCoils(register.address, 1);
            value = coilResult.data[0];
            break;
            
          default:
            console.warn(`Unsupported register type: ${register.type}`);
            continue;
        }
        
        // Apply scaling if defined
        if (register.scaling && typeof value === 'number') {
          value = value * register.scaling;
        }
        
        // Apply mapping if defined
        if (register.mapping && typeof value !== 'boolean') {
          const mappedValue = register.mapping[value];
          if (mappedValue !== undefined) {
            value = mappedValue;
          }
        }
        
        readings[register.name] = value;
      } catch (error) {
        console.error(`Error reading register ${register.name} (${register.address}):`, error);
        readings[register.name] = null;
      }
    }
    
    // Publish telemetry to MQTT
    await this.publishTelemetry(readings);
    
    // Publish type-specific metrics
    await this.publishDeviceTypeMetrics(readings);
  }
  
  private async publishTelemetry(data: Record<string, any>) {
    if (!this.mqttClient) return;
    
    const telemetryMessage = {
      timestamp: data.timestamp,
      deviceId: this.deviceId,
      messageType: 'telemetry',
      data
    };
    
    await this.mqttClient.publish(
      `devices/${this.deviceId}/telemetry`,
      JSON.stringify(telemetryMessage),
      { qos: 0 }
    );
  }
  
  private async publishDeviceTypeMetrics(data: Record<string, any>) {
    if (!this.mqttClient) return;
    
    // Publish to device-type specific topics based on template
    switch (this.deviceTemplate.deviceType) {
      case 'solar_inverter':
        if (data.activePower !== undefined) {
          await this.mqttClient.publish(
            `devices/${this.deviceId}/solar/production`,
            JSON.stringify({
              timestamp: data.timestamp,
              deviceId: this.deviceId,
              messageType: 'telemetry',
              data: {
                production: data.activePower,
                daily: data.dailyYield,
                total: data.totalYield
              }
            }),
            { qos: 0 }
          );
        }
        break;
        
      case 'battery':
        if (data.stateOfCharge !== undefined) {
          await this.mqttClient.publish(
            `devices/${this.deviceId}/battery/soc`,
            JSON.stringify({
              timestamp: data.timestamp,
              deviceId: this.deviceId,
              messageType: 'telemetry',
              data: {
                soc: data.stateOfCharge,
                power: data.power || 0,
                temperature: data.temperature
              }
            }),
            { qos: 0 }
          );
        }
        break;
        
      case 'heat_pump':
        if (data.currentFlowTemperature !== undefined) {
          await this.mqttClient.publish(
            `devices/${this.deviceId}/heatpump/temperature`,
            JSON.stringify({
              timestamp: data.timestamp,
              deviceId: this.deviceId,
              messageType: 'telemetry',
              data: {
                flowTemperature: data.currentFlowTemperature,
                returnTemperature: data.returnTemperature,
                outdoorTemperature: data.outdoorTemperature
              }
            }),
            { qos: 0 }
          );
        }
        break;
        
      case 'meter':
        if (data.activeEnergy !== undefined) {
          await this.mqttClient.publish(
            `devices/${this.deviceId}/meter/reading`,
            JSON.stringify({
              timestamp: data.timestamp,
              deviceId: this.deviceId,
              messageType: 'telemetry',
              data: {
                reading: data.activeEnergy,
                exportedEnergy: data.exportedEnergy
              }
            }),
            { qos: 0 }
          );
        }
        
        if (data.activePower !== undefined) {
          await this.mqttClient.publish(
            `devices/${this.deviceId}/meter/power`,
            JSON.stringify({
              timestamp: data.timestamp,
              deviceId: this.deviceId,
              messageType: 'telemetry',
              data: {
                power: data.activePower,
                voltage: {
                  phaseA: data.voltagePhaseA,
                  phaseB: data.voltagePhaseB,
                  phaseC: data.voltagePhaseC
                },
                current: {
                  phaseA: data.currentPhaseA,
                  phaseB: data.currentPhaseB,
                  phaseC: data.currentPhaseC
                }
              }
            }),
            { qos: 0 }
          );
        }
        break;
    }
  }
  
  private async publishDeviceStatus(status: string) {
    if (!this.mqttClient) return;
    
    const statusMessage = {
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      messageType: 'status',
      data: {
        status,
        connectionType: this.deviceTemplate.connection.type
      }
    };
    
    await this.mqttClient.publish(
      `devices/${this.deviceId}/status`,
      JSON.stringify(statusMessage),
      { qos: 1, retain: true }
    );
  }
  
  async disconnect() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    if (this.modbusClient) {
      try {
        await this.modbusClient.close();
      } catch (error) {
        console.error(`Error closing Modbus connection for device ${this.deviceId}:`, error);
      }
      this.modbusClient = null;
    }
    
    if (this.mqttClient) {
      // Publish offline status before disconnecting
      await this.publishDeviceStatus('offline');
      await this.mqttClient.end();
      this.mqttClient = null;
    }
    
    console.log(`Modbus-to-MQTT bridge stopped for device ${this.deviceId}`);
  }
}
```

## 12. Recommended MQTT Client Libraries

| Language/Platform | Recommended Library       | Features                              |
|-------------------|---------------------------|---------------------------------------|
| JavaScript/Node.js| mqtt.js or async-mqtt     | Promise-based API, WebSocket support  |
| Python            | paho-mqtt                 | Comprehensive, well-documented        |
| Java              | Eclipse Paho              | Enterprise-grade, multi-threading     |
| C/C++             | Eclipse Paho C            | Lightweight, embedded-friendly        |
| Go                | Paho MQTT Go              | Goroutine-friendly API                |
| .NET              | MQTTnet                   | Async/await support, high performance |
| Rust              | rumqtt                    | Memory-safe, async support            |
| Mobile (Android)  | Eclipse Paho Android      | Battery-optimized                     |
| Mobile (iOS)      | CocoaMQTT                 | Native Swift implementation           |

## 13. MQTT Broker Configuration

The EMS platform's MQTT broker is configured for high performance and reliability:

### 13.1 Broker Settings

```
# Connection settings
listener 8883
protocol mqtt
max_connections 100000
connection_messages true

# TLS settings
cafile /etc/mosquitto/ca.crt
certfile /etc/mosquitto/server.crt
keyfile /etc/mosquitto/server.key
tls_version tlsv1.3
require_certificate false

# Auth settings
allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file /etc/mosquitto/acl

# Performance settings
max_queued_messages 1000
max_inflight_messages 20
max_packet_size 2048
message_size_limit 10240
persistence true
persistence_location /var/lib/mosquitto/
persistence_file mosquitto.db
autosave_interval 60
```

### 13.2 Broker ACL Configuration

```
# Default ACL - deny all
topic read $SYS/broker/connection/#
topic deny write $SYS/#
topic deny #

# Device permissions - can only access their own topics
pattern readwrite devices/%u/telemetry
pattern readwrite devices/%u/status
pattern read devices/%u/commands/request
pattern readwrite devices/%u/commands/response

# Gateway permissions - can access gateway topics and device topics
pattern readwrite gateways/%u/#
pattern readwrite devices/+/telemetry
pattern readwrite devices/+/status
pattern read devices/+/commands/request
pattern readwrite devices/+/commands/response

# Service account permissions
user service-account
topic readwrite #

# Admin permissions
user admin
topic readwrite #
```