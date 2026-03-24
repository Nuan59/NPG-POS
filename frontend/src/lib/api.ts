import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getAuthHeaders() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken;
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export function getBaseUrl() {
  // ตรวจสอบว่าอยู่ฝั่ง Server หรือ Client
  return typeof window === "undefined" 
    ? process.env.API_URL 
    : process.env.NEXT_PUBLIC_API_URL;
}