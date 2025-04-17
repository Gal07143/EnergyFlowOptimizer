import { EventEmitter } from 'events';
import { Socket, createConnection } from 'net';
import { getMqttService } from '../services/mqttService';

/**
 * TCP/IP Adapter - Provides a generic TCP/IP interface for connecting to devices over Ethernet/IP
 * This adapter can be used for various devices that communicate over raw TCP/IP
 */

// TCP/IP connection configuration
export interface TCPIPConnectionConfig {
  host: string;
  port: number;
  connectionTimeout?: number;
  reconnectInterval?: number;
  keepAlive?: boolean;
  dataFormat?: 'hex' | 'ascii' | 'utf8' | 'json';
  mockMode?: boolean;
}

// TCP/IP device interface
export interface TCPIPDevice {
  id: number;
  deviceId: string;
  connection: TCPIPConnectionConfig;
  pollInterval?: number;
  commands?: Record<string, string | Buffer>;
}

// TCP/IP data packet
export interface TCPIPDataPacket {
  timestamp: string;
  deviceId: number;
  data: string | Buffer | Record<string, any>;
  dataFormat: 'hex' | 'ascii' | 'utf8' | 'json';
  rawData?: Buffer;
}

/**
 * TCP/IP Device Adapter - Manages communication with a single TCP/IP device
 */
export class TCPIPAdapter extends EventEmitter {
  private device: TCPIPDevice;
  private socket: Socket | null = null;
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private polling: boolean = false;
  private buffer: Buffer = Buffer.alloc(0);
  private lastData: TCPIPDataPacket | null = null;
  private mqttService = getMqttService();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor(device: TCPIPDevice) {
    super();
    this.device = device;
  }
  
  // Connect to the TCP/IP device
  async connect(): Promise<boolean> {
    if (this.connected && this.socket) {
      return true;
    }
    
    try {
      console.log(`Connecting to TCP/IP device ${this.device.id} at ${this.device.connection.host}:${this.device.connection.port}`);
      
      // If in development mode and mock mode is enabled, simulate connection
      if (this.inDevelopment && this.device.connection.mockMode) {
        console.log(`Development mode: Using simulated data for TCP/IP device ${this.device.id}`);
        this.connected = true;
        await this.publishDeviceStatus('online');
        this.emit('connected', this.device.id);
        return true;
      }
      
      // Create a new socket connection
      return new Promise((resolve, reject) => {
        const timeout = this.device.connection.connectionTimeout || 10000;
        
        this.socket = createConnection({
          host: this.device.connection.host,
          port: this.device.connection.port
        });
        
        // Set socket options
        this.socket.setEncoding('utf8');
        if (this.device.connection.keepAlive) {
          this.socket.setKeepAlive(true);
        }
        
        // Set timeout
        const connectTimeout = setTimeout(() => {
          if (this.socket) {
            this.socket.destroy();
            this.socket = null;
          }
          reject(new Error(`Connection timeout after ${timeout}ms`));
        }, timeout);
        
        // Handle connection success
        this.socket.on('connect', async () => {
          clearTimeout(connectTimeout);
          console.log(`Connected to TCP/IP device ${this.device.id}`);
          this.connected = true;
          this.buffer = Buffer.alloc(0);
          await this.publishDeviceStatus('online');
          this.setupSocketListeners();
          this.emit('connected', this.device.id);
          resolve(true);
        });
        
        // Handle connection errors
        this.socket.on('error', (err) => {
          clearTimeout(connectTimeout);
          console.error(`Error connecting to TCP/IP device ${this.device.id}:`, err.message);
          if (!this.connected) {
            reject(err);
          }
        });
      });
    } catch (error: any) {
      console.error(`Error in TCP/IP connection for device ${this.device.id}:`, error.message);
      await this.publishDeviceStatus('error', error.message);
      this.emit('error', error);
      
      // Schedule reconnect
      this.scheduleReconnect();
      
      return false;
    }
  }
  
