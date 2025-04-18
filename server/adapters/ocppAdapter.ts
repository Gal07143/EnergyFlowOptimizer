/**
 * OCPP Adapter for Energy Management System
 * 
 * This adapter implements the Open Charge Point Protocol (OCPP) to communicate
 * with electric vehicle charging stations, supporting OCPP 1.6 and 2.0.1.
 */

import { v4 as uuidv4 } from 'uuid';
import { getMqttService, formatDeviceTopic } from '../services/mqttService';
import { TOPIC_PATTERNS } from '@shared/messageSchema';
import WebSocket from 'ws';

// OCPP Protocol Versions
export enum OcppVersion {
  OCPP_16 = '1.6',
  OCPP_201 = '2.0.1'
}

// OCPP Message Types
export enum OcppMessageType {
  CALL = 2,         // Client -> Server
  CALLRESULT = 3,   // Server -> Client
  CALLERROR = 4     // Server -> Client
}

// OCPP Connection Status
export enum OcppConnectionStatus {
  DISCONNECTED = 'Disconnected',
  CONNECTING = 'Connecting',
  CONNECTED = 'Connected',
  FAILED = 'Failed'
}

// OCPP Charge Point Status
export enum ChargePointStatus {
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

// OCPP Charging Profile
export interface ChargingProfile {
  id: number;
  stackLevel: number;
  chargingProfilePurpose: 'ChargePointMaxProfile' | 'TxDefaultProfile' | 'TxProfile';
  chargingProfileKind: 'Absolute' | 'Recurring' | 'Relative';
  recurrencyKind?: 'Daily' | 'Weekly';
  validFrom?: string;
  validTo?: string;
  transactionId?: number;
  chargingSchedule: {
    duration?: number;
    startSchedule?: string;
    chargingRateUnit: 'A' | 'W';
    minChargingRate?: number;
    chargingSchedulePeriods: {
      startPeriod: number;
      limit: number;
      numberPhases?: number;
    }[];
  };
}

// OCPP Charge Point Configuration
export interface OcppChargePointConfig {
  id: string;
  endpoint: string;
  ocppVersion: OcppVersion;
  securityKey?: string;
  authenticationEnabled: boolean;
  meterValuesInterval?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  allowedChargingRates?: ('A' | 'W')[];
  maxChargingCurrents?: number[];
}

// OCPP Connector
export interface OcppConnector {
  id: number;
  type: string;
  status: ChargePointStatus;
  evConnected: boolean;
  meterValue?: number;
  meterValueUnit?: 'Wh' | 'kWh';
  currentTransaction?: {
    id: number;
    startTime: string;
    startMeterValue: number;
    idTag: string;
    status: 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
  };
}

/**
 * OCPP Charge Point Adapter
 * Handles communication with OCPP-compatible EV chargers
 */
export class OcppAdapter {
  private chargePointId: string;
  private configurationId: string;
  private ocppVersion: OcppVersion;
  private webSocketUrl: string;
  private webSocket: WebSocket | null = null;
  private messageCallbacks: Map<string, (response: any) => void> = new Map();
  private scheduledHeartbeat: NodeJS.Timeout | null = null;
  private scheduledMeterValues: NodeJS.Timeout | null = null;
  private connectionStatus: OcppConnectionStatus = OcppConnectionStatus.DISCONNECTED;
  private connectors: Map<number, OcppConnector> = new Map();
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';

  constructor(config: OcppChargePointConfig) {
    this.chargePointId = config.id;
    this.configurationId = `ocpp-${this.chargePointId}`;
    this.ocppVersion = config.ocppVersion;
    this.webSocketUrl = `${config.endpoint}/${this.chargePointId}`;
    
    // Initialize default connectors
    this.connectors.set(1, {
      id: 1,
      type: 'Type 2',
      status: ChargePointStatus.AVAILABLE,
      evConnected: false
    });

    if (this.inDevelopment) {
      console.log(`Development mode: Using simulated OCPP charge point ${this.chargePointId}`);
    }
  }

