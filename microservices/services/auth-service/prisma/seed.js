// prisma/seed.js - Dynamic RBAC Seeder
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Định nghĩa đầy đủ permissions của hệ thống
const { flattenPermissions } = require('../src/config/modern-permissions.config');

const PERMISSIONS_DEFINITION = flattenPermissions();

// Định nghĩa roles mặc định
const DEFAULT_ROLES = [
  {
    name: 'super_admin',
    description: 'Quản trị viên tối cao - Toàn quyền hệ thống',
    is_system: true,
    permissions: '*', // Tất cả quyền
  },
  {
    name: 'admin',
    description: 'Quản trị viên - Quản lý hệ thống',
    is_system: true,
    permissions: [
      'user.*', 'role.*', 'gis.*', 'report.*', 'search.*', 'admin.log.view', 'admin.audit.view'
    ],
  },
  {
    name: 'gis_manager',
    description: 'Quản lý GIS - Toàn quyền về bản đồ',
    is_system: false,
    permissions: [
      'gis.*', 'report.report.view', 'report.report.view_detail', 'search.*', 'user.profile.*'
    ],
  },
  {
    name: 'gis_specialist',
    description: 'Chuyên viên GIS - Thao tác bản đồ',
    is_system: false,
    permissions: [
      'gis.layer.view', 'gis.matrung.*', 'gis.shapefile.*',
      'report.report.view', 'search.search.execute', 'user.profile.*'
    ],
  },
  {
    name: 'verifier',
    description: 'Người xác minh - Phê duyệt dữ liệu',
    is_system: false,
    permissions: [
      'gis.verification.*', 'gis.matrung.view', 'report.report.view', 'search.*', 'user.profile.*'
    ],
  },
  {
    name: 'reporter',
    description: 'Người báo cáo - Quản lý báo cáo',
    is_system: false,
    permissions: [
      'report.*', 'gis.layer.view', 'gis.matrung.view', 'search.*', 'user.profile.*'
    ],
  },
  {
    name: 'viewer',
    description: 'Người xem - Chỉ xem dữ liệu',
    is_system: false,
    permissions: [
      'gis.layer.view', 'gis.matrung.view', 'report.report.view', 'report.report.view_detail',
      'search.search.execute', 'user.profile.view'
    ],
  },
];

// Hàm kiểm tra pattern permission
function matchPermission(permissionCode, pattern) {
  if (pattern === '*') return true;

  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(permissionCode);
}

async function main() {
  console.log('🌱 Starting RBAC seeding...\n');

  // 1. Tạo tất cả permissions
  console.log('📋 Creating permissions...');
  const createdPermissions = [];
  let order = 1;

  for (const perm of PERMISSIONS_DEFINITION) {
    const permission = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        ui_path: perm.ui_path,
        order: order++,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description || '',
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        ui_path: perm.ui_path,
        order: order++,
      }
    });
    createdPermissions.push(permission);
  }
  console.log(`✅ Created ${createdPermissions.length} permissions\n`);

  // 2. Tạo roles và gán permissions
  console.log('👥 Creating roles and assigning permissions...');
  const createdRoles = [];

  for (const roleDef of DEFAULT_ROLES) {
    // Tạo role
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        is_system: roleDef.is_system,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        is_system: roleDef.is_system,
      }
    });

    // Gán permissions cho role
    let permissionsToAssign = [];

    if (roleDef.permissions === '*') {
      permissionsToAssign = createdPermissions;
    } else {
      for (const pattern of roleDef.permissions) {
        const matchedPerms = createdPermissions.filter(p =>
          matchPermission(p.code, pattern)
        );
        permissionsToAssign.push(...matchedPerms);
      }
      // Remove duplicates
      permissionsToAssign = [...new Set(permissionsToAssign)];
    }

    // Xóa permissions cũ và gán mới
    await prisma.rolePermission.deleteMany({
      where: { role_id: role.id }
    });

    await prisma.rolePermission.createMany({
      data: permissionsToAssign.map(p => ({
        role_id: role.id,
        permission_id: p.id
      })),
      skipDuplicates: true
    });

    console.log(`   ✓ ${role.name}: ${permissionsToAssign.length} permissions`);
    createdRoles.push(role);
  }
  console.log(`✅ Created ${createdRoles.length} roles\n`);

  // 3. Tạo user mặc định
  console.log('👤 Creating default users...');

  const superAdminRole = createdRoles.find(r => r.name === 'super_admin');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password_hash: hashedPassword,
      full_name: 'Super Administrator',
      is_active: true,
    },
    create: {
      username: 'admin',
      password_hash: hashedPassword,
      full_name: 'Super Administrator',
      email: 'admin@example.com',
      is_active: true,
    }
  });

  // Gán role cho admin user
  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: superAdminRole.id
      }
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: superAdminRole.id,
    }
  });

  console.log(`✅ Created admin user: ${adminUser.username}\n`);

  // 4. Tạo DataScopes mẫu (Việt Nam - Tỉnh - Huyện - Xã)
  console.log('🗺️  Creating data scopes...');

  const vietnam = await prisma.dataScope.upsert({
    where: { code: 'VN' },
    update: {},
    create: {
      type: 'COUNTRY',
      code: 'VN',
      name: 'Việt Nam',
      name_en: 'Vietnam',
      path: '/VN',
      level: 1,
      is_active: true,
    }
  });

  const laoCai = await prisma.dataScope.upsert({
    where: { code: 'VN.LC' },
    update: {},
    create: {
      type: 'PROVINCE',
      code: 'VN.LC',
      name: 'Lào Cai',
      name_en: 'Lao Cai',
      parent_id: vietnam.id,
      path: '/VN/LC',
      level: 2,
      is_active: true,
    }
  });

  console.log('✅ Created sample data scopes\n');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Database seeding completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Summary:');
  console.log(`   • Permissions: ${createdPermissions.length}`);
  console.log(`   • Roles: ${createdRoles.length}`);
  console.log(`   • Users: 1`);
  console.log(`   • Data Scopes: 2`);
  console.log('\n🔐 Default Credentials:');
  console.log('   Username: admin');
  console.log('   Password: Admin@123');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
