function convertTcvn3ToUnicode(input) {
  const tcvn3Chars = [
    '¸','µ','¶','·','¹','¨','»','¾','¼','½','Æ',
    '©','Ç','Ê','È','É','Ë','®','Ì','Ð','Î','Ï','Ñ',
    'ª','Ò','Õ','Ó','Ô','Ö','×','Ý','Ø','Ü','Þ','ß',
    'ã','á','â','ä','«','å','è','æ','ç','é','¬','ê','í','ë','ì','î','ï',
    'ó','ñ','ò','ô','­','õ','ø','ö','÷','ù','ú','ý','û','ü','þ',
    '¡','§','£','¢','¤','¥','¦'
  ];

  const unicodeChars = [
    'à','á','ả','ã','ạ','ă','ắ','ằ','ẳ','ẵ','ặ',
    'â','ấ','ầ','ẩ','ẫ','ậ','đ','è','đ','ẻ','ẽ','ẹ',
    'ê','ế','ề','ể','ễ','ệ','ì','í','ỉ','ĩ','ị',
    'ò','ó','ỏ','õ','ọ','ô','ố','ồ','ổ','ỗ','ộ',
    'ơ','ớ','ờ','ở','ỡ','ợ','ù','ú','ủ','ũ','ụ',
    'ư','ứ','ừ','ử','ữ','ự','ý','ỳ','ỷ','ỹ','ỵ',
    'Ă','Â','Đ','Ê','Ô','Ơ','Ư'
  ];

  const map = {};
  tcvn3Chars.forEach((char, i) => {
    map[char] = unicodeChars[i];
  });

  // Bước 1: ánh xạ ký tự
  let converted = input.split('').map(c => map[c] || c).join('');

  // Bước 2: vá lỗi từ
  const fixes = {
    // Vá lỗi địa danh phổ biến
    "Thẵng": "Thắng",
    "Bàt": "Bát",
    "Xàt": "Xát",
    "Láo Cai": "Lào Cai",
    "Bằc": "Bắc",
    "Mướng": "Mường",
    "Há": "Hà",
    "Lấu": "Lầu",
    "Liến": "Liền",
    "Phồ": "Phề",
    "Ngái": "Ngài",
    "Âđt": "Đét",
    "Hoáng": "Hoàng",
    "Thải Giáng": "Thải Giàng",
    "Phó": "Phú",
    "Âiện": "Điện",
    "Âô": "Đô",
    "Phề Ráng": "Phố Ràng",
    "Âống": "Đồng",
    "Âướng": "Đường",
    "Phề Mời": "Phố Mới",
    "Thồng Nhầt": "Thống Nhất",
    "Dấn Tháng": "Dần Tháng",
    "Khành Yên Hạ": "Khánh Yên Hạ",
    "Khành Yên Trung": "Khánh Yên Trung",
    "TT. Khành Yên": "TT. Khánh Yên",
    "Láng Giáng": "Làng Giàng",
    "Nậm Xđ": "Nậm Xé",
    "Phề Lu": "Phố Lu",
    "TT. Phề Lu": "TT. Phố Lu",
    "Thài Niên": "Thái Niên",
    "TT. Tắng Lỏng": "TT. Tằng Lỏng",
    "Bản Mề": "Bản Mờ",
    "Lứ Thẩn": "Lử Thẩn",
    "MánThẩn": "Mản Thẩn",
    "Nán Sàn": "Nàn Sán",
    "Nán Xín": "Nàn Xín",
    "Quan Thấn Sàn": "Quan Thẩn Sán",
    "Xín Chđng": "Xín Chéng",
    "Dến Sàng": "Dền Sàng",
    "Dến Tháng": "Dền Tháng",
    "Y Tỳ": "Y Tý",

    // Vá lỗi tên người
    "Âặng": "Đặng",
    "Âường": "Đường",
    "Âình": "Đình",
    "Âức": "Đức",
    "Âạt": "Đạt",
    "Âịnh": "Định",
    "Âông": "Đồng",
    "Âền": "Điền",
    "Âèo": "Đèo",
    "Âược": "Được",
    "Âoàn": "Đoàn",
    "Âơn": "Đơn",
    "Âảng": "Đảng",
    "Âàch": "Đách",
    "Âáo": "Đào",
    "Âí": "Đí",
    "Âố": "Đố",
    "Âờng": "Đường",
    "Âạ": "Đạ",
    "Âắ": "Đắ",
    "Âằ": "Đằ",
    "Âẳ": "Đẳ",
    "Âăn": "Đăn",
    "Âăng": "Đăng",
    "Âán": "Đán",
    "Âám": "Đàm",
    "Âành": "Đành",
    "Âừc": "Đức",
    "Âội": "Đội",
    "Âương": "Đương",
    "Âiền": "Điền",
    "Âị": "Đị",
    "Âình": "Đình",
    "Âèo": "Đèo",
    "Âàch": "Đách",
    "Chàch": "Chách", 
  };

  for (const wrong in fixes) {
    converted = converted.replace(new RegExp(wrong, 'g'), fixes[wrong]);
  }

  return converted;
}

module.exports = convertTcvn3ToUnicode;
