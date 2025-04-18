/**
 * Migration to enhance the schema with improved time series data structure
 * @param {import('pg').Client} client 
 */
async function runMigration(client) {
  console.log('Running enhanced time series data migration...');

  try {
    // Start transaction
    await client.query('BEGIN');

    // Add new columns to energy_readings table
    const energyReadingsAlterColumns = `
      ALTER TABLE energy_readings
      ADD COLUMN IF NOT EXISTS efficiency NUMERIC,
      ADD COLUMN IF NOT EXISTS peak_power NUMERIC,
      ADD COLUMN IF NOT EXISTS cost_saving NUMERIC,
      ADD COLUMN IF NOT EXISTS grid_cost NUMERIC,
      ADD COLUMN IF NOT EXISTS sampling_rate TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS data_quality TEXT DEFAULT 'validated',
      ADD COLUMN IF NOT EXISTS storage_tier TEXT DEFAULT 'hot',
      ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS aggregation_period TEXT,
      ADD COLUMN IF NOT EXISTS aggregation_method TEXT,
      ADD COLUMN IF NOT EXISTS source_readings JSONB,
      ADD COLUMN IF NOT EXISTS weather_data JSONB,
      ADD COLUMN IF NOT EXISTS additional_data JSONB;
    `;
    await client.query(energyReadingsAlterColumns);
    console.log('Enhanced energy_readings table');
    
    // Add new columns to device_readings table
    const deviceReadingsAlterColumns = `
      ALTER TABLE device_readings
      ADD COLUMN IF NOT EXISTS humidity NUMERIC,
      ADD COLUMN IF NOT EXISTS pressure NUMERIC,
      ADD COLUMN IF NOT EXISTS irradiance NUMERIC,
      ADD COLUMN IF NOT EXISTS wind_speed NUMERIC,
      ADD COLUMN IF NOT EXISTS wind_direction NUMERIC,
      ADD COLUMN IF NOT EXISTS rain_intensity NUMERIC,
      ADD COLUMN IF NOT EXISTS noise_level NUMERIC,
      ADD COLUMN IF NOT EXISTS air_quality_index NUMERIC,
      ADD COLUMN IF NOT EXISTS co2_level NUMERIC,
      ADD COLUMN IF NOT EXISTS operational_mode TEXT,
      ADD COLUMN IF NOT EXISTS sampling_rate TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS data_quality TEXT DEFAULT 'validated',
      ADD COLUMN IF NOT EXISTS storage_tier TEXT DEFAULT 'hot',
      ADD COLUMN IF NOT EXISTS retention_category TEXT DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS aggregation_period TEXT,
      ADD COLUMN IF NOT EXISTS aggregation_method TEXT,
      ADD COLUMN IF NOT EXISTS source_readings JSONB,
      ADD COLUMN IF NOT EXISTS weather_data JSONB,
      ADD COLUMN IF NOT EXISTS additional_data JSONB;
    `;
    await client.query(deviceReadingsAlterColumns);
    console.log('Enhanced device_readings table');

    // Create the event category enum type if it doesn't exist
    const eventCategoryEnumCreate = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_category') THEN
          CREATE TYPE event_category AS ENUM (
            'informational',
            'operational',
            'maintenance',
            'security',
            'performance',
            'error',
            'audit'
          );
        END IF;
      END
      $$;
    `;
    await client.query(eventCategoryEnumCreate);
    console.log('Created event_category enum type if it did not exist');

    // Enhance event_log_type enum if it exists
    const eventLogTypeUpdate = `
      DO $$
      BEGIN
        -- Check if the enum exists
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_log_type') THEN
          -- Add new values to the enum if they don't exist
          BEGIN
            ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'alarm';
            EXCEPTION WHEN duplicate_object THEN NULL;
          END;
          
          BEGIN
            ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'warning';
            EXCEPTION WHEN duplicate_object THEN NULL;
          END;
          
          BEGIN
            ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'state_transition';
            EXCEPTION WHEN duplicate_object THEN NULL;
          END;
          
          BEGIN
            ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'command';
            EXCEPTION WHEN duplicate_object THEN NULL;
          END;
          
          BEGIN
            ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'data_quality';
            EXCEPTION WHEN duplicate_object THEN NULL;
          END;
          
          BEGIN
            ALTER TYPE event_log_type ADD VALUE IF NOT EXISTS 'communication';
            EXCEPTION WHEN duplicate_object THEN NULL;
          END;
        END IF;
      END
      $$;
    `;
    await client.query(eventLogTypeUpdate);
    console.log('Enhanced event_log_type enum if it existed');

    // Create event_logs table if it doesn't exist
    const eventLogsTableCreate = `
      CREATE TABLE IF NOT EXISTS event_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        event_type TEXT,
        message TEXT NOT NULL,
        user_id INTEGER,
        device_id INTEGER,
        site_id INTEGER,
        metadata JSONB,
        severity TEXT DEFAULT 'info',
        source_ip TEXT
      );
    `;
    await client.query(eventLogsTableCreate);
    
    // Add new columns to event_logs table
    const eventLogsAlterColumns = `
      ALTER TABLE event_logs
      ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'informational',
      ADD COLUMN IF NOT EXISTS related_action TEXT,
      ADD COLUMN IF NOT EXISTS action_id INTEGER,
      ADD COLUMN IF NOT EXISTS action_result TEXT,
      ADD COLUMN IF NOT EXISTS correlation_id TEXT,
      ADD COLUMN IF NOT EXISTS parent_event_id INTEGER,
      ADD COLUMN IF NOT EXISTS storage_tier TEXT DEFAULT 'hot',
      ADD COLUMN IF NOT EXISTS retention_period_days INTEGER DEFAULT 365,
      ADD COLUMN IF NOT EXISTS tags JSONB,
      ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS acknowledged_by INTEGER,
      ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;

      -- Add foreign key if the event_logs table exists
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_logs') AND
           EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
          IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'event_logs' AND column_name = 'user_id') AND
             NOT EXISTS (
               SELECT 1 FROM information_schema.constraint_column_usage AS ccu
               JOIN information_schema.table_constraints AS tc
               ON tc.constraint_name = ccu.constraint_name
               WHERE tc.constraint_type = 'FOREIGN KEY' 
                 AND tc.table_name = 'event_logs' 
                 AND ccu.table_name = 'users'
                 AND ccu.column_name = 'id'
                 AND tc.constraint_name = 'event_logs_user_id_fkey'
             ) THEN
            ALTER TABLE event_logs
            ADD CONSTRAINT event_logs_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id);
          END IF;
        END IF;
      END
      $$;

      -- Add device foreign key reference
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_logs') AND
           EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'devices') THEN
          IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'event_logs' AND column_name = 'device_id') AND
             NOT EXISTS (
               SELECT 1 FROM information_schema.constraint_column_usage AS ccu
               JOIN information_schema.table_constraints AS tc
               ON tc.constraint_name = ccu.constraint_name
               WHERE tc.constraint_type = 'FOREIGN KEY' 
                 AND tc.table_name = 'event_logs' 
                 AND ccu.table_name = 'devices'
                 AND ccu.column_name = 'id'
                 AND tc.constraint_name = 'event_logs_device_id_fkey'
             ) THEN
            ALTER TABLE event_logs
            ADD CONSTRAINT event_logs_device_id_fkey
            FOREIGN KEY (device_id) REFERENCES devices(id);
          END IF;
        END IF;
      END
      $$;

      -- Add site foreign key reference
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_logs') AND
           EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sites') THEN
          IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'event_logs' AND column_name = 'site_id') AND
             NOT EXISTS (
               SELECT 1 FROM information_schema.constraint_column_usage AS ccu
               JOIN information_schema.table_constraints AS tc
               ON tc.constraint_name = ccu.constraint_name
               WHERE tc.constraint_type = 'FOREIGN KEY' 
                 AND tc.table_name = 'event_logs' 
                 AND ccu.table_name = 'sites'
                 AND ccu.column_name = 'id'
                 AND tc.constraint_name = 'event_logs_site_id_fkey'
             ) THEN
            ALTER TABLE event_logs
            ADD CONSTRAINT event_logs_site_id_fkey
            FOREIGN KEY (site_id) REFERENCES sites(id);
          END IF;
        END IF;
      END
      $$;

      -- Add parent event foreign key reference
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_logs') THEN
          IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'event_logs' AND column_name = 'parent_event_id') AND
             NOT EXISTS (
               SELECT 1 FROM information_schema.constraint_column_usage AS ccu
               JOIN information_schema.table_constraints AS tc
               ON tc.constraint_name = ccu.constraint_name
               WHERE tc.constraint_type = 'FOREIGN KEY' 
                 AND tc.table_name = 'event_logs' 
                 AND ccu.table_name = 'event_logs'
                 AND ccu.column_name = 'id'
                 AND tc.constraint_name = 'event_logs_parent_event_id_fkey'
             ) THEN
            ALTER TABLE event_logs
            ADD CONSTRAINT event_logs_parent_event_id_fkey
            FOREIGN KEY (parent_event_id) REFERENCES event_logs(id);
          END IF;
        END IF;
      END
      $$;
    `;
    await client.query(eventLogsAlterColumns);
    console.log('Enhanced event_logs table');

    // Create the storage_tier enum type if it doesn't exist
    const storageTierEnumCreate = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_tier') THEN
          CREATE TYPE storage_tier AS ENUM (
            'hot',
            'warm',
            'cold',
            'archive'
          );
        END IF;
      END
      $$;
    `;
    await client.query(storageTierEnumCreate);
    console.log('Created storage_tier enum type if it did not exist');

    // Create the data_lifecycle enum type if it doesn't exist
    const dataLifecycleEnumCreate = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_lifecycle') THEN
          CREATE TYPE data_lifecycle AS ENUM (
            'active',
            'aging',
            'dormant',
            'expired'
          );
        END IF;
      END
      $$;
    `;
    await client.query(dataLifecycleEnumCreate);
    console.log('Created data_lifecycle enum type if it did not exist');

    // Create storage policy rules table
    const createStoragePolicyRulesTable = `
      CREATE TABLE IF NOT EXISTS storage_policy_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        data_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        retention_period_days INTEGER NOT NULL,
        promotion_threshold_days INTEGER,
        source_tier TEXT NOT NULL,
        destination_tier TEXT NOT NULL,
        action TEXT NOT NULL,
        compression_type TEXT,
        aggregation_enabled BOOLEAN DEFAULT FALSE,
        aggregation_period TEXT,
        aggregation_function TEXT,
        is_enabled BOOLEAN DEFAULT TRUE,
        priority INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_executed_at TIMESTAMP,
        execution_frequency_hours INTEGER DEFAULT 24
      );
    `;
    await client.query(createStoragePolicyRulesTable);
    console.log('Created storage_policy_rules table if it did not exist');

    // Create data transfer jobs table
    const createDataTransferJobsTable = `
      CREATE TABLE IF NOT EXISTS data_transfer_jobs (
        id SERIAL PRIMARY KEY,
        policy_rule_id INTEGER,
        status TEXT DEFAULT 'pending' NOT NULL,
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        records_processed INTEGER DEFAULT 0,
        bytes_processed INTEGER DEFAULT 0,
        error_message TEXT,
        source_tier TEXT NOT NULL,
        destination_tier TEXT NOT NULL,
        metadata_snapshot JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Add foreign key reference to storage_policy_rules if both tables exist
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'data_transfer_jobs') AND
           EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'storage_policy_rules') THEN
          IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'data_transfer_jobs' AND column_name = 'policy_rule_id') AND
             NOT EXISTS (
               SELECT 1 FROM information_schema.constraint_column_usage AS ccu
               JOIN information_schema.table_constraints AS tc
               ON tc.constraint_name = ccu.constraint_name
               WHERE tc.constraint_type = 'FOREIGN KEY' 
                 AND tc.table_name = 'data_transfer_jobs' 
                 AND ccu.table_name = 'storage_policy_rules'
                 AND ccu.column_name = 'id'
                 AND tc.constraint_name = 'data_transfer_jobs_policy_rule_id_fkey'
             ) THEN
            ALTER TABLE data_transfer_jobs
            ADD CONSTRAINT data_transfer_jobs_policy_rule_id_fkey
            FOREIGN KEY (policy_rule_id) REFERENCES storage_policy_rules(id);
          END IF;
        END IF;
      END
      $$;
    `;
    await client.query(createDataTransferJobsTable);
    console.log('Created data_transfer_jobs table if it did not exist');

    // Create storage tier metrics table
    const createStorageTierMetricsTable = `
      CREATE TABLE IF NOT EXISTS storage_tier_metrics (
        id SERIAL PRIMARY KEY,
        tier TEXT NOT NULL,
        data_type TEXT NOT NULL,
        record_count INTEGER DEFAULT 0,
        storage_bytes INTEGER DEFAULT 0,
        oldest_record TIMESTAMP,
        newest_record TIMESTAMP,
        avg_accesses_per_day NUMERIC DEFAULT 0,
        last_accessed_at TIMESTAMP,
        last_updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createStorageTierMetricsTable);
    console.log('Created storage_tier_metrics table if it did not exist');

    // Commit transaction
    await client.query('COMMIT');
    console.log('Enhanced time series data migration completed successfully');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error in enhanced time series data migration:', error);
    throw error;
  }
}

module.exports = { runMigration };