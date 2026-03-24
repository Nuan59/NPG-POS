"use client";

import PdfLoading from "@/components/pdf/PdfLoading";
import PdiTemplate from "@/components/pdf/PdiTemplate";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

interface ActionButtonsProps {
  data: {
    saleId: number;
    customerName: string;
    chassisNumber: string;
    engineNumber: string;
    model: string;
    color: string;
  };
}

const ActionButtons = ({ data }: ActionButtonsProps) => {
  const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
      ssr: false,
      loading: () => <PdfLoading />,
    }
  );

  return (
    <div className="flex justify-between container mt-2">
      <Link href={`/sales/${data.saleId}`}>
        <Button variant={"outline"}>Return</Button>
      </Link>
      <PDFDownloadLink
        fileName={`PDI-${`${data.saleId}`.padStart(8, "0")}.pdf`}
        document={
          <PdiTemplate
            customerName={data.customerName}
            chassisNumber={data.chassisNumber}
            engineNumber={data.engineNumber}
            model={data.model}
            color={data.color}
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