import { Client } from 'pg';

/**
 * Migration to add multi-user architecture with partner organizations
 */
export async function runMigration(client: Client): Promise<void> {
  console.log('Running multi-user architecture migration...');

  try {
    // Start transaction
    await client.query('BEGIN');

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

    // Add partner_id to sites table
    await client.query(`
      ALTER TABLE sites
      ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id);
    `);

    // Add new fields to users table
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id),
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);

    // Create a default partner for existing data
    await client.query(`
      INSERT INTO partners (name, description, status)
      VALUES ('Default Organization', 'Created during system migration', 'active')
      RETURNING id;
    `);

    // Get the ID of the default partner
    const result = await client.query('SELECT id FROM partners WHERE name = $1', ['Default Organization']);
    const defaultPartnerId = result.rows[0].id;

    // Assign existing sites to the default partner
    await client.query(`
      UPDATE sites SET partner_id = $1 WHERE partner_id IS NULL;
    `, [defaultPartnerId]);

    // Update existing admins to have access to the default partner
    await client.query(`
      UPDATE users SET partner_id = $1 WHERE role = 'admin';
    `, [defaultPartnerId]);

    // Create permissions for multi-user access
    await client.query(`
      INSERT INTO permissions (name, description, category)
      VALUES 
        ('manage_partners', 'Create, update, and manage partner organizations', 'admin'),
        ('view_all_partners', 'View all partner organizations in the system', 'admin'),
        ('manage_partner_sites', 'Manage sites for a specific partner', 'partner'),
        ('view_partner_sites', 'View sites for a specific partner', 'partner')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Add permissions for roles
    await client.query(`
      INSERT INTO role_permissions (role, permission_id)
      SELECT 'admin', id FROM permissions WHERE name = 'manage_partners'
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role, permission_id)
      SELECT 'admin', id FROM permissions WHERE name = 'view_all_partners'
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role, permission_id)
      SELECT 'partner_admin', id FROM permissions WHERE name = 'manage_partner_sites'
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role, permission_id)
      SELECT 'partner_admin', id FROM permissions WHERE name = 'view_partner_sites'
      ON CONFLICT DO NOTHING;

      INSERT INTO role_permissions (role, permission_id)
      SELECT 'manager', id FROM permissions WHERE name = 'view_partner_sites'
      ON CONFLICT DO NOTHING;
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('Multi-user architecture migration completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error in multi-user architecture migration:', error);
    throw error;
  }
}