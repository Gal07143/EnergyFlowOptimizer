// Device Registry migration
// @ts-check

/**
 * @param {import('pg').Client} client
 */
module.exports = async function(client) {
  console.log('Running device registry migration...');

  // Create enums
  await client.query(`
    DO $$ BEGIN
      -- Device type enum
      CREATE TYPE device_type AS ENUM (
        'solar_pv',
        'battery_storage',
        'ev_charger',
        'smart_meter',
        'heat_pump',
        'inverter',
        'load_controller',
        'energy_gateway'
      );
      
      -- Device registration status enum
      CREATE TYPE device_registration_status AS ENUM (
        'pending',
        'registered',
        'provisioning',
        'active',
        'decommissioned',
        'rejected'
      );
      
      -- Device auth method enum
      CREATE TYPE device_auth_method AS ENUM (
        'none',
        'api_key',
        'certificate',
        'username_password',
        'oauth',
        'token'
      );
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END $$;
  `);

  // Create device registry table
  await client.query(`
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
  `);

  // Create device credentials table
  await client.query(`
    CREATE TABLE IF NOT EXISTS device_credentials (
      id SERIAL PRIMARY KEY,
      device_registry_id INTEGER REFERENCES device_registry(id) ON DELETE CASCADE NOT NULL,
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
  `);

  // Create provisioning templates table
  await client.query(`
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
  `);

  // Create registration codes table
  await client.query(`
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
  `);

  // Create provisioning history table
  await client.query(`
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
  `);

  // Add sample data for development (only if tables are empty)
  const { rows: devicesCount } = await client.query('SELECT COUNT(*) FROM device_registry');
  
  if (parseInt(devicesCount[0].count) === 0) {
    console.log('Adding sample device registry data...');
    
    // Sample provisioning templates
    await client.query(`
      INSERT INTO provisioning_templates 
        (name, description, device_type, config_template, firmware_version, auth_method, default_settings, required_capabilities)
      VALUES
        (
          'Standard Solar PV Template', 
          'Default template for solar PV installations', 
          'solar_pv', 
          '{"mqtt_topic_prefix": "devices/solar", "reporting_interval": 60, "power_limit": 5000}', 
          '1.2.0', 
          'api_key', 
          '{"max_power": 5000, "overcurrent_protection": true}',
          '["voltage_reading", "current_reading", "power_reading"]'
        ),
        (
          'EV Charger Standard Setup', 
          'Template for EV chargers with load management', 
          'ev_charger', 
          '{"mqtt_topic_prefix": "devices/evcharger", "reporting_interval": 30, "max_current": 32}', 
          '2.1.5', 
          'certificate', 
          '{"max_charge_current": 32, "phase_rotation": "auto"}',
          '["current_reading", "session_management", "load_management"]'
        ),
        (
          'Home Battery System', 
          'Template for residential battery storage systems', 
          'battery_storage', 
          '{"mqtt_topic_prefix": "devices/battery", "reporting_interval": 60, "min_soc": 20, "max_soc": 90}', 
          '3.0.1', 
          'username_password', 
          '{"charge_limit": 90, "discharge_limit": 20, "priority": "self_consumption"}',
          '["soc_reading", "power_reading", "temperature_reading"]'
        );
    `);
    
    // Sample registration codes
    await client.query(`
      INSERT INTO registration_codes 
        (code, device_type, provisioning_template_id, is_one_time, max_uses, is_active, expires_at)
      VALUES
        (
          'SOLAR-REG-123456', 
          'solar_pv', 
          1, 
          TRUE, 
          1, 
          TRUE, 
          NOW() + INTERVAL '30 days'
        ),
        (
          'EV-CHARGER-789012', 
          'ev_charger', 
          2, 
          TRUE, 
          1, 
          TRUE, 
          NOW() + INTERVAL '30 days'
        ),
        (
          'MULTI-USE-BATTERY', 
          'battery_storage', 
          3, 
          FALSE, 
          10, 
          TRUE, 
          NOW() + INTERVAL '90 days'
        );
    `);
    
    // Generate QR codes (in a real implementation, this would be handled by the service)
    await client.query(`
      UPDATE registration_codes
      SET 
        qr_code_data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        registration_url = CONCAT('https://ems.example.com/device-register?code=', code);
    `);
    
    // Sample device registrations
    await client.query(`
      INSERT INTO device_registry 
        (device_uid, registration_status, device_type, firmware_version, location, is_online, auth_method)
      VALUES
        (
          'SOLAR-INV-001', 
          'active', 
          'solar_pv', 
          '1.2.0', 
          'Roof - South Facing', 
          TRUE, 
          'api_key'
        ),
        (
          'EV-CHARGER-002', 
          'provisioning', 
          'ev_charger', 
          '2.1.5', 
          'Garage - East Wall', 
          FALSE, 
          'certificate'
        ),
        (
          'BATTERY-SYS-003', 
          'registered', 
          'battery_storage', 
          '3.0.1', 
          'Utility Room', 
          TRUE, 
          'username_password'
        ),
        (
          'SMART-METER-004', 
          'pending', 
          'smart_meter', 
          '1.0.5', 
          'Main Electrical Panel', 
          FALSE, 
          'none'
        );
    `);
    
    // Sample device credentials
    await client.query(`
      INSERT INTO device_credentials 
        (device_registry_id, auth_method, api_key, api_secret, username, password_hash, certificate_pem, is_active)
      VALUES
        (
          1, 
          'api_key', 
          'sk_test_solar_123456789abcdef', 
          'ss_test_solar_secret_123456789', 
          NULL, 
          NULL, 
          NULL, 
          TRUE
        ),
        (
          3, 
          'username_password', 
          NULL, 
          NULL, 
          'battery_system', 
          '$2b$10$abcdefghijklmnopqrstuvwxyz123456789ABCDEFG', 
          NULL, 
          TRUE
        );
    `);
    
    // Sample provisioning history
    await client.query(`
      INSERT INTO provisioning_history 
        (device_registry_id, provisioning_template_id, registration_code_id, status, started_at, completed_at, provisioning_data, applied_configuration)
      VALUES
        (
          1, 
          1, 
          1, 
          'success', 
          NOW() - INTERVAL '2 days', 
          NOW() - INTERVAL '2 days' + INTERVAL '5 minutes', 
          '{"device_id": 1, "template_id": 1, "user_id": 1}', 
          '{"mqtt_topic_prefix": "devices/solar", "reporting_interval": 60, "power_limit": 5000, "max_power": 5000, "overcurrent_protection": true}'
        ),
        (
          2, 
          2, 
          2, 
          'in_progress', 
          NOW() - INTERVAL '30 minutes', 
          NULL, 
          '{"device_id": 2, "template_id": 2, "user_id": 1}', 
          NULL
        ),
        (
          4, 
          NULL, 
          NULL, 
          'failed', 
          NOW() - INTERVAL '1 day', 
          NOW() - INTERVAL '1 day' + INTERVAL '2 minutes', 
          '{"device_id": 4, "user_id": 1}', 
          NULL
        );
    `);
  }

  console.log('Device registry migration completed successfully');
};