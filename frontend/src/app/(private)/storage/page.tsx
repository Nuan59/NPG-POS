import React from "react";
import StoragesView from "./views/StoragesView";
import { getStorages } from "@/services/StorageService";

const StoragesPage = async () => {
	const storages = await getStorages().then((res) => res?.json());

	return <StoragesView storages={storages} />;
};

export default StoragesPage;
