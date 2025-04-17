# Energy Management System (EMS) Communication Protocols

This document describes the enhanced communication protocols implemented in the EMS platform to ensure reliable, secure, and standardized communications between various energy devices and the central management system.

## Overview

The communication protocols in our EMS platform follow industry standards and best practices to provide:

1. **Reliability**: Through Quality of Service (QoS) levels and persistent sessions
2. **Security**: Using TLS encryption and strong authentication
3. **Standardization**: With protocol bridges that convert between different protocols
4. **Scalability**: Supporting high availability and clustering for large deployments
5. **Extensibility**: With a flexible topic structure that accommodates future device types

## Protocol Architecture

### Core Communication Protocol: MQTT

MQTT (Message Queuing Telemetry Transport) serves as the core communication protocol for our EMS platform. It was chosen for its:

- Low bandwidth requirements
- Support for unreliable networks
- Pub/sub pattern that decouples devices from the central system
- Support for QoS levels
- Small code footprint suitable for edge devices

### Quality of Service (QoS) Levels

Our implementation supports all three MQTT QoS levels:

1. **QoS 0 (At most once)**: Fire and forget - Used for non-critical, high-frequency telemetry data
2. **QoS 1 (At least once)**: Guaranteed delivery with possible duplicates - Used for important status updates and commands
3. **QoS 2 (Exactly once)**: Guaranteed delivery exactly once - Used for critical operations like financial or billing-related data

### Topic Structure

We've implemented a hierarchical topic structure that organizes messages by:

- Device type (battery, solar, ev_charger, etc.)
- Message type (telemetry, status, command, etc.)
- Device instance (using device ID)
- Site grouping (site ID-based topics)

Example topics:
```
devices/101/battery/soc         # Battery state of charge
devices/102/ev_charger/1/status # EV charger connector 1 status
sites/3/energy                  # Site-wide energy data
system/heartbeat/server1        # System component heartbeat
```

### Protocol Bridge Adapter

To integrate diverse device protocols (Modbus, OCPP, EEBus, SunSpec, etc.), we've implemented a Protocol Bridge Adapter that:

1. Converts between source protocols and MQTT
2. Standardizes data formats and units
3. Applies appropriate QoS levels
4. Maps between different data structures
5. Provides event-based notifications for successful bridging

## Security Features

### TLS Encryption

All MQTT communications can be encrypted using TLS with:
- Certificate-based verification
- Support for custom CA certificates
- Connection security enforced with rejectUnauthorized option

### Authentication Methods

Supported authentication methods:
- Username/password authentication
- Token-based authentication
- Certificate-based authentication
- API key authentication for devices

## High Availability

The implementation supports high-availability configurations:

- MQTT broker clustering
- Persistent sessions to handle reconnections
- Last Will and Testament (LWT) messages for detecting disconnections
- Automatic re-subscription to topics after reconnection

## Protocol Implementation Files

The enhanced communication protocols are implemented across these files:

1. `shared/messageSchema.ts`: Defines message schemas with QoS support
2. `server/config/mqttBrokerConfig.ts`: MQTT broker configuration with security and HA options
3. `server/services/mqttService.ts`: Enhanced MQTT client with QoS, TLS, and clustering support
4. `server/adapters/protocolBridgeAdapter.ts`: Protocol conversion and standardization
5. `server/adapters/deviceAdapterFactory.ts`: Factory for creating appropriate device adapters
6. `server/adapters/modbusBatteryAdapter.ts`: Example adapter implementation for Modbus batteries

## Usage Examples

1. **Device Communication**: Energy devices connect via protocol adapters and communicate through the protocol bridge using standardized MQTT topics.

2. **Command and Control**: The EMS sends commands to devices with appropriate QoS levels, and devices respond on standardized response topics.

3. **Telemetry Collection**: Devices publish telemetry data to their device-specific topics, which the EMS subscribes to for data collection and analysis.

4. **Site-level Aggregation**: Data from multiple devices can be aggregated and published to site-level topics for higher-level monitoring and control.

## Appendix

### Communication Protocol Diagram

```
┌──────────────┐    ┌─────────────────────┐    ┌───────────────┐
│ Energy Device│    │ Protocol Bridge     │    │ MQTT Broker   │
│ (Modbus)     │───▶│ Adapter            │───▶│ (QoS, TLS)    │
└──────────────┘    └─────────────────────┘    └───────┬───────┘
                                                       │
┌──────────────┐    ┌─────────────────────┐           │
│ Energy Device│    │ Protocol Bridge     │           │
│ (OCPP)       │───▶│ Adapter            │───────────┘
└──────────────┘    └─────────────────────┘
                                                       ▲
┌──────────────┐    ┌─────────────────────┐           │
│ Energy Device│    │ Protocol Bridge     │           │
│ (EEBus)      │───▶│ Adapter            │───────────┘
└──────────────┘    └─────────────────────┘
                                                       ▲
                    ┌─────────────────────┐           │
                    │ EMS Backend         │◀──────────┘
                    │ Services            │
                    └─────────────────────┘
```