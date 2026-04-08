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
import { Info } from "lucide-react";
import { useSession } from "next-auth/react";

const editBikeFormSchema = z.object({
  brand: z.string(),
  model_name: z.string(),
  model_code: z.string(),
  engine: z.string(),
  chassis: z.string(),
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
  model_name: z.string().nonempty("กรุณากรอกชื่อรุ่น"),
  model_code: z.string().nonempty("กรุณากรอกรหัสรุ่น"),
  engine: z.string().nonempty("กรุณากรอกเลขเครื่องยนต์"),
  chassis: z.string().nonempty("กรุณากรอกเลขตัวถัง"),
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

  const form = useForm<CreateBikeFormData>({
    resolver: zodResolver(bike ? editBikeFormSchema : createBikeFormSchema),
    shouldFocusError: true,
    defaultValues: bike
      ? undefined
      : {
          brand: "",
          model_name: "",
          model_code: "",
          engine: "",
          chassis: "",
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
      if (key === "chassis" || key === "chassis") {
        const thaiMsg = "เลขตัวถังนี้ถูกใช้แล้ว (กรุณาเปลี่ยนเป็นเลขใหม่)";
        toast.error(thaiMsg);
        // @ts-expect-error
        form.setError("chassis", { type: "server", message: thaiMsg });
        return;
      }
      toast.error(`${key}: ${msg}`);
      // @ts-expect-error
      form.setError(key, { type: "server", message: msg });
    });
  };

  const onSubmit = async (values: any) => {
    // ✅ สร้าง payload โดยใช้ชื่อฟิลด์ตรงกับ Django model
    let payload = {
      ...values,
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
        const error = await req.data;
        handleBackendErrors(error);
      } else {
        const req = await editBike(bike.id, payload);
        if (req.status === "success") {
          toast.success("แก้ไขข้อมูลสินค้าเรียบร้อยแล้ว", { description: getDate(new Date()) });
          router.push(`/inventory/${bike.id}`);
          return;
        }
        const error = await req.data;
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