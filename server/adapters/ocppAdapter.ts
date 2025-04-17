import { EventEmitter } from 'events';
import { getMqttService } from '../services/mqttService';

/**
 * OCPP (Open Charge Point Protocol) is an open standard for communication between
 * EV charging stations and a central management system. This adapter implements
 * a simplified version of the OCPP protocol (based on versions 1.6 and 2.0).
 */

// OCPP connection configuration
export interface OCPPConnectionConfig {
  chargePointUrl: string;
  centralSystemUrl: string;
  version: '1.6' | '2.0';
  securityProfile?: number;
  authorizationKey?: string;
  mockMode?: boolean;
}

// OCPP charge point (device) interface
export interface OCPPDevice {
  id: number;
  chargePointId: string;
  connection: OCPPConnectionConfig;
  connectors: number;
  maxPower: number;
}

// Connector status enum
export enum ConnectorStatus {
  AVAILABLE = 'Available',
  PREPARING = 'Preparing',
  CHARGING = 'Charging',
  SUSPENDED_EV = 'SuspendedEV',
  SUSPENDED_EVSE = 'SuspendedEVSE',
  FINISHING = 'Finishing',
  RESERVED = 'Reserved',
  UNAVAILABLE = 'Unavailable',
  FAULTED = 'Faulted'
}

// Transaction data interface
export interface TransactionData {
  id: number;
  connectorId: number;
  tagId?: string;
  startTime: string;
  endTime?: string;
  meterStart: number;
  meterStop?: number;
  status: 'Started' | 'Updated' | 'Ended';
  energy: number;
  power: number;
  duration: number;
}

// Connector data interface
export interface ConnectorData {
  id: number;
  status: ConnectorStatus;
  errorCode?: string;
  power: number;
  energy: number;
  plugType?: string;
  maxCurrent?: number;
  currentTransaction?: number;
}

// Charge point data interface
export interface ChargePointData {
  id: number;
  chargePointId: string;
  timestamp: string;
  connectors: ConnectorData[];
  heartbeatInterval: number;
  firmwareVersion: string;
  model: string;
  vendor: string;
  maxPower: number;
  lastHeartbeat: string;
  status: 'online' | 'offline' | 'error';
}

/**
 * OCPP Adapter - Handles communication with a single OCPP charge point
 */
export class OCPPAdapter extends EventEmitter {
  private device: OCPPDevice;
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastData: ChargePointData;
  private transactions: Map<number, TransactionData> = new Map();
  private nextTransactionId: number = 1;
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor(device: OCPPDevice) {
    super();
    this.device = device;
    
    // Initialize lastData with default values
    this.lastData = {
      id: device.id,
      chargePointId: device.chargePointId,
      timestamp: new Date().toISOString(),
      connectors: Array.from({ length: device.connectors + 1 }, (_, i) => ({
        id: i,
        status: i === 0 ? ConnectorStatus.AVAILABLE : ConnectorStatus.AVAILABLE,
        power: 0,
        energy: 0
      })),
      heartbeatInterval: 60, // Default 60 seconds
      firmwareVersion: '1.0.0',
      model: 'Generic OCPP Charger',
      vendor: 'EMS System',
      maxPower: device.maxPower,
      lastHeartbeat: new Date().toISOString(),
      status: 'offline'
    };
  }
  
