"use client";

import PdfLoading from "@/components/pdf/PdfLoading";
import PDPAConsentTemplate from "@/components/pdf/PDPAConsentTemplate";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

interface PDPAData {
  customerId: number;
  customerName: string;
  address: string;
  phone: string;
}

interface ActionButtonsProps {
  data: PDPAData;
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
      <Link href={`/customers/${data.customerId}`}>
        <Button variant={"outline"}>Return</Button>
      </Link>
      <PDFDownloadLink
        fileName={`pdpa-consent-${data.customerId}.pdf`}
        document={
          <PDPAConsentTemplate
            customerName={data.customerName}
            address={data.address}
            phone={data.phone}
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