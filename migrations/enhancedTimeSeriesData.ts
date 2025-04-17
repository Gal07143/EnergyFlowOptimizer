import { Client } from 'pg';

/**
 * Migration to enhance the schema with improved time series data structure
 */
export async function runMigration(client: Client) {
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
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_logs') THEN
          IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'event_logs' AND column_name = 'parent_event_id') THEN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints tc
              JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
              WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'event_logs' 
                AND ccu.column_name = 'parent_event_id'
            ) THEN
              ALTER TABLE event_logs
              ADD CONSTRAINT event_logs_parent_event_id_fkey
              FOREIGN KEY (parent_event_id) REFERENCES event_logs(id);
            END IF;
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
        last_executed_at TIMESTAMP
      );
    `;
    await client.query(createStoragePolicyRulesTable);
    console.log('Created storage_policy_rules table if it did not exist');

    // Create data transfer jobs table
    const createDataTransferJobsTable = `
      CREATE TABLE IF NOT EXISTS data_transfer_jobs (
        id SERIAL PRIMARY KEY,
        policy_rule_id INTEGER REFERENCES storage_policy_rules(id),
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