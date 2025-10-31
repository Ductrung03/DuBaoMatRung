import React, { useState, useEffect } from 'react';
import { 
  FaChartLine,
  FaDatabase,
  FaFileAlt,
  FaExclamationTriangle,
  FaUsers,
  FaUserShield,
  FaCheck,
  FaTimes,
  FaEye
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const PermissionTest = () => {
  const [permissionsTree, setPermissionsTree] = useState([]);
  const [userAccess, setUserAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Icon mapping
  const iconMap = {
    FaChartLine: FaChartLine,
    FaDatabase: FaDatabase,
    FaFileAlt: FaFileAlt,
    FaExclamationTriangle: FaExclamationTriangle,
    FaUsers: FaUsers,
    FaUserShield: FaUserShield
  };

  useEffect(() => {
    fetchPermissionsTree();
    fetchUserAccess();
  }, []);

  const fetchPermissionsTree = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/permissions/role-management-tree', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPermissionsTree(data.data);
        toast.success(`Tải thành công ${data.total_pages} trang với ${data.total_features} chức năng`);
      } else {
        toast.error('Lỗi khi tải cấu trúc phân quyền');
      }
    } catch (error) {
      toast.error('Lỗi kết nối API');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccess = async () => {
    try {
      const response = await fetch('/api/auth/permissions/my-access', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setUserAccess(data.data);
      }
    } catch (error) {
      console.error('Error fetching user access:', error);
    }
  };

  const hasUserAccess = (featureCode) => {
    if (!userAccess) return false;
    
    return userAccess.pages.some(page => 
      page.features.some(feature => feature.code === featureCode)
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Đang tải cấu trúc phân quyền...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaEye className="text-blue-600" />
          Test Hệ thống Phân quyền
        </h1>
        <p className="text-gray-600 mt-1">
          Xem cấu trúc phân quyền theo trang và chức năng
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cấu trúc phân quyền */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Cấu trúc phân quyền hệ thống
          </h2>
          
          <div className="space-y-4">
            {permissionsTree.map((page) => {
              const IconComponent = iconMap[page.icon] || FaUserShield;
              
              return (
                <div key={page.key} className="border border-gray-200 rounded-lg p-4">
                  {/* Header trang */}
                  <div className="flex items-center gap-3 mb-3">
                    <IconComponent 
                      className="text-xl" 
                      style={{ color: page.color }} 
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{page.name}</h3>
                      <p className="text-sm text-gray-500">{page.description}</p>
                      <p className="text-xs text-blue-600">{page.path}</p>
                    </div>
                  </div>

                  {/* Danh sách chức năng */}
                  <div className="ml-8 space-y-2">
                    {page.children.map((feature) => (
                      <div key={feature.key} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {feature.name}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {feature.code}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                          <p className="text-xs text-green-600 mt-1">{feature.ui_element}</p>
                        </div>
                        
                        {/* Trạng thái quyền của user hiện tại */}
                        <div className="flex-shrink-0">
                          {hasUserAccess(feature.code) ? (
                            <FaCheck className="text-green-500" title="Bạn có quyền này" />
                          ) : (
                            <FaTimes className="text-red-500" title="Bạn không có quyền này" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quyền của user hiện tại */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Quyền của bạn
          </h2>
          
          {userAccess ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  Bạn có quyền truy cập <strong>{userAccess.pages.length}</strong> trang 
                  với tổng cộng <strong>{userAccess.total_permissions}</strong> quyền
                </p>
              </div>

              {userAccess.pages.map((page) => {
                const IconComponent = iconMap[page.icon] || FaUserShield;
                
                return (
                  <div key={page.key} className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center gap-3 mb-3">
                      <IconComponent 
                        className="text-lg" 
                        style={{ color: page.color }} 
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{page.name}</h3>
                        <p className="text-xs text-blue-600">{page.path}</p>
                      </div>
                    </div>

                    <div className="ml-6 space-y-1">
                      {page.features.map((feature) => (
                        <div key={feature.key} className="flex items-center gap-2">
                          <FaCheck className="text-green-500 text-xs" />
                          <span className="text-sm text-gray-700">{feature.name}</span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            {feature.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Đang tải quyền của bạn...</p>
            </div>
          )}
        </div>
      </div>

      {/* API Response Debug */}
      <div className="mt-6 bg-gray-100 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug API Response</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Permissions Tree:</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(permissionsTree, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">User Access:</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(userAccess, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionTest;
