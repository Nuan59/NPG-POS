import { Separator } from "@/components/ui/separator";
import React from "react";
import LatestSales from "./components/LatestSales";
import { getLatestOrders } from "@/services/OrderService";
import UserGreeting from "./components/UserGreeting";
import MenuItems from "./components/MenuItems";
import { Label } from "@/components/ui/label";

const Dashboard = async () => {
  const latestOrders = await getLatestOrders().then((res) => res?.json());

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <UserGreeting />
        <MenuItems />

        <Separator className="my-8" />

        <div className="pb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">การขายล่าสุด</h2>
          <LatestSales sales={latestOrders} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;