  // Set up socket event listeners
  private setupSocketListeners(): void {
    if (!this.socket) return;
    
    // Handle data reception
    this.socket.on('data', (data: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      this.processReceivedData();
    });
    
    // Handle socket close
    this.socket.on('close', async (hadError) => {
      console.log(`Connection to TCP/IP device ${this.device.id} closed${hadError ? ' with error' : ''}`);
      this.connected = false;
      this.socket = null;
      await this.publishDeviceStatus('offline');
      this.emit('disconnected', this.device.id);
      
      // Schedule reconnect
      this.scheduleReconnect();
    });
    
    // Handle socket errors
    this.socket.on('error', async (error) => {
      console.error(`Error with TCP/IP device ${this.device.id}:`, error.message);
      await this.publishDeviceStatus('error', error.message);
      this.emit('error', error);
    });
    
    // Handle socket timeout
    this.socket.on('timeout', async () => {
      console.warn(`Connection to TCP/IP device ${this.device.id} timed out`);
      this.socket?.destroy();
      this.socket = null;
      this.connected = false;
      await this.publishDeviceStatus('offline');
      this.emit('disconnected', this.device.id);
      
      // Schedule reconnect
      this.scheduleReconnect();
    });
  }
  
  // Process received data
  private processReceivedData(): void {
    // This is a basic implementation that assumes each data packet is complete
    // In a real implementation, you would implement a protocol-specific parsing logic
    // based on the device's communication protocol
    
    if (this.buffer.length === 0) return;
    
    try {
      const dataFormat = this.device.connection.dataFormat || 'utf8';
      let parsedData: any;
      
      switch (dataFormat) {
        case 'hex':
          parsedData = this.buffer.toString('hex');
          break;
        case 'ascii':
          parsedData = this.buffer.toString('ascii');
          break;
        case 'json':
          try {
            const jsonStr = this.buffer.toString('utf8');
            parsedData = JSON.parse(jsonStr);
          } catch (e) {
            console.error(`Error parsing JSON from TCP/IP device ${this.device.id}:`, e);
            parsedData = this.buffer.toString('utf8');
          }
          break;
        case 'utf8':
        default:
          parsedData = this.buffer.toString('utf8');
          break;
      }
      
      // Create data packet
      const dataPacket: TCPIPDataPacket = {
        timestamp: new Date().toISOString(),
        deviceId: this.device.id,
        data: parsedData,
        dataFormat,
        rawData: Buffer.from(this.buffer) // Make a copy of the buffer
      };
      
      // Store last data
      this.lastData = dataPacket;
      
      // Publish data via MQTT
      this.publishTelemetry(dataPacket);
      
      // Emit data event
      this.emit('data', dataPacket);
      
      // Clear buffer
      this.buffer = Buffer.alloc(0);
    } catch (error) {
      console.error(`Error processing data from TCP/IP device ${this.device.id}:`, error);
      this.emit('error', error);
    }
  }
  
