import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getGift } from "@/services/GiftService";
import { Gift } from "@/types/Gift";
import { Frown, Package, Pencil } from "lucide-react";
import Link from "next/link";
import React from "react";
import AddProducts from "./AddProducts";
import ChangePrice from "./ChangePrice";
import { getServerSession } from "next-auth";
import { authOptions } from "@/util/AuthOptions";

interface ViewGiftProps {
  params: { gift_id: string };
}

const ViewGift = async ({ params }: ViewGiftProps) => {
  const session = await getServerSession(authOptions);
  const roleCode = String((session as any)?.user?.role ?? "").toLowerCase();
  const isManager = roleCode === "adm";

  const gift = (await getGift(parseInt(params.gift_id)).then((res) => {
    if (!res?.ok) return null;
    return res.json();
  })) as Gift;

  if (!gift) {
    return (
      <div className="grid place-items-center h-full w-full">
        <div className="flex items-center justify-center flex-col gap-3">
          <Frown size={"6rem"} opacity={"60%"} />
          <h1>ไม่พบข้อมูล</h1>
          <Link href="/gifts"><Button>กลับ</Button></Link>
        </div>
      </div>
    );
  }

  const stockStatus = gift.stock <= 0 ? "หมด" : gift.stock <= 5 ? "ใกล้หมด" : "ปกติ";
  const stockColor = gift.stock <= 0 ? "destructive" : gift.stock <= 5 ? "outline" : "secondary";

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link href="/gifts">ของแถม</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{gift.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Separator className="my-2" />

      <div className="py-2 grid grid-cols-2 gap-x-5">
        {/* ซ้าย: ข้อมูล */}
        <div className="col-span-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Package size={28} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{gift.name}</h2>
              <Badge variant={stockColor as any} className="mt-1">
                stock {stockStatus}: {gift.stock}
              </Badge>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">ราคา</span>
              <span className="font-semibold">฿{Number(gift.price || 0).toLocaleString()}</span>
            </div>
            {isManager && (
              <div className="flex justify-between">
                <span className="text-slate-500">ราคาขายส่ง</span>
                <span className="font-semibold text-slate-600">฿{Number(gift.wholesale_price || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">คงเหลือ</span>
              <span className={`font-semibold ${gift.stock <= 5 ? "text-red-500" : "text-green-600"}`}>
                {gift.stock} ชิ้น
              </span>
            </div>
          </div>

          {isManager && (
            <Link href={`/gifts/${gift.id}/edit`}>
              <Button variant="outline" className="gap-2">
                <Pencil size={14} /> แก้ไขข้อมูล
              </Button>
            </Link>
          )}
        </div>

        {/* ขวา: actions */}
        <div className="flex flex-col gap-3">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-600">เพิ่ม Stock</h3>
            <AddProducts gift={gift} />
          </div>
          {isManager && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-600">เปลี่ยนราคา</h3>
              <ChangePrice gift={gift} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ViewGift;