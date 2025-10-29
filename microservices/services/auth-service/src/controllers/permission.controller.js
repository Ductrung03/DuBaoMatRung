// auth-service/src/controllers/permission.controller.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const prisma = require('../lib/prisma');

const logger = createLogger('permission-controller');

// Web-based permission functions
const getPermissionsTree = async (req, res, next) => {
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
    logger.error('Error fetching permissions tree:', error);
    next(error);
  }
};

const getPermissionsByCategory = async (req, res, next) => {
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
    logger.error('Error fetching permissions by category:', error);
    next(error);
  }
};

const getUserMenuItems = async (req, res, next) => {
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
    logger.error('Error fetching user menu items:', error);
    next(error);
  }
};

const checkPageAccess = async (req, res, next) => {
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
    logger.error('Error checking page access:', error);
    next(error);
  }
};

const getPageActions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageCode } = req.params;
    
    const pagePermission = await prisma.permission.findFirst({
      where: { code: pageCode, is_active: true }
    });
    
    if (!pagePermission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy trang'
      });
    }
    
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
    logger.error('Error fetching page actions:', error);
    next(error);
  }
};

const validatePermissions = async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany();
    const errors = validatePermissionStructure(permissions);
    
    res.json({
      success: true,
      isValid: errors.length === 0,
      errors
    });
  } catch (error) {
    logger.error('Error validating permissions:', error);
    next(error);
  }
};

// Legacy functions (for backward compatibility)
const getAllPermissions = async (req, res, next) => {
  try {
    const { module } = req.query;

    const permissions = await prisma.permission.findMany({
      where: {
        ...(module && { module }),
        is_active: true
      },
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        resource: true,
        action: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            rolePermissions: true
          }
        }
      },
      orderBy: [
        { module: 'asc' },
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    logger.info('Retrieved all permissions', { count: permissions.length });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    next(error);
  }
};

const getPermissionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            rolePermissions: true
          }
        }
      }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    next(error);
  }
};

const createPermission = async (req, res, next) => {
  try {
    const { action, subject, description } = req.body;

    if (!action || !subject) {
      throw new ValidationError('Action and subject are required');
    }

    const permission = await prisma.permission.create({
      data: {
        code: `${action}_${subject}`,
        name: `${action} ${subject}`,
        description,
        module: 'custom',
        resource: subject,
        action: action
      }
    });

    logger.info('Permission created', { permissionId: permission.id });

    res.status(201).json({
      success: true,
      data: permission
    });
  } catch (error) {
    next(error);
  }
};

const updatePermission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    const permission = await prisma.permission.update({
      where: { id: parseInt(id) },
      data: { description }
    });

    logger.info('Permission updated', { permissionId: permission.id });

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    next(error);
  }
};

const deletePermission = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.permission.delete({
      where: { id: parseInt(id) }
    });

    logger.info('Permission deleted', { permissionId: id });

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Stub functions for legacy routes
const getPagePermissionTree = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {},
      message: 'Legacy endpoint - use /tree instead'
    });
  } catch (error) {
    next(error);
  }
};

const getUIGroupedPermissions = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {},
      message: 'Legacy endpoint - use /category/{category} instead'
    });
  } catch (error) {
    next(error);
  }
};

const getModernPermissionsTree = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {},
      message: 'Legacy endpoint - use /tree instead'
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const buildPermissionTree = (permissions) => {
  const permissionMap = new Map();
  const tree = [];
  
  permissions.forEach(p => permissionMap.set(p.id, { ...p, children: [] }));
  
  permissions.forEach(p => {
    const permission = permissionMap.get(p.id);
    if (p.parent_id) {
      const parent = permissionMap.get(p.parent_id);
      if (parent) {
        parent.children.push(permission);
      }
    } else {
      tree.push(permission);
    }
  });
  
  return tree.sort((a, b) => a.order - b.order);
};

const validatePermissionStructure = (permissions) => {
  const errors = [];
  
  permissions.forEach(p => {
    if (p.parent_id && !permissions.find(parent => parent.id === p.parent_id)) {
      errors.push(`Permission ${p.code} has invalid parent_id: ${p.parent_id}`);
    }
    
    if (p.ui_element === 'page' && !p.ui_path) {
      errors.push(`Page permission ${p.code} missing ui_path`);
    }
  });
  
  return errors;
};

// Export functions
module.exports = {
  // New web-based functions
  getPermissionsTree,
  getPermissionsByCategory,
  getUserMenuItems,
  checkPageAccess,
  getPageActions,
  validatePermissions,
  // Legacy functions
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getPagePermissionTree,
  getUIGroupedPermissions,
  getModernPermissionsTree
};

/**
 * Get all permissions
 * @route GET /api/auth/permissions
 */
