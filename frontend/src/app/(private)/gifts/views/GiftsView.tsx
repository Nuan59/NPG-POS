"use client";

import SearchBar from "@/components/global/SearchBar";
import TableLoading from "@/components/global/TableLoading";
import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Gift } from "@/types/Gift";
import { Plus } from "lucide-react";
import Link from "next/link";
import React, { Suspense, useEffect, useState } from "react";
import { GiftColumns } from "../components/GiftColumns";
import { handleFilter } from "@/app/hooks/useFilter";

interface GiftsViewProps {
  gifts: Gift[];
}

const GiftsView = ({ gifts }: GiftsViewProps) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [giftsDisplay, setGiftsDisplay] = useState<Gift[]>(gifts);

  useEffect(() => {
    setGiftsDisplay(handleFilter({ objList: gifts, searchTerm }) as Gift[]);
  }, [searchTerm, gifts]);

  return (
    <>
      <div className="grid grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold prompt">ของแถม</h2>
          <h6 className="prompt">รวมทั้งหมด: {giftsDisplay.length}</h6>
        </div>

        <div className="flex flex-col gap-2">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <div className="flex justify-end gap-1">
            <TooltipProvider>
              <Tooltip>
                <Link href={"/gifts/new"}>
                  <TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
                    <Plus />
                  </TooltipTrigger>
                </Link>
                <TooltipContent>
                  <p>เพิ่มของแถม</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <Suspense fallback={<TableLoading />}>
        <ScrollArea className="h-[85%] mt-3">
          <DataTable data={giftsDisplay} columns={GiftColumns} />
        </ScrollArea>
      </Suspense>
    </>
  );
};

export default GiftsView;
