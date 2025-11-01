/**
 * MODERN PERMISSIONS CONFIGURATION
 *
 * Cấu trúc phân quyền theo trang và chức năng cụ thể
 *
 * Cấu trúc:
 * - page: Trang chính (ví dụ: Dashboard, Quản lý người dùng)
 *   - features: Các chức năng trong trang
 *     - actions: Các hành động cụ thể (View, Create, Update, Delete, Export...)
 *
 * Quy ước đặt tên permission code:
 * {module}.{page}.{feature}.{action}
 *
 * Ví dụ:
 * - user.management.list.view - Xem danh sách người dùng
 * - user.management.list.create - Tạo người dùng mới
 * - user.management.detail.edit - Chỉnh sửa thông tin người dùng
 */

const MODERN_PERMISSIONS = {
  // ========================================
  // MODULE: DASHBOARD
  // ========================================
  dashboard: {
    name: 'Dashboard',
    icon: 'FaHome',
    color: '#4F46E5',
    pages: {
      overview: {
        name: 'Tổng quan hệ thống',
        path: '/dashboard',
        icon: 'FaChartLine',
        features: {
          statistics: {
            name: 'Thống kê',
            permissions: [
              {
                code: 'dashboard.overview.statistics.view',
                name: 'Xem thống kê tổng quan',
                description: 'Hiển thị các card thống kê: Tổng người dùng, Tổng dự án, Tổng báo cáo',
                ui_element: 'Statistics Cards'
              },
              {
                code: 'dashboard.overview.statistics.export',
                name: 'Xuất báo cáo thống kê',
                description: 'Xuất dữ liệu thống kê ra Excel/PDF',
                ui_element: 'Export Button'
              }
            ]
          },
          charts: {
            name: 'Biểu đồ',
            permissions: [
              {
                code: 'dashboard.overview.charts.view',
                name: 'Xem biểu đồ',
                description: 'Hiển thị các biểu đồ phân tích dữ liệu',
                ui_element: 'Chart Components'
              }
            ]
          }
        }
      }
    }
  },

  // ========================================
  // MODULE: USER MANAGEMENT
  // ========================================
  user: {
    name: 'Quản lý người dùng',
    icon: 'FaUsers',
    color: '#10B981',
    pages: {
      management: {
        name: 'Danh sách người dùng',
        path: '/users',
        icon: 'FaUsersCog',
        features: {
          list: {
            name: 'Danh sách',
            permissions: [
              {
                code: 'user.management.list.view',
                name: 'Xem danh sách người dùng',
                description: 'Hiển thị bảng danh sách người dùng',
                ui_element: 'User Table'
              },
              {
                code: 'user.management.list.search',
                name: 'Tìm kiếm người dùng',
                description: 'Sử dụng ô tìm kiếm và bộ lọc',
                ui_element: 'Search Box, Filters'
              },
              {
                code: 'user.management.list.filter',
                name: 'Lọc người dùng',
                description: 'Lọc theo vai trò, trạng thái, đơn vị',
                ui_element: 'Filter Dropdown'
              }
            ]
          },
          actions: {
            name: 'Thao tác',
            permissions: [
              {
                code: 'user.management.actions.create',
                name: 'Thêm người dùng',
                description: 'Hiển thị nút "Thêm người dùng" và mở form tạo mới',
                ui_element: 'Add User Button, Create Modal'
              },
              {
                code: 'user.management.actions.edit',
                name: 'Sửa thông tin người dùng',
                description: 'Hiển thị nút "Sửa" và mở form chỉnh sửa',
                ui_element: 'Edit Button, Edit Modal'
              },
              {
                code: 'user.management.actions.delete',
                name: 'Xóa người dùng',
                description: 'Hiển thị nút "Xóa" và thực hiện xóa người dùng',
                ui_element: 'Delete Button'
              },
              {
                code: 'user.management.actions.activate',
                name: 'Kích hoạt/Vô hiệu hóa',
                description: 'Thay đổi trạng thái hoạt động của người dùng',
                ui_element: 'Activate/Deactivate Toggle'
              }
            ]
          },
          export: {
            name: 'Xuất dữ liệu',
            permissions: [
              {
                code: 'user.management.export.excel',
                name: 'Xuất Excel',
                description: 'Xuất danh sách người dùng ra file Excel',
                ui_element: 'Export Excel Button'
              },
              {
                code: 'user.management.export.pdf',
                name: 'Xuất PDF',
                description: 'Xuất danh sách người dùng ra file PDF',
                ui_element: 'Export PDF Button'
              }
            ]
          },
          detail: {
            name: 'Chi tiết',
            permissions: [
              {
                code: 'user.management.detail.view',
                name: 'Xem chi tiết người dùng',
                description: 'Xem thông tin chi tiết của người dùng',
                ui_element: 'View Details Button, Detail Page'
              },
              {
                code: 'user.management.detail.view_roles',
                name: 'Xem vai trò',
                description: 'Xem các vai trò được gán cho người dùng',
                ui_element: 'Roles Section'
              },
              {
                code: 'user.management.detail.assign_roles',
                name: 'Gán vai trò',
                description: 'Gán hoặc gỡ vai trò cho người dùng',
                ui_element: 'Assign Roles Button, Roles Modal'
              }
            ]
          }
        }
      },
      profile: {
        name: 'Hồ sơ cá nhân',
        path: '/profile',
        icon: 'FaUserCircle',
        features: {
          view: {
            name: 'Xem hồ sơ',
            permissions: [
              {
                code: 'user.profile.view.own',
                name: 'Xem hồ sơ của mình',
                description: 'Xem thông tin hồ sơ cá nhân',
                ui_element: 'Profile Page'
              }
            ]
          },
          edit: {
            name: 'Chỉnh sửa',
            permissions: [
              {
                code: 'user.profile.edit.own',
                name: 'Sửa hồ sơ của mình',
                description: 'Chỉnh sửa thông tin cá nhân (họ tên, email, số điện thoại)',
                ui_element: 'Edit Profile Form'
              },
              {
                code: 'user.profile.edit.password',
                name: 'Đổi mật khẩu',
                description: 'Thay đổi mật khẩu đăng nhập',
                ui_element: 'Change Password Button'
              },
              {
                code: 'user.profile.edit.avatar',
                name: 'Đổi ảnh đại diện',
                description: 'Upload ảnh đại diện mới',
                ui_element: 'Avatar Upload'
              }
            ]
          }
        }
      }
    }
  },

  // ========================================
  // MODULE: ROLE & PERMISSION MANAGEMENT
  // ========================================
  role: {
    name: 'Quản lý vai trò & phân quyền',
    icon: 'FaUserShield',
    color: '#F59E0B',
    pages: {
      management: {
        name: 'Danh sách vai trò',
        path: '/roles',
        icon: 'FaUserTag',
        features: {
          list: {
            name: 'Danh sách vai trò',
            permissions: [
              {
                code: 'role.management.list.view',
                name: 'Xem danh sách vai trò',
                description: 'Hiển thị bảng danh sách vai trò',
                ui_element: 'Role Table'
              },
              {
                code: 'role.management.list.search',
                name: 'Tìm kiếm vai trò',
                description: 'Tìm kiếm vai trò theo tên',
                ui_element: 'Search Box'
              }
            ]
          },
          actions: {
            name: 'Thao tác vai trò',
            permissions: [
              {
                code: 'role.management.actions.create',
                name: 'Tạo vai trò mới',
                description: 'Tạo vai trò mới với tên và mô tả',
                ui_element: 'Create Role Button, Create Modal'
              },
              {
                code: 'role.management.actions.edit',
                name: 'Sửa vai trò',
                description: 'Chỉnh sửa thông tin vai trò (tên, mô tả)',
                ui_element: 'Edit Role Button, Edit Modal'
              },
              {
                code: 'role.management.actions.delete',
                name: 'Xóa vai trò',
                description: 'Xóa vai trò (chỉ vai trò không phải hệ thống)',
                ui_element: 'Delete Role Button'
              }
            ]
          },
          permissions: {
            name: 'Quản lý quyền',
            permissions: [
              {
                code: 'role.management.permissions.view',
                name: 'Xem quyền của vai trò',
                description: 'Xem danh sách quyền được gán cho vai trò',
                ui_element: 'Permissions List'
              },
              {
                code: 'role.management.permissions.assign',
                name: 'Gán quyền cho vai trò',
                description: 'Chọn và gán các quyền cho vai trò theo cấu trúc trang/chức năng',
                ui_element: 'Assign Permissions Button, Permissions Tree'
              },
              {
                code: 'role.management.permissions.revoke',
                name: 'Gỡ quyền khỏi vai trò',
                description: 'Bỏ chọn và gỡ quyền khỏi vai trò',
                ui_element: 'Uncheck Permission Checkbox'
              }
            ]
          },
          datascope: {
            name: 'Phạm vi dữ liệu',
            permissions: [
              {
                code: 'role.management.datascope.view',
                name: 'Xem phạm vi dữ liệu',
                description: 'Xem phạm vi dữ liệu (tỉnh/huyện/xã) của vai trò',
                ui_element: 'Data Scope Section'
              },
              {
                code: 'role.management.datascope.assign',
                name: 'Gán phạm vi dữ liệu',
                description: 'Chọn cụ thể tỉnh/huyện/xã mà vai trò có quyền truy cập',
                ui_element: 'Assign Data Scope Button, Location Tree'
              },
              {
                code: 'role.management.datascope.revoke',
                name: 'Gỡ phạm vi dữ liệu',
                description: 'Bỏ phạm vi dữ liệu đã gán',
                ui_element: 'Remove Data Scope Button'
              }
            ]
          }
        }
      }
    }
  },

  // ========================================
  // MODULE: GIS (Bản đồ & Dữ liệu địa lý)
  // ========================================
  gis: {
    name: 'Hệ thống bản đồ GIS',
    icon: 'FaMap',
    color: '#3B82F6',
    pages: {
      layers: {
        name: 'Quản lý lớp bản đồ',
        path: '/gis/layers',
        icon: 'FaLayerGroup',
        features: {
          list: {
            name: 'Danh sách lớp',
            permissions: [
              {
                code: 'gis.layers.list.view',
                name: 'Xem danh sách lớp',
                description: 'Hiển thị danh sách các lớp bản đồ',
                ui_element: 'Layers Table'
              }
            ]
          },
          actions: {
            name: 'Thao tác lớp',
            permissions: [
              {
                code: 'gis.layers.actions.create',
                name: 'Tạo lớp mới',
                description: 'Tạo lớp bản đồ mới',
                ui_element: 'Create Layer Button'
              },
              {
                code: 'gis.layers.actions.edit',
                name: 'Sửa lớp',
                description: 'Chỉnh sửa thông tin lớp',
                ui_element: 'Edit Layer Button'
              },
              {
                code: 'gis.layers.actions.delete',
                name: 'Xóa lớp',
                description: 'Xóa lớp bản đồ',
                ui_element: 'Delete Layer Button'
              }
            ]
          },
          export: {
            name: 'Xuất dữ liệu',
            permissions: [
              {
                code: 'gis.layers.export.shapefile',
                name: 'Xuất Shapefile',
                description: 'Xuất lớp ra định dạng Shapefile',
                ui_element: 'Export Shapefile Button'
              },
              {
                code: 'gis.layers.export.geojson',
                name: 'Xuất GeoJSON',
                description: 'Xuất lớp ra định dạng GeoJSON',
                ui_element: 'Export GeoJSON Button'
              }
            ]
          }
        }
      },
      matrung: {
        name: 'Quản lý mất rừng',
        path: '/gis/matrung',
        icon: 'FaTree',
        features: {
          list: {
            name: 'Danh sách vùng mất rừng',
            permissions: [
              {
                code: 'gis.matrung.list.view',
                name: 'Xem danh sách mất rừng',
                description: 'Hiển thị danh sách các vùng mất rừng',
                ui_element: 'Forest Loss Table'
              }
            ]
          },
          actions: {
            name: 'Thao tác',
            permissions: [
              {
                code: 'gis.matrung.actions.create',
                name: 'Thêm vùng mất rừng',
                description: 'Thêm vùng mất rừng mới',
                ui_element: 'Add Forest Loss Button'
              },
              {
                code: 'gis.matrung.actions.edit',
                name: 'Sửa thông tin',
                description: 'Chỉnh sửa thông tin vùng mất rừng',
                ui_element: 'Edit Button'
              },
              {
                code: 'gis.matrung.actions.delete',
                name: 'Xóa vùng mất rừng',
                description: 'Xóa vùng mất rừng',
                ui_element: 'Delete Button'
              }
            ]
          },
          map: {
            name: 'Bản đồ',
            permissions: [
              {
                code: 'gis.matrung.map.view',
                name: 'Xem trên bản đồ',
                description: 'Hiển thị vùng mất rừng trên bản đồ',
                ui_element: 'Map View'
              },
              {
                code: 'gis.matrung.map.measure',
                name: 'Đo đạc diện tích',
                description: 'Sử dụng công cụ đo diện tích',
                ui_element: 'Measure Tool'
              }
            ]
          }
        }
      },
      verification: {
        name: 'Xác minh dữ liệu',
        path: '/gis/verification',
        icon: 'FaCheckCircle',
        features: {
          list: {
            name: 'Danh sách cần xác minh',
            permissions: [
              {
                code: 'gis.verification.list.view',
                name: 'Xem danh sách xác minh',
                description: 'Hiển thị danh sách dữ liệu cần xác minh',
                ui_element: 'Verification Queue Table'
              }
            ]
          },
          actions: {
            name: 'Thao tác xác minh',
            permissions: [
              {
                code: 'gis.verification.actions.approve',
                name: 'Phê duyệt',
                description: 'Phê duyệt dữ liệu',
                ui_element: 'Approve Button'
              },
              {
                code: 'gis.verification.actions.reject',
                name: 'Từ chối',
                description: 'Từ chối và yêu cầu chỉnh sửa',
                ui_element: 'Reject Button'
              },
              {
                code: 'gis.verification.actions.comment',
                name: 'Bình luận',
                description: 'Thêm ghi chú, nhận xét',
                ui_element: 'Comment Input'
              }
            ]
          }
        }
      },
      shapefile: {
        name: 'Upload Shapefile',
        path: '/gis/upload',
        icon: 'FaUpload',
        features: {
          upload: {
            name: 'Tải lên',
            permissions: [
              {
                code: 'gis.shapefile.upload.execute',
                name: 'Upload Shapefile',
                description: 'Tải lên file Shapefile (.shp, .shx, .dbf, .prj)',
                ui_element: 'Upload Form'
              },
              {
                code: 'gis.shapefile.upload.validate',
                name: 'Kiểm tra định dạng',
                description: 'Xác thực định dạng và cấu trúc file',
                ui_element: 'Validation Messages'
              }
            ]
          },
          process: {
            name: 'Xử lý',
            permissions: [
              {
                code: 'gis.shapefile.process.convert',
                name: 'Chuyển đổi',
                description: 'Chuyển đổi Shapefile sang định dạng khác',
                ui_element: 'Convert Button'
              },
              {
                code: 'gis.shapefile.process.import',
                name: 'Import vào hệ thống',
                description: 'Import dữ liệu vào cơ sở dữ liệu',
                ui_element: 'Import Button'
              }
            ]
          }
        }
      }
    }
  },

  // ========================================
  // MODULE: REPORT (Báo cáo)
  // ========================================
  report: {
    name: 'Hệ thống báo cáo',
    icon: 'FaFileAlt',
    color: '#8B5CF6',
    pages: {
      management: {
        name: 'Quản lý báo cáo',
        path: '/reports',
        icon: 'FaClipboardList',
        features: {
          list: {
            name: 'Danh sách báo cáo',
            permissions: [
              {
                code: 'report.management.list.view',
                name: 'Xem danh sách báo cáo',
                description: 'Hiển thị danh sách các báo cáo',
                ui_element: 'Reports Table'
              },
              {
                code: 'report.management.list.filter',
                name: 'Lọc báo cáo',
                description: 'Lọc theo loại, trạng thái, thời gian',
                ui_element: 'Filter Controls'
              }
            ]
          },
          actions: {
            name: 'Thao tác',
            permissions: [
              {
                code: 'report.management.actions.create',
                name: 'Tạo báo cáo',
                description: 'Tạo báo cáo mới',
                ui_element: 'Create Report Button'
              },
              {
                code: 'report.management.actions.edit',
                name: 'Sửa báo cáo',
                description: 'Chỉnh sửa nội dung báo cáo',
                ui_element: 'Edit Report Button'
              },
              {
                code: 'report.management.actions.delete',
                name: 'Xóa báo cáo',
                description: 'Xóa báo cáo',
                ui_element: 'Delete Report Button'
              },
              {
                code: 'report.management.actions.publish',
                name: 'Xuất bản báo cáo',
                description: 'Xuất bản báo cáo để người khác xem',
                ui_element: 'Publish Button'
              },
              {
                code: 'report.management.actions.archive',
                name: 'Lưu trữ báo cáo',
                description: 'Chuyển báo cáo vào kho lưu trữ',
                ui_element: 'Archive Button'
              }
            ]
          },
          export: {
            name: 'Xuất báo cáo',
            permissions: [
              {
                code: 'report.management.export.pdf',
                name: 'Xuất PDF',
                description: 'Xuất báo cáo ra file PDF',
                ui_element: 'Export PDF Button'
              },
              {
                code: 'report.management.export.excel',
                name: 'Xuất Excel',
                description: 'Xuất báo cáo ra file Excel',
                ui_element: 'Export Excel Button'
              },
              {
                code: 'report.management.export.word',
                name: 'Xuất Word',
                description: 'Xuất báo cáo ra file Word',
                ui_element: 'Export Word Button'
              }
            ]
          },
          detail: {
            name: 'Chi tiết',
            permissions: [
              {
                code: 'report.management.detail.view',
                name: 'Xem chi tiết báo cáo',
                description: 'Xem nội dung đầy đủ của báo cáo',
                ui_element: 'Report Detail Page'
              },
              {
                code: 'report.management.detail.print',
                name: 'In báo cáo',
                description: 'In báo cáo',
                ui_element: 'Print Button'
              }
            ]
          }
        }
      },
      statistics: {
        name: 'Thống kê báo cáo',
        path: '/reports/statistics',
        icon: 'FaChartBar',
        features: {
          view: {
            name: 'Xem thống kê',
            permissions: [
              {
                code: 'report.statistics.view.charts',
                name: 'Xem biểu đồ thống kê',
                description: 'Hiển thị biểu đồ phân tích báo cáo',
                ui_element: 'Statistics Charts'
              },
              {
                code: 'report.statistics.view.trends',
                name: 'Xem xu hướng',
                description: 'Xem xu hướng báo cáo theo thời gian',
                ui_element: 'Trend Analysis'
              }
            ]
          },
          export: {
            name: 'Xuất thống kê',
            permissions: [
              {
                code: 'report.statistics.export.data',
                name: 'Xuất dữ liệu thống kê',
                description: 'Xuất dữ liệu thống kê ra file',
                ui_element: 'Export Statistics Button'
              }
            ]
          }
        }
      }
    }
  },

  // ========================================
  // MODULE: SEARCH (Tìm kiếm)
  // ========================================
  search: {
    name: 'Hệ thống tìm kiếm',
    icon: 'FaSearch',
    color: '#EC4899',
    pages: {
      main: {
        name: 'Tìm kiếm',
        path: '/search',
        icon: 'FaSearchLocation',
        features: {
          basic: {
            name: 'Tìm kiếm cơ bản',
            permissions: [
              {
                code: 'search.main.basic.execute',
                name: 'Tìm kiếm cơ bản',
                description: 'Tìm kiếm đơn giản theo từ khóa',
                ui_element: 'Search Input'
              }
            ]
          },
          advanced: {
            name: 'Tìm kiếm nâng cao',
            permissions: [
              {
                code: 'search.main.advanced.execute',
                name: 'Tìm kiếm nâng cao',
                description: 'Tìm kiếm với nhiều tiêu chí phức tạp',
                ui_element: 'Advanced Search Form'
              },
              {
                code: 'search.main.advanced.filter',
                name: 'Lọc kết quả',
                description: 'Áp dụng bộ lọc cho kết quả tìm kiếm',
                ui_element: 'Filter Panel'
              }
            ]
          },
          export: {
            name: 'Xuất kết quả',
            permissions: [
              {
                code: 'search.main.export.results',
                name: 'Xuất kết quả tìm kiếm',
                description: 'Xuất kết quả tìm kiếm ra file',
                ui_element: 'Export Results Button'
              }
            ]
          }
        }
      }
    }
  },

  // ========================================
  // MODULE: ADMIN (Quản trị hệ thống)
  // ========================================
  admin: {
    name: 'Quản trị hệ thống',
    icon: 'FaCog',
    color: '#EF4444',
    pages: {
      system: {
        name: 'Cấu hình hệ thống',
        path: '/admin/system',
        icon: 'FaServer',
        features: {
          view: {
            name: 'Xem cấu hình',
            permissions: [
              {
                code: 'admin.system.view.config',
                name: 'Xem cấu hình hệ thống',
                description: 'Xem các thiết lập hệ thống',
                ui_element: 'System Config Page'
              }
            ]
          },
          edit: {
            name: 'Chỉnh sửa cấu hình',
            permissions: [
              {
                code: 'admin.system.edit.config',
                name: 'Sửa cấu hình',
                description: 'Chỉnh sửa thiết lập hệ thống',
                ui_element: 'Edit Config Button'
              },
              {
                code: 'admin.system.edit.maintenance',
                name: 'Bật/tắt chế độ bảo trì',
                description: 'Chuyển hệ thống sang chế độ bảo trì',
                ui_element: 'Maintenance Mode Toggle'
              }
            ]
          }
        }
      },
      logs: {
        name: 'Nhật ký hệ thống',
        path: '/admin/logs',
        icon: 'FaClipboard',
        features: {
          view: {
            name: 'Xem logs',
            permissions: [
              {
                code: 'admin.logs.view.system',
                name: 'Xem log hệ thống',
                description: 'Xem nhật ký hoạt động hệ thống',
                ui_element: 'System Logs Table'
              },
              {
                code: 'admin.logs.view.access',
                name: 'Xem log truy cập',
                description: 'Xem nhật ký truy cập của người dùng',
                ui_element: 'Access Logs Table'
              },
              {
                code: 'admin.logs.view.error',
                name: 'Xem log lỗi',
                description: 'Xem nhật ký lỗi hệ thống',
                ui_element: 'Error Logs Table'
              }
            ]
          },
          actions: {
            name: 'Thao tác logs',
            permissions: [
              {
                code: 'admin.logs.actions.export',
                name: 'Xuất logs',
                description: 'Xuất nhật ký ra file',
                ui_element: 'Export Logs Button'
              },
              {
                code: 'admin.logs.actions.delete',
                name: 'Xóa logs',
                description: 'Xóa logs cũ (cần thận trọng)',
                ui_element: 'Delete Logs Button'
              },
              {
                code: 'admin.logs.actions.clear',
                name: 'Xóa toàn bộ logs',
                description: 'Xóa tất cả logs (nguy hiểm)',
                ui_element: 'Clear All Logs Button'
              }
            ]
          }
        }
      },
      backup: {
        name: 'Sao lưu & Khôi phục',
        path: '/admin/backup',
        icon: 'FaDatabase',
        features: {
          backup: {
            name: 'Sao lưu',
            permissions: [
              {
                code: 'admin.backup.actions.create',
                name: 'Tạo bản sao lưu',
                description: 'Tạo bản sao lưu cơ sở dữ liệu',
                ui_element: 'Create Backup Button'
              },
              {
                code: 'admin.backup.actions.schedule',
                name: 'Lên lịch sao lưu tự động',
                description: 'Cấu hình sao lưu tự động định kỳ',
                ui_element: 'Schedule Backup Form'
              }
            ]
          },
          restore: {
            name: 'Khôi phục',
            permissions: [
              {
                code: 'admin.backup.actions.restore',
                name: 'Khôi phục dữ liệu',
                description: 'Khôi phục từ bản sao lưu (nguy hiểm)',
                ui_element: 'Restore Button'
              }
            ]
          },
          manage: {
            name: 'Quản lý backup',
            permissions: [
              {
                code: 'admin.backup.actions.download',
                name: 'Tải xuống backup',
                description: 'Tải file backup về máy',
                ui_element: 'Download Backup Button'
              },
              {
                code: 'admin.backup.actions.delete',
                name: 'Xóa backup',
                description: 'Xóa file backup cũ',
                ui_element: 'Delete Backup Button'
              }
            ]
          }
        }
      },
      audit: {
        name: 'Kiểm toán hệ thống',
        path: '/admin/audit',
        icon: 'FaHistory',
        features: {
          view: {
            name: 'Xem audit log',
            permissions: [
              {
                code: 'admin.audit.view.all',
                name: 'Xem tất cả hoạt động',
                description: 'Xem lịch sử hoạt động của tất cả người dùng',
                ui_element: 'Audit Trail Table'
              },
              {
                code: 'admin.audit.view.sensitive',
                name: 'Xem hoạt động nhạy cảm',
                description: 'Xem các hoạt động quan trọng (đăng nhập, thay đổi quyền, xóa dữ liệu)',
                ui_element: 'Sensitive Actions Filter'
              }
            ]
          },
          export: {
            name: 'Xuất audit',
            permissions: [
              {
                code: 'admin.audit.export.report',
                name: 'Xuất báo cáo kiểm toán',
                description: 'Xuất báo cáo kiểm toán ra file',
                ui_element: 'Export Audit Report Button'
              }
            ]
          }
        }
      }
    }
  },

  // ========================================
  // MODULE: AUTH (Xác thực - Permissions tự động)
  // ========================================
  auth: {
    name: 'Xác thực',
    icon: 'FaKey',
    color: '#6B7280',
    pages: {
      login: {
        name: 'Đăng nhập',
        path: '/login',
        icon: 'FaSignInAlt',
        features: {
          execute: {
            name: 'Thực hiện đăng nhập',
            permissions: [
              {
                code: 'auth.login.execute',
                name: 'Đăng nhập hệ thống',
                description: 'Cho phép người dùng đăng nhập (mặc định tất cả)',
                ui_element: 'Login Form'
              }
            ]
          }
        }
      },
      logout: {
        name: 'Đăng xuất',
        path: '/logout',
        icon: 'FaSignOutAlt',
        features: {
          execute: {
            name: 'Thực hiện đăng xuất',
            permissions: [
              {
                code: 'auth.logout.execute',
                name: 'Đăng xuất hệ thống',
                description: 'Cho phép người dùng đăng xuất',
                ui_element: 'Logout Button'
              }
            ]
          }
        }
      },
      password: {
        name: 'Quản lý mật khẩu',
        path: '/password',
        icon: 'FaLock',
        features: {
          change: {
            name: 'Đổi mật khẩu',
            permissions: [
              {
                code: 'auth.password.change',
                name: 'Đổi mật khẩu của mình',
                description: 'Người dùng đổi mật khẩu đăng nhập',
                ui_element: 'Change Password Form'
              }
            ]
          },
          reset: {
            name: 'Reset mật khẩu',
            permissions: [
              {
                code: 'auth.password.reset',
                name: 'Reset mật khẩu người dùng',
                description: 'Admin reset mật khẩu cho người dùng khác',
                ui_element: 'Reset Password Button'
              }
            ]
          }
        }
      },
      token: {
        name: 'Quản lý token',
        path: '/token',
        icon: 'FaTicketAlt',
        features: {
          refresh: {
            name: 'Làm mới token',
            permissions: [
              {
                code: 'auth.token.refresh',
                name: 'Làm mới JWT token',
                description: 'Tự động làm mới token (mặc định)',
                ui_element: 'Auto Token Refresh'
              }
            ]
          },
          verify: {
            name: 'Xác thực token',
            permissions: [
              {
                code: 'auth.token.verify',
                name: 'Xác thực token',
                description: 'Kiểm tra tính hợp lệ của token',
                ui_element: 'Token Verification'
              }
            ]
          }
        }
      }
    }
  },
  data_management: {
    name: 'Quản lý dữ liệu',
    icon: 'FaDatabase',
    color: '#A855F7',
    pages: {
      forecast: {
        name: 'Dữ liệu dự báo mất rừng',
        path: '/data/forecast',
        icon: 'FaChartArea',
        features: {
          search: {
            name: 'Tra cứu',
            permissions: [
              {
                code: 'data_management.forecast.search',
                name: 'Tra cứu dữ liệu dự báo mất rừng',
                description: 'Tra cứu và xem dữ liệu dự báo mất rừng',
                ui_element: 'Search Button',
                action: 'search'
              }
            ]
          }
        }
      },
      satellite: {
        name: 'Dữ liệu ảnh vệ tinh',
        path: '/data/satellite',
        icon: 'FaSatellite',
        features: {
          search: {
            name: 'Tra cứu',
            permissions: [
              {
                code: 'data_management.satellite.search',
                name: 'Tra cứu dữ liệu ảnh vệ tinh',
                description: 'Tra cứu và xem dữ liệu ảnh vệ tinh',
                ui_element: 'Search Button',
                action: 'search'
              }
            ]
          }
        }
      },
      verification: {
        name: 'Xác minh dự báo mất rừng',
        path: '/data/verification',
        icon: 'FaCheckDouble',
        features: {
          search: {
            name: 'Tìm kiếm',
            permissions: [
              {
                code: 'data_management.verification.search',
                name: 'Tìm kiếm dự báo cần xác minh',
                description: 'Tìm kiếm các dự báo mất rừng cần được xác minh',
                ui_element: 'Search Input',
                action: 'search'
              }
            ]
          },
          verify: {
            name: 'Xác minh',
            permissions: [
              {
                code: 'data_management.verification.verify',
                name: 'Xác minh dự báo',
                description: 'Thực hiện xác minh, đánh giá độ chính xác của dự báo',
                ui_element: 'Verify Button',
                action: 'verify'
              }
            ]
          }
        }
      },
      update: {
        name: 'Cập nhật dữ liệu',
        path: '/data/update',
        icon: 'FaSync',
        features: {
          update: {
            name: 'Cập nhật',
            permissions: [
              {
                code: 'data_management.update.execute',
                name: 'Cập nhật dữ liệu',
                description: 'Cập nhật dữ liệu mới nhất cho hệ thống',
                ui_element: 'Update Button',
                action: 'execute'
              }
            ]
          }
        }
      }
    }
  }
};

