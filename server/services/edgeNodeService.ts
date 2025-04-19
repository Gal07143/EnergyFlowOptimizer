import { mqttClient } from '../mqtt';
import { db } from '../db';
import { edgeComputingNodes, edgeNodeMetrics, edgeNodeDeviceControl, devices } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

const EDGE_NODE_TOPIC_PREFIX = 'edge/nodes';
const CONTROL_TOPIC = 'control';
const TELEMETRY_TOPIC = 'telemetry';
const STATUS_TOPIC = 'status';
const COMMAND_TOPIC = 'command';
const LATENCY_TEST_TOPIC = 'latency';

/**
 * EdgeNodeService manages communication with edge computing nodes
 * for ultra-low latency device control and telemetry.
 */
class EdgeNodeService {
  private initialized = false;
  private activeNodes = new Map<number, NodeStatus>();
  private latencyTests = new Map<string, LatencyTest>();

  constructor() {
    this.setupMqttSubscriptions();
  }

  /**
   * Initialize edge node service, load active nodes
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load active edge nodes from database
      const nodes = await db
        .select()
        .from(edgeComputingNodes)
        .where(eq(edgeComputingNodes.status, 'active'));

      // Add nodes to active nodes map
      for (const node of nodes) {
        this.activeNodes.set(node.id, {
          id: node.id,
          name: node.name,
          lastSeen: new Date(node.lastHeartbeat || Date.now()),
          isConnected: false,
          latencyMs: null,
          deviceCount: 0
        });

        // Get device count for this node
        const deviceControls = await db
          .select({ count: db.fn.count() })
          .from(edgeNodeDeviceControl)
          .where(eq(edgeNodeDeviceControl.edgeNodeId, node.id));

        const count = Number(deviceControls[0]?.count) || 0;
        this.activeNodes.get(node.id)!.deviceCount = count;
      }

      this.initialized = true;
      logger.info(`Edge node service initialized with ${nodes.length} active nodes`);
    } catch (error) {
      logger.error('Failed to initialize edge node service', error);
      throw error;
    }
  }

  /**
   * Set up MQTT subscriptions for edge node communication
   */
  private setupMqttSubscriptions(): void {
    // Status updates from edge nodes
    mqttClient.subscribe(`${EDGE_NODE_TOPIC_PREFIX}/+/${STATUS_TOPIC}`);
    
    // Telemetry data from edge nodes
    mqttClient.subscribe(`${EDGE_NODE_TOPIC_PREFIX}/+/${TELEMETRY_TOPIC}`);
    
    // Command responses from edge nodes
    mqttClient.subscribe(`${EDGE_NODE_TOPIC_PREFIX}/+/${COMMAND_TOPIC}/response`);
    
    // Latency test responses
    mqttClient.subscribe(`${EDGE_NODE_TOPIC_PREFIX}/+/${LATENCY_TEST_TOPIC}/response`);

    // Handle messages
    mqttClient.on('message', this.handleMqttMessage.bind(this));
  }

  /**
   * Handle MQTT messages from edge nodes
   */
  private async handleMqttMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const topicParts = topic.split('/');
      if (topicParts.length < 4 || topicParts[0] !== 'edge' || topicParts[1] !== 'nodes') {
        return; // Not an edge node topic
      }

      const nodeIdStr = topicParts[2];
      const messageType = topicParts[3];
      const nodeId = parseInt(nodeIdStr, 10);

      if (isNaN(nodeId)) {
        logger.warn(`Invalid node ID in topic: ${topic}`);
        return;
      }

      const data = JSON.parse(payload.toString());

