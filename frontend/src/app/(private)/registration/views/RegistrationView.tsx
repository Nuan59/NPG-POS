"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FileText, FileCheck, FilePen, CheckCircle,
  AlertCircle, ArrowLeft, Search, X,
  ChevronsUpDown, Check, Calendar, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  getRegistrationList, updateDocStatus,
  DOC_STATUS_LABEL, DOC_STATUS_COLOR,
  RegistrationItem, DocStatus,
} from "@/services/Registrationservice";
import StatusDialog from "./StatusHistoryDialog";
import RecentActivityFeed from "./RecentActivityFeed";

const STATUS_CARDS = [
  { key: "all",       label: "ทั้งหมด",          description: "รายการทะเบียนทั้งหมด",      icon: FileText,    bg: "bg-slate-50 hover:bg-slate-100 border-slate-300",    iconColor: "text-slate-600",  countColor: "text-slate-900"  },
  { key: "pending",   label: "รอเอกสาร",          description: "รายการที่รอรับเอกสาร",      icon: FileText,    bg: "bg-gray-50 hover:bg-gray-100 border-gray-300",       iconColor: "text-gray-600",   countColor: "text-gray-900"   },
  { key: "received",  label: "รับเอกสารแล้ว",      description: "รับเอกสารแล้ว",             icon: FileCheck,   bg: "bg-blue-50 hover:bg-blue-100 border-blue-300",       iconColor: "text-blue-600",   countColor: "text-blue-900"   },
  { key: "fixing",    label: "แก้เอกสาร",          description: "กำลังแก้เอกสาร",            icon: FilePen,     bg: "bg-yellow-50 hover:bg-yellow-100 border-yellow-300", iconColor: "text-yellow-600", countColor: "text-yellow-900" },
  { key: "completed", label: "ลูกค้ารับเล่มแล้ว",  description: "เสร็จสมบูรณ์",              icon: CheckCircle, bg: "bg-green-50 hover:bg-green-100 border-green-300",    iconColor: "text-green-600",  countColor: "text-green-900"  },
  { key: "overdue",   label: "เกิน 45 วัน",        description: "ยังไม่เสร็จและเกิน 45 วัน", icon: AlertCircle, bg: "bg-red-50 hover:bg-red-100 border-red-300",          iconColor: "text-red-600",    countColor: "text-red-900"    },
];

const ROW_STATUS_COLOR: Record<DocStatus, string> = {
  pending:   "border-l-4 border-l-gray-400",
  received:  "border-l-4 border-l-blue-400",
  fixing:    "border-l-4 border-l-yellow-400",
  completed: "border-l-4 border-l-green-400",
};

