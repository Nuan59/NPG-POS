import { getSession } from "next-auth/react";

export const authorizedFetchClient = async (
  url: string,
  options: RequestInit = {}
): Promise<Response | null> => {
  const session = await getSession();

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
