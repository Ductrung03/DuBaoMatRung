// Utility functions for web-based permission system
export const PERMISSION_CATEGORIES = {
  MAIN_MENU: 'main_menu',
  FORECAST: 'forecast', 
  DATA: 'data',
  REPORTS: 'reports',
  DETECTION: 'detection',
  USER_MANAGEMENT: 'user_management',
  ROLE_MANAGEMENT: 'role_management'
};

export const PERMISSION_TYPES = {
  PAGE: 'page',
  FEATURE: 'feature', 
  ACTION: 'action'
};

// Kiểm tra quyền truy cập trang
export function canAccessPage(userPermissions, pageCode) {
  return userPermissions.some(p => p.code === pageCode && p.ui_element === 'page');
}

// Kiểm tra quyền thực hiện action
export function canPerformAction(userPermissions, actionCode) {
  return userPermissions.some(p => p.code === actionCode);
}

// Lấy menu items dựa trên permissions
export function getMenuItems(userPermissions) {
  const mainMenuPermissions = userPermissions.filter(p => 
    p.ui_category === 'main_menu' && p.ui_element === 'page'
  );
  
  return mainMenuPermissions.map(p => ({
    code: p.code,
    name: p.name,
    path: p.ui_path,
    icon: p.icon,
    order: p.order
  })).sort((a, b) => a.order - b.order);
}

// Lấy features có thể sử dụng trong một trang
export function getPageFeatures(userPermissions, pageCode) {
  const pagePermission = userPermissions.find(p => p.code === pageCode);
  if (!pagePermission) return [];
  
  return userPermissions.filter(p => 
    p.parent_id === pagePermission.id && p.ui_element === 'feature'
  );
}

// Lấy actions có thể thực hiện trong một trang
export function getPageActions(userPermissions, pageCode) {
  const pagePermission = userPermissions.find(p => p.code === pageCode);
  if (!pagePermission) return [];
  
  return userPermissions.filter(p => 
    p.parent_id === pagePermission.id && p.ui_element === 'action'
  );
}

// Tạo permission tree cho UI quản lý
export function buildPermissionTree(permissions) {
  const permissionMap = new Map();
  const tree = [];
  
  // Tạo map để tra cứu nhanh
  permissions.forEach(p => permissionMap.set(p.id, { ...p, children: [] }));
  
  // Xây dựng tree
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
}

// Validate permission structure
export function validatePermissionStructure(permissions) {
  const errors = [];
  
  permissions.forEach(p => {
    // Kiểm tra parent tồn tại
    if (p.parent_id && !permissions.find(parent => parent.id === p.parent_id)) {
      errors.push(`Permission ${p.code} has invalid parent_id: ${p.parent_id}`);
    }
    
    // Kiểm tra ui_path cho page permissions
    if (p.ui_element === 'page' && !p.ui_path) {
      errors.push(`Page permission ${p.code} missing ui_path`);
    }
  });
  
  return errors;
}
