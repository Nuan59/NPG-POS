import { IBike } from "@/types/Bike";
import { ICustomer } from "@/types/Customer";
import { Gift } from "@/types/Gift";
import { IEmployee } from "@/types/IEmployee";
import { IStorage } from "@/types/Storage";

interface HandleFilterProps {
  searchTerm: string;
  objList: IBike[] | ICustomer[] | IEmployee[] | IStorage[] | Gift[];
}

export const handleFilter = ({ searchTerm, objList }: HandleFilterProps) => {
  // ✅ เช็คว่า objList เป็น array หรือไม่
  if (!Array.isArray(objList)) {
    console.error('❌ objList is not an array:', objList);
    return [];
  }

  // ถ้าไม่มี searchTerm ให้ return ทั้งหมด
  if (!searchTerm || searchTerm.trim() === '') {
    return objList;
  }

  // Filter ตาม searchTerm
  const filteredObjects = objList.filter((obj: any) => {
    // ✅ เช็คว่า obj เป็น object
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    for (const [_, value] of Object.entries(obj)) {
      if (String(value).toLowerCase().includes(searchTerm.toLowerCase())) {
        return true; // ✅ return true ไม่ใช่ obj
      }
    }
    
    return false; // ✅ ต้องมี return false
  });

  return filteredObjects;
};