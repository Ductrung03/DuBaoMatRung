import React, { useState, useEffect } from 'react';
import { 
  FaUserShield, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaChartLine,
  FaDatabase,
  FaFileAlt,
  FaExclamationTriangle,
  FaUsers,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissionsTree, setPermissionsTree] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  // Icon mapping cho các trang
  const iconMap = {
    FaChartLine: FaChartLine,
    FaDatabase: FaDatabase,
    FaFileAlt: FaFileAlt,
    FaExclamationTriangle: FaExclamationTriangle,
    FaUsers: FaUsers,
    FaUserShield: FaUserShield
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissionsTree();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/auth/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách vai trò');
    }
  };

  const fetchPermissionsTree = async () => {
    try {
      const response = await fetch('/api/auth/permissions/role-management-tree', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPermissionsTree(data.data);
      }
    } catch (error) {
      toast.error('Lỗi khi tải cấu trúc phân quyền');
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: []
    });
    setShowModal(true);
  };

  const handleEditRole = async (role) => {
    try {
      const response = await fetch(`/api/auth/roles/${role.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSelectedRole(role);
        setFormData({
          name: data.data.name,
          description: data.data.description || '',
          permissions: data.data.permissions.map(p => p.id)
        });
        setShowModal(true);
      }
    } catch (error) {
      toast.error('Lỗi khi tải thông tin vai trò');
    }
  };

  const handleSaveRole = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên vai trò');
      return;
    }

    setLoading(true);
    try {
      const url = selectedRole 
        ? `/api/auth/roles/${selectedRole.id}`
        : '/api/auth/roles';
      
      const method = selectedRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permission_ids: formData.permissions
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(selectedRole ? 'Cập nhật vai trò thành công' : 'Tạo vai trò thành công');
        setShowModal(false);
        fetchRoles();
      } else {
        toast.error(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Lỗi khi lưu vai trò');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/roles/${role.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Xóa vai trò thành công');
        fetchRoles();
      } else {
        toast.error(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Lỗi khi xóa vai trò');
    }
  };

  const handlePermissionChange = (permissionId, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(id => id !== permissionId)
    }));
  };

  const handlePageToggle = (page, checked) => {
    const pagePermissionIds = page.children.map(feature => feature.permission_id);
    
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...pagePermissionIds])]
        : prev.permissions.filter(id => !pagePermissionIds.includes(id))
    }));
  };

  const isPageChecked = (page) => {
    const pagePermissionIds = page.children.map(feature => feature.permission_id);
    return pagePermissionIds.every(id => formData.permissions.includes(id));
  };

  const isPageIndeterminate = (page) => {
    const pagePermissionIds = page.children.map(feature => feature.permission_id);
    const checkedCount = pagePermissionIds.filter(id => formData.permissions.includes(id)).length;
    return checkedCount > 0 && checkedCount < pagePermissionIds.length;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaUserShield className="text-purple-600" />
            Quản lý vai trò
          </h1>
          <p className="text-gray-600 mt-1">Quản lý vai trò và phân quyền trong hệ thống</p>
        </div>
        <button
          onClick={handleCreateRole}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FaPlus />
          Tạo vai trò mới
        </button>
      </div>

      {/* Danh sách vai trò */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số quyền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <FaUserShield className="text-purple-600 text-sm" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{role.name}</div>
                        {role.is_system && (
                          <div className="text-xs text-blue-600">Vai trò hệ thống</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{role.description || 'Không có mô tả'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {role._count?.rolePermissions || 0} quyền
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      role.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {role.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Chỉnh sửa"
                      >
                        <FaEdit />
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Xóa"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tạo/sửa vai trò */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedRole ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
              </h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Thông tin cơ bản */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên vai trò *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Nhập tên vai trò"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Nhập mô tả vai trò"
                    />
                  </div>
                </div>

                {/* Phân quyền */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Phân quyền theo trang và chức năng</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4">
                    {permissionsTree.map((page) => {
                      const IconComponent = iconMap[page.icon] || FaUserShield;
                      const pageChecked = isPageChecked(page);
                      const pageIndeterminate = isPageIndeterminate(page);

                      return (
                        <div key={page.key} className="border border-gray-200 rounded-lg p-3">
                          {/* Header trang */}
                          <div className="flex items-center gap-3 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pageChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = pageIndeterminate;
                                }}
                                onChange={(e) => handlePageToggle(page, e.target.checked)}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <IconComponent 
                                className="text-lg" 
                                style={{ color: page.color }} 
                              />
                              <span className="font-medium text-gray-900">{page.name}</span>
                            </label>
                          </div>

                          {/* Danh sách chức năng */}
                          <div className="ml-6 space-y-2">
                            {page.children.map((feature) => (
                              <label key={feature.key} className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(feature.permission_id)}
                                  onChange={(e) => handlePermissionChange(feature.permission_id, e.target.checked)}
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5"
                                />
                                <div>
                                  <div className="text-sm text-gray-900">{feature.name}</div>
                                  <div className="text-xs text-gray-500">{feature.description}</div>
                                  <div className="text-xs text-blue-600 mt-1">{feature.ui_element}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveRole}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <FaCheck />
                    {selectedRole ? 'Cập nhật' : 'Tạo mới'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