      switch (messageType) {
        case STATUS_TOPIC:
          await this.handleStatusUpdate(nodeId, data);
          break;
        case TELEMETRY_TOPIC:
          await this.handleTelemetry(nodeId, data);
          break;
        case COMMAND_TOPIC:
          if (topicParts[4] === 'response') {
            await this.handleCommandResponse(nodeId, data);
          }
          break;
        case LATENCY_TEST_TOPIC:
          if (topicParts[4] === 'response') {
            await this.handleLatencyResponse(nodeId, data);
          }
          break;
      }
    } catch (error) {
      logger.error(`Error handling MQTT message: ${error}`);
    }
  }

  /**
   * Handle status updates from edge nodes
   */
  private async handleStatusUpdate(nodeId: number, data: any): Promise<void> {
    try {
      // Update node status in database
      await db
        .update(edgeComputingNodes)
        .set({
          status: data.status,
          lastHeartbeat: new Date(),
          currentDeviceConnections: data.connectedDevices || 0,
          updatedAt: new Date()
        })
        .where(eq(edgeComputingNodes.id, nodeId));

      // Update node status in memory
      const nodeStatus = this.activeNodes.get(nodeId) || {
        id: nodeId,
        name: `Node ${nodeId}`,
        lastSeen: new Date(),
        isConnected: true,
        latencyMs: null,
        deviceCount: data.connectedDevices || 0
      };

      nodeStatus.lastSeen = new Date();
      nodeStatus.isConnected = data.status === 'active';
      nodeStatus.deviceCount = data.connectedDevices || 0;

      this.activeNodes.set(nodeId, nodeStatus);
    } catch (error) {
      logger.error(`Error handling status update for node ${nodeId}:`, error);
    }
  }

  /**
   * Handle telemetry data from edge nodes
   */
  private async handleTelemetry(nodeId: number, data: any): Promise<void> {
    try {
      // Store metrics in database
      await db
        .insert(edgeNodeMetrics)
        .values({
          edgeNodeId: nodeId,
          timestamp: new Date(),
          cpuUsagePercent: data.cpu || null,
          memoryUsageMb: data.memory || null,
          networkInKbps: data.networkIn || null,
          networkOutKbps: data.networkOut || null,
          diskReadKbps: data.diskRead || null,
          diskWriteKbps: data.diskWrite || null,
          storageUsagePercent: data.storage || null,
          temperature: data.temperature || null,
          uptimeSeconds: data.uptime || null,
          activeConnections: data.connections || null,
          errorCount: data.errors || null,
          batteryLevel: data.battery || null,
          powerStatus: data.power || null,
          signalStrength: data.signal || null,
          latencyMs: data.latency || null
        });

      // Update node status in memory
      const nodeStatus = this.activeNodes.get(nodeId);
      if (nodeStatus) {
        nodeStatus.lastSeen = new Date();
        nodeStatus.latencyMs = data.latency || nodeStatus.latencyMs;
        this.activeNodes.set(nodeId, nodeStatus);
      }
    } catch (error) {
      logger.error(`Error handling telemetry for node ${nodeId}:`, error);
    }
  }

  /**
   * Handle command responses from edge nodes
   */
  private async handleCommandResponse(nodeId: number, data: any): Promise<void> {
    try {
      // Log command response
      logger.info(`Command response from node ${nodeId}:`, data);

      // TODO: Update command status in database
      // This would update a command_executions table

      // Emit event for WebSocket clients
      // This would be handled by a WebSocket service
    } catch (error) {
      logger.error(`Error handling command response for node ${nodeId}:`, error);
    }
  }

  /**
   * Handle latency test responses from edge nodes
   */
  private async handleLatencyResponse(nodeId: number, data: any): Promise<void> {
    try {
      const testId = data.testId;
      const test = this.latencyTests.get(testId);

      if (test) {
        const endTime = Date.now();
        const latency = endTime - test.startTime;

        // Update node latency in memory
        const nodeStatus = this.activeNodes.get(nodeId);
        if (nodeStatus) {
          nodeStatus.latencyMs = latency;
          this.activeNodes.set(nodeId, nodeStatus);
        }

        // Remove test from map
        this.latencyTests.delete(testId);

        // Log latency
        logger.info(`Latency test result for node ${nodeId}: ${latency}ms`);
      }
    } catch (error) {
      logger.error(`Error handling latency response for node ${nodeId}:`, error);
    }
  }

  /**
   * Send a control command to an edge node to control a device
   * This provides ultra-low latency control by using the edge node
   * instead of communicating directly with the device
   */
  async sendControlCommand(nodeId: number, deviceId: number, command: any): Promise<CommandResult> {
    try {
      // Verify device is controlled by this node
      const [deviceControl] = await db
        .select()
        .from(edgeNodeDeviceControl)
        .where(and(
          eq(edgeNodeDeviceControl.edgeNodeId, nodeId),
          eq(edgeNodeDeviceControl.deviceId, deviceId)
        ));

      if (!deviceControl) {
        throw new Error(`Device ${deviceId} is not controlled by edge node ${nodeId}`);
      }

      // Get device info to include in command
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId));

      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Generate command ID
      const commandId = `cmd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Send command to edge node
      const topic = `${EDGE_NODE_TOPIC_PREFIX}/${nodeId}/${COMMAND_TOPIC}`;
      const payload = JSON.stringify({
        commandId,
        deviceId,
        deviceType: device.type,
        command: command.action,
        parameters: command.parameters,
        priority: command.priority || 'normal',
        timestamp: new Date().toISOString()
      });

      await mqttClient.publish(topic, payload, { qos: 1 });

      // Return result
      return {
        success: true,
        commandId,
        timestamp: new Date(),
        message: `Command sent to edge node ${nodeId} for device ${deviceId}`
      };
    } catch (error) {
      logger.error(`Error sending control command to node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Run a latency test with an edge node
   */
  async testLatency(nodeId: number): Promise<number> {
    try {
      // Generate test ID
      const testId = `lat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const startTime = Date.now();

      // Store test
      this.latencyTests.set(testId, {
        id: testId,
        nodeId,
        startTime
      });

      // Send test to edge node
      const topic = `${EDGE_NODE_TOPIC_PREFIX}/${nodeId}/${LATENCY_TEST_TOPIC}`;
      const payload = JSON.stringify({
        testId,
        timestamp: startTime
      });

      await mqttClient.publish(topic, payload, { qos: 1 });

      // Wait for response (with timeout)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.latencyTests.delete(testId);
          reject(new Error(`Latency test timeout for node ${nodeId}`));
        }, 5000);

        const checkInterval = setInterval(() => {
          if (!this.latencyTests.has(testId)) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            const nodeStatus = this.activeNodes.get(nodeId);
            resolve(nodeStatus?.latencyMs || -1);
          }
        }, 50);
      });
    } catch (error) {
      logger.error(`Error testing latency for node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Get status of all active edge nodes
   */
  getActiveNodes(): NodeStatus[] {
    return Array.from(this.activeNodes.values());
  }

  /**
   * Get status of a specific edge node
   */
  getNodeStatus(nodeId: number): NodeStatus | null {
    return this.activeNodes.get(nodeId) || null;
  }
}

// Types
interface NodeStatus {
  id: number;
  name: string;
  lastSeen: Date;
  isConnected: boolean;
  latencyMs: number | null;
  deviceCount: number;
}

interface LatencyTest {
  id: string;
  nodeId: number;
  startTime: number;
}

interface CommandResult {
  success: boolean;
  commandId: string;
  timestamp: Date;
  message: string;
}

// Create singleton instance
export const edgeNodeService = new EdgeNodeService();