// Utility functions for text encoding conversion

/**
 * Convert TCVN3 (Vietnamese legacy encoding) to Unicode
 * @param {string} tcvn3Text - Text in TCVN3 encoding
 * @returns {string} - Text converted to Unicode
 */
function convertTcvn3ToUnicode(tcvn3Text) {
  if (!tcvn3Text || typeof tcvn3Text !== 'string') {
    return tcvn3Text;
  }

  // Basic TCVN3 to Unicode mapping for common Vietnamese characters
  const tcvn3Map = {
    'µ': 'à', '¸': 'á', '¶': 'ả', '·': 'ã', '¹': 'ạ',
    'Ì': 'è', 'Ð': 'é', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
    'Ý': 'ì', 'Þ': 'í', 'Ø': 'ỉ', 'Ü': 'ĩ', 'ß': 'ị',
    'ß': 'ò', 'ã': 'ó', 'á': 'ỏ', 'â': 'õ', 'ä': 'ọ',
    'ï': 'ù', 'ó': 'ú', 'ñ': 'ủ', 'ò': 'ũ', 'ô': 'ụ',
    'ø': 'ỳ', 'ý': 'ý', 'û': 'ỷ', 'ü': 'ỹ', 'þ': 'ỵ'
  };

  let result = tcvn3Text;
  
  // Apply character mapping
  for (const [tcvn3Char, unicodeChar] of Object.entries(tcvn3Map)) {
    result = result.replace(new RegExp(tcvn3Char, 'g'), unicodeChar);
  }

  return result;
}

/**
 * Convert Unicode to TCVN3 (reverse conversion)
 * @param {string} unicodeText - Text in Unicode
 * @returns {string} - Text converted to TCVN3
 */
function convertUnicodeToTcvn3(unicodeText) {
  if (!unicodeText || typeof unicodeText !== 'string') {
    return unicodeText;
  }

  // Reverse mapping from Unicode to TCVN3
  const unicodeMap = {
    'à': 'µ', 'á': '¸', 'ả': '¶', 'ã': '·', 'ạ': '¹',
    'è': 'Ì', 'é': 'Ð', 'ẻ': 'Î', 'ẽ': 'Ï', 'ẹ': 'Ñ',
    'ì': 'Ý', 'í': 'Þ', 'ỉ': 'Ø', 'ĩ': 'Ü', 'ị': 'ß',
    'ò': 'ß', 'ó': 'ã', 'ỏ': 'á', 'õ': 'â', 'ọ': 'ä',
    'ù': 'ï', 'ú': 'ó', 'ủ': 'ñ', 'ũ': 'ò', 'ụ': 'ô',
    'ỳ': 'ø', 'ý': 'ý', 'ỷ': 'û', 'ỹ': 'ü', 'ỵ': 'þ'
  };

  let result = unicodeText;
  
  // Apply character mapping
  for (const [unicodeChar, tcvn3Char] of Object.entries(unicodeMap)) {
    result = result.replace(new RegExp(unicodeChar, 'g'), tcvn3Char);
  }

  return result;
}

/**
 * Normalize Vietnamese text for search/comparison
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
function normalizeVietnameseText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
}

module.exports = {
  convertTcvn3ToUnicode,
  convertUnicodeToTcvn3,
  normalizeVietnameseText
};
