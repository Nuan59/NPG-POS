type ProductInfoItem = {
  name: string;
  label: string;
  placeholder: string;
  options?: { label: string; value: string }[];
  type?: string;
  showOnlyFor?: "new" | "pre_owned";
};

export const product_info: ProductInfoItem[] = [
  // ✅ 1. ประเภทสินค้า
  {
    name: "category",
    label: "ประเภทสินค้า",
    placeholder: "เลือกประเภทสินค้า",
    options: [
      { label: "รถใหม่", value: "new" },
      { label: "มือสอง", value: "pre_owned" },
    ],
  },
  // ✅ 2. ยี่ห้อ
  {
    name: "brand",
    label: "ยี่ห้อ",
    placeholder: "เลือกยี่ห้อ",
    options: [
      { label: "Honda", value: "Honda" },
      { label: "Yamaha", value: "Yamaha" },
      { label: "GPX", value: "GPX" },
      { label: "RYUKA", value: "RYUKA" },
      { label: "Lambretta", value: "Lambretta" },
      { label: "Vespa", value: "Vespa" },
    ],
  },
  // 3. ชื่อรุ่น
  {
    name: "model_name",
    label: "ชื่อรุ่น",
    placeholder: "เช่น Wave 110i",
  },
  // 4. รหัสรุ่น
  {
    name: "model_code",
    label: "รหัสรุ่น",
    placeholder: "เช่น AFS125CSFP TH",
  },
  // 5. เลขเครื่องยนต์
  {
    name: "engine",
    label: "เลขเครื่องยนต์",
    placeholder: "กรอกเลขเครื่องยนต์",
  },
  // 6. เลขตัวถัง - ✅ แก้เป็น chassis
  {
    name: "chassi",
    label: "เลขตัวถัง",
    placeholder: "กรอกเลขตัวถัง",
  },
  // ✅ 7. ทะเบียนรถ - แสดงเฉพาะมือสอง
  {
    name: "registration_plate",
    label: "ทะเบียนรถ",
    placeholder: "เช่น กข 1234",
    showOnlyFor: "pre_owned",
  },
  // ✅ 8. วันหมดอายุทะเบียน - แสดงเฉพาะมือสอง
  {
    name: "registration_expiry_date",
    label: "วันหมดอายุทะเบียน",
    placeholder: "YYYY-MM-DD",
    type: "date",
    showOnlyFor: "pre_owned",
  },
  // 9. สี
  {
    name: "color",
    label: "สี",
    placeholder: "เช่น แดง",
  },
  // 10. หมายเหตุ
  {
    name: "notes",
    label: "หมายเหตุ",
    placeholder: "หมายเหตุเพิ่มเติม",
  },
];