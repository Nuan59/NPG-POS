"use server";

import { Gift } from "@/types/Gift";
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath, revalidateTag } from "next/cache";

export const getGifts = async () => {
  "use server";
  
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/gifts`, {
      next: {
        revalidate: 0,
      },
    });

    // ✅ เช็คว่ามี response และ ok
    if (!response || !response.ok) {
      console.error("❌ getGifts: No response or not ok");
      return [];
    }

    const data = await response.json();

    // ✅ เช็คว่าเป็น array
    if (!Array.isArray(data)) {
      console.error("❌ getGifts: Data is not an array:", data);
      return [];
    }

    console.log(`✅ Loaded ${data.length} gifts`);
    return data;
  } catch (error) {
    console.error("❌ Error in getGifts:", error);
    return [];
  }
};

export const getGift = async (gift_id: number) => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/gifts/${gift_id}/`,
    {
      next: {
        tags: ["getGift", `${gift_id}`],
        revalidate: 0,
      },
    }
  );

  return response;
};

export const createGift = async (payload: Gift) => {
  "use server";
  const response = await authorizedFetch(`${process.env.API_URL}/gifts/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let status = "error";

  if (response?.status === 201) {
    revalidatePath("/gifts");
    status = "success";
  }

  return { status, data: response?.json() };
};

export const addGiftsToStock = async (giftId: number, amount: number) => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/gifts/${giftId}/add/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
      }),
    }
  );

  let status = "error";

  if (response?.status === 200) {
    revalidatePath("/gifts");
    revalidateTag("getGift");
    status = "success";
  }

  const data = await response?.json();

  return { status, data };
};

export const changeGiftPrice = async (giftId: number, price: number) => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/gifts/${giftId}/update_price/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price,
      }),
    }
  );

  let status = "error";

  if (response?.status === 200) {
    revalidatePath("/gifts");
    revalidateTag("getGift");
    status = "success";
  }

  const data = await response?.json();

  return { status, data };
};