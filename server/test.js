const convert = require("./utils/convertTcvn3ToUnicode");

console.log(convert("B¶o Th¾ng"));   // Bảo Thắng
console.log(convert("M­êng Kh­¬ng")); // Mường Khương
console.log(convert("B¸t X¸t"));     // Bát Xát
