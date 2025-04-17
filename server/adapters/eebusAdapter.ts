import { EventEmitter } from 'events';
import { getMqttService } from '../services/mqttService';

/**
 * EEBus is an open communication standard for connecting energy-relevant appliances
 * in homes. This adapter implements a simplified version of the EEBus protocol for
 * heat pumps and other energy appliances.
 */

// EEBus connection configuration
export interface EEBusConnectionConfig {
  host: string;
  port: number;
  deviceId: string;
  sku: string;
  brandName: string;
  mockMode?: boolean;
}

// EEBus device interface
export interface EEBusDevice {
  id: number;
  deviceId: string;
  connection: EEBusConnectionConfig;
  pollInterval: number;
}

// EEBus operation modes
export enum EEBusOperationMode {
  OFF = 'off',
  HEAT = 'heat',
  COOL = 'cool',
  AUTO = 'auto',
  DRY = 'dry',
  ECO = 'eco',
  BOOST = 'boost'
}

// EEBus energy data
export interface EEBusEnergyData {
  power: number;             // Current power consumption in W
  energy: number;            // Cumulative energy consumption in kWh
  temperature: number;       // Current water/air temperature in °C
  targetTemperature: number; // Target temperature in °C
  mode: EEBusOperationMode;  // Current operation mode
  cop: number;               // Current coefficient of performance
  isActive: boolean;         // Whether the device is actively heating/cooling
  timestamp: string;         // ISO timestamp of the reading
}

/**
 * EEBus Device Adapter - Manages communication with a single EEBus device
 */
export class EEBusAdapter extends EventEmitter {
  private device: EEBusDevice;
  private connected: boolean = false;
  private polling: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastData: EEBusEnergyData | null = null;
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  private targetTemperature: number = 21.0;
  private currentMode: EEBusOperationMode = EEBusOperationMode.AUTO;

  constructor(device: EEBusDevice) {
    super();
    this.device = device;
  }

