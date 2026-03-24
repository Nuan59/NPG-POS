import Link from "next/link";
import {
  Package,
  Sparkles,
  Recycle,
  Plus,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getBikes } from "@/services/InventoryService";

export default async function InventoryDashboard() {
  // ✅ เรียก getBikes จาก Server Component
  const response = await getBikes();
  const bikes = await response?.json() || [];

  // กรองเฉพาะรถที่ยังไม่ขาย
  const availableBikes = Array.isArray(bikes) 
    ? bikes.filter((bike: any) => !bike.sold) 
    : [];

  // นับรถใหม่
  const newCount = availableBikes.filter(
    (bike: any) => bike.category === "new"
  ).length;

  // นับรถมือสอง
  const usedCount = availableBikes.filter(
    (bike: any) => bike.category === "pre_owned" || bike.category === "used"
  ).length;

  const count = {
    all: availableBikes.length,
    new: newCount,
    used: usedCount,
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">สินค้าทั้งหมด</h1>
              <p className="text-lg opacity-90">
                จัดการและดูรายการสินค้าในระบบ
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                asChild 
                className="bg-white text-orange-600 hover:bg-gray-100 font-bold shadow-lg"
              >
                <Link href="/inventory/add">
                  <Plus className="mr-2 h-5 w-5" />
                  เพิ่มสินค้า
                </Link>
              </Button>

              <Button 
                asChild 
                variant="outline" 
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm font-bold"
              >
                <Link href="/inventory/import">
                  <Download className="mr-2 h-5 w-5" />
                  นำเข้าข้อมูล
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard
            href="/inventory/all"
            title="ทั้งหมด"
            description="รวมสินค้ามือหนึ่งและมือสองทั้งหมด"
            count={count.all}
            icon={Package}
            gradient="from-emerald-400 to-emerald-600"
            hoverGradient="hover:from-emerald-500 hover:to-emerald-700"
          />

          <DashboardCard
            href="/inventory/newcar"
            title="รถใหม่"
            description="แสดงเฉพาะสินค้าใหม่"
            count={count.new}
            icon={Sparkles}
            gradient="from-blue-400 to-blue-600"
            hoverGradient="hover:from-blue-500 hover:to-blue-700"
          />

          <DashboardCard
            href="/inventory/pre_owned"
            title="มือสอง"
            description="แสดงเฉพาะสินค้ามือสอง"
            count={count.used}
            icon={Recycle}
            gradient="from-purple-400 to-purple-600"
            hoverGradient="hover:from-purple-500 hover:to-purple-700"
          />
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  title,
  description,
  count,
  icon: Icon,
  gradient,
  hoverGradient,
}: {
  href: string;
  title: string;
  description: string;
  count: number;
  icon: any;
  gradient: string;
  hoverGradient: string;
}) {
  return (
    <a href={href} className="block">
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer h-48",
          `bg-gradient-to-br ${gradient} ${hoverGradient}`
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white rounded-full"></div>
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Icon size={32} strokeWidth={2.5} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-1">{title}</h2>
            <p className="text-sm text-white/90 mb-3">{description}</p>
            <div className="text-4xl font-black">{count} คัน</div>
          </div>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
      </div>
    </a>
  );
}