// financialTypes.ts
// วางไฟล์นี้ใน: src/app/(private)/reports/util/financialTypes.ts
// ✅ type กลางของหน้ารายงานการเงิน แยกออกมาให้ component ย่อยทุกตัว import ใช้ร่วมกัน
// กันปัญหา define ซ้ำหลายที่แล้วโครงสร้างเพี้ยนไม่ตรงกัน

export type FinancialData = {
  year: string | number;
  month: string;
  revenue: number;
  additional_fee_revenue: number;
  cost: number;
  additional_fees: number;
  gross_profit: number;
  net_profit: number;
  order_count: number;
};

export type ModelData = {
  model_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  count: number;
};

export type OverviewData = {
  total_revenue: number;
  total_additional_fee_revenue: number;
  total_cost: number;
  total_additional_fees: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  total_orders: number;
  average_profit_per_order: number;
};

export type FeeBreakdownItem = {
  description: string;
  total_amount: number;
  count: number;
};

export const PIE_COLORS = ["#00C49F", "#FF8042", "#f97316"];

// ✅ ฟอร์แมตตัวเลขแบบไทย ใช้ร่วมกันทุก component
export const fmt = (num: number) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);