  // Connect to EEBus device
  async connect(): Promise<boolean> {
    if (this.connected) {
      return true;
    }

    try {
      console.log(`Connecting to EEBus device ${this.device.id}`);
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        console.log(`Development mode: Using simulated data for EEBus device ${this.device.id}`);
        this.connected = true;
        this.emit('connected', this.device.id);
        await this.publishDeviceStatus('online');
        return true;
      }
      
      // In a real implementation, we would:
      // 1. Set up HTTPS connection to the device
      // 2. Perform handshake and authentication
      // 3. Set up subscription to data changes
      
      this.connected = true;
      this.emit('connected', this.device.id);
      await this.publishDeviceStatus('online');
      
      return true;
    } catch (error: any) {
      console.error(`Error connecting to EEBus device ${this.device.id}:`, error);
      this.connected = false;
      await this.publishDeviceStatus('error', error.message);
      this.emit('error', error);
      return false;
    }
  }

  // Disconnect from EEBus device
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      console.log(`Disconnecting from EEBus device ${this.device.id}`);
      
      // Stop polling if active
      this.stopPolling();
      
      // In a real implementation, we would close the connection properly
      this.connected = false;
      this.emit('disconnected', this.device.id);
      await this.publishDeviceStatus('offline');
    } catch (error) {
      console.error(`Error disconnecting from EEBus device ${this.device.id}:`, error);
      this.emit('error', error);
    }
  }

  // Start polling device for data
  async startPolling(): Promise<void> {
    if (this.polling || this.pollTimer) {
      return;
    }
    
    if (!this.connected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error(`Cannot start polling - device ${this.device.id} not connected`);
      }
    }
    
    console.log(`Started polling EEBus device ${this.device.id} every ${this.device.pollInterval}ms`);
    
    this.polling = true;
    
    // Initial poll immediately
    await this.pollData();
    
    // Set up interval for regular polling
    this.pollTimer = setInterval(() => {
      this.pollData().catch(error => {
        console.error(`Error polling EEBus device ${this.device.id}:`, error);
      });
    }, this.device.pollInterval);
  }

  // Stop polling device
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.polling = false;
      console.log(`Stopped polling EEBus device ${this.device.id}`);
    }
  }

  // Poll device for current data
  private async pollData(): Promise<void> {
    if (!this.connected) {
      throw new Error(`Cannot poll device ${this.device.id} - not connected`);
    }
    
    try {
      let data: EEBusEnergyData;
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        // Generate simulated data in development mode
        data = this.generateMockData();
      } else {
        // In a real implementation, we would:
        // 1. Send data request to the device
        // 2. Parse the response
        // 3. Return the structured data
        
        // For now, generate simulated data
        data = this.generateMockData();
      }
      
      // Store last data
      this.lastData = data;
      
      // Publish data via MQTT
      await this.publishTelemetry(data);
      
      // Emit data event
      this.emit('data', {
        deviceId: this.device.id,
        data
      });
      
    } catch (error: any) {
      console.error(`Error polling EEBus device ${this.device.id}:`, error);
      this.emit('error', error);
      
      // Update status to error if we're still connected
      if (this.connected) {
        await this.publishDeviceStatus('error', error.message);
      }
    }
  }

  // Generate mock data for development
  private generateMockData(): EEBusEnergyData {
    // Base values
    let isActive = Math.random() > 0.3; // 70% chance of being active
    
    // Mode-specific modifiers
    let powerModifier = 1.0;
    let temperatureModifier = 0.0;
    
    switch (this.currentMode) {
      case EEBusOperationMode.OFF:
        powerModifier = 0.05; // Standby power
        isActive = false;
        break;
      case EEBusOperationMode.HEAT:
        powerModifier = 1.2;
        temperatureModifier = 2.0;
        break;
      case EEBusOperationMode.COOL:
        powerModifier = 1.3;
        temperatureModifier = -2.0;
        break;
      case EEBusOperationMode.BOOST:
        powerModifier = 1.8;
        temperatureModifier = 3.0;
        break;
      case EEBusOperationMode.ECO:
        powerModifier = 0.7;
        temperatureModifier = 1.0;
        break;
      case EEBusOperationMode.DRY:
        powerModifier = 0.8;
        temperatureModifier = -1.0;
        break;
      case EEBusOperationMode.AUTO:
      default:
        // Default modifiers
        break;
    }
    
    // Current temperature trends toward target temperature if active
    let currentTemp: number;
    
    if (this.lastData && isActive) {
      // Temperature moves toward target when active
      const targetDiff = this.targetTemperature - this.lastData.temperature;
      const step = Math.min(0.5, Math.abs(targetDiff)) * Math.sign(targetDiff);
      currentTemp = this.lastData.temperature + step + (Math.random() * 0.2 - 0.1);
    } else if (this.lastData) {
      // Temperature drifts when inactive
      const ambientDrift = Math.random() * 0.3 - 0.15;
      currentTemp = this.lastData.temperature + ambientDrift;
    } else {
      // Initial temperature
      currentTemp = 18 + Math.random() * 4;
    }
    
    // Power consumption based on active state, mode, and temperature difference
    let power = 0;
    if (isActive) {
      const tempDiff = Math.abs(this.targetTemperature - currentTemp);
      power = (500 + Math.random() * 2000) * powerModifier * (1 + tempDiff * 0.1);
    } else {
      power = Math.random() * 50; // Standby power
    }
    
    // COP calculation - higher when closer to target temp
    const tempDiff = Math.abs(this.targetTemperature - currentTemp);
    const cop = 3.5 - tempDiff * 0.2 + Math.random() * 0.5;
    
    // Energy consumption (kWh) - assumes accumulation since last reading
    const energyIncrement = power * (this.device.pollInterval / 3600000); // Convert ms to hours and W to kWh
    const energy = this.lastData ? this.lastData.energy + energyIncrement : 150 + Math.random() * 50;
    
    return {
      power: Math.round(power * 10) / 10,
      energy: Math.round(energy * 100) / 100,
      temperature: Math.round(currentTemp * 10) / 10,
      targetTemperature: this.targetTemperature,
      mode: this.currentMode,
      cop: Math.round(cop * 100) / 100,
      isActive,
      timestamp: new Date().toISOString()
    };
  }

  // Publish telemetry data via MQTT
  private async publishTelemetry(data: EEBusEnergyData): Promise<void> {
    const topic = `devices/${this.device.id}/telemetry`;
    
    try {
      await this.mqttService.publish(topic, {
        deviceId: this.device.id,
        timestamp: data.timestamp,
        protocol: 'eebus',
        readings: {
          power: data.power,
          energy: data.energy,
          temperature: data.temperature,
          targetTemperature: data.targetTemperature,
          mode: data.mode,
          cop: data.cop,
          isActive: data.isActive
        }
      });
    } catch (error) {
      console.error(`Error publishing telemetry for device ${this.device.id}:`, error);
    }
  }

  // Publish device status update via MQTT
  private async publishDeviceStatus(status: string, details?: string): Promise<void> {
    const topic = `devices/${this.device.id}/status`;
    
    try {
      await this.mqttService.publish(topic, {
        deviceId: this.device.id,
        status,
        timestamp: new Date().toISOString(),
        details
      });
    } catch (error) {
      console.error(`Error publishing status for device ${this.device.id}:`, error);
    }
  }

  // Set target temperature
  async setTargetTemperature(temperature: number): Promise<boolean> {
    if (!this.connected) {
      throw new Error(`Cannot set temperature - device ${this.device.id} not connected`);
    }
    
    try {
      console.log(`Setting target temperature for device ${this.device.id} to ${temperature}°C`);
      
      // Validate temperature is within reasonable range
      if (temperature < 10 || temperature > 30) {
        throw new Error(`Temperature must be between 10°C and 30°C`);
      }
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        // Just update the local value in development mode
        this.targetTemperature = temperature;
        
        // Publish command execution
        await this.publishCommandResponse('setTargetTemperature', true, { temperature });
        
        return true;
      } else {
        // In a real implementation, we would:
        // 1. Send command to the device
        // 2. Wait for confirmation
        // 3. Return success/failure
        
        // Update local value
        this.targetTemperature = temperature;
        
        // Publish command execution
        await this.publishCommandResponse('setTargetTemperature', true, { temperature });
        
        return true;
      }
    } catch (error) {
      console.error(`Error setting target temperature for device ${this.device.id}:`, error);
      
      // Publish command failure
      await this.publishCommandResponse('setTargetTemperature', false, null, error.message);
      
      throw error;
    }
  }

  // Set operation mode
  async setOperationMode(mode: EEBusOperationMode): Promise<boolean> {
    if (!this.connected) {
      throw new Error(`Cannot set operation mode - device ${this.device.id} not connected`);
    }
    
    try {
      console.log(`Setting operation mode for device ${this.device.id} to ${mode}`);
      
      // Validate mode is a valid EEBus operation mode
      if (!Object.values(EEBusOperationMode).includes(mode)) {
        throw new Error(`Invalid operation mode: ${mode}`);
      }
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        // Just update the local value in development mode
        this.currentMode = mode;
        
        // Publish command execution
        await this.publishCommandResponse('setOperationMode', true, { mode });
        
        return true;
      } else {
        // In a real implementation, we would:
        // 1. Send command to the device
        // 2. Wait for confirmation
        // 3. Return success/failure
        
        // Update local value
        this.currentMode = mode;
        
        // Publish command execution
        await this.publishCommandResponse('setOperationMode', true, { mode });
        
        return true;
      }
    } catch (error) {
      console.error(`Error setting operation mode for device ${this.device.id}:`, error);
      
      // Publish command failure
      await this.publishCommandResponse('setOperationMode', false, null, error.message);
      
      throw error;
    }
  }

  // Publish command response via MQTT
  private async publishCommandResponse(command: string, success: boolean, result?: any, error?: string): Promise<void> {
    const topic = `devices/${this.device.id}/commands/response`;
    
    try {
      await this.mqttService.publish(topic, {
        deviceId: this.device.id,
        command,
        success,
        result,
        error,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Error publishing command response for device ${this.device.id}:`, err);
    }
  }

  // Get last data reading
  getLastReading(): EEBusEnergyData | null {
    return this.lastData;
  }

  // Get current target temperature
  getTargetTemperature(): number {
    return this.targetTemperature;
  }

  // Get current operation mode
  getOperationMode(): EEBusOperationMode {
    return this.currentMode;
  }

  // Check if device is connected
  isConnected(): boolean {
    return this.connected;
  }

  // Check if device is polling
  isPolling(): boolean {
    return this.polling;
  }
}

/**
 * EEBus Manager - Manages all EEBus devices in the system
 */
export class EEBusManager {
  private adapters: Map<number, EEBusAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    console.log('Initializing EEBus Manager');
  }
  
  // Add a new EEBus device
  async addDevice(deviceConfig: EEBusDevice): Promise<void> {
    // Check if device already exists
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`EEBus device ${deviceConfig.id} already registered`);
      return;
    }
    
    console.log(`Adding EEBus device ${deviceConfig.id}`);
    
    // Create new adapter
    const adapter = new EEBusAdapter(deviceConfig);
    
    // Store adapter
    this.adapters.set(deviceConfig.id, adapter);
    
    // Set up event handlers
    adapter.on('connected', (deviceId: number) => {
      console.log(`EEBus device ${deviceId} connected`);
    });
    
    adapter.on('disconnected', (deviceId: number) => {
      console.log(`EEBus device ${deviceId} disconnected`);
    });
    
    adapter.on('error', (error: Error) => {
      console.error('EEBus device error:', error);
    });
    
    // Connect and start polling if in development mode or if explicitly configured
    if (this.inDevelopment || deviceConfig.connection.mockMode) {
      try {
        await adapter.connect();
        await adapter.startPolling();
      } catch (error) {
        console.error(`Error starting EEBus device ${deviceConfig.id}:`, error);
      }
    }
  }
  
  // Remove an EEBus device
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      console.log(`EEBus device ${deviceId} not found`);
      return;
    }
    
    // Disconnect device
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(deviceId);
    
    console.log(`Removed EEBus device ${deviceId}`);
  }
  
  // Get a specific adapter
  getAdapter(deviceId: number): EEBusAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  // Shut down all adapters
  async shutdown(): Promise<void> {
    console.log('Shutting down EEBus Manager');
    
    // Disconnect all devices
    const shutdownPromises = Array.from(this.adapters.values()).map(adapter => adapter.disconnect());
    
    await Promise.all(shutdownPromises);
    
    // Clear adapters
    this.adapters.clear();
  }
}

// Singleton instance
let eebusManager: EEBusManager;

// Get the EEBus manager instance
export function getEEBusManager(): EEBusManager {
  if (!eebusManager) {
    eebusManager = new EEBusManager();
  }
  return eebusManager;
}