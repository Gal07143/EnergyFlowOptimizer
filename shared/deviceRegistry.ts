import { pgEnum, pgTable, serial, text, uuid, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const deviceTypeEnum = pgEnum('device_type', [
  'solar_pv',
  'battery_storage',
  'ev_charger',
  'smart_meter',
  'heat_pump',
  'inverter',
  'load_controller',
  'energy_gateway'
]);

export const deviceRegistrationStatusEnum = pgEnum('device_registration_status', [
  'pending',
  'registered',
  'provisioning',
  'active',
  'decommissioned',
  'rejected'
]);

export const deviceAuthMethodEnum = pgEnum('device_auth_method', [
  'none',
  'api_key',
  'certificate',
  'username_password',
  'oauth',
  'token'
]);

// Tables
export const deviceRegistry = pgTable('device_registry', {
  id: serial('id').primaryKey(),
  deviceId: serial('device_id').references(() => devices.id, { onDelete: 'cascade' }),
  registrationId: uuid('registration_id').notNull().defaultRandom(),
  deviceUid: text('device_uid').notNull().unique(),
  registrationStatus: deviceRegistrationStatusEnum('registration_status').default('pending'),
  deviceType: deviceTypeEnum('device_type').notNull(),
  firmwareVersion: text('firmware_version'),
  lastConnected: timestamp('last_connected'),
  lastSeen: timestamp('last_seen'),
  metadata: jsonb('metadata'),
  location: text('location'),
  locationCoordinates: text('location_coordinates'),
  zoneId: text('zone_id'),
  isOnline: boolean('is_online').default(false),
  authMethod: deviceAuthMethodEnum('auth_method').default('none'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const deviceCredentials = pgTable('device_credentials', {
  id: serial('id').primaryKey(),
  deviceRegistryId: serial('device_registry_id')
    .references(() => deviceRegistry.id, { onDelete: 'cascade' })
    .notNull(),
  authMethod: deviceAuthMethodEnum('auth_method').notNull(),
  username: text('username'),
  passwordHash: text('password_hash'),
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  certificatePem: text('certificate_pem'),
  privateKeyPem: text('private_key_pem'),
  tokenValue: text('token_value'),
  validUntil: timestamp('valid_until'),
  isActive: boolean('is_active').default(true),
  lastRotated: timestamp('last_rotated').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const provisioningTemplates = pgTable('provisioning_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  deviceType: deviceTypeEnum('device_type').notNull(),
  configTemplate: jsonb('config_template').notNull(),
  firmwareVersion: text('firmware_version'),
  authMethod: deviceAuthMethodEnum('auth_method').default('api_key'),
  defaultSettings: jsonb('default_settings'),
  requiredCapabilities: jsonb('required_capabilities'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const registrationCodes = pgTable('registration_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  qrCodeData: text('qr_code_data'),
  registrationUrl: text('registration_url'),
  provisioningTemplateId: serial('provisioning_template_id').references(() => provisioningTemplates.id),
  deviceType: deviceTypeEnum('device_type'),
  expiresAt: timestamp('expires_at'),
  isOneTime: boolean('is_one_time').default(true),
  useCount: serial('use_count').default(0),
  maxUses: serial('max_uses').default(1),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const provisioningHistory = pgTable('provisioning_history', {
  id: serial('id').primaryKey(),
  deviceRegistryId: serial('device_registry_id').references(() => deviceRegistry.id),
  provisioningTemplateId: serial('provisioning_template_id').references(() => provisioningTemplates.id),
  registrationCodeId: serial('registration_code_id').references(() => registrationCodes.id),
  status: text('status').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  provisioningData: jsonb('provisioning_data'),
  appliedConfiguration: jsonb('applied_configuration'),
  performedBy: text('performed_by'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow()
});

// Mock devices table for reference (this would be defined elsewhere)
export const devices = pgTable('devices', {
  id: serial('id').primaryKey()
  // other fields would be defined in the actual schema
});

// Types
export type DeviceType = typeof deviceTypeEnum.enumValues[number];
export type DeviceRegistrationStatus = typeof deviceRegistrationStatusEnum.enumValues[number];
export type DeviceAuthMethod = typeof deviceAuthMethodEnum.enumValues[number];

export type DeviceRegistry = typeof deviceRegistry.$inferSelect;
export type InsertDeviceRegistry = typeof deviceRegistry.$inferInsert;

export type DeviceCredentials = typeof deviceCredentials.$inferSelect;
export type InsertDeviceCredentials = typeof deviceCredentials.$inferInsert;

export type ProvisioningTemplate = typeof provisioningTemplates.$inferSelect;
export type InsertProvisioningTemplate = typeof provisioningTemplates.$inferInsert;

export type RegistrationCode = typeof registrationCodes.$inferSelect;
export type InsertRegistrationCode = typeof registrationCodes.$inferInsert;

export type ProvisioningHistory = typeof provisioningHistory.$inferSelect;
export type InsertProvisioningHistory = typeof provisioningHistory.$inferInsert;

// Zod schemas
export const insertDeviceRegistrySchema = createInsertSchema(deviceRegistry, {
  deviceUid: z.string().min(1, "Device UID is required"),
  deviceType: z.enum(deviceTypeEnum.enumValues),
  registrationStatus: z.enum(deviceRegistrationStatusEnum.enumValues).optional(),
  authMethod: z.enum(deviceAuthMethodEnum.enumValues).optional()
});

export const insertProvisioningTemplateSchema = createInsertSchema(provisioningTemplates, {
  name: z.string().min(1, "Template name is required"),
  deviceType: z.enum(deviceTypeEnum.enumValues),
  configTemplate: z.record(z.string(), z.any()),
  authMethod: z.enum(deviceAuthMethodEnum.enumValues).optional()
});

export const insertRegistrationCodeSchema = createInsertSchema(registrationCodes, {
  code: z.string().min(1, "Code is required"),
  deviceType: z.enum(deviceTypeEnum.enumValues).optional(),
  isOneTime: z.boolean().optional(),
  maxUses: z.number().int().min(1).optional()
});