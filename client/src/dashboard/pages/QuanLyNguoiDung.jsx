// client/src/dashboard/pages/QuanLyNguoiDung.jsx - COMPLETE WITH PASSWORD TOGGLE
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaEdit,
  FaTrash,
  FaUserPlus,
  FaKey,
  FaFilter,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaUserTag,
  FaTimes,
  FaSave,
  FaInfoCircle,
  FaCheckCircle,
  FaCog,
} from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import config from "../../config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { getDistricts } from "../../utils/dropdownService.js";

const QuanLyNguoiDung = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add", "edit", "password", "roles"
  const [selectedUser, setSelectedUser] = useState(null);
  const [huyenList, setHuyenList] = useState([]);
  const { user: currentUser } = useAuth();
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Trạng thái lọc
  const [filters, setFilters] = useState({
    permission_level: "",
    district: "",
    role: "",
  });

  // ✅ UPDATED: Form state với các field mới
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    position: "",
    organization: "",
    district_id: ""
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // ✅ NEW: Password visibility toggles
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    old_password: false,
    new_password: false,
    confirm_password: false
  });

  // ✅ Permission levels mapping
  const permissionLevels = {
    'admin': 'Quản trị viên hệ thống',
    'province': 'Người dùng cấp tỉnh',
    'district': 'Người dùng cấp huyện'
  };

  // ✅ NEW: Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Lấy danh sách người dùng và huyện khi component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
          navigate("/login");
          return;
        }

        // Fetch users, districts, and roles in parallel
        const [usersResponse, districtsResponse, rolesResponse] = await Promise.allSettled([
          axios.get(`/api/users`, {
            headers: { Authorization: `Bearer ${currentToken}` },
            timeout: 10000
          }),
          getDistricts(),
          axios.get(`/api/auth/roles`, {
            headers: { Authorization: `Bearer ${currentToken}` },
            timeout: 10000
          })
        ]);

        // Handle users response
        if (usersResponse.status === 'fulfilled') {
          setUsers(usersResponse.value.data.data || []);
          setFilteredUsers(usersResponse.value.data.data || []);
        } else {
          console.error("❌ Error fetching users:", usersResponse.reason);
          const error = usersResponse.reason;
          if (error.response?.status === 401 || error.response?.status === 403) {
            toast.error("Bạn không có quyền truy cập quản lý người dùng");
            navigate("/dashboard");
          } else {
            toast.error("Không thể tải danh sách người dùng");
          }
        }

        // Handle districts response
        if (districtsResponse.status === 'fulfilled') {
          setHuyenList(districtsResponse.value || []);
        } else {
          console.error("❌ Error fetching districts:", districtsResponse.reason);
          toast.warning("Không thể tải danh sách huyện, một số tính năng có thể bị hạn chế");
          setHuyenList([]);
        }

        // Handle roles response
        if (rolesResponse.status === 'fulfilled') {
          setRoles(rolesResponse.value.data.data || []);
        } else {
          console.error("❌ Error fetching roles:", rolesResponse.reason);
          toast.warning("Không thể tải danh sách roles");
          setRoles([]);
        }

      } catch (err) {
        console.error("❌ General error in fetchInitialData:", err);
        toast.error("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate]); // ✅ Add navigate to dependencies

  // Áp dụng bộ lọc khi thay đổi
  useEffect(() => {
    filterUsers();
  }, [filters, users]);

  // Hàm lọc người dùng
  const filterUsers = () => {
    let result = [...users];

    // Lọc theo cấp phân quyền
    if (filters.permission_level) {
      result = result.filter((user) => user.permission_level === filters.permission_level);
    }

    // Lọc theo huyện
    if (filters.district) {
      result = result.filter((user) => user.district_id === filters.district);
    }

    // Lọc theo role
    if (filters.role) {
      result = result.filter((user) =>
        user.userRoles && user.userRoles.some(ur => ur.roleId === parseInt(filters.role))
      );
    }

    setFilteredUsers(result);
  };

  // Xử lý thay đổi bộ lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset bộ lọc
  const resetFilters = () => {
    setFilters({
      permission_level: "",
      district: "",
      role: "",
    });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users`);
      setUsers(res.data.data);
    } catch (err) {
      console.error("Lỗi lấy danh sách người dùng:", err);
      toast.error("Không thể lấy danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value,
    });
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      username: "",
      password: "",
      full_name: "",
      position: "",
      organization: "",
      district_id: ""
    });
    // Reset selected roles
    setSelectedRoles([]);
    // Reset password visibility
    setShowPasswords({
      password: false,
      old_password: false,
      new_password: false,
      confirm_password: false
    });
    setShowModal(true);
  };

  // ✅ UPDATED: Open edit modal với các field mới
  const openEditModal = async (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      position: user.position || "",
      organization: user.organization || "",
      district_id: user.district_id || "",
      password: "",
    });

    // Load current user roles
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/auth/users/${user.id}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userRoleIds = (res.data.data || []).map(ur => ur.roleId);
      setSelectedRoles(userRoleIds);
    } catch (err) {
      console.error("Lỗi lấy roles của user:", err);
      setSelectedRoles([]);
    }

    // Reset password visibility
    setShowPasswords({
      password: false,
      old_password: false,
      new_password: false,
      confirm_password: false
    });
    setShowModal(true);
  };

  const openPasswordModal = (user) => {
    setModalMode("password");
    setSelectedUser(user);
    setPasswordForm({
      old_password: "",
      new_password: "",
      confirm_password: "",
    });
    // Reset password visibility
    setShowPasswords({
      password: false,
      old_password: false,
      new_password: false,
      confirm_password: false
    });
    setShowModal(true);
  };

  const openRolesModal = async (user) => {
    setModalMode("roles");
    setSelectedUser(user);

    // Fetch user's current roles
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/auth/users/${user.id}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userRoleIds = (res.data.data || []).map(ur => ur.roleId);
      setSelectedRoles(userRoleIds);
    } catch (err) {
      console.error("Lỗi lấy roles của user:", err);
      setSelectedRoles([]);
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      if (modalMode === "add") {
        // Enhanced validation for user creation
        const requiredFields = [
          { field: 'username', message: 'Tên đăng nhập không được để trống' },
          { field: 'password', message: 'Mật khẩu không được để trống' },
          { field: 'full_name', message: 'Họ tên không được để trống' },
          { field: 'position', message: 'Chức vụ không được để trống' },
          { field: 'organization', message: 'Đơn vị công tác không được để trống' }
        ];

        for (const { field, message } of requiredFields) {
          if (!formData[field] || !formData[field].trim()) {
            toast.error(message);
            return;
          }
        }

        // Role validation
        if (selectedRoles.length === 0) {
          toast.error("Vui lòng chọn ít nhất một vai trò cho người dùng");
          return;
        }

        // Username validation
        if (formData.username.length < 3) {
          toast.error("Tên đăng nhập phải có ít nhất 3 ký tự");
          return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
          toast.error("Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới");
          return;
        }

        // Password validation
        if (formData.password.length < 6) {
          toast.error("Mật khẩu phải có ít nhất 6 ký tự");
          return;
        }

        // Thêm người dùng mới
        const userResponse = await axios.post(`/api/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const newUserId = userResponse.data.data.id;

        // Gán roles cho user mới
        for (const roleId of selectedRoles) {
          await axios.post(
            `/api/auth/users/${newUserId}/roles`,
            { roleId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        toast.success(`Thêm người dùng thành công với ${selectedRoles.length} vai trò!`);
      } else if (modalMode === "edit") {
        // Validation for edit
        const requiredFields = [
          { field: 'full_name', message: 'Họ tên không được để trống' },
          { field: 'position', message: 'Chức vụ không được để trống' },
          { field: 'organization', message: 'Đơn vị công tác không được để trống' }
        ];

        for (const { field, message } of requiredFields) {
          if (!formData[field] || !formData[field].trim()) {
            toast.error(message);
            return;
          }
        }

        // Password validation if provided
        if (formData.password && formData.password.length < 6) {
          toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
          return;
        }

        // Cập nhật người dùng
        await axios.put(`/api/users/${selectedUser.id}`, {
          full_name: formData.full_name,
          position: formData.position,
          organization: formData.organization,
          district_id: formData.district_id,
          is_active: true,
          ...(formData.password ? { password: formData.password } : {}),
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Cập nhật người dùng thành công!");
      } else if (modalMode === "password") {
        // Enhanced password validation
        if (!passwordForm.old_password.trim()) {
          toast.error("Vui lòng nhập mật khẩu cũ");
          return;
        }

        if (!passwordForm.new_password.trim()) {
          toast.error("Vui lòng nhập mật khẩu mới");
          return;
        }

        if (passwordForm.new_password.length < 6) {
          toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
          return;
        }

        if (passwordForm.new_password !== passwordForm.confirm_password) {
          toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
          return;
        }

        if (passwordForm.old_password === passwordForm.new_password) {
          toast.error("Mật khẩu mới phải khác mật khẩu cũ");
          return;
        }

        await axios.put(`/api/users/${selectedUser.id}/change-password`, {
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Đổi mật khẩu thành công!");
      } else if (modalMode === "roles") {
        // Fetch current roles
        const currentRes = await axios.get(`/api/auth/users/${selectedUser.id}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const currentRoleIds = (currentRes.data.data || []).map(ur => ur.roleId);

        // Determine roles to add and remove
        const toAdd = selectedRoles.filter(id => !currentRoleIds.includes(id));
        const toRemove = currentRoleIds.filter(id => !selectedRoles.includes(id));

        // Add new roles
        for (const roleId of toAdd) {
          await axios.post(
            `/api/auth/users/${selectedUser.id}/roles`,
            { roleId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        // Remove old roles
        for (const roleId of toRemove) {
          await axios.delete(
            `/api/auth/users/${selectedUser.id}/roles/${roleId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        toast.success(`Cập nhật vai trò thành công! ${selectedRoles.length > 0 ? `Đã gán ${selectedRoles.length} vai trò.` : 'Đã xóa tất cả vai trò.'}`);
      }

      closeModal();
      fetchUsers();
    } catch (err) {
      console.error("Lỗi:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Có lỗi xảy ra";
      
      // Handle specific error cases
      if (err.response?.status === 409) {
        toast.error("Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.");
      } else if (err.response?.status === 401) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        navigate("/login");
      } else if (err.response?.status === 403) {
        toast.error("Bạn không có quyền thực hiện thao tác này.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // ✅ CHANGED: "Vô hiệu hóa" thành "Xóa người dùng"
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${user.full_name}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/users/${user.id}`);
      toast.success(`Đã xóa người dùng: ${user.full_name}`);
      fetchUsers();
    } catch (err) {
      console.error("Lỗi khi xóa người dùng:", err);
      toast.error("Không thể xóa người dùng");
    }
  };

  // Không cho phép admin xóa tài khoản chính mình
  const canDeleteUser = (user) => {
    return user.id !== currentUser.id;
  };

  const getDistrictName = (districtId) => {
    if (!districtId) return "Toàn tỉnh";

    const district = huyenList.find((h) => h.value === districtId);
    return district ? district.label : districtId;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h2>
        <button
          onClick={openAddModal}
          className="bg-forest-green-primary text-white py-2 px-4 rounded-md flex items-center"
        >
          <FaUserPlus className="mr-2" />
          Thêm người dùng
        </button>
      </div>

      {/* Filter section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-forest-green-primary focus:border-forest-green-primary"
            >
              <option value="">Tất cả roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cấp phân quyền (cũ)
            </label>
            <select
              name="permission_level"
              value={filters.permission_level}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-forest-green-primary focus:border-forest-green-primary"
            >
              <option value="">Tất cả cấp phân quyền</option>
              <option value="admin">Quản trị viên hệ thống</option>
              <option value="province">Người dùng cấp tỉnh</option>
              <option value="district">Người dùng cấp huyện</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Khu vực quản lý
            </label>
            <select
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-forest-green-primary focus:border-forest-green-primary"
            >
              <option value="">Tất cả khu vực</option>
              {huyenList.map((huyen, idx) => (
                <option key={idx} value={huyen.value}>
                  {huyen.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={resetFilters}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md flex items-center hover:bg-gray-300"
            >
              <FaFilter className="mr-2" />
              Bỏ lọc
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <ClipLoader color="#027e02" size={50} />
          <p className="ml-2 text-lg text-forest-green-primary">Đang tải...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Họ tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chức vụ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đơn vị công tác
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khu vực quản lý
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cấp phân quyền (cũ)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đăng nhập cuối
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.position || "Chưa cập nhật"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.organization || "Chưa cập nhật"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDistrictName(user.district_id)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles && user.userRoles.length > 0 ? (
                          user.userRoles.map((ur) => (
                            <span
                              key={ur.id}
                              className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                            >
                              {ur.role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">Chưa có role</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.permission_level === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : user.permission_level === "province"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {permissionLevels[user.permission_level] || "Không xác định"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString("vi-VN")
                        : "Chưa đăng nhập"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <button
                        onClick={() => openRolesModal(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Quản lý roles"
                      >
                        <FaUserTag />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Chỉnh sửa"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => openPasswordModal(user)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Đổi mật khẩu"
                      >
                        <FaKey />
                      </button>
                      {canDeleteUser(user) && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900"
                          title="Xóa người dùng"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {filters.permission_level || filters.district || filters.role
                      ? "Không tìm thấy người dùng phù hợp với bộ lọc."
                      : "Không có dữ liệu người dùng."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* ✅ IMPROVED: Modal thêm/sửa/đổi mật khẩu người dùng */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ 
            zIndex: 100000,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            style={{ zIndex: 100001 }}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-forest-green-primary to-green-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                    {modalMode === "add" ? (
                      <FaUserPlus className="text-white text-lg" />
                    ) : modalMode === "edit" ? (
                      <FaEdit className="text-white text-lg" />
                    ) : modalMode === "password" ? (
                      <FaKey className="text-white text-lg" />
                    ) : (
                      <FaUserTag className="text-white text-lg" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {modalMode === "add"
                        ? "Thêm người dùng mới"
                        : modalMode === "edit"
                        ? "Chỉnh sửa thông tin người dùng"
                        : modalMode === "password"
                        ? "Đổi mật khẩu người dùng"
                        : "Quản lý vai trò người dùng"}
                    </h3>
                    {selectedUser && modalMode !== "add" && (
                      <p className="text-green-100 text-sm">
                        {selectedUser.full_name} ({selectedUser.username})
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                      {modalMode === "password" ? (
                        // ✅ UPDATED: Form đổi mật khẩu với toggle
                        <div className="space-y-6">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <FaKey className="text-yellow-600 mr-2" />
                              <p className="text-sm text-yellow-800">
                                Đổi mật khẩu cho: <strong className="text-yellow-900">{selectedUser?.full_name}</strong>
                              </p>
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="old_password"
                              className="block text-sm font-semibold text-gray-700 mb-2"
                            >
                              Mật khẩu hiện tại *
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.old_password ? "text" : "password"}
                                name="old_password"
                                id="old_password"
                                required
                                value={passwordForm.old_password}
                                onChange={handlePasswordChange}
                                className="user-management-input pr-12"
                                placeholder="Nhập mật khẩu hiện tại"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('old_password')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {showPasswords.old_password ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="new_password"
                              className="block text-sm font-semibold text-gray-700 mb-2"
                            >
                              Mật khẩu mới *
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.new_password ? "text" : "password"}
                                name="new_password"
                                id="new_password"
                                required
                                value={passwordForm.new_password}
                                onChange={handlePasswordChange}
                                className="user-management-input pr-12"
                                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new_password')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {showPasswords.new_password ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="confirm_password"
                              className="block text-sm font-semibold text-gray-700 mb-2"
                            >
                              Xác nhận mật khẩu mới *
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.confirm_password ? "text" : "password"}
                                name="confirm_password"
                                id="confirm_password"
                                required
                                value={passwordForm.confirm_password}
                                onChange={handlePasswordChange}
                                className="user-management-input pr-12"
                                placeholder="Nhập lại mật khẩu mới"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm_password')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {showPasswords.confirm_password ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                            {passwordForm.new_password && passwordForm.confirm_password && 
                             passwordForm.new_password !== passwordForm.confirm_password && (
                              <p className="text-red-500 text-xs mt-1">
                                Mật khẩu xác nhận không khớp
                              </p>
                            )}
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Yêu cầu mật khẩu:</h4>
                            <ul className="text-xs text-blue-800 space-y-1">
                              <li>• Tối thiểu 6 ký tự</li>
                              <li>• Khác với mật khẩu hiện tại</li>
                              <li>• Nên sử dụng kết hợp chữ cái, số và ký tự đặc biệt</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        // ✅ UPDATED: Form thêm/sửa người dùng với các field mới và toggle password
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label
                                htmlFor="username"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                              >
                                Tên đăng nhập *
                              </label>
                              <input
                                type="text"
                                name="username"
                                id="username"
                                required
                                readOnly={modalMode === "edit"}
                                value={formData.username}
                                onChange={handleInputChange}
                                className="user-management-input"
                                placeholder="Nhập tên đăng nhập"
                              />
                              {modalMode === "add" && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Chỉ được chứa chữ cái, số và dấu gạch dưới
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <label
                                htmlFor="full_name"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                              >
                                Họ và tên *
                              </label>
                              <input
                                type="text"
                                name="full_name"
                                id="full_name"
                                required
                                value={formData.full_name}
                                onChange={handleInputChange}
                                className="user-management-input"
                                placeholder="Nhập họ và tên đầy đủ"
                              />
                            </div>
                          </div>

                          {modalMode === "add" && (
                            <div>
                              <label
                                htmlFor="password"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                              >
                                Mật khẩu *
                              </label>
                              <div className="relative">
                                <input
                                  type={showPasswords.password ? "text" : "password"}
                                  name="password"
                                  id="password"
                                  required={modalMode === "add"}
                                  value={formData.password}
                                  onChange={handleInputChange}
                                  className="user-management-input pr-12"
                                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                                />
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility('password')}
                                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  {showPasswords.password ? <FaEyeSlash /> : <FaEye />}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label
                                htmlFor="position"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                              >
                                Chức vụ *
                              </label>
                              <input
                                type="text"
                                name="position"
                                id="position"
                                required
                                value={formData.position}
                                onChange={handleInputChange}
                                placeholder="VD: Cán bộ kiểm lâm, Trưởng hạt kiểm lâm..."
                                className="user-management-input"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="organization"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                              >
                                Đơn vị công tác *
                              </label>
                              <input
                                type="text"
                                name="organization"
                                id="organization"
                                required
                                value={formData.organization}
                                onChange={handleInputChange}
                                placeholder="VD: Hạt Kiểm lâm Lào Cai, Chi cục Kiểm lâm tỉnh..."
                                className="user-management-input"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="district_id"
                              className="block text-sm font-semibold text-gray-700 mb-2"
                            >
                              Phạm vi dữ liệu
                            </label>
                            <select
                              name="district_id"
                              id="district_id"
                              value={formData.district_id || ""}
                              onChange={handleInputChange}
                              className="user-management-select"
                            >
                              <option value="">Toàn tỉnh</option>
                              {huyenList.map((huyen, idx) => (
                                <option key={idx} value={huyen.value}>
                                  {huyen.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Chọn khu vực dữ liệu mà người dùng có thể truy cập
                            </p>
                          </div>

                          {modalMode === "edit" && (
                            <div>
                              <label
                                htmlFor="password"
                                className="block text-sm font-semibold text-gray-700 mb-2"
                              >
                                Mật khẩu mới (để trống nếu không đổi)
                              </label>
                              <div className="relative">
                                <input
                                  type={showPasswords.password ? "text" : "password"}
                                  name="password"
                                  id="password"
                                  value={formData.password}
                                  onChange={handleInputChange}
                                  className="user-management-input pr-12"
                                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                />
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility('password')}
                                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  {showPasswords.password ? <FaEyeSlash /> : <FaEye />}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Role Selection for Add/Edit */}
                          {(modalMode === "add" || modalMode === "edit") && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Vai trò (Roles) *
                              </label>
                              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto role-selection-scroll">
                                {roles.length === 0 ? (
                                  <div className="text-center py-4 text-gray-500">
                                    <FaUserTag className="mx-auto text-2xl mb-2 opacity-50" />
                                    <p className="text-sm">Không có vai trò nào</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {roles.map((role) => {
                                      const isSelected = selectedRoles.includes(role.id);
                                      return (
                                        <div
                                          key={role.id}
                                          onClick={() => {
                                            setSelectedRoles(prev => {
                                              if (prev.includes(role.id)) {
                                                return prev.filter(id => id !== role.id);
                                              } else {
                                                return [...prev, role.id];
                                              }
                                            });
                                          }}
                                          className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                            isSelected
                                              ? "border-green-500 bg-green-50"
                                              : "border-gray-200 hover:border-gray-300 bg-white"
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mr-3 ${
                                              isSelected 
                                                ? "bg-green-500 border-green-500" 
                                                : "border-gray-300 bg-white"
                                            }`}>
                                              {isSelected && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                              )}
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex items-center">
                                                <span className="font-medium text-gray-900">{role.name}</span>
                                                {role.is_system && (
                                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                    Hệ thống
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-sm text-gray-600 mt-1">{role.description || "Không có mô tả"}</p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              {selectedRoles.length === 0 && (
                                <p className="text-red-500 text-xs mt-1">
                                  Vui lòng chọn ít nhất một vai trò cho người dùng
                                </p>
                              )}
                              {selectedRoles.length > 0 && (
                                <p className="text-green-600 text-xs mt-1">
                                  Đã chọn {selectedRoles.length} vai trò
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {modalMode === "roles" && (
                        // Roles Management - Improved UI
                        <div className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <FaUserTag className="text-blue-600 mr-2" />
                              <p className="text-sm text-blue-800">
                                Quản lý vai trò cho: <strong className="text-blue-900">{selectedUser?.full_name}</strong>
                              </p>
                            </div>
                          </div>

                          {/* Role Selection */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-gray-900">Chọn vai trò</h4>
                              <span className="text-sm text-gray-500">
                                {selectedRoles.length} / {roles.length} được chọn
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto role-selection-scroll border border-gray-200 rounded-lg p-3 bg-gray-50">
                              {roles.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                  <FaUserTag className="mx-auto text-4xl mb-2 opacity-50" />
                                  <p className="font-medium">Không có vai trò nào được tạo</p>
                                  <p className="text-sm">Vui lòng tạo vai trò trước khi gán cho người dùng</p>
                                </div>
                              ) : (
                                roles.map((role) => {
                                  const isSelected = selectedRoles.includes(role.id);
                                  return (
                                    <div
                                      key={role.id}
                                      onClick={() => {
                                        setSelectedRoles(prev => {
                                          if (prev.includes(role.id)) {
                                            return prev.filter(id => id !== role.id);
                                          } else {
                                            return [...prev, role.id];
                                          }
                                        });
                                      }}
                                      className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5 ${
                                        isSelected
                                          ? "border-green-500 bg-green-50 shadow-sm ring-2 ring-green-200"
                                          : "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50"
                                      }`}
                                    >
                                      <div className="flex items-start">
                                        {/* Enhanced Checkbox */}
                                        <div className="flex-shrink-0 mr-3 mt-1">
                                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                                            isSelected 
                                              ? "bg-green-500 border-green-500 shadow-sm" 
                                              : "border-gray-300 bg-white hover:border-gray-400"
                                          }`}>
                                            {isSelected && (
                                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                        </div>

                                        {/* Role Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center mb-2">
                                            <h5 className="font-semibold text-gray-900 truncate text-base">
                                              {role.name}
                                            </h5>
                                            {role.is_system && (
                                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                <FaCog className="mr-1" />
                                                Hệ thống
                                              </span>
                                            )}
                                          </div>
                                          
                                          <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                            {role.description || "Không có mô tả cho vai trò này"}
                                          </p>
                                          
                                          <div className="flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center">
                                              <FaKey className="mr-1 text-gray-400" />
                                              <span className="font-medium">{role._count?.permissions || 0} quyền</span>
                                            </div>
                                            {role.created_at && (
                                              <span className="text-gray-400">
                                                Tạo: {new Date(role.created_at).toLocaleDateString('vi-VN')}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                          <div className="absolute top-2 right-2">
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Summary */}
                          <div className={`p-3 rounded-lg border ${
                            selectedRoles.length === 0 
                              ? "bg-yellow-50 border-yellow-200" 
                              : "bg-green-50 border-green-200"
                          }`}>
                            {selectedRoles.length === 0 ? (
                              <div className="flex items-center text-yellow-800">
                                <FaInfoCircle className="mr-2" />
                                <span className="text-sm">
                                  Chưa chọn vai trò nào. Người dùng sẽ không có quyền truy cập hệ thống.
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center text-green-800">
                                <FaCheckCircle className="mr-2" />
                                <span className="text-sm">
                                  Đã chọn {selectedRoles.length} vai trò. Người dùng sẽ có quyền truy cập tương ứng.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-forest-green-primary hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-green-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <ClipLoader color="#ffffff" size={16} className="mr-2" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        {modalMode === "add" ? (
                          <>
                            <FaUserPlus className="mr-2" />
                            Thêm người dùng
                          </>
                        ) : modalMode === "edit" ? (
                          <>
                            <FaSave className="mr-2" />
                            Cập nhật thông tin
                          </>
                        ) : modalMode === "password" ? (
                          <>
                            <FaKey className="mr-2" />
                            Đổi mật khẩu
                          </>
                        ) : (
                          <>
                            <FaUserTag className="mr-2" />
                            Lưu vai trò
                          </>
                        )}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FaTimes className="mr-2" />
                    Hủy bỏ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyNguoiDung;