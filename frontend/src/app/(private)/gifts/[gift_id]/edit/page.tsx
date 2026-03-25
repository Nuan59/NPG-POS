export const dynamic = 'force-dynamic'

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import React from "react";
import EditGiftForm from "./components/EditGiftForm";
import { Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authorizedFetch } from "@/util/AuthorizedFetch";

interface PageProps {
  params: {
    gift_id: string;
  };
}

const EditGift = async ({ params }: PageProps) => {
  const giftId = parseInt(params.gift_id);
  
  if (isNaN(giftId)) {
    return (
      <div className="grid place-items-center h-full w-full">
        <div className="flex items-center justify-center flex-col gap-3">
          <Frown size={"6rem"} opacity={"60%"} />
          <h1>รหัสของแถมไม่ถูกต้อง</h1>
          <Link href={"/gifts"}>
            <Button>กลับ</Button>
          </Link>
        </div>
      </div>
    );
  }

  let gift = null;
  let errorMsg: string | null = null;

  try {
    const apiBase = process.env.API_URL || "http://localhost:8000";
    const res = await authorizedFetch(`${apiBase}/gifts/${giftId}/`, {
      cache: "no-store",
    });

    if (!res) {
      errorMsg = "ไม่ได้รับ response (อาจยังไม่ login หรือ session หลุด)";
    } else if (!res.ok) {
      const text = await res.text().catch(() => "");
      errorMsg = `โหลดข้อมูลไม่ได้ (${res.status}) ${text}`;
    } else {
      gift = await res.json();
    }
  } catch (e: any) {
    errorMsg = e?.message || "เกิดข้อผิดพลาดตอนโหลดข้อมูล";
    console.error("Error loading gift:", e);
  }

  if (errorMsg || !gift) {
    return (
      <div className="grid place-items-center h-full w-full">
        <div className="flex items-center justify-center flex-col gap-3">
          <Frown size={"6rem"} opacity={"60%"} />
          <h1>ไม่สามารถแสดงข้อมูลของแถม</h1>
          <pre className="text-sm text-muted-foreground max-w-md text-center">
            {errorMsg || "ไม่พบข้อมูล"}
          </pre>
          <Link href={"/gifts"}>
            <Button>กลับไปหน้าของแถม</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/gifts">ของแถม</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/gifts/${gift.id}`}>{gift.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>แก้ไข</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="py-2 grid grid-cols-2 place-content-start gap-x-5 h-full">
        <div className="col-span-2 max-h-[20%]">
          <h2 className="text-3xl font-semibold prompt">แก้ไขของแถม</h2>
        </div>

        <EditGiftForm gift={gift} />
      </div>
    </>
  );
};

export default EditGift;