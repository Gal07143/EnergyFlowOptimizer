/**
 * Device Registry Service
 * 
 * This service implements the device registry and provisioning functionality:
 * 1. Unique device identifiers and authentication
 * 2. Device metadata management and status tracking
 * 3. Provisioning capabilities with QR codes and zero-touch options
 * 4. Security credential management
 */

import { v4 as uuidv4 } from 'uuid';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { storage } from '../storage';
import * as crypto from 'crypto';
import * as qrcode from 'qrcode';
import { 
  deviceRegistry, 
  deviceCredentials, 
  provisioningTemplates, 
  registrationCodes,
  provisioningHistory,
  deviceRegistrationStatusEnum,
  deviceAuthMethodEnum,
  type DeviceRegistry,
  type DeviceCredentials,
  type ProvisioningTemplate,
  type RegistrationCode,
  type ProvisioningHistory,
  type InsertDeviceRegistry,
  type InsertDeviceCredentials,
  type InsertProvisioningTemplate,
  type InsertRegistrationCode,
  type InsertProvisioningHistory
} from '@shared/deviceRegistry';
import { 
  devices, 
  deviceTypeEnum, 
  deviceStatusEnum,
  type Device 
} from '@shared/schema';

/**
 * Generate secure credentials based on authentication method
 */
async function generateCredentials(
  authMethod: string, 
  deviceRegistryId: number
): Promise<InsertDeviceCredentials> {
  const credentials: InsertDeviceCredentials = {
    deviceRegistryId,
    authMethod: authMethod as any,
    isActive: true
  };

  switch(authMethod) {
    case 'api_key':
      credentials.apiKey = crypto.randomBytes(24).toString('hex');
      credentials.apiSecret = crypto.randomBytes(32).toString('hex');
      break;
      
    case 'username_password':
      credentials.username = `device_${deviceRegistryId}`;
      credentials.passwordHash = crypto.randomBytes(16).toString('hex');
      break;
      
    case 'token':
      credentials.tokenValue = crypto.randomBytes(32).toString('hex');
      // Token valid for 1 year
      credentials.validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      break;
      
    case 'certificate':
      // In a real implementation, we'd generate a proper certificate here
      // This is a placeholder for demonstration purposes
      credentials.certificatePem = 'PLACEHOLDER_CERTIFICATE';
      credentials.privateKeyPem = 'PLACEHOLDER_PRIVATE_KEY';
      // Certificate valid for 2 years
      credentials.validUntil = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
      break;
      
    default:
      // No credentials for 'none' authentication method
      break;
  }
  
  return credentials;
}

/**
 * Format a provisioning QR code string
 */
function formatQrCodeData(registrationCode: string, templateId?: number): string {
  const baseUrl = process.env.BASE_URL || 'https://ems.example.com';
  const qrData = {
    version: '1.0',
    code: registrationCode,
    url: `${baseUrl}/api/device/register?code=${registrationCode}`,
    templateId: templateId || null,
    timestamp: new Date().toISOString()
  };
  
  return JSON.stringify(qrData);
}

