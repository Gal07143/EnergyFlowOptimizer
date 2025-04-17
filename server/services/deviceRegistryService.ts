import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes, scrypt, createHash } from 'crypto';
import { promisify } from 'util';
import QRCode from 'qrcode';
import { eq, and, or, ilike, isNull, lt, desc, asc } from 'drizzle-orm';
import {
  deviceRegistry,
  deviceCredentials,
  provisioningTemplates,
  registrationCodes,
  provisioningHistory,
  DeviceType,
  DeviceAuthMethod,
  DeviceRegistrationStatus,
  InsertDeviceRegistry,
  InsertDeviceCredentials,
  InsertProvisioningTemplate,
  InsertRegistrationCode,
  InsertProvisioningHistory
} from '@shared/deviceRegistry';

const scryptAsync = promisify(scrypt);

/**
 * Device Registry Service
 * Handles all operations related to device registry, templates, codes, and provisioning
 */
class DeviceRegistryService {
  /**
   * Get all devices from registry with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of devices
   */
  async getDevices(filters?: {
    deviceType?: DeviceType;
    registrationStatus?: DeviceRegistrationStatus;
    isOnline?: boolean;
    search?: string;
  }) {
    try {
      let query = db.select().from(deviceRegistry);

      if (filters) {
        // Apply filters if provided
        if (filters.deviceType) {
          query = query.where(eq(deviceRegistry.deviceType, filters.deviceType));
        }
        if (filters.registrationStatus) {
          query = query.where(eq(deviceRegistry.registrationStatus, filters.registrationStatus));
        }
        if (filters.isOnline !== undefined) {
          query = query.where(eq(deviceRegistry.isOnline, filters.isOnline));
        }
        if (filters.search) {
          // Search in deviceUid, location, and metadata
          query = query.where(
            or(
              ilike(deviceRegistry.deviceUid, `%${filters.search}%`),
              ilike(deviceRegistry.location, `%${filters.search}%`)
            )
          );
        }
      }

      // Order by last seen time or created time
      query = query.orderBy(desc(deviceRegistry.lastSeen), desc(deviceRegistry.createdAt));

      const devices = await query;
      return devices;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }

  /**
   * Get a device by ID
   * @param id Device ID
   * @returns Device or undefined if not found
   */
  async getDevice(id: number) {
    try {
      const [device] = await db
        .select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.id, id));
      
      return device;
    } catch (error) {
      console.error(`Error fetching device with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Register a new device
   * @param deviceData Device data to register
   * @returns Newly registered device
   */
  async registerDevice(deviceData: Omit<InsertDeviceRegistry, 'id' | 'registrationId'>) {
    try {
      const [device] = await db
        .insert(deviceRegistry)
        .values(deviceData)
        .returning();
      
      return device;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Update a device's information
   * @param id Device ID
   * @param deviceData Updated device data
   * @returns Updated device
   */
  async updateDevice(id: number, deviceData: Partial<InsertDeviceRegistry>) {
    try {
      const [device] = await db
        .update(deviceRegistry)
        .set({
          ...deviceData,
          updatedAt: new Date()
        })
        .where(eq(deviceRegistry.id, id))
        .returning();
      
      return device;
    } catch (error) {
      console.error(`Error updating device with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update device status (online/offline)
   * @param id Device ID
   * @param isOnline Online status
   * @returns Updated device
   */
  async updateDeviceStatus(id: number, isOnline: boolean) {
    try {
      const data: any = { isOnline, updatedAt: new Date() };
      
      // If status is changing, update timestamps
      if (isOnline) {
        data.lastConnected = new Date();
        data.lastSeen = new Date();
      } else {
        data.lastSeen = new Date();
      }
      
      const [device] = await db
        .update(deviceRegistry)
        .set(data)
        .where(eq(deviceRegistry.id, id))
        .returning();
      
      return device;
    } catch (error) {
      console.error(`Error updating device status for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create device credentials
   * @param deviceId Device ID
   * @param authMethod Authentication method
   * @returns Created credentials
   */
  async createDeviceCredentials(deviceId: number, authMethod: DeviceAuthMethod) {
    try {
      // Check if device exists
      const device = await this.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      
      // Generate credentials based on auth method
      const credentials: Omit<InsertDeviceCredentials, 'id'> = {
        deviceRegistryId: deviceId,
        authMethod,
        isActive: true,
      };
      
      switch (authMethod) {
        case 'api_key':
          credentials.apiKey = `sk_device_${randomBytes(16).toString('hex')}`;
          credentials.apiSecret = `sk_secret_${randomBytes(32).toString('hex')}`;
          break;
          
        case 'username_password':
          credentials.username = `device_${device.deviceUid.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const password = `pwd_${randomBytes(8).toString('hex')}`;
          const salt = randomBytes(16).toString('hex');
          const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
          credentials.passwordHash = `${derivedKey.toString('hex')}.${salt}`;
          // Store plaintext password temporarily to return to caller
          (credentials as any).password = password;
          break;
          
        case 'certificate':
          // In a real implementation, this would generate a certificate
          // For demo purposes, we're just using placeholder text
          credentials.certificatePem = '-----BEGIN CERTIFICATE-----\nMIIDTTCCAjWgAwIBAgIJAMK71uD...';
          credentials.privateKeyPem = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEF...';
          break;
          
        case 'token':
          credentials.tokenValue = `token_${randomBytes(32).toString('hex')}`;
          // Set token expiry to 1 year from now
          credentials.validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          break;
          
        default:
          break;
      }
      
      // Update device auth method
      await this.updateDevice(deviceId, { authMethod });
      
      // Save credentials to database
      const [savedCredentials] = await db
        .insert(deviceCredentials)
        .values(credentials)
        .returning();
      
      return savedCredentials;
    } catch (error) {
      console.error(`Error creating credentials for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get all templates with optional device type filter
   * @param deviceType Optional device type to filter templates
   * @returns Array of templates
   */
  async getTemplates(deviceType?: DeviceType) {
    try {
      let query = db.select().from(provisioningTemplates);
      
      if (deviceType) {
        query = query.where(eq(provisioningTemplates.deviceType, deviceType));
      }
      
      query = query.where(eq(provisioningTemplates.isActive, true))
        .orderBy(asc(provisioningTemplates.name));
      
      const templates = await query;
      return templates;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   * @param id Template ID
   * @returns Template or undefined if not found
   */
  async getTemplate(id: number) {
    try {
      const [template] = await db
        .select()
        .from(provisioningTemplates)
        .where(eq(provisioningTemplates.id, id));
      
      return template;
    } catch (error) {
      console.error(`Error fetching template with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new provisioning template
   * @param templateData Template data to create
   * @returns Created template
   */
  async createTemplate(templateData: Omit<InsertProvisioningTemplate, 'id'>) {
    try {
      const [template] = await db
        .insert(provisioningTemplates)
        .values(templateData)
        .returning();
      
      return template;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Apply a template to a device
   * @param deviceId Device ID
   * @param templateId Template ID
   * @returns Updated device
   */
  async applyTemplate(deviceId: number, templateId: number) {
    try {
      // Get device and template
      const device = await this.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }
      
      // Check if device type matches template type
      if (device.deviceType !== template.deviceType) {
        throw new Error(`Template device type (${template.deviceType}) doesn't match device type (${device.deviceType})`);
      }
      
      // Create provisioning history entry
      const historyData: Omit<InsertProvisioningHistory, 'id'> = {
        deviceRegistryId: deviceId,
        provisioningTemplateId: templateId,
        status: 'started',
        startedAt: new Date(),
        provisioningData: {
          deviceId,
          templateId,
          timestamp: new Date().toISOString()
        }
      };
      
      const [history] = await db
        .insert(provisioningHistory)
        .values(historyData)
        .returning();
      
      // In a real implementation, this would kick off an asynchronous process
      // For demo purposes, we'll just update the device directly
      const updatedDevice = await this.updateDevice(deviceId, {
        registrationStatus: 'provisioning',
        firmwareVersion: template.firmwareVersion,
        authMethod: template.authMethod,
        metadata: {
          ...(device.metadata || {}),
          configuredTemplate: template.id,
          configuredSettings: template.defaultSettings
        }
      });
      
      // Update history record
      await db
        .update(provisioningHistory)
        .set({
          status: 'success',
          completedAt: new Date(),
          appliedConfiguration: template.configTemplate
        })
        .where(eq(provisioningHistory.id, history.id));
      
      return updatedDevice;
    } catch (error) {
      console.error(`Error applying template ${templateId} to device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get all registration codes
   * @returns Array of registration codes
   */
  async getRegistrationCodes() {
    try {
      const codes = await db
        .select()
        .from(registrationCodes)
        .orderBy(desc(registrationCodes.createdAt));
      
      return codes;
    } catch (error) {
      console.error('Error fetching registration codes:', error);
      throw error;
    }
  }

  /**
   * Generate a new registration code
   * @param options Code generation options
   * @returns Generated registration code
   */
  async generateRegistrationCode(options: {
    deviceType?: DeviceType;
    provisioningTemplateId?: number;
    expiryHours?: number;
    isOneTime?: boolean;
    maxUses?: number;
  }) {
    try {
      // Check if template exists if provided
      if (options.provisioningTemplateId) {
        const template = await this.getTemplate(options.provisioningTemplateId);
        if (!template) {
          throw new Error(`Template with ID ${options.provisioningTemplateId} not found`);
        }
        
        // If no device type provided, use template's device type
        if (!options.deviceType) {
          options.deviceType = template.deviceType;
        }
        
        // Ensure device type matches template type
        if (options.deviceType !== template.deviceType) {
          throw new Error(`Template device type (${template.deviceType}) doesn't match requested device type (${options.deviceType})`);
        }
      }
      
      // Generate code with prefix based on device type
      const prefix = options.deviceType 
        ? options.deviceType.toUpperCase().replace('_', '-')
        : 'DEVICE';
      
      const code = `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
      
      // Calculate expiry date
      const expiryHours = options.expiryHours || 24;
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
      
      const codeData: Omit<InsertRegistrationCode, 'id'> = {
        code,
        deviceType: options.deviceType,
        provisioningTemplateId: options.provisioningTemplateId,
        expiresAt,
        isOneTime: options.isOneTime !== undefined ? options.isOneTime : true,
        maxUses: options.maxUses || 1,
        useCount: 0,
        isActive: true,
      };
      
      const [registrationCode] = await db
        .insert(registrationCodes)
        .values(codeData)
        .returning();
      
      // Generate QR code for the registration URL
      const baseUrl = process.env.APP_URL || 'https://ems.example.com';
      const registrationUrl = `${baseUrl}/device-register?code=${code}`;
      const qrCodeData = await QRCode.toDataURL(registrationUrl);
      
      // Update with QR code data
      const [updatedCode] = await db
        .update(registrationCodes)
        .set({
          qrCodeData,
          registrationUrl
        })
        .where(eq(registrationCodes.id, registrationCode.id))
        .returning();
      
      return updatedCode;
    } catch (error) {
      console.error('Error generating registration code:', error);
      throw error;
    }
  }

  /**
   * Validate a registration code
   * @param code Registration code to validate
   * @returns Validation result
   */
  async validateRegistrationCode(code: string) {
    try {
      const [registrationCode] = await db
        .select()
        .from(registrationCodes)
        .where(eq(registrationCodes.code, code));
      
      if (!registrationCode) {
        return {
          valid: false,
          reason: 'invalid_code',
          message: 'Registration code not found'
        };
      }
      
      // Check if code is active
      if (!registrationCode.isActive) {
        return {
          valid: false,
          reason: 'inactive_code',
          message: 'Registration code is no longer active'
        };
      }
      
      // Check if code has expired
      if (registrationCode.expiresAt && new Date() > registrationCode.expiresAt) {
        return {
          valid: false,
          reason: 'expired_code',
          message: 'Registration code has expired'
        };
      }
      
      // Check if code has reached maximum uses
      if (registrationCode.isOneTime && registrationCode.useCount >= registrationCode.maxUses) {
        return {
          valid: false,
          reason: 'max_uses_reached',
          message: 'Registration code has reached maximum number of uses'
        };
      }
      
      // Determine next steps based on template availability
      let template = null;
      let isCompleteRegistration = false;
      
      if (registrationCode.provisioningTemplateId) {
        template = await this.getTemplate(registrationCode.provisioningTemplateId);
        isCompleteRegistration = !!template;
      }
      
      return {
        valid: true,
        code: registrationCode,
        template,
        isCompleteRegistration,
        deviceType: registrationCode.deviceType
      };
    } catch (error) {
      console.error(`Error validating registration code ${code}:`, error);
      throw error;
    }
  }

  /**
   * Use a registration code to register a device
   * @param code Registration code
   * @param deviceData Device data to register
   * @returns Registered device and updated code
   */
  async useRegistrationCode(code: string, deviceData: Omit<InsertDeviceRegistry, 'id' | 'registrationId'>) {
    try {
      // Validate code first
      const validation = await this.validateRegistrationCode(code);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      
      // Register device
      const device = await this.registerDevice(deviceData);
      
      // Increment code use count
      const [updatedCode] = await db
        .update(registrationCodes)
        .set({
          useCount: (validation.code?.useCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(registrationCodes.code, code))
        .returning();
      
      // If there's a template, apply it automatically
      if (validation.template && validation.code?.provisioningTemplateId) {
        await this.applyTemplate(device.id, validation.code.provisioningTemplateId);
      }
      
      return { device, code: updatedCode };
    } catch (error) {
      console.error(`Error using registration code ${code}:`, error);
      throw error;
    }
  }
}

export default new DeviceRegistryService();