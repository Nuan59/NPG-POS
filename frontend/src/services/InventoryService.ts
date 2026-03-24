"use server";
import { IBike } from "@/types/Bike";
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath, revalidateTag } from "next/cache";

export const getBikes = async () => {
	"use server";
	const response = await authorizedFetch(`${process.env.API_URL}/inventory/`, {
		next: {
			revalidate: 0,
		},
	});

	return response;
};

export const createBike = async (payload: IBike) => {
	"use server";
	const response = await authorizedFetch(`${process.env.API_URL}/inventory/`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	let status = "error";

	if (response?.status === 201) {
		revalidatePath("/inventory");
		status = "success";
	}

	return { status, data: response?.json() };
};

export const getBike = async (bike_id: number) => {
	"use server";
	const response = await authorizedFetch(
		`${process.env.API_URL}/inventory/${bike_id}/`,
		{
			next: {
				tags: ["getBike", `${bike_id}`],
				revalidate: 0,
			},
		}
	).then((res) => res?.json());

	return response;
};

export const editBike = async (bike_id: number, payload: IBike) => {
	"use server";
	const response = await authorizedFetch(
		`${process.env.API_URL}/inventory/${bike_id}/`,
		{
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}
	);

	let status = "error";

	if (response?.status == 200) {
		revalidateTag("getBike");
		status = "success";
	}

	return { status, data: response?.json() };
};

export const deleteBike = async (bike_id: number) => {
	"use server";
	const response = await authorizedFetch(
		`${process.env.API_URL}/inventory/${bike_id}/`,
		{
			method: "DELETE",
		}
	);

	if (response?.status == 204) {
		revalidatePath("/inventory");
		return true;
	}

	return null;
};

export const getStorageBikes = async (storage_id: number) => {
	"use server";
	const response = await authorizedFetch(
		`${process.env.API_URL}/inventory/?storage=${storage_id}`,
		{}
	).then((res) => res?.json());

	return response;
};

export const importInventory = async (payload: {
	storage: number;
	bikes: IBike[];
}) => {
	"use server";
	const response = await authorizedFetch(
		`${process.env.API_URL}/inventory/import_inventory/`,
		{
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	let status = "error";

	if (response?.status === 200) {
		revalidatePath("/inventory");
		status = "success";
	}

	return { status, data: response?.json() };
};
