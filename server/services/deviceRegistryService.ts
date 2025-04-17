import { db } from '../db';
import { DeviceType, DeviceRegistrationStatus, DeviceAuthMethod } from '@shared/deviceRegistry';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Define types for device registry
export type DeviceRegistryEntry = {
  id: number;
  deviceId?: number;
  registrationId: string;
  deviceUid: string;
  registrationStatus: DeviceRegistrationStatus;
  deviceType: DeviceType;
  firmwareVersion?: string;
  lastConnected?: Date;
  lastSeen?: Date;
  metadata?: Record<string, any>;
  location?: string;
  isOnline: boolean;
  authMethod: DeviceAuthMethod;
  createdAt: Date;
  updatedAt: Date;
};

export type ProvisioningTemplate = {
  id: number;
  name: string;
  description?: string;
  deviceType: DeviceType;
  configTemplate: Record<string, any>;
  firmwareVersion?: string;
  authMethod: DeviceAuthMethod;
  defaultSettings?: Record<string, any>;
  requiredCapabilities?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RegistrationCode = {
  id: number;
  code: string;
  qrCodeData?: string;
  registrationUrl?: string;
  provisioningTemplateId?: number;
  deviceType?: DeviceType;
  expiresAt?: Date;
  isOneTime: boolean;
  useCount: number;
  maxUses: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceCredentials = {
  id: number;
  deviceRegistryId: number;
  authMethod: DeviceAuthMethod;
  username?: string;
  passwordHash?: string;
  apiKey?: string;
  apiSecret?: string;
  certificatePem?: string;
  privateKeyPem?: string;
  tokenValue?: string;
  validUntil?: Date;
  isActive: boolean;
  lastRotated: Date;
  createdAt: Date;
  updatedAt: Date;
};

class DeviceRegistryService {
  // Device registration
  async registerDevice(deviceData: {
    deviceUid: string;
    deviceType: DeviceType;
    firmwareVersion?: string;
    location?: string;
    metadata?: Record<string, any>;
    authMethod?: DeviceAuthMethod;
    isOnline?: boolean;
  }): Promise<DeviceRegistryEntry> {
    try {
      // Check if device with the same UID already exists
      const existingDevice = await this.getDeviceByUid(deviceData.deviceUid);
      if (existingDevice) {
        throw new Error(`Device with UID ${deviceData.deviceUid} already exists`);
      }

      // Create new device registry entry
      const registrationId = uuidv4();
      const [device] = await db.execute(
        `INSERT INTO device_registry 
        (registration_id, device_uid, registration_status, device_type, firmware_version, location, metadata, is_online, auth_method) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`,
        [
          registrationId,
          deviceData.deviceUid,
          'pending',
          deviceData.deviceType,
          deviceData.firmwareVersion || null,
          deviceData.location || null,
          deviceData.metadata ? JSON.stringify(deviceData.metadata) : null,
          deviceData.isOnline || false,
          deviceData.authMethod || 'none',
        ]
      );

      return this.mapDbRecordToDeviceRegistry(device);
    } catch (error) {
      console.error('Error registering device:', error);
      throw new Error(`Failed to register device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get device by ID
  async getDevice(id: number): Promise<DeviceRegistryEntry | null> {
    try {
      const [device] = await db.execute(
        'SELECT * FROM device_registry WHERE id = $1',
        [id]
      );

      if (!device) {
        return null;
      }

      return this.mapDbRecordToDeviceRegistry(device);
    } catch (error) {
      console.error('Error retrieving device:', error);
      throw new Error(`Failed to retrieve device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get device by UID
  async getDeviceByUid(deviceUid: string): Promise<DeviceRegistryEntry | null> {
    try {
      const [device] = await db.execute(
        'SELECT * FROM device_registry WHERE device_uid = $1',
        [deviceUid]
      );

      if (!device) {
        return null;
      }

      return this.mapDbRecordToDeviceRegistry(device);
    } catch (error) {
      console.error('Error retrieving device by UID:', error);
      throw new Error(`Failed to retrieve device by UID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get all devices
  async getDevices(filters?: {
    deviceType?: DeviceType;
    registrationStatus?: DeviceRegistrationStatus;
    isOnline?: boolean;
  }): Promise<DeviceRegistryEntry[]> {
    try {
      let query = 'SELECT * FROM device_registry';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters) {
        if (filters.deviceType) {
          conditions.push(`device_type = $${params.length + 1}`);
          params.push(filters.deviceType);
        }

        if (filters.registrationStatus) {
          conditions.push(`registration_status = $${params.length + 1}`);
          params.push(filters.registrationStatus);
        }

        if (filters.isOnline !== undefined) {
          conditions.push(`is_online = $${params.length + 1}`);
          params.push(filters.isOnline);
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
      }

      query += ' ORDER BY created_at DESC';

      const devices = await db.execute(query, params);

      return devices.map(this.mapDbRecordToDeviceRegistry);
    } catch (error) {
      console.error('Error retrieving devices:', error);
      throw new Error(`Failed to retrieve devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update device
  async updateDevice(id: number, updateData: Partial<DeviceRegistryEntry>): Promise<DeviceRegistryEntry> {
    try {
      const device = await this.getDevice(id);
      if (!device) {
        throw new Error(`Device with ID ${id} not found`);
      }

      // Prepare update query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCounter = 1;

      // Add fields to update only if they're provided
      if (updateData.deviceType !== undefined) {
        updateFields.push(`device_type = $${paramCounter++}`);
        params.push(updateData.deviceType);
      }

      if (updateData.registrationStatus !== undefined) {
        updateFields.push(`registration_status = $${paramCounter++}`);
        params.push(updateData.registrationStatus);
      }

      if (updateData.firmwareVersion !== undefined) {
        updateFields.push(`firmware_version = $${paramCounter++}`);
        params.push(updateData.firmwareVersion);
      }

      if (updateData.lastConnected !== undefined) {
        updateFields.push(`last_connected = $${paramCounter++}`);
        params.push(updateData.lastConnected);
      }

      if (updateData.lastSeen !== undefined) {
        updateFields.push(`last_seen = $${paramCounter++}`);
        params.push(updateData.lastSeen);
      }

      if (updateData.metadata !== undefined) {
        updateFields.push(`metadata = $${paramCounter++}`);
        params.push(JSON.stringify(updateData.metadata));
      }

      if (updateData.location !== undefined) {
        updateFields.push(`location = $${paramCounter++}`);
        params.push(updateData.location);
      }

      if (updateData.isOnline !== undefined) {
        updateFields.push(`is_online = $${paramCounter++}`);
        params.push(updateData.isOnline);
      }

      if (updateData.authMethod !== undefined) {
        updateFields.push(`auth_method = $${paramCounter++}`);
        params.push(updateData.authMethod);
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      // Add the device ID as the last parameter
      params.push(id);

      // Execute the update
      const [updatedDevice] = await db.execute(
        `UPDATE device_registry SET ${updateFields.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
        params
      );

      return this.mapDbRecordToDeviceRegistry(updatedDevice);
    } catch (error) {
      console.error('Error updating device:', error);
      throw new Error(`Failed to update device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Registration code generation
  async generateRegistrationCode(data: {
    deviceType?: DeviceType;
    provisioningTemplateId?: number;
    expiryHours?: number;
    isOneTime?: boolean;
    maxUses?: number;
  }): Promise<RegistrationCode> {
    try {
      // Generate a unique registration code
      const code = this.generateUniqueCode();

      // Calculate expiry date
      const expiresAt = data.expiryHours ? new Date(Date.now() + data.expiryHours * 60 * 60 * 1000) : null;

      // Generate registration URL
      const registrationUrl = `${process.env.APP_URL || 'https://ems.example.com'}/device-register?code=${code}`;

      // Generate QR code
      const qrCodeData = await QRCode.toDataURL(registrationUrl);

      // Create registration code entry
      const [registrationCode] = await db.execute(
        `INSERT INTO registration_codes 
        (code, qr_code_data, registration_url, provisioning_template_id, device_type, expires_at, is_one_time, use_count, max_uses, is_active) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          code,
          qrCodeData,
          registrationUrl,
          data.provisioningTemplateId || null,
          data.deviceType || null,
          expiresAt,
          data.isOneTime !== undefined ? data.isOneTime : true,
          0, // Initial use count
          data.maxUses || 1,
          true, // Active by default
        ]
      );

      return this.mapDbRecordToRegistrationCode(registrationCode);
    } catch (error) {
      console.error('Error generating registration code:', error);
      throw new Error(`Failed to generate registration code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get registration code by code
  async getRegistrationCode(code: string): Promise<RegistrationCode | null> {
    try {
      const [registrationCode] = await db.execute(
        'SELECT * FROM registration_codes WHERE code = $1',
        [code]
      );

      if (!registrationCode) {
        return null;
      }

      return this.mapDbRecordToRegistrationCode(registrationCode);
    } catch (error) {
      console.error('Error retrieving registration code:', error);
      throw new Error(`Failed to retrieve registration code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate registration code
  async validateRegistrationCode(code: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const registrationCode = await this.getRegistrationCode(code);

      if (!registrationCode) {
        return { valid: false, reason: 'Registration code not found' };
      }

      if (!registrationCode.isActive) {
        return { valid: false, reason: 'Registration code is inactive' };
      }

      if (registrationCode.expiresAt && new Date(registrationCode.expiresAt) < new Date()) {
        return { valid: false, reason: 'Registration code has expired' };
      }

      if (registrationCode.isOneTime && registrationCode.useCount >= registrationCode.maxUses) {
        return { valid: false, reason: 'Registration code has reached maximum usage' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating registration code:', error);
      throw new Error(`Failed to validate registration code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Use registration code (increment usage counter)
  async useRegistrationCode(code: string): Promise<RegistrationCode> {
    try {
      const validation = await this.validateRegistrationCode(code);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      const [updatedCode] = await db.execute(
        'UPDATE registration_codes SET use_count = use_count + 1, updated_at = NOW() WHERE code = $1 RETURNING *',
        [code]
      );

      return this.mapDbRecordToRegistrationCode(updatedCode);
    } catch (error) {
      console.error('Error using registration code:', error);
      throw new Error(`Failed to use registration code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get all registration codes
  async getRegistrationCodes(): Promise<RegistrationCode[]> {
    try {
      const codes = await db.execute(
        'SELECT * FROM registration_codes ORDER BY created_at DESC',
        []
      );

      return codes.map(this.mapDbRecordToRegistrationCode);
    } catch (error) {
      console.error('Error retrieving registration codes:', error);
      throw new Error(`Failed to retrieve registration codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Provisioning templates
  async createTemplate(templateData: {
    name: string;
    description?: string;
    deviceType: DeviceType;
    configTemplate: Record<string, any>;
    firmwareVersion?: string;
    authMethod: DeviceAuthMethod;
    defaultSettings?: Record<string, any>;
    requiredCapabilities?: string[];
    isActive?: boolean;
  }): Promise<ProvisioningTemplate> {
    try {
      const [template] = await db.execute(
        `INSERT INTO provisioning_templates 
        (name, description, device_type, config_template, firmware_version, auth_method, default_settings, required_capabilities, is_active) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`,
        [
          templateData.name,
          templateData.description || null,
          templateData.deviceType,
          JSON.stringify(templateData.configTemplate),
          templateData.firmwareVersion || null,
          templateData.authMethod,
          templateData.defaultSettings ? JSON.stringify(templateData.defaultSettings) : null,
          templateData.requiredCapabilities ? JSON.stringify(templateData.requiredCapabilities) : null,
          templateData.isActive !== undefined ? templateData.isActive : true,
        ]
      );

      return this.mapDbRecordToProvisioningTemplate(template);
    } catch (error) {
      console.error('Error creating provisioning template:', error);
      throw new Error(`Failed to create provisioning template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get template by ID
  async getTemplate(id: number): Promise<ProvisioningTemplate | null> {
    try {
      const [template] = await db.execute(
        'SELECT * FROM provisioning_templates WHERE id = $1',
        [id]
      );

      if (!template) {
        return null;
      }

      return this.mapDbRecordToProvisioningTemplate(template);
    } catch (error) {
      console.error('Error retrieving provisioning template:', error);
      throw new Error(`Failed to retrieve provisioning template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get all templates
  async getTemplates(deviceType?: DeviceType): Promise<ProvisioningTemplate[]> {
    try {
      let query = 'SELECT * FROM provisioning_templates';
      const params: any[] = [];

      if (deviceType) {
        query += ' WHERE device_type = $1';
        params.push(deviceType);
      }

      query += ' ORDER BY name ASC';

      const templates = await db.execute(query, params);

      return templates.map(this.mapDbRecordToProvisioningTemplate);
    } catch (error) {
      console.error('Error retrieving provisioning templates:', error);
      throw new Error(`Failed to retrieve provisioning templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Apply template to a device
  async applyTemplate(deviceId: number, templateId: number): Promise<DeviceRegistryEntry> {
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

      // Check if device type matches template
      if (device.deviceType !== template.deviceType) {
        throw new Error(`Template device type (${template.deviceType}) does not match device type (${device.deviceType})`);
      }

      // Update device with template settings
      const updateData: Partial<DeviceRegistryEntry> = {
        registrationStatus: 'provisioning',
        authMethod: template.authMethod,
        firmwareVersion: template.firmwareVersion,
      };

      // Update the device
      const updatedDevice = await this.updateDevice(deviceId, updateData);

      // Record provisioning history
      await db.execute(
        `INSERT INTO provisioning_history 
        (device_registry_id, provisioning_template_id, status, applied_configuration, started_at) 
        VALUES 
        ($1, $2, $3, $4, NOW())`,
        [
          deviceId,
          templateId,
          'started',
          JSON.stringify(template.configTemplate),
        ]
      );

      // If there's a credential configuration in the template, create credentials
      if (template.authMethod !== 'none') {
        await this.createDeviceCredentials(deviceId, template.authMethod);
      }

      return updatedDevice;
    } catch (error) {
      console.error('Error applying template to device:', error);
      throw new Error(`Failed to apply template to device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Device credentials
  async createDeviceCredentials(deviceId: number, authMethod: DeviceAuthMethod): Promise<DeviceCredentials> {
    try {
      const device = await this.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      // Generate credentials based on auth method
      let username = null;
      let passwordHash = null;
      let apiKey = null;
      let apiSecret = null;
      let certificatePem = null;
      let privateKeyPem = null;
      let tokenValue = null;
      let validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

      switch (authMethod) {
        case 'username_password':
          username = `device_${device.deviceUid}`;
          passwordHash = await this.hashPassword(this.generateRandomString(16));
          break;
        case 'api_key':
          apiKey = `ak_${this.generateRandomString(16)}`;
          apiSecret = this.generateRandomString(32);
          break;
        case 'certificate':
          // In a real implementation, this would generate a certificate and private key
          certificatePem = '-----BEGIN CERTIFICATE-----\nSAMPLE\n-----END CERTIFICATE-----';
          privateKeyPem = '-----BEGIN PRIVATE KEY-----\nSAMPLE\n-----END PRIVATE KEY-----';
          break;
        case 'token':
          tokenValue = `tk_${this.generateRandomString(32)}`;
          break;
        case 'oauth':
          // OAuth would typically be handled differently, but we'll create a token for demo
          tokenValue = `oa_${this.generateRandomString(32)}`;
          break;
        default:
          throw new Error(`Unsupported authentication method: ${authMethod}`);
      }

      // Create credentials record
      const [credentials] = await db.execute(
        `INSERT INTO device_credentials 
        (device_registry_id, auth_method, username, password_hash, api_key, api_secret, certificate_pem, private_key_pem, token_value, valid_until, is_active, last_rotated) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
        RETURNING *`,
        [
          deviceId,
          authMethod,
          username,
          passwordHash,
          apiKey,
          apiSecret,
          certificatePem,
          privateKeyPem,
          tokenValue,
          validUntil,
          true,
        ]
      );

      // Update device auth method
      await this.updateDevice(deviceId, { authMethod });

      return this.mapDbRecordToDeviceCredentials(credentials);
    } catch (error) {
      console.error('Error creating device credentials:', error);
      throw new Error(`Failed to create device credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get device credentials
  async getDeviceCredentials(deviceId: number): Promise<DeviceCredentials[]> {
    try {
      const credentials = await db.execute(
        'SELECT * FROM device_credentials WHERE device_registry_id = $1 ORDER BY created_at DESC',
        [deviceId]
      );

      return credentials.map(this.mapDbRecordToDeviceCredentials);
    } catch (error) {
      console.error('Error retrieving device credentials:', error);
      throw new Error(`Failed to retrieve device credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private mapDbRecordToDeviceRegistry(record: any): DeviceRegistryEntry {
    return {
      id: record.id,
      deviceId: record.device_id,
      registrationId: record.registration_id,
      deviceUid: record.device_uid,
      registrationStatus: record.registration_status,
      deviceType: record.device_type,
      firmwareVersion: record.firmware_version,
      lastConnected: record.last_connected,
      lastSeen: record.last_seen,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
      location: record.location,
      isOnline: record.is_online,
      authMethod: record.auth_method,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private mapDbRecordToProvisioningTemplate(record: any): ProvisioningTemplate {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      deviceType: record.device_type,
      configTemplate: JSON.parse(record.config_template),
      firmwareVersion: record.firmware_version,
      authMethod: record.auth_method,
      defaultSettings: record.default_settings ? JSON.parse(record.default_settings) : undefined,
      requiredCapabilities: record.required_capabilities ? JSON.parse(record.required_capabilities) : undefined,
      isActive: record.is_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private mapDbRecordToRegistrationCode(record: any): RegistrationCode {
    return {
      id: record.id,
      code: record.code,
      qrCodeData: record.qr_code_data,
      registrationUrl: record.registration_url,
      provisioningTemplateId: record.provisioning_template_id,
      deviceType: record.device_type,
      expiresAt: record.expires_at,
      isOneTime: record.is_one_time,
      useCount: record.use_count,
      maxUses: record.max_uses,
      isActive: record.is_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private mapDbRecordToDeviceCredentials(record: any): DeviceCredentials {
    return {
      id: record.id,
      deviceRegistryId: record.device_registry_id,
      authMethod: record.auth_method,
      username: record.username,
      passwordHash: record.password_hash,
      apiKey: record.api_key,
      apiSecret: record.api_secret,
      certificatePem: record.certificate_pem,
      privateKeyPem: record.private_key_pem,
      tokenValue: record.token_value,
      validUntil: record.valid_until,
      isActive: record.is_active,
      lastRotated: record.last_rotated,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private generateUniqueCode(): string {
    // Generate a random code using crypto module
    const buffer = crypto.randomBytes(8);
    return buffer.toString('hex').toUpperCase();
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomValues[i] % chars.length);
    }
    return result;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${derivedKey.toString('hex')}.${salt}`);
      });
    });
  }
}

export const deviceRegistryService = new DeviceRegistryService();