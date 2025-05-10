// Script để test API endpoint đăng nhập
const axios = require('axios');

// Thay đổi URL nếu cần
const API_URL = 'http://localhost:3000';

// Test login API
async function testLoginAPI() {
  try {
    console.log('Đang test API đăng nhập...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Đăng nhập thành công!');
    console.log('Token:', response.data.token);
    console.log('User:', response.data.user);
    
    return response.data.token;
  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    
    return null;
  }
}

// Test user info API (yêu cầu đăng nhập trước)
async function testGetUserInfo(token) {
  if (!token) {
    console.log('⚠️ Không có token, bỏ qua test lấy thông tin người dùng');
    return;
  }
  
  try {
    console.log('Đang test API lấy thông tin người dùng...');
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Lấy thông tin người dùng thành công!');
    console.log('User:', response.data.user);
  } catch (error) {
    console.error('❌ Lỗi lấy thông tin người dùng:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Run tests
async function runTests() {
  // Test 1: Login
  const token = await testLoginAPI();
  
  // Test 2: Get user info
  await testGetUserInfo(token);
  
  console.log('✅ Hoàn thành tests');
}

// Run all tests
runTests();