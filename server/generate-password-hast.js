const bcrypt = require('bcryptjs');

// Tạo password hash cho admin123 
async function generateHash() {
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log(`Mật khẩu: ${password}`);
  console.log(`Hash: ${hash}`);
  
  // Kiểm tra lại hash
  const isValid = await bcrypt.compare(password, hash);
  console.log(`Hash có khớp với mật khẩu không? ${isValid ? 'Đúng' : 'Sai'}`);
  
  return hash;
}

generateHash();