// services/Registrationservice.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type DocStatus = "pending_staff" | "received_staff" | "fixing" | "pending_transfer" | "sent_transport" | "completed" | "received_book";

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  pending_staff:    "รอเอกสารจากพนักงาน",
  received_staff:   "รับเอกสารจากพนักงานแล้ว",
  fixing:           "รอแก้เอกสาร",
  pending_transfer: "รอแจ้งย้ายปลายทาง",
  sent_transport:   "ส่งจดทะเบียนให้ขนส่งแล้ว",
  completed:        "เสร็จสิ้น รอลูกค้ารับเล่ม",
  received_book:    "ลูกค้ารับเล่มแล้ว",
};

export const DOC_STATUS_COLOR: Record<DocStatus, string> = {
  pending_staff:    "bg-gray-50 border-gray-300 text-gray-700",
  received_staff:   "bg-blue-50 border-blue-300 text-blue-700",
  fixing:           "bg-yellow-50 border-yellow-300 text-yellow-700",
  pending_transfer: "bg-purple-50 border-purple-300 text-purple-700",
  sent_transport:   "bg-orange-50 border-orange-300 text-orange-700",
  completed:        "bg-green-50 border-green-300 text-green-700",
  received_book:    "bg-teal-50 border-teal-300 text-teal-700",
};

export interface BikeInfo {
  id: number;
  model_name: string;
  model_code: string;
  chassi: string;
  engine: string;
  registration_plate: string;
  color: string;
}

export interface RegistrationItem {
  id: number;
  sale_date: string;
  created_at: string;
  days_passed: number | null;
  is_overdue: boolean;
  doc_status: DocStatus;
  notes: string;
  customer_name: string;
  customer_phone: string;
  seller_name: string;
  bikes: BikeInfo[];
  payment_method: string;
}

export interface StatusLogEntry {
  from_status: DocStatus;
  to_status: DocStatus;
  changed_by: string;
  changed_at: string;
}

export interface ActivityLogEntry {
  log_id: number;
  order_id: number;
  customer_name: string;
  bike_model: string;
  bike_color: string;
  from_status: DocStatus;
  to_status: DocStatus;
  changed_by: string;
  changed_at: string;
}

// ✅ Fetch registration list
export async function getRegistrations(
  token: string,
  statusFilter?: string
): Promise<RegistrationItem[]> {
  const url = statusFilter
    ? `${API_BASE}/registration/?status=${statusFilter}`
    : `${API_BASE}/registration/`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Failed to fetch registrations: ${res.status}`);
  
  const json = await res.json();
  return json.data || [];
}

// ✅ Alias สำหรับ backward compatibility
export const getRegistrationList = getRegistrations;

// ✅ Update doc status
export async function updateDocStatus(
  token: string,
  orderId: number,
  newStatus: DocStatus,
  notes: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/registration/${orderId}/update_status/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ doc_status: newStatus, notes }),
  });

  if (!res.ok) throw new Error(`Failed to update status: ${res.status}`);
}

// ✅ Get status history for a specific order
export async function getStatusHistory(
  token: string,
  orderId: number
): Promise<StatusLogEntry[]> {
  const res = await fetch(`${API_BASE}/registration/${orderId}/history/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  
  const json = await res.json();
  return json.logs || [];
}

// ✅ Get activity feed - ประวัติการเปลี่ยนแปลงล่าสุด
export async function getActivityFeed(
  token: string,
  limit: number = 20
): Promise<ActivityLogEntry[]> {
  const url = `${API_BASE}/registration/activity/?limit=${limit}`;
  
  console.log('🔍 Fetching activity feed from:', url);
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error('❌ Activity feed fetch failed:', res.status, res.statusText);
    throw new Error(`Failed to fetch activity feed: ${res.status}`);
  }
  
  const json = await res.json();
  console.log('📦 Activity feed response:', json);
  console.log('🔢 Number of logs:', json.data?.length || 0);
  
  // ✅ แสดง log แรกเพื่อ debug
  if (json.data && json.data.length > 0) {
    console.log('📋 First log:', json.data[0]);
  } else {
    console.warn('⚠️ No data in response');
  }
  
  return json.data || [];
}