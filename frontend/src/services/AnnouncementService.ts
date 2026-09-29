"use server";
// AnnouncementService.ts
// วางไฟล์นี้ใน: frontend/src/services/AnnouncementService.ts
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath, revalidateTag } from "next/cache";

export interface Announcement {
  id: number;
  content: string;
  is_active: boolean;
  created_by: string;
  created_by_username: string;
  created_at: string;
}

export const getAnnouncements = async (): Promise<Announcement[]> => {
  "use server";
  const response = await authorizedFetch(`${process.env.API_URL}/announcements/`, {
    next: { revalidate: 0, tags: ["announcements"] },
  });
  if (!response?.ok) return [];
  try {
    return await response.json();
  } catch {
    return [];
  }
};

export const createAnnouncement = async (content: string) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/announcements/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
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
    revalidatePath("/issues");
    revalidateTag("announcements");
    return { status: "success", data: bodyJson as Announcement };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};

export const toggleAnnouncement = async (id: number, isActive: boolean) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/announcements/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!response?.ok) {
      return { status: "error", error: "อัปเดตไม่สำเร็จ" };
    }
    revalidatePath("/issues");
    revalidateTag("announcements");
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};

export const deleteAnnouncement = async (id: number) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/announcements/${id}/`, {
      method: "DELETE",
    });
    if (!response?.ok) {
      return { status: "error", error: "ลบไม่สำเร็จ" };
    }
    revalidatePath("/issues");
    revalidateTag("announcements");
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};