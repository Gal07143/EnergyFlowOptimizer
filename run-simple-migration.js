import pkg from 'pg';
const { Client } = pkg;

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Running multi-user architecture migration...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Start transaction
    await client.query('BEGIN');

    console.log('Creating partners table...');
    // Add partners table
    await client.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        logo TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Altering sites table...');
    // Add partner_id to sites table
    await client.query(`
      ALTER TABLE sites
      ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id);
    `);

    console.log('Altering users table...');
    // Add new fields to users table
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id),
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);

    console.log('Creating default partner...');
    // Create a default partner for existing data
    const result = await client.query(`
      INSERT INTO partners (name, description, status)
      VALUES ('Default Organization', 'Created during system migration', 'active')
      RETURNING id;
    `);

    const defaultPartnerId = result.rows[0].id;
    console.log(`Created default partner with ID: ${defaultPartnerId}`);

    console.log('Updating existing sites...');
    // Assign existing sites to the default partner
    await client.query(`
      UPDATE sites SET partner_id = $1 WHERE partner_id IS NULL;
    `, [defaultPartnerId]);

    console.log('Updating existing users...');
    // Update existing admins to have access to the default partner
    await client.query(`
      UPDATE users SET partner_id = $1 WHERE role = 'admin';
    `, [defaultPartnerId]);

    // Commit transaction
    await client.query('COMMIT');
    console.log('Multi-user architecture migration completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error in multi-user architecture migration:', error);
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
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });