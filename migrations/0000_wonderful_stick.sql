CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('new', 'acknowledged', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."command_status" AS ENUM('pending', 'sent', 'delivered', 'executed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."demand_response_event_status" AS ENUM('scheduled', 'pending', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."demand_response_participation" AS ENUM('opt_in', 'opt_out', 'automatic');--> statement-breakpoint
CREATE TYPE "public"."demand_response_program_type" AS ENUM('critical_peak_pricing', 'peak_time_rebate', 'direct_load_control', 'capacity_bidding', 'emergency_response', 'economic_dispatch');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('online', 'offline', 'error', 'maintenance', 'idle');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('solar_pv', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump');--> statement-breakpoint
CREATE TYPE "public"."ev_charging_mode" AS ENUM('solar_only', 'balanced', 'fast', 'scheduled', 'v2g');--> statement-breakpoint
CREATE TYPE "public"."event_log_type" AS ENUM('system', 'user', 'device', 'security', 'optimization', 'demand_response');--> statement-breakpoint
CREATE TYPE "public"."forecast_type" AS ENUM('generation', 'consumption', 'price');--> statement-breakpoint
CREATE TYPE "public"."grid_connection_type" AS ENUM('single_phase', 'three_phase', 'split_phase');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('alert', 'system', 'update', 'billing', 'optimization');--> statement-breakpoint
CREATE TYPE "public"."optimization_mode" AS ENUM('cost_saving', 'self_sufficiency', 'peak_shaving', 'carbon_reduction', 'grid_relief');--> statement-breakpoint
CREATE TYPE "public"."weather_condition" AS ENUM('clear', 'clouds', 'rain', 'snow', 'thunderstorm', 'drizzle', 'mist', 'fog', 'haze', 'dust', 'smoke', 'tornado');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"device_id" integer,
	"user_id" integer,
	"timestamp" timestamp DEFAULT now(),
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" "alert_severity" DEFAULT 'info',
	"status" "alert_status" DEFAULT 'new',
	"data" json,
	"resolved_at" timestamp,
	"resolved_by" integer
);
--> statement-breakpoint
CREATE TABLE "demand_response_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"participation_id" integer NOT NULL,
	"device_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"set_point" numeric,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"estimated_reduction" numeric,
	"actual_reduction" numeric,
	"status" text DEFAULT 'scheduled',
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "demand_response_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer,
	"name" text NOT NULL,
	"description" text,
	"status" "demand_response_event_status" DEFAULT 'scheduled',
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"notification_time" timestamp,
	"target_reduction" numeric,
	"actual_reduction" numeric,
	"incentive_modifier" numeric DEFAULT 1,
	"notes" text,
	"is_emergency" boolean DEFAULT false,
	"weather_conditions" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "demand_response_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"description" text,
	"program_type" "demand_response_program_type" NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"notification_lead_time" integer,
	"min_reduction_amount" numeric,
	"max_reduction_amount" numeric,
	"incentive_rate" numeric,
	"incentive_type" text,
	"incentive_details" json,
	"terms" text,
	"is_active" boolean DEFAULT true,
	"max_event_duration" integer,
	"max_events_per_year" integer,
	"max_events_per_month" integer,
	"default_participation" "demand_response_participation" DEFAULT 'opt_in',
	"eligibility_requirements" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"power" numeric,
	"energy" numeric,
	"state_of_charge" numeric,
	"voltage" numeric,
	"current" numeric,
	"frequency" numeric,
	"temperature" numeric,
	"additional_data" json
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "device_type" NOT NULL,
	"model" text,
	"manufacturer" text,
	"serial_number" text,
	"firmware_version" text,
	"capacity" numeric,
	"status" "device_status" DEFAULT 'offline',
	"ip_address" text,
	"connection_protocol" text,
	"settings" json,
	"site_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "energy_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"forecast_date" timestamp NOT NULL,
	"forecast_type" "forecast_type" NOT NULL,
	"value" numeric NOT NULL,
	"confidence" numeric,
	"algorithm" text,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "energy_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"grid_power" numeric,
	"solar_power" numeric,
	"battery_power" numeric,
	"ev_power" numeric,
	"home_power" numeric,
	"grid_energy" numeric,
	"solar_energy" numeric,
	"battery_energy" numeric,
	"ev_energy" numeric,
	"home_energy" numeric,
	"self_sufficiency" numeric,
	"carbon" numeric
);
--> statement-breakpoint
CREATE TABLE "event_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"event_type" "event_log_type" NOT NULL,
	"message" text NOT NULL,
	"user_id" integer,
	"device_id" integer,
	"site_id" integer,
	"metadata" json,
	"severity" text DEFAULT 'info',
	"source_ip" text
);
--> statement-breakpoint
CREATE TABLE "grid_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"connection_type" "grid_connection_type" DEFAULT 'single_phase',
	"capacity" numeric,
	"voltage" numeric,
	"phases" integer DEFAULT 1,
	"meter_number" text,
	"utility_company" text,
	"tariff_id" integer,
	"grid_export_enabled" boolean DEFAULT true,
	"grid_import_enabled" boolean DEFAULT true,
	"settings" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'system',
	"is_read" boolean DEFAULT false,
	"data" json,
	"linked_entity_id" integer,
	"linked_entity_type" text
);
--> statement-breakpoint
CREATE TABLE "optimization_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"mode" "optimization_mode" DEFAULT 'self_sufficiency',
	"peak_shaving_enabled" boolean DEFAULT false,
	"peak_shaving_target" numeric,
	"self_consumption_enabled" boolean DEFAULT true,
	"battery_arbitrage_enabled" boolean DEFAULT false,
	"v2g_enabled" boolean DEFAULT false,
	"vpp_enabled" boolean DEFAULT false,
	"p2p_enabled" boolean DEFAULT false,
	"demand_response_enabled" boolean DEFAULT false,
	"ai_recommendations_enabled" boolean DEFAULT true,
	"schedules" json,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "remote_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"user_id" integer,
	"timestamp" timestamp DEFAULT now(),
	"command" text NOT NULL,
	"parameters" json,
	"status" "command_status" DEFAULT 'pending',
	"status_message" text,
	"executed_at" timestamp,
	"expires_at" timestamp,
	"priority" integer DEFAULT 5
);
--> statement-breakpoint
CREATE TABLE "site_demand_response_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"is_enrolled" boolean DEFAULT false,
	"max_reduction_capacity" numeric,
	"default_participation" "demand_response_participation" DEFAULT 'opt_in',
	"auto_response_enabled" boolean DEFAULT true,
	"notification_email" text,
	"notification_sms" text,
	"notification_push" boolean DEFAULT true,
	"minimum_incentive_threshold" numeric,
	"device_priorities" json,
	"response_strategy" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_event_participations" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"participation_status" "demand_response_participation" DEFAULT 'opt_in',
	"baseline_consumption" numeric,
	"actual_consumption" numeric,
	"reduction_achieved" numeric,
	"incentive_earned" numeric,
	"incentive_status" text DEFAULT 'pending',
	"notes" text,
	"feedback" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"max_capacity" numeric,
	"grid_connection_point" numeric,
	"timezone" text DEFAULT 'UTC',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tariffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"name" text NOT NULL,
	"provider" text,
	"import_rate" numeric,
	"export_rate" numeric,
	"is_time_of_use" boolean DEFAULT false,
	"schedule_data" json,
	"data_interval_seconds" integer DEFAULT 60,
	"currency" text DEFAULT 'USD',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'viewer',
	"site_id" integer,
	"created_at" timestamp DEFAULT now(),
	"is_email_verified" boolean DEFAULT false,
	"verification_code" text,
	"verification_code_expiry" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weather_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"temperature" numeric,
	"humidity" numeric,
	"cloud_cover" numeric,
	"wind_speed" numeric,
	"wind_direction" numeric,
	"precipitation" numeric,
	"pressure" numeric,
	"uv_index" numeric,
	"sunrise_time" timestamp,
	"sunset_time" timestamp,
	"condition" "weather_condition",
	"icon" text,
	"is_forecasted" boolean DEFAULT false NOT NULL,
	"forecast_time" timestamp,
	"source" text DEFAULT 'openweathermap' NOT NULL,
	"location_name" text,
	"latitude" numeric,
	"longitude" numeric,
	"metadata" json
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_response_actions" ADD CONSTRAINT "demand_response_actions_participation_id_site_event_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."site_event_participations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_response_actions" ADD CONSTRAINT "demand_response_actions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_response_events" ADD CONSTRAINT "demand_response_events_program_id_demand_response_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."demand_response_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_readings" ADD CONSTRAINT "device_readings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_forecasts" ADD CONSTRAINT "energy_forecasts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grid_connections" ADD CONSTRAINT "grid_connections_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grid_connections" ADD CONSTRAINT "grid_connections_tariff_id_tariffs_id_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariffs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_settings" ADD CONSTRAINT "optimization_settings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_commands" ADD CONSTRAINT "remote_commands_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_commands" ADD CONSTRAINT "remote_commands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_demand_response_settings" ADD CONSTRAINT "site_demand_response_settings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_event_participations" ADD CONSTRAINT "site_event_participations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_event_participations" ADD CONSTRAINT "site_event_participations_event_id_demand_response_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."demand_response_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_data" ADD CONSTRAINT "weather_data_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;