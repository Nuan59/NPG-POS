import type { NextApiRequest, NextApiResponse } from "next";
import { authorizedFetch } from "@/util/AuthorizedFetch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { sale_id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const backendUrl = `${process.env.API_URL}/order/${sale_id}/`;
    const backendRes = await authorizedFetch(backendUrl, {});
    const data = await backendRes.json();

    return res.status(backendRes.status).json(data);
  } catch (err) {
    console.error("sales api error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
