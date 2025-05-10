import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaUserPlus, FaKey } from "react-icons/fa";
import { ClipLoader } from 'react-spinners';
import config from "../../config";
import { useAuth } from "../contexts/AuthContext";

const QuanLyNguoiDung = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add", "edit", "password"
  const [selectedUser, setSelectedUser] = useState(null);
  const { user: currentUser } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "user",
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Lấy danh sách người dùng khi component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.API_URL}/api/users`);
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
      role: "user",
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      password: "", // Để trống, người dùng có thể nhập mới hoặc không
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
        if (!formData.username || !formData.password || !formData.full_name) {
          toast.error("Vui lòng nhập đầy đủ thông tin!");
          return;
        }

        // Thêm người dùng mới
        await axios.post(`${config.API_URL}/api/users`, formData);
        toast.success("Thêm người dùng thành công!");
      } else if (modalMode === "edit") {
        // Cập nhật người dùng
        await axios.put(`${config.API_URL}/api/users/${selectedUser.id}`, {
          full_name: formData.full_name,
          role: formData.role,
          is_active: true,
          ...(formData.password ? { password: formData.password } : {}),
        });
        toast.success("Cập nhật người dùng thành công!");
      } else if (modalMode === "password") {
        // Kiểm tra mật khẩu mới và xác nhận
        if (passwordForm.new_password !== passwordForm.confirm_password) {
          toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
          return;
        }

        // Đổi mật khẩu
        await axios.put(`${config.API_URL}/api/users/${selectedUser.id}/change-password`, {
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

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active) {
        // Vô hiệu hóa
        await axios.delete(`${config.API_URL}/api/users/${user.id}`);
        toast.success(`Đã vô hiệu hóa người dùng: ${user.full_name}`);
      } else {
        // Kích hoạt lại
        await axios.put(`${config.API_URL}/api/users/${user.id}/activate`);
        toast.success(`Đã kích hoạt người dùng: ${user.full_name}`);
      }
      fetchUsers();
    } catch (err) {
      console.error("Lỗi khi thay đổi trạng thái người dùng:", err);
      toast.error("Không thể thay đổi trạng thái người dùng");
    }
  };

  // Không cho phép admin vô hiệu hóa tài khoản chính mình
  const canToggleActive = (user) => {
    return user.id !== currentUser.id;
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
                  Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
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
              {users.map((user) => (
                <tr key={user.id} className={!user.is_active ? "bg-gray-100" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"
                    }`}>
                      {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {user.is_active ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleString('vi-VN')
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
                    {canToggleActive(user) && (
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={user.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                        title={user.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                      >
                        {user.is_active ? <FaTimes /> : <FaCheck />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                    Không có dữ liệu người dùng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal thêm/sửa/đổi mật khẩu người dùng */}
      {showModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {modalMode === "add" 
                          ? "Thêm người dùng mới" 
                          : modalMode === "edit" 
                            ? "Chỉnh sửa người dùng" 
                            : "Đổi mật khẩu người dùng"}
                      </h3>
                      
                      <div className="mt-4 space-y-4">
                        {modalMode === "password" ? (
                          // Form đổi mật khẩu
                          <>
                            <div>
                              <label htmlFor="old_password" className="block text-sm font-medium text-gray-700">
                                Mật khẩu cũ
                              </label>
                              <input
                                type="password"
                                name="old_password"
                                id="old_password"
                                required
                                value={passwordForm.old_password}
                                onChange={handlePasswordChange}
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                                Mật khẩu mới
                              </label>
                              <input
                                type="password"
                                name="new_password"
                                id="new_password"
                                required
                                value={passwordForm.new_password}
                                onChange={handlePasswordChange}
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                                Xác nhận mật khẩu mới
                              </label>
                              <input
                                type="password"
                                name="confirm_password"
                                id="confirm_password"
                                required
                                value={passwordForm.confirm_password}
                                onChange={handlePasswordChange}
                                className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                          </>
                        ) : (
                          // Form thêm/sửa người dùng
                          <>
                            <div>
                              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Tên đăng nhập
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
                            {modalMode === "add" && (
                              <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                  Mật khẩu
                                </label>
                                <input
                                  type="password"
                                  name="password"
                                  id="password"
                                  required={modalMode === "add"}
                                  value={formData.password}
                                  onChange={handleInputChange}
                                  className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                />
                              </div>
                            )}
                            {modalMode === "edit" && (
                              <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                  Mật khẩu mới (để trống nếu không đổi)
                                </label>
                                <input
                                  type="password"
                                  name="password"
                                  id="password"
                                  value={formData.password}
                                  onChange={handleInputChange}
                                  className="mt-1 focus:ring-forest-green-primary focus:border-forest-green-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                />
                              </div>
                            )}
                            <div>
                              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                                Họ và tên
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
                            <div>
                              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                Vai trò
                              </label>
                              <select
                                name="role"
                                id="role"
                                required
                                value={formData.role}
                                onChange={handleInputChange}
                                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-forest-green-primary focus:border-forest-green-primary sm:text-sm"
                              >
                                <option value="user">Người dùng</option>
                                <option value="admin">Quản trị viên</option>
                              </select>
                            </div>
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
        </div>
      )}
    </div>
  );
};

export default QuanLyNguoiDung;