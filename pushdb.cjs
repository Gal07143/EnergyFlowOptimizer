const { Pool } = require('pg');

async function pushDb() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Starting database schema push...');
    
    console.log('Creating enums...');
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_protocol') THEN
          CREATE TYPE communication_protocol AS ENUM ('modbus_tcp', 'modbus_rtu', 'mqtt', 'http', 'ocpp', 'sunspec', 'eebus', 'rest', 'proprietary');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
          CREATE TYPE document_type AS ENUM ('manual', 'datasheet', 'installation_guide', 'quick_start_guide', 'certificate', 'warranty');
        END IF;
      END $$;
    `);
    
    console.log('Adding device types...');
    try {
      await pool.query(`ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'inverter';`);
      await pool.query(`ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'load_controller';`);
      await pool.query(`ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'energy_gateway';`);
    } catch (error) {
      console.log('Note: Cannot add values to enum that may already exist, continuing...');
    }
    
    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_manufacturers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo_url TEXT,
        website TEXT,
        country TEXT,
        description TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_catalog (
        id SERIAL PRIMARY KEY,
        manufacturer_id INTEGER NOT NULL REFERENCES device_manufacturers(id),
        name TEXT NOT NULL,
        model_number TEXT NOT NULL,
        type device_type NOT NULL,
        release_year INTEGER,
        image_url TEXT,
        thumbnail_url TEXT,
        capacity NUMERIC,
        max_power NUMERIC,
        efficiency NUMERIC,
        dimensions TEXT,
        weight NUMERIC,
        short_description TEXT,
        full_description TEXT,
        features JSONB,
        supported_protocols JSONB,
        warranty TEXT,
        price NUMERIC,
        currency TEXT DEFAULT 'USD',
        availability BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_catalog_documents (
        id SERIAL PRIMARY KEY,
        device_catalog_id INTEGER NOT NULL REFERENCES device_catalog(id) ON DELETE CASCADE,
        document_type document_type NOT NULL,
        title TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        language TEXT DEFAULT 'en',
        version TEXT,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_catalog_registers (
        id SERIAL PRIMARY KEY,
        device_catalog_id INTEGER NOT NULL REFERENCES device_catalog(id) ON DELETE CASCADE,
        protocol communication_protocol NOT NULL,
        address TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        data_type TEXT NOT NULL,
        unit TEXT,
        scale NUMERIC,
        offset NUMERIC,
        min NUMERIC,
        max NUMERIC,
        access TEXT NOT NULL,
        is_required BOOLEAN DEFAULT FALSE,
        default_value TEXT,
        notes TEXT
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_catalog_presets (
        id SERIAL PRIMARY KEY,
        device_catalog_id INTEGER NOT NULL REFERENCES device_catalog(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        config_values JSONB NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Database schema push completed successfully.');
  } catch (error) {
    console.error('Error pushing database schema:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

pushDb();
