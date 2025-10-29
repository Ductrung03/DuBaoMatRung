import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaUserShield, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaUsers, FaKey, FaCog } from 'react-icons/fa';

const QuanLyRoleUltraModern = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());

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
    console.log('Selected permissions changed:', Array.from(selectedPermissions));
  }, [selectedPermissions]);

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/api/auth/roles?include_permissions=true');
      if (response.data.success) {
        console.log('Roles data:', response.data.data); // Debug log
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Lỗi khi tải danh sách vai trò');
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axios.get('/api/auth/permissions');
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
      const response = await axios.get(`/api/auth/roles/${roleId}`);
      if (response.data.success) {
        const role = response.data.data;
        console.log('Full role data:', role); // Debug log
        console.log('Role permissions:', role.permissions); // Debug log
        const permissionCodes = role.permissions ? 
          role.permissions.map(p => p.code) : [];
        console.log('Permission codes:', permissionCodes); // Debug log
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
      
      const roleDetail = await axios.get(`/api/auth/roles/${selectedRole.id}`);
      if (!roleDetail.data.success) {
        throw new Error('Failed to fetch role details');
      }

      const existingPermissionCodes = new Set(
        roleDetail.data.data.permissions ? 
        roleDetail.data.data.permissions.map(p => p.code) : []
      );
  
      const permissionsToAdd = [...selectedPermissions].filter(code => !existingPermissionCodes.has(code));
      const permissionsToRemove = [...existingPermissionCodes].filter(code => !selectedPermissions.has(code));
  
      console.log('Permissions to add:', permissionsToAdd);
      console.log('Permissions to remove:', permissionsToRemove);
      
      const permissionCodeToId = {};
      permissions.forEach(perm => {
        permissionCodeToId[perm.code] = perm.id;
      });
  
      // Remove permissions first
      for (const code of permissionsToRemove) {
        const permissionId = permissionCodeToId[code];
        if (permissionId) {
          console.log(`Removing permission: ${code} (ID: ${permissionId})`);
          await axios.delete(`/api/auth/roles/${selectedRole.id}/permissions/${permissionId}`);
        }
      }

      // Then add new permissions
      for (const code of permissionsToAdd) {
        const permissionId = permissionCodeToId[code];
        if (permissionId) {
          console.log(`Adding permission: ${code} (ID: ${permissionId})`);
          await axios.post('/api/auth/roles/permissions', {
            roleId: selectedRole.id,
            permissionId: permissionId
          });
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

  const togglePermission = (permissionCode) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionCode)) {
      newSelected.delete(permissionCode);
    } else {
      newSelected.add(permissionCode);
    }
    setSelectedPermissions(newSelected);
  };

  const openPermissionsModal = async (role) => {
    setModalMode('permissions');
    setSelectedRole(role);
    setSelectedPermissions(new Set()); // Clear first
    setLoading(true);
    setShowModal(true);
    
    // Fetch and set permissions after modal is open
    await fetchRolePermissions(role.id);
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPermissions(new Set());
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-3 mr-4">
                  <FaUserShield className="text-2xl text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Quản lý Vai trò</h1>
                  <p className="text-gray-600 mt-1">Quản lý vai trò và phân quyền hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition-colors shadow-sm"
              >
                <FaPlus className="mr-2" />
                Thêm vai trò
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <FaUsers className="text-xl text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng vai trò</p>
                <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3 mr-4">
                <FaKey className="text-xl text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng quyền</p>
                <p className="text-2xl font-bold text-gray-900">{permissions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-lg p-3 mr-4">
                <FaUserShield className="text-xl text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vai trò hoạt động</p>
                <p className="text-2xl font-bold text-gray-900">{roles.filter(r => r.is_active).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Danh sách vai trò</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <span>Quyền: {role._count?.rolePermissions || role.rolePermissions?.length || 0}</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                    <FaUserShield className="text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {modalMode === 'permissions' ? `Phân quyền cho: ${selectedRole?.name}` : 'Thêm vai trò mới'}
                    </h2>
                    <p className="text-green-100 text-sm mt-1">
                      {modalMode === 'permissions' ? 'Chọn các quyền cho vai trò này' : 'Tạo vai trò mới cho hệ thống'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeModal} 
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {modalMode === 'permissions' ? (
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <div key={module} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-white border-b border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 capitalize flex items-center">
                            <div className="bg-green-100 rounded-lg p-2 mr-3">
                              <FaKey className="text-green-600" />
                            </div>
                            Module: {module}
                          </h3>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {modulePermissions.length} quyền
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {modulePermissions.map((perm) => {
                            const isChecked = selectedPermissions.has(perm.code);
                            console.log(`Permission ${perm.code}: ${isChecked}`, selectedPermissions); // Debug
                            return (
                              <div key={perm.code} className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                isChecked 
                                  ? 'bg-green-50 border-green-200 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`} onClick={() => togglePermission(perm.code)}>
                                <div className="flex items-start">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      togglePermission(perm.code);
                                    }}
                                    className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                  />
                                  <div className="ml-3 flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-gray-900">{perm.name}</h4>
                                      {isChecked && (
                                        <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                          ✓ Đã chọn
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                                    <div className="flex items-center justify-between mt-2">
                                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{perm.code}</code>
                                      <span className="text-xs text-gray-400">{perm.action} • {perm.resource}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên vai trò</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Nhập tên vai trò..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="4"
                      placeholder="Mô tả vai trò này..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                {modalMode === 'permissions' && (
                  <div className="text-sm text-gray-600">
                    Đã chọn: <span className="font-semibold text-green-600">{selectedPermissions.size}</span> / {permissions.length} quyền
                  </div>
                )}
                <div className="flex space-x-3 ml-auto">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={modalMode === 'permissions' ? handleSavePermissions : () => {}}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors shadow-md"
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
