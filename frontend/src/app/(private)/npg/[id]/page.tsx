"use client";

import { useParams } from "next/navigation";
import NPGCustomerDetail from "./components/NPGCustomerDetail";

export default function NPGDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  return (
    <div className="container mx-auto p-6">
      <NPGCustomerDetail customerId={accountId} />
    </div>
  );
}