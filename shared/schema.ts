import { pgTable, text, serial, integer, boolean, timestamp, numeric, json, pgEnum, uuid, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const deviceTypeEnum = pgEnum('device_type', [
  'solar_pv', 
  'battery_storage', 
  'ev_charger', 
  'smart_meter', 
  'heat_pump',
  'inverter',
  'load_controller',
  'energy_gateway',
  'edge_node',  // Added for edge computing nodes
  'bidirectional_ev_charger' // Added for V2G/V2H functionality
]);

export const gatewayProtocolEnum = pgEnum('gateway_protocol', [
  'mqtt',
  'http',
  'modbus_tcp',
  'modbus_rtu',
  'bacnet',
  'canbus',
  'zigbee',
  'zwave',
  '5g',        // Added for 5G connectivity
  'lte',
  'nb_iot'     // Narrowband IoT
]);

// Edge Computing Enums
export const edgeNodeTypeEnum = pgEnum('edge_node_type', [
  'primary',
  'secondary',
  'failover',
  'specialized'
]);

export const edgeNodeStatusEnum = pgEnum('edge_node_status', [
  'active',
  'standby',
  'offline',
  'maintenance',
  'provisioning'
]);

export const edgeComputeCapabilityEnum = pgEnum('edge_compute_capability', [
  'basic_telemetry',
  'local_control',
  'ml_inference',
  'full_autonomous',
  'data_preprocessing'
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
  'v2g',
  'v2h',
  'v2g_scheduled',
  'v2h_scheduled',
  'bidirectional_optimized'
]);

export const optimizationModeEnum = pgEnum('optimization_mode', [
  'cost_saving', 
  'self_sufficiency', 
  'peak_shaving', 
  'carbon_reduction', 
  'grid_relief',
  'battery_life',
  'v2g_revenue'
]);

// V2G/V2H specific enums
export const v2gServiceTypeEnum = pgEnum('v2g_service_type', [
  'frequency_regulation',
  'demand_response',
  'peak_shaving',
  'backup_power',
  'energy_arbitrage',
  'reactive_power',
  'load_balancing',
  'home_backup'
]);

// Maintenance Enums
export const maintenanceSeverityEnum = pgEnum('maintenance_severity', [
  'low',
  'medium',
  'high',
  'critical'
]);

export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
]);

export const maintenanceTypeEnum = pgEnum('maintenance_type', [
  'preventive',
  'corrective',
  'predictive',
  'condition_based',
  'inspection'
]);

// Security Enums
export const userRoles = ['admin', 'partner_admin', 'manager', 'viewer'] as const;
export const UserRoleSchema = z.enum(userRoles);

export const apiKeyAccessLevelEnum = pgEnum('api_key_access_level', [
  'read_only',
  'device_control',
  'full_access',
  'admin'
]);

export const certificateTypeEnum = pgEnum('certificate_type', [
  'client_auth',
  'server_auth',
  'mutual_tls',
  'signing',
  'encryption'
]);

export const certificateStatusEnum = pgEnum('certificate_status', [
  'active',
  'expired',
  'revoked',
  'pending'
]);

// Weather condition type enum
export const weatherConditionEnum = pgEnum('weather_condition', [
  'clear',
  'clouds',
  'rain',
  'snow',
  'thunderstorm',
  'drizzle',
  'mist',
  'fog',
  'haze',
  'dust',
  'smoke',
  'tornado'
]);

// Partner Organizations
export const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  logo: text('logo'),
  status: text('status').default('active'), // active, inactive, suspended
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sites
export const sites = pgTable('sites', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  maxCapacity: numeric('max_capacity'),
  gridConnectionPoint: numeric('grid_connection_point'),
  timezone: text('timezone').default('UTC'),
  partnerId: integer('partner_id').references(() => partners.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text('email').unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role').default('viewer'),
  siteId: integer('site_id').references(() => sites.id),
  partnerId: integer('partner_id').references(() => partners.id),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  isEmailVerified: boolean('is_email_verified').default(false),
  verificationCode: text('verification_code'),
  verificationCodeExpiry: timestamp('verification_code_expiry'),
  // Security enhancements
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: text('last_login_ip'),
  accountLocked: boolean('account_locked').default(false),
  lockReason: text('lock_reason'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  passwordLastChanged: timestamp('password_last_changed'),
  requirePasswordChange: boolean('require_password_change').default(false),
});

// Security Tables
// API Keys
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  secret: text('secret'), // Hashed secret for API key authentication
  userId: integer('user_id').references(() => users.id),
  accessLevel: apiKeyAccessLevelEnum('access_level').default('read_only'),
  allowedIps: text('allowed_ips'),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  scopesJson: json('scopes_json'), // JSON array of allowed scopes
  rotationEnabled: boolean('rotation_enabled').default(false),
  rotationIntervalDays: integer('rotation_interval_days'),
  lastRotatedAt: timestamp('last_rotated_at'),
  previousKeys: json('previous_keys'), // Store previous key hashes for transition periods
  metadata: json('metadata'),
});

// Client Certificates
export const clientCertificates = pgTable('client_certificates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: certificateTypeEnum('type').default('client_auth'),
  userId: integer('user_id').references(() => users.id),
  deviceId: integer('device_id').references(() => devices.id),
  certificateData: text('certificate_data'), // PEM format
  fingerprint: text('fingerprint').notNull().unique(),
  serialNumber: text('serial_number').notNull(),
  issuer: text('issuer').notNull(),
  subject: text('subject').notNull(),
  validFrom: timestamp('valid_from').notNull(),
  validTo: timestamp('valid_to').notNull(),
  status: certificateStatusEnum('status').default('active'),
  revocationReason: text('revocation_reason'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  metadata: json('metadata'),
});

// Access Control - Permissions
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  category: text('category').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Role-Permission mapping
export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  role: text('role').notNull(),
  permissionId: integer('permission_id').notNull().references(() => permissions.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// User-specific permissions (overrides)
export const userPermissions = pgTable('user_permissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  permissionId: integer('permission_id').notNull().references(() => permissions.id),
  granted: boolean('granted').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  grantedBy: integer('granted_by').references(() => users.id),
});

// Device Command Authorization
export const commandAuthorizations = pgTable('command_authorizations', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id),
  commandType: text('command_type').notNull(),
  requiresMfa: boolean('requires_mfa').default(false),
  requiredRole: text('required_role').default('manager'),
  approvalRequired: boolean('approval_required').default(false),
  approvalRoles: text('approval_roles'),
  cooldownSeconds: integer('cooldown_seconds').default(0), // Time between allowed command executions
  riskLevel: text('risk_level').default('medium'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Command Execution History
export const commandExecutions = pgTable('command_executions', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id),
  userId: integer('user_id').references(() => users.id),
  commandType: text('command_type').notNull(),
  parameters: json('parameters'),
  timestamp: timestamp('timestamp').defaultNow(),
  status: text('status').default('requested'),
  completedAt: timestamp('completed_at'),
  result: json('result'),
  failureReason: text('failure_reason'),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  authenticationType: text('authentication_type'),
  usedMfa: boolean('used_mfa').default(false),
  sessionId: text('session_id'),
  sourceIp: text('source_ip'),
});

// Rate Limiting
export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  limitKey: text('limit_key').notNull(), // e.g., 'login', 'api', 'device_command'
  maxRequests: integer('max_requests').notNull(),
  timeWindowSeconds: integer('time_window_seconds').notNull(),
  blockDurationSeconds: integer('block_duration_seconds'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Rate Limit Tracking 
export const rateLimitEvents = pgTable('rate_limit_events', {
  id: serial('id').primaryKey(),
  limitId: integer('limit_id').references(() => rateLimits.id),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  userId: integer('user_id').references(() => users.id),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow(),
  requestCount: integer('request_count').default(1),
  isBlocked: boolean('is_blocked').default(false),
  blockedUntil: timestamp('blocked_until'),
});

// Device Security Features
export const deviceSecuritySettings = pgTable('device_security_settings', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id),
  // TLS/encryption settings
  tlsEnabled: boolean('tls_enabled').default(false),
  tlsVersion: text('tls_version').default('1.3'),
  certificateId: integer('certificate_id').references(() => clientCertificates.id),
  // Authentication settings
  authMethod: text('auth_method').default('token'), // token, certificate, oauth
  requiresMutualTls: boolean('requires_mutual_tls').default(false),
  // Verification settings
  secureBootEnabled: boolean('secure_boot_enabled').default(false),
  firmwareVerification: boolean('firmware_verification').default(false),
  firmwareSigningKey: text('firmware_signing_key'),
  // Communication security
  allowedIps: text('allowed_ips'),
  messageEncryption: boolean('message_encryption').default(false),
  encryptionAlgorithm: text('encryption_algorithm'),
  // Additional security features
  anomalyDetectionEnabled: boolean('anomaly_detection_enabled').default(false),
  branchProtectionEnabled: boolean('branch_protection_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Security Audit Log
export const securityAuditLog = pgTable('security_audit_log', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow(),
  userId: integer('user_id').references(() => users.id),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  details: json('details'),
  status: text('status').default('success'),
  failureReason: text('failure_reason'),
  // For tracking security-specific information
  sessionId: text('session_id'),
  authenticationType: text('authentication_type'),
  riskScore: numeric('risk_score'),
  isSuspicious: boolean('is_suspicious').default(false),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  storageTier: text('storage_tier').default('hot'),
  retentionPeriodDays: integer('retention_period_days').default(730), // 2 years retention by default
});

// Gateway Devices
export const gatewayDevices = pgTable('gateway_devices', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  protocol: gatewayProtocolEnum('protocol').notNull(),
  ipAddress: text('ip_address'),
  port: integer('port'),
  username: text('username'),
  password: text('password'),
  apiKey: text('api_key'),
  mqttTopic: text('mqtt_topic'),
  mqttBroker: text('mqtt_broker'),
  mqttUsername: text('mqtt_username'),
  mqttPassword: text('mqtt_password'),
  mqttClientId: text('mqtt_client_id'),
  lastConnectedAt: timestamp('last_connected_at'),
  connectionStatus: text('connection_status').default('disconnected'),
  connectionError: text('connection_error'),
  heartbeatInterval: integer('heartbeat_interval').default(60), // seconds
  autoReconnect: boolean('auto_reconnect').default(true),
  maxReconnectAttempts: integer('max_reconnect_attempts').default(5),
  securityEnabled: boolean('security_enabled').default(true),
  tlsEnabled: boolean('tls_enabled').default(true),
  certificatePath: text('certificate_path'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  additionalConfig: json('additional_config'),
});

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
  gatewayId: integer('gateway_id').references(() => sites.id), // Changed temporarily to break circular reference
  devicePath: text('device_path'), // Path/address on the gateway (e.g. Modbus address, MQTT topic suffix)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Device Readings - Enhanced Time-Series Data
export const samplingRateEnum = pgEnum('sampling_rate', [
  'real_time',    // Sub-second sampling (typically for critical readings)
  'high',         // 1-5 second sampling (for active operations)
  'medium',       // 15-60 second sampling (for regular monitoring)
  'low',          // 5-15 minute sampling (for trend analysis)
  'very_low'      // 1 hour+ sampling (for historical records)
]);

export const dataQualityEnum = pgEnum('data_quality', [
  'raw',           // Direct from device without validation
  'validated',     // Passed basic validation checks
  'corrected',     // Corrected for known issues
  'estimated',     // Estimated to fill gaps
  'aggregated'     // Derived from multiple readings
]);

export const deviceReadings = pgTable('device_readings', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id),
  timestamp: timestamp('timestamp').defaultNow(),
  
  // Core electrical measurements
  power: numeric('power'),
  energy: numeric('energy'),
  stateOfCharge: numeric('state_of_charge'),
  voltage: numeric('voltage'),
  current: numeric('current'),
  frequency: numeric('frequency'),
  
  // Environmental readings
  temperature: numeric('temperature'),
  humidity: numeric('humidity'),
  pressure: numeric('pressure'),
  
  // Status information
  operationalMode: text('operational_mode'),
  statusCode: integer('status_code'),
  
  // Sampling metadata
  samplingRate: samplingRateEnum('sampling_rate').default('medium'),
  dataQuality: dataQualityEnum('data_quality').default('validated'),
  
  // Storage tier marker (helps for data lifecycle management)
  storageTier: text('storage_tier').default('hot'),
  retentionCategory: text('retention_category').default('standard'),
  
  // Processing & aggregation info
  isAggregated: boolean('is_aggregated').default(false),
  aggregationPeriod: text('aggregation_period'),
  aggregationMethod: text('aggregation_method'),
  sourceReadings: json('source_readings'),
  
  // Extended data
  additionalData: json('additional_data'),
  processingMetadata: json('processing_metadata'),
});

