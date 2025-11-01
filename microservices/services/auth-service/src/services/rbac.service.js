// auth-service/src/services/rbac.service.js
const prisma = require('../lib/prisma');
const createLogger = require('../../../../shared/logger');
const NodeCache = require('node-cache');

const logger = createLogger('rbac-service');

// Cache với TTL 5 phút
const permissionCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false
});

class RBACService {
  /**
   * Get all permissions for a user (from all their roles)
   * @param {number} userId
   * @returns {Promise<Array<{code: string, module: string, resource: string, action: string}>>}
   */
  async getUserPermissions(userId) {
    const cacheKey = `user_permissions_${userId}`;

    // Check cache first
    const cached = permissionCache.get(cacheKey);
    if (cached) {
      logger.debug('Permissions cache hit', { userId });
      return cached;
    }

    // Get from database
    const userRoles = await prisma.userRole.findMany({
      where: {
        user_id: userId,
        user: { is_active: true },
        role: { is_active: true }
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  where: { is_active: true },
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
            }
          }
        }
      }
    });

    // Flatten and deduplicate permissions
    const permissionsMap = new Map();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        const perm = rolePermission.permission;
        permissionsMap.set(perm.code, perm);
      }
    }

    const permissions = Array.from(permissionsMap.values());

    // Cache the result
    permissionCache.set(cacheKey, permissions);
    logger.debug('Permissions cached', { userId, count: permissions.length });

    return permissions;
  }

  /**
   * Get all roles for a user
   * @param {number} userId
   * @returns {Promise<Array<{id: number, name: string, description: string}>>}
   */
  async getUserRoles(userId) {
    const cacheKey = `user_roles_${userId}`;

    const cached = permissionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const userRoles = await prisma.userRole.findMany({
      where: {
        user_id: userId,
        user: { is_active: true },
        role: { is_active: true }
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            is_system: true
          }
        }
      }
    });

    const roles = userRoles.map(ur => ur.role);
    permissionCache.set(cacheKey, roles);

    return roles;
  }

  /**
   * Check if user has a specific permission
   * @param {number} userId
   * @param {string} permissionCode - e.g., 'user.user.view'
   * @returns {Promise<boolean>}
   */
  async hasPermission(userId, permissionCode) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(p => p.code === permissionCode);
  }

  /**
   * Check if user has any of the specified permissions
   * @param {number} userId
   * @param {Array<string>} permissionCodes
   * @returns {Promise<boolean>}
   */
  async hasAnyPermission(userId, permissionCodes) {
    const permissions = await this.getUserPermissions(userId);
    const userPermissionCodes = permissions.map(p => p.code);

    return permissionCodes.some(code => userPermissionCodes.includes(code));
  }

  /**
   * Check if user has all of the specified permissions
   * @param {number} userId
   * @param {Array<string>} permissionCodes
   * @returns {Promise<boolean>}
   */
  async hasAllPermissions(userId, permissionCodes) {
    const permissions = await this.getUserPermissions(userId);
    const userPermissionCodes = permissions.map(p => p.code);

    return permissionCodes.every(code => userPermissionCodes.includes(code));
  }

  /**
   * Check if user has permission matching pattern
   * @param {number} userId
   * @param {string} pattern - e.g., 'user.*', 'gis.layer.*'
   * @returns {Promise<boolean>}
   */
  async hasPermissionPattern(userId, pattern) {
    const permissions = await this.getUserPermissions(userId);
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

    return permissions.some(p => regex.test(p.code));
  }

  /**
   * Get user's data scopes
   * @param {number} userId
   * @returns {Promise<Array<DataScope>>}
   */
  async getUserDataScopes(userId) {
    const cacheKey = `user_datascopes_${userId}`;

    const cached = permissionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const userRoles = await prisma.userRole.findMany({
      where: {
        user_id: userId,
        user: { is_active: true },
        role: { is_active: true }
      },
      include: {
        role: {
          include: {
            roleDataScopes: {
              include: {
                dataScope: {
                  where: { is_active: true }
                }
              }
            }
          }
        }
      }
    });

    // Flatten and deduplicate data scopes
    const dataScopesMap = new Map();
    for (const userRole of userRoles) {
      for (const roleDataScope of userRole.role.roleDataScopes) {
        const scope = roleDataScope.dataScope;
        dataScopesMap.set(scope.code, scope);
      }
    }

    const dataScopes = Array.from(dataScopesMap.values());
    permissionCache.set(cacheKey, dataScopes);

    return dataScopes;
  }

  /**
   * Check if user has access to a specific data scope
   * @param {number} userId
   * @param {string} scopeCode
   * @returns {Promise<boolean>}
   */
  async hasDataScope(userId, scopeCode) {
    const dataScopes = await this.getUserDataScopes(userId);
    return dataScopes.some(ds => ds.code === scopeCode || ds.path.startsWith('/' + scopeCode));
  }

  /**
   * Clear user's cached permissions
   * @param {number} userId
   */
  clearUserCache(userId) {
    permissionCache.del(`user_permissions_${userId}`);
    permissionCache.del(`user_roles_${userId}`);
    permissionCache.del(`user_datascopes_${userId}`);
    logger.info('User cache cleared', { userId });
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    permissionCache.flushAll();
    logger.info('All RBAC cache cleared');
  }

  /**
   * Get permission tree for UI
   * @returns {Promise<Object>}
   */
  async getPermissionTree() {
    const permissions = await prisma.permission.findMany({
      where: { is_active: true },
      orderBy: [
        { module: 'asc' },
        { resource: 'asc' },
        { order: 'asc' }
      ]
    });

    // Group by module -> resource -> actions
    const tree = {};
    for (const perm of permissions) {
      if (!tree[perm.module]) {
        tree[perm.module] = {
          module: perm.module,
          resources: {}
        };
      }

      if (!tree[perm.module].resources[perm.resource]) {
        tree[perm.module].resources[perm.resource] = {
          resource: perm.resource,
          actions: []
        };
      }

      tree[perm.module].resources[perm.resource].actions.push({
        id: perm.id,
        code: perm.code,
        name: perm.name,
        action: perm.action,
        description: perm.description
      });
    }

    return tree;
  }

  /**
   * Validate permission codes
   * @param {Array<string>} permissionCodes
   * @returns {Promise<{valid: boolean, invalid: Array<string>}>}
   */
  async validatePermissionCodes(permissionCodes) {
    const permissions = await prisma.permission.findMany({
      where: {
        code: { in: permissionCodes },
        is_active: true
      },
      select: { code: true }
    });

    const validCodes = permissions.map(p => p.code);
    const invalidCodes = permissionCodes.filter(code => !validCodes.includes(code));

    return {
      valid: invalidCodes.length === 0,
      invalid: invalidCodes
    };
  }
}

module.exports = new RBACService();
