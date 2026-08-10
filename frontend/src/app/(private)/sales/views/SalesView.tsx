"use client";

import React, { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

import SearchBar from "@/components/global/SearchBar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";
import { IOrder } from "@/types/Order";
import { OrderColumns } from "../components/OrderColumns";
import { getFilteredOrders } from "@/services/OrderService";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { DateRangePicker } from "@/components/global/DateRangePicker";
import { DateRange } from "react-day-picker";

interface OrdersViewProps {
  orders: IOrder[];
}

type Option = { value: string; label: string };

function buildOptions(
  values: Array<string | null | undefined>,
  allLabel = "ทั้งหมด"
): Option[] {
  const uniq = Array.from(
    new Set(
      values
        .map((v) => (v ? String(v).trim() : ""))
        .filter((v) => v.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "th"));

  return [
    { value: "__ALL__", label: allLabel },
    ...uniq.map((v) => ({ value: v, label: v })),
  ];
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
}) {
  const currentLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
          >
            <span
              className={cn(
                "truncate",
                value === "__ALL__" ? "text-muted-foreground" : ""
              )}
            >
              {currentLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="พิมพ์เพื่อค้นหา..." />
            <CommandList>
              <CommandEmpty>ไม่พบตัวเลือก</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => onChange(opt.value)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && (
                      <Check className="h-4 w-4 opacity-70" />
                    )}
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

const OrdersView = ({ orders }: OrdersViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [ordersDisplay, setOrdersDisplay] = useState<IOrder[]>(orders);

  const [customerFilter, setCustomerFilter] = useState<string>("__ALL__");
  const [modelFilter, setModelFilter] = useState<string>("__ALL__");
  const [paymentFilter, setPaymentFilter] = useState<string>("__ALL__");
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);

  // ===== options =====
  const customerOptions = useMemo(
    () =>
      buildOptions(
        orders.map((o) => o.customer),
        "ทั้งหมด"
      ),
    [orders]
  );

  const modelOptions = useMemo(
    () =>
      buildOptions(
        orders.map((o) => o.bikes?.[0]?.model_name),
        "ทั้งหมด"
      ),
    [orders]
  );

  // ✅ ตัวกรอง: แสดง "ไฟแนนซ์" รวม
  const paymentOptions: Option[] = [
    { value: "__ALL__", label: "ทั้งหมด" },
    { value: "เงินสด", label: "เงินสด" },
    { value: "ไฟแนนซ์", label: "ไฟแนนซ์" },
    { value: "NPG", label: "NPG" },
  ];

  // ✅ หน่วงเวลา 300ms ก่อนใช้คำค้นหาจริง (debounce) - พิมพ์ในกล่องยังลื่นเหมือนเดิม
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false; // ✅ กัน response เก่า (ที่มาช้า) มาทับผลลัพธ์ใหม่กว่า

    const run = async () => {
      const params = {
        startDate: dateFilter?.from,
        endDate: dateFilter?.to,
      };

      try {
        // fetch ตาม date range จาก API เท่านั้น
        const result = await getFilteredOrders(params);

        if (cancelled) return; // ✅ effect นี้ถูกแทนที่ไปแล้ว (มีการพิมพ์/เปลี่ยนตัวกรองต่อ) ทิ้งผลนี้

        // ✅ กัน error เงียบๆ ถ้า result ไม่ใช่ array (เช่น token หมดอายุ, backend error, response ผิดรูปแบบ)
        if (!Array.isArray(result)) {
          console.error("❌ getFilteredOrders ไม่คืนค่าเป็น array:", result);
          return;
        }

        let filtered = result;

        // ค้นหาทุก field
        if (debouncedSearchTerm) {
          const q = debouncedSearchTerm.toLowerCase();
          filtered = filtered.filter((o) =>
            o.customer?.toLowerCase().includes(q) ||
            o.bikes?.[0]?.model_name?.toLowerCase().includes(q) ||
            o.bikes?.[0]?.model_code?.toLowerCase().includes(q) ||
            o.bikes?.[0]?.chassi?.toLowerCase().includes(q) ||
            o.bikes?.[0]?.engine?.toLowerCase().includes(q) ||
            o.bikes?.[0]?.registration_plate?.toLowerCase().includes(q) ||
            o.payment_method?.toLowerCase().includes(q)
          );
        }

        if (customerFilter !== "__ALL__") {
          filtered = filtered.filter((o) => o.customer === customerFilter);
        }

        if (modelFilter !== "__ALL__") {
          filtered = filtered.filter(
            (o) => o.bikes?.[0]?.model_name === modelFilter
          );
        }

        if (paymentFilter !== "__ALL__") {
          if (paymentFilter === "ไฟแนนซ์") {
            filtered = filtered.filter(
              (o) => o.payment_method === "Cathay" || o.payment_method === "ทรัพย์สยาม" || o.payment_method === "NPG" || o.payment_method === "Summit" || o.payment_method === "S Leasing" || o.payment_method === "CIMB" || o.payment_method === "World Lease" || o.payment_method === "เงินติดล้อ"
            );
          } else {
            filtered = filtered.filter(
              (o) => o.payment_method === paymentFilter
            );
          }
        }

        setOrdersDisplay(filtered);
      } catch (err) {
        if (!cancelled) {
          console.error("❌ เกิดข้อผิดพลาดตอนค้นหา/กรองรายการขาย:", err);
        }
      }
    };

    run();

    return () => {
      cancelled = true; // ✅ effect ถัดไปกำลังจะรัน ยกเลิกอันนี้
    };
  }, [debouncedSearchTerm, customerFilter, modelFilter, paymentFilter, dateFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCustomerFilter("__ALL__");
    setModelFilter("__ALL__");
    setPaymentFilter("__ALL__");
    setDateFilter(undefined);
  };

  return (
    <>
      {/* Header */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h2 className="text-3xl font-semibold prompt">ประวัติการขาย</h2>
          <h6 className="prompt">รวมทั้งหมด: {ordersDisplay.length}</h6>
        </div>

        <div>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {/* Filter row */}
      <div className="mt-4 grid grid-cols-4 gap-3 items-end">
        <FilterSelect
          label="ลูกค้า"
          value={customerFilter}
          onChange={setCustomerFilter}
          options={customerOptions}
          placeholder="เลือกลูกค้า..."
        />

        <FilterSelect
          label="ชื่อรุ่น"
          value={modelFilter}
          onChange={setModelFilter}
          options={modelOptions}
          placeholder="เลือกรุ่น..."
        />

        <FilterSelect
          label="วิธีการชำระเงิน"
          value={paymentFilter}
          onChange={setPaymentFilter}
          options={paymentOptions}
          placeholder="เลือกวิธีชำระ..."
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">ช่วงเวลา</span>
          <div className="flex items-center gap-2">
            <DateRangePicker date={dateFilter} setDate={setDateFilter} />
            <Button variant="outline" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              ล้าง
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[85%] mt-3">
        <DataTable data={ordersDisplay} columns={OrderColumns} />
      </ScrollArea>
    </>
  );
};

export default OrdersView;