const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * This migration script creates the device registry and provisioning tables.
 */

// Load database connection string from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle(pool);

    // Create the SQL for the migration
    console.log('Creating migration SQL...');
    const migrationSQL = `
    -- Create device registration status enum if not exists
    DO $$ BEGIN
      CREATE TYPE device_registration_status AS ENUM (
        'pending',
        'registered',
        'provisioning',
        'active',
        'decommissioned',
        'rejected'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Create device authentication method enum if not exists
    DO $$ BEGIN
      CREATE TYPE device_auth_method AS ENUM (
        'none',
        'api_key',
        'certificate',
        'username_password',
        'oauth',
        'token'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Create device registry table
    CREATE TABLE IF NOT EXISTS device_registry (
      id SERIAL PRIMARY KEY,
      device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
      registration_id UUID NOT NULL DEFAULT gen_random_uuid(),
      device_uid TEXT NOT NULL UNIQUE,
      registration_status device_registration_status DEFAULT 'pending',
      device_type device_type NOT NULL,
      firmware_version TEXT,
      last_connected TIMESTAMP,
      last_seen TIMESTAMP,
      metadata JSONB,
      location TEXT,
      location_coordinates TEXT,
      zone_id TEXT,
      is_online BOOLEAN DEFAULT FALSE,
      auth_method device_auth_method DEFAULT 'none',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create device credentials table
    CREATE TABLE IF NOT EXISTS device_credentials (
      id SERIAL PRIMARY KEY,
      device_registry_id INTEGER NOT NULL REFERENCES device_registry(id) ON DELETE CASCADE,
      auth_method device_auth_method NOT NULL,
      username TEXT,
      password_hash TEXT,
      api_key TEXT,
      api_secret TEXT,
      certificate_pem TEXT,
      private_key_pem TEXT,
      token_value TEXT,
      valid_until TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      last_rotated TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create provisioning templates table
    CREATE TABLE IF NOT EXISTS provisioning_templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      device_type device_type NOT NULL,
      config_template JSONB NOT NULL,
      firmware_version TEXT,
      auth_method device_auth_method DEFAULT 'api_key',
      default_settings JSONB,
      required_capabilities JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create registration codes table
    CREATE TABLE IF NOT EXISTS registration_codes (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      qr_code_data TEXT,
      registration_url TEXT,
      provisioning_template_id INTEGER REFERENCES provisioning_templates(id),
      device_type device_type,
      expires_at TIMESTAMP,
      is_one_time BOOLEAN DEFAULT TRUE,
      use_count INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Create provisioning history table
    CREATE TABLE IF NOT EXISTS provisioning_history (
      id SERIAL PRIMARY KEY,
      device_registry_id INTEGER REFERENCES device_registry(id),
      provisioning_template_id INTEGER REFERENCES provisioning_templates(id),
      registration_code_id INTEGER REFERENCES registration_codes(id),
      status TEXT NOT NULL,
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      error_message TEXT,
      provisioning_data JSONB,
      applied_configuration JSONB,
      performed_by TEXT,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_device_registry_device_id ON device_registry(device_id);
    CREATE INDEX IF NOT EXISTS idx_device_registry_device_uid ON device_registry(device_uid);
    CREATE INDEX IF NOT EXISTS idx_device_registry_registration_id ON device_registry(registration_id);
    CREATE INDEX IF NOT EXISTS idx_device_registry_device_type ON device_registry(device_type);
    CREATE INDEX IF NOT EXISTS idx_device_registry_registration_status ON device_registry(registration_status);

    CREATE INDEX IF NOT EXISTS idx_device_credentials_device_registry_id ON device_credentials(device_registry_id);
    CREATE INDEX IF NOT EXISTS idx_device_credentials_auth_method ON device_credentials(auth_method);

    CREATE INDEX IF NOT EXISTS idx_provisioning_templates_device_type ON provisioning_templates(device_type);
    CREATE INDEX IF NOT EXISTS idx_provisioning_templates_is_active ON provisioning_templates(is_active);

    CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);
    CREATE INDEX IF NOT EXISTS idx_registration_codes_device_type ON registration_codes(device_type);
    CREATE INDEX IF NOT EXISTS idx_registration_codes_is_active ON registration_codes(is_active);

    CREATE INDEX IF NOT EXISTS idx_provisioning_history_device_registry_id ON provisioning_history(device_registry_id);
    CREATE INDEX IF NOT EXISTS idx_provisioning_history_template_id ON provisioning_history(provisioning_template_id);
    `;

    // Execute the migration SQL
    console.log('Executing migration SQL...');
    await db.execute(migrationSQL);

    console.log('Migration completed successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();