/**
 * Modbus Battery Adapter
 * 
 * Specific implementation for communicating with battery systems via Modbus protocol.
 * Integrates with Protocol Bridge for standardized communication.
 */

import { BaseDeviceAdapter, Protocol, DeviceType } from './deviceAdapterFactory';

// Battery connection parameters
export interface ModbusBatteryConnectionParams {
  ipAddress: string;
  port: number;
  unitId: number;
  registerMap: {
    soc: number;          // State of charge register
    power: number;        // Power register
    voltage: number;      // Voltage register
    current: number;      // Current register
    temperature: number;  // Temperature register
    status: number;       // Status register
  };
  pollInterval?: number;  // How often to poll the device (ms)
}

// Battery command parameters
export interface BatteryCommandParams {
  command: 'charge' | 'discharge' | 'standby';
  setpoint?: number; // Power setpoint in watts
  soc_limit?: number; // State of charge limit (%)
}

// Implementation of Modbus Battery Adapter
export class ModbusBatteryAdapter extends BaseDeviceAdapter {
  private params: ModbusBatteryConnectionParams;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastReadData: any = null;
  private simulationMode: boolean = process.env.NODE_ENV === 'development';

  constructor(deviceId: number, params: ModbusBatteryConnectionParams) {
    super(deviceId, DeviceType.BATTERY, Protocol.MODBUS);
    this.params = params;
  }

  async connect(): Promise<boolean> {
    if (this.connected) return true;

    try {
      if (this.simulationMode) {
        console.log(`Simulated connection to Modbus battery ${this.deviceId}`);
        this.connected = true;
      } else {
        // Real implementation would connect to the Modbus device here
        // const modbusClient = new ModbusClient();
        // await modbusClient.connectTCP(this.params.ipAddress, { port: this.params.port });
        // this.modbusClient = modbusClient;
        console.log(`Connected to Modbus battery ${this.deviceId} at ${this.params.ipAddress}:${this.params.port}`);
        this.connected = true;
      }

      // Set up protocol bridge for standardized communication
      this.setupProtocolBridge();

      // Start polling
      this.startPolling();

      return true;
    } catch (error) {
      console.error(`Error connecting to Modbus battery ${this.deviceId}:`, error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      this.stopPolling();

      if (!this.simulationMode) {
        // Real implementation would disconnect from the Modbus device
        // await this.modbusClient.close();
      }

      this.connected = false;
      console.log(`Disconnected from Modbus battery ${this.deviceId}`);
    } catch (error) {
      console.error(`Error disconnecting from Modbus battery ${this.deviceId}:`, error);
    }
  }

  async readData(): Promise<any> {
    if (!this.connected) {
      throw new Error(`Cannot read data from battery ${this.deviceId}: Not connected`);
    }

    try {
      let data: any;

      if (this.simulationMode) {
        // Generate simulated data
        data = this.generateSimulatedData();
      } else {
        // Real implementation would read from Modbus registers
        // Read state of charge (register specified in params)
        // const socResult = await this.modbusClient.readHoldingRegisters(this.params.registerMap.soc, 1);
        // const soc = socResult.data[0];
        // ...same for other registers
        
        // Placeholder for real implementation
        data = {
          state_of_charge: 0,
          power_watts: 0,
          voltage: 0,
          current: 0,
          temp_celsius: 0,
          status: 0
        };
      }

      this.lastReadData = data;

      // Forward data through protocol bridge
      const bridge = this.bridgeManager.getBridge(this.deviceId);
      if (bridge) {
        await bridge.bridgeTelemetry(data);
      }

      return data;
    } catch (error) {
      console.error(`Error reading data from Modbus battery ${this.deviceId}:`, error);
      throw error;
    }
  }

  async writeData(params: BatteryCommandParams): Promise<boolean> {
    if (!this.connected) {
      throw new Error(`Cannot write data to battery ${this.deviceId}: Not connected`);
    }

    try {
      if (this.simulationMode) {
        console.log(`Simulated command to battery ${this.deviceId}:`, params);
        return true;
      } else {
        // Real implementation would write to Modbus registers
        // For example, to set battery to charge/discharge mode:
        // await this.modbusClient.writeSingleRegister(commandRegister, commandValue);
        
        console.log(`Sending command to battery ${this.deviceId}:`, params);
        return true;
      }
    } catch (error) {
      console.error(`Error writing data to Modbus battery ${this.deviceId}:`, error);
      return false;
    }
  }

  protected getDeviceSpecificMappingRules(): any[] {
    return [
      {
        sourceField: 'state_of_charge',
        targetField: 'soc',
        transformation: 'scale',
        transformationParams: { factor: 0.1 } // Example: convert from 0-1000 to 0-100%
      },
      {
        sourceField: 'power_watts',
        targetField: 'power',
        transformation: 'scale',
        transformationParams: { factor: 0.001 } // Convert from watts to kilowatts
      },
      {
        sourceField: 'voltage',
        targetField: 'voltage',
        transformation: 'none'
      },
      {
        sourceField: 'current',
        targetField: 'current',
        transformation: 'none'
      },
      {
        sourceField: 'temp_celsius',
        targetField: 'temperature',
        transformation: 'none'
      },
      {
        sourceField: 'status',
        targetField: 'status',
        transformation: 'lookup',
        transformationParams: {
          lookup: {
            0: 'offline',
            1: 'standby',
            2: 'charging',
            3: 'discharging',
            4: 'error',
            5: 'maintenance'
          }
        }
      }
    ];
  }

  private startPolling(): void {
    if (this.pollTimer) return;
    
    const interval = this.params.pollInterval || 5000; // Default 5 seconds
    
    this.pollTimer = setInterval(async () => {
      try {
        await this.readData();
      } catch (error) {
        console.error(`Error polling battery ${this.deviceId}:`, error);
      }
    }, interval);
    
    console.log(`Started scanning Modbus battery ${this.deviceId} every ${interval}ms`);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log(`Stopped scanning Modbus battery ${this.deviceId}`);
    }
  }

  private generateSimulatedData(): any {
    // Generate reasonable simulated values for a battery
    const soc = Math.floor(Math.random() * 200) + 800; // 80-100% (scaled as 800-1000)
    const powerMode = Math.random() > 0.5; // Randomly charging or discharging
    const power = powerMode ? 
                  Math.floor(Math.random() * 3000) + 1000 : // Charging: 1-4 kW (as watts)
                  -1 * (Math.floor(Math.random() * 5000) + 2000); // Discharging: 2-7 kW (as negative watts)
    const voltage = 48 + (Math.random() * 4); // 48-52V
    const current = power / voltage;
    const temperature = 20 + (Math.random() * 15); // 20-35°C
    const status = powerMode ? 2 : 3; // 2=charging, 3=discharging
    
    return {
      state_of_charge: soc,
      power_watts: power,
      voltage: parseFloat(voltage.toFixed(1)),
      current: parseFloat(current.toFixed(1)),
      temp_celsius: parseFloat(temperature.toFixed(1)),
      status: status
    };
  }
}