type RGB = { r: number; g: number; b: number };

/**
 * เก็บ index ของสีที่ใช้ไปแล้ว
 * (React-safe, ไม่มี loop)
 */
let colorIndex = 0;

/** ===== Brand colors (คงที่) ===== */
const GRAY: RGB = { r: 90, g: 90, b: 90 };           // เทาเข้ม
const NPG_ORANGE_DARK: RGB = { r: 243, g: 107, b: 33 }; // #F36B21 (ส้มเข้ม)
const NPG_ORANGE_LIGHT: RGB = { r: 255, g: 159, b: 64 }; // ส้มอ่อน

/**
 * 🎯 ลำดับสีที่ต้องการ
 * 1) เทา
 * 2) ส้มเข้ม
 * 3) ส้มอ่อน
 */
const COLOR_SEQUENCE: RGB[] = [
  NPG_ORANGE_LIGHT,
  GRAY,
  NPG_ORANGE_DARK,
];

/**
 * ใช้สีตามลำดับ → วนซ้ำ
 * ❌ ไม่สุ่ม
 * ❌ ไม่ค้าง
 * ❌ สีไม่เพี้ยน
 */
export const generateNpgReadableColor = (): string => {
  const color = COLOR_SEQUENCE[colorIndex % COLOR_SEQUENCE.length];
  colorIndex++;

  return `rgb(${color.r}, ${color.g}, ${color.b})`;
};

/**
 * 🔄 เรียกเมื่อเปลี่ยนหน้า report / dataset
 */
export const resetGeneratedColors = () => {
  colorIndex = 0;
};