  /**
   * Connect to the OCPP central system
   */
  async connect(): Promise<boolean> {
    if (this.connectionStatus === OcppConnectionStatus.CONNECTED) {
      return true;
    }

    // For development mode, don't actually connect
    if (this.inDevelopment) {
      this.connectionStatus = OcppConnectionStatus.CONNECTED;
      console.log(`Simulated connection to OCPP charge point ${this.chargePointId}`);
      this.setupSimulation();
      this.publishStatus('online');
      return true;
    }

    try {
      this.connectionStatus = OcppConnectionStatus.CONNECTING;
      this.connectionAttempts++;
      
      const webSocketOptions: WebSocket.ClientOptions = {
        headers: {
          'Sec-WebSocket-Protocol': `ocpp${this.ocppVersion.replace('.', '')}`
        },
        handshakeTimeout: 10000
      };

      return new Promise((resolve, reject) => {
        this.webSocket = new WebSocket(this.webSocketUrl, webSocketOptions);

        this.webSocket.on('open', () => {
          this.connectionStatus = OcppConnectionStatus.CONNECTED;
          this.connectionAttempts = 0;
          console.log(`Connected to OCPP charge point ${this.chargePointId}`);
          
          this.setupHeartbeat();
          this.setupMeterValues();
          
          // Send BootNotification
          this.sendBootNotification()
            .then(() => {
              this.publishStatus('online');
              resolve(true);
            })
            .catch(error => {
              console.error(`Error sending boot notification: ${error.message}`);
              reject(error);
            });
        });

        this.webSocket.on('message', (data: WebSocket.Data) => {
          this.handleIncomingMessage(data.toString());
        });

        this.webSocket.on('error', (error: Error) => {
          console.error(`WebSocket error for charge point ${this.chargePointId}: ${error.message}`);
          
          if (this.connectionStatus === OcppConnectionStatus.CONNECTING) {
            this.connectionStatus = OcppConnectionStatus.FAILED;
            reject(error);
          } else {
            this.connectionStatus = OcppConnectionStatus.DISCONNECTED;
            this.publishStatus('error', `Connection error: ${error.message}`);
          }
        });

        this.webSocket.on('close', (code: number, reason: string) => {
          console.log(`WebSocket connection closed for charge point ${this.chargePointId}: ${code} - ${reason}`);
          this.connectionStatus = OcppConnectionStatus.DISCONNECTED;
          this.publishStatus('offline');
          
          // Clear any scheduled tasks
          this.clearScheduledTasks();
          
          // Attempt to reconnect
          if (this.connectionAttempts < this.maxConnectionAttempts) {
            setTimeout(() => this.connect(), 5000 * this.connectionAttempts);
          }
        });
      });
    } catch (error) {
      console.error(`Error connecting to OCPP charge point ${this.chargePointId}:`, error);
      this.connectionStatus = OcppConnectionStatus.FAILED;
      this.publishStatus('error', `Connection error: ${error.message}`);
      
      // Attempt to reconnect
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        setTimeout(() => this.connect(), 5000 * this.connectionAttempts);
      }
      
      return false;
    }
  }

  /**
   * Disconnect from the OCPP central system
   */
  async disconnect(): Promise<void> {
    // Clear scheduled tasks
    this.clearScheduledTasks();
    
    // For development mode, just reset state
    if (this.inDevelopment) {
      this.connectionStatus = OcppConnectionStatus.DISCONNECTED;
      console.log(`Simulated disconnection from OCPP charge point ${this.chargePointId}`);
      this.publishStatus('offline');
      return;
    }
    
    // Close the WebSocket connection
    if (this.webSocket && this.connectionStatus === OcppConnectionStatus.CONNECTED) {
      this.webSocket.close(1000, 'Intentional disconnect');
      this.webSocket = null;
      this.connectionStatus = OcppConnectionStatus.DISCONNECTED;
      this.publishStatus('offline');
      console.log(`Disconnected from OCPP charge point ${this.chargePointId}`);
    }
  }

