"use client";
// ActionButtons.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/TempReceipt/components/ActionButtons.tsx
import PdfLoading from "@/components/pdf/PdfLoading";
import TempReceiptTemplate from "@/components/pdf/TempReceiptTemplate";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";
import { TempReceiptData } from "./ViewTempReceipt";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <PdfLoading /> }
);

interface ActionButtonsProps {
  data: TempReceiptData;
}

const ActionButtons = ({ data }: ActionButtonsProps) => {
  return (
    <div className="flex justify-between container mt-2">
      {/* ✅ กลับไปหน้ารายละเอียดของรายการนี้ (เหมือน receipt ของ sales ที่กลับไป /sales/{id}) */}
      <Link href={`/service-history/${data.recordId}`}>
        <Button variant={"outline"}>Return</Button>
      </Link>
      <PDFDownloadLink
        fileName={`temp-receipt-${`${data.recordId}`.padStart(8, "0")}.pdf`}
        document={
          <TempReceiptTemplate
            receiptNumber={data.receiptNumber}
            date={data.date}
            customerName={data.customerName}
            customerAddress={data.customerAddress}
            customerPhone={data.customerPhone}
            paymentMethodLabel={data.paymentMethodLabel}
            items={data.items}
            total={data.total}
          />
        }
      >
        <Button className="flex justify-between gap-2">
          <Printer size={"1.2rem"} opacity={"60%"} />
          Print
        </Button>
      </PDFDownloadLink>
    </div>
  );
};

export default ActionButtons;