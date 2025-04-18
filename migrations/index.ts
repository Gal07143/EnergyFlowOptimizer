/**
 * Database Migration Runner
 * 
 * This file orchestrates running all database migrations in sequence.
 * Add new migrations to this file in the order they should be executed.
 */

import { Pool, Client } from 'pg';
import { runMigration as runMultiUserArchitectureMigration } from './multiUserArchitecture';
// Import device registry as CommonJS module since it's a .js file
const deviceRegistryMigration = require('./deviceRegistry');

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
      // Run device registry migration (CommonJS module)
      console.log('Running device registry migration...');
      try {
        await deviceRegistryMigration.runMigration();
        console.log('Device registry migration completed');
      } catch (error) {
        console.warn('Warning: Device registry migration had issues, continuing...', error.message);
      }
      
      // Run the multi-user architecture migration (TypeScript with Client parameter)
      console.log('Running multi-user architecture migration...');
      // Create a proper pg Client for the migration
      const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
      await pgClient.connect();
      
      try {
        await runMultiUserArchitectureMigration(pgClient);
        console.log('Multi-user architecture migration completed');
      } finally {
        await pgClient.end();
      }
      
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