import { useState, useEffect } from 'react';
import { getSonLaXa, getSonLaTieuKhu, getSonLaKhoanh } from '../../utils/dropdownService';

/**
 * Custom Hook để quản lý state và logic cho các dropdown Sơn La.
 * Không có dropdown Huyện - chỉ có Xã -> Tiểu khu -> Khoảnh.
 * Lấy dữ liệu từ các bảng sonla_rgx, sonla_tkkl, sonla_hientrangrung.
 */
export const useSonLaAdminUnits = () => {
  const [xaList, setXaList] = useState([]);
  const [selectedXa, setSelectedXa] = useState('');

  const [tieukhuList, setTieukhuList] = useState([]);
  const [selectedTieukhu, setSelectedTieukhu] = useState('');

  const [khoanhList, setKhoanhList] = useState([]);
  const [selectedKhoanh, setSelectedKhoanh] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch danh sách xã Sơn La khi component được mount
  useEffect(() => {
    const fetchXa = async () => {
      setIsLoading(true);
      try {
        const communes = await getSonLaXa();
        setXaList(communes);
      } catch (error) {
        console.error("Hook: Lỗi khi tải danh sách xã Sơn La", error);
        setXaList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchXa();
  }, []);

  // 2. Fetch danh sách tiểu khu khi xã thay đổi
  useEffect(() => {
    if (!selectedXa) {
      setTieukhuList([]);
      setSelectedTieukhu('');
      return;
    }
    const fetchTieukhu = async () => {
      setIsLoading(true);
      try {
        const subzones = await getSonLaTieuKhu(selectedXa);
        setTieukhuList(subzones);
      } catch (error) {
        console.error(`Hook: Lỗi khi tải tiểu khu cho xã ${selectedXa}`, error);
        setTieukhuList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTieukhu();
  }, [selectedXa]);

  // 3. Fetch danh sách khoảnh khi xã hoặc tiểu khu thay đổi
  useEffect(() => {
    if (!selectedXa) {
      setKhoanhList([]);
      setSelectedKhoanh('');
      return;
    }
    const fetchKhoanh = async () => {
      setIsLoading(true);
      try {
        const plots = await getSonLaKhoanh(selectedXa, selectedTieukhu);
        setKhoanhList(plots);
      } catch (error) {
        console.error(`Hook: Lỗi khi tải khoảnh`, error);
        setKhoanhList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKhoanh();
  }, [selectedXa, selectedTieukhu]);

  // Các hàm xử lý sự kiện change - hỗ trợ cả event object và value trực tiếp
  const handleXaChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSelectedXa(value);
    // Reset các dropdown con
    setSelectedTieukhu('');
    setSelectedKhoanh('');
    setTieukhuList([]);
    setKhoanhList([]);
  };

  const handleTieukhuChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSelectedTieukhu(value);
    setSelectedKhoanh('');
    setKhoanhList([]);
  };

  const handleKhoanhChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSelectedKhoanh(value);
  };

  return {
    // Trạng thái loading
    isLoading,

    // Dữ liệu và trạng thái cho dropdown Xã
    xa: {
      list: xaList,
      loading: isLoading,
      disabled: false,
      onChange: handleXaChange
    },
    selectedXa,

    // Dữ liệu và trạng thái cho dropdown Tiểu khu
    tieukhu: {
      list: tieukhuList,
      loading: isLoading,
      disabled: !selectedXa,
      onChange: handleTieukhuChange
    },
    selectedTieukhu,

    // Dữ liệu và trạng thái cho dropdown Khoảnh
    khoanh: {
      list: khoanhList,
      loading: isLoading,
      disabled: !selectedXa,
      onChange: handleKhoanhChange
    },
    selectedKhoanh,
  };
};
