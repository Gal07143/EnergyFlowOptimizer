/**
 * Database Migration Runner
 * 
 * This script runs all database migrations in sequence.
 */

import { runAllMigrations } from './migrations/index';

console.log('Starting database migration process...');

runAllMigrations()
  .then(() => {
    console.log('Migration process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });