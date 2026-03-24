"use client";

import { Button } from "@/components/ui/button";
import { IEmployee } from "@/types/IEmployee";
import { Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import DeleteEmployeeDialog from "./DeleteEmployeeDialog";
import { getSession, useSession } from "next-auth/react";

const ActionButtons = ({ employee }: { employee: IEmployee }) => {
  const { data: session } = useSession();
  const userInfo = session?.user as any;

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
      // console.log("Employees ActionButtons role =", rawRole, (s as any)?.user);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const isManager = roleCode === "adm";
  const isSelf =
    userInfo?.username && employee?.username
      ? String(userInfo.username) === String(employee.username)
      : false;

  return (
    <div className="col-span-2 flex items-end justify-between py-5">
      {/* ✅ Delete: เฉพาะผู้จัดการ + ห้ามลบตัวเอง */}
      {roleLoaded && isManager && !isSelf && (
        <DeleteEmployeeDialog employee={employee}>
          <Button className="flex items-center gap-2" variant={"destructive"}>
            <Trash2 size={"1rem"} opacity={"60%"} />
            Delete
          </Button>
        </DeleteEmployeeDialog>
      )}

      <Link href={`/employees/${employee.id}/edit`}>
        <Button className="flex items-center gap-2" variant={"default"}>
          <Pencil size={"1rem"} opacity={"60%"} />
          Edit
        </Button>
      </Link>
    </div>
  );
};

export default ActionButtons;