/**
 * Flatten permissions from nested structure
 *
 * Chuyển đổi cấu trúc lồng nhau thành mảng phẳng để dễ dàng seed vào database
 */
function flattenPermissions() {
  const result = [];

  Object.entries(MODERN_PERMISSIONS).forEach(([moduleKey, moduleData]) => {
    Object.entries(moduleData.pages).forEach(([pageKey, pageData]) => {
      Object.entries(pageData.features).forEach(([featureKey, featureData]) => {
        featureData.permissions.forEach((perm) => {
          const [module, page, feature, action] = perm.code.split('.');

          result.push({
            code: perm.code,
            name: perm.name,
            description: perm.description,
            module: module,
            resource: `${page}.${feature}`,
            action: perm.action, // Use the action from the perm object
            ui_path: pageData.path,
            ui_category: moduleData.name,
            ui_element: perm.ui_element,
            icon: pageData.icon || moduleData.icon,
            order: result.length + 1
          });
        });
      });
    });
  });

  return result;
}

/**
 * Get permissions grouped by page structure for UI display
 *
 * Trả về cấu trúc phân cấp để hiển thị trong UI (tree view)
 */
function getPermissionsTree() {
  return MODERN_PERMISSIONS;
}

/**
 * Get permissions for a specific module
 */
function getModulePermissions(moduleKey) {
  return MODERN_PERMISSIONS[moduleKey] || null;
}

/**
 * Search permissions by keyword
 */
function searchPermissions(keyword) {
  const results = [];
  const lowerKeyword = keyword.toLowerCase();

  Object.entries(MODERN_PERMISSIONS).forEach(([moduleKey, moduleData]) => {
    Object.entries(moduleData.pages).forEach(([pageKey, pageData]) => {
      Object.entries(pageData.features).forEach(([featureKey, featureData]) => {
        featureData.permissions.forEach((perm) => {
          if (
            perm.code.toLowerCase().includes(lowerKeyword) ||
            perm.name.toLowerCase().includes(lowerKeyword) ||
            perm.description.toLowerCase().includes(lowerKeyword)
          ) {
            results.push({
              ...perm,
              module: moduleData.name,
              page: pageData.name,
              feature: featureData.name
            });
          }
        });
      });
    });
  });

  return results;
}

module.exports = {
  MODERN_PERMISSIONS,
  flattenPermissions,
  getPermissionsTree,
  getModulePermissions,
  searchPermissions
};
