import { getServerSession } from "next-auth";
import { authOptions } from "@/util/AuthOptions";

export async function getAuthHeaders() {
  const session = await getServerSession(authOptions);
  // ✅ token อยู่ที่ session.user.accessToken (เดิมอ่าน session.accessToken ซึ่งไม่มี → ส่งไปไม่มี token)
  const token = session?.user?.accessToken ?? session?.accessToken;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getBaseUrl() {
  // ตรวจสอบว่าอยู่ฝั่ง Server หรือ Client
  return typeof window === "undefined"
    ? process.env.API_URL
    : process.env.NEXT_PUBLIC_API_URL;
}