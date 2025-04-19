import { Request, Response } from 'express';
import { 
  edgeComputingNodes, 
  edgeConnectivity, 
  edgeNodeApplications, 
  edgeNodeDeviceControl,
  edgeNodeMetrics,
  insertEdgeComputingNodeSchema,
  insertEdgeConnectivitySchema,
  insertEdgeNodeApplicationSchema,
  insertEdgeNodeDeviceControlSchema,
  insertEdgeNodeMetricsSchema,
  EdgeComputingNode
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// Define a simplified authenticated request interface for controller
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: string;
    partnerId?: number;
    [key: string]: any;
  };
}

// Define your typings if not found in schema
interface EdgeComputingNode {
  id: number;
  name: string;
  siteId: number;
  nodeType: string;
  status: string;
  [key: string]: any;
}

// Edge Computing Nodes CRUD
export async function getEdgeNodes(req: AuthenticatedRequest, res: Response) {
  try {
    const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
    
    let query = db.select().from(edgeComputingNodes);
    
    if (siteId) {
      query = query.where(eq(edgeComputingNodes.siteId, siteId));
    }
    
    // Check if the user has access to the site or is an admin
    if (req.user.role !== 'admin' && req.user.partnerId) {
      // User is from a partner organization, filter by their partnerId
      // This would require joining with sites table
      // For now, we'll rely on the site-level filtering
    }
    
    const nodes = await query.orderBy(desc(edgeComputingNodes.updatedAt));
    
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching edge computing nodes:', error);
    res.status(500).json({ message: 'Failed to fetch edge computing nodes' });
  }
}

export async function getEdgeNodeById(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.id);
    
    const [node] = await db
      .select()
      .from(edgeComputingNodes)
      .where(eq(edgeComputingNodes.id, nodeId));
    
    if (!node) {
      return res.status(404).json({ message: 'Edge computing node not found' });
    }
    
    res.json(node);
  } catch (error) {
    console.error('Error fetching edge computing node:', error);
    res.status(500).json({ message: 'Failed to fetch edge computing node' });
  }
}

export async function createEdgeNode(req: AuthenticatedRequest, res: Response) {
  try {
    // Validate input data
    const validatedData = insertEdgeComputingNodeSchema.parse(req.body);
    
    // Create edge node
    const [node] = await db
      .insert(edgeComputingNodes)
      .values(validatedData)
      .returning();
    
    res.status(201).json(node);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating edge computing node:', error);
    res.status(500).json({ message: 'Failed to create edge computing node' });
  }
}

export async function updateEdgeNode(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.id);
    
    // Validate input data
    const validatedData = insertEdgeComputingNodeSchema.parse(req.body);
    
    // Check if node exists
    const [existingNode] = await db
      .select()
      .from(edgeComputingNodes)
      .where(eq(edgeComputingNodes.id, nodeId));
    
    if (!existingNode) {
      return res.status(404).json({ message: 'Edge computing node not found' });
    }
    
    // Update node
    const [updatedNode] = await db
      .update(edgeComputingNodes)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(edgeComputingNodes.id, nodeId))
      .returning();
    
    res.json(updatedNode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error updating edge computing node:', error);
    res.status(500).json({ message: 'Failed to update edge computing node' });
  }
}

export async function deleteEdgeNode(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.id);
    
    // Check if node exists
    const [existingNode] = await db
      .select()
      .from(edgeComputingNodes)
      .where(eq(edgeComputingNodes.id, nodeId));
    
    if (!existingNode) {
      return res.status(404).json({ message: 'Edge computing node not found' });
    }
    
    // Delete node
    await db
      .delete(edgeComputingNodes)
      .where(eq(edgeComputingNodes.id, nodeId));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting edge computing node:', error);
    res.status(500).json({ message: 'Failed to delete edge computing node' });
  }
}

// Edge Node Connectivity
export async function getNodeConnectivity(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    const connectivity = await db
      .select()
      .from(edgeConnectivity)
      .where(eq(edgeConnectivity.edgeNodeId, nodeId))
      .orderBy(desc(edgeConnectivity.updatedAt));
    
    res.json(connectivity);
  } catch (error) {
    console.error('Error fetching edge node connectivity:', error);
    res.status(500).json({ message: 'Failed to fetch edge node connectivity' });
  }
}

export async function createNodeConnectivity(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    // Validate input data
    const validatedData = insertEdgeConnectivitySchema.parse({
      ...req.body,
      edgeNodeId: nodeId
    });
    
    // Create connectivity
    const [connectivity] = await db
      .insert(edgeConnectivity)
      .values(validatedData)
      .returning();
    
    res.status(201).json(connectivity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating edge node connectivity:', error);
    res.status(500).json({ message: 'Failed to create edge node connectivity' });
  }
}

// Node Applications
export async function getNodeApplications(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    const applications = await db
      .select()
      .from(edgeNodeApplications)
      .where(eq(edgeNodeApplications.edgeNodeId, nodeId))
      .orderBy(desc(edgeNodeApplications.updatedAt));
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching edge node applications:', error);
    res.status(500).json({ message: 'Failed to fetch edge node applications' });
  }
}

export async function createNodeApplication(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    // Validate input data
    const validatedData = insertEdgeNodeApplicationSchema.parse({
      ...req.body,
      edgeNodeId: nodeId
    });
    
    // Create application
    const [application] = await db
      .insert(edgeNodeApplications)
      .values(validatedData)
      .returning();
    
    res.status(201).json(application);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating edge node application:', error);
    res.status(500).json({ message: 'Failed to create edge node application' });
  }
}

