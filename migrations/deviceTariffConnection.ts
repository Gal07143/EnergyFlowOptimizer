/**
 * Migration to add device-specific tariff connections
 * 
 * This migration adds a tariffId column to the devices table to allow
 * direct association between devices and tariffs, enabling device-specific
 * tariff rates that override the site's default tariff when present.
 */

import { Client } from 'pg';

/**
 * Runs the device-tariff connection migration on the database
 * @param client PostgreSQL client to use for the migration
 */
export async function runMigration(client: Client): Promise<void> {
  console.log('Running device-tariff connection migration...');

  try {
    // Add tariffId column to devices table
    await client.query(`
      ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS tariff_id INTEGER,
      ADD CONSTRAINT fk_device_tariff FOREIGN KEY (tariff_id) REFERENCES tariffs(id);
    `);

    console.log('✅ Successfully added tariff_id column to devices table');

    // Create an index for efficient tariff lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tariff_id ON devices(tariff_id);
    `);

    console.log('✅ Successfully created index on tariff_id column');

    console.log('Device-tariff connection migration completed successfully');
  } catch (error) {
    console.error('❌ Error in device-tariff connection migration:', error);
    throw error;
  }
}