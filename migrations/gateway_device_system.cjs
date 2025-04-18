// Gateway Device System Migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('Starting Gateway Device System migration...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Please provide a valid database connection string.');
    return;
  }
  
  // Create a connection to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Start a transaction
    await pool.query('BEGIN');
    
    console.log('Creating gateway_protocol enum...');
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gateway_protocol') THEN
          CREATE TYPE gateway_protocol AS ENUM (
            'mqtt',
            'http',
            'modbus_tcp',
            'modbus_rtu',
            'bacnet',
            'canbus',
            'zigbee',
            'zwave'
          );
        END IF;
      END$$;
    `);
    
    console.log('Modifying devices table to add gateway support...');
    await pool.query(`
      ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS gateway_id INTEGER REFERENCES devices(id),
      ADD COLUMN IF NOT EXISTS device_path TEXT;
    `);
    
    console.log('Creating gateway_devices table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gateway_devices (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        protocol gateway_protocol NOT NULL,
        ip_address TEXT,
        port INTEGER,
        username TEXT,
        password TEXT,
        api_key TEXT,
        mqtt_topic TEXT,
        mqtt_broker TEXT,
        mqtt_username TEXT,
        mqtt_password TEXT,
        mqtt_client_id TEXT,
        last_connected_at TIMESTAMP,
        connection_status TEXT DEFAULT 'disconnected',
        connection_error TEXT,
        heartbeat_interval INTEGER DEFAULT 60,
        auto_reconnect BOOLEAN DEFAULT TRUE,
        max_reconnect_attempts INTEGER DEFAULT 5,
        security_enabled BOOLEAN DEFAULT TRUE,
        tls_enabled BOOLEAN DEFAULT TRUE,
        certificate_path TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        additional_config JSONB
      );
    `);
    
    // Commit the transaction
    await pool.query('COMMIT');
    console.log('Gateway Device System migration completed successfully.');
  } catch (error) {
    // Roll back the transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Error in Gateway Device System migration:', error);
    throw error;
  } finally {
    // Release the connection
    await pool.end();
  }
}

module.exports = runMigration;