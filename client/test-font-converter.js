// Test file to verify font conversion
import { toUnicode } from 'vietnamese-conversion';

function convertTcvn3ToUnicode(text) {
  if (!text || typeof text !== 'string') return text;

  try {
    return toUnicode(text, 'tcvn3');
  } catch (error) {
    console.warn('Error converting TCVN3 to Unicode:', error);
    return text;
  }
}

// Test cases
const testCases = [
  'TP. Lµo Cai',
  'T¶ Phêi',
  'B¶o Yªn',
  'Hµ Néi'
];

console.log('=== Font Conversion Test ===\n');
testCases.forEach(text => {
  const converted = convertTcvn3ToUnicode(text);
  console.log(`Input:  "${text}"`);
  console.log(`Output: "${converted}"`);
  console.log('---');
});
