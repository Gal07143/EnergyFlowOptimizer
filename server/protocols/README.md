# EMS Communication Protocols Implementation

This directory contains the implementation of the enhanced communication protocols for our Energy Management System.

## Directory Structure

```
protocols/
  ├── README.md              # This file
  ├── bridge/                # Protocol bridge implementations
  │   ├── modbusBridge.ts    # Modbus to MQTT bridge
  │   ├── ocppBridge.ts      # OCPP to MQTT bridge
  │   └── eebusBridge.ts     # EEBus to MQTT bridge
  ├── adapters/              # Device protocol adapters
  │   ├── modbusAdapter.ts   # Modbus protocol adapter
  │   ├── ocppAdapter.ts     # OCPP protocol adapter
  │   └── eebusAdapter.ts    # EEBus protocol adapter
  └── common/                # Shared protocol utilities
      ├── topicHelper.ts     # Topic formatting utilities
      └── qosHelper.ts       # QoS level management
```

## Implementation Guide

### Adding a New Protocol Adapter

1. Create a new adapter in the `adapters/` directory by extending the `BaseDeviceAdapter` class
2. Implement the required methods:
   - `connect()`: Establish connection to the device
   - `disconnect()`: Close device connection
   - `readData()`: Read telemetry from the device
   - `writeData()`: Send commands to the device
   - `getDeviceSpecificMappingRules()`: Define protocol-specific data mappings

### Extending Topic Structure

To add new topics to the system:

1. Add the topic pattern to `TOPIC_PATTERNS` in `shared/messageSchema.ts`
2. Create helper functions for formatting the new topics
3. Update documentation in `docs/communication-protocols.md`

### Modifying QoS Levels

Default QoS levels for different message types are defined in the protocol bridge configuration. To modify them:

1. Update the default configuration in `mqttBrokerConfig.ts`
2. For message-type specific QoS, modify the `mqttService.ts` implementation

### Security Considerations

When implementing or modifying protocol adapters:

1. Always validate incoming data to prevent injection attacks
2. Use TLS for external-facing MQTT connections
3. Implement appropriate authentication for device communications
4. Follow the principle of least privilege for topic access
5. Sanitize all data before publishing to MQTT topics

## Testing Protocol Implementation

Use the provided test scripts to verify protocol adapter functionality:

- `test-communication-protocols.js`: Tests the full protocol stack
- `test-protocol-bridge.js`: Tests protocol bridge functionality in isolation
- `test-mqtt-service.js`: Tests MQTT service with various QoS levels

## Additional Resources

- [MQTT Essentials](https://www.hivemq.com/mqtt-essentials/)
- [Modbus Technical Resources](https://modbus.org/tech.php)
- [OCPP Documentation](https://www.openchargealliance.org/)
- [EEBus Technical Specifications](https://www.eebus.org/technology/)