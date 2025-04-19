// BMS database migration script
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting BMS migration...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Create BMS-related enums
    console.log('Creating BMS enums...');
    
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bms_protocol') THEN
          CREATE TYPE bms_protocol AS ENUM (
            'canbus', 'modbus_tcp', 'modbus_rtu', 'rs485', 'rs232', 
            'i2c', 'smbus', 'spi', 'proprietary'
          );
        END IF;
      END $$;
    `);
    
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'battery_cell_type') THEN
          CREATE TYPE battery_cell_type AS ENUM (
            'lithium_ion', 'lithium_iron_phosphate', 'lead_acid', 
            'nickel_metal_hydride', 'nickel_cadmium', 'flow_battery', 
            'sodium_ion', 'solid_state'
          );
        END IF;
      END $$;
    `);
    
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cell_balancing_method') THEN
          CREATE TYPE cell_balancing_method AS ENUM (
            'passive', 'active', 'dynamic', 'adaptive', 'none'
          );
        END IF;
      END $$;
    `);
    
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'battery_health_status') THEN
          CREATE TYPE battery_health_status AS ENUM (
            'excellent', 'good', 'fair', 'poor', 'critical', 'unknown'
          );
        END IF;
      END $$;
    `);
    
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'battery_test_type') THEN
          CREATE TYPE battery_test_type AS ENUM (
            'capacity_test', 'resistance_test', 'self_discharge_test',
            'pulse_test', 'thermal_stress_test', 'cycle_life_test'
          );
        END IF;
      END $$;
    `);
    
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'battery_test_status') THEN
          CREATE TYPE battery_test_status AS ENUM (
            'scheduled', 'in_progress', 'completed', 'failed', 'interrupted'
          );
        END IF;
      END $$;
    `);
    
    // Add BMS fields to devices table
    console.log('Adding BMS fields to devices table...');
    
    const deviceBmsFields = [
      'bms_protocol bms_protocol',
      'bms_connection_details jsonb',
      'battery_cell_type battery_cell_type',
      'cell_count integer',
      'cell_balancing_method cell_balancing_method',
      'battery_health_status battery_health_status DEFAULT \'unknown\'',
      'nominal_voltage numeric',
      'nominal_capacity numeric',
      'max_charge_current numeric',
      'max_discharge_current numeric',
      'max_charge_voltage numeric',
      'min_discharge_voltage numeric'
    ];
    
    for (const field of deviceBmsFields) {
      const [columnName, columnType] = field.split(' ');
      
      // Check if the column exists before adding
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'devices' AND column_name = $1
        );
      `, [columnName]);
      
      if (!columnExists.rows[0].exists) {
        await client.query(`
          ALTER TABLE devices
          ADD COLUMN ${columnName} ${columnType};
        `);
        console.log(`Added ${columnName} to devices table`);
      } else {
        console.log(`Column ${columnName} already exists in devices table`);
      }
    }
    
    // Create battery telemetry table
    console.log('Creating battery telemetry table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS battery_telemetry (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        timestamp TIMESTAMP DEFAULT NOW(),
        
        state_of_charge NUMERIC,
        state_of_health NUMERIC,
        remaining_capacity NUMERIC,
        cycle_count NUMERIC,
        
        min_cell_voltage NUMERIC,
        max_cell_voltage NUMERIC,
        avg_cell_voltage NUMERIC,
        cell_voltage_delta NUMERIC,
        cell_voltages JSONB,
        cell_temperatures JSONB,
        cell_balancing_status JSONB,
        
        total_voltage NUMERIC,
        current_charge NUMERIC,
        current_discharge NUMERIC,
        instant_power NUMERIC,
        
        min_temperature NUMERIC,
        max_temperature NUMERIC,
        avg_temperature NUMERIC,
        cooling_status TEXT,
        heating_status TEXT,
        
        internal_resistance NUMERIC,
        power_available NUMERIC,
        time_to_full_charge NUMERIC,
        estimated_time_remaining NUMERIC,
        
        alarm_states JSONB,
        warning_states JSONB,
        bms_status TEXT,
        protection_status JSONB,
        
        charge_efficiency NUMERIC,
        thermal_loss NUMERIC,
        
        predicted_remaining_capacity NUMERIC,
        estimated_remaining_lifetime NUMERIC,
        
        sampling_rate TEXT,
        data_quality TEXT,
        
        raw_bms_data JSONB,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create battery capacity tests table
    console.log('Creating battery capacity tests table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS battery_capacity_tests (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        test_type battery_test_type DEFAULT 'capacity_test',
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        status battery_test_status DEFAULT 'in_progress',
        
        initial_soc NUMERIC,
        target_soc NUMERIC,
        ambient_temperature NUMERIC,
        
        charge_rate NUMERIC,
        discharge_rate NUMERIC,
        min_voltage NUMERIC,
        max_voltage NUMERIC,
        charge_current_limit NUMERIC,
        discharge_current_limit NUMERIC,
        
        measured_capacity NUMERIC,
        theoretical_capacity NUMERIC,
        capacity_retention NUMERIC,
        average_temperature NUMERIC,
        peak_temperature NUMERIC,
        internal_resistance NUMERIC,
        energy_efficiency NUMERIC,
        
        state_of_health NUMERIC,
        predicted_remaining_cycles INTEGER,
        ageing_factor NUMERIC,
        temperature_impact NUMERIC,
        anomaly_detected BOOLEAN DEFAULT FALSE,
        anomaly_description TEXT,
        
        raw_test_data JSONB,
        test_report TEXT,
        
        test_method TEXT,
        test_equipment TEXT,
        test_operator INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create battery lifecycle events table
    console.log('Creating battery lifecycle events table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS battery_lifecycle_events (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        timestamp TIMESTAMP DEFAULT NOW(),
        
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        description TEXT NOT NULL,
        
        capacity_impact NUMERIC,
        resistance_impact NUMERIC,
        lifetime_impact NUMERIC,
        
        start_soc NUMERIC,
        end_soc NUMERIC,
        min_soc NUMERIC,
        max_soc NUMERIC,
        
        average_temperature NUMERIC,
        max_temperature NUMERIC,
        
        average_current NUMERIC,
        peak_current NUMERIC,
        
        duration INTEGER,
        energy_throughput NUMERIC,
        
        ambient_temperature NUMERIC,
        humidity NUMERIC,
        
        charge_mode TEXT,
        application_context TEXT,
        
        raw_event_data JSONB,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create battery thermal events table
    console.log('Creating battery thermal events table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS battery_thermal_events (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        timestamp TIMESTAMP DEFAULT NOW(),
        
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'warning',
        description TEXT NOT NULL,
        
        max_temperature NUMERIC,
        min_temperature NUMERIC,
        avg_temperature NUMERIC,
        temperature_rise_rate NUMERIC,
        temperature_variance NUMERIC,
        
        cooling_system_active BOOLEAN DEFAULT FALSE,
        cooling_power NUMERIC,
        cooling_efficiency NUMERIC,
        
        ambient_temperature NUMERIC,
        solar_radiation NUMERIC,
        airflow_rate NUMERIC,
        
        state_of_charge NUMERIC,
        charge_rate NUMERIC,
        discharge_rate NUMERIC,
        current NUMERIC,
        
        actions_taken JSONB,
        response_latency INTEGER,
        mitigation_effectiveness NUMERIC,
        
        estimated_capacity_impact NUMERIC,
        estimated_lifetime_impact NUMERIC,
        
        duration INTEGER,
        time_to_resolution INTEGER,
        
        thermal_image_url TEXT,
        raw_thermal_data JSONB,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Update event_log_type enum to include battery events
    console.log('Updating event_log_type enum...');
    
    await client.query(`
      DO $$ 
      BEGIN
        -- Check if the enum already has the necessary values
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'event_log_type' AND e.enumlabel = 'battery_test'
        ) THEN
          -- Add the new enum values
          ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'battery_test';
          ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'battery_health';
        END IF;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error updating event_log_type enum: %', SQLERRM;
      END $$;
    `);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('BMS migration completed successfully!');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error in BMS migration:', error);
    throw error;
  } finally {
    client.release();
    // Close the pool
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});