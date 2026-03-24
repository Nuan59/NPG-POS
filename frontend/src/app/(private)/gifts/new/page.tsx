import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import React from "react";
import GiftForm from "./components/GiftForm";

const CreateGift = () => {
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/gifts">ของแถม</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>เพิ่มของแถม</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="py-2 grid grid-cols-2 place-content-start gap-x-5 h-full">
        <div className="col-span-2 max-h-[20%]">
          <h2 className="text-3xl font-semibold prompt">เพิ่มของแถม</h2>
        </div>

        <GiftForm />
      </div>
    </>
  );
};

export default CreateGift;