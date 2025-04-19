# Modbus Device Configuration Guide

This guide provides detailed information on configuring Modbus connections for different energy asset types in the EMS platform.

## 1. Introduction to Modbus in Energy Management

Modbus is one of the most widely used protocols in industrial automation and energy systems due to its simplicity and robustness. The protocol comes in several variants:

- **Modbus RTU**: Serial communication over RS-485/RS-232
- **Modbus TCP**: Ethernet-based communication using TCP/IP
- **Modbus ASCII**: Text-based variant used in some legacy systems

Our EMS platform supports both Modbus RTU and Modbus TCP through direct connections or gateway-mediated connections.

## 2. Modbus Register Types

Modbus defines four different types of data registers:

| Register Type | Access    | Address Range | Description                          |
|---------------|-----------|--------------|--------------------------------------|
| Coil          | Read/Write| 00001-09999  | Single bit (on/off, boolean)         |
| Discrete Input| Read-only | 10001-19999  | Single bit (on/off, boolean)         |
| Input Register| Read-only | 30001-39999  | 16-bit word (analog value)           |
| Holding Register| Read/Write| 40001-49999 | 16-bit word (setpoint, configuration)|

In practice, most energy devices primarily use Holding Registers (4xxxx) for both reading and writing values, with Input Registers (3xxxx) used for read-only parameters.

## 3. Modbus Register Data Types

While Modbus itself only defines 16-bit registers, multiple registers can be combined to represent various data types:

| Data Type | Size (registers) | Description                         |
|-----------|-----------------|-------------------------------------|
| Int16     | 1               | 16-bit signed integer               |
| Uint16    | 1               | 16-bit unsigned integer             |
| Int32     | 2               | 32-bit signed integer               |
| Uint32    | 2               | 32-bit unsigned integer             |
| Float32   | 2               | IEEE 754 single-precision float     |
| Float64   | 4               | IEEE 754 double-precision float     |
| String    | Variable        | ASCII character string              |

## 4. Register Map Configuration by Device Type

### 4.1 Solar Inverter

Solar inverters from different manufacturers may have widely varying register maps. Here are common data points and their typical Modbus registers for major manufacturers:

#### SMA Sunny Tripower

| Data Point          | Register | Type    | Unit   | Scaling  | Notes                      |
|---------------------|----------|---------|--------|----------|----------------------------|
| Status              | 30201    | Uint16  | -      | -        | Mapped to status codes     |
| AC Active Power     | 30775    | Int32   | W      | 1        | Current power output       |
| AC Voltage Phase A  | 30777    | Uint32  | V      | 0.01     | Grid voltage, phase A      |
| AC Voltage Phase B  | 30779    | Uint32  | V      | 0.01     | Grid voltage, phase B      |
| AC Voltage Phase C  | 30781    | Uint32  | V      | 0.01     | Grid voltage, phase C      |
| DC Voltage String 1 | 30771    | Int32   | V      | 0.01     | DC input voltage, string 1 |
| DC Current String 1 | 30769    | Int32   | A      | 0.001    | DC input current, string 1 |
| Daily Yield         | 30517    | Uint32  | Wh     | 1        | Energy produced today      |
| Total Yield         | 30513    | Uint32  | kWh    | 1        | Total energy produced      |
| Grid Frequency      | 30803    | Uint32  | Hz     | 0.01     | AC grid frequency          |
| Device Temperature  | 30953    | Int16   | °C     | 0.1      | Internal device temperature|
| Operating Hours     | 30521    | Uint32  | h      | 1        | Total operating hours      |

#### Fronius

| Data Point          | Register | Type    | Unit   | Scaling  | Notes                      |
|---------------------|----------|---------|--------|----------|----------------------------|
| Status              | 40107    | Uint16  | -      | -        | Device status code         |
| AC Power            | 40092    | Float32 | W      | 1        | Current power output       |
| AC Voltage Phase 1  | 40079    | Float32 | V      | 1        | Grid voltage, phase 1      |
| AC Current Phase 1  | 40073    | Float32 | A      | 1        | Grid current, phase 1      |
| DC Voltage          | 40101    | Float32 | V      | 1        | DC input voltage           |
| DC Current          | 40098    | Float32 | A      | 1        | DC input current           |
| Daily Energy        | 40094    | Float32 | Wh     | 1        | Energy produced today      |
| Total Energy        | 40095    | Float32 | Wh     | 1        | Total energy produced      |
| Inverter Temperature| 40104    | Float32 | °C     | 1        | Device temperature         |

