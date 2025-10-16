// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full access'
    }
  });
  console.log('✅ Admin role created:', adminRole);

  // Create gis_specialist role
  const gisRole = await prisma.role.upsert({
    where: { name: 'gis_specialist' },
    update: {},
    create: {
      name: 'gis_specialist',
      description: 'GIS specialist with map editing permissions'
    }
  });
  console.log('✅ GIS specialist role created:', gisRole);

  // Create viewer role
  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      description: 'Read-only viewer'
    }
  });
  console.log('✅ Viewer role created:', viewerRole);

  // Create permissions
  const permissions = [
    { action: 'manage', subject: 'all', description: 'Full system access' },
    { action: 'read', subject: 'users', description: 'View users' },
    { action: 'create', subject: 'users', description: 'Create users' },
    { action: 'update', subject: 'users', description: 'Update users' },
    { action: 'delete', subject: 'users', description: 'Delete users' },
    { action: 'read', subject: 'deforestation_events', description: 'View deforestation events' },
    { action: 'create', subject: 'deforestation_events', description: 'Create deforestation events' },
    { action: 'update', subject: 'deforestation_events', description: 'Update deforestation events' },
    { action: 'verify', subject: 'deforestation_events', description: 'Verify deforestation events' },
    { action: 'read', subject: 'reports', description: 'View reports' },
    { action: 'create', subject: 'reports', description: 'Create reports' },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        action_subject: {
          action: perm.action,
          subject: perm.subject
        }
      },
      update: {},
      create: perm
    });
    createdPermissions.push(permission);
  }
  console.log(`✅ Created ${createdPermissions.length} permissions`);

  // Assign all permissions to admin role
  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      permissions: {
        connect: createdPermissions.map(p => ({ id: p.id }))
      }
    }
  });
  console.log('✅ Assigned all permissions to admin role');

  // Assign GIS permissions to gis_specialist role
  const gisPermissions = createdPermissions.filter(p =>
    p.subject === 'deforestation_events' ||
    (p.subject === 'reports' && p.action === 'read')
  );
  await prisma.role.update({
    where: { id: gisRole.id },
    data: {
      permissions: {
        connect: gisPermissions.map(p => ({ id: p.id }))
      }
    }
  });
  console.log('✅ Assigned GIS permissions to gis_specialist role');

  // Assign read permissions to viewer role
  const viewPermissions = createdPermissions.filter(p => p.action === 'read');
  await prisma.role.update({
    where: { id: viewerRole.id },
    data: {
      permissions: {
        connect: viewPermissions.map(p => ({ id: p.id }))
      }
    }
  });
  console.log('✅ Assigned read permissions to viewer role');

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123#', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: hashedPassword,
      full_name: 'System Administrator',
      is_active: true,
      roles: {
        connect: [{ id: adminRole.id }]
      }
    }
  });
  console.log('✅ Admin user created:', { id: adminUser.id, username: adminUser.username });

  // Create test GIS user
  const gisPassword = await bcrypt.hash('Gis@123#', 10);
  const gisUser = await prisma.user.upsert({
    where: { username: 'gis_user' },
    update: {},
    create: {
      username: 'gis_user',
      password_hash: gisPassword,
      full_name: 'GIS Specialist',
      is_active: true,
      roles: {
        connect: [{ id: gisRole.id }]
      }
    }
  });
  console.log('✅ GIS user created:', { id: gisUser.id, username: gisUser.username });

  // Create test viewer user
  const viewerPassword = await bcrypt.hash('Viewer@123#', 10);
  const viewerUser = await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer',
      password_hash: viewerPassword,
      full_name: 'Read Only User',
      is_active: true,
      roles: {
        connect: [{ id: viewerRole.id }]
      }
    }
  });
  console.log('✅ Viewer user created:', { id: viewerUser.id, username: viewerUser.username });

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin / Admin@123#');
  console.log('   GIS Specialist: gis_user / Gis@123#');
  console.log('   Viewer: viewer / Viewer@123#');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
