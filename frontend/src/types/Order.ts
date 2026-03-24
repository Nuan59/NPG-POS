// types/Order.ts

import { IAdditionalFee } from "./AdditionalFee";
import { IBike } from "./Bike";
import { ICustomer } from "./Customer";
import { OrderGift } from "./Gift";

export interface IOrder {
  id?: number;
  sale_date?: string;
  seller?: number;
  customer?: number | ICustomer;
  salesperson?: string;
  bikes?: IBike[];
  
  // ข้อมูลการขาย
  total_price?: number;
  sale_price?: number;  // ราคาสินค้า (จาก "ขาย")
  deposit?: number;  // มัดจำ
  discount?: number;
  down_payment?: number;
  additional_fees?: IAdditionalFee[];
  
  // ข้อมูลไฟแนนซ์
  finance_amount?: number;  // ยอดจัด
  interest_rate?: number;  // ดอกเบี้ย (%)
  installment_count?: number;  // จำนวนงวด
  installment_amount?: number;  // ค่างวด
  finance_provider?: string;  // บริษัทไฟแนนซ์ (Cathay, ทรัพย์สยาม, NPG)
  
  commission?: number;
  total?: number;
  payment_method?: string;
  notes?: string;
  registration_status?: string;
  has_checkout?: boolean;
  gifts?: OrderGift[];
  registration_expiry_date?: string | null;  // ✅ วันหมดอายุทะเบียน
}