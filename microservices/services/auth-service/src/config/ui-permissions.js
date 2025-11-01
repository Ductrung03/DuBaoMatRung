// UI-based Permission Configuration
// Cấu trúc phân quyền theo trang và chức năng để dễ quản lý

const UI_PAGES_PERMISSIONS = {
  // 1. DASHBOARD - Trang tổng quan
  dashboard: {
    name: 'Dashboard',
    icon: 'FaHome',
    path: '/dashboard',
    description: 'Trang tổng quan hệ thống',
    permissions: [
      {
        code: 'dashboard.view',
        name: 'Xem Dashboard',
        description: 'Xem trang tổng quan và thống kê',
        module: 'dashboard',
        resource: 'view',
        action: 'view',
        ui_category: 'Trang chính',
        icon: 'FaEye',
        order: 1
      },
      {
        code: 'dashboard.stats.view',
        name: 'Xem thống kê tổng quan',
        description: 'Xem các chỉ số và biểu đồ tổng quan',
        module: 'dashboard',
        resource: 'stats',
        action: 'view',
        ui_category: 'Trang chính',
        icon: 'FaChartBar',
        order: 2
      }
    ]
  },

  // 2. DỰ BÁO MẤT RỪNG
  'du-bao-mat-rung': {
    name: 'Dự báo mất rừng',
    icon: 'FaChartLine',
    path: '/dashboard/dubaomatrung',
    description: 'Xem dự báo và phân tích xu hướng mất rừng',
    permissions: [
      {
        code: 'forecast.view',
        name: 'Xem dự báo',
        description: 'Xem dữ liệu dự báo mất rừng',
        module: 'forecast',
        resource: 'forecast',
        action: 'view',
        ui_category: 'Dự báo',
        icon: 'FaEye',
        order: 10
      },
      {
        code: 'forecast.map.view',
        name: 'Xem bản đồ dự báo',
        description: 'Xem bản đồ hiển thị khu vực dự báo',
        module: 'forecast',
        resource: 'map',
        action: 'view',
        ui_category: 'Dự báo',
        icon: 'FaMapMarkedAlt',
        order: 11
      },
      {
        code: 'forecast.data.export',
        name: 'Xuất dữ liệu dự báo',
        description: 'Xuất dữ liệu dự báo ra file',
        module: 'forecast',
        resource: 'data',
        action: 'export',
        ui_category: 'Dự báo',
        icon: 'FaDownload',
        order: 12
      }
    ]
  },

  // 3. PHÁT HIỆN MẤT RỪNG (Admin)
  'phat-hien-mat-rung': {
    name: 'Phát hiện mất rừng',
    icon: 'FaExclamationTriangle',
    path: '/dashboard/phathienmatrung',
    description: 'Xác minh và quản lý các trường hợp phát hiện mất rừng',
    permissions: [
      {
        code: 'gis.matrung.view',
        name: 'Xem danh sách phát hiện',
        description: 'Xem danh sách các điểm phát hiện mất rừng',
        module: 'gis',
        resource: 'matrung',
        action: 'view',
        ui_category: 'Phát hiện & Xác minh',
        icon: 'FaList',
        order: 20
      },
      {
        code: 'gis.matrung.create',
        name: 'Thêm điểm phát hiện',
        description: 'Thêm mới điểm phát hiện mất rừng',
        module: 'gis',
        resource: 'matrung',
        action: 'create',
        ui_category: 'Phát hiện & Xác minh',
        icon: 'FaPlus',
        order: 21
      },
      {
        code: 'gis.matrung.update',
        name: 'Cập nhật phát hiện',
        description: 'Chỉnh sửa thông tin điểm phát hiện',
        module: 'gis',
        resource: 'matrung',
        action: 'update',
        ui_category: 'Phát hiện & Xác minh',
        icon: 'FaEdit',
        order: 22
      },
      {
        code: 'gis.matrung.delete',
        name: 'Xóa phát hiện',
        description: 'Xóa điểm phát hiện mất rừng',
        module: 'gis',
        resource: 'matrung',
        action: 'delete',
        ui_category: 'Phát hiện & Xác minh',
        icon: 'FaTrash',
        order: 23
      },
      {
        code: 'gis.verification.view',
        name: 'Xem xác minh',
        description: 'Xem trạng thái xác minh',
        module: 'gis',
        resource: 'verification',
        action: 'view',
        ui_category: 'Phát hiện & Xác minh',
        icon: 'FaCheckCircle',
        order: 24
      },
      {
        code: 'gis.verification.approve',
        name: 'Phê duyệt xác minh',
        description: 'Phê duyệt điểm phát hiện đã xác minh',
        module: 'gis',
        resource: 'verification',
        action: 'approve',
        ui_category: 'Phát hiện & Xác minh',
        icon: 'FaCheck',
        order: 25
      },
      {
        code: 'gis.verification.reject',
        name: 'Từ chối xác minh',
        description: 'Từ chối điểm phát hiện không hợp lệ',
        module: 'gis',
        resource: 'verification',
        action: 'reject',
        ui_category: 'Phát hiện & Xác minh',
        icon: 'FaTimes',
        order: 26
      }
    ]
  },

  // 4. QUẢN LÝ DỮ LIỆU GIS
  'quan-ly-du-lieu': {
    name: 'Quản lý dữ liệu',
    icon: 'FaDatabase',
    path: '/dashboard/quanlydulieu',
    description: 'Quản lý dữ liệu GIS, lớp bản đồ và shapefile',
    permissions: [
      {
        code: 'gis.layer.view',
        name: 'Xem lớp bản đồ',
        description: 'Xem danh sách các lớp bản đồ',
        module: 'gis',
        resource: 'layer',
        action: 'view',
        ui_category: 'Dữ liệu GIS',
        icon: 'FaLayerGroup',
        order: 30
      },
      {
        code: 'gis.layer.create',
        name: 'Tạo lớp bản đồ',
        description: 'Tạo lớp bản đồ mới',
        module: 'gis',
        resource: 'layer',
        action: 'create',
        ui_category: 'Dữ liệu GIS',
        icon: 'FaPlus',
        order: 31
      },
      {
        code: 'gis.layer.update',
        name: 'Cập nhật lớp bản đồ',
        description: 'Chỉnh sửa thông tin lớp bản đồ',
        module: 'gis',
        resource: 'layer',
        action: 'update',
        ui_category: 'Dữ liệu GIS',
        icon: 'FaEdit',
        order: 32
      },
      {
        code: 'gis.layer.delete',
        name: 'Xóa lớp bản đồ',
        description: 'Xóa lớp bản đồ',
        module: 'gis',
        resource: 'layer',
        action: 'delete',
        ui_category: 'Dữ liệu GIS',
        icon: 'FaTrash',
        order: 33
      },
      {
        code: 'gis.shapefile.upload',
        name: 'Tải lên Shapefile',
        description: 'Tải lên file shapefile',
        module: 'gis',
        resource: 'shapefile',
        action: 'upload',
        ui_category: 'Dữ liệu GIS',
        icon: 'FaUpload',
        order: 34
      },
      {
        code: 'gis.shapefile.process',
        name: 'Xử lý Shapefile',
        description: 'Xử lý và import shapefile vào hệ thống',
        module: 'gis',
        resource: 'shapefile',
        action: 'process',
        ui_category: 'Dữ liệu GIS',
        icon: 'FaCog',
        order: 35
      },
      {
        code: 'gis.layer.export',
        name: 'Xuất dữ liệu GIS',
        description: 'Xuất dữ liệu lớp bản đồ',
        module: 'gis',
        resource: 'layer',
        action: 'export',
        ui_category: 'Dữ liệu GIS',
        icon: 'FaDownload',
        order: 36
      }
    ]
  },

  // 5. BÁO CÁO & THỐNG KÊ
  'bao-cao-thong-ke': {
    name: 'Báo cáo & Thống kê',
    icon: 'FaFileAlt',
    path: '/dashboard/baocao',
    description: 'Xem và quản lý báo cáo, thống kê mất rừng',
    permissions: [
      {
        code: 'report.report.view',
        name: 'Xem báo cáo',
        description: 'Xem danh sách báo cáo',
        module: 'report',
        resource: 'report',
        action: 'view',
        ui_category: 'Báo cáo',
        icon: 'FaEye',
        order: 40
      },
      {
        code: 'report.report.view_detail',
        name: 'Xem chi tiết báo cáo',
        description: 'Xem nội dung chi tiết báo cáo',
        module: 'report',
        resource: 'report',
        action: 'view_detail',
        ui_category: 'Báo cáo',
        icon: 'FaFileAlt',
        order: 41
      },
      {
        code: 'report.report.create',
        name: 'Tạo báo cáo',
        description: 'Tạo báo cáo mới',
        module: 'report',
        resource: 'report',
        action: 'create',
        ui_category: 'Báo cáo',
        icon: 'FaPlus',
        order: 42
      },
      {
        code: 'report.report.update',
        name: 'Cập nhật báo cáo',
        description: 'Chỉnh sửa báo cáo',
        module: 'report',
        resource: 'report',
        action: 'update',
        ui_category: 'Báo cáo',
        icon: 'FaEdit',
        order: 43
      },
      {
        code: 'report.report.delete',
        name: 'Xóa báo cáo',
        description: 'Xóa báo cáo',
        module: 'report',
        resource: 'report',
        action: 'delete',
        ui_category: 'Báo cáo',
        icon: 'FaTrash',
        order: 44
      },
      {
        code: 'report.report.export',
        name: 'Xuất báo cáo',
        description: 'Xuất báo cáo ra file PDF/Excel',
        module: 'report',
        resource: 'report',
        action: 'export',
        ui_category: 'Báo cáo',
        icon: 'FaDownload',
        order: 45
      },
      {
        code: 'report.report.publish',
        name: 'Xuất bản báo cáo',
        description: 'Xuất bản báo cáo công khai',
        module: 'report',
        resource: 'report',
        action: 'publish',
        ui_category: 'Báo cáo',
        icon: 'FaGlobe',
        order: 46
      },
      {
        code: 'report.statistics.view',
        name: 'Xem thống kê',
        description: 'Xem thống kê và biểu đồ',
        module: 'report',
        resource: 'statistics',
        action: 'view',
        ui_category: 'Báo cáo',
        icon: 'FaChartPie',
        order: 47
      },
      {
        code: 'report.statistics.export',
        name: 'Xuất thống kê',
        description: 'Xuất dữ liệu thống kê',
        module: 'report',
        resource: 'statistics',
        action: 'export',
        ui_category: 'Báo cáo',
        icon: 'FaFileExcel',
        order: 48
      }
    ]
  },

  // 6. TÌM KIẾM
  'tim-kiem': {
    name: 'Tìm kiếm',
    icon: 'FaSearch',
    path: '/dashboard/search',
    description: 'Tìm kiếm dữ liệu trong hệ thống',
    permissions: [
      {
        code: 'search.search.execute',
        name: 'Tìm kiếm cơ bản',
        description: 'Thực hiện tìm kiếm dữ liệu',
        module: 'search',
        resource: 'search',
        action: 'execute',
        ui_category: 'Tìm kiếm',
        icon: 'FaSearch',
        order: 50
      },
      {
        code: 'search.search.advanced',
        name: 'Tìm kiếm nâng cao',
        description: 'Sử dụng tìm kiếm nâng cao với bộ lọc',
        module: 'search',
        resource: 'search',
        action: 'advanced',
        ui_category: 'Tìm kiếm',
        icon: 'FaFilter',
        order: 51
      },
      {
        code: 'search.search.export',
        name: 'Xuất kết quả tìm kiếm',
        description: 'Xuất kết quả tìm kiếm',
        module: 'search',
        resource: 'search',
        action: 'export',
        ui_category: 'Tìm kiếm',
        icon: 'FaDownload',
        order: 52
      }
    ]
  },

  // 7. QUẢN LÝ NGƯỜI DÙNG (Admin)
  'quan-ly-nguoi-dung': {
    name: 'Quản lý người dùng',
    icon: 'FaUsers',
    path: '/dashboard/quanlynguoidung',
    description: 'Quản lý người dùng và thông tin cá nhân',
    permissions: [
      {
        code: 'user.user.view',
        name: 'Xem danh sách người dùng',
        description: 'Xem danh sách tất cả người dùng',
        module: 'user',
        resource: 'user',
        action: 'view',
        ui_category: 'Người dùng',
        icon: 'FaList',
        order: 60
      },
      {
        code: 'user.user.view_detail',
        name: 'Xem chi tiết người dùng',
        description: 'Xem thông tin chi tiết người dùng',
        module: 'user',
        resource: 'user',
        action: 'view_detail',
        ui_category: 'Người dùng',
        icon: 'FaEye',
        order: 61
      },
      {
        code: 'user.user.create',
        name: 'Tạo người dùng',
        description: 'Tạo tài khoản người dùng mới',
        module: 'user',
        resource: 'user',
        action: 'create',
        ui_category: 'Người dùng',
        icon: 'FaUserPlus',
        order: 62
      },
      {
        code: 'user.user.update',
        name: 'Cập nhật người dùng',
        description: 'Chỉnh sửa thông tin người dùng',
        module: 'user',
        resource: 'user',
        action: 'update',
        ui_category: 'Người dùng',
        icon: 'FaUserEdit',
        order: 63
      },
      {
        code: 'user.user.delete',
        name: 'Xóa người dùng',
        description: 'Xóa tài khoản người dùng',
        module: 'user',
        resource: 'user',
        action: 'delete',
        ui_category: 'Người dùng',
        icon: 'FaUserMinus',
        order: 64
      },
      {
        code: 'user.user.activate',
        name: 'Kích hoạt người dùng',
        description: 'Kích hoạt tài khoản người dùng',
        module: 'user',
        resource: 'user',
        action: 'activate',
        ui_category: 'Người dùng',
        icon: 'FaUserCheck',
        order: 65
      },
      {
        code: 'user.user.deactivate',
        name: 'Vô hiệu hóa người dùng',
        description: 'Vô hiệu hóa tài khoản người dùng',
        module: 'user',
        resource: 'user',
        action: 'deactivate',
        ui_category: 'Người dùng',
        icon: 'FaUserSlash',
        order: 66
      },
      {
        code: 'user.user.export',
        name: 'Xuất danh sách người dùng',
        description: 'Xuất danh sách người dùng ra file',
        module: 'user',
        resource: 'user',
        action: 'export',
        ui_category: 'Người dùng',
        icon: 'FaDownload',
        order: 67
      },
      {
        code: 'user.profile.view',
        name: 'Xem hồ sơ cá nhân',
        description: 'Xem thông tin hồ sơ của mình',
        module: 'user',
        resource: 'profile',
        action: 'view',
        ui_category: 'Người dùng',
        icon: 'FaUser',
        order: 68
      },
      {
        code: 'user.profile.update',
        name: 'Cập nhật hồ sơ',
        description: 'Cập nhật thông tin hồ sơ cá nhân',
        module: 'user',
        resource: 'profile',
        action: 'update',
        ui_category: 'Người dùng',
        icon: 'FaUserEdit',
        order: 69
      }
    ]
  },

  // 8. QUẢN LÝ ROLES & PERMISSIONS (Admin)
  'quan-ly-role': {
    name: 'Quản lý vai trò',
    icon: 'FaUserShield',
    path: '/dashboard/quanlyrole',
    description: 'Quản lý vai trò và phân quyền',
    permissions: [
      {
        code: 'role.role.view',
        name: 'Xem danh sách vai trò',
        description: 'Xem danh sách tất cả vai trò',
        module: 'role',
        resource: 'role',
        action: 'view',
        ui_category: 'Vai trò',
        icon: 'FaList',
        order: 70
      },
      {
        code: 'role.role.view_detail',
        name: 'Xem chi tiết vai trò',
        description: 'Xem thông tin chi tiết vai trò',
        module: 'role',
        resource: 'role',
        action: 'view_detail',
        ui_category: 'Vai trò',
        icon: 'FaEye',
        order: 71
      },
      {
        code: 'role.role.create',
        name: 'Tạo vai trò',
        description: 'Tạo vai trò mới',
        module: 'role',
        resource: 'role',
        action: 'create',
        ui_category: 'Vai trò',
        icon: 'FaPlus',
        order: 72
      },
      {
        code: 'role.role.update',
        name: 'Cập nhật vai trò',
        description: 'Chỉnh sửa thông tin vai trò',
        module: 'role',
        resource: 'role',
        action: 'update',
        ui_category: 'Vai trò',
        icon: 'FaEdit',
        order: 73
      },
      {
        code: 'role.role.delete',
        name: 'Xóa vai trò',
        description: 'Xóa vai trò',
        module: 'role',
        resource: 'role',
        action: 'delete',
        ui_category: 'Vai trò',
        icon: 'FaTrash',
        order: 74
      },
      {
        code: 'role.role.assign',
        name: 'Gán vai trò cho người dùng',
        description: 'Gán vai trò cho người dùng',
        module: 'role',
        resource: 'role',
        action: 'assign',
        ui_category: 'Vai trò',
        icon: 'FaUserTag',
        order: 75
      },
      {
        code: 'role.role.revoke',
        name: 'Thu hồi vai trò',
        description: 'Thu hồi vai trò khỏi người dùng',
        module: 'role',
        resource: 'role',
        action: 'revoke',
        ui_category: 'Vai trò',
        icon: 'FaUserTimes',
        order: 76
      },
      {
        code: 'role.permission.view',
        name: 'Xem quyền hạn',
        description: 'Xem danh sách quyền hạn',
        module: 'role',
        resource: 'permission',
        action: 'view',
        ui_category: 'Vai trò',
        icon: 'FaKey',
        order: 77
      },
      {
        code: 'role.permission.assign',
        name: 'Gán quyền cho vai trò',
        description: 'Gán quyền hạn cho vai trò',
        module: 'role',
        resource: 'permission',
        action: 'assign',
        ui_category: 'Vai trò',
        icon: 'FaKey',
        order: 78
      },
      {
        code: 'role.permission.revoke',
        name: 'Thu hồi quyền',
        description: 'Thu hồi quyền khỏi vai trò',
        module: 'role',
        resource: 'permission',
        action: 'revoke',
        ui_category: 'Vai trò',
        icon: 'FaBan',
        order: 79
      }
    ]
  },

  // 9. XÁC THỰC
  'xac-thuc': {
    name: 'Xác thực',
    icon: 'FaLock',
    path: '/login',
    description: 'Đăng nhập, đăng xuất và quản lý phiên',
    permissions: [
      {
        code: 'auth.login.execute',
        name: 'Đăng nhập',
        description: 'Đăng nhập vào hệ thống',
        module: 'auth',
        resource: 'login',
        action: 'execute',
        ui_category: 'Xác thực',
        icon: 'FaSignInAlt',
        order: 80
      },
      {
        code: 'auth.logout.execute',
        name: 'Đăng xuất',
        description: 'Đăng xuất khỏi hệ thống',
        module: 'auth',
        resource: 'logout',
        action: 'execute',
        ui_category: 'Xác thực',
        icon: 'FaSignOutAlt',
        order: 81
      },
      {
        code: 'auth.password.change',
        name: 'Đổi mật khẩu',
        description: 'Thay đổi mật khẩu của mình',
        module: 'auth',
        resource: 'password',
        action: 'change',
        ui_category: 'Xác thực',
        icon: 'FaKey',
        order: 82
      },
      {
        code: 'auth.password.reset',
        name: 'Đặt lại mật khẩu',
        description: 'Đặt lại mật khẩu người dùng',
        module: 'auth',
        resource: 'password',
        action: 'reset',
        ui_category: 'Xác thực',
        icon: 'FaUndo',
        order: 83
      },
      {
        code: 'auth.token.refresh',
        name: 'Làm mới token',
        description: 'Làm mới token xác thực',
        module: 'auth',
        resource: 'token',
        action: 'refresh',
        ui_category: 'Xác thực',
        icon: 'FaSyncAlt',
        order: 84
      },
      {
        code: 'auth.token.verify',
        name: 'Xác thực token',
        description: 'Xác thực token',
        module: 'auth',
        resource: 'token',
        action: 'verify',
        ui_category: 'Xác thực',
        icon: 'FaCheck',
        order: 85
      }
    ]
  },

  // 10. QUẢN TRỊ HỆ THỐNG (Super Admin)
  'quan-tri-he-thong': {
    name: 'Quản trị hệ thống',
    icon: 'FaCog',
    path: '/dashboard/admin',
    description: 'Quản trị hệ thống, logs, backup',
    permissions: [
      {
        code: 'admin.system.view',
        name: 'Xem cấu hình hệ thống',
        description: 'Xem cấu hình và thông tin hệ thống',
        module: 'admin',
        resource: 'system',
        action: 'view',
        ui_category: 'Quản trị',
        icon: 'FaInfoCircle',
        order: 90
      },
      {
        code: 'admin.system.update',
        name: 'Cập nhật cấu hình',
        description: 'Cập nhật cấu hình hệ thống',
        module: 'admin',
        resource: 'system',
        action: 'update',
        ui_category: 'Quản trị',
        icon: 'FaCog',
        order: 91
      },
      {
        code: 'admin.log.view',
        name: 'Xem logs',
        description: 'Xem logs hệ thống',
        module: 'admin',
        resource: 'log',
        action: 'view',
        ui_category: 'Quản trị',
        icon: 'FaFileAlt',
        order: 92
      },
      {
        code: 'admin.log.export',
        name: 'Xuất logs',
        description: 'Xuất logs ra file',
        module: 'admin',
        resource: 'log',
        action: 'export',
        ui_category: 'Quản trị',
        icon: 'FaDownload',
        order: 93
      },
      {
        code: 'admin.log.delete',
        name: 'Xóa logs',
        description: 'Xóa logs cũ',
        module: 'admin',
        resource: 'log',
        action: 'delete',
        ui_category: 'Quản trị',
        icon: 'FaTrash',
        order: 94
      },
      {
        code: 'admin.backup.create',
        name: 'Tạo backup',
        description: 'Tạo bản sao lưu dữ liệu',
        module: 'admin',
        resource: 'backup',
        action: 'create',
        ui_category: 'Quản trị',
        icon: 'FaSave',
        order: 95
      },
      {
        code: 'admin.backup.restore',
        name: 'Khôi phục backup',
        description: 'Khôi phục dữ liệu từ backup',
        module: 'admin',
        resource: 'backup',
        action: 'restore',
        ui_category: 'Quản trị',
        icon: 'FaUndo',
        order: 96
      },
      {
        code: 'admin.backup.download',
        name: 'Tải backup',
        description: 'Tải file backup',
        module: 'admin',
        resource: 'backup',
        action: 'download',
        ui_category: 'Quản trị',
        icon: 'FaDownload',
        order: 97
      },
      {
        code: 'admin.audit.view',
        name: 'Xem nhật ký kiểm toán',
        description: 'Xem nhật ký hoạt động người dùng',
        module: 'admin',
        resource: 'audit',
        action: 'view',
        ui_category: 'Quản trị',
        icon: 'FaHistory',
        order: 98
      },
      {
        code: 'admin.audit.export',
        name: 'Xuất nhật ký kiểm toán',
        description: 'Xuất nhật ký kiểm toán',
        module: 'admin',
        resource: 'audit',
        action: 'export',
        ui_category: 'Quản trị',
        icon: 'FaFileExport',
        order: 99
      }
    ]
  },

  // 11. PHẠM VI DỮ LIỆU
  'pham-vi-du-lieu': {
    name: 'Phạm vi dữ liệu',
    icon: 'FaGlobeAsia',
    path: '/dashboard/datascope',
    description: 'Quản lý phạm vi dữ liệu theo địa giới hành chính',
    permissions: [
      {
        code: 'datascope.scope.view',
        name: 'Xem phạm vi dữ liệu',
        description: 'Xem phạm vi dữ liệu của vai trò',
        module: 'datascope',
        resource: 'scope',
        action: 'view',
        ui_category: 'Phạm vi dữ liệu',
        icon: 'FaMapMarkerAlt',
        order: 100
      },
      {
        code: 'datascope.scope.assign',
        name: 'Gán phạm vi dữ liệu',
        description: 'Gán phạm vi dữ liệu cho vai trò',
        module: 'datascope',
        resource: 'scope',
        action: 'assign',
        ui_category: 'Phạm vi dữ liệu',
        icon: 'FaMapMarkedAlt',
        order: 101
      },
      {
        code: 'datascope.scope.revoke',
        name: 'Thu hồi phạm vi dữ liệu',
        description: 'Thu hồi phạm vi dữ liệu khỏi vai trò',
        module: 'datascope',
        resource: 'scope',
        action: 'revoke',
        ui_category: 'Phạm vi dữ liệu',
        icon: 'FaBan',
        order: 102
      }
    ]
  }
};

/**
 * Get all permissions flattened
 */
function getAllPermissions() {
  const allPermissions = [];
  Object.values(UI_PAGES_PERMISSIONS).forEach(page => {
    allPermissions.push(...page.permissions);
  });
  return allPermissions;
}

/**
 * Get permissions grouped by UI pages
 */
function getPermissionsByPages() {
  return UI_PAGES_PERMISSIONS;
}

/**
 * Get page info
 */
function getPageInfo(pageKey) {
  return UI_PAGES_PERMISSIONS[pageKey] || null;
}

module.exports = {
  UI_PAGES_PERMISSIONS,
  getAllPermissions,
  getPermissionsByPages,
  getPageInfo
};
