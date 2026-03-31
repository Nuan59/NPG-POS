import { getSession } from "next-auth/react";
import { getServerSession } from "next-auth";
import { authOptions } from "./AuthOptions";

export const authorizedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response | null> => {
  let backendToken: string | null = null;

  // ตรวจสอบว่าอยู่ใน Server หรือ Client
  const isServer = typeof window === "undefined";

  if (isServer) {
    // Server-side: ใช้ getServerSession
    const session = await getServerSession(authOptions);
    if (!session) return null;
    backendToken = (session as any)?.user?.accessToken ?? null;
  } else {
    // Client-side: ใช้ getSession
    const session = await getSession();
    if (!session) return null;
    backendToken = (session as any)?.user?.accessToken ?? null;
  }

  const headers: HeadersInit = {
    ...(options.headers || {}),
    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res;
};
