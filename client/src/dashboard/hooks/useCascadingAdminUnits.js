import { useState, useEffect } from 'react';
import { getDistricts, getCommunes, getPlots, getSubZones } from '../../utils/adminService';

/**
 * Custom Hook để quản lý state và logic cho các dropdown hành chính xếp chồng.
 * Bao gồm Huyện -> Xã -> Khoảnh -> Tiểu khu.
 */
export const useCascadingAdminUnits = () => {
  const [huyenList, setHuyenList] = useState([]);
  const [selectedHuyen, setSelectedHuyen] = useState('');
  
  const [xaList, setXaList] = useState([]);
  const [selectedXa, setSelectedXa] = useState('');

  const [khoanhList, setKhoanhList] = useState([]);
  const [selectedKhoanh, setSelectedKhoanh] = useState('');

  const [tieukhuList, setTieukhuList] = useState([]);
  const [selectedTieukhu, setSelectedTieukhu] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch danh sách huyện khi component được mount
  useEffect(() => {
    const fetchHuyen = async () => {
      setIsLoading(true);
      try {
        const districts = await getDistricts();
        setHuyenList(districts);
      } catch (error) {
        console.error("Hook: Lỗi khi tải danh sách huyện", error);
        setHuyenList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHuyen();
  }, []);

  // 2. Fetch danh sách xã khi huyện thay đổi
  useEffect(() => {
    if (!selectedHuyen) {
      setXaList([]);
      setSelectedXa('');
      return;
    }
    const fetchXa = async () => {
      setIsLoading(true);
      try {
        const communes = await getCommunes(selectedHuyen);
        setXaList(communes);
      } catch (error) {
        console.error(`Hook: Lỗi khi tải xã cho huyện ${selectedHuyen}`, error);
        setXaList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchXa();
  }, [selectedHuyen]);

  // 3. Fetch danh sách khoảnh khi xã thay đổi
  useEffect(() => {
    if (!selectedXa) {
      setKhoanhList([]);
      setSelectedKhoanh('');
      return;
    }
    const fetchKhoanh = async () => {
      setIsLoading(true);
      try {
        const plots = await getPlots(selectedHuyen, selectedXa);
        setKhoanhList(plots);
      } catch (error) {
        console.error(`Hook: Lỗi khi tải khoảnh cho xã ${selectedXa}`, error);
        setKhoanhList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKhoanh();
  }, [selectedHuyen, selectedXa]);

  // 4. Fetch danh sách tiểu khu khi khoảnh thay đổi
  useEffect(() => {
    if (!selectedKhoanh) {
      setTieukhuList([]);
      setSelectedTieukhu('');
      return;
    }
    const fetchTieukhu = async () => {
      setIsLoading(true);
      try {
        const subzones = await getSubZones(selectedHuyen, selectedXa, selectedKhoanh);
        setTieukhuList(subzones);
      } catch (error) {
        console.error(`Hook: Lỗi khi tải tiểu khu cho khoảnh ${selectedKhoanh}`, error);
        setTieukhuList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTieukhu();
  }, [selectedHuyen, selectedXa, selectedKhoanh]);

  // Các hàm xử lý sự kiện change - hỗ trợ cả event object và value trực tiếp
  const handleHuyenChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSelectedHuyen(value);
    // Reset các dropdown con
    setSelectedXa('');
    setSelectedKhoanh('');
    setSelectedTieukhu('');
    setXaList([]);
    setKhoanhList([]);
    setTieukhuList([]);
  };

  const handleXaChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSelectedXa(value);
    setSelectedKhoanh('');
    setSelectedTieukhu('');
    setKhoanhList([]);
    setTieukhuList([]);
  };

  const handleKhoanhChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSelectedKhoanh(value);
    setSelectedTieukhu('');
    setTieukhuList([]);
  };

  const handleTieukhuChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setSelectedTieukhu(value);
  };

  return {
    // Trạng thái loading
    isLoading,

    // Dữ liệu và trạng thái cho dropdown Huyện
    huyen: { 
      list: huyenList, 
      loading: isLoading, 
      disabled: false 
    },
    selectedHuyen,
    handleHuyenChange,

    // Dữ liệu và trạng thái cho dropdown Xã
    xa: { 
      list: xaList, 
      loading: isLoading, 
      disabled: !selectedHuyen,
      onChange: handleXaChange
    },
    selectedXa,

    // Dữ liệu và trạng thái cho dropdown Khoảnh
    khoanh: { 
      list: khoanhList, 
      loading: isLoading, 
      disabled: !selectedXa,
      onChange: handleKhoanhChange
    },
    selectedKhoanh,

    // Dữ liệu và trạng thái cho dropdown Tiểu khu
    tieukhu: { 
      list: tieukhuList, 
      loading: isLoading, 
      disabled: !selectedKhoanh,
      onChange: handleTieukhuChange
    },
    selectedTieukhu,
  };
};
