/**
 * Database Migration Runner
 * 
 * This file orchestrates running all database migrations in sequence.
 * Add new migrations to this file in the order they should be executed.
 */

import { Pool } from 'pg';
import { runMigration as runDeviceRegistryMigration } from './deviceRegistry';
import { runMigration as runMultiUserArchitectureMigration } from './multiUserArchitecture';

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

/**
 * Run all migrations in sequence
 */
export async function runAllMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Connect to database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Run migrations in sequence
      console.log('Running device registry migration...');
      await runDeviceRegistryMigration(client);
      
      console.log('Running multi-user architecture migration...');
      await runMultiUserArchitectureMigration(client);
      
      console.log('All migrations completed successfully');
    } finally {
      // Release client back to pool
      client.release();
    }
    
    // Close pool
    await pool.end();
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runAllMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}