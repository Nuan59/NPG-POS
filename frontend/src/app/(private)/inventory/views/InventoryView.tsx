"use client";

import React, { Suspense, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

import SearchBar from "@/components/global/SearchBar";
import TableLoading from "@/components/global/TableLoading";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
import { IBike } from "@/types/Bike";
import { BikeColumns } from "../components/BikeColumn";
import { handleFilter } from "@/app/hooks/useFilter";
import { Check, ChevronsUpDown, Import, Option, Plus, X } from "lucide-react";
import { OrderContext } from "@/context/OrderContext";
import { toast } from "sonner";

interface InventoryViewProps {
  bikes?: IBike[];
}

type Option = { value: string; label: string };

// ---------- helper ----------
function buildOptions(
  values: string[],
  allLabel = "ทั้งหมด"
): Option[] {
  const uniq = Array.from(new Set(values)).sort((a, b) =>
    a.localeCompare(b, "th")
  );

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
                value === "__ALL__" && "text-muted-foreground"
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
                    className="flex justify-between"
                  >
                    {opt.label}
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

// ---------- main ----------
const InventoryView = ({ bikes = [] }: InventoryViewProps) => {
  const router = useRouter();
  const { addBikeToOrder, orderBike } = useContext(OrderContext);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [bikesDisplay, setBikesDisplay] = useState<IBike[]>([]);
  const [includeSold, setIncludeSold] = useState(false);

  // master data
  const [brands, setBrands] = useState<string[]>([]);
  const [storages, setStorages] = useState<string[]>([]);

  // filters
  const [brandFilter, setBrandFilter] = useState("__ALL__");
  const [storageFilter, setStorageFilter] = useState("__ALL__");
  const [categoryFilter, setCategoryFilter] = useState("__ALL__");

  // ✅ Handle row click - เพิ่มสินค้าเข้า Order
  const handleRowClick = (bike: IBike) => {
    if (bike.sold) {
      toast.error("สินค้านี้ขายแล้ว");
      return;
    }
    
    if (orderBike?.id === bike.id) {
      toast.info("สินค้านี้อยู่ใน Order แล้ว");
      return;
    }
    
    addBikeToOrder(bike);
    toast.success(`เพิ่ม ${bike.model_name} เข้า Order แล้ว`);
    // ✅ ไม่ redirect ให้อยู่หน้าเดิม
  };

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        // ✅ ดึง token จาก session
        const session = await import("next-auth/react").then(m => m.getSession());
        const token = (session as any)?.user?.accessToken;

        const response = await fetch("/api/storage", {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        const data = await response.json();
        console.log("📦 Storage API Response:", data);
        setStorages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("❌ Error fetching storage:", error);
        setStorages([]);
      }
    };

    fetchMaster();
  }, []);




  const brandOptions : Option[] = [
      { 
        value: "__ALL__", 
        label: "ทั้งหมด" 
      },
      { 
        label: "Honda", 
        value: "Honda" 
      },
      { 
        label: "Yamaha", 
        value: "Yamaha" 
      },
      { 
        label: "GPX", 
        value: "GPX" 
      },
      { 
        label: "RYUKA", 
        value: "RYUKA" 
      },
      { 
        label: "Lambretta", 
        value: "Lambretta" 
      },
      { 
        label: "Vespa", 
        value: "Vespa" 
      },
  ];

  const storageOptions: Option[] = [
    { value: "__ALL__", label: "ทั้งหมด" },
    ...storages.map((s: any) => {
      // ✅ รองรับทั้ง name และ storage_name
      const storageName = s.name || s.storage_name || "";
      return {
        value: storageName,
        label: storageName,
      };
    }),
  ];



  const categoryOptions: Option[] = [
    { value: "__ALL__", label: "ทั้งหมด" },
    { value: "new", label: "มือใหม่" },
    { value: "pre_owned", label: "มือสอง" },
  ];

  useEffect(() => {
    let filtered = handleFilter({
      objList: bikes,
      searchTerm,
    }) as IBike[];

    filtered = filtered.filter((b) => (includeSold ? true : !b.sold));

    if (brandFilter !== "__ALL__") {
      filtered = filtered.filter((b) => b.brand === brandFilter);
    }

    if (storageFilter !== "__ALL__") {
      filtered = filtered.filter((b) => b.storage_place_name === storageFilter);
    }

    if (categoryFilter !== "__ALL__") {
      filtered = filtered.filter((b) => b.category === categoryFilter);
    }

    setBikesDisplay(filtered);
  }, [
    bikes,
    searchTerm,
    includeSold,
    brandFilter,
    storageFilter,
    categoryFilter,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setIncludeSold(false);
    setBrandFilter("__ALL__");
    setStorageFilter("__ALL__");
    setCategoryFilter("__ALL__");
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h2 className="text-3xl font-semibold prompt">สินค้า</h2>
          <h6 className="prompt">รวมทั้งหมด: {bikesDisplay.length}</h6>
        </div>

        <div className="flex flex-col gap-2">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <div className="flex justify-end gap-1">
            <TooltipProvider>
              <Tooltip>
                <Link href="/inventory/add">
                  <TooltipTrigger className="border rounded-sm p-1">
                    <Plus />
                  </TooltipTrigger>
                </Link>
                <TooltipContent>เพิ่มสินค้า</TooltipContent>
              </Tooltip>

              <Tooltip>
                <Link href="/inventory/import">
                  <TooltipTrigger className="border rounded-sm p-1">
                    <Import />
                  </TooltipTrigger>
                </Link>
                <TooltipContent>นำเข้าข้อมูล</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 items-end">
        <FilterSelect
          label="ยี่ห้อ"
          value={brandFilter}
          onChange={setBrandFilter}
          options={brandOptions}
          placeholder="ทั้งหมด"
        />

        <FilterSelect
          label="สถานที่จัดเก็บ"
          value={storageFilter}
          onChange={setStorageFilter}
          options={storageOptions}
          placeholder="ทั้งหมด"
        />

        <FilterSelect
          label="ประเภทสินค้า"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          placeholder="ทั้งหมด"
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">ตัวเลือก</span>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={includeSold}
              onCheckedChange={() => setIncludeSold((v) => !v)}
            />
            <span className="text-sm font-bold">รวมขายแล้ว</span>

            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4" /> ล้าง
            </Button>
          </div>
        </div>
      </div>

      <Suspense fallback={<TableLoading />}>
        <ScrollArea className="h-[85%] mt-3">
          <DataTable 
            data={bikesDisplay} 
            columns={BikeColumns} 
            onRowClick={handleRowClick}
          />
        </ScrollArea>
      </Suspense>
    </>
  );
};

export default InventoryView;