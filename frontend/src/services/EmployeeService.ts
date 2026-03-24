"use server";
import { IEmployee } from "@/types/IEmployee";
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath, revalidateTag } from "next/cache";

export const getEmployees = async () => {
  "use server";
  
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/employees`, {
      next: {
        revalidate: 0,
        tags: ["employees"],
      },
    });

    // ✅ เช็คว่ามี response และ ok
    if (!response || !response.ok) {
      console.error("❌ getEmployees: No response or not ok");
      return [];
    }

    const data = await response.json();

    // ✅ เช็คว่าเป็น array
    if (!Array.isArray(data)) {
      console.error("❌ getEmployees: Data is not an array:", data);
      return [];
    }

    console.log(`✅ Loaded ${data.length} employees`);
    return data;
  } catch (error) {
    console.error("❌ Error in getEmployees:", error);
    return [];
  }
};

export const createEmployee = async (payload: IEmployee) => {
  "use server";
  const response = await authorizedFetch(`${process.env.API_URL}/employees/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response?.status === 200) {
    revalidateTag("employees");
    return { status: "success", data: response.json() };
  } else {
    return { status: "error", data: response?.json() };
  }
};

export const getEmployee = async (employee_id: number) => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/employees/${employee_id}/`,
    {
      next: {
        tags: ["getEmployee", `${employee_id}`],
        revalidate: 0,
      },
    }
  ).then((res) => res?.json());

  return response;
};

export const editEmployee = async (employee_id: number, payload: IEmployee) => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/employees/${employee_id}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (response?.status == 200) {
    revalidateTag("getEmployee");
    return { status: "success", data: response.json() };
  } else {
    return { status: "error", data: response?.json() };
  }
};

export const deleteEmployee = async (employee_id: number) => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/employees/${employee_id}/`,
    {
      method: "DELETE",
    }
  );

  if (response?.status == 204) {
    revalidatePath("/employees");
    return true;
  }

  return null;
};
