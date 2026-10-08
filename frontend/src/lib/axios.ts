import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// ✅ แนบ token จาก session (เดิมอ่านจาก localStorage ซึ่งไม่มีที่ไหนเขียนไว้ + พิมพ์ token ออก console)
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  const token = session?.user?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ token ใช้ไม่ได้แล้ว → ไปหน้าล็อกอิน
let redirectingToLogin = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401 && !redirectingToLogin) {
      redirectingToLogin = true;
      const back = window.location.pathname + window.location.search;
      signOut({ callbackUrl: `/login?expired=1&callbackUrl=${encodeURIComponent(back)}` });
    }
    return Promise.reject(error);
  }
);

export default api;