// Energy Readings - Enhanced Time-Series Data
export const energyReadings = pgTable('energy_readings', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => sites.id),
  timestamp: timestamp('timestamp').defaultNow(),
  
  // Power flows (kW)
  gridPower: numeric('grid_power'),
  solarPower: numeric('solar_power'),
  batteryPower: numeric('battery_power'),
  evPower: numeric('ev_power'),
  homePower: numeric('home_power'),
  
  // Cumulative energy (kWh)
  gridEnergy: numeric('grid_energy'),
  solarEnergy: numeric('solar_energy'),
  batteryEnergy: numeric('battery_energy'),
  evEnergy: numeric('ev_energy'),
  homeEnergy: numeric('home_energy'),
  
  // Performance metrics
  selfSufficiency: numeric('self_sufficiency'), // Percentage (0-100)
  carbon: numeric('carbon'), // CO2 emissions (kg)
  efficiency: numeric('efficiency'), // System efficiency percentage
  peakPower: numeric('peak_power'), // Peak power for the interval
  
  // Financial metrics
  costSaving: numeric('cost_saving'), // Cost saving during this interval
  gridCost: numeric('grid_cost'), // Cost of energy from grid during this interval
  
  // Sampling metadata (matching deviceReadings)
  samplingRate: samplingRateEnum('sampling_rate').default('medium'),
  dataQuality: dataQualityEnum('data_quality').default('validated'),
  
  // Storage tier marker
  storageTier: text('storage_tier').default('hot'),
  retentionCategory: text('retention_category').default('standard'),
  
  // Processing & aggregation info
  isAggregated: boolean('is_aggregated').default(false),
  aggregationPeriod: text('aggregation_period'),
  aggregationMethod: text('aggregation_method'),
  sourceReadings: json('source_readings'),
  
  // Weather conditions during this period
  weatherData: json('weather_data'),
  
  // Extended data
  additionalData: json('additional_data'),
});

// Optimization Settings
export const optimizationSettings = pgTable('optimization_settings', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => sites.id),
  mode: optimizationModeEnum('mode').default('self_sufficiency'),
  priority: integer('priority').default(5), // Priority scale from 1-10
  peakShavingEnabled: boolean('peak_shaving_enabled').default(false),
  peakShavingTarget: numeric('peak_shaving_target'),
  selfConsumptionEnabled: boolean('self_consumption_enabled').default(true),
  batteryArbitrageEnabled: boolean('battery_arbitrage_enabled').default(false),
  v2gEnabled: boolean('v2g_enabled').default(false),
  vppEnabled: boolean('vpp_enabled').default(false),
  p2pEnabled: boolean('p2p_enabled').default(false),
  demandResponseEnabled: boolean('demand_response_enabled').default(false),
  aiRecommendationsEnabled: boolean('ai_recommendations_enabled').default(true),
  aiOptimizationEnabled: boolean('ai_optimization_enabled').default(false),
  aiModel: text('ai_model').default('gpt-4o'),
  reinforcementLearningEnabled: boolean('reinforcement_learning_enabled').default(false),
  constraints: json('constraints'), // Battery min SoC, grid import/export limits, etc.
  schedules: json('schedules'),
  lastOptimizationTime: timestamp('last_optimization_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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
  dataIntervalSeconds: integer('data_interval_seconds').default(60), // Set to 60 seconds as requested
  currency: text('currency').default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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

// Event logging table
export const eventLogTypeEnum = pgEnum('event_log_type', [
  'system',           // System startup, shutdown, configuration changes
  'user',             // User login, logout, settings changes
  'device',           // Device connection, disconnection, mode changes
  'security',         // Failed login attempts, permission changes
  'optimization',     // Optimization strategy changes, execution
  'demand_response',  // DR event notifications, participation changes
  'ai_optimization',  // AI-based decisions and recommendations
  'alarm',            // Critical system alarms
  'warning',          // Non-critical warnings
  'state_transition', // Device state changes
  'command',          // Remote commands sent to devices
  'data_quality',     // Data validation issues
  'communication'     // Communication protocol events
]);

export const eventCategoryEnum = pgEnum('event_category', [
  'informational',    // Normal operation events
  'operational',      // Operational changes 
  'maintenance',      // Maintenance-related events
  'security',         // Security-related events
  'performance',      // Performance monitoring events
  'error',            // Error conditions
  'audit'             // For compliance and tracking
]);

// AI Optimization Results table
export const aiOptimizationResults = pgTable('ai_optimization_results', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  mode: optimizationModeEnum('mode').notNull(),
  batteryChargePower: numeric('battery_charge_power'),
  batteryDischargePower: numeric('battery_discharge_power'),
  evChargePower: numeric('ev_charge_power'),
  heatPumpPower: numeric('heat_pump_power'),
  projectedSavings: numeric('projected_savings'),
  confidence: numeric('confidence'),
  reasoning: text('reasoning'),
  reinforcementScore: numeric('reinforcement_score'),
  isApplied: boolean('is_applied').default(false),
  appliedAt: timestamp('applied_at'),
  modelUsed: text('model_used'),
  executionTimeMs: integer('execution_time_ms'),
  parameters: json('parameters'),
  feedbackRating: integer('feedback_rating'),
  feedbackNotes: text('feedback_notes')
});

// Demand Response Enums
export const demandResponseProgramTypeEnum = pgEnum('demand_response_program_type', [
  'critical_peak_pricing',
  'peak_time_rebate',
  'direct_load_control',
  'capacity_bidding',
  'emergency_response',
  'economic_dispatch'
]);

export const demandResponseEventStatusEnum = pgEnum('demand_response_event_status', [
  'scheduled',
  'pending',
  'active',
  'completed',
  'cancelled'
]);

export const demandResponseParticipationEnum = pgEnum('demand_response_participation', [
  'opt_in',
  'opt_out',
  'automatic'
]);

// Enhanced Event Logging for comprehensive tracking of all events
export const eventLogs = pgTable('event_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow(),
  eventType: eventLogTypeEnum('event_type').notNull(),
  eventCategory: eventCategoryEnum('event_category').default('informational'),
  message: text('message').notNull(),
  
  // Related entity references
  userId: integer('user_id').references(() => users.id),
  deviceId: integer('device_id').references(() => devices.id),
  siteId: integer('site_id').references(() => sites.id),
  
  // Event details
  metadata: json('metadata'),
  severity: text('severity').default('info'),
  sourceIp: text('source_ip'),
  
  // Action tracking
  relatedAction: text('related_action'),
  actionId: integer('action_id'),
  actionResult: text('action_result'),
  
  // For correlation
  correlationId: text('correlation_id'),
  parentEventId: integer('parent_event_id'),
  
  // Storage tier info
  storageTier: text('storage_tier').default('hot'),
  retentionPeriodDays: integer('retention_period_days').default(365),
  
  // For searchability and filtering
  tags: json('tags'),
  isAcknowledged: boolean('is_acknowledged').default(false),
  acknowledgedBy: integer('acknowledged_by').references(() => users.id),
  acknowledgedAt: timestamp('acknowledged_at'),
});

// Device Catalog Enums
export const communicationProtocolEnum = pgEnum('communication_protocol', [
  'modbus_tcp',
  'modbus_rtu',
  'mqtt',
  'http',
  'ocpp',
  'sunspec',
  'eebus',
  'rest',
  'proprietary'
]);

export const documentTypeEnum = pgEnum('document_type', [
  'manual',
  'datasheet',
  'installation_guide',
  'quick_start_guide',
  'certificate',
  'warranty'
]);

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

