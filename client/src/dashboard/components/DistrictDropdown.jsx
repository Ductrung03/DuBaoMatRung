import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Select from "./Select";
import axios from "axios";
import config from "../../config";

/**
 * Component hiển thị dropdown chọn huyện, tự động giới hạn theo phân quyền người dùng
 * Xử lý đặc biệt với định dạng TCVN3 (như "B¶o Yªn") và Unicode (như "Bảo Yên")
 * 
 * @param {Object} props - Props của component
 * @param {string} props.value - Giá trị đã chọn (TCVN3)
 * @param {Function} props.onChange - Hàm xử lý khi thay đổi giá trị
 * @param {boolean} props.onFocus - Trạng thái focus
 * @param {boolean} props.onBlur - Trạng thái blur
 * @param {string} props.name - Tên của input
 * @param {boolean} props.isLoading - Trạng thái đang tải
 * @param {string} props.className - Class CSS bổ sung
 * @param {boolean} props.forceEnable - Cho phép chọn huyện ngay cả khi bị giới hạn (dùng trong màn hình admin)
 * @returns {JSX.Element} Dropdown chọn huyện
 */
const DistrictDropdown = ({ 
  value, 
  onChange, 
  onFocus, 
  onBlur, 
  name = "district_id", 
  isLoading = false,
  className = "",
  forceEnable = false
}) => {
  const [districts, setDistricts] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setDropdownLoading(true);
        const res = await axios.get(`${config.API_URL}/api/dropdown/huyen`);
        let data = res.data;
        
        // Log dữ liệu gốc để debug
      
        
        // Lưu tất cả các huyện
        setDistricts(data);
        
        // Nếu không phải admin và có district_id, lọc danh sách
        if (!isAdmin() && user?.district_id) {
          // Lọc chính xác dựa trên giá trị TCVN3
          // Không cần chuyển đổi vì cả hai đều là TCVN3
          const filtered = data.filter(district => {
            const exactMatch = district.value === user.district_id;
            console.log(`Comparing: "${district.value}" with "${user.district_id}", match: ${exactMatch}`);
            return exactMatch;
          });
          
       
          
          // Lưu danh sách đã lọc
          setFilteredOptions(filtered);
          
          // Tự động chọn huyện của người dùng nếu chưa có giá trị được chọn
          if (filtered.length === 1 && !value) {
            console.log("Auto-selecting district:", filtered[0].value);
            if (onChange) onChange({ target: { name, value: filtered[0].value } });
          }
        } else {
          // Nếu là admin hoặc không có district_id, hiển thị tất cả
          setFilteredOptions(data);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách huyện:", error);
      } finally {
        setDropdownLoading(false);
      }
    };
    
    fetchDistricts();
  }, [user, isAdmin, onChange, name, value]);

  // Xử lý khi dropdown focus/blur
  const handleDropdownToggle = (isOpen) => {
    setIsDropdownOpen(isOpen);
    if (isOpen && onFocus) onFocus();
    if (!isOpen && onBlur) onBlur();
  };

  // Xác định xem dropdown có bị disable hay không
  const isDisabled = isLoading || dropdownLoading || (!isAdmin() && user?.district_id && !forceEnable);
  
  // Xác định background color dựa trên trạng thái disabled
  const bgColorClass = isDisabled ? "bg-gray-100" : "bg-white";

  return (
    <div className="relative w-full">
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={isDisabled}
        className={`w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none ${bgColorClass} focus:outline-none focus:ring-2 focus:ring-green-400 ${className}`}
        onFocus={() => handleDropdownToggle(true)}
        onBlur={() => handleDropdownToggle(false)}
      >
        <option value="">Chọn huyện</option>
        {/* Hiển thị danh sách đã lọc */}
        {filteredOptions.map((district, index) => (
          <option key={index} value={district.value}>
            {district.label}
          </option>
        ))}
      </select>
      
      <Select isOpen={isDropdownOpen} />
      
      {(isLoading || dropdownLoading) && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
     
    </div>
  );
};

export default DistrictDropdown;
