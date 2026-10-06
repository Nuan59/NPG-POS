// serviceRecordUtil.ts
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/components/serviceRecordUtil.ts
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TempReceiptItem } from "@/components/pdf/TempReceiptTemplate";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ ข้อมูลจาก GET /service/{id}/ (ServiceViewSet - ตาราง service_record แยกจากงานขาย)
export interface ServiceRecord {
  id: number;
  service_date: string;
  customer_id: number | null;
  customer: string;
  customer_phone: string;
  customer_address: string;
  bike: {
    id: number;
    brand: string;
    model_name: string;
    model_code: string;
    chassi: string | null;
    registration_plate: string;
  } | null;
  transaction_type: "ซ่อม" | "ต่อภาษี+พรบ" | "อื่นๆ";
  transaction_type_detail: string;
  mileage: number | null;
  items: TempReceiptItem[];
  total: number;
  payment_type: string;
  transfer_bank: string;
  check_number: string;
  notes: string;
  created_by: string;
}

export const transactionBadgeStyle: Record<string, string> = {
  "ซ่อม": "bg-orange-100 text-orange-800",
  "ต่อภาษี+พรบ": "bg-purple-100 text-purple-800",
  "อื่นๆ": "bg-gray-100 text-gray-800",
};

export const getTypeLabel = (r: ServiceRecord) =>
  r.transaction_type === "อื่นๆ" && r.transaction_type_detail ? r.transaction_type_detail : r.transaction_type;

export const getPaymentLabel = (r: ServiceRecord) => {
  if (r.payment_type === "เงินโอน" && r.transfer_bank) return `เงินโอน (${r.transfer_bank})`;
  if (r.payment_type === "เช็ค" && r.check_number) return `เช็ค เลขที่ ${r.check_number}`;
  return r.payment_type || "-";
};

export const getReceiptNumber = (id: number) => `S-${String(id).padStart(8, "0")}`;

export const formatDate = (dateString: string) => {
  if (!dateString) return new Date().toLocaleDateString("th-TH");
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

// ✅ ดึงรายการงานบริการ 1 รายการ (ใช้ร่วมกันทั้งหน้ารายละเอียดและหน้าใบเสร็จชั่วคราว)
export const useServiceRecord = (id: string) => {
  const { data: session, status } = useSession();
  const [record, setRecord] = useState<ServiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as any)?.user?.accessToken;

    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/service/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) throw new Error("ไม่พบรายการนี้");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setRecord(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id, status, session]);

  return { record, loading, error, status };
};