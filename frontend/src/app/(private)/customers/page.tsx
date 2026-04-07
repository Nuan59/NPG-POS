import CustomersView from "./views/CustomersView";
import { getServerSession } from "next-auth";
import { authOptions } from "@/util/AuthOptions";

const CustomersPage = async () => {
	const session = await getServerSession(authOptions);
	const isAdmin = session?.user?.role === "adm";

	return <CustomersView isAdmin={isAdmin} />;
};

export default CustomersPage;