"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getDate } from "@/util/GetDateString";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Gift } from "@/types/Gift";
import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const editGiftFormSchema = z.object({
  name: z.string().nonempty("กรุณากรอกชื่อของแถม"),
  price: z.coerce.number().min(0, "ราคาต้องมากกว่าหรือเท่ากับ 0"),
  stock: z.coerce.number().min(0, "จำนวนต้องมากกว่าหรือเท่ากับ 0"),
  wholesale_price: z.coerce.number().min(0, "ราคาต้องมากกว่าหรือเท่ากับ 0").optional().or(z.literal("")),
});

type FormDataType = z.infer<typeof editGiftFormSchema>;

interface EditGiftFormProps {
  gift: Gift;
}

const EditGiftForm = ({ gift }: EditGiftFormProps) => {
  const form = useForm<FormDataType>({
    defaultValues: {
      name: gift.name || "",
      price: gift.price || 0,
      stock: gift.stock || 0,
      wholesale_price: gift.wholesale_price ?? undefined,
    },
    resolver: zodResolver(editGiftFormSchema),
  });

  const router = useRouter();

  const gift_info = [
    {
      label: "ชื่อของแถม",
      name: "name",
      placeholder: "กรอกชื่อของแถม",
    },
    {
      label: "ราคา",
      name: "price",
      placeholder: "กรอกราคา",
    },
    {
      label: "ขายส่ง",
      name: "wholesale_price",
      placeholder: "กรอกราคาขายส่ง",
    },
    {
      label: "จำนวนในคลัง",
      name: "stock",
      placeholder: "กรอกจำนวน",
    },
  ];

  const onSubmit = async (values: FormDataType) => {
    try {
      const s = await getSession();
      const token = (s as any)?.user?.accessToken;

      if (!token) {
        toast.error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/gifts/${gift.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (res.status === 401) {
        toast.error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "เกิดข้อผิดพลาด" }));
        toast.error(error.message || "แก้ไขไม่สำเร็จ");
        return;
      }

      toast.success(`แก้ไขของแถม ${values.name} เรียบร้อยแล้ว`, {
        description: getDate(new Date()),
      });
      
      router.push(`/gifts/${gift.id}`);
      router.refresh();
    } catch (error) {
      console.error("Edit gift error:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไข");
    }
  };

  return (
    <Form {...form}>
      <form
        id="editgiftform"
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-5"
      >
        {gift_info.map((item) => (
          <FormField
            key={item.name}
            control={form.control}
            //@ts-expect-error
            name={item.name}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-5">
                <FormLabel>{item.label}</FormLabel>
                <FormControl className="max-w-[70%]">
                  <div className="flex flex-col w-full relative">
                    <Input
                      className="w-full placeholder:opacity-40"
                      placeholder={item.placeholder}
                      type={item.name === "name" ? "text" : "number"}
                      {...field}
                    />
                    <FormMessage className="absolute -top-4 right-0" />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        ))}

        <div className="flex justify-end gap-2 mt-5">
          <Button
            onClick={() => router.push(`/gifts/${gift.id}`)}
            variant="outline"
            type="button"
          >
            ยกเลิก
          </Button>
          <Button type="submit">บันทึกการแก้ไข</Button>
        </div>
      </form>
    </Form>
  );
};

export default EditGiftForm;