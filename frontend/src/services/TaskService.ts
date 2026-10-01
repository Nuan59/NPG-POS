"use server";
// TaskService.ts
// วางไฟล์นี้ใน: frontend/src/services/TaskService.ts
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath } from "next/cache";

export interface TaskProgressLog {
  id: number;
  amount: number;
  note: string;
  created_at: string;
}

export interface TaskAssignment {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_username: string;
  status: "pending" | "in_progress" | "issue" | "done";
  note: string;
  due_date: string | null;
  is_overdue: boolean;
  is_due_soon: boolean;
  completed_at: string | null;
  // ✅ เป้าหมายความคืบหน้า - ไม่บังคับ แล้วแต่งาน (null = งานนี้ไม่ใช้ระบบติดตามจำนวน)
  target_quantity: number | null;
  target_unit: string;
  current_progress: number;
  progress_percentage: number | null;
  progress_logs: TaskProgressLog[];
}

export interface TaskPost {
  id: number;
  content: string;
  post_type: "general" | "assigned";
  created_by: string;
  created_by_username: string;
  // ✅ กำหนดเวลาของ "ประกาศทั่วไป" เอง (assigned ใช้ due_date ใน assignments แต่ละคนแทน)
  due_date: string | null;
  is_overdue: boolean;
  is_due_soon: boolean;
  created_at: string;
  assignments: TaskAssignment[];
}

export const getTaskPosts = async (): Promise<TaskPost[]> => {
  "use server";
  const response = await authorizedFetch(`${process.env.API_URL}/tasks/posts/`, {
    cache: "no-store",
  });
  if (!response?.ok) return [];
  try {
    return await response.json();
  } catch {
    return [];
  }
};

export const createTaskPost = async (payload: {
  content: string;
  post_type: "general" | "assigned";
  // ✅ กำหนดเวลาของ "ประกาศทั่วไป" - ISO string หรือ null (ไม่บังคับ)
  due_date?: string | null;
  // ✅ กำหนดเวลา/เป้าหมายของ "มอบหมายงาน" ตั้งแยกได้คนละคน
  assignments?: {
    employee_id: number;
    due_date: string | null;
    target_quantity?: number | null;
    target_unit?: string;
  }[];
}) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/tasks/posts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response) {
      return { status: "error", error: "ไม่มี session หรือ token กรุณา login ใหม่" };
    }
    const bodyText = await response.text();
    let bodyJson: any = null;
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      bodyJson = null;
    }
    if (!response.ok) {
      return { status: "error", error: bodyJson?.error || `HTTP ${response.status}` };
    }
    revalidatePath("/employees");
    revalidatePath("/tasks");
    return { status: "success", data: bodyJson as TaskPost };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};

export const deleteTaskPost = async (id: number) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/tasks/posts/${id}/`, {
      method: "DELETE",
    });
    if (!response?.ok) {
      return { status: "error", error: "ลบไม่สำเร็จ" };
    }
    revalidatePath("/employees");
    revalidatePath("/tasks");
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};

export const setTaskStatus = async (
  postId: number,
  taskStatus: "pending" | "in_progress" | "issue" | "done",
  note?: string,
  employeeId?: number
) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/tasks/posts/${postId}/set_status/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: taskStatus,
        note: note ?? "",
        ...(employeeId ? { employee_id: employeeId } : {}),
      }),
    });
    if (!response?.ok) {
      return { status: "error", error: "อัปเดตสถานะไม่สำเร็จ" };
    }
    revalidatePath("/employees");
    revalidatePath("/tasks");
    const data = await response.json();
    return { status: "success", data: data as TaskPost };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};

// ✅ อัปเดตความคืบหน้ารายวัน - amount คือ "วันนี้ทำได้เพิ่มเท่าไหร่" ระบบบวกสะสมให้อัตโนมัติ
export const addTaskProgress = async (
  postId: number,
  amount: number,
  note?: string,
  employeeId?: number
) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/tasks/posts/${postId}/add_progress/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        note: note ?? "",
        ...(employeeId ? { employee_id: employeeId } : {}),
      }),
    });
    if (!response?.ok) {
      const err = await response?.json().catch(() => ({}));
      return { status: "error", error: err?.error || "อัปเดตความคืบหน้าไม่สำเร็จ" };
    }
    revalidatePath("/employees");
    revalidatePath("/tasks");
    const data = await response.json();
    return { status: "success", data: data as TaskPost };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};