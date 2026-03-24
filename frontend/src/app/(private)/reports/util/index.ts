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
  T extends { year: string | number; month: string; total_revenue?: number }
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

      return (
        found ??
        ({
          year,
          month,
          total_revenue: 0,
        } as T)
      );
    })
  );
};