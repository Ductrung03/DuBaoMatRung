import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Dropdown from "../../components/Dropdown"; // Use the new generic Dropdown
import { getDistricts } from "../../utils/adminService";
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
  onFocus, // Keep for now, but might be removed if not used by generic Dropdown
  onBlur,  // Keep for now, but might be removed if not used by generic Dropdown
  name = "district_id",
  isLoading = false,
  className = "",
  forceEnable = false
}) => {
  const [districts, setDistricts] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setDropdownLoading(true);
        const data = await getDistricts();
        
        setDistricts(data);
        
        if (!isAdmin() && user?.district_id) {
          const filtered = data.filter(district => {
            const exactMatch = district.value === user.district_id;
            return exactMatch;
          });
          
          setFilteredOptions(filtered);
          
          if (filtered.length === 1 && !value) {
            if (onChange) onChange({ target: { name, value: filtered[0].value } });
          }
        } else {
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

  // Determine if dropdown should be disabled
  const isDisabled = isLoading || dropdownLoading || (!isAdmin() && user?.district_id && !forceEnable);
  
  // Adapt onChange for the generic Dropdown component
  const handleValueChange = (newValue) => {
    if (onChange) {
      onChange({ target: { name, value: newValue } });
    }
  };

  return (
    <Dropdown
      options={filteredOptions}
      selectedValue={value}
      onValueChange={handleValueChange}
      placeholder="Chọn huyện"
      disabled={isDisabled}
      loading={isLoading || dropdownLoading}
      className={`w-36 ${className}`}
      selectClassName="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
    />
  );
};

export default DistrictDropdown;