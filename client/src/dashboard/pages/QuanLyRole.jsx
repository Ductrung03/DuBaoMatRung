import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FaUserShield, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaUsers, FaKey, FaCog } from 'react-icons/fa';
import { useIsMobile } from '../../hooks/useMediaQuery';

const QuanLyRoleUltraModern = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const isMobile = useIsMobile();

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // Debug selectedPermissions changes
  useEffect(() => {
    // Debug log đã tắt
  }, [selectedPermissions]);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/auth/roles?include_permissions=true');
      if (response.data.success) {
        // Debug log đã tắt
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Lỗi khi tải danh sách vai trò');
    }
  };

  const fetchPermissions = async () => {
    try {
      // Sử dụng endpoint mới cho feature-based permissions tree
      const response = await api.get('/auth/permissions/role-management-tree');
      if (response.data.success) {
        setPermissions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Lỗi khi tải danh sách quyền');
    }
  };

  const fetchRolePermissions = async (roleId) => {
    try {
      const response = await api.get(`/auth/roles/${roleId}`);
      if (response.data.success) {
        const role = response.data.data;
        // Debug logs đã tắt
        const permissionCodes = role.permissions ?
          role.permissions.map(p => p.code) : [];
        // Debug log đã tắt
        setSelectedPermissions(new Set(permissionCodes));
        return role;
      }
      return null;
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      return null;
    }
  };

  const handleSavePermissions = async () => {
    try {
      setLoading(true);

      const roleDetail = await api.get(`/auth/roles/${selectedRole.id}`);
      if (!roleDetail.data.success) {
        throw new Error('Failed to fetch role details');
      }

      const existingPermissionCodes = new Set(
        roleDetail.data.data.permissions ?
          roleDetail.data.data.permissions.map(p => p.code) : []
      );

      const permissionsToAdd = [...selectedPermissions].filter(code => !existingPermissionCodes.has(code));
      const permissionsToRemove = [...existingPermissionCodes].filter(code => !selectedPermissions.has(code));

      // Debug logs đã tắt

      // Build permission code to ID map from tree structure
      const permissionCodeToId = {};
      permissions.forEach(page => {
        page.children.forEach(feature => {
          permissionCodeToId[feature.code] = feature.permission_id;
        });
      });

      // Debug log đã tắt

      // Remove permissions first
      for (const code of permissionsToRemove) {
        const permissionId = permissionCodeToId[code];
        if (permissionId) {
          // Debug log đã tắt
          await api.delete(`/auth/roles/${selectedRole.id}/permissions/${permissionId}`);
        }
      }

      // Then add new permissions
      for (const code of permissionsToAdd) {
        const permissionId = permissionCodeToId[code];
        if (permissionId) {
          // Debug log đã tắt
          await api.post('/auth/roles/permissions', {
            roleId: selectedRole.id,
            permissionId: permissionId
          });
        } else {
          console.warn(`Permission ID not found for code: ${code}`);
        }
      }

      toast.success('Cập nhật phân quyền thành công');
      setShowModal(false);

      // Refresh data sau khi lưu
      await fetchRoles();

    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi lưu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Vui lòng nhập tên vai trò');
        return;
      }

      setLoading(true);

      // Map selected permission codes to IDs
      const permissionCodeToId = {};
      permissions.forEach(page => {
        page.children.forEach(feature => {
          permissionCodeToId[feature.code] = feature.permission_id;
        });
      });

      const permissionIds = [...selectedPermissions].map(code => permissionCodeToId[code]).filter(id => id);

      const payload = {
        name: formData.name,
        description: formData.description,
        permissions: permissionIds
      };

      const response = await api.post('/auth/roles', payload);

      if (response.data.success) {
        toast.success('Tạo vai trò thành công');
        setShowModal(false);
        fetchRoles();
      }
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi tạo vai trò');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.name}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/auth/roles/${role.id}`);

      if (response.data.success) {
        toast.success(`Đã xóa vai trò "${role.name}" thành công`);
        fetchRoles();
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa vai trò. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionCode) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionCode)) {
      newSelected.delete(permissionCode);
    } else {
      newSelected.add(permissionCode);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleAllPagePermissions = (pageKey) => {
    const page = permissions.find(p => p.key === pageKey);
    if (!page) return;

    const newSelected = new Set(selectedPermissions);
    const pageCodes = page.children.map(f => f.code);

    // Check if all are selected
    const allSelected = pageCodes.every(code => selectedPermissions.has(code));

    if (allSelected) {
      // Deselect all
      pageCodes.forEach(code => newSelected.delete(code));
    } else {
      // Select all
      pageCodes.forEach(code => newSelected.add(code));
    }

    setSelectedPermissions(newSelected);
  };

  const openPermissionsModal = async (role) => {
    setModalMode('permissions');
    setSelectedRole(role);

    // Initialize permissions directly from the role object passed from the list
    // This ensures immediate display of checked items without waiting for API
    if (role.permissions && Array.isArray(role.permissions)) {
      const codes = role.permissions.map(p => p.code);
      // Debug log đã tắt
      setSelectedPermissions(new Set(codes));
    } else {
      setSelectedPermissions(new Set());
    }

    setLoading(true);
    setShowModal(true);

    // Fetch fresh permissions to ensure data is up to date
    await fetchRolePermissions(role.id);
    setLoading(false);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPermissions(new Set());
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPermissions(new Set());
  };

  // Helper to count total features
  const getTotalFeatures = () => {
    return permissions.reduce((sum, page) => sum + (page.children?.length || 0), 0);
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-2 sm:p-3 mr-3 sm:mr-4">
                  <FaUserShield className="text-xl sm:text-2xl text-green-600" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Quản lý Vai trò</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Quản lý phân quyền và vai trò hệ thống</p>
                </div>
              </div>
              <button
                onClick={openCreateModal}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-2 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm min-h-[44px]"
              >
                <FaPlus className="mr-2" />
                Thêm vai trò
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-2 sm:p-3 mr-3 sm:mr-4">
                <FaUsers className="text-lg sm:text-xl text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Tổng vai trò</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{roles.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 sm:p-3 mr-3 sm:mr-4">
                <FaKey className="text-lg sm:text-xl text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Tổng chức năng</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{getTotalFeatures()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-lg p-2 sm:p-3 mr-3 sm:mr-4">
                <FaUserShield className="text-lg sm:text-xl text-orange-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Vai trò hoạt động</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{roles.filter(r => r.is_active).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Danh sách vai trò</h2>
          </div>
          <div className="p-4 sm:p-6">
            {/* Mobile: Card view */}
            <div className="lg:hidden space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start flex-1">
                      <div className="bg-green-100 rounded-lg p-2 mr-3 flex-shrink-0">
                        <FaUserShield className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1 break-words">{role.name}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${role.is_system ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                          {role.is_system ? 'Hệ thống' : 'Tùy chỉnh'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 break-words">{role.description}</p>
                  <div className="text-xs text-gray-500 mb-3 space-y-1">
                    <div>Quyền: {role.permissions?.length || role._count?.rolePermissions || 0}</div>
                    <div>ID: {role.id}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openPermissionsModal(role)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-h-[44px]"
                    >
                      <FaCog className="mr-2" />
                      Phân quyền
                    </button>
                    {!role.is_system && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="w-full text-red-600 hover:text-red-800 px-4 py-3 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium flex items-center justify-center min-h-[44px]"
                      >
                        <FaTrash className="mr-2" />
                        Xóa vai trò
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Grid view */}
            <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <div key={role.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-green-100 rounded-lg p-2 mr-3">
                        <FaUserShield className="text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{role.name}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${role.is_system ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                          {role.is_system ? 'Hệ thống' : 'Tùy chỉnh'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openPermissionsModal(role)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center"
                        title="Phân quyền"
                      >
                        <FaCog className="mr-1" />
                        Phân quyền
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{role.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Quyền: {role.permissions?.length || role._count?.rolePermissions || 0}</span>
                    <span>ID: {role.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white sm:bg-black sm:bg-opacity-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-5xl min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-hidden sm:rounded-lg sm:shadow-2xl flex flex-col">
            <div className="bg-green-600 p-4 sm:p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-2 sm:mr-3 flex-shrink-0">
                    <FaUserShield className="text-lg sm:text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-xl font-semibold break-words">
                      {modalMode === 'permissions' ? `Phân quyền cho: ${selectedRole?.name}` : 'Thêm vai trò mới'}
                    </h2>
                    <p className="text-green-100 text-xs sm:text-sm mt-1">
                      {modalMode === 'permissions' ? 'Chọn các quyền cho vai trò này' : 'Tạo vai trò mới cho hệ thống'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors ml-2 flex-shrink-0"
                >
                  <FaTimes className="text-lg sm:text-xl" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1"
                 style={{ maxHeight: isMobile ? 'calc(100vh - 180px)' : '60vh' }}>
              {/* Form fields for Create mode */}
              {modalMode === 'create' && (
                <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8 border-b border-gray-200 pb-6 sm:pb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên vai trò *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 sm:py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
                      placeholder="Nhập tên vai trò..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="3"
                      placeholder="Mô tả vai trò này..."
                    />
                  </div>
                </div>
              )}

              {/* Permission Tree - Always show for create, or if permissions mode */}
              {(modalMode === 'permissions' || modalMode === 'create') && (
                <div className="space-y-4 sm:space-y-6">
                  {modalMode === 'create' && (
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 border-l-4 border-green-500 pl-3">
                      Phân quyền chức năng
                    </h3>
                  )}
                  {permissions.map((page) => {
                    const pageFeatureCodes = page.children.map(f => f.code);
                    const selectedCount = pageFeatureCodes.filter(code => selectedPermissions.has(code)).length;
                    const allSelected = pageFeatureCodes.length > 0 && selectedCount === pageFeatureCodes.length;
                    const someSelected = selectedCount > 0 && selectedCount < pageFeatureCodes.length;

                    return (
                      <div key={page.key} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                        {/* Page Header */}
                        <div
                          className="border-b border-gray-200 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100"
                          style={{ backgroundColor: page.color ? `${page.color}10` : 'white' }}
                          onClick={() => toggleAllPagePermissions(page.key)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={el => {
                                  if (el) el.indeterminate = someSelected;
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleAllPagePermissions(page.key);
                                }}
                                className="h-5 w-5 sm:h-5 sm:w-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-2 sm:mr-3 flex-shrink-0"
                              />
                              <div className="flex items-center flex-1 min-w-0 gap-2 sm:gap-3">
                                <div
                                  className="rounded-lg p-1.5 sm:p-2 flex-shrink-0"
                                  style={{ backgroundColor: page.color ? `${page.color}20` : '#f3f4f6' }}
                                >
                                  <FaKey className="text-base sm:text-lg" style={{ color: page.color || '#059669' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">{page.name}</h3>
                                  <p className="text-xs text-gray-500 mt-0.5 break-words">{page.description}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center flex-shrink-0">
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
                                {selectedCount} / {page.children.length}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="p-3 sm:p-4 bg-gray-50">
                          <div className="grid grid-cols-1 gap-3">
                            {page.children.map((feature) => {
                              const isChecked = selectedPermissions.has(feature.code);
                              return (
                                <div
                                  key={feature.code}
                                  className={`relative p-3 sm:p-3 rounded-lg border-2 transition-all cursor-pointer active:scale-[0.98] ${isChecked
                                    ? 'bg-green-50 border-green-300 shadow-sm'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                    }`}
                                  onClick={() => togglePermission(feature.code)}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        togglePermission(feature.code);
                                      }}
                                      className="mt-0.5 h-5 w-5 sm:h-4 sm:w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-sm font-medium text-gray-900 leading-tight break-words flex-1">{feature.name}</h4>
                                        {isChecked && (
                                          <div className="bg-green-500 text-white text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0">
                                            ✓
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1 leading-relaxed break-words">{feature.description}</p>
                                      <div className="mt-2">
                                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono break-all">
                                          {feature.code}
                                        </code>
                                      </div>
                                      {feature.ui_element && (
                                        <div className="text-xs text-gray-400 mt-1 break-words">
                                          UI: {feature.ui_element}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                {modalMode === 'permissions' && (
                  <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                    Đã chọn: <span className="font-semibold text-green-600">{selectedPermissions.size}</span> / {getTotalFeatures()} chức năng
                  </div>
                )}
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:space-x-3 sm:ml-auto">
                  <button
                    onClick={closeModal}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                    disabled={loading}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={modalMode === 'permissions' ? handleSavePermissions : handleCreateRole}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center transition-colors shadow-md min-h-[44px]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <FaSave className="mr-2" />
                        {modalMode === 'permissions' ? 'Lưu phân quyền' : 'Tạo vai trò'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyRoleUltraModern;
