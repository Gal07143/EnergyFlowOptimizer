# Energy Management System - Device Connectivity Plan

## 1. Connection Architecture Overview

The EMS platform supports two primary connection modes:
1. **Direct Connection**: Devices connect directly to the EMS platform
2. **Gateway-Mediated Connection**: Devices connect to local gateways, which then connect to the EMS platform

```
Direct Connection:
[Device] <--Protocol--> [EMS Platform]

Gateway-Mediated Connection:
[Device] <--Local Protocol--> [Gateway] <--MQTT/REST--> [EMS Platform]
```

## 2. Supported Device Types and Protocols

| Device Type    | Direct Connection Protocols | Gateway Support | Data Polling Frequency |
|----------------|---------------------------|----------------|------------------------|
| Solar Inverter | Modbus TCP/RTU, SunSpec   | Yes            | 5s - 60s              |
| Battery System | Modbus TCP/RTU            | Yes            | 1s - 60s              |
| EV Charger     | OCPP 1.6/2.0, Modbus      | Yes            | Event-based + 60s     |
| Heat Pump      | Modbus TCP/RTU, EEBus     | Yes            | 60s - 300s            |
| Smart Meter    | Modbus TCP/RTU, SML       | Yes            | 1s - 60s              |
| Load Controller| TCP/IP, REST API          | Yes            | Event-based           |

## 3. Connection Methods by Device Type

### 3.1 Solar Inverter

#### Direct Connection:
- **Modbus TCP/IP**: 
  - TCP port 502 (standard) or configurable
  - Register maps configurable per manufacturer model
  - Key data points: power output, daily production, voltage, current, frequency

- **SunSpec Protocol**:
  - Built on Modbus TCP/IP or RTU
  - Standardized register map (SunSpec Alliance)
  - Models 101-103 (inverter), 160 (storage)

#### Gateway Connection:
- Local connection via RS485 or Ethernet to gateway
- Gateway translates to MQTT for cloud communication
- Key considerations: 
  - Gateway needs Modbus master capability
  - Local buffer for intermittent cloud connectivity

### 3.2 Battery Storage System

#### Direct Connection:
- **Modbus TCP/IP**:
  - TCP port 502 or manufacturer-specific
  - Key data points: SoC, power (charge/discharge), temperature, voltage
  - Control commands: charge/discharge setpoints, operation mode

#### Gateway Connection:
- Local RS485 or proprietary protocol to gateway
- Gateway provides standardized API access
- Key considerations:
  - Critical system requiring high reliability
  - Local control logic on gateway for safety
  - Buffered commands for safe operation

### 3.3 EV Charger

#### Direct Connection:
- **OCPP 1.6/2.0**:
  - WebSocket communication
  - JSON-based messages
  - Core functions: start/stop transactions, meter values, status notifications
  
- **Modbus TCP** (for simpler chargers):
  - Limited control but standardized interface
  - Read-only in some implementations

#### Gateway Connection:
- Gateway acts as OCPP central system for local chargers
- Aggregates multiple chargers in a single location
- Key considerations:
  - Authentication handling (RFID, app-based)
  - Load balancing across multiple chargers
  - Offline operation capabilities

### 3.4 Heat Pump

#### Direct Connection:
- **Modbus TCP/RTU**:
  - Standard industrial protocol
  - Key data: temperatures, energy consumption, operational mode
  
- **EEBus Protocol**:
  - Modern protocol for energy devices
  - SPINE as application protocol

#### Gateway Connection:
- Often required due to proprietary manufacturer protocols
- KNX, Zigbee or proprietary RF to gateway
- Gateway provides protocol translation
- Key considerations:
  - Seasonal operation patterns
  - Comfort vs. efficiency trade-offs

### 3.5 Smart Meter

#### Direct Connection:
- **Modbus TCP/RTU**:
  - Standard for industrial meters
  - Key data: energy consumption/production, power quality, instantaneous values
  
