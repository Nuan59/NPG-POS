import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SalesReports from "./views/SalesReports";
import InventoryReport from "./views/InventoryReport";
import CustomersReports from "./views/CustomersReports";
import FinancialReports from "./views/FinancialReports";
import EmployeeReports from "./views/EmployeeReports";
import { getOrders } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/util/AuthOptions";

const Reports = async () => {
    // ✅ แท็บพนักงานเห็นเฉพาะ adm (backend กันซ้ำอีกชั้น)
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === "adm";

    // ✅ ดึง orders ฝั่ง server component (เหมือนหน้า /sales) แล้วส่งเป็น prop ให้ FinancialReports
    // แทนที่จะให้ client component เรียก getOrders() เป็น Server Action เอง
    // เพราะ Server Action มีข้อจำกัดขนาด response - order 500+ รายการพร้อมข้อมูลซ้อนครบ (bikes, additional_fees, gifts)
    // ใหญ่เกินจนล้มเหลวเงียบๆ ไม่มี error โชว์เลย
    const orders: IOrder[] = await getOrders()
        .then((res) => res?.json())
        .catch(() => []);

    return (
        <div className="h-full overflow-y-auto">
            <h2 className="text-3xl font-semibold prompt">รายงาน</h2>

            <Tabs defaultValue="sales" className="w-full">
                <TabsList>
                    <TabsTrigger value="sales">ขาย</TabsTrigger>
                    <TabsTrigger value="inventory">สินค้า</TabsTrigger>
                    <TabsTrigger value="customers">ลูกค้า</TabsTrigger>
                    <TabsTrigger value="financial">การเงิน</TabsTrigger>
                    {isAdmin && <TabsTrigger value="employees">พนักงาน</TabsTrigger>}
                </TabsList>
                <TabsContent value="sales">
                    <SalesReports orders={Array.isArray(orders) ? orders : []} />
                </TabsContent>
                <TabsContent value="inventory">
                    <InventoryReport />
                </TabsContent>
                <TabsContent value="customers">
                    <CustomersReports />
                </TabsContent>
                <TabsContent value="financial">
                    <FinancialReports orders={Array.isArray(orders) ? orders : []} />
                </TabsContent>
                {isAdmin && (
                    <TabsContent value="employees">
                        <EmployeeReports />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default Reports;