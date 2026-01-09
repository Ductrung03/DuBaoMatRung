// Quick script to check users in database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');

    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('   Run: npx prisma db seed');
    } else {
      console.log(`✅ Found ${users.length} users:\n`);
      users.forEach(user => {
        const roles = user.userRoles.map(ur => ur.role.name).join(', ');
        console.log(`   ${user.id}. ${user.username} (${user.full_name})`);
        console.log(`      Email: ${user.email || 'N/A'}`);
        console.log(`      Roles: ${roles || 'No roles'}`);
        console.log('');
      });

      console.log('\n💡 Default password for seeded users is usually: "123456" or "password"');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
