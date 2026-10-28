"use client";

import { Separator } from "@/components/ui/separator";
import React, { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IBike } from "@/types/Bike";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IStorage } from "@/types/Storage";
import { product_info } from "./ProductInfo";
import { price_info } from "./PriceInfo";
import { asOptionalField } from "@/util/ZodOptionalField";
import DateSelector from "./DateSelector";
import { createBike, editBike } from "@/services/InventoryService";
import { getDate } from "@/util/GetDateString";
import { Info, Plus } from "lucide-react";
import { useSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ ที่มาของรถ - บังคับทุกคัน (ค่า null/undefined จากรถเก่า = ยังไม่เลือก)
const sourceField = z.preprocess(
  (v) => (v === null || v === undefined ? "" : String(v)),
  z.string().min(1, "กรุณาเลือกที่มาของรถ")
);

interface BikeSourceOption {
  id: number;
  code: string;
  name?: string; // มีเฉพาะ adm
}

/**
 * ✅ dropdown ที่มาของรถ
 * - พนักงาน: เห็นแค่โค้ด / เพิ่มที่มาใหม่ได้โดยกรอกแค่โค้ด
 * - adm: เห็น "โค้ด · ชื่อเต็ม" / เพิ่มใหม่ใส่ชื่อได้ / กด "เติมชื่อ" ให้โค้ดที่พนักงานเพิ่มไว้ได้
 */
const SourceSelect = ({
  value,
  onChange,
  token,
  isAdm,
}: {
  value: string;
  onChange: (v: string) => void;
  token?: string;
  isAdm: boolean;
}) => {
  const [sources, setSources] = useState<BikeSourceOption[]>([]);
  const [mode, setMode] = useState<"none" | "add" | "name">("none");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/bike-sources/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSources(Array.isArray(d) ? d : []))
      .catch(() => setSources([]));
  }, [token]);

  const selected = sources.find((s) => String(s.id) === value);
  const label = (s: BikeSourceOption) =>
    isAdm ? `${s.code} · ${s.name ? s.name : "(ยังไม่มีชื่อ)"}` : s.code;

  const close = () => {
    setMode("none");
    setCode("");
    setName("");
  };

  const save = async () => {
    setSaving(true);
    try {
      if (mode === "add") {
        const c = code.replace(/\s+/g, "").toUpperCase();
        if (!c) {
          toast.error("กรุณากรอกโค้ด");
          return;
        }
        const res = await fetch(`${API_BASE_URL}/bike-sources/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ code: c, name: isAdm ? name.trim() : "" }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(d?.error || "เพิ่มที่มาไม่สำเร็จ");
          return;
        }
        setSources((prev) => [...prev, d].sort((x, y) => x.code.localeCompare(y.code)));
        onChange(String(d.id));
        toast.success(`เพิ่มที่มา ${d.code} แล้ว`);
        close();
      } else if (mode === "name" && selected) {
        const res = await fetch(`${API_BASE_URL}/bike-sources/${selected.id}/`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(d?.error || "บันทึกชื่อไม่สำเร็จ");
          return;
        }
        setSources((prev) => prev.map((s) => (s.id === d.id ? d : s)));
        toast.success(`บันทึกชื่อ ${d.code} แล้ว`);
        close();
      }
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Select
          value={value || ""}
          onValueChange={(v) => {
            if (v === "__new__") {
              setMode("add");
              return;
            }
            onChange(v);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="เลือกที่มา" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {label(s)}
              </SelectItem>
            ))}
            <SelectItem value="__new__" className="text-orange-600 font-medium">
              + เพิ่มที่มาใหม่
            </SelectItem>
          </SelectContent>
        </Select>
        {/* adm: เติม/แก้ชื่อเต็มของที่มาที่เลือกอยู่ */}
        {isAdm && selected && mode === "none" && (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setName(selected.name || "");
              setMode("name");
            }}
          >
            {selected.name ? "แก้ชื่อ" : "เติมชื่อ"}
          </Button>
        )}
      </div>

      {mode !== "none" && (
        <div className="border rounded-md p-2 flex flex-col gap-2 bg-orange-50/50">
          <div className="flex gap-2">
            {mode === "add" && (
              <Input
                autoFocus
                className={isAdm ? "w-28 uppercase" : "flex-1 uppercase"}
                placeholder="โค้ด เช่น AP"
                maxLength={20}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                }}
              />
            )}
            {isAdm && (
              <Input
                autoFocus={mode === "name"}
                className="flex-1"
                placeholder={mode === "name" ? `ชื่อเต็มของ ${selected?.code ?? ""}` : "ชื่อร้าน / ซัพพลายเออร์ (ใส่ทีหลังได้)"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                }}
              />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={close} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving} className="gap-1">
              {mode === "add" ? <Plus size={14} /> : null}
              {saving ? "กำลังบันทึก..." : mode === "add" ? "เพิ่มที่มา" : "บันทึกชื่อ"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const editBikeFormSchema = z.object({
  brand: z.string(),
  source: sourceField,
  model_name: z.string(),
  model_code: z.string(),
  engine: z.string(),
  chassi: z.string(),
  registration_plate: z.coerce.string(),
  registration_expiry_date: asOptionalField(z.coerce.string()),
  color: z.coerce.string(),
  notes: asOptionalField(z.coerce.string()),
  category: z.string(),
  wholesale_price: z.string().optional(),
  wholesale_price_net: z.coerce.number(),
  sale_price: z.coerce.number(),
});

const createBikeFormSchema = z.object({
  brand: z.string().nonempty("กรุณาเลือกแบรนด์"),
  source: sourceField,
  model_name: z.string().nonempty("กรุณากรอกชื่อรุ่น"),
  model_code: z.string().nonempty("กรุณากรอกรหัสรุ่น"),
  engine: z.string().nonempty("กรุณากรอกเลขเครื่องยนต์"),
  chassi: z.string().nonempty("กรุณากรอกเลขตัวถัง"),
  registration_plate: asOptionalField(z.coerce.string()),
  registration_expiry_date: asOptionalField(z.coerce.string()),
  color: asOptionalField(z.coerce.string()),
  notes: asOptionalField(z.coerce.string()),
  category: z.string().nonempty("กรุณาเลือกประเภทสินค้า"),
  storage_place: z.string().nonempty("กรุณาเลือกสถานที่จัดเก็บ"),
  wholesale_price: z.string().optional().default(""),
  wholesale_price_net: asOptionalField(z.coerce.number()).default(0),
  sale_price: z.coerce.number().default(0),
})
.refine((data) => {
  if (data.category === "pre_owned" && !data.registration_plate) return false;
  return true;
}, {
  message: "กรุณากรอกทะเบียนรถสำหรับรถมือสอง",
  path: ["registration_plate"],
})
.refine((data) => {
  if (data.category === "pre_owned" && !data.registration_expiry_date) return false;
  return true;
}, {
  message: "กรุณาเลือกวันหมดอายุทะเบียนสำหรับรถมือสอง",
  path: ["registration_expiry_date"],
});

type CreateBikeFormData = z.infer<typeof createBikeFormSchema>;

interface BikeFormProps {
  storages?: IStorage[];
  bike?: IBike;
}

const BikeForm = ({ storages, bike }: BikeFormProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(
    bike ? new Date(bike.received_date) : new Date()
  );

  const router = useRouter();
  const { data: session } = useSession();
  const userInfo = session?.user;
  const token = (session as any)?.user?.accessToken as string | undefined;
  const isAdm = (userInfo as any)?.role === "adm";

  const form = useForm<CreateBikeFormData>({
    resolver: zodResolver(bike ? editBikeFormSchema : createBikeFormSchema),
    shouldFocusError: true,
    defaultValues: bike
      ? undefined
      : {
          brand: "",
          source: "",
          model_name: "",
          model_code: "",
          engine: "",
          chassi: "",
          registration_plate: "",
          registration_expiry_date: "",
          color: "",
          notes: "",
          category: "",
          storage_place: "",
          wholesale_price: 0,
          wholesale_price_net: 0,
          sale_price: 0,
        },
    mode: "onSubmit",
  });

  const selectedCategory = form.watch("category");

  useEffect(() => {
    if (!bike) return;
    const blacklist = new Set(["id", "storage_place", "sold", "received_date"]);
    Object.keys(bike).forEach((field) => {
      if (!blacklist.has(field)) {
        // @ts-expect-error
        form.setValue(field, bike[field]);
      }
    });
  }, [bike, form]);

  const onInvalid = (errors: any) => {
    const keys = Object.keys(errors || {});
    if (!keys.length) {
      toast.error("บันทึกไม่ได้", { description: "ฟอร์มไม่ผ่านการตรวจสอบ" });
      return;
    }
    const firstKey = keys[0];
    const msg = errors[firstKey]?.message || "กรอกข้อมูลไม่ครบ";
    toast.error("บันทึกไม่ได้", { description: `${msg}` });
  };

  const handleBackendErrors = (error: any) => {
    if (!error || typeof error !== "object") {
      toast.error("บันทึกไม่สำเร็จ");
      return;
    }
    Object.keys(error).forEach((key) => {
      const raw = error[key];
      const msg = Array.isArray(raw) ? raw[0] : String(raw);
      if (key === "chassi") {
        const thaiMsg = "เลขตัวถังนี้ถูกใช้แล้ว (กรุณาเปลี่ยนเป็นเลขใหม่)";
        toast.error(thaiMsg);
        // @ts-expect-error
        form.setError("chassi", { type: "server", message: thaiMsg });
        return;
      }
      toast.error(`${key}: ${msg}`);
      // @ts-expect-error
      form.setError(key, { type: "server", message: msg });
    });
  };

  const onSubmit = async (values: any) => {
    let payload = {
      ...values,
      source: values.source ? Number(values.source) : null, // ✅ ที่มา (id)
      received_date: selectedDate.toISOString().split("T")[0],
    };

    // ลบฟิลด์ที่ไม่ต้องการสำหรับรถใหม่
    if (payload.category === "new") {
      delete payload.registration_plate;
      delete payload.registration_expiry_date;
    }

    // แปลง registration_expiry_date ให้เป็น string
    if (payload.registration_expiry_date && payload.registration_expiry_date instanceof Date) {
      payload.registration_expiry_date = payload.registration_expiry_date.toISOString().split("T")[0];
    }

    console.log("📤 Payload:", payload);

    try {
      if (!bike) {
        payload = { ...payload, sold: false };
        const req = await createBike(payload);
        if (req.status === "success") {
          toast.success("เพิ่มสินค้าเรียบร้อยแล้ว", { description: getDate(new Date()) });
          router.push("/inventory");
          return;
        }
        const error = req.data ? await req.data : null;
        handleBackendErrors(error);
      } else {
        const req = await editBike(bike.id, payload);
        if (req.status === "success") {
          toast.success("แก้ไขข้อมูลสินค้าเรียบร้อยแล้ว", { description: getDate(new Date()) });
          router.push(`/inventory/${bike.id}`);
          return;
        }
        const error = req.data ? await req.data : null;
        handleBackendErrors(error);
      }
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาด", { description: "ลองใหม่อีกครั้ง" });
    }
  };

  const controlWrap = "w-[70%]";
  const triggerClass = "w-full";
  const inputClass = "w-full";

  return (
    <Form {...form}>
      <form
        id="bikeform"
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="col-span-2 grid grid-cols-2 mb-5"
      >
        <div className="mt-3 h-full">
          <h4 className="text-lg font-semibold">ข้อมูลสินค้า</h4>
          <div className="container flex flex-col gap-2">
            {product_info.map((item) => {
              if (item.showOnlyFor && item.showOnlyFor !== selectedCategory) return null;
              return (
                <FormField
                  key={item.name}
                  control={form.control}
                  // @ts-expect-error
                  name={item.name}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-5">
                      <FormLabel>{item.label}</FormLabel>
                      <div className={controlWrap}>
                        <FormControl>
                          {item.options ? (
                            <Select
                              value={(field.value ?? "") as string}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className={triggerClass}>
                                <SelectValue placeholder={`เลือก${item.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {item.options.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={item.type || "text"}
                              className={inputClass}
                              placeholder={item.placeholder}
                              {...field}
                              value={(field.value ?? "") as any}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              );
            })}
          </div>
        </div>

        <div className="relative h-full">
          <Separator orientation="vertical" className="absolute h-full" />
          <div className="container mt-3 flex flex-col h-full justify-between">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              ข้อมูลการจัดเก็บและราคา
              {bike && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger type="button"><Info opacity={0.6} /></TooltipTrigger>
                    <TooltipContent>หากต้องการเปลี่ยนตำแหน่งการจัดเก็บ กรุณาใช้หน้าถ่ายโอนพื้นที่เก็บข้อมูล</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h4>
            <div className="flex flex-col gap-2">
              {/* ✅ ที่มาของรถ (ร้าน / ซัพพลายเออร์) - บังคับทุกคัน */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-5">
                    <FormLabel className="pt-3">ที่มา</FormLabel>
                    <div className={controlWrap}>
                      <FormControl>
                        <SourceSelect
                          value={field.value == null ? "" : String(field.value)}
                          onChange={field.onChange}
                          token={token}
                          isAdm={isAdm}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <DateSelector date={selectedDate} setDate={setSelectedDate} />
              {price_info(storages).map((item) => {
                if (item.admin && userInfo?.role !== "adm") return null;
                return (
                  <FormField
                    key={item.name}
                    control={form.control}
                    // @ts-expect-error
                    name={item.name}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-5">
                        <FormLabel>{item.label}</FormLabel>
                        <div className={controlWrap}>
                          <FormControl>
                            {item.options ? (
                              <Select
                                value={(field.value ?? "") as string}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className={triggerClass}>
                                  <SelectValue placeholder={`เลือก${item.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={item.type || "text"}
                                className={inputClass}
                                placeholder={item.placeholder}
                                {...field}
                                value={(field.value ?? "") as any}
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.push("/inventory")}>ยกเลิก</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>บันทึก</Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default BikeForm;