function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap", DOC_STATUS_COLOR[status])}>
      {DOC_STATUS_LABEL[status]}
    </span>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  const currentLabel = options.find((o) => o.value === value)?.label ?? "ทั้งหมด";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-white text-sm h-9 font-medium">
            <span className="truncate">{currentLabel}</span>
            <ChevronsUpDown className="ml-2 h-3 w-3 opacity-60 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput placeholder="ค้นหา..." />
            <CommandList>
              <CommandEmpty>ไม่พบตัวเลือก</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt.value} value={opt.label} onSelect={() => onChange(opt.value)} className="flex justify-between text-sm font-medium">
                    {opt.label}
                    {value === opt.value && <Check className="h-3 w-3" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function RegistrationView() {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken ?? "";

  const [allItems, setAllItems]             = useState<RegistrationItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm]         = useState("");
  const [sellerFilter, setSellerFilter]     = useState("__ALL__");
  const [paymentFilter, setPaymentFilter]   = useState("__ALL__");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");
  const [historyItem, setHistoryItem]       = useState<RegistrationItem | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getRegistrationList(token, "all");
        setAllItems(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const countByStatus = (key: string) => {
    if (key === "all") return allItems.length;
    if (key === "overdue") return allItems.filter((i) => i.is_overdue && i.doc_status !== "completed").length;
    return allItems.filter((i) => i.doc_status === key).length;
  };

  const sellerOptions  = [{ value: "__ALL__", label: "ทั้งหมด" }, ...Array.from(new Set(allItems.map((i) => i.seller_name))).filter(Boolean).map((s) => ({ value: s, label: s }))];
  const paymentOptions = [{ value: "__ALL__", label: "ทั้งหมด" }, ...Array.from(new Set(allItems.map((i) => i.payment_method))).filter(Boolean).map((p) => ({ value: p, label: p }))];

  const filteredItems = allItems.filter((item) => {
    if (selectedStatus && selectedStatus !== "all") {
      if (selectedStatus === "overdue") { if (!(item.is_overdue && item.doc_status !== "completed")) return false; }
      else { if (item.doc_status !== selectedStatus) return false; }
    }
    if (sellerFilter  !== "__ALL__" && item.seller_name    !== sellerFilter)  return false;
    if (paymentFilter !== "__ALL__" && item.payment_method !== paymentFilter) return false;
    if (dateFrom && item.sale_date && new Date(item.sale_date) < new Date(dateFrom)) return false;
    if (dateTo   && item.sale_date && new Date(item.sale_date) > new Date(dateTo + "T23:59:59")) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = item.customer_name?.toLowerCase().includes(q)
        || item.customer_phone?.toLowerCase().includes(q)
        || item.bikes.some((b) => b.model_name?.toLowerCase().includes(q) || b.registration_plate?.toLowerCase().includes(q) || b.chassis?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleDialogUpdated = (id: number, newStatus: DocStatus, newNotes: string) => {
    setAllItems((prev) => prev.map((i) => i.id === id ? { ...i, doc_status: newStatus, notes: newNotes } : i));
    setHistoryItem((prev) => prev ? { ...prev, doc_status: newStatus, notes: newNotes } : null);
  };

  const clearFilters = () => { setSearchTerm(""); setSellerFilter("__ALL__"); setPaymentFilter("__ALL__"); setDateFrom(""); setDateTo(""); };
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-";

  // ── DASHBOARD ──
  if (selectedStatus === null) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ทะเบียน</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">เลือกสถานะที่ต้องการดู</p>
        </div>
        {loading ? (
          <div className="text-center py-16 text-gray-500 font-medium">กำลังโหลด...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {STATUS_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button key={card.key} onClick={() => setSelectedStatus(card.key)}
                    className={cn("text-left p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-[2px] cursor-pointer", card.bg)}>
                    <Icon className={cn("h-7 w-7 mb-3", card.iconColor)} />
                    <h3 className={cn("text-base font-bold", card.iconColor)}>{card.label}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-1">{card.description}</p>
                    <p className={cn("text-4xl font-bold mt-3", card.countColor)}>{countByStatus(card.key)}</p>
                  </button>
                );
              })}
            </div>

            {/* ✅ Activity Feed จาก DB */}
            <RecentActivityFeed
              token={token}
              onViewAll={() => setSelectedStatus("all")}
              onOrderClick={(orderId) => {
                const item = allItems.find((i) => i.id === orderId);
                if (item) setHistoryItem(item);
              }}
            />
          </>
        )}
        {historyItem && (
          <StatusDialog item={historyItem} token={token} onClose={() => setHistoryItem(null)} onUpdated={handleDialogUpdated} />
        )}
      </div>
    );
  }

  // ── TABLE VIEW ──
  const currentCard = STATUS_CARDS.find((c) => c.key === selectedStatus);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedStatus(null); clearFilters(); }}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{currentCard?.label}</h2>
            <p className="text-sm font-medium text-gray-500">รวมทั้งหมด: {filteredItems.length} รายการ</p>
          </div>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input placeholder="ค้นหาชื่อ, เบอร์, ทะเบียน, ตัวถัง..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white font-medium text-gray-800 placeholder:text-gray-400" />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-5 gap-3 bg-gray-50 p-3 rounded-lg border">
        <FilterSelect label="พนักงานขาย"  value={sellerFilter}  onChange={setSellerFilter}  options={sellerOptions} />
        <FilterSelect label="วิธีชำระเงิน" value={paymentFilter} onChange={setPaymentFilter} options={paymentOptions} />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">วันที่ขาย (ตั้งแต่)</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="pl-8 h-9 bg-white text-sm font-medium text-gray-800" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700">วันที่ขาย (ถึง)</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="pl-8 h-9 bg-white text-sm font-medium text-gray-800" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-700 invisible">ล้าง</span>
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1 h-9 font-semibold">
            <X className="h-3 w-3" /> ล้างตัวกรอง
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-medium">กำลังโหลด...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500 font-medium">ไม่พบรายการ</div>
      ) : (
        <div className="overflow-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-gray-700">ลูกค้า</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">รุ่นรถ</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">เลขตัวถัง</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">ทะเบียน</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">วันที่ขาย</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">ผ่านมา</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700">พนักงาน</th>
                {/* ✅ สถานะ — แสดงอย่างเดียว ไม่แก้ไขได้ */}
                <th className="text-left px-4 py-3 font-bold text-gray-700">สถานะ</th>
                {/* ✅ คอลัมน์สุดท้าย เปิด dialog เหมือนเดิม แต่เปลี่ยนชื่อ */}
                <th className="text-left px-4 py-3 font-bold text-gray-700">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className={cn(
                  "hover:bg-gray-50 transition-colors",
                  ROW_STATUS_COLOR[item.doc_status],
                  item.is_overdue && item.doc_status !== "completed" && "bg-red-50 hover:bg-red-100"
                )}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{item.customer_name}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{item.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    {item.bikes.map((bike) => (
                      <div key={bike.id}>
                        <p className="font-bold text-gray-900">{bike.model_name}</p>
                        <p className="text-xs font-medium text-gray-500">{bike.model_code} · {bike.color}</p>
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {item.bikes.map((bike) => (
                      <p key={bike.id} className="font-mono text-xs font-semibold text-gray-700">{bike.chassis || "-"}</p>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {item.bikes.map((bike) => (
                      <p key={bike.id} className="font-bold text-gray-800">{bike.registration_plate || "-"}</p>
                    ))}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{formatDate(item.sale_date)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-bold text-sm", item.is_overdue && item.doc_status !== "completed" ? "text-red-600" : "text-gray-700")}>
                      {item.days_passed ?? "-"} วัน
                      {item.is_overdue && item.doc_status !== "completed" && " ⚠️"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{item.seller_name}</td>

                  {/* ✅ สถานะ — read-only badge เท่านั้น */}
                  <td className="px-4 py-3">
                    <StatusBadge status={item.doc_status} />
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate max-w-[130px]">{item.notes}</p>
                    )}
                  </td>

                  {/* ✅ ปุ่มจัดการ — เปิด StatusDialog (เปลี่ยนสถานะ + ดูประวัติ) */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setHistoryItem(item)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      จัดการ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyItem && (
        <StatusDialog item={historyItem} token={token} onClose={() => setHistoryItem(null)} onUpdated={handleDialogUpdated} />
      )}
    </div>
  );
}