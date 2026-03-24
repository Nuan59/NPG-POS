import { getServerSession } from "next-auth";
import { authOptions } from "./AuthOptions";

export const authorizedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response | null> => {
  const session = await getServerSession(authOptions);

  // ❗ ห้าม redirect / throw ใน utility
  if (!session) {
    return null;
  }

  const backendToken = (session as any)?.user?.accessToken;

  const headers: HeadersInit = {
    ...(options.headers || {}),
    ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res;
};
