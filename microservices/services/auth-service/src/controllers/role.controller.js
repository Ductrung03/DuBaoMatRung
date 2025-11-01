// auth-service/src/controllers/role.controller.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const prisma = require('../lib/prisma');

const logger = createLogger('role-controller');

// Add permission to role
exports.addRolePermission = async (req, res, next) => {
  try {
    const { roleId, permissionId } = req.body;

    if (!roleId || !permissionId) {
      throw new ValidationError('roleId and permissionId are required');
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(permissionId) }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    // Add permission to role (ignore if already exists)
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: parseInt(roleId),
          permission_id: parseInt(permissionId)
        }
      },
      update: {},
      create: {
        role_id: parseInt(roleId),
        permission_id: parseInt(permissionId)
      }
    });

    logger.info('Permission added to role', { roleId, permissionId });

    res.json({
      success: true,
      message: 'Permission added to role successfully'
    });
  } catch (error) {
    logger.error('Error adding permission to role:', error);
    next(error);
  }
};

// Remove permission from role
exports.removeRolePermission = async (req, res, next) => {
  try {
    const { roleId, permissionId } = req.params;

    await prisma.rolePermission.deleteMany({
      where: {
        role_id: parseInt(roleId),
        permission_id: parseInt(permissionId)
      }
    });

    logger.info('Permission removed from role', { roleId, permissionId });

    res.json({
      success: true,
      message: 'Permission removed from role successfully'
    });
  } catch (error) {
    logger.error('Error removing permission from role:', error);
    next(error);
  }
};

/**
 * Get all roles with permissions and user count
 * @route GET /api/auth/roles
 */
exports.getAllRoles = async (req, res, next) => {
  try {
    const { include_permissions = 'true' } = req.query;

    const roles = await prisma.role.findMany({
      where: {
        is_active: true
      },
      include: {
        rolePermissions: include_permissions === 'true' ? {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
                resource: true,
                action: true
              }
            }
          }
        } : false,
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
            roleDataScopes: true
          }
        }
      },
      orderBy: [
        { is_system: 'desc' },
        { name: 'asc' }
      ]
    });

    // Transform data for cleaner response
    const transformedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      is_active: role.is_active,
      created_at: role.created_at,
      updated_at: role.updated_at,
      permissions: include_permissions === 'true'
        ? role.rolePermissions.map(rp => rp.permission)
        : undefined,
      _count: {
        userRoles: role._count.userRoles,
        rolePermissions: role._count.rolePermissions, // Keep the original name
        roleDataScopes: role._count.roleDataScopes
      }
    }));

    logger.info('Retrieved all roles', { count: transformedRoles.length });

    res.json({
      success: true,
      data: transformedRoles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get role by ID with full details
 * @route GET /api/auth/roles/:id
 */
exports.getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        roleDataScopes: {
          include: {
            dataScope: true
          }
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                email: true,
                is_active: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            full_name: true
          }
        }
      }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Transform response
    const transformedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      is_active: role.is_active,
      created_at: role.created_at,
      updated_at: role.updated_at,
      created_by: role.creator,
      permissions: role.rolePermissions.map(rp => rp.permission),
      dataScopes: role.roleDataScopes.map(rds => rds.dataScope),
      users: role.userRoles.map(ur => ur.user)
    };

    res.json({
      success: true,
      data: transformedRole
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new role
 * @route POST /api/auth/roles
 */
exports.createRole = async (req, res, next) => {
  try {
    const { name, description, permissions = [], dataScopes = [] } = req.body;
    const userId = req.user?.id;

    if (!name) {
      throw new ValidationError('Role name is required');
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });

    if (existingRole) {
      throw new ValidationError(`Role '${name}' already exists`);
    }

    // Create role with permissions and data scopes in transaction
    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name,
          description,
          created_by: userId,
          is_system: false,
          is_active: true
        }
      });

      // Assign permissions if provided
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map(permId => ({
            role_id: newRole.id,
            permission_id: permId
          }))
        });
      }

      // Assign data scopes if provided
      if (dataScopes.length > 0) {
        await tx.roleDataScope.createMany({
          data: dataScopes.map(scopeId => ({
            role_id: newRole.id,
            data_scope_id: scopeId
          }))
        });
      }

      return tx.role.findUnique({
        where: { id: newRole.id },
        include: {
          rolePermissions: {
            include: { permission: true }
          },
          roleDataScopes: {
            include: { dataScope: true }
          }
        }
      });
    });

    logger.info('Role created', {
      roleId: role.id,
      name: role.name,
      permissionsCount: role.rolePermissions.length,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a role
 * @route PATCH /api/auth/roles/:id
 */
exports.updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Prevent updating system roles
    if (role.is_system) {
      throw new ValidationError('Cannot update system role');
    }

    const updatedRole = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active })
      }
    });

    logger.info('Role updated', { roleId: updatedRole.id, name: updatedRole.name });

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a role
 * @route DELETE /api/auth/roles/:id
 */
exports.deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { userRoles: true }
        }
      }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Prevent deleting system roles
    if (role.is_system) {
      throw new ValidationError('Cannot delete system role');
    }

    // Check if role has users
    if (role._count.userRoles > 0) {
      throw new ValidationError(
        `Cannot delete role '${role.name}' because it has ${role._count.userRoles} user(s) assigned`
      );
    }

    await prisma.role.delete({
      where: { id: parseInt(id) }
    });

    logger.info('Role deleted', { roleId: id, name: role.name });

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign multiple permissions to role
 * @route POST /api/auth/roles/:roleId/permissions
 */