export const deviceRegistryService = {
  /**
   * Register a device in the registry with unique identifier
   */
  async registerDevice(deviceData: InsertDeviceRegistry): Promise<DeviceRegistry> {
    try {
      // First insert into the registry
      const [newRegistryEntry] = await db.insert(deviceRegistry)
        .values(deviceData)
        .returning();
      
      // Update the device record if it exists
      if (deviceData.deviceId) {
        await db.update(devices)
          .set({ 
            status: 'online' as any,
            updatedAt: new Date()
          })
          .where(eq(devices.id, deviceData.deviceId));
      }
      
      return newRegistryEntry;
    } catch (error) {
      console.error('Error registering device:', error);
      throw new Error(`Failed to register device: ${error.message}`);
    }
  },
  
  /**
   * Create device credentials based on authentication method
   */
  async createDeviceCredentials(
    deviceRegistryId: number, 
    authMethod: string
  ): Promise<DeviceCredentials> {
    try {
      // Generate credentials based on auth method
      const credentialData = await generateCredentials(authMethod, deviceRegistryId);
      
      // Insert into credentials table
      const [newCredentials] = await db.insert(deviceCredentials)
        .values(credentialData)
        .returning();
      
      // Update the registry entry with the auth method
      await db.update(deviceRegistry)
        .set({ 
          authMethod: authMethod as any,
          updatedAt: new Date()
        })
        .where(eq(deviceRegistry.id, deviceRegistryId));
      
      return newCredentials;
    } catch (error) {
      console.error('Error creating device credentials:', error);
      throw new Error(`Failed to create device credentials: ${error.message}`);
    }
  },
  
  /**
   * Create a provisioning template for zero-touch device setup
   */
  async createProvisioningTemplate(templateData: InsertProvisioningTemplate): Promise<ProvisioningTemplate> {
    try {
      const [newTemplate] = await db.insert(provisioningTemplates)
        .values(templateData)
        .returning();
      
      return newTemplate;
    } catch (error) {
      console.error('Error creating provisioning template:', error);
      throw new Error(`Failed to create provisioning template: ${error.message}`);
    }
  },
  
  /**
   * Generate a registration code for manual device registration
   */
  async generateRegistrationCode(
    deviceType: string, 
    templateId?: number, 
    expiryHours = 24,
    isOneTime = true
  ): Promise<RegistrationCode> {
    try {
      // Generate a secure random code
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      
      // Create QR code data
      const qrCodeData = formatQrCodeData(code, templateId);
      
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);
      
      // Registration URL
      const baseUrl = process.env.BASE_URL || 'https://ems.example.com';
      const registrationUrl = `${baseUrl}/api/device/register?code=${code}`;
      
      // Create registration code entry
      const codeData: InsertRegistrationCode = {
        code,
        qrCodeData,
        registrationUrl,
        deviceType: deviceType as any,
        expiresAt,
        isOneTime,
        maxUses: isOneTime ? 1 : 100, // Default for multi-use codes
        isActive: true
      };
      
      // Add template ID if provided
      if (templateId) {
        codeData.provisioningTemplateId = templateId;
      }
      
      const [newCode] = await db.insert(registrationCodes)
        .values(codeData)
        .returning();
      
      return newCode;
    } catch (error) {
      console.error('Error generating registration code:', error);
      throw new Error(`Failed to generate registration code: ${error.message}`);
    }
  },
  
  /**
   * Register a device using a registration code
   */
  async registerDeviceWithCode(
    code: string,
    deviceData: {
      deviceUid: string;
      deviceType: string;
      firmwareVersion?: string;
      metadata?: any;
    }
  ): Promise<{ success: boolean; deviceRegistry?: DeviceRegistry; message: string }> {
    try {
      // Find the registration code
      const [registrationCode] = await db
        .select()
        .from(registrationCodes)
        .where(and(
          eq(registrationCodes.code, code),
          eq(registrationCodes.isActive, true)
        ));
      
      if (!registrationCode) {
        return { success: false, message: 'Invalid or inactive registration code' };
      }
      
      // Check if code is expired
      if (registrationCode.expiresAt && new Date() > new Date(registrationCode.expiresAt)) {
        return { success: false, message: 'Registration code has expired' };
      }
      
      // Check if code has reached max uses
      if (registrationCode.useCount >= registrationCode.maxUses) {
        return { success: false, message: 'Registration code has reached maximum uses' };
      }
      
      // Check if device type matches (if specified in code)
      if (registrationCode.deviceType && registrationCode.deviceType !== deviceData.deviceType) {
        return { 
          success: false, 
          message: `Device type mismatch. Expected: ${registrationCode.deviceType}, Got: ${deviceData.deviceType}` 
        };
      }
      
      // Get provisioning template if specified
      let template: ProvisioningTemplate | undefined;
      if (registrationCode.provisioningTemplateId) {
        const [foundTemplate] = await db
          .select()
          .from(provisioningTemplates)
          .where(eq(provisioningTemplates.id, registrationCode.provisioningTemplateId));
        
        template = foundTemplate;
      }
      
      // Create device registry entry
      const registryData: InsertDeviceRegistry = {
        deviceUid: deviceData.deviceUid,
        deviceType: deviceData.deviceType as any,
        registrationStatus: 'registered' as any,
        firmwareVersion: deviceData.firmwareVersion,
        metadata: deviceData.metadata || {},
        isOnline: true,
        lastSeen: new Date(),
        authMethod: template?.authMethod as any || 'none' as any
      };
      
      const [newRegistryEntry] = await db.insert(deviceRegistry)
        .values(registryData)
        .returning();
      
      // Create credentials based on template or default to API key
      const authMethod = template?.authMethod || 'api_key';
      const credentials = await this.createDeviceCredentials(newRegistryEntry.id, authMethod);
      
      // Update the registration code use count
      await db.update(registrationCodes)
        .set({ 
          useCount: registrationCode.useCount + 1,
          updatedAt: new Date(),
          // If one-time code and this is the first use, deactivate it
          ...(registrationCode.isOneTime ? { isActive: false } : {})
        })
        .where(eq(registrationCodes.id, registrationCode.id));
      
      // Create provisioning history entry
      const historyData: InsertProvisioningHistory = {
        deviceRegistryId: newRegistryEntry.id,
        registrationCodeId: registrationCode.id,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        provisioningData: {
          deviceUid: deviceData.deviceUid,
          deviceType: deviceData.deviceType,
          firmwareVersion: deviceData.firmwareVersion
        },
        appliedConfiguration: template?.configTemplate || {},
        performedBy: 'system',
      };
      
      if (template) {
        historyData.provisioningTemplateId = template.id;
      }
      
      await db.insert(provisioningHistory)
        .values(historyData);
      
      return { 
        success: true, 
        deviceRegistry: newRegistryEntry, 
        message: 'Device registered successfully' 
      };
    } catch (error) {
      console.error('Error registering device with code:', error);
      return { 
        success: false, 
        message: `Failed to register device: ${error.message}` 
      };
    }
  },
  
  /**
   * Get QR code image for a registration code
   */
  async getQrCodeImage(codeId: number): Promise<string | null> {
    try {
      const [registrationCode] = await db
        .select()
        .from(registrationCodes)
        .where(eq(registrationCodes.id, codeId));
      
      if (!registrationCode || !registrationCode.qrCodeData) {
        return null;
      }
      
      // Generate QR code as data URL
      return await qrcode.toDataURL(registrationCode.qrCodeData);
    } catch (error) {
      console.error('Error generating QR code image:', error);
      return null;
    }
  },
  
  /**
   * Update device online status and last seen timestamp
   */
  async updateDeviceStatus(
    deviceUid: string, 
    isOnline: boolean
  ): Promise<boolean> {
    try {
      // Find the device in registry
      const [registryEntry] = await db
        .select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.deviceUid, deviceUid));
      
      if (!registryEntry) {
        return false;
      }
      
      // Update status in registry
      await db.update(deviceRegistry)
        .set({ 
          isOnline,
          lastSeen: new Date(),
          ...(isOnline ? { lastConnected: new Date() } : {})
        })
        .where(eq(deviceRegistry.deviceUid, deviceUid));
      
      // Update device status if deviceId is available
      if (registryEntry.deviceId) {
        await db.update(devices)
          .set({ 
            status: isOnline ? 'online' as any : 'offline' as any,
            updatedAt: new Date()
          })
          .where(eq(devices.id, registryEntry.deviceId));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating device status:', error);
      return false;
    }
  },
  
  /**
   * Validate device credentials for authentication
   */
  async validateDeviceCredentials(
    deviceUid: string, 
    authMethod: string, 
    credentials: any
  ): Promise<{ isValid: boolean; deviceRegistry?: DeviceRegistry }> {
    try {
      // Find the device in registry
      const [registryEntry] = await db
        .select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.deviceUid, deviceUid));
      
      if (!registryEntry) {
        return { isValid: false };
      }
      
      // Find the device credentials
      const [deviceCreds] = await db
        .select()
        .from(deviceCredentials)
        .where(and(
          eq(deviceCredentials.deviceRegistryId, registryEntry.id),
          eq(deviceCredentials.authMethod, authMethod as any),
          eq(deviceCredentials.isActive, true)
        ));
      
      if (!deviceCreds) {
        return { isValid: false };
      }
      
      // Validate based on auth method
      let isValid = false;
      
      switch(authMethod) {
        case 'api_key':
          isValid = deviceCreds.apiKey === credentials.apiKey && 
                   deviceCreds.apiSecret === credentials.apiSecret;
          break;
          
        case 'username_password':
          // In a real implementation, we'd properly compare hashed passwords
          isValid = deviceCreds.username === credentials.username && 
                   deviceCreds.passwordHash === credentials.password;
          break;
          
        case 'token':
          isValid = deviceCreds.tokenValue === credentials.token && 
                   (!deviceCreds.validUntil || new Date() < new Date(deviceCreds.validUntil));
          break;
          
        case 'certificate':
          // In a real implementation, we'd validate the certificate
          isValid = true; // Placeholder
          break;
          
        default:
          isValid = false;
      }
      
      if (isValid) {
        // Update last seen timestamp
        await this.updateDeviceStatus(deviceUid, true);
      }
      
      return { 
        isValid, 
        ...(isValid ? { deviceRegistry: registryEntry } : {}) 
      };
    } catch (error) {
      console.error('Error validating device credentials:', error);
      return { isValid: false };
    }
  },
  
  /**
   * Apply a provisioning template to a device
   */
  async applyTemplate(
    deviceRegistryId: number, 
    templateId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find the device in registry
      const [registryEntry] = await db
        .select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.id, deviceRegistryId));
      
      if (!registryEntry) {
        return { success: false, message: 'Device not found in registry' };
      }
      
      // Find the template
      const [template] = await db
        .select()
        .from(provisioningTemplates)
        .where(eq(provisioningTemplates.id, templateId));
      
      if (!template) {
        return { success: false, message: 'Template not found' };
      }
      
      // Check device type compatibility
      if (template.deviceType !== registryEntry.deviceType) {
        return { 
          success: false, 
          message: `Template not compatible with device type. Expected: ${template.deviceType}, Got: ${registryEntry.deviceType}` 
        };
      }
      
      // Create provisioning history entry
      const historyData: InsertProvisioningHistory = {
        deviceRegistryId,
        provisioningTemplateId: templateId,
        status: 'started',
        startedAt: new Date(),
        provisioningData: template.configTemplate,
        performedBy: 'system',
      };
      
      const [provHistory] = await db.insert(provisioningHistory)
        .values(historyData)
        .returning();
      
      // Update device registry status
      await db.update(deviceRegistry)
        .set({ 
          registrationStatus: 'provisioning' as any,
          updatedAt: new Date()
        })
        .where(eq(deviceRegistry.id, deviceRegistryId));
      
      // Here we would implement the actual provisioning logic
      // This could involve sending MQTT messages, API calls, etc.
      
      // For demo purposes, we'll update the history to completed
      await db.update(provisioningHistory)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          appliedConfiguration: template.configTemplate
        })
        .where(eq(provisioningHistory.id, provHistory.id));
      
      // Update device registry status
      await db.update(deviceRegistry)
        .set({ 
          registrationStatus: 'active' as any,
          updatedAt: new Date()
        })
        .where(eq(deviceRegistry.id, deviceRegistryId));
      
      return { 
        success: true, 
        message: 'Template applied successfully' 
      };
    } catch (error) {
      console.error('Error applying template:', error);
      return { 
        success: false, 
        message: `Failed to apply template: ${error.message}` 
      };
    }
  },
  
  /**
   * List all devices in the registry
   */
  async listDevices(
    filters: {
      deviceType?: string;
      isOnline?: boolean;
      registrationStatus?: string;
    } = {}
  ): Promise<DeviceRegistry[]> {
    try {
      // Build query conditions
      const conditions = [];
      
      if (filters.deviceType) {
        conditions.push(eq(deviceRegistry.deviceType, filters.deviceType as any));
      }
      
      if (filters.isOnline !== undefined) {
        conditions.push(eq(deviceRegistry.isOnline, filters.isOnline));
      }
      
      if (filters.registrationStatus) {
        conditions.push(eq(deviceRegistry.registrationStatus, filters.registrationStatus as any));
      }
      
      // Execute query with conditions
      const query = db.select().from(deviceRegistry);
      
      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }
      
      return await query;
    } catch (error) {
      console.error('Error listing devices:', error);
      throw new Error(`Failed to list devices: ${error.message}`);
    }
  },
  
  /**
   * Get device by registration ID
   */
  async getDeviceByRegistrationId(registrationId: string): Promise<DeviceRegistry | null> {
    try {
      const [device] = await db
        .select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.registrationId, registrationId));
      
      return device || null;
    } catch (error) {
      console.error('Error getting device by registration ID:', error);
      return null;
    }
  },
  
  /**
   * Get device by UID
   */
  async getDeviceByUid(deviceUid: string): Promise<DeviceRegistry | null> {
    try {
      const [device] = await db
        .select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.deviceUid, deviceUid));
      
      return device || null;
    } catch (error) {
      console.error('Error getting device by UID:', error);
      return null;
    }
  }
};