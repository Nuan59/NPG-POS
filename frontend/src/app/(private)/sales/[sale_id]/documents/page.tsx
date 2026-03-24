import { getOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import { notFound } from "next/navigation";
import DocumentSelection from "./DocumentSelection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DocumentSelectionPageProps {
  params: { sale_id: string };
}

export default async function DocumentSelectionPage({ params }: DocumentSelectionPageProps) {
  const saleId = Number.parseInt(params.sale_id, 10);
  
  if (Number.isNaN(saleId)) {
    notFound();
  }

  const res = await getOrder(saleId);
  
  if (!res?.ok) {
    notFound();
  }

  const order = (await res.json()) as IOrder;
  
  if (!order?.id) {
    notFound();
  }

  return <DocumentSelection order={order} />;
}