// Page-Based Permissions Configuration
// Định nghĩa permissions theo từng trang và chức năng cụ thể trên web

const PAGE_PERMISSIONS = {
  // ==================== TRANG DASHBOARD ====================
  dashboard: {
    page: {
      path: '/dashboard',
      name: 'Trang chủ Dashboard',
      icon: 'FaHome',
      description: 'Trang tổng quan hệ thống'
    },
    sections: {
      overview_stats: {
        name: 'Thống kê tổng quan',
        features: {
          view_user_stats: {
            name: 'Xem thống kê người dùng',
            permission: 'dashboard.overview.user_stats.view',
            ui_element: 'Card thống kê người dùng'
          },
          view_gis_stats: {
            name: 'Xem thống kê GIS',
            permission: 'dashboard.overview.gis_stats.view',
            ui_element: 'Card thống kê bản đồ'
          },
          view_report_stats: {
            name: 'Xem thống kê báo cáo',
            permission: 'dashboard.overview.report_stats.view',
            ui_element: 'Card thống kê báo cáo'
          }
        }
      },
      quick_actions: {
        name: 'Hành động nhanh',
        features: {
          create_report: {
            name: 'Nút tạo báo cáo nhanh',
            permission: 'dashboard.quick_action.create_report',
            ui_element: 'Button "Tạo báo cáo"'
          },
          upload_shapefile: {
            name: 'Nút upload shapefile nhanh',
            permission: 'dashboard.quick_action.upload_shapefile',
            ui_element: 'Button "Upload shapefile"'
          }
        }
      }
    }
  },

  // ==================== QUẢN LÝ NGƯỜI DÙNG ====================
  user_management: {
    page: {
      path: '/admin/users',
      name: 'Quản lý người dùng',
      icon: 'FaUsers',
      description: 'Quản lý tài khoản người dùng hệ thống'
    },
    sections: {
      user_list: {
        name: 'Danh sách người dùng',
        features: {
          view_table: {
            name: 'Xem bảng danh sách',
            permission: 'user.list.table.view',
            ui_element: 'Table danh sách người dùng'
          },
          search_user: {
            name: 'Tìm kiếm người dùng',
            permission: 'user.list.search',
            ui_element: 'Input tìm kiếm'
          },
          filter_user: {
            name: 'Lọc người dùng',
            permission: 'user.list.filter',
            ui_element: 'Dropdown filter (role, status, ...)'
          },
          export_excel: {
            name: 'Xuất Excel',
            permission: 'user.list.export',
            ui_element: 'Button "Xuất Excel"'
          },
          add_user_button: {
            name: 'Nút thêm người dùng',
            permission: 'user.list.button.add',
            ui_element: 'Button "Thêm người dùng"'
          }
        }
      },
      user_detail: {
        name: 'Chi tiết người dùng',
        features: {
          view_profile: {
            name: 'Xem thông tin cá nhân',
            permission: 'user.detail.profile.view',
            ui_element: 'Tab "Thông tin cá nhân"'
          },
          edit_button: {
            name: 'Nút chỉnh sửa',
            permission: 'user.detail.button.edit',
            ui_element: 'Button "Chỉnh sửa"'
          },
          delete_button: {
            name: 'Nút xóa người dùng',
            permission: 'user.detail.button.delete',
            ui_element: 'Button "Xóa"'
          },
          activate_button: {
            name: 'Nút kích hoạt/vô hiệu hóa',
            permission: 'user.detail.button.toggle_active',
            ui_element: 'Switch/Button "Kích hoạt"'
          },
          assign_role: {
            name: 'Gán vai trò',
            permission: 'user.detail.role.assign',
            ui_element: 'Dropdown/Modal gán role'
          },
          change_password: {
            name: 'Đổi mật khẩu',
            permission: 'user.detail.password.change',
            ui_element: 'Button "Đổi mật khẩu"'
          }
        }
      }
    }
  },

  // ==================== QUẢN LÝ VAI TRÒ ====================
  role_management: {
    page: {
      path: '/admin/roles',
      name: 'Quản lý vai trò',
      icon: 'FaUserShield',
      description: 'Quản lý roles và permissions'
    },
    sections: {
      role_list: {
        name: 'Danh sách vai trò',
        features: {
          view_cards: {
            name: 'Xem cards vai trò',
            permission: 'role.list.cards.view',
            ui_element: 'Grid cards vai trò'
          },
          add_role_button: {
            name: 'Nút thêm vai trò',
            permission: 'role.list.button.add',
            ui_element: 'Button "Thêm Role"'
          }
        }
      },
      role_detail: {
        name: 'Chi tiết vai trò',
        features: {
          edit_button: {
            name: 'Nút chỉnh sửa role',
            permission: 'role.detail.button.edit',
            ui_element: 'Button "Chỉnh sửa"'
          },
          delete_button: {
            name: 'Nút xóa role',
            permission: 'role.detail.button.delete',
            ui_element: 'Button "Xóa"'
          },
          manage_permissions_button: {
            name: 'Nút quản lý quyền hạn',
            permission: 'role.detail.button.manage_permissions',
            ui_element: 'Button "Quyền hạn"'
          },
          permission_tree: {
            name: 'Cây phân quyền',
            permission: 'role.detail.permission_tree.view',
            ui_element: 'Modal tree permissions'
          },
          assign_permission: {
            name: 'Gán quyền cho role',
            permission: 'role.detail.permission.assign',
            ui_element: 'Checkboxes trong permission tree'
          }
        }
      }
    }
  },

  // ==================== BẢN ĐỒ GIS ====================
  gis_map: {
    page: {
      path: '/map',
      name: 'Bản đồ GIS',
      icon: 'FaMap',
      description: 'Xem và quản lý bản đồ'
    },
    sections: {
      map_viewer: {
        name: 'Hiển thị bản đồ',
        features: {
          view_map: {
            name: 'Xem bản đồ',
            permission: 'gis.map.viewer.view',
            ui_element: 'Map container'
          },
          zoom_control: {
            name: 'Điều khiển zoom',
            permission: 'gis.map.viewer.zoom',
            ui_element: 'Zoom buttons'
          },
          layer_toggle: {
            name: 'Bật/tắt layer',
            permission: 'gis.map.layer.toggle',
            ui_element: 'Layer control panel'
          }
        }
      },
      layer_management: {
        name: 'Quản lý lớp bản đồ',
        features: {
          add_layer_button: {
            name: 'Nút thêm layer',
            permission: 'gis.layer.button.add',
            ui_element: 'Button "Thêm layer"'
          },
          edit_layer_button: {
            name: 'Nút chỉnh sửa layer',
            permission: 'gis.layer.button.edit',
            ui_element: 'Button "Chỉnh sửa layer"'
          },
          delete_layer_button: {
            name: 'Nút xóa layer',
            permission: 'gis.layer.button.delete',
            ui_element: 'Button "Xóa layer"'
          },
          export_layer: {
            name: 'Xuất layer',
            permission: 'gis.layer.export',
            ui_element: 'Button "Xuất layer"'
          }
        }
      },
      shapefile_tools: {
        name: 'Công cụ Shapefile',
        features: {
          upload_button: {
            name: 'Nút upload shapefile',
            permission: 'gis.shapefile.button.upload',
            ui_element: 'Button "Upload Shapefile"'
          },
          process_shapefile: {
            name: 'Xử lý shapefile',
            permission: 'gis.shapefile.process',
            ui_element: 'Modal xử lý shapefile'
          }
        }
      },
      matrung_features: {
        name: 'Quản lý mất rừng',
        features: {
          view_matrung: {
            name: 'Xem dữ liệu mất rừng',
            permission: 'gis.matrung.view',
            ui_element: 'Layer mất rừng trên map'
          },
          create_matrung: {
            name: 'Tạo sự kiện mất rừng',
            permission: 'gis.matrung.button.create',
            ui_element: 'Button "Thêm sự kiện mất rừng"'
          },
          edit_matrung: {
            name: 'Chỉnh sửa mất rừng',
            permission: 'gis.matrung.button.edit',
            ui_element: 'Button "Sửa"'
          },
          delete_matrung: {
            name: 'Xóa mất rừng',
            permission: 'gis.matrung.button.delete',
            ui_element: 'Button "Xóa"'
          }
        }
      },
      verification: {
        name: 'Xác minh dữ liệu',
        features: {
          view_verification_list: {
            name: 'Xem danh sách xác minh',
            permission: 'gis.verification.list.view',
            ui_element: 'Panel danh sách xác minh'
          },
          approve_button: {
            name: 'Nút phê duyệt',
            permission: 'gis.verification.button.approve',
            ui_element: 'Button "Phê duyệt"'
          },
          reject_button: {
            name: 'Nút từ chối',
            permission: 'gis.verification.button.reject',
            ui_element: 'Button "Từ chối"'
          }
        }
      }
    }
  },

  // ==================== BÁO CÁO ====================
  report_management: {
    page: {
      path: '/reports',
      name: 'Quản lý báo cáo',
      icon: 'FaFileAlt',
      description: 'Quản lý các báo cáo'
    },
    sections: {
      report_list: {
        name: 'Danh sách báo cáo',
        features: {
          view_table: {
            name: 'Xem bảng báo cáo',
            permission: 'report.list.table.view',
            ui_element: 'Table danh sách báo cáo'
          },
          search_report: {
            name: 'Tìm kiếm báo cáo',
            permission: 'report.list.search',
            ui_element: 'Input tìm kiếm'
          },
          filter_report: {
            name: 'Lọc báo cáo',
            permission: 'report.list.filter',
            ui_element: 'Dropdown filter (type, status, date)'
          },
          create_button: {
            name: 'Nút tạo báo cáo',
            permission: 'report.list.button.create',
            ui_element: 'Button "Tạo báo cáo"'
          }
        }
      },
      report_detail: {
        name: 'Chi tiết báo cáo',
        features: {
          view_detail: {
            name: 'Xem chi tiết',
            permission: 'report.detail.view',
            ui_element: 'Modal/Page chi tiết báo cáo'
          },
          edit_button: {
            name: 'Nút chỉnh sửa',
            permission: 'report.detail.button.edit',
            ui_element: 'Button "Chỉnh sửa"'
          },
          delete_button: {
            name: 'Nút xóa',
            permission: 'report.detail.button.delete',
            ui_element: 'Button "Xóa"'
          },
          export_button: {
            name: 'Nút xuất báo cáo',
            permission: 'report.detail.button.export',
            ui_element: 'Button "Xuất PDF/Excel"'
          },
          publish_button: {
            name: 'Nút xuất bản',
            permission: 'report.detail.button.publish',
            ui_element: 'Button "Xuất bản"'
          },
          archive_button: {
            name: 'Nút lưu trữ',
            permission: 'report.detail.button.archive',
            ui_element: 'Button "Lưu trữ"'
          }
        }
      }
    }
  },

  // ==================== THỐNG KÊ ====================
  statistics: {
    page: {
      path: '/statistics',
      name: 'Thống kê',
      icon: 'FaChartBar',
      description: 'Xem thống kê và biểu đồ'
    },
    sections: {
      charts: {
        name: 'Biểu đồ thống kê',
        features: {
          view_matrung_chart: {
            name: 'Xem biểu đồ mất rừng',
            permission: 'statistics.chart.matrung.view',
            ui_element: 'Chart mất rừng theo thời gian'
          },
          view_report_chart: {
            name: 'Xem biểu đồ báo cáo',
            permission: 'statistics.chart.report.view',
            ui_element: 'Chart báo cáo theo loại'
          },
          export_chart: {
            name: 'Xuất biểu đồ',
            permission: 'statistics.chart.export',
            ui_element: 'Button "Xuất biểu đồ"'
          }
        }
      },
      data_export: {
        name: 'Xuất dữ liệu',
        features: {
          export_excel: {
            name: 'Xuất Excel',
            permission: 'statistics.data.export_excel',
            ui_element: 'Button "Xuất Excel"'
          },
          export_pdf: {
            name: 'Xuất PDF',
            permission: 'statistics.data.export_pdf',
            ui_element: 'Button "Xuất PDF"'
          }
        }
      }
    }
  },

  // ==================== TÌM KIẾM ====================
  search: {
    page: {
      path: '/search',
      name: 'Tìm kiếm',
      icon: 'FaSearch',
      description: 'Tìm kiếm nâng cao'
    },
    sections: {
      search_bar: {
        name: 'Thanh tìm kiếm',
        features: {
          basic_search: {
            name: 'Tìm kiếm cơ bản',
            permission: 'search.basic.execute',
            ui_element: 'Input tìm kiếm'
          },
          advanced_search: {
            name: 'Tìm kiếm nâng cao',
            permission: 'search.advanced.execute',
            ui_element: 'Form tìm kiếm nâng cao'
          },
          export_result: {
            name: 'Xuất kết quả',
            permission: 'search.result.export',
            ui_element: 'Button "Xuất kết quả"'
          }
        }
      }
    }
  },

  // ==================== QUẢN TRỊ HỆ THỐNG ====================
  system_admin: {
    page: {
      path: '/admin/system',
      name: 'Quản trị hệ thống',
      icon: 'FaCog',
      description: 'Cấu hình và quản trị hệ thống'
    },
    sections: {
      system_config: {
        name: 'Cấu hình hệ thống',
        features: {
          view_config: {
            name: 'Xem cấu hình',
            permission: 'admin.system.config.view',
            ui_element: 'Form cấu hình'
          },
          edit_config: {
            name: 'Chỉnh sửa cấu hình',
            permission: 'admin.system.config.edit',
            ui_element: 'Button "Lưu cấu hình"'
          }
        }
      },
      logs: {
        name: 'Quản lý log',
        features: {
          view_logs: {
            name: 'Xem log hệ thống',
            permission: 'admin.log.view',
            ui_element: 'Table logs'
          },
          export_logs: {
            name: 'Xuất log',
            permission: 'admin.log.export',
            ui_element: 'Button "Xuất log"'
          },
          delete_logs: {
            name: 'Xóa log',
            permission: 'admin.log.delete',
            ui_element: 'Button "Xóa log"'
          }
        }
      },
      backup: {
        name: 'Sao lưu & Phục hồi',
        features: {
          create_backup: {
            name: 'Tạo backup',
            permission: 'admin.backup.create',
            ui_element: 'Button "Tạo backup"'
          },
          restore_backup: {
            name: 'Phục hồi backup',
            permission: 'admin.backup.restore',
            ui_element: 'Button "Phục hồi"'
          },
          download_backup: {
            name: 'Download backup',
            permission: 'admin.backup.download',
            ui_element: 'Button "Download"'
          }
        }
      },
      audit: {
        name: 'Audit Trail',
        features: {
          view_audit: {
            name: 'Xem audit log',
            permission: 'admin.audit.view',
            ui_element: 'Table audit trail'
          },
          export_audit: {
            name: 'Xuất audit log',
            permission: 'admin.audit.export',
            ui_element: 'Button "Xuất audit"'
          }
        }
      }
    }
  }
};

// Helper function: Convert page config to flat permission list
function generateFlatPermissions() {
  const permissions = [];

  Object.entries(PAGE_PERMISSIONS).forEach(([pageKey, pageConfig]) => {
    const { page, sections } = pageConfig;

    Object.entries(sections).forEach(([sectionKey, section]) => {
      Object.entries(section.features).forEach(([featureKey, feature]) => {
        permissions.push({
          code: feature.permission,
          name: feature.name,
          description: `${page.name} - ${section.name} - ${feature.ui_element}`,
          ui_path: page.path,
          ui_element: feature.ui_element,
          ui_category: `${page.name} > ${section.name}`,
          icon: page.icon,
          page_key: pageKey,
          section_key: sectionKey,
          feature_key: featureKey
        });
      });
    });
  });

  return permissions;
}

// Export
module.exports = {
  PAGE_PERMISSIONS,
  generateFlatPermissions
};