// Demand Response Program Tables
export const demandResponsePrograms = pgTable('demand_response_programs', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  description: text('description'),
  programType: demandResponseProgramTypeEnum('program_type').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  notificationLeadTime: integer('notification_lead_time'), // minutes
  minReductionAmount: numeric('min_reduction_amount'), // kW
  maxReductionAmount: numeric('max_reduction_amount'), // kW
  incentiveRate: numeric('incentive_rate'), // $ per kW or kWh
  incentiveType: text('incentive_type'), // 'fixed', 'variable', 'tiered'
  incentiveDetails: json('incentive_details'),
  terms: text('terms'),
  isActive: boolean('is_active').default(true),
  maxEventDuration: integer('max_event_duration'), // minutes
  maxEventsPerYear: integer('max_events_per_year'),
  maxEventsPerMonth: integer('max_events_per_month'),
  defaultParticipation: demandResponseParticipationEnum('default_participation').default('opt_in'),
  eligibilityRequirements: json('eligibility_requirements'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const demandResponseEvents = pgTable('demand_response_events', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id),
  programId: integer('program_id').references(() => demandResponsePrograms.id),
  name: text('name').notNull(),
  description: text('description'),
  status: demandResponseEventStatusEnum('status').default('scheduled'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  notificationTime: timestamp('notification_time'),
  targetReduction: numeric('target_reduction'), // kW
  actualReduction: numeric('actual_reduction'), // kW
  incentiveModifier: numeric('incentive_modifier').default('1'), // multiplier for the incentive
  notes: text('notes'),
  isEmergency: boolean('is_emergency').default(false),
  weatherConditions: json('weather_conditions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const siteDemandResponseSettings = pgTable('site_demand_response_settings', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id).notNull(),
  isEnrolled: boolean('is_enrolled').default(false),
  maxReductionCapacity: numeric('max_reduction_capacity'), // kW
  defaultParticipation: demandResponseParticipationEnum('default_participation').default('opt_in'),
  autoResponseEnabled: boolean('auto_response_enabled').default(true),
  notificationEmail: text('notification_email'),
  notificationSms: text('notification_sms'),
  notificationPush: boolean('notification_push').default(true),
  minimumIncentiveThreshold: numeric('minimum_incentive_threshold'), // $ amount below which not to participate
  devicePriorities: json('device_priorities'), // JSON describing which devices to adjust first
  responseStrategy: json('response_strategy'), // JSON describing the strategy for responding to events
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const siteEventParticipations = pgTable('site_event_participations', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id).notNull(),
  eventId: integer('event_id').references(() => demandResponseEvents.id).notNull(),
  participationStatus: demandResponseParticipationEnum('participation_status').default('opt_in'),
  baselineConsumption: numeric('baseline_consumption'), // kW
  actualConsumption: numeric('actual_consumption'), // kW
  reductionAchieved: numeric('reduction_achieved'), // kW
  incentiveEarned: numeric('incentive_earned'), // $
  incentiveStatus: text('incentive_status').default('pending'), // 'pending', 'approved', 'paid'
  notes: text('notes'),
  feedback: text('feedback'), // User feedback about the event
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const demandResponseActions = pgTable('demand_response_actions', {
  id: serial('id').primaryKey(),
  participationId: integer('participation_id').references(() => siteEventParticipations.id).notNull(),
  deviceId: integer('device_id').references(() => devices.id).notNull(),
  actionType: text('action_type').notNull(), // 'reduce_load', 'shift_load', 'turn_off', etc.
  setPoint: numeric('set_point'), // Target setting (thermostat temp, power limit, etc.)
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  estimatedReduction: numeric('estimated_reduction'), // kW
  actualReduction: numeric('actual_reduction'), // kW
  status: text('status').default('scheduled'), // 'scheduled', 'in_progress', 'completed', 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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

// Weather data schemas

// *** MULTI-TIERED STORAGE SYSTEM ***

// Storage Tier Management
export const storageTierEnum = pgEnum('storage_tier', [
  'hot',       // For frequently accessed real-time data (Redis, in-memory)
  'warm',      // For medium-term data (PostgreSQL)
  'cold',      // For historical data (Object storage)
  'archive'    // For compliance and audit data (Long-term archive)
]);

export const dataLifecycleEnum = pgEnum('data_lifecycle', [
  'active',    // Currently being used
  'aging',     // Starting to age out 
  'dormant',   // Rarely accessed
  'expired'    // Ready for deletion
]);

export const storagePolicyRules = pgTable('storage_policy_rules', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  
  // What data this rule applies to
  dataType: text('data_type').notNull(), // 'device_readings', 'energy_readings', 'event_logs', etc.
  entityType: text('entity_type'), // 'site', 'device', 'user', etc. (optional filter)
  entityId: integer('entity_id'), // Specific entity ID (optional filter)
  
  // Time-based rules
  retentionPeriodDays: integer('retention_period_days').notNull(), // How long to keep data
  promotionThresholdDays: integer('promotion_threshold_days'), // When to move to next tier
  
  // Tier settings
  sourceTier: storageTierEnum('source_tier').notNull(), 
  destinationTier: storageTierEnum('destination_tier').notNull(),
  
  // Action to take
  action: text('action').notNull(), // 'move', 'copy', 'compress', 'delete'
  compressionType: text('compression_type'), // If action is 'compress'
  
  // Sampling/aggregation for data reduction
  aggregationEnabled: boolean('aggregation_enabled').default(false),
  aggregationPeriod: text('aggregation_period'), // e.g., '1h', '1d', '1m'
  aggregationFunction: text('aggregation_function'), // e.g., 'avg', 'min', 'max', 'sum'
  
  isEnabled: boolean('is_enabled').default(true),
  priority: integer('priority').default(10),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastExecutedAt: timestamp('last_executed_at'),
  executionFrequencyHours: integer('execution_frequency_hours').default(24),
});

export const dataTransferJobs = pgTable('data_transfer_jobs', {
  id: serial('id').primaryKey(),
  policyRuleId: integer('policy_rule_id').references(() => storagePolicyRules.id),
  status: text('status').default('pending').notNull(), // pending, in_progress, completed, failed
  startTime: timestamp('start_time').defaultNow(),
  endTime: timestamp('end_time'),
  recordsProcessed: integer('records_processed').default(0),
  bytesProcessed: integer('bytes_processed').default(0),
  errorMessage: text('error_message'),
  sourceTier: storageTierEnum('source_tier').notNull(),
  destinationTier: storageTierEnum('destination_tier').notNull(),
  metadataSnapshot: json('metadata_snapshot'), // Snapshot of the data moved
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const storageTierMetrics = pgTable('storage_tier_metrics', {
  id: serial('id').primaryKey(),
  tier: storageTierEnum('tier').notNull(),
  dataType: text('data_type').notNull(), // device_readings, energy_readings, etc.
  recordCount: integer('record_count').default(0),
  storageBytes: integer('storage_bytes').default(0),
  oldestRecord: timestamp('oldest_record'),
  newestRecord: timestamp('newest_record'),
  avgAccessesPerDay: numeric('avg_accesses_per_day').default('0'),
  lastAccessedAt: timestamp('last_accessed_at'),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ** END OF MULTI-TIERED STORAGE SYSTEM **

// Device Catalog Tables
export const deviceManufacturers = pgTable('device_manufacturers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  logoUrl: text('logo_url'),
  website: text('website'),
  country: text('country'),
  description: text('description'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const deviceCatalog = pgTable('device_catalog', {
  id: serial('id').primaryKey(),
  manufacturerId: integer('manufacturer_id').notNull().references(() => deviceManufacturers.id),
  name: text('name').notNull(),
  modelNumber: text('model_number').notNull(),
  type: deviceTypeEnum('type').notNull(),
  releaseYear: integer('release_year'),
  imageUrl: text('image_url'),
  thumbnailUrl: text('thumbnail_url'),
  capacity: numeric('capacity'),
  maxPower: numeric('max_power'),
  efficiency: numeric('efficiency'),
  dimensions: text('dimensions'),
  weight: numeric('weight'),
  shortDescription: text('short_description'),
  fullDescription: text('full_description'),
  features: json('features'),
  supportedProtocols: json('supported_protocols'),
  warranty: text('warranty'),
  price: numeric('price'),
  currency: text('currency').default('USD'),
  availability: boolean('availability').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const deviceCatalogDocuments = pgTable('device_catalog_documents', {
  id: serial('id').primaryKey(),
  deviceCatalogId: integer('device_catalog_id').notNull().references(() => deviceCatalog.id, { onDelete: 'cascade' }),
  documentType: documentTypeEnum('document_type').notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  language: text('language').default('en'),
  version: text('version'),
  uploadDate: timestamp('upload_date').defaultNow(),
  description: text('description'),
});

export const deviceCatalogRegisters = pgTable('device_catalog_registers', {
  id: serial('id').primaryKey(),
  deviceCatalogId: integer('device_catalog_id').notNull().references(() => deviceCatalog.id, { onDelete: 'cascade' }),
  protocol: communicationProtocolEnum('protocol').notNull(),
  address: text('address').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  dataType: text('data_type').notNull(), // 'integer', 'float', 'string', 'boolean'
  unit: text('unit'),
  scaleFactor: numeric('scale_factor'),
  offsetValue: numeric('offset_value'),
  minValue: numeric('min_value'),
  maxValue: numeric('max_value'),
  access: text('access').notNull(), // 'read', 'write', 'read-write'
  isRequired: boolean('is_required').default(false),
  defaultValue: text('default_value'),
  notes: text('notes'),
});

export const deviceCatalogPresets = pgTable('device_catalog_presets', {
  id: serial('id').primaryKey(),
  deviceCatalogId: integer('device_catalog_id').notNull().references(() => deviceCatalog.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  configValues: json('config_values').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Device Technical Specifications table for detailed parameters
export const deviceTechnicalSpecs = pgTable('device_technical_specs', {
  id: serial('id').primaryKey(),
  deviceCatalogId: integer('device_catalog_id').notNull().references(() => deviceCatalog.id, { onDelete: 'cascade' }),
  // General specifications
  errorMargin: numeric('error_margin'), // Measurement error margin in percentage
  selfConsumption: numeric('self_consumption'), // Power consumed by the device itself in watts
  temperatureRange: text('temperature_range'), // Operating temperature range
  ipRating: text('ip_rating'), // Ingress Protection rating
  
  // Battery specific
  depthOfDischargeMax: numeric('depth_of_discharge_max'), // Maximum depth of discharge percentage
  cycleLifeAt80Percent: integer('cycle_life_at_80_percent'), // Cycle life at 80% depth of discharge
  roundTripEfficiency: numeric('round_trip_efficiency'), // Round-trip efficiency percentage
  selfDischargeRate: numeric('self_discharge_rate'), // Self-discharge rate percentage per month
  
  // Solar specific
  temperatureCoefficientPmax: numeric('temperature_coefficient_pmax'), // Temperature coefficient for maximum power
  degradationRate: numeric('degradation_rate'), // Annual degradation rate percentage
  shadingTolerance: numeric('shading_tolerance'), // Shading tolerance rating
  
  // EV Charger specific
  standbyPower: numeric('standby_power'), // Power consumption in standby mode
  chargingEfficiency: numeric('charging_efficiency'), // Charging efficiency percentage
  
  // Heat Pump specific
  cop: numeric('cop'), // Coefficient of Performance
  copAt7C: numeric('cop_at_7c'), // COP at 7°C outdoor temperature
  copAtMinus7C: numeric('cop_at_minus_7c'), // COP at -7°C outdoor temperature
  refrigerantType: text('refrigerant_type'), // Type of refrigerant used
  
  // Inverter specific
  mpptEfficiency: numeric('mppt_efficiency'), // Maximum Power Point Tracking efficiency
  euroEfficiency: numeric('euro_efficiency'), // Euro efficiency rating
  standbyConsumption: numeric('standby_consumption'), // Standby consumption in watts
  
  // Smart Meter specific
  accuracyClass: text('accuracy_class'), // Accuracy classification
  measurementPrecision: numeric('measurement_precision'), // Measurement precision percentage
  
  // JSON fields for additional specifications by type
  additionalSpecs: json('additional_specs'),
  
  // Certification and compliance
  certifications: json('certifications'), // Array of certification standards met
  complianceStandards: json('compliance_standards'), // Compliance standards met
  
  // Firmware/software
  firmwareVersion: text('firmware_version'),
  softwareVersion: text('software_version'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const weatherData = pgTable('weather_data', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  temperature: numeric('temperature'), // in Celsius
  humidity: numeric('humidity'), // percentage
  cloudCover: numeric('cloud_cover'), // percentage
  windSpeed: numeric('wind_speed'), // m/s
  windDirection: numeric('wind_direction'), // degrees
  precipitation: numeric('precipitation'), // mm
  pressure: numeric('pressure'), // hPa
  uvIndex: numeric('uv_index'),
  sunriseTime: timestamp('sunrise_time'),
  sunsetTime: timestamp('sunset_time'),
  condition: weatherConditionEnum('condition'), // e.g., "clear", "clouds", "rain"
  icon: text('icon'), // Weather icon code
  isForecasted: boolean('is_forecasted').default(false).notNull(),
  forecastTime: timestamp('forecast_time'), // The time when this weather was forecasted
  source: text('source').default('openweathermap').notNull(),
  locationName: text('location_name'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  metadata: json('metadata'),
});

// Device Catalog Relations
export const deviceManufacturersRelations = relations(deviceManufacturers, ({ many }) => ({
  catalogDevices: many(deviceCatalog),
}));

export const deviceCatalogRelations = relations(deviceCatalog, ({ one, many }) => ({
  manufacturer: one(deviceManufacturers, {
    fields: [deviceCatalog.manufacturerId],
    references: [deviceManufacturers.id],
  }),
  documents: many(deviceCatalogDocuments),
  registers: many(deviceCatalogRegisters),
  presets: many(deviceCatalogPresets),
  technicalSpecs: many(deviceTechnicalSpecs),
}));

export const deviceCatalogDocumentsRelations = relations(deviceCatalogDocuments, ({ one }) => ({
  device: one(deviceCatalog, {
    fields: [deviceCatalogDocuments.deviceCatalogId],
    references: [deviceCatalog.id],
  }),
}));

export const deviceCatalogRegistersRelations = relations(deviceCatalogRegisters, ({ one }) => ({
  device: one(deviceCatalog, {
    fields: [deviceCatalogRegisters.deviceCatalogId],
    references: [deviceCatalog.id],
  }),
}));

export const deviceCatalogPresetsRelations = relations(deviceCatalogPresets, ({ one }) => ({
  device: one(deviceCatalog, {
    fields: [deviceCatalogPresets.deviceCatalogId],
    references: [deviceCatalog.id],
  }),
}));

export const deviceTechnicalSpecsRelations = relations(deviceTechnicalSpecs, ({ one }) => ({
  device: one(deviceCatalog, {
    fields: [deviceTechnicalSpecs.deviceCatalogId],
    references: [deviceCatalog.id],
  }),
}));

// Relations
export const sitesRelations = relations(sites, ({ many }) => ({
  devices: many(devices),
  energyReadings: many(energyReadings),
  energyForecasts: many(energyForecasts),
  weatherData: many(weatherData),
  demandResponseSettings: many(siteDemandResponseSettings),
  demandResponsePrograms: many(demandResponsePrograms),
  demandResponseEvents: many(demandResponseEvents),
  eventParticipations: many(siteEventParticipations),
}));

export const usersRelations = relations(users, ({ one }) => ({
  site: one(sites, {
    fields: [users.siteId],
    references: [sites.id],
  }),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  site: one(sites, {
    fields: [devices.siteId],
    references: [sites.id],
  }),
  readings: many(deviceReadings),
  gateway: one(devices, {
    fields: [devices.gatewayId],
    references: [devices.id],
  }),
  connectedDevices: many(devices, { relationName: "connectedToGateway" }),
}));

export const gatewayDevicesRelations = relations(gatewayDevices, ({ one }) => ({
  device: one(devices, {
    fields: [gatewayDevices.deviceId],
    references: [devices.id],
    relationName: "deviceGateway"
  }),
}));

export const deviceReadingsRelations = relations(deviceReadings, ({ one }) => ({
  device: one(devices, {
    fields: [deviceReadings.deviceId],
    references: [devices.id],
  }),
}));

export const energyReadingsRelations = relations(energyReadings, ({ one }) => ({
  site: one(sites, {
    fields: [energyReadings.siteId],
    references: [sites.id],
  }),
}));

export const optimizationSettingsRelations = relations(optimizationSettings, ({ one }) => ({
  site: one(sites, {
    fields: [optimizationSettings.siteId],
    references: [sites.id],
  }),
}));

export const tariffsRelations = relations(tariffs, ({ one }) => ({
  site: one(sites, {
    fields: [tariffs.siteId],
    references: [sites.id],
  }),
}));

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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const energyForecastsRelations = relations(energyForecasts, ({ one }) => ({
  site: one(sites, {
    fields: [energyForecasts.siteId],
    references: [sites.id],
  }),
}));

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

// Storage tier system relations
export const storagePolicyRulesRelations = relations(storagePolicyRules, ({ many }) => ({
  transferJobs: many(dataTransferJobs),
}));

export const dataTransferJobsRelations = relations(dataTransferJobs, ({ one }) => ({
  policyRule: one(storagePolicyRules, {
    fields: [dataTransferJobs.policyRuleId],
    references: [storagePolicyRules.id],
  }),
}));

export const weatherDataRelations = relations(weatherData, ({ one }) => ({
  site: one(sites, {
    fields: [weatherData.siteId],
    references: [sites.id],
  }),
}));

export const demandResponseProgramsRelations = relations(demandResponsePrograms, ({ many }) => ({
  events: many(demandResponseEvents),
}));

export const demandResponseEventsRelations = relations(demandResponseEvents, ({ one, many }) => ({
  site: one(sites, {
    fields: [demandResponseEvents.siteId],
    references: [sites.id],
  }),
  program: one(demandResponsePrograms, {
    fields: [demandResponseEvents.programId],
    references: [demandResponsePrograms.id],
  }),
  participations: many(siteEventParticipations),
}));

export const siteDemandResponseSettingsRelations = relations(siteDemandResponseSettings, ({ one }) => ({
  site: one(sites, {
    fields: [siteDemandResponseSettings.siteId],
    references: [sites.id],
  }),
}));

export const siteEventParticipationsRelations = relations(siteEventParticipations, ({ one, many }) => ({
  site: one(sites, {
    fields: [siteEventParticipations.siteId],
    references: [sites.id],
  }),
  event: one(demandResponseEvents, {
    fields: [siteEventParticipations.eventId],
    references: [demandResponseEvents.id],
  }),
  actions: many(demandResponseActions),
}));

export const demandResponseActionsRelations = relations(demandResponseActions, ({ one }) => ({
  participation: one(siteEventParticipations, {
    fields: [demandResponseActions.participationId],
    references: [siteEventParticipations.id],
  }),
  device: one(devices, {
    fields: [demandResponseActions.deviceId],
    references: [devices.id],
  }),
}));

// Edge Computing Relations will be defined after table definitions

// 5G Edge Computing Tables
export const edgeComputingNodes = pgTable('edge_computing_nodes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  siteId: integer('site_id').references(() => sites.id).notNull(),
  nodeType: edgeNodeTypeEnum('node_type').default('primary'),
  status: edgeNodeStatusEnum('status').default('active'),
  ipAddress: text('ip_address'),
  macAddress: text('mac_address'),
  capabilities: edgeComputeCapabilityEnum('capabilities').array(),
  processor: text('processor'),
  memory: integer('memory_mb'),
  storage: integer('storage_gb'),
  operatingSystem: text('operating_system'),
  firmwareVersion: text('firmware_version'),
  location: text('location'),
  installationDate: timestamp('installation_date'),
  lastMaintenance: timestamp('last_maintenance'),
  lastHeartbeat: timestamp('last_heartbeat'),
  powerConsumptionWatts: numeric('power_consumption_watts'),
  maxDeviceConnections: integer('max_device_connections'),
  currentDeviceConnections: integer('current_device_connections').default(0),
  securityLevel: text('security_level').default('standard'),
  encryptionEnabled: boolean('encryption_enabled').default(true),
  hasFallbackConnection: boolean('has_fallback_connection').default(false),
  isVirtualNode: boolean('is_virtual_node').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: json('metadata')
});

// 5G/IoT Connectivity
export const edgeConnectivity = pgTable('edge_connectivity', {
  id: serial('id').primaryKey(),
  edgeNodeId: integer('edge_node_id').references(() => edgeComputingNodes.id).notNull(),
  connectivityType: gatewayProtocolEnum('connectivity_type').default('5g'),
  provider: text('provider'),
  signalStrength: integer('signal_strength'),
  bandwidth: numeric('bandwidth_mbps'),
  latencyMs: numeric('latency_ms'),
  jitterMs: numeric('jitter_ms'),
  packetLoss: numeric('packet_loss_percent'),
  dataUsage: numeric('data_usage_mb'),
  ipAddress: text('ip_address'),
  subnet: text('subnet'),
  gateway: text('gateway'),
  dns: text('dns'),
  simCardId: text('sim_card_id'),
  imei: text('imei'),
  apn: text('apn'),
  lastConnected: timestamp('last_connected'),
  isFallback: boolean('is_fallback').default(false),
  isPrimary: boolean('is_primary').default(true),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: json('metadata')
});

// Edge Node Applications (software running on edge nodes)
export const edgeNodeApplications = pgTable('edge_node_applications', {
  id: serial('id').primaryKey(),
  edgeNodeId: integer('edge_node_id').references(() => edgeComputingNodes.id).notNull(),
  name: text('name').notNull(),
  version: text('version'),
  status: text('status').default('running'),
  description: text('description'),
  installDate: timestamp('install_date').defaultNow(),
  lastUpdated: timestamp('last_updated').defaultNow(),
  applicationType: text('application_type').default('control'),
  memoryUsageMb: numeric('memory_usage_mb'),
  cpuUsagePercent: numeric('cpu_usage_percent'),
  storageUsageMb: numeric('storage_usage_mb'),
  autoStart: boolean('auto_start').default(true),
  restartPolicy: text('restart_policy').default('always'),
  healthCheckEndpoint: text('health_check_endpoint'),
  healthStatus: text('health_status').default('healthy'),
  lastHealthCheck: timestamp('last_health_check'),
  containerized: boolean('containerized').default(true),
  deploymentMethod: text('deployment_method').default('container'),
  repositoryUrl: text('repository_url'),
  configJson: json('config_json'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Edge Node Device Control (devices controlled by edge nodes)
export const edgeNodeDeviceControl = pgTable('edge_node_device_control', {
  id: serial('id').primaryKey(),
  edgeNodeId: integer('edge_node_id').references(() => edgeComputingNodes.id).notNull(),
  deviceId: integer('device_id').references(() => devices.id).notNull(),
  controlEnabled: boolean('control_enabled').default(true),
  controlMode: text('control_mode').default('full'),
  priorityLevel: integer('priority_level').default(5),
  maxLatencyAllowedMs: integer('max_latency_allowed_ms'),
  authToken: text('auth_token'),
  connectionStatus: text('connection_status').default('connected'),
  lastControlAction: timestamp('last_control_action'),
  lastResponseTime: numeric('last_response_time_ms'),
  fallbackBehavior: text('fallback_behavior').default('maintain_last_state'),
  localCachingEnabled: boolean('local_caching_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  controlMappingJson: json('control_mapping_json')
});

// Edge Node Metrics
export const edgeNodeMetrics = pgTable('edge_node_metrics', {
  id: serial('id').primaryKey(),
  edgeNodeId: integer('edge_node_id').references(() => edgeComputingNodes.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  cpuUsagePercent: numeric('cpu_usage_percent'),
  memoryUsageMb: numeric('memory_usage_mb'),
  networkInKbps: numeric('network_in_kbps'),
  networkOutKbps: numeric('network_out_kbps'),
  diskReadKbps: numeric('disk_read_kbps'),
  diskWriteKbps: numeric('disk_write_kbps'),
  storageUsagePercent: numeric('storage_usage_percent'),
  temperature: numeric('temperature_celsius'),
  uptimeSeconds: numeric('uptime_seconds'),
  activeConnections: integer('active_connections'),
  errorCount: integer('error_count'),
  batteryLevel: numeric('battery_level_percent'),
  powerStatus: text('power_status'),
  signalStrength: integer('signal_strength'),
  latencyMs: numeric('latency_ms')
});

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
  exportRate: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  dataIntervalSeconds: z.string().or(z.number()).optional().transform(val => val ? Number(val) : 60)
}).omit({ id: true, createdAt: true, updatedAt: true });

// Gateway insert schemas
export const insertGatewayDeviceSchema = createInsertSchema(gatewayDevices, {
  port: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  heartbeatInterval: z.string().or(z.number()).optional().transform(val => val ? Number(val) : 60),
  maxReconnectAttempts: z.string().or(z.number()).optional().transform(val => val ? Number(val) : 5)
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastConnectedAt: true
});

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

export const insertWeatherDataSchema = createInsertSchema(weatherData, {
  temperature: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  humidity: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  cloudCover: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  windSpeed: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  windDirection: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  precipitation: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  pressure: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  uvIndex: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  latitude: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
  longitude: z.string().or(z.number()).transform(val => val === null ? null : Number(val)),
}).omit({ id: true });

// Demand Response insert schemas
export const insertDemandResponseProgramSchema = createInsertSchema(demandResponsePrograms, {
  minReductionAmount: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  maxReductionAmount: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  incentiveRate: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  maxEventDuration: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  maxEventsPerYear: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  maxEventsPerMonth: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDemandResponseEventSchema = createInsertSchema(demandResponseEvents, {
  targetReduction: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  actualReduction: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  incentiveModifier: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Edge Computing Insert Schemas
export const insertEdgeComputingNodeSchema = createInsertSchema(edgeComputingNodes, {
  memory: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  storage: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  powerConsumptionWatts: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  maxDeviceConnections: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  currentDeviceConnections: z.string().or(z.number()).optional().transform(val => val ? Number(val) : 0)
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastHeartbeat: true
});

export const insertEdgeConnectivitySchema = createInsertSchema(edgeConnectivity, {
  signalStrength: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  bandwidth: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  latencyMs: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  jitterMs: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  packetLoss: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  dataUsage: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined)
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastConnected: true
});

export const insertEdgeNodeApplicationSchema = createInsertSchema(edgeNodeApplications, {
  memoryUsageMb: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  cpuUsagePercent: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  storageUsageMb: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined)
}).omit({
  id: true,
  installDate: true,
  lastUpdated: true,
  lastHealthCheck: true,
  createdAt: true,
  updatedAt: true
});

export const insertEdgeNodeDeviceControlSchema = createInsertSchema(edgeNodeDeviceControl, {
  priorityLevel: z.string().or(z.number()).optional().transform(val => val ? Number(val) : 5),
  maxLatencyAllowedMs: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  lastResponseTime: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined)
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastControlAction: true
});

export const insertEdgeNodeMetricsSchema = createInsertSchema(edgeNodeMetrics, {
  cpuUsagePercent: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  memoryUsageMb: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  networkInKbps: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  networkOutKbps: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  diskReadKbps: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  diskWriteKbps: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  storageUsagePercent: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  temperature: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  uptimeSeconds: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  activeConnections: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  errorCount: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  batteryLevel: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  signalStrength: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  latencyMs: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined)
}).omit({
  id: true,
  timestamp: true
});

export const insertSiteDemandResponseSettingsSchema = createInsertSchema(siteDemandResponseSettings, {
  maxReductionCapacity: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  minimumIncentiveThreshold: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSiteEventParticipationSchema = createInsertSchema(siteEventParticipations, {
  baselineConsumption: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  actualConsumption: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  reductionAchieved: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  incentiveEarned: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDemandResponseActionSchema = createInsertSchema(demandResponseActions, {
  setPoint: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  estimatedReduction: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  actualReduction: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, createdAt: true, updatedAt: true });

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

// Device Catalog insert schemas
export const insertDeviceManufacturerSchema = createInsertSchema(deviceManufacturers)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertDeviceCatalogSchema = createInsertSchema(deviceCatalog, {
  capacity: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  maxPower: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  efficiency: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  weight: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  price: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDeviceCatalogDocumentSchema = createInsertSchema(deviceCatalogDocuments, {
  fileSize: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, uploadDate: true });

export const insertDeviceCatalogRegisterSchema = createInsertSchema(deviceCatalogRegisters, {
  scaleFactor: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  offsetValue: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  minValue: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  maxValue: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true });

export const insertDeviceCatalogPresetSchema = createInsertSchema(deviceCatalogPresets)
  .omit({ id: true, createdAt: true, updatedAt: true });
  
export const insertDeviceTechnicalSpecsSchema = createInsertSchema(deviceTechnicalSpecs, {
  // General specifications
  errorMargin: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  selfConsumption: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  
  // Battery specific
  depthOfDischargeMax: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  cycleLifeAt80Percent: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  roundTripEfficiency: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  selfDischargeRate: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  
  // Solar specific
  temperatureCoefficientPmax: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  degradationRate: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  shadingTolerance: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  
  // EV Charger specific
  standbyPower: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  chargingEfficiency: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  
  // Heat Pump specific
  cop: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  copAt7C: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  copAtMinus7C: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  
  // Inverter specific
  mpptEfficiency: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  euroEfficiency: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  standbyConsumption: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
  
  // Smart Meter specific
  measurementPrecision: z.string().or(z.number()).optional().transform(val => val ? Number(val) : undefined),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Device Catalog types
export type DeviceManufacturer = typeof deviceManufacturers.$inferSelect;
export type InsertDeviceManufacturer = z.infer<typeof insertDeviceManufacturerSchema>;

export type DeviceCatalogEntry = typeof deviceCatalog.$inferSelect;
export type InsertDeviceCatalogEntry = z.infer<typeof insertDeviceCatalogSchema>;

export type DeviceCatalogDocument = typeof deviceCatalogDocuments.$inferSelect;
export type InsertDeviceCatalogDocument = z.infer<typeof insertDeviceCatalogDocumentSchema>;

export type DeviceCatalogRegister = typeof deviceCatalogRegisters.$inferSelect;
export type InsertDeviceCatalogRegister = z.infer<typeof insertDeviceCatalogRegisterSchema>;

export type DeviceCatalogPreset = typeof deviceCatalogPresets.$inferSelect;
export type InsertDeviceCatalogPreset = z.infer<typeof insertDeviceCatalogPresetSchema>;

export type DeviceTechnicalSpec = typeof deviceTechnicalSpecs.$inferSelect;
export type InsertDeviceTechnicalSpec = z.infer<typeof insertDeviceTechnicalSpecsSchema>;

// Edge Computing types
export type EdgeComputingNode = typeof edgeComputingNodes.$inferSelect;
export type InsertEdgeComputingNode = z.infer<typeof insertEdgeComputingNodeSchema>;

export type EdgeConnectivity = typeof edgeConnectivity.$inferSelect;
export type InsertEdgeConnectivity = z.infer<typeof insertEdgeConnectivitySchema>;

export type EdgeNodeApplication = typeof edgeNodeApplications.$inferSelect;
export type InsertEdgeNodeApplication = z.infer<typeof insertEdgeNodeApplicationSchema>;

export type EdgeNodeDeviceControl = typeof edgeNodeDeviceControl.$inferSelect;
export type InsertEdgeNodeDeviceControl = z.infer<typeof insertEdgeNodeDeviceControlSchema>;

export type EdgeNodeMetrics = typeof edgeNodeMetrics.$inferSelect;
export type InsertEdgeNodeMetrics = z.infer<typeof insertEdgeNodeMetricsSchema>;

// Now we can define the edge computing relations
export const edgeComputingNodesRelations = relations(edgeComputingNodes, ({ one, many }) => ({
  site: one(sites, {
    fields: [edgeComputingNodes.siteId],
    references: [sites.id],
  }),
  connectivity: many(edgeConnectivity),
  applications: many(edgeNodeApplications),
  deviceControls: many(edgeNodeDeviceControl),
  metrics: many(edgeNodeMetrics),
}));

export const edgeConnectivityRelations = relations(edgeConnectivity, ({ one }) => ({
  edgeNode: one(edgeComputingNodes, {
    fields: [edgeConnectivity.edgeNodeId],
    references: [edgeComputingNodes.id],
  }),
}));

export const edgeNodeApplicationsRelations = relations(edgeNodeApplications, ({ one }) => ({
  edgeNode: one(edgeComputingNodes, {
    fields: [edgeNodeApplications.edgeNodeId],
    references: [edgeComputingNodes.id],
  }),
}));

export const edgeNodeDeviceControlRelations = relations(edgeNodeDeviceControl, ({ one }) => ({
  edgeNode: one(edgeComputingNodes, {
    fields: [edgeNodeDeviceControl.edgeNodeId],
    references: [edgeComputingNodes.id],
  }),
  device: one(devices, {
    fields: [edgeNodeDeviceControl.deviceId],
    references: [devices.id],
  }),
}));

export const edgeNodeMetricsRelations = relations(edgeNodeMetrics, ({ one }) => ({
  edgeNode: one(edgeComputingNodes, {
    fields: [edgeNodeMetrics.edgeNodeId],
    references: [edgeComputingNodes.id],
  }),
}));

// V2G/V2H Bidirectional EV Charging Tables
export const evVehicles = pgTable('ev_vehicles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  manufacturer: text('manufacturer'),
  model: text('model'),
  licensePlate: text('license_plate'),
  vinNumber: text('vin_number').unique(),
  batteryCapacityKwh: numeric('battery_capacity_kwh').notNull(),
  maxChargingRateKw: numeric('max_charging_rate_kw').notNull(),
  maxDischargingRateKw: numeric('max_discharging_rate_kw'),
  bidirectionalCapable: boolean('bidirectional_capable').default(false),
  minSocLimit: numeric('min_soc_limit').default('20'), // Minimum state of charge to maintain (%)
  maxSocLimit: numeric('max_soc_limit').default('90'), // Maximum state of charge to allow (%)
  currentSoc: numeric('current_soc'), // Current state of charge (%)
  estimatedRange: numeric('estimated_range'), // Estimated range in kilometers
  estimatedConsumption: numeric('estimated_consumption'), // kWh/100km
  availableForV2g: boolean('available_for_v2g').default(false),
  v2gPriority: integer('v2g_priority').default(1), // Priority for V2G service (1-10)
  homeDistance: numeric('home_distance'), // Distance from home in km
  batteryCycles: integer('battery_cycles'), // Number of complete battery charge/discharge cycles
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: json('metadata'),
});

export const evChargingSessions = pgTable('ev_charging_sessions', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id),
  vehicleId: integer('vehicle_id').references(() => evVehicles.id),
  userId: integer('user_id').references(() => users.id),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  startSoc: numeric('start_soc'), // State of charge at start (%)
  endSoc: numeric('end_soc'), // State of charge at end (%)
  totalEnergyKwh: numeric('total_energy_kwh'), // Total energy transferred
  chargingMode: evChargingModeEnum('charging_mode').default('balanced'),
  bidirectionalEnabled: boolean('bidirectional_enabled').default(false),
  energyToGridKwh: numeric('energy_to_grid_kwh').default('0'), // Energy discharged to grid
  energyToHomeKwh: numeric('energy_to_home_kwh').default('0'), // Energy discharged to home
  energyFromGridKwh: numeric('energy_from_grid_kwh').default('0'), // Energy drawn from grid
  peakChargingRateKw: numeric('peak_charging_rate_kw'), // Maximum charging rate reached
  peakDischargingRateKw: numeric('peak_discharging_rate_kw'), // Maximum discharging rate reached
  costSavings: numeric('cost_savings'), // Estimated cost savings from session
  revenue: numeric('revenue'), // Estimated revenue from V2G
  carbonSavingsKg: numeric('carbon_savings_kg'), // Estimated carbon savings
  sessionStatus: text('session_status').default('active'), // active, completed, error, interrupted
  errorMessage: text('error_message'), 
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: json('metadata'),
});

export const v2gServiceProviders = pgTable('v2g_service_providers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  apiEndpoint: text('api_endpoint'),
  apiKey: text('api_key'),
  serviceType: v2gServiceTypeEnum('service_type').notNull(),
  pricePerKwh: numeric('price_per_kwh'), // Price paid per kWh
  minPowerKw: numeric('min_power_kw'), // Minimum power required
  availableTimeStart: text('available_time_start').default('00:00'), // Time of day service starts (24h format)
  availableTimeEnd: text('available_time_end').default('23:59'), // Time of day service ends (24h format)
  contractStartDate: date('contract_start_date'),
  contractEndDate: date('contract_end_date'),
  paymentTermsDays: integer('payment_terms_days').default(30),
  isActive: boolean('is_active').default(true),
  requiresPreRegistration: boolean('requires_pre_registration').default(false),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  website: text('website'),
  country: text('country'),
  supportedVehicles: json('supported_vehicles'), // List of supported vehicle models
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: json('metadata'),
});

export const v2gServiceEnrollments = pgTable('v2g_service_enrollments', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id').notNull().references(() => evVehicles.id),
  serviceProviderId: integer('service_provider_id').notNull().references(() => v2gServiceProviders.id),
  userId: integer('user_id').notNull().references(() => users.id),
  enrollmentDate: timestamp('enrollment_date').defaultNow(),
  status: text('status').default('pending'), // pending, active, suspended, terminated
  contractId: text('contract_id'), // Reference ID from the service provider
  minSocLimit: numeric('min_soc_limit'), // Override per enrollment
  availableHoursJson: json('available_hours_json'), // JSON object with availability schedule
  maxPowerKw: numeric('max_power_kw'), // Maximum power for this enrollment
  priorityOrder: integer('priority_order').default(1), // Priority when multiple enrollments
  terminationDate: timestamp('termination_date'),
  terminationReason: text('termination_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: json('metadata'),
});

export const v2gDischargeEvents = pgTable('v2g_discharge_events', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().references(() => v2gServiceEnrollments.id),
  vehicleId: integer('vehicle_id').notNull().references(() => evVehicles.id),
  deviceId: integer('device_id').notNull().references(() => devices.id),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  serviceType: v2gServiceTypeEnum('service_type').notNull(),
  requestedPowerKw: numeric('requested_power_kw').notNull(),
  deliveredPowerKw: numeric('delivered_power_kw'),
  totalEnergyKwh: numeric('total_energy_kwh'),
  startSoc: numeric('start_soc'), // State of charge at start (%)
  endSoc: numeric('end_soc'), // State of charge at end (%)
  eventSource: text('event_source').default('service_provider'), // service_provider, user, automated
  eventStatus: text('event_status').default('in_progress'), // scheduled, in_progress, completed, cancelled, failed
  completionStatus: text('completion_status'), // success, partial, failure
  failureReason: text('failure_reason'),
  revenue: numeric('revenue'), // Revenue earned from this event
  pricePerkWh: numeric('price_per_kwh'), // Price per kWh for this specific event
  carbonOffset: numeric('carbon_offset'), // Carbon emission reduction
  peakDemandReduction: numeric('peak_demand_reduction'), // Peak demand reduction
  paymentStatus: text('payment_status').default('pending'), // pending, paid, disputed
  paymentDate: timestamp('payment_date'),
  invoiceId: text('invoice_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  metadata: json('metadata'),
});

export type GridConnection = typeof gridConnections.$inferSelect;
export type InsertGridConnection = z.infer<typeof insertGridConnectionSchema>;

export type RemoteCommand = typeof remoteCommands.$inferSelect;
export type InsertRemoteCommand = z.infer<typeof insertRemoteCommandSchema>;

export type WeatherData = typeof weatherData.$inferSelect;
export type InsertWeatherData = z.infer<typeof insertWeatherDataSchema>;

// Demand Response types
export type DemandResponseProgram = typeof demandResponsePrograms.$inferSelect;
export type InsertDemandResponseProgram = z.infer<typeof insertDemandResponseProgramSchema>;

export type DemandResponseEvent = typeof demandResponseEvents.$inferSelect;
export type InsertDemandResponseEvent = z.infer<typeof insertDemandResponseEventSchema>;

export type SiteDemandResponseSetting = typeof siteDemandResponseSettings.$inferSelect;
export type InsertSiteDemandResponseSetting = z.infer<typeof insertSiteDemandResponseSettingsSchema>;

export type SiteEventParticipation = typeof siteEventParticipations.$inferSelect;
export type InsertSiteEventParticipation = z.infer<typeof insertSiteEventParticipationSchema>;

export type DemandResponseAction = typeof demandResponseActions.$inferSelect;
export type InsertDemandResponseAction = z.infer<typeof insertDemandResponseActionSchema>;

// V2G/V2H types
export type EVVehicle = typeof evVehicles.$inferSelect;
export const insertEVVehicleSchema = createInsertSchema(evVehicles).omit({ id: true });
export type InsertEVVehicle = z.infer<typeof insertEVVehicleSchema>;

export type EVChargingSession = typeof evChargingSessions.$inferSelect;
export const insertEVChargingSessionSchema = createInsertSchema(evChargingSessions).omit({ id: true });
export type InsertEVChargingSession = z.infer<typeof insertEVChargingSessionSchema>;

export type V2GServiceProvider = typeof v2gServiceProviders.$inferSelect;
export const insertV2GServiceProviderSchema = createInsertSchema(v2gServiceProviders).omit({ id: true });
export type InsertV2GServiceProvider = z.infer<typeof insertV2GServiceProviderSchema>;

export type V2GServiceEnrollment = typeof v2gServiceEnrollments.$inferSelect;
export const insertV2GServiceEnrollmentSchema = createInsertSchema(v2gServiceEnrollments).omit({ id: true });
export type InsertV2GServiceEnrollment = z.infer<typeof insertV2GServiceEnrollmentSchema>;

export type V2GDischargeEvent = typeof v2gDischargeEvents.$inferSelect;
export const insertV2GDischargeEventSchema = createInsertSchema(v2gDischargeEvents).omit({ id: true });
export type InsertV2GDischargeEvent = z.infer<typeof insertV2GDischargeEventSchema>;

// Predictive Maintenance Tables
export const deviceMaintenanceIssues = pgTable('device_maintenance_issues', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  severity: maintenanceSeverityEnum('severity').default('medium'),
  status: maintenanceStatusEnum('status').default('pending'),
  type: maintenanceTypeEnum('type').default('predictive'),
  detectedAt: timestamp('detected_at').defaultNow(),
  predictedFailureAt: timestamp('predicted_failure_at'),
  resolvedAt: timestamp('resolved_at'),
  assignedTo: integer('assigned_to').references(() => users.id),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  relatedIssueId: integer('related_issue_id'),
  resolution: text('resolution'),
  resolutionNotes: text('resolution_notes'),
  maintenanceCost: numeric('maintenance_cost'),
  predictedCost: numeric('predicted_cost'),
  costCurrency: text('cost_currency').default('USD'),
  downtimeMinutes: integer('downtime_minutes'),
  incidentNumber: text('incident_number'), // For tracking in external systems
  attachments: json('attachments'), // URLs to photos or documents
  anomalyScore: numeric('anomaly_score'), // 0-100, how unusual the issue is
  confidenceScore: numeric('confidence_score'), // 0-100, prediction confidence
  maintenanceHistoryIds: json('maintenance_history_ids'), // References to maintenance events
  affectedComponents: json('affected_components'), // List of affected components
  recommendedActions: json('recommended_actions'), // List of actions to take
  tags: json('tags'), // For categorization and filtering
});

export const deviceHealthMetrics = pgTable('device_health_metrics', {
  id: serial('id').primaryKey(), 
  deviceId: integer('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').defaultNow(),
  // Battery-specific metrics
  cycleCount: integer('cycle_count'), // For batteries
  depthOfDischarge: numeric('depth_of_discharge'), // % of capacity used in a cycle
  chargeDischargeRate: numeric('charge_discharge_rate'), // Rate of charging/discharging
  internalResistance: numeric('internal_resistance'), // Battery internal resistance
  capacityFading: numeric('capacity_fading'), // % of original capacity lost
  temperatureVariance: numeric('temperature_variance'), // Range of temperature fluctuations
  voltageStability: numeric('voltage_stability'), // Stability of voltage under load
  selfDischargeRate: numeric('self_discharge_rate'), // Battery self-discharge rate
  lastEqualization: timestamp('last_equalization'), // Last battery balancing
  // Solar-specific metrics
  efficiencyRatio: numeric('efficiency_ratio'), // Performance ratio
  degradationRate: numeric('degradation_rate'), // Annual % degradation
  soilingLossRate: numeric('soiling_loss_rate'), // Loss due to dirt/dust
  shadingImpact: numeric('shading_impact'), // Impact of shading on production
  hotspotCount: integer('hotspot_count'), // Number of detected hotspots
  connectionIntegrityScore: numeric('connection_integrity_score'), // 0-100, quality of connections
  inverterEfficiency: numeric('inverter_efficiency'), // Inverter efficiency
  dcAcConversionRatio: numeric('dc_ac_conversion_ratio'), // DC to AC conversion efficiency
  maximumPowerPointTracking: numeric('maximum_power_point_tracking'), // MPPT efficiency
  // General metrics
  operatingTemperature: numeric('operating_temperature'), // Current operating temperature
  humidity: numeric('humidity'), // Current humidity (%)
  vibrationLevel: numeric('vibration_level'), // Vibration level
  noiseLevel: numeric('noise_level'), // Acoustic noise in dB
  dustAccumulation: numeric('dust_accumulation'), // Dust accumulation level
  correctionLevel: numeric('correction_level'), // Corrosion level
  ipRating: text('ip_rating'), // Ingress Protection rating
  lastMaintenanceDate: timestamp('last_maintenance_date'), // Last maintenance performed
  uptime: numeric('uptime'), // % of time operating correctly
  meanTimeBetweenFailures: numeric('mean_time_between_failures'), // MTBF in hours
  overallHealthScore: numeric('overall_health_score'), // 0-100, composite health score
  rawSensorData: json('raw_sensor_data'), // Raw sensor readings
  failureProbability: numeric('failure_probability'), // 0-100%, likelihood of failure
  remainingUsefulLife: numeric('remaining_useful_life'), // Estimated days of operational life
  recommendedMaintenanceDate: timestamp('recommended_maintenance_date'), // Next suggested maintenance
  healthStatus: text('health_status'), // 'good', 'fair', 'poor', 'critical'
  statusReason: text('status_reason'), // Why the current status was assigned
  alertLevel: text('alert_level'), // 'none', 'warning', 'alert', 'critical'
  anomalyDetected: boolean('anomaly_detected').default(false), // Is current state anomalous?
  anomalyDescription: text('anomaly_description'), // Description of detected anomaly
  predictionHorizon: integer('prediction_horizon'), // Days the prediction looks ahead
  predictionConfidence: numeric('prediction_confidence'), // 0-100%, confidence in predictions
  dataQuality: text('data_quality'), // 'high', 'medium', 'low', 'suspect'
  maintenanceRecommendation: text('maintenance_recommendation'), // Suggested maintenance action
  analyticsVersion: text('analytics_version'), // Version of analytics engine used
  additionalMetrics: json('additional_metrics'), // Device-specific additional metrics
});

export const deviceMaintenanceThresholds = pgTable('device_maintenance_thresholds', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  deviceTypeId: integer('device_type_id').references(() => deviceCatalog.id),
  metricName: text('metric_name').notNull(), // Name of the monitored metric
  warningThreshold: numeric('warning_threshold'), // Threshold for warning alerts
  criticalThreshold: numeric('critical_threshold'), // Threshold for critical alerts
  direction: text('direction').notNull(), // 'above', 'below', 'equal', 'between'
  secondaryThreshold: numeric('secondary_threshold'), // For 'between' thresholds
  timeThreshold: integer('time_threshold'), // Minutes threshold must be exceeded
  combinationLogic: json('combination_logic'), // Rules for combining with other thresholds
  enabled: boolean('enabled').default(true),
  alertMessage: text('alert_message'), // Message to display when threshold is exceeded
  alertActions: json('alert_actions'), // Actions to take when threshold is exceeded
  lastUpdated: timestamp('last_updated').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  severity: maintenanceSeverityEnum('severity').default('medium'),
  description: text('description'),
  unit: text('unit'), // Unit of measurement (e.g., %, °C, V)
  relatedComponentId: text('related_component_id'), // Component this threshold monitors
  category: text('category'), // Categorization of threshold
  autoLearned: boolean('auto_learned').default(false), // Was threshold automatically determined?
  learningPeriodDays: integer('learning_period_days'), // Days used for auto-learning
  parentThresholdId: integer('parent_threshold_id'), 
  isModelBased: boolean('is_model_based').default(false), // Uses ML model instead of simple threshold
  modelId: text('model_id'), // Reference to the ML model used
  modelParameters: json('model_parameters'), // Parameters for the model
});

export const deviceMaintenancePredictions = pgTable('device_maintenance_predictions', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  metricName: text('metric_name').notNull(),
  predictionType: text('prediction_type').notNull(), // 'failure', 'degradation', 'maintenance_needed'
  predictedAt: timestamp('predicted_at').defaultNow(),
  predictionForTimestamp: timestamp('prediction_for_timestamp').notNull(), // When the event is predicted to happen
  probabilityPercentage: numeric('probability_percentage'), // 0-100
  confidenceScore: numeric('confidence_score'), // 0-100
  predictionHorizonDays: integer('prediction_horizon_days'), // How many days ahead prediction looks
  algorithmUsed: text('algorithm_used'), // Algorithm/model used for prediction
  modelVersion: text('model_version'),
  featureImportance: json('feature_importance'), // Which metrics influenced the prediction most
  rawPredictionData: json('raw_prediction_data'), // Raw output from prediction model
  predictedValue: numeric('predicted_value'), // Actual predicted value
  lowerBound: numeric('lower_bound'), // Prediction lower bound
  upperBound: numeric('upper_bound'), // Prediction upper bound
  actualValue: numeric('actual_value'), // Value actually observed (for validation)
  predictionAccuracy: numeric('prediction_accuracy'), // How accurate was this prediction
  predictionStatus: text('prediction_status').default('active'), // 'active', 'expired', 'validated', 'invalid'
  affectedComponents: json('affected_components'), // Component(s) prediction applies to
  recommendedActions: json('recommended_actions'), // Recommended maintenance actions
  potentialImpact: text('potential_impact'), // Impact if issue not addressed
  estimatedMaintenanceCost: numeric('estimated_maintenance_cost'), // Cost if addressed now
  estimatedReplacementCost: numeric('estimated_replacement_cost'), // Cost if replaced
  estimatedDowntimeHours: numeric('estimated_downtime_hours'), // Expected downtime
  businessImpactScore: numeric('business_impact_score'), // 0-100, impact on operations
  validatedBy: integer('validated_by').references(() => users.id), // User who validated prediction
  notes: text('notes'),
});

export const deviceMaintenanceModels = pgTable('device_maintenance_models', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  deviceType: deviceTypeEnum('device_type').notNull(),
  algorithm: text('algorithm').notNull(), // 'random_forest', 'lstm', 'xgboost', etc.
  targetMetric: text('target_metric').notNull(), // Metric the model predicts
  predictionType: text('prediction_type').notNull(), // 'regression', 'classification', 'anomaly'
  featuresUsed: json('features_used'), // Input features for the model
  hyperparameters: json('hyperparameters'), // Model hyperparameters
  trainingDataStartDate: timestamp('training_data_start_date'),
  trainingDataEndDate: timestamp('training_data_end_date'),
  trainingDatasetSize: integer('training_dataset_size'),
  validationAccuracy: numeric('validation_accuracy'),
  errorMetrics: json('error_metrics'), // RMSE, MAE, etc.
  lastTrainingDate: timestamp('last_training_date').defaultNow(),
  lastEvaluationDate: timestamp('last_evaluation_date'),
  deploymentStatus: text('deployment_status').default('development'), // 'development', 'staging', 'production'
  version: text('version').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  retrainingFrequency: text('retraining_frequency'), // 'daily', 'weekly', 'monthly', 'quarterly'
  lastRetrainingScore: numeric('last_retraining_score'), // Score improvement from last retraining
  modelStoragePath: text('model_storage_path'), // Where model weights/definition is stored
  isActive: boolean('is_active').default(true),
  dependenciesVersion: json('dependencies_version'), // Versions of libraries/frameworks used
  modelFormat: text('model_format'), // 'tensorflow', 'pickle', 'onnx', etc.
  featureImportance: json('feature_importance'), // Importance of each feature
});

export const deviceMaintenanceAlerts = pgTable('device_maintenance_alerts', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  thresholdId: integer('threshold_id').references(() => deviceMaintenanceThresholds.id),
  predictionId: integer('prediction_id').references(() => deviceMaintenancePredictions.id),
  alertType: text('alert_type').notNull(), // 'threshold_exceeded', 'anomaly_detected', 'failure_predicted'
  severity: maintenanceSeverityEnum('severity').default('medium'),
  message: text('message').notNull(),
  triggeredAt: timestamp('triggered_at').defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: integer('acknowledged_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolutionNotes: text('resolution_notes'),
  notificationSent: boolean('notification_sent').default(false),
  notificationChannels: json('notification_channels'), // Which channels were used
  triggerValue: numeric('trigger_value'), // Value that triggered the alert
  thresholdValue: numeric('threshold_value'), // Threshold that was exceeded
  metricName: text('metric_name'), // Name of the metric that triggered the alert
  silencedUntil: timestamp('silenced_until'), // Temporarily silenced until this time
  silencedBy: integer('silenced_by').references(() => users.id),
  silenceReason: text('silence_reason'),
  relatedIssueId: integer('related_issue_id').references(() => deviceMaintenanceIssues.id),
  relatedAlertIds: json('related_alert_ids'), // IDs of related alerts
  alertContext: json('alert_context'), // Additional context about alert
  falsePositive: boolean('false_positive').default(false), // Was this a false positive?
  autoResolved: boolean('auto_resolved').default(false), // Was resolved automatically
  isRecurring: boolean('is_recurring').default(false), // Has happened before
  recurrenceCount: integer('recurrence_count').default(0), // How many times it has occurred
  firstOccurrence: timestamp('first_occurrence'), // When first occurred
  businessImpact: text('business_impact'), // Assessed impact on business
});

export const deviceMaintenanceSchedules = pgTable('device_maintenance_schedules', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: maintenanceTypeEnum('type').default('preventive'),
  frequency: text('frequency').notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'custom'
  intervalDays: integer('interval_days'), // For custom frequency
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  nextDueDate: date('next_due_date'),
  lastCompletedDate: date('last_completed_date'),
  assignedTo: integer('assigned_to').references(() => users.id),
  estimatedDurationHours: numeric('estimated_duration_hours'),
  estimatedCost: numeric('estimated_cost'),
  costCurrency: text('cost_currency').default('USD'),
  instructions: text('instructions'),
  checklistItems: json('checklist_items'), // Array of tasks to complete
  documentationLinks: json('documentation_links'), // Links to relevant documentation
  requiredTools: json('required_tools'), // Tools needed for maintenance
  requiredParts: json('required_parts'), // Parts needed for maintenance
  requiredSkills: json('required_skills'), // Skills required for maintenance
  safetyProcedures: text('safety_procedures'),
  priorityLevel: text('priority_level').default('medium'), // 'low', 'medium', 'high', 'critical'
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  notificationDays: integer('notification_days').default(7), // Days before to send notification
  notificationRecipients: json('notification_recipients'), // Who to notify
  lastModifiedBy: integer('last_modified_by').references(() => users.id),
  seasonalAdjustment: json('seasonal_adjustment'), // Adjustments for seasonal factors
  integrationReference: text('integration_reference'), // Reference in external system
  compliance: text('compliance'), // Compliance requirements this schedule satisfies
  managementApproval: boolean('management_approval').default(false), // Requires management approval
  performanceMetricTargets: json('performance_metric_targets'), // Expected performance after maintenance
});

// Maintenance types
export const insertDeviceMaintenanceIssueSchema = createInsertSchema(deviceMaintenanceIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDeviceHealthMetricsSchema = createInsertSchema(deviceHealthMetrics).omit({
  id: true,
  timestamp: true
});

export const insertDeviceMaintenanceThresholdsSchema = createInsertSchema(deviceMaintenanceThresholds).omit({
  id: true,
  lastUpdated: true
});

export const insertDeviceMaintenancePredictionsSchema = createInsertSchema(deviceMaintenancePredictions).omit({
  id: true,
  predictedAt: true
});

export const insertDeviceMaintenanceModelsSchema = createInsertSchema(deviceMaintenanceModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTrainingDate: true
});

export const insertDeviceMaintenanceAlertsSchema = createInsertSchema(deviceMaintenanceAlerts).omit({
  id: true,
  triggeredAt: true
});

export const insertDeviceMaintenanceSchedulesSchema = createInsertSchema(deviceMaintenanceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type DeviceMaintenanceIssue = typeof deviceMaintenanceIssues.$inferSelect;
export type InsertDeviceMaintenanceIssue = z.infer<typeof insertDeviceMaintenanceIssueSchema>;

export type DeviceHealthMetrics = typeof deviceHealthMetrics.$inferSelect;
export type InsertDeviceHealthMetrics = z.infer<typeof insertDeviceHealthMetricsSchema>;

export type DeviceMaintenanceThreshold = typeof deviceMaintenanceThresholds.$inferSelect;
export type InsertDeviceMaintenanceThreshold = z.infer<typeof insertDeviceMaintenanceThresholdsSchema>;

export type DeviceMaintenancePrediction = typeof deviceMaintenancePredictions.$inferSelect;
export type InsertDeviceMaintenancePrediction = z.infer<typeof insertDeviceMaintenancePredictionsSchema>;

export type DeviceMaintenanceModel = typeof deviceMaintenanceModels.$inferSelect;
export type InsertDeviceMaintenanceModel = z.infer<typeof insertDeviceMaintenanceModelsSchema>;

export type DeviceMaintenanceAlert = typeof deviceMaintenanceAlerts.$inferSelect;
export type InsertDeviceMaintenanceAlert = z.infer<typeof insertDeviceMaintenanceAlertsSchema>;

export type DeviceMaintenanceSchedule = typeof deviceMaintenanceSchedules.$inferSelect;
export type InsertDeviceMaintenanceSchedule = z.infer<typeof insertDeviceMaintenanceSchedulesSchema>;

// Relations for maintenance tables
export const deviceMaintenanceIssuesRelations = relations(deviceMaintenanceIssues, ({ one, many }) => ({
  device: one(devices, {
    fields: [deviceMaintenanceIssues.deviceId],
    references: [devices.id]
  }),
  assignedToUser: one(users, {
    fields: [deviceMaintenanceIssues.assignedTo],
    references: [users.id]
  }),
  createdByUser: one(users, {
    fields: [deviceMaintenanceIssues.createdBy],
    references: [users.id]
  }),
  alerts: many(deviceMaintenanceAlerts)
}));

export const deviceHealthMetricsRelations = relations(deviceHealthMetrics, ({ one }) => ({
  device: one(devices, {
    fields: [deviceHealthMetrics.deviceId],
    references: [devices.id]
  })
}));

export const deviceMaintenanceThresholdsRelations = relations(deviceMaintenanceThresholds, ({ one, many }) => ({
  device: one(devices, {
    fields: [deviceMaintenanceThresholds.deviceId],
    references: [devices.id]
  }),
  deviceType: one(deviceCatalog, {
    fields: [deviceMaintenanceThresholds.deviceTypeId],
    references: [deviceCatalog.id]
  }),
  createdByUser: one(users, {
    fields: [deviceMaintenanceThresholds.createdBy],
    references: [users.id]
  }),
  alerts: many(deviceMaintenanceAlerts)
}));

export const deviceMaintenancePredictionsRelations = relations(deviceMaintenancePredictions, ({ one, many }) => ({
  device: one(devices, {
    fields: [deviceMaintenancePredictions.deviceId],
    references: [devices.id]
  }),
  validatedByUser: one(users, {
    fields: [deviceMaintenancePredictions.validatedBy],
    references: [users.id]
  }),
  alerts: many(deviceMaintenanceAlerts)
}));

export const deviceMaintenanceModelsRelations = relations(deviceMaintenanceModels, ({ one }) => ({
  createdByUser: one(users, {
    fields: [deviceMaintenanceModels.createdBy],
    references: [users.id]
  })
}));

export const deviceMaintenanceAlertsRelations = relations(deviceMaintenanceAlerts, ({ one }) => ({
  device: one(devices, {
    fields: [deviceMaintenanceAlerts.deviceId],
    references: [devices.id]
  }),
  threshold: one(deviceMaintenanceThresholds, {
    fields: [deviceMaintenanceAlerts.thresholdId],
    references: [deviceMaintenanceThresholds.id]
  }),
  prediction: one(deviceMaintenancePredictions, {
    fields: [deviceMaintenanceAlerts.predictionId],
    references: [deviceMaintenancePredictions.id]
  }),
  issue: one(deviceMaintenanceIssues, {
    fields: [deviceMaintenanceAlerts.relatedIssueId],
    references: [deviceMaintenanceIssues.id]
  }),
  acknowledgedByUser: one(users, {
    fields: [deviceMaintenanceAlerts.acknowledgedBy],
    references: [users.id]
  }),
  resolvedByUser: one(users, {
    fields: [deviceMaintenanceAlerts.resolvedBy],
    references: [users.id]
  }),
  silencedByUser: one(users, {
    fields: [deviceMaintenanceAlerts.silencedBy],
    references: [users.id]
  })
}));

export const deviceMaintenanceSchedulesRelations = relations(deviceMaintenanceSchedules, ({ one }) => ({
  device: one(devices, {
    fields: [deviceMaintenanceSchedules.deviceId],
    references: [devices.id]
  }),
  assignedToUser: one(users, {
    fields: [deviceMaintenanceSchedules.assignedTo],
    references: [users.id]
  }),
  createdByUser: one(users, {
    fields: [deviceMaintenanceSchedules.createdBy],
    references: [users.id]
  }),
  lastModifiedByUser: one(users, {
    fields: [deviceMaintenanceSchedules.lastModifiedBy],
    references: [users.id]
  })
}));

// Partner types
export const insertPartnerSchema = createInsertSchema(partners).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;