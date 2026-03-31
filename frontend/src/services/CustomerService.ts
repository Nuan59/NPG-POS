import { authorizedFetch } from "@/util/AuthorizedFetch";
import { ICustomer } from "@/types/Customer";

export async function getCustomer(id: number) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBase) {
      console.error("❌ API_URL is not defined");
      return { ok: false, data: null, error: "API_URL is not defined" };
    }

    const response = await authorizedFetch(`${apiBase}/customers/${id}`, {
      next: { revalidate: 0 },
    });

    if (!response) {
      console.error("❌ No response from API");
      return { ok: false, data: null, error: "No response from API" };
    }

    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      return { ok: false, data: null, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`✅ Loaded customer ID: ${id}`);
    return { ok: true, data, error: null };
  } catch (error) {
    console.error("❌ Error in getCustomer:", error);
    return { ok: false, data: null, error: String(error) };
  }
}

export async function deleteCustomer(id: number) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBase) {
      console.error("❌ API_URL is not defined");
      return { ok: false, error: "API_URL is not defined" };
    }

    const response = await authorizedFetch(`${apiBase}/customers/${id}`, {
      method: "DELETE",
    });

    if (!response) {
      console.error("❌ No response from API");
      return { ok: false, error: "No response from API" };
    }

    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      return { ok: false, error: `API error: ${response.status}` };
    }

    console.log(`✅ Deleted customer ID: ${id}`);
    return { ok: true, error: null };
  } catch (error) {
    console.error("❌ Error in deleteCustomer:", error);
    return { ok: false, error: String(error) };
  }
}

export async function getCustomers(): Promise<ICustomer[]> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBase) {
      console.error("❌ API_URL is not defined");
      return [];
    }

    const response = await authorizedFetch(`${apiBase}/customers`, {
      next: { revalidate: 0 },
    });

    if (!response) {
      console.error("❌ No response from API");
      return [];
    }

    if (!response.ok) {
      console.error(`❌ API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("❌ API did not return an array:", data);
      return [];
    }

    console.log(`✅ Loaded ${data.length} customers`);
    return data;
  } catch (error) {
    console.error("❌ Error in getCustomers:", error);
    return [];
  }
}

export interface IBirthdayCustomer extends ICustomer {
  days_until_birthday: number;
  is_today: boolean;
  total_orders: number;
  latest_order: {
    id: number;
    date: string;
    total: number;
  } | null;
}

export async function getUpcomingBirthdays(): Promise<IBirthdayCustomer[]> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      console.error("❌ API_URL is not defined");
      return [];
    }

    const response = await authorizedFetch(
      `${apiBase}/customers/birthdays/upcoming/`,
      { next: { revalidate: 0 } }
    );

    if (!response) return [];
    if (!response.ok) return [];

    const data = await response.json();
    console.log(`✅ Loaded ${data.count} upcoming birthdays`);
    return data.results || [];
  } catch (error) {
    console.error("❌ Error in getUpcomingBirthdays:", error);
    return [];
  }
}

export async function getBirthdaysToday(): Promise<IBirthdayCustomer[]> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      console.error("❌ API_URL is not defined");
      return [];
    }

    const response = await authorizedFetch(
      `${apiBase}/customers/birthdays/today/`,
      { next: { revalidate: 0 } }
    );

    if (!response) return [];
    if (!response.ok) return [];

    const data = await response.json();
    console.log(`✅ Loaded ${data.count} birthdays today`);
    return data.results || [];
  } catch (error) {
    console.error("❌ Error in getBirthdaysToday:", error);
    return [];
  }
}

// ✅ ใช้ authorizedFetchClient (client-side) แทน authorizedFetch
export async function importCustomers(customers: any[]) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBase) {
      console.error("❌ API_URL is not defined");
      throw new Error("API_URL is not defined");
    }

    const response = await authorizedFetch(`${apiBase}/customers/import/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customers }),
    });

    if (!response) {
      console.error("❌ No response from API");
      throw new Error("No response from API");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Import failed: ${response.status}`, errorText);
      throw new Error(`Import failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Imported ${customers.length} customers`);
    return { ok: true, data, error: null };
  } catch (error) {
    console.error("❌ Error in importCustomers:", error);
    throw error;
  }
}
