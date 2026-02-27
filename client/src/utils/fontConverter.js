/**
 * Chuyển đổi text từ các encoding tiếng Việt sang Unicode (UTF-8)
 * Sử dụng thư viện vietnamese-conversion để đảm bảo chuyển đổi chính xác
 */

import { toUnicode } from 'vietnamese-conversion';

/**
 * Chuyển đổi chuỗi từ nhiều encoding sang Unicode và sửa lỗi typo phổ biến
 * @param {string} text - Chuỗi cần chuyển đổi
 * @returns {string} - Chuỗi đã được chuyển đổi sang Unicode
 */
export const convertTcvn3ToUnicode = (text) => {
  if (!text || typeof text !== 'string') return text;

  try {
    let fixed = text;

    // ✅ FIX: Handle UTF-8 mis-interpreted as Latin-1 (common database encoding issue)
    // Pattern: "XÃ£ MÆ°á»ng ChiÃªn" → "Xã Mường Chiên"
    if (fixed.includes('Ã') || fixed.includes('á»') || fixed.includes('Æ°')) {
      try {
        // Try to fix double-encoding: encode as Latin-1, decode as UTF-8
        const encoder = new TextEncoder();
        const decoder = new TextDecoder('utf-8');
        // Convert string to bytes as if it were Latin-1, then decode as UTF-8
        const bytes = [];
        for (let i = 0; i < fixed.length; i++) {
          bytes.push(fixed.charCodeAt(i));
        }
        const corrected = decoder.decode(new Uint8Array(bytes));
        if (corrected && !corrected.includes('�')) {
          fixed = corrected;
        }
      } catch (e) {
        // Fallback: continue with normal conversion
      }
    }

    // Fix common typos - nhiều patterns
    // Pattern 1: Xó/Xo → Xã (với hoặc không có space sau)
    fixed = fixed.replace(/^Xó(\s|$)/gi, 'Xã$1');  // "Xó Chiềng" hoặc "Xó"
    fixed = fixed.replace(/^Xo(\s|$)/gi, 'Xã$1');   // "Xo Chiềng" hoặc "Xo"

    // Pattern 2: xa → xã (lowercase)
    fixed = fixed.replace(/^xa(\s|$)/g, 'xã$1');

    // Pattern 3: XA → Xã (all caps)
    fixed = fixed.replace(/^XA(\s|$)/g, 'Xã$1');

    // Pattern 4: Fix "Phường Xó", "Thị trấn Xó", etc.
    fixed = fixed.replace(/(Phường|Thị\s+trấn|Thành\s+phố)\s+Xó(\s|$)/gi, '$1 Xã$2');

    // Pattern 5: Double characters - Xaa → Xã
    fixed = fixed.replace(/^Xaa?(\s|$)/gi, 'Xã$1');

    // Thử VNI encoding trước (phổ biến nhất)
    try {
      const vniConverted = toUnicode(fixed, 'vni');
      if (vniConverted && vniConverted !== fixed && !/[\u0080-\u00FF]/.test(vniConverted)) {
        fixed = vniConverted;
      }
    } catch (e) {
      // Ignore VNI conversion error
    }

    // Thử TCVN3
    try {
      const tcvn3Converted = toUnicode(fixed, 'tcvn3');
      if (tcvn3Converted && tcvn3Converted !== fixed && !/[\u0080-\u00FF]/.test(tcvn3Converted)) {
        fixed = tcvn3Converted;
      }
    } catch (e) {
      // Ignore TCVN3 conversion error
    }

    // Apply fixes again after conversion (in case conversion introduced issues)
    fixed = fixed.replace(/^Xó(\s|$)/gi, 'Xã$1');
    fixed = fixed.replace(/^Xo(\s|$)/gi, 'Xã$1');
    fixed = fixed.replace(/^xa(\s|$)/g, 'xã$1');
    fixed = fixed.replace(/^XA(\s|$)/g, 'Xã$1');

    return fixed;
  } catch (error) {
    console.warn('Error converting to Unicode:', error);
    return text; // Fallback: trả về nguyên bản nếu lỗi
  }
};

export default convertTcvn3ToUnicode;
