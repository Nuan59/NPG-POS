import { getSession, signOut } from "next-auth/react";
import { getServerSession } from "next-auth";
import { authOptions } from "./AuthOptions";

let redirectingToLogin = false;

/**
 * fetch ที่แนบ token ของ backend ให้อัตโนมัติ (ใช้ได้ทั้ง server และ client)
 * ✅ ฝั่งหน้าเว็บ: ถ้า backend ตอบ 401 (token ใช้ไม่ได้แล้ว) → พาไปหน้าล็อกอิน แทนที่หน้าจะพัง
 */
export const authorizedFetch = async (
	url: string,
	options: RequestInit = {}
): Promise<Response | null> => {
	const isServer = typeof window === "undefined";

	const session = isServer ? await getServerSession(authOptions) : await getSession();
	if (!session) return null;

	const backendToken = (session as any)?.user?.accessToken ?? null;

	const headers: HeadersInit = {
		...(options.headers || {}),
		...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
	};

	const res = await fetch(url, { ...options, headers });

	if (!isServer && res.status === 401 && !redirectingToLogin) {
		redirectingToLogin = true;
		const back = window.location.pathname + window.location.search;
		signOut({ callbackUrl: `/login?expired=1&callbackUrl=${encodeURIComponent(back)}` });
	}

	return res;
};