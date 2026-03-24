"use client";
import React from "react";
import { IBike } from "@/types/Bike";
import { IStorage } from "@/types/Storage";
import TransferReceiptTemplate from "@/components/pdf/TransferReceiptTemplate";
import dynamic from "next/dynamic";
import PdfLoading from "@/components/pdf/PdfLoading";

interface TransferHistoryItem {
  id: number;
  transfer_date: Date | string;
  bikes: IBike[];
  origin: IStorage;
  destination: IStorage;
}

interface ViewReceiptProps {
  item: TransferHistoryItem;
}

const ViewReceipt = ({ item }: ViewReceiptProps) => {
  const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
      ssr: false,
      loading: () => <PdfLoading />,
    }
  );

  return (
    <PDFViewer className="h-full w-full">
      <TransferReceiptTemplate item={item} />
    </PDFViewer>
  );
};

export default ViewReceipt;
