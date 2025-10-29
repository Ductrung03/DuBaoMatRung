// Seed Page-Based Permissions
const { PrismaClient } = require('@prisma/client');
const { generateFlatPermissions } = require('../src/config/page-permissions.config');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Page-Based Permissions Seeding...\n');

  // Generate permissions from config
  const flatPermissions = generateFlatPermissions();

  console.log(`📋 Found ${flatPermissions.length} page-based permissions to seed\n`);

  let createdCount = 0;
  let updatedCount = 0;

  // Upsert each permission
  for (const perm of flatPermissions) {
    const [module, resource, ...actionParts] = perm.code.split('.');
    const action = actionParts.join('.');

    const result = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        ui_path: perm.ui_path,
        ui_element: perm.ui_element,
        ui_category: perm.ui_category,
        icon: perm.icon,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description,
        module: module,
        resource: resource,
        action: action,
        ui_path: perm.ui_path,
        ui_element: perm.ui_element,
        ui_category: perm.ui_category,
        icon: perm.icon,
      }
    });

    if (result.created_at.getTime() === result.updated_at.getTime()) {
      createdCount++;
    } else {
      updatedCount++;
    }

    console.log(`   ✓ ${perm.code}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Page-Based Permissions Seeded!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Summary:`);
  console.log(`   • Created: ${createdCount}`);
  console.log(`   • Updated: ${updatedCount}`);
  console.log(`   • Total: ${flatPermissions.length}`);
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
