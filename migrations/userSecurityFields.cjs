// Add security fields to the users table migration

/**
 * Migrates the users table to add security fields
 * @param {import('pg').Client} db - The database client
 */
async function migrateUserSecurityFields(db) {
  console.log('Running user security fields migration...');
  
  try {
    console.log('Adding two_factor_enabled field...');
    // Add two_factor_enabled field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
    `);
    
    console.log('Adding two_factor_secret field...');
    // Add two_factor_secret field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
    `);
    
    console.log('Adding last_login_at field...');
    // Add last_login_at field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `);
    
    console.log('Adding last_login_ip field...');
    // Add last_login_ip field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
    `);
    
    console.log('Adding account_locked field...');
    // Add account_locked field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE;
    `);
    
    console.log('Adding lock_reason field...');
    // Add lock_reason field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS lock_reason TEXT;
    `);
    
    console.log('Adding failed_login_attempts field...');
    // Add failed_login_attempts field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
    `);
    
    console.log('Adding password_last_changed field...');
    // Add password_last_changed field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_last_changed TIMESTAMP;
    `);
    
    console.log('Adding require_password_change field...');
    // Add require_password_change field
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE;
    `);
    
    console.log('User security fields migration completed successfully');
    return true;
  } catch (error) {
    console.error('User security fields migration failed:', error);
    throw error;
  }
}

module.exports = migrateUserSecurityFields;