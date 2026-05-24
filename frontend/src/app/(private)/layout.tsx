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
		<>
			<OrderProvider>
				<div className={`min-h-screen bg-slate-200 ${prompt.className}`}>
					<Navbar />
					<main className="grid grid-cols-[3fr_1fr] text-slate-900 gap-0 mt-0">
						<section className="m-4 xl:m-8 bg-slate-50 font-bold p-4 xl:p-8 min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl">
							{children}
						</section>
						<aside className="sticky top-0 h-screen overflow-y-auto">
							<OrderCard />
						</aside>
					</main>
				</div>
			</OrderProvider>
		</>
	);
}