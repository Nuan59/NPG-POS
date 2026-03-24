import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SalesReports from "./views/SalesReports";
import InventoryReport from "./views/InventoryReport";
import CustomersReports from "./views/CustomersReports";
import FinancialReports from "./views/FinancialReports";

const Reports = () => {
    return (
        <div className="h-full overflow-y-auto">
            <h2 className="text-3xl font-semibold prompt">รายงาน</h2>

            <Tabs defaultValue="sales" className="w-full">
                <TabsList>
                    <TabsTrigger value="sales">ขาย</TabsTrigger>
                    <TabsTrigger value="inventory">สินค้า</TabsTrigger>
                    <TabsTrigger value="customers">ลูกค้า</TabsTrigger>
                    <TabsTrigger value="financial">การเงิน</TabsTrigger>
                </TabsList>
                <TabsContent value="sales">
                    <SalesReports />
                </TabsContent>
                <TabsContent value="inventory">
                    <InventoryReport />
                </TabsContent>
                <TabsContent value="customers">
                    <CustomersReports />
                </TabsContent>
                <TabsContent value="financial">
                    <FinancialReports />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Reports;