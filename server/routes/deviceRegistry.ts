import { Router, Request, Response } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { isAuthenticated } from '../middleware/auth';
import deviceRegistryService from '../services/deviceRegistryService';
import {
  deviceTypeEnum,
  deviceRegistrationStatusEnum,
  deviceAuthMethodEnum,
  DeviceType,
  DeviceAuthMethod,
  InsertDeviceRegistry,
  insertDeviceRegistrySchema,
  insertProvisioningTemplateSchema,
} from '@shared/deviceRegistry';

const router = Router();

// Create validation schemas for route handlers
const createTemplateSchema = insertProvisioningTemplateSchema.extend({
  // Additional validation can be added here
});

const generateCodeSchema = z.object({
  deviceType: z.enum(deviceTypeEnum.enumValues).optional(),
  templateId: z.number().optional(),
  expiryHours: z.number().optional(),
  isOneTime: z.boolean().optional(),
  maxUses: z.number().optional()
});

// ----- Device Registry Endpoints -----

// Get all devices
router.get('/registry', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const devices = await deviceRegistryService.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get device by ID
router.get('/registry/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }

    const device = await deviceRegistryService.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Register a new device
router.post('/registry', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = insertDeviceRegistrySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ errors: validationResult.error.format() });
    }

    const device = await deviceRegistryService.registerDevice(validationResult.data);
    res.status(201).json(device);
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Failed to register device', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Update a device
router.patch('/registry/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }

    // Validate request body fields
    // Note: We only validate the fields that are present
    const validationSchema = z.object({
      deviceType: z.enum(deviceTypeEnum.enumValues).optional(),
      registrationStatus: z.enum(deviceRegistrationStatusEnum.enumValues).optional(),
      firmwareVersion: z.string().optional(),
      location: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      isOnline: z.boolean().optional(),
      authMethod: z.enum(deviceAuthMethodEnum.enumValues).optional()
    });

    const validationResult = validationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ errors: validationResult.error.format() });
    }

    const device = await deviceRegistryService.updateDevice(deviceId, validationResult.data);
    res.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Failed to update device', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Filter devices
router.get('/registry/filter', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { deviceType, registrationStatus, isOnline } = req.query;
    
    const filters: any = {};
    
    if (deviceType) {
      filters.deviceType = deviceType as DeviceType;
    }
    
    if (registrationStatus) {
      filters.registrationStatus = registrationStatus;
    }
    
    if (isOnline !== undefined) {
      filters.isOnline = isOnline === 'true';
    }
    
    const devices = await deviceRegistryService.getDevices(filters);
    res.json(devices);
  } catch (error) {
    console.error('Error filtering devices:', error);
    res.status(500).json({ error: 'Failed to filter devices' });
  }
});

// Apply template to device
router.post('/registry/:id/apply-template', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }

    const { templateId } = req.body;
    if (!templateId || isNaN(parseInt(templateId, 10))) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const device = await deviceRegistryService.applyTemplate(deviceId, parseInt(templateId, 10));
    res.json(device);
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Create credentials for device
router.post('/registry/:id/credentials', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }

    const { authMethod } = req.body;
    if (!authMethod || !['api_key', 'certificate', 'username_password', 'oauth', 'token'].includes(authMethod)) {
      return res.status(400).json({ error: 'Valid authentication method is required' });
    }

    const credentials = await deviceRegistryService.createDeviceCredentials(deviceId, authMethod as DeviceAuthMethod);
    res.json(credentials);
  } catch (error) {
    console.error('Error creating credentials:', error);
    res.status(500).json({ error: 'Failed to create credentials', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ----- Template Endpoints -----

// Get all templates
router.get('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deviceType = req.query.deviceType as DeviceType | undefined;
    const templates = await deviceRegistryService.getTemplates(deviceType);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by ID
router.get('/templates/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const template = await deviceRegistryService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create a new template
router.post('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = createTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ errors: validationResult.error.format() });
    }

    const template = await deviceRegistryService.createTemplate(validationResult.data);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ----- Registration Code Endpoints -----

// Get all registration codes
router.get('/registration-codes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const codes = await deviceRegistryService.getRegistrationCodes();
    res.json(codes);
  } catch (error) {
    console.error('Error fetching registration codes:', error);
    res.status(500).json({ error: 'Failed to fetch registration codes' });
  }
});

// Generate registration code
router.post('/registration-codes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = generateCodeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ errors: validationResult.error.format() });
    }

    const code = await deviceRegistryService.generateRegistrationCode({
      deviceType: validationResult.data.deviceType,
      provisioningTemplateId: validationResult.data.templateId,
      expiryHours: validationResult.data.expiryHours,
      isOneTime: validationResult.data.isOneTime,
      maxUses: validationResult.data.maxUses
    });
    
    res.status(201).json(code);
  } catch (error) {
    console.error('Error generating registration code:', error);
    res.status(500).json({ error: 'Failed to generate registration code', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get QR code for registration code
router.get('/registration-codes/:id/qr', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const codeId = parseInt(req.params.id, 10);
    if (isNaN(codeId)) {
      return res.status(400).json({ error: 'Invalid code ID' });
    }

    // Get all codes
    const codes = await deviceRegistryService.getRegistrationCodes();
    
    // Find code by ID
    const code = codes.find(c => c.id === codeId);
    if (!code) {
      return res.status(404).json({ error: 'Registration code not found' });
    }

    // If code has QR code data, return it
    if (code.qrCodeData) {
      res.send(code.qrCodeData);
      return;
    }

    // Otherwise generate QR code
    const registrationUrl = code.registrationUrl || `${process.env.APP_URL || 'https://ems.example.com'}/device-register?code=${code.code}`;
    const qrCodeData = await QRCode.toDataURL(registrationUrl);
    
    res.send(qrCodeData);
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Validate registration code
router.get('/registration-codes/:code/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: 'Registration code is required' });
    }

    const validation = await deviceRegistryService.validateRegistrationCode(code);
    res.json(validation);
  } catch (error) {
    console.error('Error validating registration code:', error);
    res.status(500).json({ error: 'Failed to validate registration code' });
  }
});

export default router;