import { PrismaClient } from '@prisma/client';
import { buildPermissionTree, validatePermissionStructure } from '../utils/permissionHelper.js';

const prisma = new PrismaClient();

// Lấy tất cả permissions với cấu trúc tree
export const getPermissionsTree = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      where: { is_active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });
    
    const tree = buildPermissionTree(permissions);
    
    res.json({
      success: true,
      data: tree,
      total: permissions.length
    });
  } catch (error) {
    console.error('Error fetching permissions tree:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách quyền',
      error: error.message
    });
  }
};

// Lấy permissions theo category (cho UI)
export const getPermissionsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const permissions = await prisma.permission.findMany({
      where: { 
        ui_category: category,
        is_active: true 
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions by category:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy quyền theo danh mục',
      error: error.message
    });
  }
};

// Lấy menu items cho user hiện tại
export const getUserMenuItems = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userPermissions = await prisma.permission.findMany({
      where: {
        is_active: true,
        ui_category: 'main_menu',
        ui_element: 'page',
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: { user_id: userId }
              }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    
    const menuItems = userPermissions.map(p => ({
      code: p.code,
      name: p.name,
      path: p.ui_path,
      icon: p.icon,
      order: p.order
    }));
    
    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    console.error('Error fetching user menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy menu người dùng',
      error: error.message
    });
  }
};

// Kiểm tra quyền truy cập trang
export const checkPageAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageCode } = req.params;
    
    const hasAccess = await prisma.permission.findFirst({
      where: {
        code: pageCode,
        is_active: true,
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: { user_id: userId }
              }
            }
          }
        }
      }
    });
    
    res.json({
      success: true,
      hasAccess: !!hasAccess
    });
  } catch (error) {
    console.error('Error checking page access:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra quyền truy cập',
      error: error.message
    });
  }
};

// Lấy actions có thể thực hiện trong một trang
export const getPageActions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageCode } = req.params;
    
    // Tìm page permission
    const pagePermission = await prisma.permission.findFirst({
      where: { code: pageCode, is_active: true }
    });
    
    if (!pagePermission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy trang'
      });
    }
    
    // Lấy actions của user trong trang này
    const actions = await prisma.permission.findMany({
      where: {
        parent_id: pagePermission.id,
        ui_element: 'action',
        is_active: true,
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: { user_id: userId }
              }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    
    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    console.error('Error fetching page actions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy actions của trang',
      error: error.message
    });
  }
};

// Validate permission structure
export const validatePermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany();
    const errors = validatePermissionStructure(permissions);
    
    res.json({
      success: true,
      isValid: errors.length === 0,
      errors
    });
  } catch (error) {
    console.error('Error validating permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi validate permissions',
      error: error.message
    });
  }
};
