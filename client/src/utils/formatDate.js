
/**
 * Định dạng ngày theo định dạng dd/mm/yyyy
 * @param {string|Date} dateString - Chuỗi ngày hoặc đối tượng Date
 * @returns {string} - Chuỗi ngày đã định dạng
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Trả về nguyên gốc nếu không phải ngày hợp lệ
  
  // Lấy ngày, tháng, năm và thêm số 0 phía trước nếu cần
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};