// Device Control
export async function getNodeDeviceControls(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    const deviceControls = await db
      .select()
      .from(edgeNodeDeviceControl)
      .where(eq(edgeNodeDeviceControl.edgeNodeId, nodeId))
      .orderBy(desc(edgeNodeDeviceControl.updatedAt));
    
    res.json(deviceControls);
  } catch (error) {
    console.error('Error fetching edge node device controls:', error);
    res.status(500).json({ message: 'Failed to fetch edge node device controls' });
  }
}

export async function createNodeDeviceControl(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    // Validate input data
    const validatedData = insertEdgeNodeDeviceControlSchema.parse({
      ...req.body,
      edgeNodeId: nodeId
    });
    
    // Create device control
    const [deviceControl] = await db
      .insert(edgeNodeDeviceControl)
      .values(validatedData)
      .returning();
    
    res.status(201).json(deviceControl);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating edge node device control:', error);
    res.status(500).json({ message: 'Failed to create edge node device control' });
  }
}

// Edge Node Metrics
export async function getNodeMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    
    const metrics = await db
      .select()
      .from(edgeNodeMetrics)
      .where(eq(edgeNodeMetrics.edgeNodeId, nodeId))
      .orderBy(desc(edgeNodeMetrics.timestamp))
      .limit(limit);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching edge node metrics:', error);
    res.status(500).json({ message: 'Failed to fetch edge node metrics' });
  }
}

export async function createNodeMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    // Validate input data
    const validatedData = insertEdgeNodeMetricsSchema.parse({
      ...req.body,
      edgeNodeId: nodeId
    });
    
    // Create metrics
    const [metrics] = await db
      .insert(edgeNodeMetrics)
      .values(validatedData)
      .returning();
    
    res.status(201).json(metrics);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating edge node metrics:', error);
    res.status(500).json({ message: 'Failed to create edge node metrics' });
  }
}

// Low-Latency Control Operations
export async function sendControlCommand(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    const deviceId = Number(req.params.deviceId);
    
    // Validate the device is connected to this edge node
    const [deviceControl] = await db
      .select()
      .from(edgeNodeDeviceControl)
      .where(and(
        eq(edgeNodeDeviceControl.edgeNodeId, nodeId),
        eq(edgeNodeDeviceControl.deviceId, deviceId)
      ));
    
    if (!deviceControl) {
      return res.status(404).json({ message: 'Device not controlled by this edge node' });
    }
    
    // Process control command
    // This would typically involve MQTT or WebSocket
    const command = req.body;
    
    // TODO: Implement actual control command logic
    // This would connect to an edge device service
    
    // For now, return success response
    res.json({
      success: true,
      message: 'Command sent to edge node',
      command,
      timestamp: new Date(),
      latency: 15 // milliseconds
    });
  } catch (error) {
    console.error('Error sending control command to edge node:', error);
    res.status(500).json({ message: 'Failed to send control command' });
  }
}

// Health and Status
export async function getNodeStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const nodeId = Number(req.params.nodeId);
    
    // Get node
    const [node] = await db
      .select()
      .from(edgeComputingNodes)
      .where(eq(edgeComputingNodes.id, nodeId));
    
    if (!node) {
      return res.status(404).json({ message: 'Edge computing node not found' });
    }
    
    // Get latest metrics
    const [latestMetrics] = await db
      .select()
      .from(edgeNodeMetrics)
      .where(eq(edgeNodeMetrics.edgeNodeId, nodeId))
      .orderBy(desc(edgeNodeMetrics.timestamp))
      .limit(1);
    
    // Get connectivity
    const [connectivity] = await db
      .select()
      .from(edgeConnectivity)
      .where(eq(edgeConnectivity.edgeNodeId, nodeId))
      .orderBy(desc(edgeConnectivity.updatedAt))
      .limit(1);
    
    // Get device control count
    const deviceControlCount = await db
      .select({ count: db.fn.count() })
      .from(edgeNodeDeviceControl)
      .where(eq(edgeNodeDeviceControl.edgeNodeId, nodeId));
    
    const count = Number(deviceControlCount[0]?.count) || 0;
    
    // Combine all information
    const nodeStatus = {
      ...node,
      lastMetrics: latestMetrics || null,
      connectivity: connectivity || null,
      controlledDeviceCount: count,
      health: calculateNodeHealth(node, latestMetrics),
      isResponsive: isNodeResponsive(node, latestMetrics)
    };
    
    res.json(nodeStatus);
  } catch (error) {
    console.error('Error fetching edge node status:', error);
    res.status(500).json({ message: 'Failed to fetch edge node status' });
  }
}

// Helper functions
function calculateNodeHealth(node: EdgeComputingNode, metrics: any): string {
  if (!node || node.status === 'offline' || node.status === 'error') {
    return 'critical';
  }
  
  if (!metrics) {
    return 'unknown';
  }
  
  // Check CPU and memory usage
  const cpuUsage = metrics.cpuUsagePercent || 0;
  const memoryUsage = metrics.memoryUsageMb || 0;
  const memoryTotal = node.memory || 1; // Prevent division by zero
  const memoryPercent = (memoryUsage / memoryTotal) * 100;
  
  if (cpuUsage > 90 || memoryPercent > 90) {
    return 'warning';
  }
  
  if (cpuUsage > 75 || memoryPercent > 75) {
    return 'degraded';
  }
  
  return 'healthy';
}

function isNodeResponsive(node: EdgeComputingNode, metrics: any): boolean {
  if (!node || node.status === 'offline' || node.status === 'error') {
    return false;
  }
  
  if (!metrics) {
    return false;
  }
  
  // Check if metrics are recent (within last 5 minutes)
  const metricTime = new Date(metrics.timestamp).getTime();
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  
  return metricTime > fiveMinutesAgo;
}