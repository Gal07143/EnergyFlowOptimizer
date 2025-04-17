// Push database schema for the project
import { Client } from 'pg';
import { runMigration as runDeviceRegistryMigration } from './migrations/deviceRegistry.ts';
import { runMigration as runEnhancedTimeSeriesDataMigration } from './migrations/enhancedTimeSeriesData.ts';
import * as dotenv from 'dotenv';

dotenv.config();

async function pushDb() {
  console.log('Pushing database schema...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Run migrations in sequence
    await runDeviceRegistryMigration(client);
    await runEnhancedTimeSeriesDataMigration(client);
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Execute if this file is run directly
if (process.argv[1] === import.meta.url.substring(7)) {
  pushDb();
}

export { pushDb };