/**
 * Device-Tariff Connection Migration
 * 
 * This script runs a migration to add tariff_id column to the devices table.
 */

const { Client } = require('pg');

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

async function runMigration() {
  console.log('Running device-tariff connection migration...');
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    
    // Add tariffId column to devices table
    console.log('Adding tariff_id column to devices table...');
    await client.query(`
      ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS tariff_id INTEGER,
      ADD CONSTRAINT fk_device_tariff FOREIGN KEY (tariff_id) REFERENCES tariffs(id);
    `);
    
    console.log('✅ Successfully added tariff_id column to devices table');
    
    // Create an index for efficient tariff lookups
    console.log('Creating index on tariff_id column...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tariff_id ON devices(tariff_id);
    `);
    
    console.log('✅ Successfully created index on tariff_id column');
    console.log('Device-tariff connection migration completed successfully');
  } catch (error) {
    console.error('❌ Error in device-tariff connection migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });