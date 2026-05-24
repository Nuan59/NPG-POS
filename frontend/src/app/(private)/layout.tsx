import React from "react";
import { Navbar } from "@/components/global/Navbar";
import { Prompt } from "next/font/google";
import OrderCard from "@/components/global/OrderCard";
import OrderProvider from "@/context/OrderContext";
const prompt = Prompt({ weight: "100", subsets: ["latin", "thai"] });

export default function PrivateLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<OrderProvider>
			<div className={`min-h-screen bg-slate-200 ${prompt.className}`}>
				<Navbar />
				<main className="flex flex-col lg:grid lg:grid-cols-[3fr_1fr] text-slate-900 gap-0 mt-0">
					<section className="m-3 lg:m-8 bg-slate-50 font-bold p-3 lg:p-8 min-h-[calc(100vh-80px)] lg:max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl">
						{children}
					</section>
					{/* OrderCard: ซ่อนบนมือถือ แสดงบน desktop */}
					<aside className="hidden lg:block sticky top-0 h-screen overflow-y-auto">
						<OrderCard />
					</aside>
				</main>
			</div>
		</OrderProvider>
	);
}