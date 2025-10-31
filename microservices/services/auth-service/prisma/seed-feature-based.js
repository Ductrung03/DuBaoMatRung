// seed-feature-based.js - Seed permissions theo trang và chức năng
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { flattenFeaturePermissions } = require('../src/config/feature-based-permissions.config');

const prisma = new PrismaClient();

// Định nghĩa roles mẫu với permissions mới
const SAMPLE_ROLES = [
  {
    name: 'super_admin',
    description: 'Quản trị viên tối cao - Toàn quyền hệ thống',
    is_system: true,
    permissions: '*' // Tất cả quyền
  },
  {
    name: 'admin',
    description: 'Quản trị viên - Quản lý toàn bộ',
    is_system: true,
    permissions: [
      'forecast.*',
      'data_management.*',
      'reports.*',
      'detection.*',
      'user_management.*',
      'role_management.*'
    ]
  },
  {
    name: 'forecast_specialist',
    description: 'Chuyên viên dự báo - Chỉ dự báo mất rừng',
    is_system: false,
    permissions: [
      'forecast.auto',
      'forecast.custom'
    ]
  },
  {
    name: 'data_manager',
    description: 'Quản lý dữ liệu - Quản lý và xác minh dữ liệu',
    is_system: false,
    permissions: [
      'data_management.forecast_search',
      'data_management.satellite_search',
      'data_management.verification',
      'data_management.data_update'
    ]
  },
  {
    name: 'reporter',
    description: 'Người báo cáo - Quản lý báo cáo',
    is_system: false,
    permissions: [
      'reports.view'
    ]
  },
  {
    name: 'detector',
    description: 'Người phát hiện - Phát hiện mất rừng',
    is_system: false,
    permissions: [
      'detection.view'
    ]
  },
  {
    name: 'user_admin',
    description: 'Quản trị người dùng - Quản lý người dùng',
    is_system: false,
    permissions: [
      'user_management.view'
    ]
  },
  {
    name: 'role_admin',
    description: 'Quản trị vai trò - Quản lý vai trò và phân quyền',
    is_system: false,
    permissions: [
      'role_management.view'
    ]
  },
  {
    name: 'viewer',
    description: 'Người xem - Chỉ xem một số trang',
    is_system: false,
    permissions: [
      'forecast.auto',
      'data_management.forecast_search',
      'reports.view'
    ]
  }
];

/**
 * Check if permission code matches pattern
 */
function matchPermission(permissionCode, pattern) {
  if (pattern === '*') return true;

  // Convert pattern to regex: 'forecast.*' -> '^forecast\..*$'
  const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
  return regex.test(permissionCode);
}

async function main() {
  console.log('🌱 Starting Feature-Based Permission Seeding...\n');

  // 1. Tạo tất cả permissions
  console.log('📋 Creating feature-based permissions...');
  const permissionsList = flattenFeaturePermissions();
  const createdPermissions = [];

  for (const perm of permissionsList) {
    const permission = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        ui_path: perm.ui_path,
        ui_element: perm.ui_element,
        ui_category: perm.ui_category,
        icon: perm.icon,
        order: perm.order,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        ui_path: perm.ui_path,
        ui_element: perm.ui_element,
        ui_category: perm.ui_category,
        icon: perm.icon,
        order: perm.order,
      }
    });
    createdPermissions.push(permission);
    console.log(`   ✓ ${permission.code}`);
  }
  console.log(`✅ Created ${createdPermissions.length} permissions\n`);

  // 2. Tạo roles và gán permissions
  console.log('👥 Creating roles and assigning permissions...');
  const createdRoles = [];

  for (const roleDef of SAMPLE_ROLES) {
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
      // Super admin có tất cả quyền
      permissionsToAssign = createdPermissions;
    } else {
      // Match patterns
      for (const pattern of roleDef.permissions) {
        const matchedPerms = createdPermissions.filter(p =>
          matchPermission(p.code, pattern)
        );
        permissionsToAssign.push(...matchedPerms);
      }
      // Remove duplicates
      permissionsToAssign = [...new Map(permissionsToAssign.map(p => [p.id, p])).values()];
    }

    // Xóa permissions cũ và gán mới
    await prisma.rolePermission.deleteMany({
      where: { role_id: role.id }
    });

    if (permissionsToAssign.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToAssign.map(p => ({
          role_id: role.id,
          permission_id: p.id
        })),
        skipDuplicates: true
      });
    }

    console.log(`   ✓ ${role.name}: ${permissionsToAssign.length} permissions`);
    createdRoles.push(role);
  }
  console.log(`✅ Created ${createdRoles.length} roles\n`);

  // 3. Tạo user mặc định
  console.log('👤 Creating default users...');

  // Super Admin
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

  console.log(`   ✓ admin (Super Admin)`);

  // Test User - Forecast Specialist
  const forecastRole = createdRoles.find(r => r.name === 'forecast_specialist');
  const testPassword = await bcrypt.hash('Test@123', 10);

  const testUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {
      password_hash: testPassword,
      full_name: 'Test User',
      is_active: true,
    },
    create: {
      username: 'testuser',
      password_hash: testPassword,
      full_name: 'Test User',
      email: 'testuser@example.com',
      is_active: true,
    }
  });

  if (forecastRole) {
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: testUser.id,
          role_id: forecastRole.id
        }
      },
      update: {},
      create: {
        user_id: testUser.id,
        role_id: forecastRole.id,
      }
    });
    console.log(`   ✓ testuser (Forecast Specialist)`);
  }

  console.log(`✅ Created users\n`);

  // 4. Tạo DataScopes mẫu
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

  console.log('✅ Created data scopes\n');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Feature-Based Permission Seeding Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Summary:');
  console.log(`   • Permissions: ${createdPermissions.length}`);
  console.log(`   • Roles: ${createdRoles.length}`);
  console.log(`   • Users: 2`);
  console.log(`   • Data Scopes: 2`);
  console.log('\n🔐 Default Credentials:');
  console.log('   Super Admin:');
  console.log('     Username: admin');
  console.log('     Password: Admin@123');
  console.log('   Test User (Forecast Specialist):');
  console.log('     Username: testuser');
  console.log('     Password: Test@123');
  console.log('\n📝 Permission Structure:');
  console.log('   • Dự báo mất rừng: 2 features (auto, custom)');
  console.log('   • Quản lý dữ liệu: 4 features (forecast_search, satellite_search, verification, data_update)');
  console.log('   • Báo cáo: 1 feature (view)');
  console.log('   • Phát hiện mất rừng: 1 feature (view)');
  console.log('   • Quản lý người dùng: 1 feature (view)');
  console.log('   • Quản lý role: 1 feature (view)');
  console.log('\n💡 Quy tắc phân quyền:');
  console.log('   - Nếu user có quyền trên một feature → Hiển thị component đó trong sidebar');
  console.log('   - Nếu user có ít nhất 1 feature của trang → Hiển thị trang đó trong navigation');
  console.log('   - Admin có toàn quyền');
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
