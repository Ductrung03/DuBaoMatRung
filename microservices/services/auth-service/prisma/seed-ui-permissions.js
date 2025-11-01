// Seed UI-based permissions
const { PrismaClient } = require('@prisma/client');
const { getAllPermissions } = require('../src/config/ui-permissions');

const prisma = new PrismaClient();

async function seedUIPermissions() {
  console.log('🌱 Starting UI permissions seed...');

  const permissions = getAllPermissions();
  console.log(`📋 Found ${permissions.length} permissions to seed`);

  let created = 0;
  let updated = 0;

  for (const perm of permissions) {
    try {
      const existing = await prisma.permission.findUnique({
        where: { code: perm.code }
      });

      if (existing) {
        // Update existing permission with UI fields
        await prisma.permission.update({
          where: { code: perm.code },
          data: {
            name: perm.name,
            description: perm.description,
            ui_category: perm.ui_category,
            icon: perm.icon,
            order: perm.order
          }
        });
        updated++;
        console.log(`✅ Updated: ${perm.code}`);
      } else {
        // Create new permission
        await prisma.permission.create({
          data: {
            code: perm.code,
            name: perm.name,
            description: perm.description,
            module: perm.module,
            resource: perm.resource,
            action: perm.action,
            ui_category: perm.ui_category,
            icon: perm.icon,
            order: perm.order,
            is_active: true
          }
        });
        created++;
        console.log(`➕ Created: ${perm.code}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${perm.code}:`, error.message);
    }
  }

  console.log(`\n✨ Seed complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${created + updated}`);
}

async function main() {
  try {
    await seedUIPermissions();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
