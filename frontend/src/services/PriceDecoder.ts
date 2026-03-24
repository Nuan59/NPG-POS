/**
 * 🔐 ระบบเข้ารหัสราคาขายส่ง
 * 
 * N = 1, C = 2, I = 3, O = 4, W = 5
 * M = 6, A = 7, E = 8, Z = 9, T = 0
 */

const CODE_MAP: Record<string, string> = {
  'N': '1',
  'C': '2',
  'I': '3',
  'O': '4',
  'W': '5',
  'M': '6',
  'A': '7',
  'E': '8',
  'Z': '9',
  'T': '0',
};

/**
 * แปลงรหัสเป็นตัวเลข
 * @param encoded - รหัสที่เข้ารหัส เช่น "NOWTT" = 14500
 * @returns ราคาจริง
 * 
 * @example
 * decodePrice("NOWTT") // 14500
 * decodePrice("CWTTT") // 25000
 * decodePrice("IWTTT") // 35000
 */
export const decodePrice = (encoded: string | null | undefined): number => {
  if (!encoded || typeof encoded !== 'string') {
    return 0;
  }

  // แปลงเป็นตัวพิมพ์ใหญ่
  const upper = encoded.trim().toUpperCase();
  
  // แปลงทีละตัวอักษร
  let decoded = '';
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    const digit = CODE_MAP[char];
    
    if (digit !== undefined) {
      decoded += digit;
    } else {
      // ถ้าเจอตัวอักษรที่ไม่รู้จัก ให้คืนค่า 0
      console.warn(`Unknown character in encoded price: "${char}" in "${encoded}"`);
      return 0;
    }
  }

  return parseInt(decoded) || 0;
};

/**
 * แปลงตัวเลขเป็นรหัส
 * @param price - ราคาจริง
 * @returns รหัสที่เข้ารหัส
 * 
 * @example
 * encodePrice(14500) // "NOWTT"
 * encodePrice(25000) // "CWTTT"
 */
export const encodePrice = (price: number): string => {
  if (!price || price < 0) {
    return '';
  }

  const priceStr = String(price);
  const reverseMap: Record<string, string> = {
    '1': 'N',
    '2': 'C',
    '3': 'I',
    '4': 'O',
    '5': 'W',
    '6': 'M',
    '7': 'A',
    '8': 'E',
    '9': 'Z',
    '0': 'T',
  };

  let encoded = '';
  for (let i = 0; i < priceStr.length; i++) {
    const digit = priceStr[i];
    encoded += reverseMap[digit] || '';
  }

  return encoded;
};

/**
 * ตรวจสอบว่ารหัสถูกต้องหรือไม่
 */
export const isValidEncodedPrice = (encoded: string): boolean => {
  if (!encoded || typeof encoded !== 'string') {
    return false;
  }

  const upper = encoded.trim().toUpperCase();
  
  for (let i = 0; i < upper.length; i++) {
    if (!(upper[i] in CODE_MAP)) {
      return false;
    }
  }

  return true;
};