- **SML Protocol**:
  - Smart Meter Language
  - Common in European smart meters

#### Gateway Connection:
- Often optical reading of meter via gateway
- P1 port connection (Netherlands/Belgium standards)
- Key considerations:
  - Regulatory compliance for billing data
  - Data accuracy and validation

### 3.6 Load Controller

#### Direct Connection:
- **TCP/IP with REST API**:
  - HTTP-based control
  - JSON payloads for configuration
  
- **MQTT Direct**:
  - Subscribe/Publish model
  - Control topics and feedback topics

#### Gateway Connection:
- Gateway manages multiple loads via relay controls
- Zigbee, Z-Wave, or proprietary protocol to devices
- Key considerations:
  - Control latency requirements
  - Safety interlocks and fail-safe modes

## 4. Gateway Implementation Strategy

### 4.1 Gateway Functions

1. **Protocol Translation**:
   - Convert device-specific protocols to standard MQTT
   - Normalize data formats and units

2. **Local Buffering**:
   - Store telemetry during connectivity interruptions
   - Implement store-and-forward mechanisms

3. **Local Control Logic**:
   - Basic control loops independent of cloud
   - Safety monitoring and failsafe operations

4. **Device Discovery**:
   - Auto-detect local devices where possible
   - Simplified provisioning process

5. **Security**:
   - TLS for all communications
   - Device authentication and authorization
   - Credential management

### 4.2 Gateway Hardware Requirements

| Requirement                | Minimum Specification   | Recommended Specification |
|----------------------------|-------------------------|---------------------------|
| CPU                        | 1GHz Single Core        | 1.5GHz Quad Core          |
| RAM                        | 512MB                   | 1GB+                      |
| Storage                    | 4GB                     | 8GB+                      |
| Connectivity               | Ethernet + Wi-Fi        | Ethernet + Wi-Fi + 4G/5G  |
| Local Interfaces           | RS485, Ethernet         | RS485, Ethernet, CAN, USB |
| Power Supply               | 5V DC                   | 5-24V DC with UPS backup  |
| Operating Temperature      | 0-40°C                  | -20 to 60°C               |

### 4.3 Gateway Software Architecture

1. **Core Services**:
   - Device manager
   - Protocol adapters
   - Data buffer
   - MQTT client
   - Security manager

2. **Protocol Adapters**:
   - Modbus master
   - OCPP client
   - SunSpec client
   - EEBus adapter
   - Custom manufacturer adapters

3. **Management Interface**:
   - Local web UI for configuration
   - Remote management API
   - Diagnostics and logging

## 5. Connection Process Flows

### 5.1 Direct Device Connection Flow

1. **Device Registration**:
   - Create device in EMS platform
   - Configure connection parameters (IP, port, protocol)
   - Generate or assign device credentials

2. **Connection Establishment**:
   - EMS initiates connection to device
   - Authentication and session establishment
   - Protocol handshake

3. **Data Exchange**:
   - Regular polling for telemetry
   - Event-based notifications
   - Command issuance and confirmation

4. **Connection Monitoring**:
   - Heartbeat mechanism
   - Automatic reconnection with exponential backoff
   - Alert on persistent failures

### 5.2 Gateway-Mediated Connection Flow

1. **Gateway Registration**:
   - Register gateway in EMS platform
   - Assign site and location
   - Provision security credentials

2. **Gateway Configuration**:
   - Configure cloud connection (MQTT broker, credentials)
   - Set local scan parameters
   - Define buffering and retry policies

3. **Device Discovery and Provisioning**:
   - Gateway scans for local devices
   - Reports discovered devices to cloud
   - Administrator approves and configures devices

4. **Operational Data Flow**:
   - Gateway polls local devices
   - Normalizes and buffers data
   - Publishes to MQTT topics
   - Subscribes to command topics
   - Executes received commands