  /**
   * Send a boot notification
   */
  private async sendBootNotification(): Promise<any> {
    if (this.inDevelopment) {
      return Promise.resolve({
        status: 'Accepted',
        currentTime: new Date().toISOString(),
        interval: 300
      });
    }
    
    const payload = {
      chargePointVendor: 'EnergyManagementSystem',
      chargePointModel: 'EMS-OCPP-Adapter',
      chargePointSerialNumber: this.chargePointId,
      firmwareVersion: '1.0.0'
    };
    
    try {
      const response = await this.sendOcppRequest('BootNotification', payload);
      return response;
    } catch (error) {
      console.error(`Failed to send boot notification for ${this.chargePointId}:`, error);
      throw error;
    }
  }

  /**
   * Setup periodic heartbeat
   */
  private setupHeartbeat(): void {
    if (this.scheduledHeartbeat) {
      clearInterval(this.scheduledHeartbeat);
    }
    
    // Default to 5 minutes if not specified
    const heartbeatInterval = 300 * 1000;
    
    this.scheduledHeartbeat = setInterval(async () => {
      try {
        const response = await this.sendHeartbeat();
        console.log(`Heartbeat sent for ${this.chargePointId}, current time: ${response.currentTime}`);
      } catch (error) {
        console.error(`Failed to send heartbeat for ${this.chargePointId}:`, error);
      }
    }, heartbeatInterval);
  }

  /**
   * Send a heartbeat
   */
  private async sendHeartbeat(): Promise<any> {
    if (this.inDevelopment) {
      return Promise.resolve({
        currentTime: new Date().toISOString()
      });
    }
    
    try {
      const response = await this.sendOcppRequest('Heartbeat', {});
      return response;
    } catch (error) {
      console.error(`Failed to send heartbeat for ${this.chargePointId}:`, error);
      throw error;
    }
  }

  /**
   * Setup periodic meter values
   */
  private setupMeterValues(): void {
    if (this.scheduledMeterValues) {
      clearInterval(this.scheduledMeterValues);
    }
    
    // Default to 1 minute if not specified
    const meterValuesInterval = 60 * 1000;
    
    this.scheduledMeterValues = setInterval(async () => {
      for (const [connectorId, connector] of this.connectors.entries()) {
        if (connector.evConnected) {
          try {
            await this.sendMeterValues(connectorId);
          } catch (error) {
            console.error(`Failed to send meter values for ${this.chargePointId}, connector ${connectorId}:`, error);
          }
        }
      }
    }, meterValuesInterval);
  }

  /**
   * Send meter values for a connector
   */
  private async sendMeterValues(connectorId: number): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    
    // For development mode or if no current transaction
    if (this.inDevelopment || !connector.currentTransaction) {
      // Update simulated meter values for development
      if (this.inDevelopment && connector.evConnected) {
        connector.meterValue = (connector.meterValue || 0) + Math.random() * 0.2;
        this.publishTelemetry();
      }
      
      return Promise.resolve();
    }
    
    const transactionId = connector.currentTransaction.id;
    const meterValue = connector.meterValue || 0;
    
