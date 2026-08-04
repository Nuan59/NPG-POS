type ProductInfoItem = {
  name: string;
  label: string;
  placeholder: string;
  options?: { label: string; value: string }[];
  type?: string;
  showOnlyFor?: "new" | "pre_owned";
};

export const product_info: ProductInfoItem[] = [
  {
    name: "category",
    label: "ประเภทสินค้า",
    placeholder: "เลือกประเภทสินค้า",
    options: [
      { label: "รถใหม่", value: "new" },
      { label: "มือสอง", value: "pre_owned" },
    ],
  },
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
      { label: "Kawasaki", value: "Kawasaki" }
    ],
  },
  {
    name: "model_name",
    label: "ชื่อรุ่น",
    placeholder: "เช่น Wave 110i",
  },
  {
    name: "model_code",
    label: "รหัสรุ่น",
    placeholder: "เช่น AFS125CSFP TH",
  },
  {
    name: "engine",
    label: "เลขเครื่องยนต์",
    placeholder: "กรอกเลขเครื่องยนต์",
  },
  {
    name: "chassi",
    label: "เลขตัวถัง",
    placeholder: "กรอกเลขตัวถัง",
  },
  // ✅ แสดงเฉพาะมือสอง
  {
    name: "old_registration_plate",
    label: "ทะเบียนเก่า",
    placeholder: "เช่น กก 999 แพร่",
    showOnlyFor: "pre_owned",
  },
  {
    name: "registration_plate",
    label: "ทะเบียนใหม่",
    placeholder: "เช่น กก 999 แพร่",
    showOnlyFor: "pre_owned",
  },
  {
    name: "registration_expiry_date",
    label: "วันหมดอายุทะเบียน",
    placeholder: "YYYY-MM-DD",
    type: "date",
    showOnlyFor: "pre_owned",
  },
  {
    name: "color",
    label: "สี",
    placeholder: "เช่น แดง",
  },
  {
    name: "notes",
    label: "หมายเหตุ",
    placeholder: "หมายเหตุเพิ่มเติม",
  },
];