5. **Resilience Features**:
   - Local operation during cloud disconnect
   - Data buffering and forwarding when connection restored
   - Progressive backoff for reconnection attempts

## 6. Addressing Schema

### 6.1 MQTT Topic Structure

```
devices/{deviceId}/telemetry          # Regular device readings
devices/{deviceId}/status             # Connection and operational status
devices/{deviceId}/commands/request   # Incoming commands
devices/{deviceId}/commands/response  # Command responses

# Device-specific topics
devices/{deviceId}/battery/soc        # Battery State of Charge
devices/{deviceId}/solar/production   # Solar production data
devices/{deviceId}/evcharger/session  # EV charging session data

# Gateway topics
gateways/{gatewayId}/status           # Gateway operational status
gateways/{gatewayId}/devices          # Device discovery information
gateways/{gatewayId}/commands         # Gateway-level commands
```

### 6.2 Device Identity Management

1. **Device ID Format**:
   - Globally unique identifier
   - Prefix indicating device type (e.g., `sol_` for solar, `bat_` for battery)
   - Serial number or MAC address derived component

2. **Gateway Device Mapping**:
   - Devices maintain same ID whether direct or gateway-connected
   - Gateway ID added as metadata
   - Connection path property indicates direct/gateway connection

## 7. Implementation Plan by Phase

### Phase 1: Core Connectivity Framework

1. **Enhance Protocol Adapters**:
   - Improve Modbus adapter with device templates
   - Develop SunSpec protocol support
   - Implement OCPP client for EV chargers

2. **Connection Reliability**:
   - Enhance error handling and reconnection logic
   - Implement message buffering for intermittent connections
   - Add connection quality metrics and alerting

3. **Core Gateway Support**:
   - Develop gateway registration and management
   - Implement secure credential provisioning
   - Create basic device discovery mechanism

### Phase 2: Manufacturer-Specific Implementations

1. **Solar Inverter Integration**:
   - Add templates for major manufacturers (SMA, Fronius, SolarEdge, Huawei)
   - Implement SunSpec profile support
   - Develop inverter performance analysis tools

2. **Battery System Integration**:
   - Add templates for major manufacturers (Tesla, LG, BYD, Sonnen)
   - Implement advanced battery management features
   - Add state of health monitoring

3. **EV Charger Integration**:
   - Complete OCPP implementation
   - Add manufacturer-specific extensions
   - Develop smart charging algorithms

### Phase 3: Advanced Gateway Features

1. **Enhanced Local Intelligence**:
   - Local optimization algorithms on gateway
   - Device coordination without cloud dependency
   - Edge analytics for performance monitoring

2. **Resilience Improvements**:
   - Full offline operation mode
   - Local decision making during outages
   - Data prioritization for limited bandwidth

3. **Advanced Security**:
   - Mutual TLS authentication
   - Certificate rotation
   - Intrusion detection

## 8. Testing and Validation Strategy

### 8.1 Connectivity Testing

1. **Protocol Conformance Tests**:
   - Verify correct implementation of each protocol
   - Test edge cases and error handling
   - Validate against protocol specifications

2. **Performance Testing**:
   - Maximum device count per gateway
   - Maximum polling frequency sustainability
   - Bandwidth utilization

3. **Reliability Testing**:
   - Connection drop and recovery
   - Gateway restart recovery
   - Cloud service interruption handling

### 8.2 Integration Testing

1. **Manufacturer Compatibility**:
   - Test with actual devices from major manufacturers
   - Validate with firmware variants
   - Document compatibility matrix

2. **Cross-Device Interactions**:
   - Test coordinated control scenarios
   - Validate optimization algorithms
   - Ensure proper precedence of commands

### 8.3 Real-World Validation

1. **Pilot Deployments**:
   - Select diverse customer environments
   - Install with varied device combinations
   - Collect performance and reliability metrics

2. **Field Testing Protocol**:
   - Standardized test scenarios 
   - Connection reliability measurements
   - Recovery time objectives validation