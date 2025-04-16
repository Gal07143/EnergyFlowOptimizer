import { pgTable, text, serial, integer, boolean, timestamp, numeric, json, pgEnum, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const deviceTypeEnum = pgEnum('device_type', [
  'solar_pv', 
  'battery_storage', 
  'ev_charger', 
  'smart_meter', 
  'heat_pump'
]);

export const deviceStatusEnum = pgEnum('device_status', [
  'online', 
  'offline', 
  'error', 
  'maintenance', 
  'idle'
]);

export const evChargingModeEnum = pgEnum('ev_charging_mode', [
  'solar_only', 
  'balanced', 
  'fast', 
  'scheduled', 
  'v2g'
]);

export const optimizationModeEnum = pgEnum('optimization_mode', [
  'cost_saving', 
  'self_sufficiency', 
  'peak_shaving', 
  'carbon_reduction', 
  'grid_relief'
]);

export const userRoles = ['admin', 'manager', 'viewer'] as const;
export const UserRoleSchema = z.enum(userRoles);

// Sites
export const sites = pgTable('sites', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  maxCapacity: numeric('max_capacity'),
  gridConnectionPoint: numeric('grid_connection_point'),
  timezone: text('timezone').default('UTC'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sitesRelations = relations(sites, ({ many }) => ({
  devices: many(devices),
  energyReadings: many(energyReadings),
}));

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text('email').unique(),
  role: text('role').default('viewer'),
  siteId: integer('site_id').references(() => sites.id),
  createdAt: timestamp('created_at').defaultNow(),
  isEmailVerified: boolean('is_email_verified').default(false),
  verificationCode: text('verification_code'),
  verificationCodeExpiry: timestamp('verification_code_expiry'),
});

export const usersRelations = relations(users, ({ one }) => ({
  site: one(sites, {
    fields: [users.siteId],
    references: [sites.id],
  }),
}));

// Devices
export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: deviceTypeEnum('type').notNull(),
  model: text('model'),
  manufacturer: text('manufacturer'),
  serialNumber: text('serial_number'),
  firmwareVersion: text('firmware_version'),
  capacity: numeric('capacity'),
  status: deviceStatusEnum('status').default('offline'),
  ipAddress: text('ip_address'),
  connectionProtocol: text('connection_protocol'),
  settings: json('settings'),
  siteId: integer('site_id').notNull().references(() => sites.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const devicesRelations = relations(devices, ({ one, many }) => ({
  site: one(sites, {
    fields: [devices.siteId],
    references: [sites.id],
  }),
  readings: many(deviceReadings),
}));

// Device Readings
export const deviceReadings = pgTable('device_readings', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id),
  timestamp: timestamp('timestamp').defaultNow(),
  power: numeric('power'),
  energy: numeric('energy'),
  stateOfCharge: numeric('state_of_charge'),
  voltage: numeric('voltage'),
  current: numeric('current'),
  frequency: numeric('frequency'),
  temperature: numeric('temperature'),
  additionalData: json('additional_data'),
});

export const deviceReadingsRelations = relations(deviceReadings, ({ one }) => ({
  device: one(devices, {
    fields: [deviceReadings.deviceId],
    references: [devices.id],
  }),
}));

// Energy Readings
export const energyReadings = pgTable('energy_readings', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => sites.id),
  timestamp: timestamp('timestamp').defaultNow(),
  gridPower: numeric('grid_power'),
  solarPower: numeric('solar_power'),
  batteryPower: numeric('battery_power'),
  evPower: numeric('ev_power'),
  homePower: numeric('home_power'),
  gridEnergy: numeric('grid_energy'),
  solarEnergy: numeric('solar_energy'),
  batteryEnergy: numeric('battery_energy'),
  evEnergy: numeric('ev_energy'),
  homeEnergy: numeric('home_energy'),
  selfSufficiency: numeric('self_sufficiency'),
  carbon: numeric('carbon'),
});

export const energyReadingsRelations = relations(energyReadings, ({ one }) => ({
  site: one(sites, {
    fields: [energyReadings.siteId],
    references: [sites.id],
  }),
}));

