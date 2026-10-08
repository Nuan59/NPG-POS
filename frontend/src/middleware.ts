import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// หน้าที่เข้าได้เฉพาะ adm
const ADMIN_ROUTES = ["/employees", "/reports"];

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

		if (ADMIN_ROUTES.some((route) => pathname.startsWith(route)) && token?.role !== "adm") {
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
 * ยกเว้น: หน้าล็อกอิน, API routes (เช็ค session เองข้างใน), ไฟล์ระบบของ Next และไฟล์รูป/ไอคอน
 */
export const config = {
	matcher: [
		"/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml)$).*)",
	],
};