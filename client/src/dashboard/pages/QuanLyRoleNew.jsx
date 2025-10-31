import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaUserShield, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, 
  FaUsers, FaKey, FaCog, FaChevronDown, FaChevronRight,
  FaCheck, FaEye, FaDatabase, FaFileAlt, FaSearch
} from 'react-icons/fa';

const QuanLyRoleNew = () => {
  const [roles, setRoles] = useState([]);
  const [pagesAndFeatures, setPagesAndFeatures] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [expandedPages, setExpandedPages] = useState(new Set());

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Icon mapping cho các trang
  const pageIcons = {
    forecast: FaChevronRight,
    data_management: FaDatabase,
    reports: FaFileAlt,
    detection: FaSearch,
    user_management: FaUsers,
    role_management: FaUserShield
  };

  useEffect(() => {
    fetchRoles();
    fetchPagesAndFeatures();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/api/auth/roles?include_permissions=true');
      if (response.data.success) {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Lỗi khi tải danh sách vai trò');
    }
  };

  const fetchPagesAndFeatures = async () => {
    try {
      const response = await axios.get('/api/auth/page-permissions/all-pages-features');
      if (response.data.success) {
        setPagesAndFeatures(response.data.data.pages);
        // Mở rộng tất cả trang mặc định
        const allPageKeys = response.data.data.pages.map(page => page.key);
        setExpandedPages(new Set(allPageKeys));
      }
    } catch (error) {
      console.error('Error fetching pages and features:', error);
      toast.error('Lỗi khi tải danh sách trang và chức năng');
    }
  };

  const fetchRolePermissions = async (roleId) => {
    try {
      const response = await axios.get(`/api/auth/roles/${roleId}`);
      if (response.data.success) {
        const role = response.data.data;
        const permissionCodes = role.permissions ? 
          role.permissions.map(p => p.code) : [];
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
  
      // Tạo map từ code sang id
      const permissionCodeToId = {};
      pagesAndFeatures.forEach(page => {
        if (page.permission) {
          permissionCodeToId[page.permission.code] = page.permission.id;
        }
        page.features.forEach(feature => {
          if (feature.permission) {
            permissionCodeToId[feature.permission.code] = feature.permission.id;
          }
        });
      });
  
      // Xóa permissions
      for (const code of permissionsToRemove) {
        const permissionId = permissionCodeToId[code];
        if (permissionId) {
          await axios.delete(`/api/auth/roles/${selectedRole.id}/permissions/${permissionId}`);
        }
      }

      // Thêm permissions mới
      for (const code of permissionsToAdd) {
        const permissionId = permissionCodeToId[code];
        if (permissionId) {
          await axios.post('/api/auth/roles/permissions', {
            roleId: selectedRole.id,
            permissionId: permissionId
          });
        }
      }
  
      toast.success('Cập nhật phân quyền thành công');
      setShowModal(false);
      await fetchRoles();
      
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi lưu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const togglePagePermission = (pageKey) => {
    const page = pagesAndFeatures.find(p => p.key === pageKey);
    if (!page) return;

    const newSelected = new Set(selectedPermissions);
    const pagePermissionCode = page.permission?.code;
    
    if (pagePermissionCode) {
      if (newSelected.has(pagePermissionCode)) {
        // Bỏ chọn trang và tất cả features
        newSelected.delete(pagePermissionCode);
        page.features.forEach(feature => {
          if (feature.permission) {
            newSelected.delete(feature.permission.code);
          }
        });
      } else {
        // Chọn trang và tất cả features
        newSelected.add(pagePermissionCode);
        page.features.forEach(feature => {
          if (feature.permission) {
            newSelected.add(feature.permission.code);
          }
        });
      }
    }
    
    setSelectedPermissions(newSelected);
  };

  const toggleFeaturePermission = (pageKey, featureCode) => {
    const page = pagesAndFeatures.find(p => p.key === pageKey);
    if (!page) return;

    const newSelected = new Set(selectedPermissions);
    const pagePermissionCode = page.permission?.code;
    
    if (newSelected.has(featureCode)) {
      // Bỏ chọn feature
      newSelected.delete(featureCode);
      
      // Kiểm tra nếu không còn feature nào được chọn thì bỏ chọn trang
      const hasAnyFeatureSelected = page.features.some(f => 
        f.permission && f.permission.code !== featureCode && newSelected.has(f.permission.code)
      );
      
      if (!hasAnyFeatureSelected && pagePermissionCode) {
        newSelected.delete(pagePermissionCode);
      }
    } else {
      // Chọn feature
      newSelected.add(featureCode);
      
      // Tự động chọn trang nếu chưa được chọn
      if (pagePermissionCode && !newSelected.has(pagePermissionCode)) {
        newSelected.add(pagePermissionCode);
      }
    }
    
    setSelectedPermissions(newSelected);
  };

  const togglePageExpansion = (pageKey) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageKey)) {
      newExpanded.delete(pageKey);
    } else {
      newExpanded.add(pageKey);
    }
    setExpandedPages(newExpanded);
  };

  const openPermissionsModal = async (role) => {
    setModalMode('permissions');
    setSelectedRole(role);
    setSelectedPermissions(new Set());
    setLoading(true);
    setShowModal(true);
    
    await fetchRolePermissions(role.id);
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPermissions(new Set());
  };

  const getPageSelectionState = (page) => {
    if (!page.permission) return 'none';
    
    const pageSelected = selectedPermissions.has(page.permission.code);
    const featuresSelected = page.features.filter(f => 
      f.permission && selectedPermissions.has(f.permission.code)
    ).length;
    
    if (pageSelected && featuresSelected === page.features.length) {
      return 'all';
    } else if (featuresSelected > 0) {
      return 'partial';
    }
    return 'none';
  };

  const IconComponent = ({ iconName, className = "" }) => {
    const icons = {
      FaChevronRight: FaChevronRight,
      FaDatabase: FaDatabase,
      FaFileAlt: FaFileAlt,
      FaSearch: FaSearch,
      FaUsers: FaUsers,
      FaUserShield: FaUserShield
    };
    
    const Icon = icons[iconName] || FaKey;
    return <Icon className={className} />;
  };

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
                  <h1 className="text-2xl font-bold text-gray-900">Quản lý Vai trò (Mới)</h1>
                  <p className="text-gray-600 mt-1">Phân quyền theo trang và chức năng</p>
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
                <p className="text-sm text-gray-600">Tổng trang</p>
                <p className="text-2xl font-bold text-gray-900">{pagesAndFeatures.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-lg p-3 mr-4">
                <FaCog className="text-xl text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tổng chức năng</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pagesAndFeatures.reduce((sum, page) => sum + page.features.length, 0)}
                </p>
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
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
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
                      {modalMode === 'permissions' ? 'Chọn trang và chức năng cho vai trò này' : 'Tạo vai trò mới cho hệ thống'}
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
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <FaKey className="text-blue-600 mr-2" />
                      <div>
                        <h4 className="font-medium text-blue-900">Hướng dẫn phân quyền</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          • Tích vào tên trang để cấp quyền truy cập trang đó<br/>
                          • Tích vào chức năng cụ thể để cấp quyền sử dụng chức năng<br/>
                          • Người dùng chỉ thấy những trang và chức năng được phân quyền
                        </p>
                      </div>
                    </div>
                  </div>

                  {pagesAndFeatures.map((page) => {
                    const isExpanded = expandedPages.has(page.key);
                    const selectionState = getPageSelectionState(page);
                    
                    return (
                      <div key={page.key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <button
                                onClick={() => togglePageExpansion(page.key)}
                                className="mr-3 p-1 hover:bg-gray-200 rounded"
                              >
                                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                              </button>
                              
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectionState === 'all'}
                                  ref={input => {
                                    if (input) input.indeterminate = selectionState === 'partial';
                                  }}
                                  onChange={() => togglePagePermission(page.key)}
                                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-3"
                                />
                                
                                <div className="bg-green-100 rounded-lg p-2 mr-3">
                                  <IconComponent iconName={page.icon} className="text-green-600" />
                                </div>
                                
                                <div>
                                  <h3 className="font-semibold text-gray-900">{page.name}</h3>
                                  <p className="text-sm text-gray-500">{page.path}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {selectionState === 'all' && (
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                  Toàn quyền
                                </span>
                              )}
                              {selectionState === 'partial' && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                                  Một phần
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {page.features.length} chức năng
                              </span>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {page.features.map((feature) => {
                                const isChecked = feature.permission && selectedPermissions.has(feature.permission.code);
                                
                                return (
                                  <div 
                                    key={feature.code} 
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      isChecked 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => feature.permission && toggleFeaturePermission(page.key, feature.permission.code)}
                                  >
                                    <div className="flex items-start">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          feature.permission && toggleFeaturePermission(page.key, feature.permission.code);
                                        }}
                                        className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        disabled={!feature.permission}
                                      />
                                      <div className="ml-3 flex-1">
                                        <div className="flex items-center justify-between">
                                          <h4 className="text-sm font-medium text-gray-900">{feature.name}</h4>
                                          {isChecked && (
                                            <FaCheck className="text-green-600 text-sm" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                                        {feature.permission && (
                                          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded mt-2 inline-block">
                                            {feature.permission.code}
                                          </code>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                    Đã chọn: <span className="font-semibold text-green-600">{selectedPermissions.size}</span> quyền
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

export default QuanLyRoleNew;
