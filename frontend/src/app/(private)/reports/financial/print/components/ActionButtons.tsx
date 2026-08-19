"use client";

import PdfLoading from "@/components/pdf/PdfLoading";
import FinancialReportPDF from "@/components/pdf/FinancialReportPDF";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";

type FinancialData = {
  year: string | number;
  month: string;
  revenue: number;
  cost: number;
  additional_fees: number;
  gross_profit: number;
  net_profit: number;
  order_count: number;
};

type ModelData = {
  model_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  count: number;
};

type OverviewData = {
  total_revenue: number;
  total_cost: number;
  total_additional_fees: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  total_orders: number;
  average_profit_per_order: number;
};

interface ReportData {
  overview: OverviewData;
  monthlyData: FinancialData[];
  modelData: ModelData[];
  periodLabel: string;
}

interface ActionButtonsProps {
  data: ReportData;
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
      <Link href={`/reports`}>
        <Button variant={"outline"}>Return</Button>
      </Link>
      <PDFDownloadLink
        fileName={`รายงานการเงิน-${data.periodLabel.replace(/\s+/g, "-")}.pdf`}
        document={
          <FinancialReportPDF
            overview={data.overview}
            monthlyData={data.monthlyData}
            modelData={data.modelData}
            periodLabel={data.periodLabel}
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