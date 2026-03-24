import React from "react";
import { authorizedFetch } from "@/util/AuthorizedFetch";
import InventoryView from "../views/InventoryView";
import { IBike } from "@/types/Bike";

const InventoryAllPage = async () => {
  const apiBase = process.env.API_URL;

  // กันกรณี env ไม่ถูกโหลด (ไม่แก้อื่น แค่กันหน้าแตก)
  if (!apiBase) {
    return <InventoryView bikes={[]} />;
  }

  const [newRes, preOwnedRes] = await Promise.all([
    authorizedFetch(`${apiBase}/inventory/?category=new`, { next: { revalidate: 0 } }),
    authorizedFetch(`${apiBase}/inventory/?category=pre_owned`, { next: { revalidate: 0 } }),
  ]);

  const newBikes: IBike[] = newRes ? await newRes.json() : [];
  const preOwnedBikes: IBike[] = preOwnedRes ? await preOwnedRes.json() : [];

  const bikes: IBike[] = [...newBikes, ...preOwnedBikes];

  return <InventoryView bikes={bikes} />;
};

export default InventoryAllPage;
