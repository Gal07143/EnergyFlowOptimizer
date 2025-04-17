import { getMqttService } from '../services/mqttService';
import { db } from '../db';
import { deviceReadings, devices } from '@shared/schema';
import { eq } from 'drizzle-orm';

// OCPP versions supported by the adapter
export type OCPPVersion = '1.6' | '2.0';

// OCPP connection types
export type OCPPConnectionType = 'websocket' | 'soap';

// OCPP charger status
export type ChargerStatus = 
  | 'Available' 
  | 'Preparing' 
  | 'Charging' 
  | 'SuspendedEVSE' 
  | 'SuspendedEV' 
  | 'Finishing' 
  | 'Reserved' 
  | 'Unavailable' 
  | 'Faulted';

// OCPP transaction information
export interface TransactionInfo {
  id: string;
  startTime: string;
  stopTime?: string;
  meterStart: number;
  meterStop?: number;
  tagId?: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Failed';
}

// OCPP device configuration
export interface OCPPDevice {
  id: number;
  chargePointId: string;
  version: OCPPVersion;
  connectionType: OCPPConnectionType;
  endpoint: string;
  authEnabled: boolean;
  maxPower?: number;
  connectors: number;
  transactionSupport?: boolean;
  securityProfile?: number;
}

// Mock transaction data for development
interface MockTransaction {
  id: string;
  deviceId: number;
  connectorId: number;
  status: 'InProgress' | 'Completed';
  startTime: string;
  meterStart: number;
  currentMeter: number;
  tagId?: string;
  stopTime?: string;
  meterStop?: number;
  power: number;
}

/**
 * OCPP Adapter manages communication with EV chargers using OCPP protocol
 */
export class OCPPAdapter {
  private deviceConfig: OCPPDevice;
  private status: ChargerStatus = 'Available';
  private mqttService = getMqttService();
  private transactions: Map<number, MockTransaction> = new Map(); // Connector ID -> Transaction
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  private simulationInterval?: NodeJS.Timeout;
  
  constructor(deviceConfig: OCPPDevice) {
    this.deviceConfig = deviceConfig;
  }
  