exports.assignPermissions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      throw new ValidationError('Permission IDs array is required');
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Prevent modifying super_admin permissions
    if (role.name === 'super_admin') {
      throw new ValidationError('Cannot modify super_admin permissions');
    }

    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds.map(id => parseInt(id)) },
        is_active: true
      }
    });

    if (permissions.length !== permissionIds.length) {
      throw new ValidationError('Some permission IDs are invalid');
    }

    // Assign permissions (will skip duplicates)
    await prisma.rolePermission.createMany({
      data: permissionIds.map(permId => ({
        role_id: parseInt(roleId),
        permission_id: parseInt(permId)
      })),
      skipDuplicates: true
    });

    logger.info('Permissions assigned to role', {
      roleId,
      roleName: role.name,
      permissionsCount: permissionIds.length
    });

    res.json({
      success: true,
      message: `${permissionIds.length} permission(s) assigned successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove permission from role
 * @route DELETE /api/auth/roles/:roleId/permissions/:permissionId
 */
exports.removePermission = async (req, res, next) => {
  try {
    const { roleId, permissionId } = req.params;

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Prevent modifying super_admin permissions
    if (role.name === 'super_admin') {
      throw new ValidationError('Cannot modify super_admin permissions');
    }

    // Remove permission from role
    await prisma.rolePermission.deleteMany({
      where: {
        role_id: parseInt(roleId),
        permission_id: parseInt(permissionId)
      }
    });

    logger.info('Permission removed from role', { roleId, permissionId });

    res.json({
      success: true,
      message: 'Permission removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync role permissions (replace all)
 * @route PUT /api/auth/roles/:roleId/permissions
 */
exports.syncPermissions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      throw new ValidationError('Permission IDs array is required');
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Prevent modifying super_admin permissions
    if (role.name === 'super_admin') {
      throw new ValidationError('Cannot modify super_admin permissions');
    }

    // Verify all permissions exist
    if (permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds.map(id => parseInt(id)) },
          is_active: true
        }
      });

      if (permissions.length !== permissionIds.length) {
        throw new ValidationError('Some permission IDs are invalid');
      }
    }

    // Replace all permissions in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing permissions
      await tx.rolePermission.deleteMany({
        where: { role_id: parseInt(roleId) }
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(permId => ({
            role_id: parseInt(roleId),
            permission_id: parseInt(permId)
          }))
        });
      }
    });

    logger.info('Role permissions synced', {
      roleId,
      roleName: role.name,
      permissionsCount: permissionIds.length
    });

    res.json({
      success: true,
      message: 'Permissions synced successfully',
      data: {
        permissionsCount: permissionIds.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all permissions grouped by module and resource (Legacy)
 * @route GET /api/auth/roles/permissions/tree
 */
exports.getPermissionTree = async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        resource: true,
        action: true,
        description: true,
        order: true
      },
      orderBy: [
        { module: 'asc' },
        { resource: 'asc' },
        { order: 'asc' }
      ]
    });

    // Group by module -> resource -> actions
    const tree = {};

    permissions.forEach(perm => {
      // Initialize module if not exists
      if (!tree[perm.module]) {
        tree[perm.module] = {};
      }

      // Initialize resource if not exists
      if (!tree[perm.module][perm.resource]) {
        tree[perm.module][perm.resource] = [];
      }

      // Add permission to resource
      tree[perm.module][perm.resource].push({
        id: perm.id,
        code: perm.code,
        name: perm.name,
        action: perm.action,
        description: perm.description
      });
    });

    logger.info('Retrieved permission tree', {
      modules: Object.keys(tree).length,
      totalPermissions: permissions.length
    });

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permissions grouped by UI pages for modern UI
 * @route GET /api/auth/roles/permissions/ui-tree
 */
exports.getUIPermissionTree = async (req, res, next) => {
  try {
    const { getPermissionsByPages } = require('../config/ui-permissions');

    // Get all permissions from database
    const dbPermissions = await prisma.permission.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        resource: true,
        action: true,
        description: true,
        icon: true,
        order: true,
        ui_category: true,
        ui_path: true,
        _count: {
          select: {
            rolePermissions: true
          }
        }
      },
      orderBy: [
        { ui_category: 'asc' },
        { order: 'asc' }
      ]
    });

    // Get UI pages configuration
    const pagesConfig = getPermissionsByPages();

    // Build UI tree structure
    const uiTree = [];

    Object.entries(pagesConfig).forEach(([pageKey, pageInfo]) => {
      // Find permissions for this page
      const pagePermissions = [];

      pageInfo.permissions.forEach(configPerm => {
        const dbPerm = dbPermissions.find(p => p.code === configPerm.code);
        if (dbPerm) {
          pagePermissions.push({
            id: dbPerm.id,
            code: dbPerm.code,
            name: dbPerm.name,
            description: dbPerm.description,
            icon: dbPerm.icon || configPerm.icon,
            action: dbPerm.action,
            usageCount: dbPerm._count.rolePermissions
          });
        }
      });

      if (pagePermissions.length > 0) {
        uiTree.push({
          key: pageKey,
          name: pageInfo.name,
          icon: pageInfo.icon,
          path: pageInfo.path,
          description: pageInfo.description,
          permissions: pagePermissions,
          totalPermissions: pagePermissions.length
        });
      }
    });

    logger.info('Retrieved UI permission tree', {
      pages: uiTree.length,
      totalPermissions: dbPermissions.length
    });

    res.json({
      success: true,
      data: uiTree
    });
  } catch (error) {
    next(error);
  }
};
