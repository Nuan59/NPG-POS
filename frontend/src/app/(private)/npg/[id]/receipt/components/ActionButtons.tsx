"use client";

import PdfLoading from "@/components/pdf/PdfLoading";
import TempReceiptTemplate, { TempReceiptItem } from "@/components/pdf/TempReceiptTemplate";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  items: TempReceiptItem[];
  total: number;
}

interface ActionButtonsProps {
  data: ReceiptData;
  backHref?: string;
}

const ActionButtons = ({ data, backHref = "/npg" }: ActionButtonsProps) => {
  const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
      ssr: false,
      loading: () => <PdfLoading />,
    }
  );

  return (
    <div className="flex justify-between container mt-2">
      <Link href={backHref}>
        <Button variant={"outline"}>Return</Button>
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