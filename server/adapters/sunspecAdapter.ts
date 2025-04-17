import { getMqttService } from '../services/mqttService';
import { db } from '../db';
import { deviceReadings, devices } from '@shared/schema';
import { eq } from 'drizzle-orm';

// SunSpec device types
export type SunSpecDeviceType = 
  | 'Inverter' 
  | 'Meter' 
  | 'EnergyStorage' 
  | 'StringCombiner'
  | 'Tracker';

// SunSpec connection types
export type SunSpecConnectionType = 
  | 'Modbus-TCP' 
  | 'Modbus-RTU' 
  | 'SunSpec-MQTT';

// SunSpec inverter status
export type InverterStatus = 
  | 'Off' 
  | 'Sleeping' 
  | 'Starting' 
  | 'Running' 
  | 'Standby'
  | 'Fault'
  | 'ShuttingDown';

// SunSpec model information
export interface SunSpecModel {
  id: number;
  length: number;
  name: string;
  points: SunSpecPoint[];
}

// SunSpec data point
export interface SunSpecPoint {
  name: string;
  offset: number;
  type: string;
  length: number;
  scale?: string;
  units?: string;
  description?: string;
}

// SunSpec device configuration
export interface SunSpecDevice {
  id: number;
  deviceId: string;
  deviceType: SunSpecDeviceType;
  connectionType: SunSpecConnectionType;
  modbusAddress?: number;
  modbusPort?: number;
  modbusIp?: string;
  scanInterval?: number; // milliseconds
  models?: number[]; // SunSpec model IDs to scan
  modbusBaseAddress?: number; // Modbus base address (default: 40000)
}

/**
 * SunSpec Adapter manages communication with solar inverters and PV equipment using the SunSpec protocol
 */
export class SunSpecAdapter {
  private deviceConfig: SunSpecDevice;
  private mqttService = getMqttService();
  private isConnected: boolean = false;
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  private simulationInterval?: NodeJS.Timeout;
  
  // Device state
  private status: InverterStatus = 'Off';
  private activePower: number = 0; // W
  private reactivePower: number = 0; // VAr
  private energyTotal: number = 0; // Wh
  private dcVoltage: number = 0; // V
  private dcCurrent: number = 0; // A
  private acVoltage: number = 230; // V
  private temperature: number = 25; // C
  private efficiency: number = 0.96; // %
  private dayProduction: number = 0; // kWh
  
  // Weather simulation for PV production
  private currentWeather: 'Sunny' | 'PartlyCloudy' | 'Cloudy' | 'Rainy' = 'Sunny';
  private cloudCoverage: number = 0; // 0-100%
  private currentHour: number = new Date().getHours();
  
  constructor(deviceConfig: SunSpecDevice) {
    this.deviceConfig = deviceConfig;
  }
  
