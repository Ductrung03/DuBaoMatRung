// ✅ UPDATED: Use vietnamese-conversion library instead of custom mapping
// This library handles TCVN3 conversion correctly

const { toUnicode } = require('vietnamese-conversion');

const TCVN3_TO_UNICODE = {
  // Chữ thường
  '\xB8': 'à', '\xB9': 'á', '\xBA': 'ả', '\xBB': 'ã', '\xBC': 'ạ',
  '\xC8': 'ằ', '\xC9': 'ắ', '\xCA': 'ẳ', '\xCB': 'ẵ', '\xCC': 'ặ',
  '\xAC': 'ầ', '\xAD': 'ấ', '\xAE': 'ẩ', '\xAF': 'ẫ', '\xB0': 'ậ',
  '\xE8': 'è', '\xE9': 'é', '\xEA': 'ẻ', '\xEB': 'ẽ', '\xEC': 'ẹ',
  '\xAA': 'ề', '\xAB': 'ế', '\xD5': 'ể', '\xF5': 'ễ', '\xED': 'ệ',
  '\xEC': 'ì', '\xED': 'í', '\xEE': 'ỉ', '\xEF': 'ĩ', '\xF0': 'ị',
  '\xF2': 'ò', '\xF3': 'ó', '\xF4': 'ỏ', '\xF5': 'õ', '\xF6': 'ọ',
  '\xAA': 'ồ', '\xAB': 'ố', '\xD5': 'ổ', '\xF5': 'ỗ', '\xED': 'ộ',
  '\xAC': 'ờ', '\xAD': 'ớ', '\xAE': 'ở', '\xAF': 'ỡ', '\xB0': 'ợ',
  '\xF9': 'ù', '\xFA': 'ú', '\xFB': 'ủ', '\xFC': 'ũ', '\xFD': 'ụ',
  '\xAC': 'ừ', '\xAD': 'ứ', '\xAE': 'ử', '\xAF': 'ữ', '\xB0': 'ự',
  '\xFD': 'ỳ', '\xFE': 'ý', '\xFF': 'ỷ', '\xED': 'ỹ', '\xED': 'ỵ',
  '\xAC': 'đ',

  // Chữ hoa
  '\xB5': 'À', '\xB5': 'Á', '\xB6': 'Ả', '\xB7': 'Ã', '\xB7': 'Ạ',
  '\xC0': 'Ằ', '\xC1': 'Ắ', '\xC2': 'Ẳ', '\xC3': 'Ẵ', '\xC4': 'Ặ',
  '\x92': 'Ầ', '\x93': 'Ấ', '\x94': 'Ẩ', '\x95': 'Ẫ', '\x96': 'Ậ',
  '\xD0': 'È', '\xD1': 'É', '\xD2': 'Ẻ', '\xD3': 'Ẽ', '\xD4': 'Ẹ',
  '\x92': 'Ề', '\x93': 'Ế', '\x94': 'Ể', '\x95': 'Ễ', '\xD4': 'Ệ',
  '\xD8': 'Ì', '\xD9': 'Í', '\xDA': 'Ỉ', '\xDB': 'Ĩ', '\xDC': 'Ị',
  '\xD2': 'Ò', '\xD3': 'Ó', '\xD4': 'Ỏ', '\xD5': 'Õ', '\xD6': 'Ọ',
  '\x92': 'Ồ', '\x93': 'Ố', '\x94': 'Ổ', '\x95': 'Ỗ', '\xD4': 'Ộ',
  '\x92': 'Ờ', '\x93': 'Ớ', '\x94': 'Ở', '\x95': 'Ỡ', '\x96': 'Ợ',
  '\xD9': 'Ù', '\xDA': 'Ú', '\xDB': 'Ủ', '\xDC': 'Ũ', '\xDD': 'Ụ',
  '\x92': 'Ừ', '\x93': 'Ứ', '\x94': 'Ử', '\x95': 'Ữ', '\x96': 'Ự',
  '\xDD': 'Ỳ', '\xDE': 'Ý', '\xDF': 'Ỷ', '\xED': 'Ỹ', '\xED': 'Ỵ',
  '\x92': 'Đ'
};

// Mapping cụ thể cho các ký tự đặc biệt
const SPECIAL_MAPPING = {
  '\xB6': 'Tả',  // T¶
  '\xB5': 'à',   //
  '\xC1': 'ñ',   // Cñ
  '\xFB': 'ủ',   // Tû
  '\xC0': 'Bắc', // Bắc
  '\xB5': 'Hà'   // Hµ -> Hà
};

