// client/src/dashboard/components/ChangePasswordModal.jsx - FIXED INPUT DISPLAY
import React, { useState } from 'react';
import { FaKey, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import config from '../../config';
import { useAuth } from '../contexts/AuthContext';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  
  // ✅ NEW: Password visibility toggles
  const [showPasswords, setShowPasswords] = useState({
    old_password: false,
    new_password: false,
    confirm_password: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ✅ NEW: Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.new_password !== formData.confirm_password) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${config.API_URL}/api/users/${user.id}/change-password`, {
        old_password: formData.old_password,
        new_password: formData.new_password
      });
      
      toast.success('Đổi mật khẩu thành công!');
      onClose();
      setFormData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
      // Reset password visibility
      setShowPasswords({
        old_password: false,
        new_password: false,
        confirm_password: false
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
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
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        style={{ zIndex: 100001 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-2 mr-3">
              <FaKey className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Đổi mật khẩu
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* ✅ FIXED: Old Password with proper styling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu hiện tại *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.old_password ? "text" : "password"}
                  name="old_password"
                  value={formData.old_password}
                  onChange={handleInputChange}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Nhập mật khẩu hiện tại"
                  style={{
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    WebkitTextFillColor: '#111827',
                    WebkitBackgroundClip: 'text'
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('old_password')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPasswords.old_password ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ✅ FIXED: New Password with proper styling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu mới *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new_password ? "text" : "password"}
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                  style={{
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    WebkitTextFillColor: '#111827',
                    WebkitBackgroundClip: 'text'
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new_password')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPasswords.new_password ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ✅ FIXED: Confirm Password with proper styling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu mới *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm_password ? "text" : "password"}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Nhập lại mật khẩu mới"
                  style={{
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    WebkitTextFillColor: '#111827',
                    WebkitBackgroundClip: 'text'
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm_password')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPasswords.confirm_password ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;