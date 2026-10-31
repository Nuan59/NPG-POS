"use client";

import PdfLoading from "@/components/pdf/PdfLoading";
import TempReceiptTemplate, { TempReceiptItem } from "@/components/pdf/TempReceiptTemplate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

// ✅ สร้างครั้งเดียวนอก component (เดิมสร้างใหม่ทุก render ทำให้ปุ่มกระพริบ/โหลดซ้ำ)
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <PdfLoading />,
  }
);

interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  chassisNumber?: string;
  paymentMethodLabel?: string;
  items: TempReceiptItem[];
  total: number;
}

interface ActionButtonsProps {
  data: ReceiptData;
  backHref?: string;
}

const ActionButtons = ({ data, backHref = "/npg" }: ActionButtonsProps) => {
  return (
    <div className="flex flex-wrap justify-between gap-2 mt-3">
      <Link href={backHref}>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          กลับไปบัญชี
        </Button>
      </Link>
      <PDFDownloadLink
        fileName={`${data.receiptNumber}.pdf`}
        document={
          <TempReceiptTemplate
            receiptNumber={data.receiptNumber}
            date={data.date}
            customerName={data.customerName}
            customerAddress={data.customerAddress}
            customerPhone={data.customerPhone}
            chassisNumber={data.chassisNumber}
            paymentMethodLabel={data.paymentMethodLabel}
            items={data.items}
            total={data.total}
          />
        }
      >
        <Button className="gap-2 bg-[#F26B1D] hover:bg-[#d95c14] text-white">
          <Download size={16} />
          ดาวน์โหลด PDF
        </Button>
      </PDFDownloadLink>
    </div>
  );
};

export default ActionButtons;