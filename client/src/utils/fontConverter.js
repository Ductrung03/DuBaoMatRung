/**
 * Chuyển đổi text từ TCVN3 sang Unicode (UTF-8)
 * Sử dụng thư viện vietnamese-conversion để đảm bảo chuyển đổi chính xác
 */

import { toUnicode } from 'vietnamese-conversion';

/**
 * Chuyển đổi chuỗi TCVN3 sang Unicode
 * @param {string} text - Chuỗi cần chuyển đổi
 * @returns {string} - Chuỗi đã được chuyển đổi sang Unicode
 */
export const convertTcvn3ToUnicode = (text) => {
  if (!text || typeof text !== 'string') return text;

  try {
    return toUnicode(text, 'tcvn3');
  } catch (error) {
    console.warn('Error converting TCVN3 to Unicode:', error);
    return text; // Fallback: trả về nguyên bản nếu lỗi
  }
};

export default convertTcvn3ToUnicode;