#### SolarEdge

| Data Point          | Register | Type    | Unit   | Scaling  | Notes                      |
|---------------------|----------|---------|--------|----------|----------------------------|
| AC Power            | 40083    | Int16   | W      | 1        | Current power output       |
| AC Voltage Phase A  | 40072    | Int16   | V      | 0.1      | Grid voltage, phase A      |
| AC Current Phase A  | 40075    | Int16   | A      | 0.1      | Grid current, phase A      |
| DC Voltage          | 40098    | Int16   | V      | 0.1      | DC input voltage           |
| DC Current          | 40099    | Int16   | A      | 0.1      | DC input current           |
| Daily Energy        | 40226    | Int32   | Wh     | 1        | Energy produced today      |
| Total Energy        | 40095    | Int32   | Wh     | 1        | Total energy produced      |
| Inverter Temperature| 40103    | Int16   | °C     | 0.1      | Device temperature         |
| Inverter Status     | 40107    | Int16   | -      | -        | Device status code         |
| Power Limit         | 40236    | Int16   | %      | 1        | Power limit (0-100%)       |

### 4.2 Battery Storage System

Battery systems typically have registers for state of charge, power flow, and various operational parameters:

#### BYD Battery Box

| Data Point          | Register | Type    | Unit   | Scaling  | Notes                      |
|---------------------|----------|---------|--------|----------|----------------------------|
| System State        | 20000    | Uint16  | -      | -        | Operational status         |
| State of Charge     | 20048    | Uint16  | %      | 1        | Battery charge level       |
| Total Voltage       | 20008    | Uint16  | V      | 0.01     | Battery voltage            |
| Current             | 20009    | Int16   | A      | 0.01     | Battery current (+/-)      |
| Temperature         | 20010    | Int16   | °C     | 0.1      | Battery temperature        |
| Max Charge Current  | 20050    | Uint16  | A      | 0.01     | Maximum allowed charge     |
| Max Discharge Current| 20051    | Uint16  | A      | 0.01     | Maximum allowed discharge  |
| Charge Power        | 20012    | Uint32  | W      | 1        | Current charge power       |
| Discharge Power     | 20014    | Uint32  | W      | 1        | Current discharge power    |
| Total Energy        | 20016    | Uint32  | kWh    | 0.001    | Total battery capacity     |
| Available Energy    | 20018    | Uint32  | kWh    | 0.001    | Available energy           |
| Charge Energy       | 20020    | Uint32  | kWh    | 0.001    | Total energy charged       |
| Discharge Energy    | 20022    | Uint32  | kWh    | 0.001    | Total energy discharged    |
| Alarm Status        | 20100    | Uint16  | -      | -        | Alarm bits                 |

#### LG RESU

| Data Point          | Register | Type    | Unit   | Scaling  | Notes                      |
|---------------------|----------|---------|--------|----------|----------------------------|
| Operation Mode      | 502      | Uint16  | -      | -        | System operational mode    |
| State of Charge     | 504      | Uint16  | %      | 1        | Battery charge level       |
| DC Voltage          | 506      | Uint16  | V      | 0.1      | Battery DC voltage         |
| DC Current          | 508      | Int16   | A      | 0.1      | Battery current (+/-)      |
| Power Output        | 512      | Int16   | W      | 1        | Power output (+/-)         |
| Battery Temperature | 526      | Int16   | °C     | 0.1      | Average cell temperature   |
| Max Charge Power    | 514      | Uint16  | W      | 1        | Max allowed charge power   |
| Max Discharge Power | 516      | Uint16  | W      | 1        | Max allowed discharge power|
| Alarm Status        | 550      | Uint16  | -      | -        | Alarm status bits          |
| Battery Capacity    | 518      | Uint16  | Ah     | 0.1      | Total battery capacity     |

### 4.3 EV Charger

EV chargers often support Modbus TCP alongside OCPP. Here are typical Modbus registers:

#### Generic EV Charger Registers