    const payload = {
      connectorId,
      transactionId,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: meterValue.toString(),
              context: 'Sample.Periodic',
              format: 'Raw',
              measurand: 'Energy.Active.Import.Register',
              unit: 'Wh'
            }
          ]
        }
      ]
    };
    
    try {
      const response = await this.sendOcppRequest('MeterValues', payload);
      return response;
    } catch (error) {
      console.error(`Failed to send meter values for ${this.chargePointId}, connector ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Start a transaction
   */
  async startTransaction(connectorId: number, idTag: string): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    
    if (connector.status !== ChargePointStatus.AVAILABLE) {
      throw new Error(`Connector ${connectorId} is not available`);
    }
    
    // For development mode
    if (this.inDevelopment) {
      const transactionId = Math.floor(Math.random() * 1000000);
      const startMeterValue = 0;
      const timestamp = new Date().toISOString();
      
      connector.status = ChargePointStatus.CHARGING;
      connector.evConnected = true;
      connector.meterValue = startMeterValue;
      connector.currentTransaction = {
        id: transactionId,
        startTime: timestamp,
        startMeterValue,
        idTag,
        status: 'Accepted'
      };
      
      this.publishStatus('online');
      this.publishTelemetry();
      
      return {
        transactionId,
        idTagInfo: {
          status: 'Accepted'
        }
      };
    }
    
    // For real OCPP connection
    const meterStart = connector.meterValue || 0;
    const payload = {
      connectorId,
      idTag,
      timestamp: new Date().toISOString(),
      meterStart
    };
    
    try {
      const response = await this.sendOcppRequest('StartTransaction', payload);
      
      // Update connector state
      connector.status = ChargePointStatus.CHARGING;
      connector.evConnected = true;
      connector.currentTransaction = {
        id: response.transactionId,
        startTime: payload.timestamp,
        startMeterValue: meterStart,
        idTag,
        status: response.idTagInfo.status
      };
      
      this.publishStatus('online');
      this.publishTelemetry();
      
      return response;
    } catch (error) {
      console.error(`Failed to start transaction for ${this.chargePointId}, connector ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a transaction
   */
  async stopTransaction(connectorId: number, idTag?: string): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    
    if (!connector.currentTransaction) {
      throw new Error(`No active transaction on connector ${connectorId}`);
    }
    
    // For development mode
    if (this.inDevelopment) {
      const transactionId = connector.currentTransaction.id;
      const stopMeterValue = connector.meterValue || 0;
      const timestamp = new Date().toISOString();
      
      connector.status = ChargePointStatus.AVAILABLE;
      connector.evConnected = false;
      connector.currentTransaction = undefined;
      
      this.publishStatus('online');
      this.publishTelemetry();
      
      return {
        idTagInfo: {
          status: 'Accepted'
        }
      };
    }
    
    // For real OCPP connection
    const transactionId = connector.currentTransaction.id;
    const meterStop = connector.meterValue || 0;
    const payload = {
      transactionId,
      idTag: idTag || connector.currentTransaction.idTag,
      timestamp: new Date().toISOString(),
      meterStop
    };
    
    try {
      const response = await this.sendOcppRequest('StopTransaction', payload);
      
      // Update connector state
      connector.status = ChargePointStatus.AVAILABLE;
      connector.evConnected = false;
      connector.currentTransaction = undefined;
      
      this.publishStatus('online');
      this.publishTelemetry();
      
      return response;
    } catch (error) {
      console.error(`Failed to stop transaction for ${this.chargePointId}, connector ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Update charging profile
   */
  async setChargingProfile(connectorId: number, profile: ChargingProfile): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    
    // For development mode
    if (this.inDevelopment) {
      console.log(`Setting charging profile for connector ${connectorId}:`, profile);
      return {
        status: 'Accepted'
      };
    }
    
    // For real OCPP connection
    const payload = {
      connectorId,
      csChargingProfiles: profile
    };
    
    try {
      const response = await this.sendOcppRequest('SetChargingProfile', payload);
      return response;
    } catch (error) {
      console.error(`Failed to set charging profile for ${this.chargePointId}, connector ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Clear charging profile
   */
  async clearChargingProfile(connectorId: number, profileId?: number): Promise<any> {
    // For development mode
    if (this.inDevelopment) {
      console.log(`Clearing charging profile for connector ${connectorId}`);
      return {
        status: 'Accepted'
      };
    }
    
    // For real OCPP connection
    const payload: any = {};
    
    if (connectorId > 0) {
      payload.connectorId = connectorId;
    }
    
    if (profileId) {
      payload.chargingProfileId = profileId;
    }
    
    try {
      const response = await this.sendOcppRequest('ClearChargingProfile', payload);
      return response;
    } catch (error) {
      console.error(`Failed to clear charging profile for ${this.chargePointId}, connector ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Reset the charge point
   */
  async reset(type: 'Soft' | 'Hard'): Promise<any> {
    // For development mode
    if (this.inDevelopment) {
      console.log(`Resetting charge point ${this.chargePointId} (${type})`);
      
      // Simulate reset behavior
      for (const [connectorId, connector] of this.connectors.entries()) {
        if (connector.currentTransaction) {
          await this.stopTransaction(connectorId);
        }
        connector.status = ChargePointStatus.AVAILABLE;
      }
      
      return {
        status: 'Accepted'
      };
    }
    
    // For real OCPP connection
    const payload = {
      type
    };
    
    try {
      const response = await this.sendOcppRequest('Reset', payload);
      return response;
    } catch (error) {
      console.error(`Failed to reset charge point ${this.chargePointId}:`, error);
      throw error;
    }
  }

  /**
   * Send an OCPP request
   */
  private sendOcppRequest(action: string, payload: any): Promise<any> {
    if (!this.webSocket || this.connectionStatus !== OcppConnectionStatus.CONNECTED) {
      return Promise.reject(new Error('Not connected to charge point'));
    }
    
    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      const message = [OcppMessageType.CALL, messageId, action, payload];
      
      // Register callback for response
      this.messageCallbacks.set(messageId, (response) => {
        resolve(response);
      });
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.messageCallbacks.delete(messageId);
        reject(new Error(`Timeout waiting for response to ${action}`));
      }, 30000);
      
      // Send message
      try {
        this.webSocket!.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        this.messageCallbacks.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming OCPP message
   */
  private handleIncomingMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const messageType = message[0] as OcppMessageType;
      
      switch (messageType) {
        case OcppMessageType.CALL:
          this.handleIncomingCall(message);
          break;
        case OcppMessageType.CALLRESULT:
          this.handleCallResult(message);
          break;
        case OcppMessageType.CALLERROR:
          this.handleCallError(message);
          break;
        default:
          console.error(`Unknown message type ${messageType} from charge point ${this.chargePointId}`);
      }
    } catch (error) {
      console.error(`Error handling message from charge point ${this.chargePointId}:`, error);
    }
  }

  /**
   * Handle incoming OCPP call
   */
  private handleIncomingCall(message: any[]): void {
    const messageId = message[1];
    const action = message[2];
    const payload = message[3];
    
    console.log(`Received ${action} from charge point ${this.chargePointId}`);
    
    // Handle specific action types
    switch (action) {
      case 'StatusNotification':
        this.handleStatusNotification(messageId, payload);
        break;
      case 'MeterValues':
        this.handleMeterValues(messageId, payload);
        break;
      case 'StartTransaction':
        this.handleStartTransaction(messageId, payload);
        break;
      case 'StopTransaction':
        this.handleStopTransaction(messageId, payload);
        break;
      default:
        // Default response for unhandled actions
        this.sendCallResult(messageId, {});
    }
  }

  /**
   * Handle status notification
   */
  private handleStatusNotification(messageId: string, payload: any): void {
    const { connectorId, status, errorCode } = payload;
    
    // Update connector status
    const connector = this.connectors.get(connectorId);
    if (connector) {
      connector.status = status;
      
      // Publish status update
      this.publishStatus(
        errorCode === 'NoError' ? 'online' : 'error',
        errorCode !== 'NoError' ? `Error: ${errorCode}` : undefined
      );
    }
    
    // Send response
    this.sendCallResult(messageId, {});
  }

  /**
   * Handle meter values
   */
  private handleMeterValues(messageId: string, payload: any): void {
    const { connectorId, transactionId, meterValue } = payload;
    
    // Update connector meter values
    const connector = this.connectors.get(connectorId);
    if (connector && meterValue && meterValue.length > 0) {
      for (const meter of meterValue) {
        for (const sampledValue of meter.sampledValue) {
          if (sampledValue.measurand === 'Energy.Active.Import.Register') {
            connector.meterValue = parseFloat(sampledValue.value);
            connector.meterValueUnit = sampledValue.unit || 'Wh';
          }
        }
      }
      
      // Publish telemetry update
      this.publishTelemetry();
    }
    
    // Send response
    this.sendCallResult(messageId, {});
  }

  /**
   * Handle start transaction
   */
  private handleStartTransaction(messageId: string, payload: any): void {
    const { connectorId, idTag, timestamp, meterStart } = payload;
    
    // Update connector state
    const connector = this.connectors.get(connectorId);
    if (connector) {
      connector.status = ChargePointStatus.CHARGING;
      connector.evConnected = true;
      connector.meterValue = meterStart;
      
      // Generate transaction ID
      const transactionId = Math.floor(Math.random() * 1000000);
      
      connector.currentTransaction = {
        id: transactionId,
        startTime: timestamp,
        startMeterValue: meterStart,
        idTag,
        status: 'Accepted'
      };
      
      // Publish updates
      this.publishStatus('online');
      this.publishTelemetry();
      
      // Send response
      this.sendCallResult(messageId, {
        transactionId,
        idTagInfo: {
          status: 'Accepted'
        }
      });
    } else {
      // Send error if connector not found
      this.sendCallError(messageId, 'PropertyConstraintViolation', 'Invalid connector ID');
    }
  }

  /**
   * Handle stop transaction
   */
  private handleStopTransaction(messageId: string, payload: any): void {
    const { transactionId, idTag, timestamp, meterStop, reason } = payload;
    
    // Find connector with matching transaction
    for (const [connectorId, connector] of this.connectors.entries()) {
      if (connector.currentTransaction && connector.currentTransaction.id === transactionId) {
        // Update connector state
        connector.status = ChargePointStatus.AVAILABLE;
        connector.evConnected = false;
        connector.meterValue = meterStop;
        connector.currentTransaction = undefined;
        
        // Publish updates
        this.publishStatus('online');
        this.publishTelemetry();
        
        break;
      }
    }
    
    // Send response
    this.sendCallResult(messageId, {
      idTagInfo: {
        status: 'Accepted'
      }
    });
  }

  /**
   * Handle call result
   */
  private handleCallResult(message: any[]): void {
    const messageId = message[1];
    const payload = message[2];
    
    // Find and execute callback
    const callback = this.messageCallbacks.get(messageId);
    if (callback) {
      callback(payload);
      this.messageCallbacks.delete(messageId);
    }
  }

  /**
   * Handle call error
   */
  private handleCallError(message: any[]): void {
    const messageId = message[1];
    const errorCode = message[2];
    const errorDescription = message[3];
    const errorDetails = message[4];
    
    console.error(`Error from charge point ${this.chargePointId}: ${errorCode} - ${errorDescription}`, errorDetails);
    
    // Find and execute callback with error
    const callback = this.messageCallbacks.get(messageId);
    if (callback) {
      callback(new Error(`${errorCode}: ${errorDescription}`));
      this.messageCallbacks.delete(messageId);
    }
  }

  /**
   * Send call result
   */
  private sendCallResult(messageId: string, payload: any): void {
    if (!this.webSocket || this.connectionStatus !== OcppConnectionStatus.CONNECTED) {
      return;
    }
    
    const message = [OcppMessageType.CALLRESULT, messageId, payload];
    
    try {
      this.webSocket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending call result to charge point ${this.chargePointId}:`, error);
    }
  }

  /**
   * Send call error
   */
  private sendCallError(messageId: string, errorCode: string, errorDescription: string, errorDetails?: any): void {
    if (!this.webSocket || this.connectionStatus !== OcppConnectionStatus.CONNECTED) {
      return;
    }
    
    const message = [OcppMessageType.CALLERROR, messageId, errorCode, errorDescription, errorDetails || {}];
    
    try {
      this.webSocket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending call error to charge point ${this.chargePointId}:`, error);
    }
  }

  /**
   * Clear scheduled tasks
   */
  private clearScheduledTasks(): void {
    if (this.scheduledHeartbeat) {
      clearInterval(this.scheduledHeartbeat);
      this.scheduledHeartbeat = null;
    }
    
    if (this.scheduledMeterValues) {
      clearInterval(this.scheduledMeterValues);
      this.scheduledMeterValues = null;
    }
  }

  /**
   * Setup simulation for development mode
   */
  private setupSimulation(): void {
    if (!this.inDevelopment) {
      return;
    }
    
    // Initialize connectors with simulated data
    this.connectors.clear();
    this.connectors.set(1, {
      id: 1,
      type: 'Type 2',
      status: ChargePointStatus.AVAILABLE,
      evConnected: false,
      meterValue: 0,
      meterValueUnit: 'kWh'
    });
    
    this.connectors.set(2, {
      id: 2,
      type: 'CCS',
      status: ChargePointStatus.AVAILABLE,
      evConnected: false,
      meterValue: 0,
      meterValueUnit: 'kWh'
    });
    
    // Simulate periodic status updates
    setInterval(() => {
      // Random chance of starting a transaction
      for (const [connectorId, connector] of this.connectors.entries()) {
        if (connector.status === ChargePointStatus.AVAILABLE && !connector.evConnected && Math.random() < 0.05) {
          this.startTransaction(connectorId, `TAG-${Math.floor(Math.random() * 1000)}`);
        } else if (connector.status === ChargePointStatus.CHARGING && connector.evConnected && Math.random() < 0.1) {
          this.stopTransaction(connectorId);
        } else if (connector.evConnected) {
          // Update meter values
          connector.meterValue = (connector.meterValue || 0) + Math.random() * 0.2;
          this.publishTelemetry();
        }
      }
    }, 10000);
  }

  /**
   * Publish status via MQTT
   */
  private publishStatus(status: 'online' | 'offline' | 'error', details?: string): void {
    const statusMessage = {
      messageId: uuidv4(),
      messageType: 'status',
      timestamp: new Date().toISOString(),
      deviceId: this.chargePointId,
      status,
      details,
      deviceType: 'ev_charger',
      protocol: 'ocpp',
      version: this.ocppVersion,
      connectors: Array.from(this.connectors.values()).map(c => ({
        id: c.id,
        status: c.status,
        evConnected: c.evConnected
      }))
    };
    
    const topic = formatDeviceTopic(TOPIC_PATTERNS.STATUS, this.chargePointId);
    try {
      this.mqttService.publish(topic, statusMessage);
    } catch (error) {
      console.error(`Error publishing status for charge point ${this.chargePointId}:`, error);
    }
  }

  /**
   * Publish telemetry via MQTT
   */
  private publishTelemetry(): void {
    const readings: Record<string, number> = {};
    const units: Record<string, string> = {};
    
    // Collect readings from all connectors
    for (const [connectorId, connector] of this.connectors.entries()) {
      if (connector.meterValue !== undefined) {
        readings[`connector${connectorId}_energy`] = connector.meterValue;
        units[`connector${connectorId}_energy`] = connector.meterValueUnit || 'kWh';
      }
      
      // If charging, add power reading (estimated)
      if (connector.status === ChargePointStatus.CHARGING) {
        // Simulate power between 3.7 kW and 22 kW
        const power = 3.7 + Math.random() * 18.3;
        readings[`connector${connectorId}_power`] = power;
        units[`connector${connectorId}_power`] = 'kW';
      }
    }
    
    // Calculate total values
    readings.totalEnergy = Array.from(this.connectors.values())
      .reduce((sum, c) => sum + (c.meterValue || 0), 0);
    units.totalEnergy = 'kWh';
    
    readings.totalPower = Array.from(this.connectors.values())
      .filter(c => c.status === ChargePointStatus.CHARGING)
      .reduce((sum, c) => sum + (readings[`connector${c.id}_power`] || 0), 0);
    units.totalPower = 'kW';
    
    // Add connector status as numeric values (for charting)
    for (const [connectorId, connector] of this.connectors.entries()) {
      readings[`connector${connectorId}_charging`] = connector.status === ChargePointStatus.CHARGING ? 1 : 0;
      readings[`connector${connectorId}_available`] = connector.status === ChargePointStatus.AVAILABLE ? 1 : 0;
      readings[`connector${connectorId}_faulted`] = connector.status === ChargePointStatus.FAULTED ? 1 : 0;
    }
    
    const telemetryMessage = {
      messageId: uuidv4(),
      messageType: 'telemetry',
      timestamp: new Date().toISOString(),
      deviceId: this.chargePointId,
      readings,
      units,
      deviceType: 'ev_charger',
      protocol: 'ocpp',
      version: this.ocppVersion
    };
    
    const topic = formatDeviceTopic(TOPIC_PATTERNS.TELEMETRY, this.chargePointId);
    try {
      this.mqttService.publish(topic, telemetryMessage);
    } catch (error) {
      console.error(`Error publishing telemetry for charge point ${this.chargePointId}:`, error);
    }
  }

  /**
   * Get connector status
   */
  getConnectorStatus(connectorId: number): OcppConnector | undefined {
    return this.connectors.get(connectorId);
  }

  /**
   * Get all connectors
   */
  getAllConnectors(): OcppConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): OcppConnectionStatus {
    return this.connectionStatus;
  }
}

/**
 * OCPP Charge Point Manager
 * Manages multiple OCPP charge points
 */
export class OcppManager {
  private adapters: Map<string, OcppAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  /**
   * Add a charge point
   */
  async addChargePoint(config: OcppChargePointConfig): Promise<OcppAdapter> {
    // Check if charge point already exists
    if (this.adapters.has(config.id)) {
      return this.adapters.get(config.id)!;
    }
    
    // Create new adapter
    const adapter = new OcppAdapter(config);
    this.adapters.set(config.id, adapter);
    
    // Connect to charge point
    try {
      await adapter.connect();
    } catch (error) {
      console.error(`Failed to connect to charge point ${config.id}:`, error);
    }
    
    return adapter;
  }
  
  /**
   * Remove a charge point
   */
  async removeChargePoint(id: string): Promise<boolean> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return false;
    }
    
    // Disconnect from charge point
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(id);
    
    return true;
  }
  
  /**
   * Get a charge point adapter
   */
  getChargePoint(id: string): OcppAdapter | undefined {
    return this.adapters.get(id);
  }
  
  /**
   * Get all charge points
   */
  getAllChargePoints(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Initialize with sample charge points (for development)
   */
  async initializeWithSamples(): Promise<void> {
    if (!this.inDevelopment) {
      return;
    }
    
    console.log('Development mode: Initializing sample OCPP charge points');
    
    // Add sample charge points
    await this.addChargePoint({
      id: 'CP001',
      endpoint: 'ws://localhost:8080/ocpp',
      ocppVersion: OcppVersion.OCPP_16,
      authenticationEnabled: true
    });
    
    await this.addChargePoint({
      id: 'CP002',
      endpoint: 'ws://localhost:8080/ocpp',
      ocppVersion: OcppVersion.OCPP_201,
      authenticationEnabled: true
    });
    
    console.log('Sample OCPP charge points initialized');
  }
  
  /**
   * Disconnect all charge points
   */
  async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.disconnect();
    }
  }
}

// Initialize OCPP Manager
export const ocppManager = new OcppManager();

export default {
  OcppAdapter,
  OcppManager,
  ocppManager,
  OcppVersion,
  ChargePointStatus
};