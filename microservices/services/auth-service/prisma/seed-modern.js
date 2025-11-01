#!/usr/bin/env node

/**
 * Seed Modern Permissions
 *
 * File này seed permissions từ modern-permissions.config.js vào database
 *
 * Usage:
 *   node prisma/seed-modern.js
 */

const { PrismaClient } = require('@prisma/client');
const { flattenPermissions } = require('../src/config/modern-permissions.config');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Starting modern permissions seeding...\n');

  const permissions = flattenPermissions();

  console.log(`📊 Total permissions to seed: ${permissions.length}\n`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const perm of permissions) {
    try {
      // Check if permission exists
      const existing = await prisma.permission.findUnique({
        where: { code: perm.code }
      });

      if (existing) {
        // Update existing permission
        await prisma.permission.update({
          where: { code: perm.code },
          data: {
            name: perm.name,
            description: perm.description,
            module: perm.module,
            resource: perm.resource,
            action: perm.action,
            ui_path: perm.ui_path,
            ui_category: perm.ui_category,
            ui_element: perm.ui_element,
            icon: perm.icon,
            order: perm.order,
            is_active: true,
            updated_at: new Date()
          }
        });

        console.log(`✓ Updated: ${perm.code}`);
        updated++;
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
            ui_path: perm.ui_path,
            ui_category: perm.ui_category,
            ui_element: perm.ui_element,
            icon: perm.icon,
            order: perm.order,
            is_active: true
          }
        });

        console.log(`✓ Created: ${perm.code}`);
        created++;
      }
    } catch (error) {
      console.error(`✗ Failed: ${perm.code} - ${error.message}`);
      failed++;
    }
  }

  console.log('\n📈 Summary:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  🔄 Updated: ${updated}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${permissions.length}`);

  // Show permissions grouped by module
  console.log('\n📦 Permissions by module:');
  const groupedByModule = {};
  permissions.forEach(p => {
    if (!groupedByModule[p.module]) {
      groupedByModule[p.module] = 0;
    }
    groupedByModule[p.module]++;
  });

  Object.entries(groupedByModule)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([module, count]) => {
      console.log(`  ${module.padEnd(20)}: ${count} permissions`);
    });

  console.log('\n✅ Modern permissions seeding completed!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Error seeding modern permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
