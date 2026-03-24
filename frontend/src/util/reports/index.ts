/* ===============================
   Constants
================================ */
export const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/* ===============================
   Group data by year (dynamic)
   👉 รองรับทุกปีที่มีจริง
================================ */
export const groupByYear = <T extends { year: string | number }>(
  data: T[]
): Record<string, T[]> => {
  // ✅ ตรวจสอบว่า data เป็น array
  if (!data || !Array.isArray(data)) {
    return {};
  }

  return data.reduce((acc: Record<string, T[]>, item) => {
    const year = String(item.year);

    if (!acc[year]) {
      acc[year] = [];
    }

    acc[year].push(item);
    return acc;
  }, {});
};

/* ===============================
   Fill missing months per year
   👉 แยกเติมเดือนตามปี
   👉 ไม่ทับข้อมูลข้ามปี
================================ */
export const fillMissingMonths = <
  T extends { year: string | number; month: string; [key: string]: any }
>(
  data: T[]
): T[] => {
  // ✅ ตรวจสอบว่า data เป็น array
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  const byYear = groupByYear(data);

  return Object.keys(byYear).flatMap((year) =>
    MONTHS.map((month) => {
      const found = byYear[year].find(
        (item) => item.month === month
      );

      // ถ้าเจอ return ตัวที่เจอ
      // ถ้าไม่เจอ return object ที่มีค่า default
      if (found) {
        return found;
      }

      // สร้าง default object สำหรับเดือนที่ไม่มีข้อมูล
      const defaultObj: any = {
        year,
        month,
      };

      // เติมค่า default สำหรับ field ที่เป็นตัวเลข
      if (data.length > 0) {
        const sampleItem = data[0];
        Object.keys(sampleItem).forEach((key) => {
          if (key !== 'year' && key !== 'month') {
            const value = sampleItem[key];
            // ถ้าเป็นตัวเลข ให้ default = 0
            if (typeof value === 'number') {
              defaultObj[key] = 0;
            }
          }
        });
      }

      return defaultObj as T;
    })
  );
};