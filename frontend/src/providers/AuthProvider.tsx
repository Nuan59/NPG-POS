"use client";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import React, { ReactNode, useEffect, useRef } from "react";

/**
 * เฝ้าดู session - ถ้าต่ออายุ token ไม่ได้ (refresh หมดอายุ/ถูกยกเลิก)
 * ให้ออกจากระบบแล้วไปหน้าล็อกอินพร้อมข้อความ "หมดเวลาการใช้งาน"
 * (แทนที่หน้าเว็บจะดูเหมือนล็อกอินอยู่ แต่ยิง API แล้วโดน 401 ทุกครั้ง)
 */
const SessionGuard = () => {
	const { data: session } = useSession();
	const signingOut = useRef(false);

	useEffect(() => {
		if (session?.error !== "RefreshAccessTokenError" || signingOut.current) return;
		signingOut.current = true;
		const back = window.location.pathname + window.location.search;
		signOut({ callbackUrl: `/login?expired=1&callbackUrl=${encodeURIComponent(back)}` });
	}, [session?.error]);

	// ✅ บัญชีผู้ตรวจสอบ (role = mon) → ป้ายเล็กมุมล่างซ้ายทุกหน้า ให้รู้ว่าดูได้อย่างเดียว
	if ((session?.user as any)?.role === "mon") {
		return (
			<div className="pointer-events-none fixed bottom-3 left-3 z-[60] rounded-full bg-[#1e2432]/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
				<span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#F26B1D] align-middle" />
				บัญชีดูอย่างเดียว · กดได้แค่รับเงิน / อนุมัติจ่าย
			</div>
		);
	}

	return null;
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
	return (
		// เช็ค session ทุก 5 นาที + ตอนกลับมาที่แท็บ → ต่ออายุ token ให้ทันก่อนหมด
		<SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
			<SessionGuard />
			{children}
		</SessionProvider>
	);
};

export default AuthProvider;