  /**
   * Connect to the OCPP charger
   */
  async connect(): Promise<void> {
    if (this.inDevelopment) {
      console.log(`Development mode: Using simulated data for OCPP device ${this.deviceConfig.id}`);
      this.simulateConnection();
      return;
    }
    
    try {
      // In production, implement actual OCPP connection via WebSocket or SOAP
      console.log(`Connecting to OCPP device ${this.deviceConfig.id} at ${this.deviceConfig.endpoint}`);
      
      // Real implementation would connect to the OCPP server here
      // For now, just set the status to Available
      this.status = 'Available';
      
      // Publish initial status
      await this.publishStatusUpdate();
    } catch (error) {
      console.error(`Error connecting to OCPP device ${this.deviceConfig.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Disconnect from the OCPP charger
   */
  async disconnect(): Promise<void> {
    if (this.inDevelopment && this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
    
    // In production, implement actual OCPP disconnection
    
    console.log(`Disconnected from OCPP device ${this.deviceConfig.id}`);
  }
  
  /**
   * Simulate OCPP connection for development mode
   */
  private simulateConnection(): void {
    console.log(`Simulated connection to OCPP device ${this.deviceConfig.id}`);
    this.status = 'Available';
    
    // Simulate periodic status updates and meter values
    this.simulationInterval = setInterval(() => {
      this.simulateActivityAndReadings();
    }, 10000); // Every 10 seconds
    
    // Publish initial status
    this.publishStatusUpdate();
  }
  
  /**
   * Simulate random EV charger activity for development
   */
  private simulateActivityAndReadings(): void {
    // Randomly decide if we should start or stop charging
    const random = Math.random();
    
    // For each connector, decide what to do
    for (let connectorId = 1; connectorId <= this.deviceConfig.connectors; connectorId++) {
      const transaction = this.transactions.get(connectorId);
      
      if (!transaction && random < 0.2) {
        // 20% chance to start a new transaction if none is in progress
        this.simulateStartTransaction(connectorId);
      } else if (transaction && random > 0.8) {
        // 20% chance to stop an in-progress transaction
        this.simulateStopTransaction(connectorId);
      } else if (transaction) {
        // Update meter values for in-progress transactions
        this.simulateUpdateMeterValues(connectorId, transaction);
      }
    }
    
    // Update overall charger status based on transactions
    this.updateStatusFromTransactions();
    
    // Publish status update
    this.publishStatusUpdate();
  }
  
  /**
   * Simulate starting a charging transaction
   */
  private simulateStartTransaction(connectorId: number): void {
    const now = new Date();
    const transactionId = `${this.deviceConfig.id}-${connectorId}-${now.getTime()}`;
    const meterStart = Math.floor(Math.random() * 1000); // Random start meter value
    
    const transaction: MockTransaction = {
      id: transactionId,
      deviceId: this.deviceConfig.id,
      connectorId,
      status: 'InProgress',
      startTime: now.toISOString(),
      meterStart,
      currentMeter: meterStart,
      tagId: `TAG${Math.floor(Math.random() * 10000)}`,
      power: Math.floor(Math.random() * 11) + 3 // 3-13 kW
    };
    
    this.transactions.set(connectorId, transaction);
    console.log(`[OCPP] Device ${this.deviceConfig.id} Connector ${connectorId} - Started transaction ${transactionId}`);
    
    // Store reading in database if needed
    this.storeDeviceReading(transaction);
  }
  
  /**
   * Simulate stopping a charging transaction
   */
  private simulateStopTransaction(connectorId: number): void {
    const transaction = this.transactions.get(connectorId);
    if (!transaction) return;
    
    const now = new Date();
    const energyConsumed = Math.random() * 30; // 0-30 kWh
    const meterStop = transaction.meterStart + (energyConsumed * 1000); // Convert kWh to Wh
    
    transaction.status = 'Completed';
    transaction.stopTime = now.toISOString();
    transaction.meterStop = meterStop;
    transaction.power = 0;
    
    console.log(`[OCPP] Device ${this.deviceConfig.id} Connector ${connectorId} - Stopped transaction ${transaction.id}, energy: ${energyConsumed.toFixed(2)} kWh`);
    
    // Store final reading
    this.storeDeviceReading(transaction);
    
    // Remove transaction
    this.transactions.delete(connectorId);
  }
  
  /**
   * Simulate updating meter values during a transaction
   */
  private simulateUpdateMeterValues(connectorId: number, transaction: MockTransaction): void {
    // Increase meter by a random amount (representing energy consumption)
    const energyIncrease = (transaction.power / 60) * (Math.random() * 0.2 + 0.9); // kWh for ~1 minute +/- 10%
    transaction.currentMeter += energyIncrease * 1000; // Convert kWh to Wh
    
    // Randomly adjust power within a reasonable range
    const powerDelta = (Math.random() - 0.5) * 2; // -1 to +1 kW
    transaction.power = Math.max(3, Math.min(22, transaction.power + powerDelta)); // Clamp between 3 and 22 kW
    
    // Store the updated reading
    this.storeDeviceReading(transaction);
  }
  
  /**
   * Store device reading in the database
   */
  private async storeDeviceReading(transaction: MockTransaction): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const power = transaction.power;
      const energy = transaction.currentMeter / 1000; // Convert Wh to kWh
      
      // Update device readings in database
      await db.insert(deviceReadings).values({
        deviceId: this.deviceConfig.id,
        timestamp,
        power: power.toString(),
        energy: energy.toString(),
        additionalData: {
          connectorId: transaction.connectorId,
          transactionId: transaction.id,
          meterValue: transaction.currentMeter,
          tagId: transaction.tagId
        }
      });
      
    } catch (error) {
      console.error(`Error storing OCPP device reading for device ${this.deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Update charger status based on active transactions
   */
  private updateStatusFromTransactions(): void {
    const activeTransactions = Array.from(this.transactions.values()).filter(t => t.status === 'InProgress');
    
    if (activeTransactions.length > 0) {
      this.status = 'Charging';
    } else {
      this.status = 'Available';
    }
  }
  
  /**
   * Publish status update to MQTT
   */
  private async publishStatusUpdate(): Promise<void> {
    try {
      const activePower = Array.from(this.transactions.values())
        .filter(t => t.status === 'InProgress')
        .reduce((sum, transaction) => sum + transaction.power, 0);
      
      const timestamp = new Date().toISOString();
      
      // Publish to MQTT
      await this.mqttService.publish(`devices/${this.deviceConfig.id}/status`, {
        messageType: 'status',
        timestamp,
        deviceId: this.deviceConfig.id,
        status: this.status,
        connectors: Array.from(this.transactions.entries()).map(([connectorId, transaction]) => ({
          id: connectorId,
          status: transaction.status === 'InProgress' ? 'Charging' : 'Available',
          power: transaction.power,
          transactionId: transaction.id
        })),
        totalPower: activePower
      });
      
      // Update device status in database
      await db.update(devices)
        .set({
          status: this.status === 'Available' ? 'online' : this.status === 'Faulted' ? 'error' : 'online',
          lastSeenAt: timestamp
        })
        .where(eq(devices.id, this.deviceConfig.id));
      
    } catch (error) {
      console.error(`Error publishing OCPP status update for device ${this.deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Start a charging transaction
   */
  async startTransaction(connectorId: number, tagId?: string): Promise<TransactionInfo | null> {
    // In development mode, use simulation
    if (this.inDevelopment) {
      // Only start if connector isn't already in use
      if (this.transactions.has(connectorId)) {
        return null;
      }
      
      this.simulateStartTransaction(connectorId);
      const transaction = this.transactions.get(connectorId);
      
      if (transaction) {
        return {
          id: transaction.id,
          startTime: transaction.startTime,
          meterStart: transaction.meterStart,
          tagId: transaction.tagId,
          status: 'InProgress'
        };
      }
      
      return null;
    }
    
    // In production, implement actual OCPP RemoteStartTransaction
    // This would call the appropriate OCPP method based on version
    
    return null;
  }
  
  /**
   * Stop a charging transaction
   */
  async stopTransaction(connectorId: number): Promise<TransactionInfo | null> {
    // In development mode, use simulation
    if (this.inDevelopment) {
      const transaction = this.transactions.get(connectorId);
      if (!transaction || transaction.status !== 'InProgress') {
        return null;
      }
      
      this.simulateStopTransaction(connectorId);
      
      if (transaction.stopTime && transaction.meterStop) {
        return {
          id: transaction.id,
          startTime: transaction.startTime,
          stopTime: transaction.stopTime,
          meterStart: transaction.meterStart,
          meterStop: transaction.meterStop,
          tagId: transaction.tagId,
          status: 'Completed'
        };
      }
      
      return null;
    }
    
    // In production, implement actual OCPP RemoteStopTransaction
    // This would call the appropriate OCPP method based on version
    
    return null;
  }
  
  /**
   * Set charge point maximum power
   */
  async setChargingProfile(connectorId: number, maxPower: number): Promise<boolean> {
    console.log(`Setting charging profile for device ${this.deviceConfig.id}, connector ${connectorId}, maxPower: ${maxPower}kW`);
    
    // In development mode, just update the simulated transaction power
    if (this.inDevelopment) {
      const transaction = this.transactions.get(connectorId);
      if (transaction && transaction.status === 'InProgress') {
        transaction.power = Math.min(transaction.power, maxPower);
        return true;
      }
      
      return false;
    }
    
    // In production, implement actual OCPP SetChargingProfile
    // This would call the appropriate OCPP method based on version
    
    return false;
  }
  
  /**
   * Get the current status of the charge point
   */
  getStatus(): ChargerStatus {
    return this.status;
  }
  
  /**
   * Get active transactions
   */
  getActiveTransactions(): TransactionInfo[] {
    return Array.from(this.transactions.values())
      .filter(t => t.status === 'InProgress')
      .map(t => ({
        id: t.id,
        startTime: t.startTime,
        meterStart: t.meterStart,
        tagId: t.tagId,
        status: 'InProgress'
      }));
  }
}

// Singleton manager for all OCPP devices
export class OCPPManager {
  private adapters: Map<number, OCPPAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  /**
   * Add and initialize an OCPP device
   */
  async addDevice(deviceConfig: OCPPDevice): Promise<void> {
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`OCPP device ${deviceConfig.id} already exists, updating configuration`);
      await this.removeDevice(deviceConfig.id);
    }
    
    // Create adapter
    const adapter = new OCPPAdapter(deviceConfig);
    this.adapters.set(deviceConfig.id, adapter);
    
    // Connect
    try {
      await adapter.connect();
    } catch (error) {
      console.error(`Error initializing OCPP device ${deviceConfig.id}:`, error);
    }
  }
  
  /**
   * Remove and stop an OCPP device
   */
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) return;
    
    await adapter.disconnect();
    this.adapters.delete(deviceId);
    console.log(`Removed OCPP device ${deviceId}`);
  }
  
  /**
   * Get an OCPP adapter by device ID
   */
  getAdapter(deviceId: number): OCPPAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  /**
   * Stop and disconnect all devices
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];
    for (const [deviceId, adapter] of this.adapters.entries()) {
      shutdownPromises.push(adapter.disconnect());
      console.log(`Shutting down OCPP device ${deviceId}`);
    }
    
    await Promise.all(shutdownPromises);
    this.adapters.clear();
    console.log('All OCPP devices shut down');
  }
}

// Singleton instance
let ocppManagerInstance: OCPPManager | null = null;

/**
 * Get or create the OCPP manager instance
 */
export function getOCPPManager(): OCPPManager {
  if (!ocppManagerInstance) {
    ocppManagerInstance = new OCPPManager();
  }
  return ocppManagerInstance;
}