// Add security features and tables migration

/**
 * Migrate security features
 * @param {import('pg').Client} db - The database client
 */
async function migrateSecurity(db) {
  console.log('Running security features migration...');
  
  try {
    // Create security-related enums if they don't exist
    // The IF NOT EXISTS syntax is not supported for enums in PostgreSQL, so we need to use DO blocks
    
    // Create api_key_access_level enum
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_access_level') THEN
          CREATE TYPE api_key_access_level AS ENUM (
            'read_only', 'device_control', 'full_access', 'admin'
          );
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    
    // Create certificate_type enum
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_type') THEN
          CREATE TYPE certificate_type AS ENUM (
            'client_auth', 'server_auth', 'mutual_tls', 'signing', 'encryption'
          );
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    
    // Create certificate_status enum
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_status') THEN
          CREATE TYPE certificate_status AS ENUM (
            'active', 'expired', 'revoked', 'pending'
          );
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    console.log('Created security-related enum types');

    // Add security fields to the users table
    // Check if columns exist before adding them - doing one at a time for better error handling
    console.log('Adding security fields to users table...');
    
    // For two_factor_enabled
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'two_factor_enabled'
        ) THEN
          ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);
    
    // For two_factor_secret
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'two_factor_secret'
        ) THEN
          ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
        END IF;
      END $$;
    `);

    // For last_login_at
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_login_at'
        ) THEN
          ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // For last_login_ip
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'last_login_ip'
        ) THEN
          ALTER TABLE users ADD COLUMN last_login_ip TEXT;
        END IF;
      END $$;
    `);

    // For account_locked
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'account_locked'
        ) THEN
          ALTER TABLE users ADD COLUMN account_locked BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);
    
    // For lock_reason
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'lock_reason'
        ) THEN
          ALTER TABLE users ADD COLUMN lock_reason TEXT;
        END IF;
      END $$;
    `);

    // For failed_login_attempts
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'failed_login_attempts'
        ) THEN
          ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    // For password_last_changed
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password_last_changed'
        ) THEN
          ALTER TABLE users ADD COLUMN password_last_changed TIMESTAMP;
        END IF;
      END $$;
    `);

    // For require_password_change
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'require_password_change'
        ) THEN
          ALTER TABLE users ADD COLUMN require_password_change BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    console.log('Added security fields to users table');

    // Create API Keys Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        secret TEXT,
        user_id INTEGER REFERENCES users(id),
        access_level api_key_access_level DEFAULT 'read_only',
        allowed_ips TEXT,
        expires_at TIMESTAMP,
        last_used_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scopes_json JSONB,
        rotation_enabled BOOLEAN DEFAULT FALSE,
        rotation_interval_days INTEGER,
        last_rotated_at TIMESTAMP,
        previous_keys JSONB,
        metadata JSONB
      );
    `);

    console.log('Created api_keys table');

    // Create Client Certificates Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS client_certificates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type certificate_type DEFAULT 'client_auth',
        user_id INTEGER REFERENCES users(id),
        device_id INTEGER REFERENCES devices(id),
        certificate_data TEXT,
        fingerprint TEXT NOT NULL UNIQUE,
        serial_number TEXT NOT NULL,
        issuer TEXT NOT NULL,
        subject TEXT NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_to TIMESTAMP NOT NULL,
        status certificate_status DEFAULT 'active',
        revocation_reason TEXT,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP,
        metadata JSONB
      );
    `);

    console.log('Created client_certificates table');

    // Create Permissions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Created permissions table');

    // Create Role Permissions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL,
        permission_id INTEGER NOT NULL REFERENCES permissions(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Created role_permissions table');

    // Create User Permissions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        permission_id INTEGER NOT NULL REFERENCES permissions(id),
        granted BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by INTEGER REFERENCES users(id)
      );
    `);

    console.log('Created user_permissions table');

    // Create Command Authorizations Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS command_authorizations (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        command_type TEXT NOT NULL,
        requires_mfa BOOLEAN DEFAULT FALSE,
        required_role TEXT DEFAULT 'manager',
        approval_required BOOLEAN DEFAULT FALSE,
        approval_roles TEXT,
        cooldown_seconds INTEGER DEFAULT 0,
        risk_level TEXT DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Created command_authorizations table');

    // Create Command Executions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS command_executions (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        user_id INTEGER REFERENCES users(id),
        command_type TEXT NOT NULL,
        parameters JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'requested',
        completed_at TIMESTAMP,
        result JSONB,
        failure_reason TEXT,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        authentication_type TEXT,
        used_mfa BOOLEAN DEFAULT FALSE,
        session_id TEXT,
        source_ip TEXT
      );
    `);

    console.log('Created command_executions table');

    // Create Rate Limits Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        limit_key TEXT NOT NULL,
        max_requests INTEGER NOT NULL,
        time_window_seconds INTEGER NOT NULL,
        block_duration_seconds INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Created rate_limits table');

    // Create Rate Limit Events Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_events (
        id SERIAL PRIMARY KEY,
        limit_id INTEGER REFERENCES rate_limits(id),
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        user_id INTEGER REFERENCES users(id),
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        request_count INTEGER DEFAULT 1,
        is_blocked BOOLEAN DEFAULT FALSE,
        blocked_until TIMESTAMP
      );
    `);

    console.log('Created rate_limit_events table');

    // Create Device Security Settings Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS device_security_settings (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        tls_enabled BOOLEAN DEFAULT FALSE,
        tls_version TEXT DEFAULT '1.3',
        certificate_id INTEGER REFERENCES client_certificates(id),
        auth_method TEXT DEFAULT 'token',
        requires_mutual_tls BOOLEAN DEFAULT FALSE,
        secure_boot_enabled BOOLEAN DEFAULT FALSE,
        firmware_verification BOOLEAN DEFAULT FALSE,
        firmware_signing_key TEXT,
        allowed_ips TEXT,
        message_encryption BOOLEAN DEFAULT FALSE,
        encryption_algorithm TEXT,
        anomaly_detection_enabled BOOLEAN DEFAULT FALSE,
        branch_protection_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Created device_security_settings table');

    // Create Security Audit Log Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS security_audit_log (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id),
        ip_address TEXT,
        user_agent TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details JSONB,
        status TEXT DEFAULT 'success',
        failure_reason TEXT,
        session_id TEXT,
        authentication_type TEXT,
        risk_score NUMERIC,
        is_suspicious BOOLEAN DEFAULT FALSE,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        storage_tier TEXT DEFAULT 'hot',
        retention_period_days INTEGER DEFAULT 730
      );
    `);

    console.log('Created security_audit_log table');

    // Add default permissions
    await db.query(`
      -- Only insert these if permissions table is empty
      INSERT INTO permissions (name, description, category)
      SELECT * FROM (
        VALUES 
          ('device.view', 'View device information', 'device'),
          ('device.control', 'Control device operation', 'device'),
          ('device.manage', 'Manage device settings', 'device'),
          ('site.view', 'View site information', 'site'),
          ('site.manage', 'Manage site settings', 'site'),
          ('user.view', 'View user information', 'user'),
          ('user.manage', 'Manage users', 'user'),
          ('settings.view', 'View system settings', 'settings'),
          ('settings.manage', 'Manage system settings', 'settings')
      ) AS vals
      WHERE NOT EXISTS (SELECT 1 FROM permissions LIMIT 1);
    `);

    // Add default role permissions
    await db.query(`
      -- Only insert these if role_permissions table is empty
      INSERT INTO role_permissions (role, permission_id)
      SELECT 'admin', id FROM permissions
      WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin');

      INSERT INTO role_permissions (role, permission_id)
      SELECT 'manager', id FROM permissions 
      WHERE category IN ('device', 'site') OR name IN ('settings.view')
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role = 'manager' AND permission_id = permissions.id
      );

      INSERT INTO role_permissions (role, permission_id)
      SELECT 'viewer', id FROM permissions 
      WHERE name LIKE '%.view'
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role = 'viewer' AND permission_id = permissions.id
      );
    `);

    console.log('Added default permissions and role assignments');

    // Add rate limit defaults
    await db.query(`
      -- Only insert these if rate_limits table is empty
      INSERT INTO rate_limits (resource_type, limit_key, max_requests, time_window_seconds, block_duration_seconds)
      SELECT * FROM (
        VALUES 
          ('auth', 'login', 5, 60, 300),
          ('auth', 'verification', 3, 60, 300),
          ('api', 'general', 100, 60, 0),
          ('device', 'command', 10, 60, 0)
      ) AS vals
      WHERE NOT EXISTS (SELECT 1 FROM rate_limits LIMIT 1);
    `);

    console.log('Added default rate limits');

    console.log('Security features migration completed successfully');
    return true;
  } catch (error) {
    console.error('Security features migration failed:', error);
    throw error;
  }
}

module.exports = migrateSecurity;