function convertTcvn3ToUnicode(text) {
  if (!text || typeof text !== 'string') return text;

  // ✅ Use vietnamese-conversion library
  try {
    return toUnicode(text, 'tcvn3');
  } catch (err) {
    // Fallback to custom mapping if library fails
    console.warn('vietnamese-conversion failed, using fallback:', err.message);
  }

  // ===== FALLBACK: Custom mapping (kept for safety) =====

  // Bảng chuyển đổi TCVN3 đầy đủ
  const tcvn3Map = {
    // Chữ thường có dấu
    '\xB8': 'à', '\xB9': 'á', '\xBA': 'ả', '\xBB': 'ã', '\xBC': 'ạ',
    '\xC8': 'ằ', '\xC9': 'ắ', '\xCA': 'ẳ', '\xCB': 'ẵ', '\xCC': 'ặ',
    '\xAC': 'ầ', '\xAD': 'ấ', '\xAE': 'ẩ', '\xAF': 'ẫ', '\xB0': 'ậ',
    '\xE8': 'è', '\xE9': 'é', '\xEA': 'ẻ', '\xEB': 'ẽ', '\xEC': 'ẹ',
    '\xAA': 'ề', '\xAB': 'ế', '\xF5': 'ễ', '\xED': 'ệ',
    '\xEC': 'ì', '\xED': 'í', '\xEE': 'ỉ', '\xEF': 'ĩ', '\xF0': 'ị',
    '\xF2': 'ò', '\xF3': 'ó', '\xF4': 'ỏ', '\xF5': 'õ', '\xF6': 'ọ',
    '\xF9': 'ù', '\xFA': 'ú', '\xFB': 'ủ', '\xFC': 'ũ', '\xFD': 'ụ',
    '\xDD': 'ỳ', '\xDE': 'ý', '\xFF': 'ỷ', '\xEF': 'ỹ',
    '\xAC': 'đ',

    // Chữ hoa có dấu
    '\xB5': 'À', '\xB9': 'Á', '\xB6': 'Ả', '\xB7': 'Ã', '\xB7': 'Ạ',
    '\xC0': 'Ằ', '\xC1': 'Ắ', '\xC2': 'Ẳ', '\xC3': 'Ẵ', '\xC4': 'Ặ',
    '\x92': 'Ầ', '\x93': 'Ấ', '\x94': 'Ẩ', '\x95': 'Ẫ', '\x96': 'Ậ',
    '\xD0': 'È', '\xD1': 'É', '\xD2': 'Ẻ', '\xD3': 'Ẽ', '\xD4': 'Ẹ',
    '\x92': 'Ề', '\x93': 'Ế', '\x94': 'Ể', '\x95': 'Ễ', '\xD4': 'Ệ',
    '\xD8': 'Ì', '\xD9': 'Í', '\xDA': 'Ỉ', '\xDB': 'Ĩ', '\xDC': 'Ị',
    '\xD2': 'Ò', '\xD3': 'Ó', '\xD4': 'Ỏ', '\xD5': 'Õ', '\xD6': 'Ọ',
    '\xD9': 'Ù', '\xDA': 'Ú', '\xDB': 'Ủ', '\xDC': 'Ũ', '\xDD': 'Ụ',
    '\xDD': 'Ỳ', '\xDE': 'Ý', '\xDF': 'Ỷ', '\xED': 'Ỹ',
    '\x92': 'Đ',

    // Các ký tự đặc biệt thường gặp trong tên địa danh
    '\xB5': 'Hà', // Hµ -> Hà
    '\xB6': 'Tả', // T¶ -> Tả
    '\xC1': 'ắ',  // ắ
    '\xC0': 'Bắc', // Bắc
    '\xFB': 'ủ',  // û -> ủ
    '\xD5': 'ổ',  // ổ
    '\xA9': 'ơ',  // ơ
    '\xAA': 'ờ',  // ờ
    '\xAB': 'ớ',  // ớ
    '\xAC': 'ở',  // ở (và đ)
    '\xAD': 'ỡ',  // ỡ
    '\xAE': 'ợ',  // ợ
    '\xA8': 'ư',  // ư
    '\xAC': 'ừ',  // ừ
    '\xAD': 'ứ',  // ứ
    '\xAE': 'ử',  // ử
    '\xAF': 'ữ',  // ữ
    '\xB0': 'ự'   // ự
  };

  // Thử detect xem có phải TCVN3 không bằng cách kiểm tra các ký tự đặc biệt
  const hasTcvn3Chars = /[\xB5-\xBF\xC0-\xCF\xD0-\xDF\xE8-\xEF\xF2-\xFD\xAA-\xB0\x92-\x96]/.test(text);

  if (!hasTcvn3Chars) {
    // Nếu không có ký tự TCVN3, trả về nguyên bản
    return text;
  }

  // Convert từng ký tự
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charCode = char.charCodeAt(0);

    // Nếu là ký tự ASCII thường (A-Z, a-z, 0-9, space, etc.)
    if (charCode < 128 && charCode > 31) {
      result += char;
    } else if (tcvn3Map[char]) {
      result += tcvn3Map[char];
    } else {
      result += char; // Giữ nguyên nếu không có trong map
    }
  }

  return result;
}

module.exports = { convertTcvn3ToUnicode };