exports.getAllPermissions = async (req, res, next) => {
  try {
    const { module } = req.query;

    const permissions = await prisma.permission.findMany({
      where: {
        ...(module && { module }),
        is_active: true
      },
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        resource: true,
        action: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            rolePermissions: true
          }
        }
      },
      orderBy: [
        { module: 'asc' },
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    logger.info('Retrieved all permissions', { count: permissions.length });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permission by ID
 * @route GET /api/auth/permissions/:id
 */
exports.getPermissionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    // Transform to include roles directly
    const result = {
      ...permission,
      roles: permission.rolePermissions.map(rp => rp.role),
      rolePermissions: undefined
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new permission
 * @route POST /api/auth/permissions
 */
exports.createPermission = async (req, res, next) => {
  try {
    const { action, resource, description, module, name, code } = req.body;

    if (!action || !resource || !module) {
      throw new ValidationError('Action, resource, and module are required');
    }

    // Check if permission already exists
    const existingPermission = await prisma.permission.findFirst({
      where: {
        module,
        resource,
        action
      }
    });

    if (existingPermission) {
      throw new ValidationError(`Permission '${action}:${resource}' already exists`);
    }

    const permission = await prisma.permission.create({
      data: {
        code: code || `${module}.${resource}.${action}`,
        name: name || `${action} ${resource}`,
        action,
        resource,
        module,
        description
      }
    });

    logger.info('Permission created', {
      permissionId: permission.id,
      permission: `${action}:${resource}`
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: permission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a permission
 * @route PATCH /api/auth/permissions/:id
 */
exports.updatePermission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    const updatedPermission = await prisma.permission.update({
      where: { id: parseInt(id) },
      data: {
        ...(description !== undefined && { description })
      }
    });

    logger.info('Permission updated', { permissionId: updatedPermission.id });

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedPermission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a permission
 * @route DELETE /api/auth/permissions/:id
 */
exports.deletePermission = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { rolePermissions: true }
        }
      }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    // Check if permission has roles
    if (permission._count.rolePermissions > 0) {
      throw new ValidationError(
        `Cannot delete permission '${permission.action}:${permission.resource}' because it is assigned to ${permission._count.rolePermissions} role(s)`
      );
    }

    await prisma.permission.delete({
      where: { id: parseInt(id) }
    });

    logger.info('Permission deleted', {
      permissionId: id,
      permission: `${permission.action}:${permission.resource}`
    });

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permissions grouped by page structure
 * @route GET /api/auth/permissions/page-tree
 */
exports.getPagePermissionTree = async (req, res, next) => {
  try {
    // Fetch all permissions from database
    const allPermissions = await prisma.permission.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        ui_path: true,
        ui_element: true,
        ui_category: true,
        icon: true,
        module: true,
        resource: true,
        action: true
      }
    });

    // Create a map for quick lookup
    const permissionMap = {};
    allPermissions.forEach(p => {
      permissionMap[p.code] = p;
    });

    // Build tree structure from PAGE_PERMISSIONS config
    const tree = {};

    Object.entries(PAGE_PERMISSIONS).forEach(([pageKey, pageConfig]) => {
      const { page, sections } = pageConfig;

      tree[pageKey] = {
        page: page,
        sections: {}
      };

      Object.entries(sections).forEach(([sectionKey, section]) => {
        tree[pageKey].sections[sectionKey] = {
          name: section.name,
          features: {}
        };

        Object.entries(section.features).forEach(([featureKey, feature]) => {
          const permissionCode = feature.permission;
          const permissionData = permissionMap[permissionCode];

          tree[pageKey].sections[sectionKey].features[featureKey] = {
            name: feature.name,
            permission_code: permissionCode,
            ui_element: feature.ui_element,
            permission: permissionData || null // Include full permission data if exists in DB
          };
        });
      });
    });

    logger.info('Retrieved page-based permission tree');

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get simplified permission list grouped by UI page/category
 * @route GET /api/auth/permissions/ui-grouped
 */
exports.getUIGroupedPermissions = async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        ui_path: true,
        ui_element: true,
        ui_category: true,
        icon: true
      },
      orderBy: [
        { ui_category: 'asc' },
        { ui_path: 'asc' },
        { code: 'asc' }
      ]
    });

    // Group by ui_category
    const grouped = {};

    permissions.forEach(perm => {
      const category = perm.ui_category || 'Khác';

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(perm);
    });

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get modern permissions tree structure (page-based)
 * @route GET /api/auth/permissions/modern-tree
 */
exports.getModernPermissionsTree = async (req, res, next) => {
  try {
    const { getPermissionsTree } = require('../config/modern-permissions.config');

    // Get the tree structure
    const tree = getPermissionsTree();

    // Fetch all permissions from database to include IDs
    const allPermissions = await prisma.permission.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        module: true,
        resource: true,
        action: true,
        ui_path: true,
        ui_element: true,
        ui_category: true,
        icon: true,
        order: true
      }
    });

    // Create a map for quick lookup
    const permissionMap = {};
    allPermissions.forEach(p => {
      permissionMap[p.code] = p;
    });

    // Enhance tree with database IDs
    const enhancedTree = JSON.parse(JSON.stringify(tree)); // Deep clone

    Object.keys(enhancedTree).forEach(moduleKey => {
      const module = enhancedTree[moduleKey];

      Object.keys(module.pages).forEach(pageKey => {
        const page = module.pages[pageKey];

        Object.keys(page.features).forEach(featureKey => {
          const feature = page.features[featureKey];

          feature.permissions = feature.permissions.map(perm => {
            const dbPerm = permissionMap[perm.code];
            return {
              ...perm,
              id: dbPerm?.id || null,
              // Include DB fields if exists
              ...(dbPerm && {
                module: dbPerm.module,
                resource: dbPerm.resource,
                action: dbPerm.action
              })
            };
          });
        });
      });
    });

    logger.info('Retrieved modern permissions tree');

    res.json({
      success: true,
      data: enhancedTree
    });
  } catch (error) {
    logger.error('Error retrieving modern permissions tree', { error: error.message });
    next(error);
  }
};