// Optimization Settings
export const optimizationSettings = pgTable('optimization_settings', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => sites.id),
  mode: optimizationModeEnum('mode').default('self_sufficiency'),
  peakShavingEnabled: boolean('peak_shaving_enabled').default(false),
  peakShavingTarget: numeric('peak_shaving_target'),
  selfConsumptionEnabled: boolean('self_consumption_enabled').default(true),
  batteryArbitrageEnabled: boolean('battery_arbitrage_enabled').default(false),
  v2gEnabled: boolean('v2g_enabled').default(false),
  vppEnabled: boolean('vpp_enabled').default(false),
  p2pEnabled: boolean('p2p_enabled').default(false),
  aiRecommendationsEnabled: boolean('ai_recommendations_enabled').default(true),
  schedules: json('schedules'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const optimizationSettingsRelations = relations(optimizationSettings, ({ one }) => ({
  site: one(sites, {
    fields: [optimizationSettings.siteId],
    references: [sites.id],
  }),
}));

// Tariffs
export const tariffs = pgTable('tariffs', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => sites.id),
  name: text('name').notNull(),
  provider: text('provider'),
  importRate: numeric('import_rate'),
  exportRate: numeric('export_rate'),
  isTimeOfUse: boolean('is_time_of_use').default(false),
  scheduleData: json('schedule_data'),
  currency: text('currency').default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tariffsRelations = relations(tariffs, ({ one }) => ({
  site: one(sites, {
    fields: [tariffs.siteId],
    references: [sites.id],
  }),
}));

// Alert and Notification System
export const alertSeverityEnum = pgEnum('alert_severity', [
  'info', 
  'warning', 
  'error', 
  'critical'
]);

export const alertStatusEnum = pgEnum('alert_status', [
  'new', 
  'acknowledged', 
  'resolved', 
  'dismissed'
]);

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id),
  deviceId: integer('device_id').references(() => devices.id),
  userId: integer('user_id').references(() => users.id),
  timestamp: timestamp('timestamp').defaultNow(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: alertSeverityEnum('severity').default('info'),
  status: alertStatusEnum('status').default('new'),
  data: json('data'),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: integer('resolved_by').references(() => users.id),
});

export const alertsRelations = relations(alerts, ({ one }) => ({
  site: one(sites, {
    fields: [alerts.siteId],
    references: [sites.id],
  }),
  device: one(devices, {
    fields: [alerts.deviceId],
    references: [devices.id],
  }),
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
  resolvedByUser: one(users, {
    fields: [alerts.resolvedBy],
    references: [users.id],
  }),
}));

// Notifications table
export const notificationTypeEnum = pgEnum('notification_type', [
  'alert', 
  'system', 
  'update', 
  'billing', 
  'optimization'
]);

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').default('system'),
  isRead: boolean('is_read').default(false),
  data: json('data'),
  linkedEntityId: integer('linked_entity_id'),
  linkedEntityType: text('linked_entity_type'),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Energy Forecasts table
export const forecastTypeEnum = pgEnum('forecast_type', [
  'generation', 
  'consumption', 
  'price'
]);

export const energyForecasts = pgTable('energy_forecasts', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  forecastDate: timestamp('forecast_date').notNull(),
  forecastType: forecastTypeEnum('forecast_type').notNull(),
  value: numeric('value').notNull(),
  confidence: numeric('confidence'),
  algorithm: text('algorithm'),
  metadata: json('metadata'),
});

export const energyForecastsRelations = relations(energyForecasts, ({ one }) => ({
  site: one(sites, {
    fields: [energyForecasts.siteId],
    references: [sites.id],
  }),
}));

// Event logging table
export const eventLogTypeEnum = pgEnum('event_log_type', [
  'system', 
  'user', 
  'device', 
  'security', 
  'optimization'
]);

export const eventLogs = pgTable('event_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow(),
  eventType: eventLogTypeEnum('event_type').notNull(),
  message: text('message').notNull(),
  userId: integer('user_id').references(() => users.id),
  deviceId: integer('device_id').references(() => devices.id),
  siteId: integer('site_id').references(() => sites.id),
  metadata: json('metadata'),
  severity: text('severity').default('info'),
  sourceIp: text('source_ip'),
});

export const eventLogsRelations = relations(eventLogs, ({ one }) => ({
  user: one(users, {
    fields: [eventLogs.userId],
    references: [users.id],
  }),
  device: one(devices, {
    fields: [eventLogs.deviceId],
    references: [devices.id],
  }),
  site: one(sites, {
    fields: [eventLogs.siteId],
    references: [sites.id],
  }),
}));

// Grid Connection Details
export const gridConnectionType = pgEnum('grid_connection_type', [
  'single_phase', 
  'three_phase', 
  'split_phase'
]);

