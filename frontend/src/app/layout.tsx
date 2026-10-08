import type { Metadata } from "next";
import "./globals.css";

import { Prompt } from "next/font/google";
// ✅ โหลดหลายน้ำหนัก (เดิมโหลดแค่ "100" บางที่สุด ตัวหนา/ตัวปกติเลยแสดงไม่ได้ → ตัวหนังสือจางทั้งเว็บ)
const prompt = Prompt({
	weight: ["100", "300", "400", "500", "600", "700"],
	subsets: ["latin", "thai"],
	display: "swap",
});
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/providers/AuthProvider";

export const metadata: Metadata = {
	title: "Caramelo POS",
	// ✅ ไอคอนแท็บ = โลโก้ร้าน (ไฟล์อยู่ใน public/) ตั้งชื่อใหม่กันเบราว์เซอร์/CDN จำไอคอนเก่า
	icons: {
		icon: "/favicon-npg.ico",
		shortcut: "/favicon-npg.ico",
		apple: "/favicon-npg.ico",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="th" className="text-white">
			<AuthProvider>
				<body className={prompt.className}>
					{children}
					{/* ✅ ย้าย Toaster เข้ามาใน body */}
					<Toaster />
				</body>
			</AuthProvider>
		</html>
	);
}