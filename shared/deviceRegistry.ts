/**
 * Device Registry & Provisioning
 * 
 * This module extends the device management system with advanced registry
 * and provisioning capabilities.
 */

import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { devices, deviceTypeEnum } from "./schema";

// Device Registration Status Enum
export const deviceRegistrationStatusEnum = pgEnum('device_registration_status', [
  'pending',
  'registered',
  'provisioning',
  'active',
  'decommissioned',
  'rejected'
]);

// Device Authentication Method Enum
export const deviceAuthMethodEnum = pgEnum('device_auth_method', [
  'none',
  'api_key',
  'certificate',
  'username_password',
  'oauth',
  'token'
]);

// Device Registry Table - Stores all registered devices with unique identifiers
export const deviceRegistry = pgTable('device_registry', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').references(() => devices.id, { onDelete: 'cascade' }),
  registrationId: uuid('registration_id').notNull().defaultRandom(), // Unique ID for device registration
  deviceUid: text('device_uid').notNull().unique(), // Manufacturer assigned unique ID
  registrationStatus: deviceRegistrationStatusEnum('registration_status').default('pending'),
  deviceType: deviceTypeEnum('device_type').notNull(),
  firmwareVersion: text('firmware_version'),
  lastConnected: timestamp('last_connected'),
  lastSeen: timestamp('last_seen'),
  metadata: jsonb('metadata'), // Additional device metadata (model, serial, etc.)
  location: text('location'), // Physical location description
  locationCoordinates: text('location_coordinates'), // GPS coordinates
  zoneId: text('zone_id'), // Zone/Room identifier
  isOnline: boolean('is_online').default(false),
  authMethod: deviceAuthMethodEnum('auth_method').default('none'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Device Credentials Table - Securely stores device authentication credentials
export const deviceCredentials = pgTable('device_credentials', {
  id: serial('id').primaryKey(),
  deviceRegistryId: integer('device_registry_id').notNull().references(() => deviceRegistry.id, { onDelete: 'cascade' }),
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
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Device Provisioning Template Table - Templates for zero-touch provisioning
export const provisioningTemplates = pgTable('provisioning_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  deviceType: deviceTypeEnum('device_type').notNull(),
  configTemplate: jsonb('config_template').notNull(), // Configuration template JSON
  firmwareVersion: text('firmware_version'),
  authMethod: deviceAuthMethodEnum('auth_method').default('api_key'),
  defaultSettings: jsonb('default_settings'), // Default device settings
  requiredCapabilities: jsonb('required_capabilities'), // Required device capabilities
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// QR Code/Registration Codes Table - For manual registration process
export const registrationCodes = pgTable('registration_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // Registration code (alphanumeric)
  qrCodeData: text('qr_code_data'), // Full QR code data content
  registrationUrl: text('registration_url'), // URL for registration
  provisioningTemplateId: integer('provisioning_template_id').references(() => provisioningTemplates.id),
  deviceType: deviceTypeEnum('device_type'),
  expiresAt: timestamp('expires_at'),
  isOneTime: boolean('is_one_time').default(true),
  useCount: integer('use_count').default(0),
  maxUses: integer('max_uses').default(1),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Device Provisioning History - Logs all provisioning activities
export const provisioningHistory = pgTable('provisioning_history', {
  id: serial('id').primaryKey(),
  deviceRegistryId: integer('device_registry_id').references(() => deviceRegistry.id),
  provisioningTemplateId: integer('provisioning_template_id').references(() => provisioningTemplates.id),
  registrationCodeId: integer('registration_code_id').references(() => registrationCodes.id),
  status: text('status').notNull(), // 'started', 'completed', 'failed'
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  provisioningData: jsonb('provisioning_data'), // Actual data used for provisioning
  appliedConfiguration: jsonb('applied_configuration'), // Final configuration applied
  performedBy: text('performed_by'), // User ID or system
  ipAddress: text('ip_address'), // IP address of device at provisioning time
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const deviceRegistryRelations = relations(deviceRegistry, ({ one, many }) => ({
  device: one(devices, {
    fields: [deviceRegistry.deviceId],
    references: [devices.id],
  }),
  credentials: many(deviceCredentials),
  provisioningHistory: many(provisioningHistory),
}));

export const deviceCredentialsRelations = relations(deviceCredentials, ({ one }) => ({
  deviceRegistry: one(deviceRegistry, {
    fields: [deviceCredentials.deviceRegistryId],
    references: [deviceRegistry.id],
  }),
}));

export const provisioningTemplatesRelations = relations(provisioningTemplates, ({ many }) => ({
  registrationCodes: many(registrationCodes),
  provisioningHistory: many(provisioningHistory),
}));

export const registrationCodesRelations = relations(registrationCodes, ({ one, many }) => ({
  provisioningTemplate: one(provisioningTemplates, {
    fields: [registrationCodes.provisioningTemplateId],
    references: [provisioningTemplates.id],
  }),
  provisioningHistory: many(provisioningHistory),
}));

export const provisioningHistoryRelations = relations(provisioningHistory, ({ one }) => ({
  deviceRegistry: one(deviceRegistry, {
    fields: [provisioningHistory.deviceRegistryId],
    references: [deviceRegistry.id],
  }),
  provisioningTemplate: one(provisioningTemplates, {
    fields: [provisioningHistory.provisioningTemplateId],
    references: [provisioningTemplates.id],
  }),
  registrationCode: one(registrationCodes, {
    fields: [provisioningHistory.registrationCodeId],
    references: [registrationCodes.id],
  }),
}));

// Schemas for insert operations
export const insertDeviceRegistrySchema = createInsertSchema(deviceRegistry)
  .omit({ id: true, createdAt: true, updatedAt: true, registrationId: true });

export const insertDeviceCredentialsSchema = createInsertSchema(deviceCredentials)
  .omit({ id: true, createdAt: true, updatedAt: true, lastRotated: true });

export const insertProvisioningTemplateSchema = createInsertSchema(provisioningTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertRegistrationCodeSchema = createInsertSchema(registrationCodes)
  .omit({ id: true, createdAt: true, updatedAt: true, useCount: true });

export const insertProvisioningHistorySchema = createInsertSchema(provisioningHistory)
  .omit({ id: true, createdAt: true });

// Types
export type DeviceRegistry = typeof deviceRegistry.$inferSelect;
export type InsertDeviceRegistry = z.infer<typeof insertDeviceRegistrySchema>;

export type DeviceCredentials = typeof deviceCredentials.$inferSelect;
export type InsertDeviceCredentials = z.infer<typeof insertDeviceCredentialsSchema>;

export type ProvisioningTemplate = typeof provisioningTemplates.$inferSelect;
export type InsertProvisioningTemplate = z.infer<typeof insertProvisioningTemplateSchema>;

export type RegistrationCode = typeof registrationCodes.$inferSelect;
export type InsertRegistrationCode = z.infer<typeof insertRegistrationCodeSchema>;

export type ProvisioningHistory = typeof provisioningHistory.$inferSelect;
export type InsertProvisioningHistory = z.infer<typeof insertProvisioningHistorySchema>;