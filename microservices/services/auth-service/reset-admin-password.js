// Script to reset admin password
const bcrypt = require('bcryptjs');

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }

  console.log('\n✅ Password hash generated successfully!\n');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\n📝 Run this SQL command to update admin password:\n');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';`);
  console.log('\n🐳 Or run via Docker:\n');
  console.log(`docker exec QuanLyMatRungPostgres17 psql -U postgres -d auth_db -c "UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';"`);
  console.log('\n');
});
