import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// หน้าที่เข้าได้เฉพาะ adm (และผู้ตรวจสอบ)
const ADMIN_ROUTES = ["/employees", "/reports"];
// ✅ ผู้ตรวจสอบ (role = mon) เข้าได้แค่หน้าเหล่านี้ (ดูภาพรวม ไม่ดูรายการขาย/สินค้า)
const MONITOR_PATHS = ["/dashboard", "/employees", "/cashflow", "/reports", "/tasks"];

export default withAuth(
	function middleware(req) {
		const { pathname, search } = req.nextUrl;
		const token = req.nextauth.token;

		// ต่ออายุ token ไม่ได้แล้ว → ไปล็อกอินใหม่ (กลับมาหน้าเดิมหลังล็อกอิน)
		if (token?.error === "RefreshAccessTokenError") {
			const url = new URL("/login", req.url);
			url.searchParams.set("expired", "1");
			url.searchParams.set("callbackUrl", pathname + search);
			return NextResponse.redirect(url);
		}

		if (
			token?.role === "mon" &&
			pathname !== "/" &&
			!MONITOR_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
		) {
			return NextResponse.redirect(new URL("/dashboard?unauthorized", req.url));
		}

		// ✅ ผู้ตรวจสอบ (mon) เข้าหน้าพนักงาน/รายงานได้ (การกันแก้ไขอยู่ที่ backend)
		if (ADMIN_ROUTES.some((route) => pathname.startsWith(route)) && token?.role !== "adm" && token?.role !== "mon") {
			return NextResponse.redirect(new URL("/dashboard?unauthorized", req.url));
		}

		return NextResponse.next();
	},
	{
		callbacks: {
			// ไม่มี session → next-auth พาไป /login?callbackUrl=... ให้เอง
			authorized: ({ token }) => !!token,
		},
	}
);

/**
 * ✅ กันทุกหน้า (เดิมกันแค่ 7 หน้า - /npg /cashflow /tasks /registration ฯลฯ เข้าได้โดยไม่ล็อกอิน)
 * ยกเว้น: หน้าล็อกอิน, API routes (เช็ค session เองข้างใน), ไฟล์ระบบของ Next
 * และไฟล์ทุกชนิดที่มีนามสกุล (รูป ฟอนต์ pdf ฯลฯ ในโฟลเดอร์ public) - กันไฟล์พวกนี้ถูกบังคับล็อกอิน
 */
export const config = {
	matcher: [
		"/((?!login|api|_next|.*\\.).*)",
	],
};