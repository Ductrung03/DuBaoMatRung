#!/usr/bin/env node
// Script to create default admin user: LuckyBoiz / LuckyBoiz@123
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '4',
  database: process.env.DB_NAME || 'auth_db'
});

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');

    // Generate password hash for LuckyBoiz@123
    const password = 'LuckyBoiz@123';
    const passwordHash = await bcrypt.hash(password, 10);

    console.log(`Generated hash for password: ${password}`);
    console.log(`Hash: ${passwordHash}`);

    // Insert admin user
    const query = `
      INSERT INTO users (
        username,
        password_hash,
        full_name,
        role,
        position,
        organization,
        permission_level,
        is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      ON CONFLICT (username)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        position = EXCLUDED.position,
        organization = EXCLUDED.organization,
        permission_level = EXCLUDED.permission_level,
        is_active = EXCLUDED.is_active
      RETURNING id, username, full_name
    `;

    const values = [
      'LuckyBoiz',
      passwordHash,
      'Lucky Administrator',
      'admin',
      'System Administrator',
      'LuckyBoiz Organization',
      'national',
      true
    ];

    const result = await pool.query(query, values);

    console.log('✅ Admin user created/updated successfully!');
    console.log('User details:', result.rows[0]);
    console.log('\n📝 Login credentials:');
    console.log('   Username: LuckyBoiz');
    console.log('   Password: LuckyBoiz@123');
    console.log('   Role: admin');
    console.log('   Permission Level: national');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
