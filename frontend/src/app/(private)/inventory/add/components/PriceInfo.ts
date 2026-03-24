import { IStorage } from "@/types/Storage";

type DataType = {
  name: string;
  label: string;
  placeholder: string;
  options?: { label: string; value: string }[];
  admin?: boolean;
  type?: string;
};

export const price_info = (storages?: IStorage[]) => {
  let arrayson: DataType[] = [
    {
      name: "wholesale_price",  // ✅ ใช้ชื่อเดิม
      label: "ราคาขายส่ง",
      placeholder: "",
      type: "text",  // ✅ เปลี่ยนเป็น text
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