  // Disconnect from the device
  async disconnect(): Promise<void> {
    // Stop polling if active
    this.stopPolling();
    
    // Cancel reconnect timer if active
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (!this.connected || !this.socket) {
      return;
    }
    
    try {
      console.log(`Disconnecting from TCP/IP device ${this.device.id}`);
      
      // Close the socket
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
      
      await this.publishDeviceStatus('offline');
      this.emit('disconnected', this.device.id);
    } catch (error) {
      console.error(`Error disconnecting from TCP/IP device ${this.device.id}:`, error);
      this.emit('error', error);
    }
  }
  
  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    const delay = this.device.connection.reconnectInterval || 10000;
    console.log(`Scheduling reconnect for TCP/IP device ${this.device.id} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      try {
        await this.connect();
      } catch (error) {
        console.error(`Error reconnecting to TCP/IP device ${this.device.id}:`, error);
        this.scheduleReconnect();
      }
    }, delay);
  }
  
  // Send data to the device
  async sendData(data: string | Buffer): Promise<boolean> {
    if (!this.connected) {
      throw new Error(`Cannot send data - device ${this.device.id} not connected`);
    }
    
    try {
      if (this.inDevelopment && this.device.connection.mockMode) {
        console.log(`Mock sending to TCP/IP device ${this.device.id}:`, 
                    typeof data === 'string' ? data : data.toString('hex'));
        // Simulate a response
        setTimeout(() => {
          const mockResponse = Buffer.from(`MOCK_RESPONSE:${new Date().toISOString()}`);
          this.buffer = Buffer.concat([this.buffer, mockResponse]);
          this.processReceivedData();
        }, 100);
        
        return true;
      }
      
      if (!this.socket) {
        throw new Error(`Socket not available for device ${this.device.id}`);
      }
      
      // Send data
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error(`Socket not available for device ${this.device.id}`));
          return;
        }
        
        this.socket.write(data, (err) => {
          if (err) {
            console.error(`Error sending data to TCP/IP device ${this.device.id}:`, err.message);
            reject(err);
            return;
          }
          
          console.log(`Data sent to TCP/IP device ${this.device.id}`);
          resolve(true);
        });
      });
    } catch (error: any) {
      console.error(`Error sending data to TCP/IP device ${this.device.id}:`, error.message);
      this.emit('error', error);
      throw error;
    }
  }
  
  // Start polling the device
  async startPolling(): Promise<void> {
    if (this.polling || this.pollTimer || !this.device.pollInterval) {
      return;
    }
    
    if (!this.connected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error(`Cannot start polling - device ${this.device.id} not connected`);
      }
    }
    
    console.log(`Started polling TCP/IP device ${this.device.id} every ${this.device.pollInterval}ms`);
    
    this.polling = true;
    
    // Initial poll
    await this.poll();
    
    // Set up interval for polling
    this.pollTimer = setInterval(() => {
      this.poll().catch(error => {
        console.error(`Error polling TCP/IP device ${this.device.id}:`, error);
      });
    }, this.device.pollInterval);
  }
  
  // Stop polling the device
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.polling = false;
      console.log(`Stopped polling TCP/IP device ${this.device.id}`);
    }
  }
  
  // Poll the device for data
  private async poll(): Promise<void> {
    // If device has predefined poll command, use it
    if (this.device.commands && this.device.commands.poll) {
      const pollCommand = this.device.commands.poll;
      await this.sendData(pollCommand);
    } else if (this.inDevelopment && this.device.connection.mockMode) {
      // In development mode, generate mock data
      const mockData = this.generateMockData();
      await this.publishTelemetry(mockData);
      this.lastData = mockData;
      this.emit('data', mockData);
    }
  }
  
  // Generate mock data for development
  private generateMockData(): TCPIPDataPacket {
    // Generate some random data
    const dataFormat = this.device.connection.dataFormat || 'utf8';
    let data: any;
    
    switch (dataFormat) {
      case 'json':
        data = {
          timestamp: new Date().toISOString(),
          readings: {
            sensor1: Math.random() * 100,
            sensor2: Math.random() * 100,
            status: Math.random() > 0.8 ? 'warning' : 'normal'
          },
          status: {
            uptime: Math.floor(Math.random() * 1000000),
            errors: Math.floor(Math.random() * 10)
          }
        };
        break;
      case 'hex':
        const hexData = Buffer.alloc(20);
        for (let i = 0; i < 20; i++) {
          hexData[i] = Math.floor(Math.random() * 256);
        }
        data = hexData.toString('hex');
        break;
      case 'ascii':
      case 'utf8':
      default:
        data = `DEVICE:${this.device.id} TIME:${new Date().toISOString()} VALUE:${Math.random() * 100}`;
        break;
    }
    
    return {
      timestamp: new Date().toISOString(),
      deviceId: this.device.id,
      data,
      dataFormat
    };
  }
  
  // Execute a command on the device
  async executeCommand(commandName: string, parameters?: Record<string, any>): Promise<boolean> {
    if (!this.connected) {
      throw new Error(`Cannot execute command - device ${this.device.id} not connected`);
    }
    
    try {
      console.log(`Executing command ${commandName} on TCP/IP device ${this.device.id}`);
      
      if (!this.device.commands || !this.device.commands[commandName]) {
        throw new Error(`Command ${commandName} not defined for device ${this.device.id}`);
      }
      
      let commandData = this.device.commands[commandName];
      
      // If parameters are provided, replace placeholders in command
      if (parameters && typeof commandData === 'string') {
        for (const [key, value] of Object.entries(parameters)) {
          commandData = commandData.replace(`{${key}}`, value.toString());
        }
      }
      
      // Send command to device
      const result = await this.sendData(commandData);
      
      // Publish command execution
      await this.publishCommandResponse(commandName, true, parameters);
      
      return result;
    } catch (error: any) {
      console.error(`Error executing command ${commandName} on device ${this.device.id}:`, error.message);
      
      // Publish command failure
      await this.publishCommandResponse(commandName, false, parameters, error.message);
      
      throw error;
    }
  }
  
  // Publish telemetry data via MQTT
  private async publishTelemetry(data: TCPIPDataPacket): Promise<void> {
    const topic = `devices/${this.device.id}/telemetry`;
    
    try {
      await this.mqttService.publish(topic, {
        deviceId: this.device.id,
        timestamp: data.timestamp,
        protocol: 'tcpip',
        readings: data.data
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
  
  // Publish command response via MQTT
  private async publishCommandResponse(command: string, success: boolean, parameters?: Record<string, any>, error?: string): Promise<void> {
    const topic = `devices/${this.device.id}/commands/response`;
    
    try {
      await this.mqttService.publish(topic, {
        deviceId: this.device.id,
        command,
        success,
        parameters,
        error,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error publishing command response for device ${this.device.id}:`, error);
    }
  }
  
  // Get the last received data
  getLastData(): TCPIPDataPacket | null {
    return this.lastData;
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
 * TCP/IP Manager - Manages all TCP/IP devices in the system
 */
export class TCPIPManager {
  private adapters: Map<number, TCPIPAdapter> = new Map();
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    console.log('Initializing TCP/IP Manager');
  }
  
  // Add a new TCP/IP device
  async addDevice(deviceConfig: TCPIPDevice): Promise<void> {
    // Check if device already exists
    if (this.adapters.has(deviceConfig.id)) {
      console.log(`TCP/IP device ${deviceConfig.id} already registered`);
      return;
    }
    
    console.log(`Adding TCP/IP device ${deviceConfig.id}`);
    
    // Create new adapter
    const adapter = new TCPIPAdapter(deviceConfig);
    
    // Store adapter
    this.adapters.set(deviceConfig.id, adapter);
    
    // Set up event handlers
    adapter.on('connected', (deviceId: number) => {
      console.log(`TCP/IP device ${deviceId} connected`);
    });
    
    adapter.on('disconnected', (deviceId: number) => {
      console.log(`TCP/IP device ${deviceId} disconnected`);
    });
    
    adapter.on('error', (error: Error) => {
      console.error('TCP/IP device error:', error);
    });
    
    adapter.on('data', (data: TCPIPDataPacket) => {
      console.debug(`Received data from TCP/IP device ${data.deviceId}`);
    });
    
    // Connect and start polling if in development mode or if explicitly configured
    if (this.inDevelopment && deviceConfig.connection.mockMode) {
      try {
        await adapter.connect();
        if (deviceConfig.pollInterval) {
          await adapter.startPolling();
        }
      } catch (error) {
        console.error(`Error starting TCP/IP device ${deviceConfig.id}:`, error);
      }
    }
  }
  
  // Remove a TCP/IP device
  async removeDevice(deviceId: number): Promise<void> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      console.log(`TCP/IP device ${deviceId} not found`);
      return;
    }
    
    // Disconnect device
    await adapter.disconnect();
    
    // Remove adapter
    this.adapters.delete(deviceId);
    
    console.log(`Removed TCP/IP device ${deviceId}`);
  }
  
  // Get a specific adapter
  getAdapter(deviceId: number): TCPIPAdapter | undefined {
    return this.adapters.get(deviceId);
  }
  
  // Send data to a specific device
  async sendDataToDevice(deviceId: number, data: string | Buffer): Promise<boolean> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new Error(`TCP/IP device ${deviceId} not found`);
    }
    
    return adapter.sendData(data);
  }
  
  // Execute a command on a specific device
  async executeCommand(deviceId: number, commandName: string, parameters?: Record<string, any>): Promise<boolean> {
    const adapter = this.adapters.get(deviceId);
    if (!adapter) {
      throw new Error(`TCP/IP device ${deviceId} not found`);
    }
    
    return adapter.executeCommand(commandName, parameters);
  }
  
  // Shutdown all adapters
  async shutdown(): Promise<void> {
    console.log('Shutting down TCP/IP Manager');
    
    // Disconnect all devices
    const shutdownPromises = Array.from(this.adapters.values()).map(adapter => adapter.disconnect());
    
    await Promise.all(shutdownPromises);
    
    // Clear adapters
    this.adapters.clear();
  }
}

// Singleton instance
let tcpipManager: TCPIPManager;

// Get the TCP/IP manager instance
export function getTCPIPManager(): TCPIPManager {
  if (!tcpipManager) {
    tcpipManager = new TCPIPManager();
  }
  return tcpipManager;
}