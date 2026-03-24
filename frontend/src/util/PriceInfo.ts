import { IStorage } from "@/types/Storage";

type DataType = {
  name: string;
  label: string;
  placeholder: string;
  options?: { label: string; value: string }[];
  admin?: boolean;
  type?: string;  // ✅ เพิ่ม type
};

export const price_info = (storages?: IStorage[]) => {
  let arrayson: DataType[] = [
    {
      name: "wholesale_price",
      label: "ราคาขายส่ง (รหัส)",
      placeholder: "เช่น NOWTT (14500)",
      admin: true,
      type: "text",  // ✅ เปลี่ยนเป็น text เพื่อรับตัวอักษร
    },
  ];

  if (storages) {
    arrayson.unshift({
      name: "storage_place",
      label: "สถานที่จัดเก็บ",
      placeholder: "เลือกสถานที่จัดเก็บ",
      options: storages.map((storage) => ({
        label: storage.storage_name,
        value: `${storage.id}`,
      })),
    });
  }

  return arrayson;
};