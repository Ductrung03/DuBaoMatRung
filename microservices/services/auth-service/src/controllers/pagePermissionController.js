/**
 * Controller để quản lý permissions theo trang và chức năng
 */

const { PrismaClient } = require('@prisma/client');
const { getPageStructure } = require('../data/page-permissions');

const prisma = new PrismaClient();

/**
 * Lấy cấu trúc trang và permissions cho user hiện tại
 */
const getMyPageAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.roles?.some(role => role.name === 'Admin');

    // Nếu là admin, trả về tất cả trang và chức năng
    if (isAdmin) {
      const pageStructure = getPageStructure();
      const allPages = Object.values(pageStructure).map(page => ({
        key: page.key,
        name: page.name,
        icon: page.icon,
        path: page.path,
        features: page.features
      }));

      return res.json({
        success: true,
        data: {
          pages: allPages,
          isAdmin: true
        }
      });
    }

    // Lấy permissions của user thông qua roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!userWithRoles) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Lấy tất cả permission codes của user
    const userPermissions = new Set();
    userWithRoles.userRoles.forEach(userRole => {
      userRole.role.rolePermissions.forEach(rolePermission => {
        userPermissions.add(rolePermission.permission.code);
      });
    });

    // Lọc trang và chức năng theo permissions
    const pageStructure = getPageStructure();
    const accessiblePages = [];

    Object.values(pageStructure).forEach(page => {
      const pagePermissionCode = `page.${page.key}`;
      
      // Kiểm tra quyền truy cập trang
      if (userPermissions.has(pagePermissionCode)) {
        // Lọc features theo permissions
        const accessibleFeatures = page.features.filter(feature => 
          userPermissions.has(feature.code)
        );

        // Chỉ thêm trang nếu có ít nhất 1 feature được phép truy cập
        if (accessibleFeatures.length > 0) {
          accessiblePages.push({
            key: page.key,
            name: page.name,
            icon: page.icon,
            path: page.path,
            features: accessibleFeatures
          });
        }
      }
    });

    res.json({
      success: true,
      data: {
        pages: accessiblePages,
        isAdmin: false
      }
    });

  } catch (error) {
    console.error('Error getting user page access:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin phân quyền'
    });
  }
};

/**
 * Lấy tất cả trang và chức năng (dành cho admin phân quyền)
 */
const getAllPagesAndFeatures = async (req, res) => {
  try {
    const pageStructure = getPageStructure();
    
    // Lấy thông tin permissions từ database để có id
    const allPermissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { order: 'asc' }
      ]
    });

    // Tạo map để lookup permission id
    const permissionMap = {};
    allPermissions.forEach(perm => {
      permissionMap[perm.code] = perm;
    });

    // Tạo cấu trúc trang với thông tin permission đầy đủ
    const pagesWithPermissions = Object.values(pageStructure).map(page => {
      const pagePermission = permissionMap[`page.${page.key}`];
      
      return {
        key: page.key,
        name: page.name,
        icon: page.icon,
        path: page.path,
        permission: pagePermission ? {
          id: pagePermission.id,
          code: pagePermission.code,
          name: pagePermission.name,
          description: pagePermission.description
        } : null,
        features: page.features.map(feature => {
          const featurePermission = permissionMap[feature.code];
          return {
            ...feature,
            permission: featurePermission ? {
              id: featurePermission.id,
              code: featurePermission.code,
              name: featurePermission.name,
              description: featurePermission.description
            } : null
          };
        })
      };
    });

    res.json({
      success: true,
      data: {
        pages: pagesWithPermissions
      }
    });

  } catch (error) {
    console.error('Error getting all pages and features:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách trang và chức năng'
    });
  }
};

/**
 * Kiểm tra quyền truy cập một trang cụ thể
 */
const checkPageAccess = async (req, res) => {
  try {
    const { pageKey } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles?.some(role => role.name === 'Admin');

    if (isAdmin) {
      return res.json({
        success: true,
        data: { hasAccess: true, isAdmin: true }
      });
    }

    // Kiểm tra permission
    const pagePermissionCode = `page.${pageKey}`;
    
    const hasPermission = await prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: {
          some: {
            role: {
              rolePermissions: {
                some: {
                  permission: {
                    code: pagePermissionCode
                  }
                }
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: { 
        hasAccess: !!hasPermission,
        isAdmin: false
      }
    });

  } catch (error) {
    console.error('Error checking page access:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra quyền truy cập'
    });
  }
};

/**
 * Kiểm tra quyền truy cập một chức năng cụ thể
 */
const checkFeatureAccess = async (req, res) => {
  try {
    const { featureCode } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles?.some(role => role.name === 'Admin');

    if (isAdmin) {
      return res.json({
        success: true,
        data: { hasAccess: true, isAdmin: true }
      });
    }

    // Kiểm tra permission
    const hasPermission = await prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: {
          some: {
            role: {
              rolePermissions: {
                some: {
                  permission: {
                    code: featureCode
                  }
                }
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: { 
        hasAccess: !!hasPermission,
        isAdmin: false
      }
    });

  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra quyền chức năng'
    });
  }
};

module.exports = {
  getMyPageAccess,
  getAllPagesAndFeatures,
  checkPageAccess,
  checkFeatureAccess
};
