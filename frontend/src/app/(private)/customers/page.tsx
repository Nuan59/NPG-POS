import CustomersView from "./views/CustomersView";
import { getCustomers } from "@/services/CustomerService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/util/AuthOptions";

const CustomersPage = async () => {
	const session = await getServerSession(authOptions);
	const customers = await getCustomers();

	const isAdmin = session?.user?.role === "adm";

	return <CustomersView customers={customers} isAdmin={isAdmin} />;
};

export default CustomersPage;