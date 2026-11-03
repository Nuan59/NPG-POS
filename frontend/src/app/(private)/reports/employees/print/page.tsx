// page.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/employees/print/page.tsx
// ✅ หน้าพิมพ์รายงานพนักงาน - /reports/employees/print?start=YYYY-MM-DD&end=YYYY-MM-DD[&employee=<user_id>]
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { pdf } from "@react-pdf/renderer";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import EmployeeReportPDF from "@/components/pdf/EmployeeReportPDF";
import { fetchEmployeeReport, periodLabel } from "../../util/employeeTypes";

interface Props {
  searchParams: { start?: string; end?: string; employee?: string };
}

export default function EmployeeReportPrintPage({ searchParams }: Props) {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const start = searchParams.start || "";
  const end = searchParams.end || "";
  const employee = searchParams.employee;
  const label = start && end ? periodLabel(start, end) : "";

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !start || !end) return;
    let alive = true;
    let url: string | null = null;
    (async () => {
      try {
        const data = await fetchEmployeeReport(token, start, end);
        const rows = employee ? data.employees.filter((e) => String(e.user_id) === employee) : data.employees;
        const blob = await pdf(<EmployeeReportPDF employees={rows} label={label} />).toBlob();
        if (blob.size === 0) throw new Error("PDF ว่างเปล่า (0 bytes)");
        url = URL.createObjectURL(blob);
        if (alive) setPdfUrl(url);
      } catch (e: any) {
        console.error("[PDF] ❌", e);
        if (alive) setError(e?.message || "สร้างรายงานไม่สำเร็จ");
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, start, end, employee, label]);

  return (
    <>
      <div className="text-sm text-gray-600">
        <Link href="/reports" className="hover:underline">
          รายงาน
        </Link>{" "}
        / พิมพ์รายงานพนักงาน - {label || "ไม่ได้ระบุช่วงวันที่"}
      </div>
      <Separator className="my-2" />

      <div className="h-[90%]">
        {!start || !end ? (
          <div className="p-8 text-center text-gray-500">ไม่ได้ระบุช่วงวันที่ กรุณากดพิมพ์จากหน้ารายงาน</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : !pdfUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-600 mb-4" />
              <p className="text-gray-600">กำลังสร้างรายงาน...</p>
            </div>
          </div>
        ) : (
          <iframe src={pdfUrl} className="w-full h-full border-0" title="Employee Report Viewer" />
        )}
      </div>

      <div className="flex justify-between container mt-2">
        <Link href="/reports">
          <Button variant="outline">Return</Button>
        </Link>
        {pdfUrl && (
          <a href={pdfUrl} download={`รายงานพนักงาน-${label.replace(/\s+/g, "-")}.pdf`}>
            <Button className="flex justify-between gap-2">
              <Printer size="1.2rem" opacity="60%" />
              Print
            </Button>
          </a>
        )}
      </div>
    </>
  );
}