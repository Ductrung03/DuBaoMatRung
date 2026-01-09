const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticateToken = async (req, res, next) => {
  try {
    // Kiểm tra user info từ gateway headers trước
    const userId = req.headers['x-user-id'];
    const username = req.headers['x-user-username'];

    if (userId && username) {
      // User đã được authenticate bởi gateway
      const parsedUserId = parseInt(userId);

      req.user = {
        id: !isNaN(parsedUserId) ? parsedUserId : null,
        username: username,
        roles: req.headers['x-user-roles'] ? req.headers['x-user-roles'].split(',') : [],
        permissions: req.headers['x-user-permissions'] ? req.headers['x-user-permissions'].split(',') : []
      };
      return next();
    }

    // Fallback: kiểm tra token trực tiếp
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy thông tin user từ database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        full_name: true,
        is_active: true
      }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = {
  authenticateToken
};
