import type { Metadata } from "next";
import "./globals.css";

import { Prompt } from "next/font/google";
const prompt = Prompt({ weight: "100", subsets: ["latin", "thai"] });
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/providers/AuthProvider";

export const metadata: Metadata = {
	title: "Caramelo POS",
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