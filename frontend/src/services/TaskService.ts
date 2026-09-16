"use server";
// TaskService.ts
// วางไฟล์นี้ใน: frontend/src/services/TaskService.ts
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath, revalidateTag } from "next/cache";

export interface TaskAssignment {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_username: string;
  status: "pending" | "in_progress" | "issue" | "done";
  note: string;
  completed_at: string | null;
}

export interface TaskPost {
  id: number;
  content: string;
  post_type: "general" | "assigned";
  created_by: string;
  created_by_username: string;
  created_at: string;
  assignments: TaskAssignment[];
}

export const getTaskPosts = async (): Promise<TaskPost[]> => {
  "use server";
  const response = await authorizedFetch(`${process.env.API_URL}/tasks/posts/`, {
    next: { revalidate: 0, tags: ["taskPosts"] },
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
  employee_ids?: number[];
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
    revalidateTag("taskPosts");
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
    revalidateTag("taskPosts");
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
    revalidateTag("taskPosts");
    const data = await response.json();
    return { status: "success", data: data as TaskPost };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};