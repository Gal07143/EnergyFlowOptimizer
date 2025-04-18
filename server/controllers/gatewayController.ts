import { Request, Response } from 'express';
import { GatewayService } from '../services/gatewayService';
import { MqttService } from '../services/mqttService';
import { insertDeviceSchema, insertGatewayDeviceSchema, InsertDevice } from '@shared/schema';
import { ZodError, z } from 'zod';
import { createEventLog } from '../services/eventLoggingService';

// Define validation schema for gateway creation
const createGatewaySchema = z.object({
  name: z.string().min(1, "Gateway name is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  protocol: z.enum(['mqtt', 'http']),
  siteId: z.number().optional(),
});

// Define type for gateway creation data
type GatewayData = Partial<InsertDevice> & { 
  name: string; 
  type: 'energy_gateway'; 
};

// Initialize services
let gatewayService: GatewayService;

export function initGatewayController(mqttService: MqttService) {
  gatewayService = new GatewayService(mqttService);
  console.log('Gateway controller initialized');
}

/**
 * Get all gateways
 */
export async function getAllGateways(req: Request, res: Response) {
  try {
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string, 10) : undefined;
    const gateways = await gatewayService.findAllGateways(siteId);
    
    res.json(gateways);
  } catch (error) {
    console.error('Error getting all gateways:', error);
    res.status(500).json({ error: 'Failed to retrieve gateways' });
  }
}

/**
 * Get gateway by ID
 */
export async function getGatewayById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const gateway = await gatewayService.findGatewayById(id);
    
    if (!gateway) {
      return res.status(404).json({ error: 'Gateway not found' });
    }
    
    res.json(gateway);
  } catch (error) {
    console.error(`Error getting gateway ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve gateway' });
  }
}

/**
 * Create new gateway
 */
export async function createGateway(req: Request, res: Response) {
  try {
    const { siteId, ...otherData } = req.body;
    
    // Validate the incoming data
    const validatedInput = createGatewaySchema.parse(req.body);
    
    const siteIdNum = parseInt(String(validatedInput.siteId), 10);
    if (isNaN(siteIdNum)) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    
    // Prepare data for gateway creation
    const gatewayData: GatewayData = {
      name: validatedInput.name,
      manufacturer: validatedInput.manufacturer,
      model: validatedInput.model,
      protocol: validatedInput.protocol,
      type: 'energy_gateway'
    };
    
    const gateway = await gatewayService.createGateway(siteIdNum, gatewayData);
    
    res.status(201).json(gateway);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error('Error creating gateway:', error);
    res.status(500).json({ error: 'Failed to create gateway' });
  }
}

/**
 * Create gateway configuration
 */
export async function createGatewayConfig(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.id, 10);
    const validated = insertGatewayDeviceSchema.parse(req.body);
    
    const gatewayConfig = await gatewayService.createGatewayConfig(deviceId, validated);
    
    res.status(201).json(gatewayConfig);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error(`Error creating gateway config for device ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to create gateway configuration' });
  }
}

/**
 * Get devices connected to gateway
 */
export async function getConnectedDevices(req: Request, res: Response) {
  try {
    const gatewayId = parseInt(req.params.id, 10);
    const devices = await gatewayService.findConnectedDevices(gatewayId);
    
    res.json(devices);
  } catch (error) {
    console.error(`Error getting connected devices for gateway ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve connected devices' });
  }
}

/**
 * Connect device to gateway
 */
export async function connectDevice(req: Request, res: Response) {
  try {
    const gatewayId = parseInt(req.params.id, 10);
    const deviceId = parseInt(req.params.deviceId, 10);
    const { devicePath } = req.body;
    
    const device = await gatewayService.connectDeviceToGateway(deviceId, gatewayId, devicePath);
    
    // Log the event
    await createEventLog({
      eventType: 'device',
      eventCategory: 'operational',
      message: `Device ${deviceId} connected to gateway ${gatewayId}`,
      deviceId: deviceId,
      siteId: device.siteId,
      metadata: {
        gatewayId: gatewayId,
        devicePath: devicePath || null
      }
    } as any);
    
    res.json(device);
  } catch (error) {
    console.error(`Error connecting device ${req.params.deviceId} to gateway ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to connect device to gateway' });
  }
}

/**
 * Disconnect device from gateway
 */
export async function disconnectDevice(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.deviceId, 10);
    const device = await gatewayService.disconnectDeviceFromGateway(deviceId);
    
    // Log the event
    await createEventLog({
      eventType: 'device',
      eventCategory: 'operational',
      message: `Device ${deviceId} disconnected from gateway`,
      deviceId: deviceId,
      siteId: device.siteId,
      metadata: { 
        disconnectedFrom: parseInt(req.params.id, 10)
      }
    } as any);
    
    res.json(device);
  } catch (error) {
    console.error(`Error disconnecting device ${req.params.deviceId} from gateway:`, error);
    res.status(500).json({ error: 'Failed to disconnect device from gateway' });
  }
}

/**
 * Test gateway connection
 */
export async function testGatewayConnection(req: Request, res: Response) {
  try {
    const gatewayId = parseInt(req.params.id, 10);
    const gateway = await gatewayService.findGatewayById(gatewayId);
    
    if (!gateway) {
      return res.status(404).json({ error: 'Gateway not found' });
    }
    
    const result = await gatewayService.testConnection(gateway);
    
    res.json(result);
  } catch (error) {
    console.error(`Error testing connection for gateway ${req.params.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to test gateway connection',
      message: errorMessage
    });
  }
}

/**
 * Generate credentials for gateway
 */
export async function generateCredentials(req: Request, res: Response) {
  try {
    const { protocol } = req.body;
    
    if (!protocol) {
      return res.status(400).json({ error: 'Protocol is required' });
    }
    
    const credentials = gatewayService.generateCredentials(protocol);
    
    res.json(credentials);
  } catch (error) {
    console.error('Error generating credentials:', error);
    res.status(500).json({ error: 'Failed to generate credentials' });
  }
}

/**
 * Update gateway status
 */
export async function updateGatewayStatus(req: Request, res: Response) {
  try {
    const gatewayId = parseInt(req.params.id, 10);
    const { status, error } = req.body;
    
    if (!status || !['online', 'offline', 'error'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (online, offline, error)' });
    }
    
    await gatewayService.updateGatewayStatus(gatewayId, status, error);
    
    res.json({ success: true });
  } catch (error) {
    console.error(`Error updating status for gateway ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update gateway status' });
  }
}