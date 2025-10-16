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
  const [modalMode, setModalMode] = useState("add"); // "add", "edit", "password"
  const [selectedUser, setSelectedUser] = useState(null);
  const [huyenList, setHuyenList] = useState([]);
  const { user: currentUser } = useAuth();
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  // Trạng thái lọc
  const [filters, setFilters] = useState({
    permission_level: "",
    district: "",
  });

  // ✅ UPDATED: Form state với các field mới
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    position: "",
    organization: "",
    permission_level: "district",
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

        // Fetch users and districts in parallel
        const [usersResponse, districtsResponse] = await Promise.allSettled([
          axios.get(`/api/users`, {
            headers: { Authorization: `Bearer ${currentToken}` },
            timeout: 10000
          }),
          getDistricts()
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
      permission_level: "district",
      district_id: ""
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

  // ✅ UPDATED: Open edit modal với các field mới
  const openEditModal = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      position: user.position || "",
      organization: user.organization || "",
      permission_level: user.permission_level || "district",
      district_id: user.district_id || "",
      password: "",
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

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === "add") {
        // Kiểm tra dữ liệu
        if (!formData.username || !formData.password || !formData.full_name || !formData.position || !formData.organization) {
          toast.error("Vui lòng nhập đầy đủ thông tin!");
          return;
        }

        // Thêm người dùng mới
        await axios.post(`/api/users`, formData);
        toast.success("Thêm người dùng thành công!");
      } else if (modalMode === "edit") {
        // Cập nhật người dùng
        await axios.put(`/api/users/${selectedUser.id}`, {
          full_name: formData.full_name,
          position: formData.position,
          organization: formData.organization,
          permission_level: formData.permission_level,
          district_id: formData.district_id,
          is_active: true,
          ...(formData.password ? { password: formData.password } : {}),
        });
        toast.success("Cập nhật người dùng thành công!");
      } else if (modalMode === "password") {
        // Đổi mật khẩu
        if (passwordForm.new_password !== passwordForm.confirm_password) {
          toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
          return;
        }

        await axios.put(`/api/users/${selectedUser.id}/change-password`, {
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        });
        toast.success("Đổi mật khẩu thành công!");
      }

      closeModal();
      fetchUsers();
    } catch (err) {
      console.error("Lỗi:", err);
      const errorMessage = err.response?.data?.message || "Có lỗi xảy ra";
      toast.error(errorMessage);
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
              Cấp phân quyền
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
                  Cấp phân quyền
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
                    colSpan="8"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {filters.permission_level || filters.district
                      ? "Không tìm thấy người dùng phù hợp với bộ lọc."
                      : "Không có dữ liệu người dùng."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* ✅ FIXED Z-INDEX: Modal thêm/sửa/đổi mật khẩu người dùng */}
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
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ zIndex: 100001 }}
          >
            <form onSubmit={handleSubmit}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex items-center mb-4">
                      <div className="bg-forest-green-primary rounded-full p-2 mr-2">
                        <FaUser className="text-white" />
                      </div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {modalMode === "add"
                          ? "Thêm người dùng mới"
                          : modalMode === "edit"
                          ? "Chỉnh sửa người dùng"
                          : "Đổi mật khẩu người dùng"}
                      </h3>
                    </div>

                    <div className="mt-4 space-y-4">
                      {modalMode === "password" ? (
                        // ✅ UPDATED: Form đổi mật khẩu với toggle
                        <>
                          <div>
                            <label
                              htmlFor="old_password"
                              className="block text-sm font-medium text-gray-700"
                            >
                              Mật khẩu cũ *
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.old_password ? "text" : "password"}
                                name="old_password"
                                id="old_password"
                                required
                                value={passwordForm.old_password}
                                onChange={handlePasswordChange}
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('old_password')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords.old_password ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label
                              htmlFor="new_password"
                              className="block text-sm font-medium text-gray-700"
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
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new_password')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords.new_password ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label
                              htmlFor="confirm_password"
                              className="block text-sm font-medium text-gray-700"
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
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm_password')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords.confirm_password ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        // ✅ UPDATED: Form thêm/sửa người dùng với các field mới và toggle password
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-700"
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
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            
                            <div>
                              <label
                                htmlFor="full_name"
                                className="block text-sm font-medium text-gray-700"
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
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                          </div>

                          {modalMode === "add" && (
                            <div>
                              <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
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
                                  className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility('password')}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswords.password ? <FaEyeSlash /> : <FaEye />}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="position"
                                className="block text-sm font-medium text-gray-700"
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
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="organization"
                                className="block text-sm font-medium text-gray-700"
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
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="permission_level"
                                className="block text-sm font-medium text-gray-700"
                              >
                                Cấp phân quyền *
                              </label>
                              <select
                                name="permission_level"
                                id="permission_level"
                                required
                                value={formData.permission_level}
                                onChange={handleInputChange}
                                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-forest-green-primary focus:border-forest-green-primary sm:text-sm"
                              >
                                <option value="district">Người dùng cấp huyện</option>
                                <option value="province">Người dùng cấp tỉnh</option>
                                <option value="admin">Quản trị viên hệ thống</option>
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="district_id"
                                className="block text-sm font-medium text-gray-700"
                              >
                                Khu vực quản lý
                              </label>
                              <select
                                name="district_id"
                                id="district_id"
                                value={formData.district_id || ""}
                                onChange={handleInputChange}
                                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-forest-green-primary focus:border-forest-green-primary sm:text-sm"
                              >
                                <option value="">Toàn tỉnh (cho admin/cấp tỉnh)</option>
                                {huyenList.map((huyen, idx) => (
                                  <option key={idx} value={huyen.value}>
                                    {huyen.label}
                                  </option>
                                ))}
                              </select>
                              {formData.permission_level === "admin" && formData.district_id && (
                                <p className="text-yellow-600 text-xs mt-1">
                                  Lưu ý: Quản trị viên thường không nên bị giới hạn khu vực
                                </p>
                              )}
                            </div>
                          </div>

                          {modalMode === "edit" && (
                            <div>
                              <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
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
                                  className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility('password')}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswords.password ? <FaEyeSlash /> : <FaEye />}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-forest-green-primary text-base font-medium text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-green-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {modalMode === "add"
                    ? "Thêm mới"
                    : modalMode === "edit"
                    ? "Cập nhật"
                    : "Đổi mật khẩu"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hủy bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyNguoiDung;