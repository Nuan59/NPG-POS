"use client";

import { Button } from "@/components/ui/button";
import { IStorage } from "@/types/Storage";
import { Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import DeleteStorageDialog from "./DeleteStorageDialog";
import { getSession } from "next-auth/react";

const ActionButtons = ({ storage }: { storage: IStorage }) => {
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await getSession();
      const rawRole =
        (s as any)?.user?.role ??
        (s as any)?.user?.role_code ??
        (s as any)?.user?.user?.role ??
        null;

      if (!alive) return;
      setRoleCode(rawRole ? String(rawRole).trim().toLowerCase() : null);
      setRoleLoaded(true);

      // debug ชั่วคราว
      // console.log("Storage ActionButtons role =", rawRole, (s as any)?.user);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const isManager = roleCode === "adm";

  return (
    <div className="w-full flex justify-between col-span-2">
      {/* ✅ Delete: เฉพาะผู้จัดการ */}
      {roleLoaded && isManager && (
        <DeleteStorageDialog storage={storage}>
          <Button className="flex items-center gap-2" variant={"destructive"}>
            <Trash2 size={"1rem"} opacity={"60%"} />
            Delete
          </Button>
        </DeleteStorageDialog>
      )}

      <Link href={`/storage/${storage.id}/edit`}>
        <Button className="flex items-center gap-2">
          <Pencil size={"1rem"} opacity={"60%"} />
          Edit
        </Button>
      </Link>
    </div>
  );
};

export default ActionButtons;
