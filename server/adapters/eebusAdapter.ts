import { getMqttService } from '../services/mqttService';
import { db } from '../db';
import { deviceReadings, devices } from '@shared/schema';
import { eq } from 'drizzle-orm';

// EEBus device modes
export type EEBusOperationMode = 
  | 'Normal' 
  | 'Eco' 
  | 'Turbo' 
  | 'Vacation' 
  | 'Off'
  | 'Automatic';

// EEBus device types
export type EEBusDeviceType = 
  | 'HeatPump' 
  | 'WaterHeater' 
  | 'Dishwasher' 
  | 'WashingMachine' 
  | 'Dryer'
  | 'EnergyManagementSystem';

// EEBus device configuration
export interface EEBusDevice {
  id: number;
  deviceId: string;
  deviceType: EEBusDeviceType;
  endpoint: string;
  secureConnection: boolean;
  description?: string;
  brand?: string;
  model?: string;
}

/**
 * EEBus Adapter manages communication with home appliances using the EEBus protocol
 */
export class EEBusAdapter {
  private deviceConfig: EEBusDevice;
  private mqttService = getMqttService();
  private isConnected: boolean = false;
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  private simulationInterval?: NodeJS.Timeout;
  
  // Device state
  private operationMode: EEBusOperationMode = 'Off';
  private currentPower: number = 0;
  private targetTemperature: number = 21;
  private currentTemperature: number = 21;
  private isFlexible: boolean = false;
  private energyConsumption: number = 0;
  
  constructor(deviceConfig: EEBusDevice) {
    this.deviceConfig = deviceConfig;
  }
  