  // Connect to the OCPP charge point
  async connect(): Promise<boolean> {
    if (this.connected) {
      return true;
    }
    
    try {
      console.log(`Connecting to OCPP charge point ${this.device.id}`);
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        console.log(`Development mode: Using simulated data for OCPP device ${this.device.id}`);
        this.connected = true;
        this.lastData.status = 'online';
        this.emit('connected', this.device.id);
        await this.publishDeviceStatus('online');
        this.startHeartbeat();
        return true;
      }
      
      // In a real implementation, we would:
      // 1. Establish WebSocket connection to the charge point
      // 2. Perform handshake according to OCPP spec
      // 3. Set up message handlers
      
      this.connected = true;
      this.lastData.status = 'online';
      this.emit('connected', this.device.id);
      await this.publishDeviceStatus('online');
      this.startHeartbeat();
      
      return true;
    } catch (error) {
      console.error(`Error connecting to OCPP charge point ${this.device.id}:`, error);
      this.connected = false;
      this.lastData.status = 'error';
      await this.publishDeviceStatus('error', error.message);
      this.emit('error', error);
      
      // Schedule reconnect
      this.scheduleReconnect();
      
      return false;
    }
  }
  
  // Disconnect from the OCPP charge point
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      console.log(`Disconnecting from OCPP charge point ${this.device.id}`);
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Cancel reconnect timer if active
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      // In a real implementation, we would close the WebSocket connection
      
      this.connected = false;
      this.lastData.status = 'offline';
      this.emit('disconnected', this.device.id);
      await this.publishDeviceStatus('offline');
    } catch (error) {
      console.error(`Error disconnecting from OCPP charge point ${this.device.id}:`, error);
      this.emit('error', error);
    }
  }
  
  // Start heartbeat timer
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }
    
    const interval = this.lastData.heartbeatInterval * 1000; // Convert to ms
    console.log(`Starting heartbeat for OCPP charge point ${this.device.id} every ${interval}ms`);
    
    // Send initial heartbeat
    this.sendHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }
  
  // Stop heartbeat timer
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  // Send heartbeat and update status
  private async sendHeartbeat(): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      // Update last heartbeat timestamp
      this.lastData.lastHeartbeat = new Date().toISOString();
      this.lastData.timestamp = new Date().toISOString();
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        // In development, simulate changes in connector status and values
        this.updateMockData();
      } else {
        // In a real implementation, we would:
        // 1. Send Heartbeat.req to the charge point
        // 2. Process Heartbeat.conf response
        // 3. Update status based on response
      }
      
      // Publish updated data
      await this.publishTelemetry();
      
      this.emit('heartbeat', {
        deviceId: this.device.id,
        timestamp: this.lastData.lastHeartbeat
      });
    } catch (error) {
      console.error(`Error sending heartbeat to OCPP charge point ${this.device.id}:`, error);
      this.emit('error', error);
      
      // If too many heartbeat failures, mark as disconnected
      if (this.connected) {
        this.connected = false;
        this.lastData.status = 'error';
        await this.publishDeviceStatus('error', 'Heartbeat failed');
        this.scheduleReconnect();
      }
    }
  }
  
  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    const delay = 5000; // 5 seconds
    console.log(`Scheduling reconnect for OCPP charge point ${this.device.id} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      try {
        await this.connect();
      } catch (error) {
        console.error(`Error reconnecting to OCPP charge point ${this.device.id}:`, error);
        this.scheduleReconnect();
      }
    }, delay);
  }
  
  // Update mock data in development mode
  private updateMockData(): void {
    // Update timestamp
    this.lastData.timestamp = new Date().toISOString();
    
    // Process active transactions
    for (const [transactionId, transaction] of this.transactions.entries()) {
      if (transaction.status !== 'Ended') {
        // Update transaction data
        const duration = (new Date().getTime() - new Date(transaction.startTime).getTime()) / 1000;
        const connector = this.lastData.connectors[transaction.connectorId];
        
        // Simulate energy consumption (kWh)
        const newEnergy = transaction.meterStart / 1000 + (duration / 3600) * (connector.power / 1000);
        const energyDelta = newEnergy - (transaction.energy || 0);
        
        // Update transaction
        transaction.energy = newEnergy;
        transaction.duration = Math.round(duration);
        transaction.power = connector.power;
        transaction.status = 'Updated';
        
        // Emit transaction update event
        this.emit('transactionUpdate', {
          deviceId: this.device.id,
          transactionId,
          connectorId: transaction.connectorId,
          energy: transaction.energy,
          power: transaction.power,
          duration: transaction.duration
        });
      }
    }
    
    // Randomly update connector status
    for (const connector of this.lastData.connectors) {
      // Skip connector 0 (charge point main connector)
      if (connector.id === 0) continue;
      
      // Get current transaction for this connector
      const transactionId = connector.currentTransaction;
      const hasTransaction = transactionId !== undefined && this.transactions.has(transactionId);
      
      // If charging, update power with some random fluctuation
      if (connector.status === ConnectorStatus.CHARGING && hasTransaction) {
        // Fluctuate power by ±5%
        const powerFluctuation = 1 + (Math.random() * 0.1 - 0.05);
        connector.power = Math.min(
          this.device.maxPower, 
          Math.max(0, connector.power * powerFluctuation)
        );
        
        // Accumulate energy
        const transaction = this.transactions.get(transactionId)!;
        connector.energy = transaction.energy * 1000; // Convert kWh to Wh
      }
      
      // Randomly change status if no transaction
      if (!hasTransaction && Math.random() < 0.05) { // 5% chance to change
        if (connector.status === ConnectorStatus.AVAILABLE) {
          // Randomly become unavailable
          if (Math.random() < 0.3) {
            connector.status = ConnectorStatus.UNAVAILABLE;
          }
        } else if (connector.status === ConnectorStatus.UNAVAILABLE) {
          // Return to available
          connector.status = ConnectorStatus.AVAILABLE;
        }
      }
    }
  }
  
  // Publish telemetry data via MQTT
  private async publishTelemetry(): Promise<void> {
    const topic = `devices/${this.device.id}/telemetry`;
    
    // Prepare data for publishing
    const data = {
      deviceId: this.device.id,
      timestamp: this.lastData.timestamp,
      protocol: 'ocpp',
      readings: {
        chargePoint: {
          id: this.lastData.chargePointId,
          vendor: this.lastData.vendor,
          model: this.lastData.model,
          firmwareVersion: this.lastData.firmwareVersion,
          lastHeartbeat: this.lastData.lastHeartbeat
        },
        connectors: this.lastData.connectors.map(c => ({
          id: c.id,
          status: c.status,
          power: c.power,
          energy: c.energy,
          currentTransaction: c.currentTransaction
        })),
        transactions: Array.from(this.transactions.values())
          .filter(t => t.status !== 'Ended')
          .map(t => ({
            id: t.id,
            connectorId: t.connectorId,
            tagId: t.tagId,
            startTime: t.startTime,
            energy: t.energy,
            power: t.power,
            duration: t.duration
          }))
      }
    };
    
    try {
      await this.mqttService.publish(topic, data);
    } catch (error) {
      console.error(`Error publishing telemetry for OCPP device ${this.device.id}:`, error);
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
      console.error(`Error publishing status for OCPP device ${this.device.id}:`, error);
    }
  }
  
  // Start a charging transaction
  async startTransaction(connectorId: number, tagId?: string): Promise<TransactionData | null> {
    if (!this.connected) {
      throw new Error(`Cannot start transaction - charge point ${this.device.id} not connected`);
    }
    
    try {
      // Validate connector ID
      if (connectorId < 1 || connectorId >= this.lastData.connectors.length) {
        throw new Error(`Invalid connector ID: ${connectorId}`);
      }
      
      const connector = this.lastData.connectors[connectorId];
      
      // Check if connector is available
      if (connector.status !== ConnectorStatus.AVAILABLE) {
        throw new Error(`Connector ${connectorId} is not available (status: ${connector.status})`);
      }
      
      console.log(`Starting transaction on charge point ${this.device.id}, connector ${connectorId}`);
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        // Create a new transaction in development mode
        const transactionId = this.nextTransactionId++;
        const now = new Date().toISOString();
        const meterStart = Math.floor(connector.energy);
        
        const transaction: TransactionData = {
          id: transactionId,
          connectorId,
          tagId,
          startTime: now,
          meterStart,
          status: 'Started',
          energy: 0,
          power: 0,
          duration: 0
        };
        
        // Store transaction
        this.transactions.set(transactionId, transaction);
        
        // Update connector status
        connector.status = ConnectorStatus.CHARGING;
        connector.currentTransaction = transactionId;
        connector.power = Math.min(7400, this.device.maxPower); // Default to 7.4kW or max power
        
        // Publish updated data
        await this.publishTelemetry();
        
        // Emit transaction start event
        this.emit('transactionStart', {
          deviceId: this.device.id,
          transactionId,
          connectorId,
          tagId
        });
        
        // Publish command response
        await this.publishCommandResponse(
          'startTransaction',
          true,
          { transactionId, connectorId }
        );
        
        return transaction;
      } else {
        // In a real implementation, we would:
        // 1. Send RemoteStartTransaction.req to the charge point
        // 2. Process RemoteStartTransaction.conf response
        // 3. Wait for StartTransaction.req from charge point
        // 4. Send StartTransaction.conf response
        // 5. Return created transaction data
        
        // For now, simulate the same as development mode
        const transactionId = this.nextTransactionId++;
        const now = new Date().toISOString();
        const meterStart = Math.floor(connector.energy);
        
        const transaction: TransactionData = {
          id: transactionId,
          connectorId,
          tagId,
          startTime: now,
          meterStart,
          status: 'Started',
          energy: 0,
          power: 0,
          duration: 0
        };
        
        // Store transaction
        this.transactions.set(transactionId, transaction);
        
        // Update connector status
        connector.status = ConnectorStatus.CHARGING;
        connector.currentTransaction = transactionId;
        connector.power = Math.min(7400, this.device.maxPower); // Default to 7.4kW or max power
        
        // Publish updated data
        await this.publishTelemetry();
        
        // Emit transaction start event
        this.emit('transactionStart', {
          deviceId: this.device.id,
          transactionId,
          connectorId,
          tagId
        });
        
        // Publish command response
        await this.publishCommandResponse(
          'startTransaction',
          true,
          { transactionId, connectorId }
        );
        
        return transaction;
      }
    } catch (error) {
      console.error(`Error starting transaction on charge point ${this.device.id}:`, error);
      
      // Publish command failure
      await this.publishCommandResponse(
        'startTransaction',
        false,
        null,
        error.message
      );
      
      throw error;
    }
  }
  
  // Stop a charging transaction
  async stopTransaction(connectorId: number): Promise<TransactionData | null> {
    if (!this.connected) {
      throw new Error(`Cannot stop transaction - charge point ${this.device.id} not connected`);
    }
    
    try {
      // Validate connector ID
      if (connectorId < 1 || connectorId >= this.lastData.connectors.length) {
        throw new Error(`Invalid connector ID: ${connectorId}`);
      }
      
      const connector = this.lastData.connectors[connectorId];
      
      // Check if connector has an active transaction
      if (!connector.currentTransaction) {
        throw new Error(`No active transaction on connector ${connectorId}`);
      }
      
      const transactionId = connector.currentTransaction;
      const transaction = this.transactions.get(transactionId);
      
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }
      
      console.log(`Stopping transaction ${transactionId} on charge point ${this.device.id}, connector ${connectorId}`);
      
      if (this.inDevelopment && this.device.connection.mockMode) {
        // Stop the transaction in development mode
        const now = new Date().toISOString();
        const meterStop = Math.floor(connector.energy);
        
        // Update transaction
        transaction.endTime = now;
        transaction.meterStop = meterStop;
        transaction.status = 'Ended';
        
        // Update connector status
        connector.status = ConnectorStatus.AVAILABLE;
        connector.currentTransaction = undefined;
        connector.power = 0;
        
        // Publish updated data
        await this.publishTelemetry();
        
        // Emit transaction stop event
        this.emit('transactionStop', {
          deviceId: this.device.id,
          transactionId,
          connectorId,
          energy: transaction.energy,
          duration: transaction.duration
        });
        
        // Publish command response
        await this.publishCommandResponse(
          'stopTransaction',
          true,
          { transactionId, connectorId }
        );
        
        return transaction;
      } else {
        // In a real implementation, we would:
        // 1. Send RemoteStopTransaction.req to the charge point
        // 2. Process RemoteStopTransaction.conf response
        // 3. Wait for StopTransaction.req from charge point
        // 4. Send StopTransaction.conf response
        // 5. Return updated transaction data
        
        // For now, simulate the same as development mode
        const now = new Date().toISOString();
        const meterStop = Math.floor(connector.energy);
        
        // Update transaction
        transaction.endTime = now;
        transaction.meterStop = meterStop;
        transaction.status = 'Ended';
        
        // Update connector status
        connector.status = ConnectorStatus.AVAILABLE;
        connector.currentTransaction = undefined;
        connector.power = 0;
        
        // Publish updated data
        await this.publishTelemetry();
        
        // Emit transaction stop event
        this.emit('transactionStop', {
          deviceId: this.device.id,
          transactionId,
          connectorId,
          energy: transaction.energy,
          duration: transaction.duration
        });
        
        // Publish command response
        await this.publishCommandResponse(
          'stopTransaction',
          true,
          { transactionId, connectorId }
        );
        
        return transaction;
      }
    } catch (error) {
      console.error(`Error stopping transaction on charge point ${this.device.id}:`, error);
      
      // Publish command failure
      await this.publishCommandResponse(
        'stopTransaction',
        false,
        null,
        error.message
      );
      
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
  
  // Get charge point data
  getChargePointData(): ChargePointData {
    return this.lastData;
  }
  
  // Get transaction by ID
  getTransaction(transactionId: number): TransactionData | undefined {
    return this.transactions.get(transactionId);
  }
  
  // Get all transactions
  getAllTransactions(): TransactionData[] {
    return Array.from(this.transactions.values());
  }
  
  // Get active transactions
  getActiveTransactions(): TransactionData[] {
    return Array.from(this.transactions.values())
      .filter(t => t.status !== 'Ended');
  }
  
  // Get connector data
  getConnectorData(connectorId: number): ConnectorData | undefined {
    if (connectorId < 0 || connectorId >= this.lastData.connectors.length) {
      return undefined;
    }
    return this.lastData.connectors[connectorId];
  }
  
  // Check if connected
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * OCPP Manager - Manages all OCPP charge points in the system
 */
export class OCPPManager {
  private adapters: Map<number, OCPPAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    console.log('Initializing OCPP Manager');
  }
  
  // Add a new OCPP charge point
  async addDevice(deviceConfig: OCPPDevice): Promise<void> {
    // Check if device already exists
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`OCPP charge point ${deviceConfig.id} already registered`);
      return;
    }
    
    console.log(`Adding OCPP charge point ${deviceConfig.id}`);
    
    // Create adapter
    const adapter = new OCPPAdapter(deviceConfig);
    
    // Store adapter
    this.adapters.set(deviceConfig.id, adapter);
    
    // Set up event listeners
    adapter.on('connected', (deviceId: number) => {
      console.log(`OCPP charge point ${deviceId} connected`);
    });
    
    adapter.on('disconnected', (deviceId: number) => {
      console.log(`OCPP charge point ${deviceId} disconnected`);
    });
    
    adapter.on('error', (error: Error) => {
      console.error('OCPP charge point error:', error);
    });
    
    adapter.on('transactionStart', (data: any) => {
      console.log(`Transaction ${data.transactionId} started on charge point ${data.deviceId}, connector ${data.connectorId}`);
    });
    
    adapter.on('transactionStop', (data: any) => {
      console.log(`Transaction ${data.transactionId} stopped on charge point ${data.deviceId}, connector ${data.connectorId}`);
    });
    
    // Connect in development mode
    if (this.inDevelopment) {
      try {
        await adapter.connect();
      } catch (error) {
        console.error(`Error connecting to OCPP charge point ${deviceConfig.id}:`, error);
      }
    }
  }
  
  // Remove an OCPP charge point
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      console.log(`OCPP charge point ${deviceId} not found`);
      return;
    }
    
    // Disconnect
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(deviceId);
    
    console.log(`Removed OCPP charge point ${deviceId}`);
  }
  
  // Get an adapter by device ID
  getAdapter(deviceId: number): OCPPAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  // Get all charge points
  getAllChargePoints(): ChargePointData[] {
    return Array.from(this.adapters.values()).map(adapter => adapter.getChargePointData());
  }
  
  // Get all active transactions
  getAllActiveTransactions(): {
    deviceId: number;
    transaction: TransactionData;
  }[] {
    const transactions: {
      deviceId: number;
      transaction: TransactionData;
    }[] = [];
    
    for (const [deviceId, adapter] of this.adapters.entries()) {
      const deviceTransactions = adapter.getActiveTransactions();
      for (const transaction of deviceTransactions) {
        transactions.push({
          deviceId,
          transaction
        });
      }
    }
    
    return transactions;
  }
  
  // Shutdown all charge points
  async shutdown(): Promise<void> {
    console.log('Shutting down OCPP Manager');
    
    const disconnectPromises = Array.from(this.adapters.values()).map(adapter => adapter.disconnect());
    await Promise.all(disconnectPromises);
    
    this.adapters.clear();
  }
}

// Singleton instance
let ocppManager: OCPPManager;

// Get OCPP manager instance
export function getOCPPManager(): OCPPManager {
  if (!ocppManager) {
    ocppManager = new OCPPManager();
  }
  return ocppManager;
}