"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Eye, RefreshCw } from "lucide-react";
import type { NPGAccount } from "../page";

interface NPGTableProps {
  accounts: NPGAccount[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  onRefresh: () => void;
}

export default function NPGTable({
  accounts,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  periodFilter,
  onPeriodFilterChange,
  onRefresh,
}: NPGTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      closed: "bg-gray-100 text-gray-800",
      overdue: "bg-red-100 text-red-800",
    };

    const labels = {
      active: "กำลังชำระ",
      completed: "ชำระครบ",
      closed: "ปิดบัญชี",
      overdue: "เกินกำหนด",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getPeriodBadge = (period: string) => {
    return (
      <Badge
        className={
          period === "รายเดือน"
            ? "bg-purple-100 text-purple-800"
            : "bg-orange-100 text-orange-800"
        }
      >
        {period}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>รายการลูกค้า NPG</CardTitle>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ค้นหาชื่อลูกค้าหรือรุ่นรถ..."
                className="pl-10"
              />
            </div>

            {/* Period Filter */}
            <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="รายเดือน">รายเดือน</SelectItem>
                <SelectItem value="รายปี">รายปี</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="active">กำลังชำระ</SelectItem>
                <SelectItem value="completed">ชำระครบ</SelectItem>
                <SelectItem value="closed">ปิดบัญชี</SelectItem>
                <SelectItem value="overdue">เกินกำหนด</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              onClick={onRefresh}
              variant="outline"
              size="icon"
              className="w-full md:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            ไม่พบข้อมูลลูกค้า NPG
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold text-gray-600">
                    Order ID
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-600">
                    ลูกค้า
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-600">
                    รถ
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-600">
                    ยอดจัด
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-600">
                    ชำระแล้ว
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-600">
                    คงเหลือ
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-600">
                    งวด
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-600">
                    ประเภท
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-600">
                    สถานะ
                  </th>
                  <th className="text-center p-3 font-semibold text-gray-600">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3">
                      <span className="text-sm font-mono text-gray-600">
                        #{account.order_id}
                      </span>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-semibold">
                          {account.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {account.customer_phone}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {account.bike_info && (
                        <div className="text-sm">
                          <div className="font-medium">
                            {account.bike_info.brand}
                          </div>
                          <div className="text-gray-500">
                            {account.bike_info.model_name}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-semibold">
                        ฿{formatCurrency(account.finance_amount)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-green-600 font-semibold">
                        ฿{formatCurrency(account.total_paid)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-orange-600 font-semibold">
                        ฿{formatCurrency(account.remaining_balance)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-sm">
                        <div>
                          {account.paid_count} / {account.installment_count}
                        </div>
                        <div className="text-xs text-gray-500">
                          {account.progress_percentage.toFixed(0)}%
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {getPeriodBadge(account.period_type)}
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(account.status)}
                    </td>
                    <td className="p-3 text-center">
                      <Link href={`/npg/${account.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          ดูรายละเอียด
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}