  /**
   * Connect to the EEBus device
   */
  async connect(): Promise<void> {
    if (this.inDevelopment) {
      console.log(`Development mode: Using simulated data for EEBus device ${this.deviceConfig.id}`);
      this.simulateConnection();
      return;
    }
    
    try {
      // In production, implement actual EEBus connection
      console.log(`Connecting to EEBus device ${this.deviceConfig.id} at ${this.deviceConfig.endpoint}`);
      
      // Real implementation would connect to the EEBus device here
      this.isConnected = true;
      this.operationMode = 'Off';
      
      // Publish initial status
      await this.publishStatusUpdate();
      
    } catch (error) {
      console.error(`Error connecting to EEBus device ${this.deviceConfig.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Disconnect from the EEBus device
   */
  async disconnect(): Promise<void> {
    if (this.inDevelopment && this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
    
    // In production, implement actual EEBus disconnection
    this.isConnected = false;
    
    console.log(`Disconnected from EEBus device ${this.deviceConfig.id}`);
  }
  
  /**
   * Simulate EEBus connection for development mode
   */
  private simulateConnection(): void {
    console.log(`Simulated connection to EEBus device ${this.deviceConfig.id}`);
    this.isConnected = true;
    this.operationMode = 'Off';
    
    // Simulate periodic status updates and readings
    this.simulationInterval = setInterval(() => {
      this.simulateDeviceActivity();
    }, 10000); // Every 10 seconds
    
    // Publish initial status
    this.publishStatusUpdate();
  }
  
  /**
   * Simulate device activity for development
   */
  private simulateDeviceActivity(): void {
    // Don't update if device is off
    if (this.operationMode === 'Off') {
      this.currentPower = 0;
      this.publishStatusUpdate();
      return;
    }
    
    // Update current temperature based on target and ambient conditions
    const ambientEffect = Math.random() * 0.5 - 0.3; // Random fluctuation
    const heatingEffect = this.operationMode === 'Turbo' ? 0.5 : 0.2;
    
    if (this.deviceConfig.deviceType === 'HeatPump') {
      // Simulate heat pump behavior
      if (this.currentTemperature < this.targetTemperature) {
        // Heating mode
        this.currentTemperature += heatingEffect + ambientEffect;
        this.currentPower = this.operationMode === 'Eco' ? 1200 : 2500; // Watts
      } else {
        // Maintenance mode or idle
        this.currentTemperature += ambientEffect;
        this.currentPower = this.currentTemperature < this.targetTemperature - 0.5 ? 800 : 0;
      }
      
      // Ensure temperature doesn't go too far from target
      this.currentTemperature = Math.max(15, Math.min(30, this.currentTemperature));
      
      // Calculate energy consumption (kWh) for the 10-second interval
      const intervalHours = 10 / 3600; // 10 seconds in hours
      this.energyConsumption += (this.currentPower / 1000) * intervalHours; 
    } else {
      // Other EEBus devices like washing machines
      switch (this.operationMode) {
        case 'Normal':
          this.currentPower = 1500 + (Math.random() * 300);
          break;
        case 'Eco':
          this.currentPower = 1000 + (Math.random() * 200);
          break;
        case 'Turbo':
          this.currentPower = 2200 + (Math.random() * 400);
          break;
        case 'Automatic':
          // Cycle between different power levels
          this.currentPower = 800 + (Math.sin(Date.now() / 10000) * 1200);
          break;
        default:
          this.currentPower = 200; // Standby
      }
      
      // Calculate energy consumption (kWh) for the 10-second interval
      const intervalHours = 10 / 3600; // 10 seconds in hours
      this.energyConsumption += (this.currentPower / 1000) * intervalHours;
    }
    
    // Round values for display
    this.currentTemperature = Math.round(this.currentTemperature * 10) / 10;
    this.currentPower = Math.round(this.currentPower);
    
    // Store reading in database
    this.storeDeviceReading();
    
    // Publish status update
    this.publishStatusUpdate();
  }
  
  /**
   * Store device reading in the database
   */
  private async storeDeviceReading(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const power = this.currentPower / 1000; // Convert watts to kilowatts
      
      // Update device readings in database
      await db.insert(deviceReadings).values({
        deviceId: this.deviceConfig.id,
        timestamp,
        power: power.toString(),
        energy: this.energyConsumption.toString(),
        temperature: this.currentTemperature.toString(),
        additionalData: {
          operationMode: this.operationMode,
          targetTemperature: this.targetTemperature,
          isFlexible: this.isFlexible
        }
      });
      
    } catch (error) {
      console.error(`Error storing EEBus device reading for device ${this.deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Publish status update to MQTT
   */
  private async publishStatusUpdate(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Publish to MQTT
      await this.mqttService.publish(`devices/${this.deviceConfig.id}/status`, {
        messageType: 'status',
        timestamp,
        deviceId: this.deviceConfig.id,
        status: this.isConnected ? (this.operationMode === 'Off' ? 'standby' : 'online') : 'offline',
        operationMode: this.operationMode,
        currentPower: this.currentPower / 1000, // kW
        currentTemperature: this.currentTemperature,
        targetTemperature: this.targetTemperature,
        isFlexible: this.isFlexible,
        energyConsumption: this.energyConsumption
      });
      
      // Update device status in database
      await db.update(devices)
        .set({
          status: this.isConnected ? 
            (this.operationMode === 'Off' ? 'standby' : 'online') : 
            'offline',
          lastSeenAt: timestamp
        })
        .where(eq(devices.id, this.deviceConfig.id));
      
    } catch (error) {
      console.error(`Error publishing EEBus status update for device ${this.deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Set operation mode
   */
  async setOperationMode(mode: EEBusOperationMode): Promise<boolean> {
    console.log(`Setting operation mode for device ${this.deviceConfig.id} to ${mode}`);
    this.operationMode = mode;
    
    // In development mode, just update the status
    if (this.inDevelopment) {
      // If turning on from off state, immediately simulate an update
      if (mode !== 'Off') {
        this.simulateDeviceActivity();
      } else {
        this.currentPower = 0;
        this.publishStatusUpdate();
      }
      return true;
    }
    
    // In production, implement actual EEBus command
    // This would call the appropriate EEBus method
    
    return this.isConnected;
  }
  
  /**
   * Set target temperature (for heat pumps)
   */
  async setTargetTemperature(temperature: number): Promise<boolean> {
    if (this.deviceConfig.deviceType !== 'HeatPump' && this.deviceConfig.deviceType !== 'WaterHeater') {
      console.error(`Device ${this.deviceConfig.id} is not a temperature-controlled device`);
      return false;
    }
    
    console.log(`Setting target temperature for device ${this.deviceConfig.id} to ${temperature}°C`);
    this.targetTemperature = temperature;
    
    // In development mode, just update the status
    if (this.inDevelopment) {
      this.publishStatusUpdate();
      return true;
    }
    
    // In production, implement actual EEBus command
    // This would call the appropriate EEBus method
    
    return this.isConnected;
  }
  
  /**
   * Set flexibility status (for demand response)
   */
  async setFlexibility(isFlexible: boolean): Promise<boolean> {
    console.log(`Setting flexibility for device ${this.deviceConfig.id} to ${isFlexible}`);
    this.isFlexible = isFlexible;
    
    // In development mode, just update the status
    if (this.inDevelopment) {
      this.publishStatusUpdate();
      return true;
    }
    
    // In production, implement actual EEBus command
    // This would call the appropriate EEBus method
    
    return this.isConnected;
  }
  
  /**
   * Get the current operation mode
   */
  getOperationMode(): EEBusOperationMode {
    return this.operationMode;
  }
  
  /**
   * Get the current status information
   */
  getStatus(): {
    isConnected: boolean;
    operationMode: EEBusOperationMode;
    currentPower: number;
    currentTemperature: number;
    targetTemperature: number;
    isFlexible: boolean;
    energyConsumption: number;
  } {
    return {
      isConnected: this.isConnected,
      operationMode: this.operationMode,
      currentPower: this.currentPower,
      currentTemperature: this.currentTemperature,
      targetTemperature: this.targetTemperature,
      isFlexible: this.isFlexible,
      energyConsumption: this.energyConsumption
    };
  }
}

// Singleton manager for all EEBus devices
export class EEBusManager {
  private adapters: Map<number, EEBusAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  /**
   * Add and initialize an EEBus device
   */
  async addDevice(deviceConfig: EEBusDevice): Promise<void> {
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`EEBus device ${deviceConfig.id} already exists, updating configuration`);
      await this.removeDevice(deviceConfig.id);
    }
    
    // Create adapter
    const adapter = new EEBusAdapter(deviceConfig);
    this.adapters.set(deviceConfig.id, adapter);
    
    // Connect
    try {
      await adapter.connect();
    } catch (error) {
      console.error(`Error initializing EEBus device ${deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Remove and stop an EEBus device
   */
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) return;
    
    await adapter.disconnect();
    this.adapters.delete(deviceId);
    console.log(`Removed EEBus device ${deviceId}`);
  }
  
  /**
   * Get an EEBus adapter by device ID
   */
  getAdapter(deviceId: number): EEBusAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  /**
   * Stop and disconnect all devices
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];
    for (const [deviceId, adapter] of this.adapters.entries()) {
      shutdownPromises.push(adapter.disconnect());
      console.log(`Shutting down EEBus device ${deviceId}`);
    }
    
    await Promise.all(shutdownPromises);
    this.adapters.clear();
    console.log('All EEBus devices shut down');
  }
}

// Singleton instance
let eebusManagerInstance: EEBusManager | null = null;

/**
 * Get or create the EEBus manager instance
 */
export function getEEBusManager(): EEBusManager {
  if (!eebusManagerInstance) {
    eebusManagerInstance = new EEBusManager();
  }
  return eebusManagerInstance;
}