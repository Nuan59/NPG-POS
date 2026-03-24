import React from "react";
import { authorizedFetch } from "@/util/AuthorizedFetch";
import InventoryView from "../views/InventoryView";
import { IBike } from "@/types/Bike";

const InventoryPreOwnedPage = async () => {
  const apiBase = process.env.API_URL;

  if (!apiBase) {
    return <InventoryView bikes={[]} />;
  }

  const res = await authorizedFetch(`${apiBase}/inventory/?category=pre_owned`, {
    next: { revalidate: 0 },
  });

  const bikes: IBike[] = res ? await res.json() : [];

  return <InventoryView bikes={bikes} />;
};

export default InventoryPreOwnedPage;
