import { getGifts } from "@/services/GiftService";
import React from "react";
import GiftsView from "./views/GiftsView";

const Gifts = async () => {
  const gifts = await getGifts();

  return <GiftsView gifts={gifts} />;
};

export default Gifts;