export const gridConnections = pgTable('grid_connections', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id).notNull(),
  connectionType: gridConnectionType('connection_type').default('single_phase'),
  capacity: numeric('capacity'),
  voltage: numeric('voltage'),
  phases: integer('phases').default(1),
  meterNumber: text('meter_number'),
  utilityCompany: text('utility_company'),
  tariffId: integer('tariff_id').references(() => tariffs.id),
  gridExportEnabled: boolean('grid_export_enabled').default(true),
  gridImportEnabled: boolean('grid_import_enabled').default(true),
  settings: json('settings'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const gridConnectionsRelations = relations(gridConnections, ({ one }) => ({
  site: one(sites, {
    fields: [gridConnections.siteId],
    references: [sites.id],
  }),
  tariff: one(tariffs, {
    fields: [gridConnections.tariffId],
    references: [tariffs.id],
  }),
}));

// Remote Control Commands
export const commandStatusEnum = pgEnum('command_status', [
  'pending', 
  'sent', 
  'delivered', 
  'executed', 
  'failed', 
  'expired'
]);

export const remoteCommands = pgTable('remote_commands', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').references(() => devices.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  timestamp: timestamp('timestamp').defaultNow(),
  command: text('command').notNull(),
  parameters: json('parameters'),
  status: commandStatusEnum('status').default('pending'),
  statusMessage: text('status_message'),
  executedAt: timestamp('executed_at'),
  expiresAt: timestamp('expires_at'),
  priority: integer('priority').default(5),
});

export const remoteCommandsRelations = relations(remoteCommands, ({ one }) => ({
  device: one(devices, {
    fields: [remoteCommands.deviceId],
    references: [devices.id],
  }),
  user: one(users, {
    fields: [remoteCommands.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertSiteSchema = createInsertSchema(sites, {
  maxCapacity: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  gridConnectionPoint: z.string().or(z.number()).transform(val => val === null ? null : Number(val))
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  isEmailVerified: true, 
  verificationCode: true, 
  verificationCodeExpiry: true 
});

export const insertDeviceSchema = createInsertSchema(devices, {
  capacity: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined)
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDeviceReadingSchema = createInsertSchema(deviceReadings, {
  power: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  energy: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  stateOfCharge: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  voltage: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  current: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  frequency: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  temperature: z.string().or(z.number()).transform(val => val === null ? null : Number(val))
}).omit({ id: true });

export const insertEnergyReadingSchema = createInsertSchema(energyReadings, {
  gridPower: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  solarPower: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  batteryPower: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  evPower: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  homePower: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  gridEnergy: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  solarEnergy: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  batteryEnergy: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  evEnergy: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  homeEnergy: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  selfSufficiency: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  carbon: z.string().or(z.number()).transform(val => val === null ? null : Number(val))
}).omit({ id: true });

export const insertOptimizationSettingsSchema = createInsertSchema(optimizationSettings, {
  peakShavingTarget: z.string().or(z.number()).transform(val => val === null ? null : Number(val))
}).omit({ id: true, updatedAt: true });

export const insertTariffSchema = createInsertSchema(tariffs, {
  importRate: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  exportRate: z.string().or(z.number()).transform(val => val === null ? null : Number(val))
}).omit({ id: true, createdAt: true, updatedAt: true });

// New insert schemas
export const insertAlertSchema = createInsertSchema(alerts).omit({ 
  id: true, 
  timestamp: true,
  resolvedAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  timestamp: true
});

export const insertEnergyForecastSchema = createInsertSchema(energyForecasts, {
  value: z.string().or(z.number()).transform(val => Number(val)),
  confidence: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined)
}).omit({ 
  id: true, 
  timestamp: true
});

export const insertEventLogSchema = createInsertSchema(eventLogs).omit({ 
  id: true, 
  timestamp: true 
});

export const insertGridConnectionSchema = createInsertSchema(gridConnections, {
  capacity: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  voltage: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined)
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertRemoteCommandSchema = createInsertSchema(remoteCommands).omit({ 
  id: true, 
  timestamp: true,
  executedAt: true
});

// Export Types
export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type DeviceReading = typeof deviceReadings.$inferSelect;
export type InsertDeviceReading = z.infer<typeof insertDeviceReadingSchema>;

export type EnergyReading = typeof energyReadings.$inferSelect;
export type InsertEnergyReading = z.infer<typeof insertEnergyReadingSchema>;

export type OptimizationSetting = typeof optimizationSettings.$inferSelect;
export type InsertOptimizationSetting = z.infer<typeof insertOptimizationSettingsSchema>;

export type Tariff = typeof tariffs.$inferSelect;
export type InsertTariff = z.infer<typeof insertTariffSchema>;

// New table types
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type EnergyForecast = typeof energyForecasts.$inferSelect;
export type InsertEnergyForecast = z.infer<typeof insertEnergyForecastSchema>;

export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;

export type GridConnection = typeof gridConnections.$inferSelect;
export type InsertGridConnection = z.infer<typeof insertGridConnectionSchema>;

export type RemoteCommand = typeof remoteCommands.$inferSelect;
export type InsertRemoteCommand = z.infer<typeof insertRemoteCommandSchema>;