| Data Point          | Register | Type    | Unit   | Scaling  | Notes                      |
|---------------------|----------|---------|--------|----------|----------------------------|
| Charger Status      | 1000     | Uint16  | -      | -        | Operational status         |
| Charging State      | 1001     | Uint16  | -      | -        | Charging session state     |
| Connected Vehicle   | 1002     | Uint16  | -      | -        | Vehicle connection status  |
| Charging Current    | 1010     | Uint16  | A      | 0.1      | Current charging current   |
| Charging Voltage    | 1012     | Uint16  | V      | 0.1      | Charging voltage           |
| Charging Power      | 1014     | Uint16  | kW     | 0.01     | Active charging power      |
| Energy Current Sess.| 1020     | Uint32  | Wh     | 1        | Energy delivered in session|
| Total Energy        | 1022     | Uint32  | kWh    | 0.1      | Total energy delivered     |
| Max Current Setting | 1100     | Uint16  | A      | 0.1      | Maximum current setting    |
| Enable/Disable      | 1200     | Uint16  | -      | -        | Enable/disable charging    |
| Error Code          | 1300     | Uint16  | -      | -        | Current error code         |

### 4.4 Heat Pump

Heat pumps provide temperature, energy, and operational data through Modbus:

#### Generic Heat Pump Registers

| Data Point              | Register | Type    | Unit   | Scaling  | Notes                      |
|-------------------------|----------|---------|--------|----------|----------------------------|
| Operating Mode          | 2000     | Uint16  | -      | -        | Current operating mode     |
| Operating Status        | 2001     | Uint16  | -      | -        | Current status             |
| Current Flow Temperature| 2010     | Int16   | °C     | 0.1      | Flow temperature           |
| Return Temperature      | 2011     | Int16   | °C     | 0.1      | Return temperature         |
| Outdoor Temperature     | 2012     | Int16   | °C     | 0.1      | Outdoor unit temperature   |
| Setpoint Temperature    | 2020     | Int16   | °C     | 0.1      | Target flow temperature    |
| Current Power           | 2030     | Uint16  | W      | 1        | Current power consumption  |
| Energy Consumption      | 2032     | Uint32  | kWh    | 0.01     | Total energy consumption   |
| Energy Production       | 2034     | Uint32  | kWh    | 0.01     | Total thermal energy prod. |
| COP Current             | 2036     | Uint16  | -      | 0.01     | Current COP                |
| Compressor Speed        | 2040     | Uint16  | %      | 1        | Compressor modulation      |
| Circulation Pump Speed  | 2041     | Uint16  | %      | 1        | Pump modulation            |
| Error Code              | 2100     | Uint16  | -      | -        | Error code                 |

### 4.5 Smart Meter

Smart meters provide energy consumption data and grid parameters:

#### Generic Smart Meter Registers

| Data Point              | Register | Type    | Unit   | Scaling  | Notes                      |
|-------------------------|----------|---------|--------|----------|----------------------------|
| Total Active Energy Import | 3000  | Uint32  | kWh    | 0.01     | Total consumed energy      |
| Total Active Energy Export | 3002  | Uint32  | kWh    | 0.01     | Total exported energy      |
| Active Power             | 3010    | Int32   | W      | 1        | Current active power       |
| Reactive Power           | 3012    | Int32   | VAr    | 1        | Current reactive power     |
| Apparent Power           | 3014    | Uint32  | VA     | 1        | Current apparent power     |
| Power Factor             | 3016    | Int16   | -      | 0.001    | Power factor               |
| Frequency                | 3018    | Uint16  | Hz     | 0.01     | Grid frequency             |
| Voltage Phase A          | 3020    | Uint16  | V      | 0.1      | Voltage of phase A         |
| Current Phase A          | 3026    | Uint16  | A      | 0.01     | Current of phase A         |
| Voltage Phase B          | 3022    | Uint16  | V      | 0.1      | Voltage of phase B         |
| Current Phase B          | 3028    | Uint16  | A      | 0.01     | Current of phase B         |
| Voltage Phase C          | 3024    | Uint16  | V      | 0.1      | Voltage of phase C         |
| Current Phase C          | 3030    | Uint16  | A      | 0.01     | Current of phase C         |

## 5. Modbus Configuration Templates

Our system uses standardized device templates for each supported model. Below is the structure of these templates:

