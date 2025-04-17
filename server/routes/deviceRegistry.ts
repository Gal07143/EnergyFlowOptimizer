/**
 * Device Registry & Provisioning Routes
 * 
 * This file implements the API routes for device registry and provisioning:
 * - Device registration and authentication
 * - Provisioning template management
 * - QR code and registration code generation
 * - Zero-touch provisioning
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { deviceRegistryService } from '../services/deviceRegistryService';
import { deviceTypeEnum } from '@shared/schema';
import { deviceAuthMethodEnum } from '@shared/deviceRegistry';

const router = Router();

// Get all registered devices - requires manager role
router.get('/registry',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const filters: any = {};
      
      // Apply filters from query parameters
      if (req.query.deviceType) {
        filters.deviceType = req.query.deviceType;
      }
      
      if (req.query.isOnline !== undefined) {
        filters.isOnline = req.query.isOnline === 'true';
      }
      
      if (req.query.status) {
        filters.registrationStatus = req.query.status;
      }
      
      const devices = await deviceRegistryService.listDevices(filters);
      res.json(devices);
    } catch (error) {
      console.error('Error getting registered devices:', error);
      res.status(500).json({ error: 'Failed to retrieve registered devices' });
    }
});

// Get specific registered device - requires manager role
router.get('/registry/:id',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  param('id').isUUID().withMessage('Invalid device registration ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const device = await deviceRegistryService.getDeviceByRegistrationId(req.params.id);
      
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      res.json(device);
    } catch (error) {
      console.error('Error getting registered device:', error);
      res.status(500).json({ error: 'Failed to retrieve device information' });
    }
});

// Register a device - requires manager role
router.post('/registry',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  body('deviceUid').isString().notEmpty().withMessage('Device UID is required'),
  body('deviceType').isIn(deviceTypeEnum.enumValues).withMessage('Invalid device type'),
  body('firmwareVersion').optional().isString(),
  body('metadata').optional().isObject(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { deviceUid, deviceType, firmwareVersion, metadata } = req.body;
      
      // Check if device already exists
      const existingDevice = await deviceRegistryService.getDeviceByUid(deviceUid);
      if (existingDevice) {
        return res.status(409).json({ error: 'Device with this UID already exists' });
      }
      
      const registryEntry = await deviceRegistryService.registerDevice({
        deviceUid,
        deviceType,
        firmwareVersion,
        metadata,
        registrationStatus: 'registered',
        isOnline: false,
        authMethod: 'none'
      });
      
      res.status(201).json(registryEntry);
    } catch (error) {
      console.error('Error registering device:', error);
      res.status(500).json({ error: 'Failed to register device' });
    }
});

// Device self-registration using a code
router.post('/register',
  query('code').isString().notEmpty().withMessage('Registration code is required'),
  body('deviceUid').isString().notEmpty().withMessage('Device UID is required'),
  body('deviceType').isIn(deviceTypeEnum.enumValues).withMessage('Invalid device type'),
  body('firmwareVersion').optional().isString(),
  body('metadata').optional().isObject(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const code = req.query.code as string;
      const { deviceUid, deviceType, firmwareVersion, metadata } = req.body;
      
      const result = await deviceRegistryService.registerDeviceWithCode(
        code,
        { deviceUid, deviceType, firmwareVersion, metadata }
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.status(201).json({ 
        message: result.message,
        deviceRegistry: result.deviceRegistry
      });
    } catch (error) {
      console.error('Error registering device with code:', error);
      res.status(500).json({ error: 'Failed to register device' });
    }
});

// Create device credentials - requires manager role
router.post('/registry/:id/credentials',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  param('id').isInt().withMessage('Invalid device registry ID'),
  body('authMethod').isIn(deviceAuthMethodEnum.enumValues).withMessage('Invalid authentication method'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const deviceRegistryId = parseInt(req.params.id);
      const { authMethod } = req.body;
      
      const credentials = await deviceRegistryService.createDeviceCredentials(
        deviceRegistryId, 
        authMethod
      );
      
      // Don't return sensitive credential data in the response
      const safeCredentials = {
        id: credentials.id,
        deviceRegistryId: credentials.deviceRegistryId,
        authMethod: credentials.authMethod,
        isActive: credentials.isActive,
        createdAt: credentials.createdAt,
        validUntil: credentials.validUntil
      };
      
      res.status(201).json(safeCredentials);
    } catch (error) {
      console.error('Error creating device credentials:', error);
      res.status(500).json({ error: 'Failed to create device credentials' });
    }
});

// Device authentication endpoint
router.post('/auth',
  body('deviceUid').isString().notEmpty().withMessage('Device UID is required'),
  body('authMethod').isIn(deviceAuthMethodEnum.enumValues).withMessage('Invalid authentication method'),
  body('credentials').isObject().withMessage('Credentials are required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { deviceUid, authMethod, credentials } = req.body;
      
      const result = await deviceRegistryService.validateDeviceCredentials(
        deviceUid, 
        authMethod, 
        credentials
      );
      
      if (!result.isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      res.json({ 
        authenticated: true,
        deviceRegistry: result.deviceRegistry
      });
    } catch (error) {
      console.error('Error authenticating device:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
});

// Create provisioning template - requires manager role
router.post('/templates',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  body('name').isString().notEmpty().withMessage('Template name is required'),
  body('deviceType').isIn(deviceTypeEnum.enumValues).withMessage('Invalid device type'),
  body('configTemplate').isObject().withMessage('Configuration template is required'),
  body('authMethod').optional().isIn(deviceAuthMethodEnum.enumValues).withMessage('Invalid authentication method'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, deviceType, configTemplate, firmwareVersion, authMethod, defaultSettings } = req.body;
      
      const template = await deviceRegistryService.createProvisioningTemplate({
        name,
        description,
        deviceType,
        configTemplate,
        firmwareVersion,
        authMethod: authMethod || 'api_key',
        defaultSettings,
        isActive: true
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating provisioning template:', error);
      res.status(500).json({ error: 'Failed to create provisioning template' });
    }
});

// Get all provisioning templates
router.get('/templates',
  isAuthenticated,
  async (req, res) => {
    try {
      const templates = await deviceRegistryService.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error getting provisioning templates:', error);
      res.status(500).json({ error: 'Failed to retrieve templates' });
    }
});

// Generate registration code - requires manager role
router.post('/registration-codes',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  body('deviceType').isIn(deviceTypeEnum.enumValues).withMessage('Invalid device type'),
  body('templateId').optional().isInt(),
  body('expiryHours').optional().isInt().isInt({ min: 1, max: 8760 }), // Max 1 year
  body('isOneTime').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { deviceType, templateId, expiryHours = 24, isOneTime = true } = req.body;
      
      const registrationCode = await deviceRegistryService.generateRegistrationCode(
        deviceType,
        templateId,
        expiryHours,
        isOneTime
      );
      
      res.status(201).json(registrationCode);
    } catch (error) {
      console.error('Error generating registration code:', error);
      res.status(500).json({ error: 'Failed to generate registration code' });
    }
});

// Get QR code image for registration code - requires manager role
router.get('/registration-codes/:id/qr',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  param('id').isInt().withMessage('Invalid registration code ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const codeId = parseInt(req.params.id);
      const qrImage = await deviceRegistryService.getQrCodeImage(codeId);
      
      if (!qrImage) {
        return res.status(404).json({ error: 'QR code not found' });
      }
      
      // Send as data URL
      res.set('Content-Type', 'text/plain');
      res.send(qrImage);
    } catch (error) {
      console.error('Error generating QR code image:', error);
      res.status(500).json({ error: 'Failed to generate QR code image' });
    }
});

// Apply provisioning template to device - requires manager role
router.post('/registry/:id/apply-template',
  isAuthenticated,
  hasRole(['admin', 'manager']),
  param('id').isInt().withMessage('Invalid device registry ID'),
  body('templateId').isInt().withMessage('Template ID is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const deviceRegistryId = parseInt(req.params.id);
      const { templateId } = req.body;
      
      const result = await deviceRegistryService.applyTemplate(
        deviceRegistryId, 
        templateId
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error('Error applying template:', error);
      res.status(500).json({ error: 'Failed to apply template' });
    }
});

// Update device status - accessible by devices
router.post('/status',
  body('deviceUid').isString().notEmpty().withMessage('Device UID is required'),
  body('isOnline').isBoolean().withMessage('Online status is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { deviceUid, isOnline } = req.body;
      
      const success = await deviceRegistryService.updateDeviceStatus(
        deviceUid, 
        isOnline
      );
      
      if (!success) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      res.json({ message: 'Device status updated' });
    } catch (error) {
      console.error('Error updating device status:', error);
      res.status(500).json({ error: 'Failed to update device status' });
    }
});

// Add a missing method to device registry service
deviceRegistryService.getTemplates = async () => {
  try {
    const { provisioningTemplates } = await import('@shared/deviceRegistry');
    const { db } = await import('../db');
    return await db.select().from(provisioningTemplates);
  } catch (error) {
    console.error('Error getting provisioning templates:', error);
    throw new Error(`Failed to retrieve templates: ${error.message}`);
  }
};

export default router;