"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Truck, ClipboardCheck, Printer, ArrowLeft } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import SaleReceiptTemplate from "@/components/pdf/SaleReceiptTemplate";
import DeliveryNoteTemplate from "@/components/pdf/DeliveryNoteTemplate";
import PdiTemplate from "@/components/pdf/PdiTemplate";
import { IOrder } from "@/types/Order";

interface DocumentSelectionProps {
  order: IOrder;
}

export default function DocumentSelection({ order }: DocumentSelectionProps) {
  const router = useRouter();
  const [printing, setPrinting] = useState<string | null>(null);

  const handlePrintReceipt = async () => {
    setPrinting("receipt");
    try {
      console.log("[Receipt] Creating PDF...");
      const blob = await pdf(
        <SaleReceiptTemplate order={order} />
      ).toBlob();
      
      console.log(`[Receipt] Blob created (${blob.size} bytes)`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("เกิดข้อผิดพลาดในการสร้างใบเสร็จ");
    } finally {
      setPrinting(null);
    }
  };

  const handlePrintDeliveryNote = async () => {
    setPrinting("delivery");
    try {
      console.log("[Delivery] Creating PDF...");
      const bike = order.bikes?.[0];
      
      // ดึงข้อมูลลูกค้า
      const customerName = (order as any).customer || "ไม่ระบุชื่อ";
      const customerPhone = (order as any).customer_phone || "";
      
      // สร้างที่อยู่แบบเดียวกับ DeliveryNotePage
      let customerAddress = (order as any).customer_address || '';
      const subdistrict = (order as any).customer_subdistrict;
      const district = (order as any).customer_district;
      const province = (order as any).customer_province;
      const postalCode = (order as any).customer_postal_code;
      
      if (customerAddress && subdistrict) {
        customerAddress += ` ต.${subdistrict}`;
      } else if (subdistrict) {
        customerAddress = `ต.${subdistrict}`;
      }
      
      if (district) customerAddress += ` อ.${district}`;
      if (province) customerAddress += ` จ.${province}`;
      if (postalCode) customerAddress += ` ${postalCode}`;
      
      customerAddress = customerAddress.trim() || "ไม่ระบุที่อยู่";
      
      // ✅ แปลงข้อมูลรถให้ตรงกับ DeliveryNoteTemplate
      const vehicles = (order.bikes || []).map((v: any) => ({
        brand: v.brand || "",
        model: v.model_name || "",
        modelCode: v.model_code || "",
        engineNo: v.engine || "",
        frameNo: v.s || "",
        color: v.color || "",
      }));
      
      console.log("[Delivery] Vehicles data:", vehicles);
      
      const blob = await pdf(
        <DeliveryNoteTemplate
          customerName={customerName}
          address={customerAddress}
          phone={customerPhone}
          date={new Date().toLocaleDateString("th-TH")}
          vehicles={vehicles}
        />
      ).toBlob();
      
      console.log(`[Delivery] Blob created (${blob.size} bytes)`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error("Error printing delivery note:", error);
      alert("เกิดข้อผิดพลาดในการสร้างใบส่งมอบ");
    } finally {
      setPrinting(null);
    }
  };

  const handlePrintPDI = async () => {
    setPrinting("pdi");
    try {
      console.log("[PDI] Creating PDF...");
      const bike = order.bikes?.[0];
      const customerName = (order as any).customer || "ไม่ระบุชื่อ";
      
      const blob = await pdf(
        <PdiTemplate
          customerName={customerName}
          chassisNumber={bike?.chassis || ""}
          engineNumber={bike?.engine || ""}
          model={bike?.model_name || ""}
          color={bike?.color || ""}
        />
      ).toBlob();
      
      console.log(`[PDI] Blob created (${blob.size} bytes)`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error("Error printing PDI:", error);
      alert("เกิดข้อผิดพลาดในการสร้างใบ PDI");
    } finally {
      setPrinting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            ชำระเงินสำเร็จ!
          </h1>
          <p className="text-gray-600 text-lg">เลือกเอกสารที่ต้องการพิมพ์</p>
        </div>

        {/* Document Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* ใบเสร็จรับเงิน */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <FileText className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-2 text-gray-800">
                ใบเสร็จรับเงิน
              </h3>
              <p className="text-gray-500 text-center text-sm mb-6">
                Receipt
              </p>
              <button
                onClick={handlePrintReceipt}
                disabled={printing !== null}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-400 shadow-md hover:shadow-lg"
              >
                <Printer className="w-6 h-6" />
                {printing === "receipt" ? "กำลังสร้าง..." : "พิมพ์"}
              </button>
            </div>
          </div>

          {/* ใบส่งมอบสินค้า */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Truck className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-2 text-gray-800">
                ใบส่งมอบสินค้า
              </h3>
              <p className="text-gray-500 text-center text-sm mb-6">
                Delivery Note
              </p>
              <button
                onClick={handlePrintDeliveryNote}
                disabled={printing !== null}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-400 shadow-md hover:shadow-lg"
              >
                <Printer className="w-6 h-6" />
                {printing === "delivery" ? "กำลังสร้าง..." : "พิมพ์"}
              </button>
            </div>
          </div>

          {/* ใบ PDI */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <ClipboardCheck className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center mb-2 text-gray-800">
                ใบ PDI Checklist
              </h3>
              <p className="text-gray-500 text-center text-sm mb-6">
                Pre-Delivery Inspection
              </p>
              <button
                onClick={handlePrintPDI}
                disabled={printing !== null}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-400 shadow-md hover:shadow-lg"
              >
                <Printer className="w-6 h-6" />
                {printing === "pdi" ? "กำลังสร้าง..." : "พิมพ์"}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push("/sales")}
            className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            กลับหน้ารายการขาย
          </button>
          <button
            onClick={() => router.push(`/sales/${order.id}`)}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            ดูรายละเอียดคำสั่งซื้อ
          </button>
        </div>
      </div>
    </div>
  );
}