  /**
   * Connect to the SunSpec device
   */
  async connect(): Promise<void> {
    if (this.inDevelopment) {
      console.log(`Development mode: Using simulated data for SunSpec device ${this.deviceConfig.id}`);
      this.simulateConnection();
      return;
    }
    
    try {
      // In production, implement actual SunSpec connection via Modbus
      console.log(`Connecting to SunSpec device ${this.deviceConfig.id}`);
      
      // Real implementation would connect to the SunSpec device here using Modbus
      this.isConnected = true;
      this.status = 'Off';
      
      // Publish initial status
      await this.publishStatusUpdate();
      
    } catch (error) {
      console.error(`Error connecting to SunSpec device ${this.deviceConfig.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Disconnect from the SunSpec device
   */
  async disconnect(): Promise<void> {
    if (this.inDevelopment && this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
    
    // In production, implement actual SunSpec disconnection
    this.isConnected = false;
    
    console.log(`Disconnected from SunSpec device ${this.deviceConfig.id}`);
  }
  
  /**
   * Simulate SunSpec connection for development mode
   */
  private simulateConnection(): void {
    console.log(`Simulated connection to SunSpec device ${this.deviceConfig.id}`);
    this.isConnected = true;
    this.status = 'Running';
    
    // Initialize energy production values
    this.energyTotal = Math.random() * 50000; // Random starting value in Wh
    this.dayProduction = 0;
    
    // Simulate periodic status updates and readings
    this.simulationInterval = setInterval(() => {
      this.simulateDeviceActivity();
    }, 10000); // Every 10 seconds
    
    // Publish initial status
    this.publishStatusUpdate();
  }
  
  /**
   * Simulate solar inverter activity for development
   */
  private simulateDeviceActivity(): void {
    // Update current hour
    this.currentHour = new Date().getHours();
    
    // Simulate weather changes
    this.simulateWeather();
    
    // Simulate solar production based on time of day and weather
    this.simulateSolarProduction();
    
    // Update device status based on power production
    if (this.activePower > 50) {
      this.status = 'Running';
    } else if (this.currentHour >= 6 && this.currentHour < 20) {
      this.status = 'Standby';
    } else {
      this.status = 'Sleeping';
    }
    
    // Store reading in database
    this.storeDeviceReading();
    
    // Publish status update
    this.publishStatusUpdate();
  }
  
  /**
   * Simulate weather conditions
   */
  private simulateWeather(): void {
    // Occasionally change weather conditions
    if (Math.random() < 0.1) {
      const weatherChance = Math.random();
      if (weatherChance < 0.5) {
        this.currentWeather = 'Sunny';
        this.cloudCoverage = Math.random() * 20;
      } else if (weatherChance < 0.8) {
        this.currentWeather = 'PartlyCloudy';
        this.cloudCoverage = 20 + Math.random() * 40;
      } else if (weatherChance < 0.95) {
        this.currentWeather = 'Cloudy';
        this.cloudCoverage = 60 + Math.random() * 30;
      } else {
        this.currentWeather = 'Rainy';
        this.cloudCoverage = 80 + Math.random() * 20;
      }
    } else {
      // Small fluctuations in cloud coverage
      this.cloudCoverage += (Math.random() - 0.5) * 10;
      this.cloudCoverage = Math.max(0, Math.min(100, this.cloudCoverage));
    }
  }
  
  /**
   * Simulate solar production based on time of day and weather
   */
  private simulateSolarProduction(): void {
    // Base production curve based on hour of day (bell curve centered at noon)
    let hourFactor = 0;
    if (this.currentHour >= 6 && this.currentHour <= 20) {
      // Hour factor peaks at noon (hour 12)
      const hourFromNoon = Math.abs(this.currentHour - 12);
      hourFactor = Math.cos(hourFromNoon * 0.45) * 0.5 + 0.5; // 0-1 factor
    }
    
    // Weather factor based on cloud coverage
    const weatherFactor = 1 - (this.cloudCoverage / 100);
    
    // Calculate active power in watts (assuming a ~5kW system)
    const maxPower = 5000;
    this.activePower = maxPower * hourFactor * weatherFactor;
    
    // Add some noise to the production
    this.activePower += (Math.random() - 0.5) * 200;
    this.activePower = Math.max(0, this.activePower);
    
    // Calculate reactive power (typically very low for solar inverters)
    this.reactivePower = this.activePower * 0.05 * (Math.random() * 0.1);
    
    // Calculate DC voltage (higher in bright conditions)
    this.dcVoltage = 300 + (this.activePower / maxPower) * 100 + (Math.random() - 0.5) * 10;
    
    // Calculate DC current based on power and voltage
    this.dcCurrent = this.activePower / this.dcVoltage;
    
    // Update temperature (increases with power production)
    const ambientTemp = 20 + (Math.random() - 0.5) * 5;
    const powerHeatFactor = (this.activePower / maxPower) * 15; // Up to 15 degrees increase at max power
    this.temperature = ambientTemp + powerHeatFactor;
    
    // Update energy production (convert W to Wh for the 10-second interval)
    const energyProduced = (this.activePower / 360); // 10 seconds = 1/360 of an hour
    this.energyTotal += energyProduced;
    this.dayProduction += energyProduced / 1000; // Add to daily production in kWh
    
    // Reset daily production at midnight
    if (this.currentHour === 0 && Math.random() < 0.1) {
      this.dayProduction = 0;
    }
    
    // Update efficiency (realistic inverter efficiency decreases slightly at very low or very high power)
    const normalizedPower = this.activePower / maxPower; // 0-1
    if (normalizedPower < 0.1) {
      this.efficiency = 0.91 + normalizedPower * 0.5; // 91-96%
    } else {
      this.efficiency = 0.96 + (Math.random() - 0.5) * 0.01; // ~96% +/- 0.5%
    }
    
    // Round values
    this.activePower = Math.round(this.activePower);
    this.reactivePower = Math.round(this.reactivePower);
    this.dcVoltage = Math.round(this.dcVoltage * 10) / 10;
    this.dcCurrent = Math.round(this.dcCurrent * 100) / 100;
    this.temperature = Math.round(this.temperature * 10) / 10;
    this.efficiency = Math.round(this.efficiency * 1000) / 1000;
    this.dayProduction = Math.round(this.dayProduction * 1000) / 1000;
  }
  
  /**
   * Store device reading in the database
   */
  private async storeDeviceReading(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const power = this.activePower / 1000; // Convert watts to kilowatts
      const energy = this.energyTotal / 1000; // Convert watt-hours to kilowatt-hours
      
      // Update device readings in database
      await db.insert(deviceReadings).values({
        deviceId: this.deviceConfig.id,
        timestamp,
        power: power.toString(),
        energy: energy.toString(),
        voltage: this.dcVoltage.toString(),
        current: this.dcCurrent.toString(),
        temperature: this.temperature.toString(),
        additionalData: {
          status: this.status,
          acVoltage: this.acVoltage,
          reactivePower: this.reactivePower,
          efficiency: this.efficiency,
          dayProduction: this.dayProduction,
          weatherCondition: this.currentWeather,
          cloudCoverage: this.cloudCoverage
        }
      });
      
    } catch (error) {
      console.error(`Error storing SunSpec device reading for device ${this.deviceConfig.id}:`, error);
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
        status: this.isConnected ? 
          (this.status === 'Off' || this.status === 'Sleeping' ? 'standby' : 
           this.status === 'Fault' ? 'error' : 'online') : 
          'offline',
        inverterStatus: this.status,
        activePower: this.activePower,
        reactivePower: this.reactivePower,
        dcVoltage: this.dcVoltage,
        dcCurrent: this.dcCurrent,
        temperature: this.temperature,
        efficiency: this.efficiency,
        energyTotal: this.energyTotal / 1000, // kWh
        dayProduction: this.dayProduction // kWh
      });
      
      // Update device status in database
      await db.update(devices)
        .set({
          status: this.isConnected ? 
            (this.status === 'Off' || this.status === 'Sleeping' ? 'standby' : 
             this.status === 'Fault' ? 'error' : 'online') : 
            'offline',
          lastSeenAt: timestamp
        })
        .where(eq(devices.id, this.deviceConfig.id));
      
    } catch (error) {
      console.error(`Error publishing SunSpec status update for device ${this.deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Get the current sunspec data values
   */
  getSunSpecData(): {
    status: InverterStatus;
    activePower: number;
    reactivePower: number;
    energyTotal: number;
    dcVoltage: number;
    dcCurrent: number;
    temperature: number;
    efficiency: number;
    dayProduction: number;
  } {
    return {
      status: this.status,
      activePower: this.activePower,
      reactivePower: this.reactivePower,
      energyTotal: this.energyTotal,
      dcVoltage: this.dcVoltage,
      dcCurrent: this.dcCurrent,
      temperature: this.temperature,
      efficiency: this.efficiency,
      dayProduction: this.dayProduction
    };
  }
}

// Singleton manager for all SunSpec devices
export class SunSpecManager {
  private adapters: Map<number, SunSpecAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  /**
   * Add and initialize a SunSpec device
   */
  async addDevice(deviceConfig: SunSpecDevice): Promise<void> {
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`SunSpec device ${deviceConfig.id} already exists, updating configuration`);
      await this.removeDevice(deviceConfig.id);
    }
    
    // Create adapter
    const adapter = new SunSpecAdapter(deviceConfig);
    this.adapters.set(deviceConfig.id, adapter);
    
    // Connect
    try {
      await adapter.connect();
    } catch (error) {
      console.error(`Error initializing SunSpec device ${deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Remove and stop a SunSpec device
   */
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) return;
    
    await adapter.disconnect();
    this.adapters.delete(deviceId);
    console.log(`Removed SunSpec device ${deviceId}`);
  }
  
  /**
   * Get a SunSpec adapter by device ID
   */
  getAdapter(deviceId: number): SunSpecAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  /**
   * Stop and disconnect all devices
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];
    for (const [deviceId, adapter] of this.adapters.entries()) {
      shutdownPromises.push(adapter.disconnect());
      console.log(`Shutting down SunSpec device ${deviceId}`);
    }
    
    await Promise.all(shutdownPromises);
    this.adapters.clear();
    console.log('All SunSpec devices shut down');
  }
}

// Singleton instance
let sunspecManagerInstance: SunSpecManager | null = null;

/**
 * Get or create the SunSpec manager instance
 */
export function getSunSpecManager(): SunSpecManager {
  if (!sunspecManagerInstance) {
    sunspecManagerInstance = new SunSpecManager();
  }
  return sunspecManagerInstance;
}