import { getStorageTransferHistory } from "@/services/StorageService";
import React from "react";
import TransferHistoryView from "./views/TransferHistoryView";

const TransferHistory = async () => {
	const transferHistory = await getStorageTransferHistory();

	return <TransferHistoryView transferHistory={transferHistory} />;
};

export default TransferHistory;
