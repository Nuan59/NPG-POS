"use server";
// AnnouncementService.ts
// วางไฟล์นี้ใน: frontend/src/services/AnnouncementService.ts
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath, revalidateTag } from "next/cache";

export interface Announcement {
  id: number;
  content: string;
  // ✅ รายละเอียดเพิ่มเติม (ไม่บังคับ) - โชว์ตอนกดที่แถบไหลเพื่อดูรายละเอียดเต็ม
  detail: string;
  is_active: boolean;
  created_by: string;
  created_by_username: string;
  created_at: string;
}

export interface AnnouncementSettings {
  speed_seconds: number;
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

export const createAnnouncement = async (payload: { content: string; detail?: string }) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/announcements/`, {
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

// ✅ แก้ไขข้อความ/รายละเอียดของประกาศที่มีอยู่ (เฉพาะ admin - เช็คสิทธิ์ฝั่ง backend)
export const updateAnnouncement = async (id: number, payload: { content: string; detail?: string }) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/announcements/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response?.ok) {
      const err = await response?.json().catch(() => ({}));
      return { status: "error", error: err?.error || "แก้ไขไม่สำเร็จ" };
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

// ✅ ความเร็วตัวหนังสือไหล - เป็นค่ารวม (ทุกประกาศไหลรวมเป็นแถบเดียว จึงตั้งความเร็วแยกรายอันไม่ได้)
export const getAnnouncementSettings = async (): Promise<AnnouncementSettings> => {
  "use server";
  const response = await authorizedFetch(`${process.env.API_URL}/announcements/settings/`, {
    next: { revalidate: 0, tags: ["announcementSettings"] },
  });
  if (!response?.ok) return { speed_seconds: 40 };
  try {
    return await response.json();
  } catch {
    return { speed_seconds: 40 };
  }
};

export const updateAnnouncementSpeed = async (speedSeconds: number) => {
  "use server";
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/announcements/settings/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed_seconds: speedSeconds }),
    });
    if (!response?.ok) {
      const err = await response?.json().catch(() => ({}));
      return { status: "error", error: err?.error || "อัปเดตความเร็วไม่สำเร็จ" };
    }
    revalidatePath("/issues");
    revalidateTag("announcementSettings");
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
};