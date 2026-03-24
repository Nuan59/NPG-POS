"use client";

import PdfLoading from "@/components/pdf/PdfLoading";
import DeliveryNoteTemplate from "@/components/pdf/DeliveryNoteTemplate";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

interface Vehicle {
  brand: string;
  model_name: string;
  model_code: string;
  engine: string;
  chassi: string;
  color: string;
}

interface DeliveryData {
  saleId: number;
  customerName: string;
  address: string;
  phone: string;
  date: string;
  vehicles: Vehicle[];
}

interface ActionButtonsProps {
  data: DeliveryData;
}

const ActionButtons = ({ data }: ActionButtonsProps) => {
  const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
      ssr: false,
      loading: () => <PdfLoading />,
    }
  );

  // แปลง format vehicles สำหรับ Template
  const vehicles = data.vehicles.map(v => ({
    brand: v.brand || "",
    model: v.model_name || "",
    modelCode: v.model_code || "",
    engineNo: v.engine || "",
    frameNo: v.chassi || "",
    color: v.color || "",
  }));

  return (
    <div className="flex justify-between container mt-2">
      <Link href={`/sales/${data.saleId}`}>
        <Button variant={"outline"}>Return</Button>
      </Link>
      <PDFDownloadLink
        fileName={`delivery-note-${`${data.saleId}`.padStart(8, "0")}.pdf`}
        document={
          <DeliveryNoteTemplate
            customerName={data.customerName}
            address={data.address}
            phone={data.phone}
            date={data.date}
            vehicles={vehicles}
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