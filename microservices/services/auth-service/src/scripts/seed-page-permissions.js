/**
 * Script để seed permissions mới theo cấu trúc trang và chức năng
 */

const { PrismaClient } = require('@prisma/client');
const { getAllPermissions } = require('../data/page-permissions');

const prisma = new PrismaClient();

async function seedPagePermissions() {
  try {
    console.log('🚀 Bắt đầu seed permissions mới...');

    // Xóa tất cả permissions cũ (nếu muốn reset hoàn toàn)
    console.log('🗑️  Xóa permissions cũ...');
    await prisma.rolePermission.deleteMany({});
    await prisma.permission.deleteMany({});

    // Lấy danh sách permissions mới
    const permissions = getAllPermissions();
    console.log(`📝 Sẽ tạo ${permissions.length} permissions mới`);

    // Insert permissions mới
    for (const permission of permissions) {
      console.log(`   ➕ Tạo permission: ${permission.code} - ${permission.name}`);
      await prisma.permission.create({
        data: permission
      });
    }

    console.log('✅ Seed permissions thành công!');
    console.log('\n📊 Thống kê:');
    
    // Thống kê theo module
    const moduleStats = {};
    permissions.forEach(p => {
      if (!moduleStats[p.module]) {
        moduleStats[p.module] = 0;
      }
      moduleStats[p.module]++;
    });

    Object.entries(moduleStats).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} permissions`);
    });

    // Tạo role admin mặc định với tất cả quyền
    console.log('\n👑 Tạo role Admin với tất cả quyền...');
    
    // Kiểm tra xem role admin đã tồn tại chưa
    let adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Quản trị viên hệ thống - có tất cả quyền',
          is_system: true,
          is_active: true
        }
      });
    }

    // Gán tất cả permissions cho admin
    const allPermissions = await prisma.permission.findMany();
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: adminRole.id,
            permission_id: permission.id
          }
        },
        update: {},
        create: {
          role_id: adminRole.id,
          permission_id: permission.id
        }
      });
    }

    console.log(`✅ Đã gán ${allPermissions.length} quyền cho role Admin`);

    // Tạo một số role mẫu
    console.log('\n📋 Tạo các role mẫu...');

    const sampleRoles = [
      {
        name: 'Người xem',
        description: 'Chỉ có quyền xem dữ liệu',
        permissions: [
          'page.forecast',
          'forecast.auto',
          'page.data_management',
          'data_management.forecast_lookup',
          'data_management.satellite_lookup',
          'page.reports',
          'reports.view'
        ]
      },
      {
        name: 'Chuyên viên dự báo',
        description: 'Có quyền sử dụng các tính năng dự báo',
        permissions: [
          'page.forecast',
          'forecast.auto',
          'forecast.custom',
          'page.data_management',
          'data_management.forecast_lookup',
          'data_management.satellite_lookup',
          'data_management.verification',
          'page.reports',
          'reports.view',
          'reports.create',
          'page.detection',
          'detection.view',
          'detection.analyze'
        ]
      },
      {
        name: 'Quản lý dữ liệu',
        description: 'Có quyền quản lý và cập nhật dữ liệu',
        permissions: [
          'page.data_management',
          'data_management.forecast_lookup',
          'data_management.satellite_lookup',
          'data_management.verification',
          'data_management.update',
          'page.reports',
          'reports.view',
          'reports.create',
          'reports.export'
        ]
      }
    ];

    for (const roleData of sampleRoles) {
      console.log(`   ➕ Tạo role: ${roleData.name}`);
      
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          is_system: false,
          is_active: true
        }
      });

      // Gán permissions cho role
      for (const permissionCode of roleData.permissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: permissionCode }
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              role_id: role.id,
              permission_id: permission.id
            }
          });
        }
      }

      console.log(`     ✅ Đã gán ${roleData.permissions.length} quyền`);
    }

    console.log('\n🎉 Hoàn thành seed permissions!');

  } catch (error) {
    console.error('❌ Lỗi khi seed permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  seedPagePermissions()
    .then(() => {
      console.log('✅ Script hoàn thành');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script thất bại:', error);
      process.exit(1);
    });
}

module.exports = { seedPagePermissions };
