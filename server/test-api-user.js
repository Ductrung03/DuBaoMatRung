// Script để test API endpoint quản lý người dùng
const axios = require('axios');

// Thay đổi URL nếu cần
const API_URL = 'http://localhost:3000';

// Test login API để lấy token
async function testLoginAPI() {
  try {
    console.log('Đang test API đăng nhập...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Đăng nhập thành công!');
    console.log('Token:', response.data.token);
    
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

// Test lấy danh sách người dùng
async function testGetUsers(token) {
  if (!token) {
    console.log('⚠️ Không có token, bỏ qua test lấy danh sách người dùng');
    return;
  }
  
  try {
    console.log('Đang test API lấy danh sách người dùng...');
    const response = await axios.get(`${API_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Lấy danh sách người dùng thành công!');
    console.log('Số lượng người dùng:', response.data.data.length);
    console.log('Danh sách người dùng:', response.data.data);
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách người dùng:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Headers:', error.response.headers);
    }
  }
}

// Test tạo người dùng mới
async function testCreateUser(token) {
  if (!token) {
    console.log('⚠️ Không có token, bỏ qua test tạo người dùng');
    return;
  }
  
  try {
    console.log('Đang test API tạo người dùng mới...');
    const response = await axios.post(`${API_URL}/api/users`, {
      username: 'testuser',
      password: 'password123',
      full_name: 'Test User',
      role: 'user'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Tạo người dùng thành công!');
    console.log('Người dùng mới:', response.data.data);
  } catch (error) {
    console.error('❌ Lỗi tạo người dùng:', error.message);
    
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
  
  // Test 2: Get user list
  await testGetUsers(token);
  
  // Test 3: Create new user
  // Uncomment nếu muốn test tạo user
  // await testCreateUser(token);
  
  console.log('✅ Hoàn thành tests');
}

// Run all tests
runTests();