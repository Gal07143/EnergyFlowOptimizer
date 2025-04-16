import { pgTable, text, serial, integer, boolean, timestamp, numeric, json, pgEnum } from "drizzle-orm/pg-core";
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

// Insert Schemas
export const insertSiteSchema = createInsertSchema(sites).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, createdAt: true, updatedAt: true, status: true });
export const insertDeviceReadingSchema = createInsertSchema(deviceReadings).omit({ id: true });
export const insertEnergyReadingSchema = createInsertSchema(energyReadings).omit({ id: true });
export const insertOptimizationSettingsSchema = createInsertSchema(optimizationSettings).omit({ id: true, updatedAt: true });
export const insertTariffSchema = createInsertSchema(tariffs).omit({ id: true, createdAt: true, updatedAt: true });

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