```json
{
  "templateId": "sma-sunny-tripower",
  "manufacturer": "SMA",
  "model": "Sunny Tripower",
  "deviceType": "solar_inverter",
  "protocol": "modbus",
  "communication": {
    "defaultPort": 502,
    "defaultUnitId": 1,
    "timeout": 3000,
    "retries": 3
  },
  "registers": [
    {
      "name": "activePower",
      "address": 30775,
      "type": "int32",
      "unit": "W",
      "scaling": 1,
      "access": "read",
      "description": "Current active power output"
    },
    // Additional registers...
  ],
  "controlPoints": [
    {
      "name": "powerLimit",
      "address": 40236,
      "type": "uint16",
      "unit": "%",
      "scaling": 1,
      "minValue": 0,
      "maxValue": 100,
      "defaultValue": 100,
      "description": "Power output limitation in percent"
    },
    // Additional control points...
  ],
  "statusMappings": {
    "30201": {
      "307": "Off",
      "308": "Fault",
      "309": "Waiting to connect",
      "310": "Starting",
      "311": "MPP",
      "312": "Derating"
    }
  }
}
```

## 6. Modbus Connection Troubleshooting

### Common Modbus TCP Issues

1. **Connection Timeout**
   - Check network connectivity (ping device IP)
   - Verify firewall settings (port 502 must be open)
   - Confirm device is powered and operational

2. **Invalid Response**
   - Verify unit ID is correct
   - Check register map documentation
   - Check for Modbus protocol variants (some devices use non-standard implementations)

3. **No Response**
   - Check if multiple clients are trying to access the device
   - Verify the Modbus slave address
   - Try increasing the timeout value

### Common Modbus RTU Issues

1. **Communication Errors**
   - Check wiring (A/B terminals, ground)
   - Verify baud rate, parity, stop bits match device configuration
   - Check termination resistors (typically 120Ω at end of lines)

2. **Intermittent Communication**
   - Check for electromagnetic interference (separate power and data cables)
   - Verify cable quality and maximum length
   - Check for correct grounding

3. **Multiple Device Issues**
   - Ensure each device has a unique Modbus address
   - Check if all devices support the same baud rate and settings
   - Verify proper daisy-chain wiring

## 7. Gateway-Mediated Modbus Connection

When connecting Modbus devices through a gateway, the following approach is used:

1. **Gateway Configuration**
   - The gateway is configured with device templates
   - Local Modbus scan settings (interval, timeout) are specified
   - Device discovery can be enabled for auto-detection

2. **Communication Flow**
   ```
   [Modbus Device] <-- RTU/TCP --> [Gateway] <-- MQTT --> [EMS Platform]
   ```

3. **Topic Structure for Gateway-Connected Devices**
   ```
   devices/{deviceId}/telemetry          # Device readings
   devices/{deviceId}/status             # Connection status
   devices/{deviceId}/commands/request   # Command requests
   devices/{deviceId}/commands/response  # Command responses
   ```

4. **Example Gateway Configuration for Modbus Device**
   ```json
   {
     "id": "inv-001",
     "name": "Solar Inverter 1",
     "type": "solar_inverter",
     "protocol": "modbus",
     "enabled": true,
     "connection": {
       "type": "tcp",
       "host": "192.168.1.100",
       "port": 502,
       "unitId": 1,
       "timeout": 3000,
       "retries": 3
     },
     "templateId": "sma-sunny-tripower",
     "scanInterval": 5000
   }
   ```

## 8. Recommendations for Reliable Modbus Connectivity

1. **Use Quality Serial Converters**
   - For Modbus RTU, invest in quality RS-485 converters
   - Avoid unshielded USB-to-RS485 converters in industrial settings

2. **Network Segmentation**
   - Place Modbus TCP devices on a separate network segment
   - Use VLANs to isolate industrial traffic from IT networks

3. **Redundancy Options**
   - For critical systems, implement redundant communication paths
   - Consider multiple gateways for essential device groups

4. **Documentation**
   - Maintain detailed documentation of register maps
   - Document all custom scaling factors and data transformations
   - Keep records of device-specific configurations

5. **Regular Testing**
   - Implement regular connection testing
   - Monitor communication quality metrics
   - Establish baseline performance for comparison

6. **Security Considerations**
   - Be aware that Modbus lacks built-in authentication and encryption
   - Implement network-level security (firewalls, VPNs)
   - Consider Modbus TCP Security extensions where supported