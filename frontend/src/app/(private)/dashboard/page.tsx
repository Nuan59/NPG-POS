import React from "react";
import LatestSales from "./components/LatestSales";
import { getLatestOrders } from "@/services/OrderService";
import UserGreeting from "./components/UserGreeting";
import MenuItems from "./components/MenuItems";
import CashflowTodayCard from "@/components/global/CashflowTodayCard";

const SectionTitle = ({ title, href }: { title: string; href?: string }) => (
  <div className="flex items-center gap-2.5 mt-7 mb-3">
    <span className="w-1 h-[18px] bg-orange-500 rounded-sm -skew-x-12" />
    <h2 className="text-[17px] font-semibold text-gray-800">{title}</h2>
    {href && (
      <a href={href} className="ml-auto text-sm text-orange-600 hover:underline">
        ดูทั้งหมด →
      </a>
    )}
  </div>
);

const Dashboard = async () => {
  let latestOrders: any = [];
  try {
    latestOrders = await getLatestOrders().then((res) => res?.json());
  } catch {
    latestOrders = [];
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <UserGreeting />

        <div className="mt-4">
          <CashflowTodayCard />
        </div>

        <SectionTitle title="เมนู" />
        <MenuItems />

        <SectionTitle title="การขายล่าสุด" href="/sales" />
        <div className="pb-8">
          <LatestSales sales={Array.isArray(latestOrders) ? latestOrders : []} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;