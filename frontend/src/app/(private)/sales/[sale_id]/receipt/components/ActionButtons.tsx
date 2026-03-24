"use client";
import PdfLoading from "@/components/pdf/PdfLoading";
import SaleReceiptTemplate from "@/components/pdf/SaleReceiptTemplate";
import { Button } from "@/components/ui/button";
import { IOrder } from "@/types/Order";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

interface ActionButtonProps {
  order: IOrder;
}
const ActionButtons = ({ order }: ActionButtonProps) => {
  const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
      ssr: false,
      loading: () => <PdfLoading />,
    }
  );

  return (
    <div className="flex justify-between container mt-2">
      <Link href={`/sales/${order.id}`}>
        <Button variant={"outline"}>Return</Button>
      </Link>
      <PDFDownloadLink
        fileName={`PH${`${order.id}`.padStart(8, "0")}.pdf`}
        document={<SaleReceiptTemplate order={order} />}
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
