import CustomersView from "./views/CustomersView";
import { getCustomers } from "@/services/CustomerService";
import { getServerSession } from "next-auth";

const CustomersPage = async () => {
	const session = await getServerSession();
	const customers = await getCustomers();

	// role ของคุณ = "adm"
	const isAdmin = session?.user?.role === "adm";

	return <CustomersView customers={customers} isAdmin={isAdmin} />;
};

export default CustomersPage;
