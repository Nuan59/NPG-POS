"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft 
} from "lucide-react";
import { toast } from "sonner";

interface NPGCustomerDetailProps {
  customerId: string;
}

interface AccountDetail {
  id: number;
  order_id: number;
  order_date: string;
  customer_name: string;
  customer_phone: string;
  bike_info: {
    brand: string;
    model_name: string;
    model_code: string;
  } | null;
  status: "active" | "completed" | "closed" | "overdue";
  finance_amount: number;
  interest_rate: number;
  installment_count: number;
  installment_amount: number;
  period_type: "รายเดือน" | "รายปี";
  paid_count: number;
  total_paid: number;
  remaining_balance: number;
  start_date: string;
  next_payment_date: string;
  last_payment_date: string | null;
  progress_percentage: number;
  payments: Payment[];
}

interface Payment {
  id: number;
  payment_date: string;
  installment_number: number;
  amount_paid: number;
  remaining_balance_after: number;
  note: string;
}

const NPGCustomerDetail = ({ customerId }: NPGCustomerDetailProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCloseAccountDialogOpen, setIsCloseAccountDialogOpen] = useState(false);
  const [closeAccountAmount, setCloseAccountAmount] = useState<number>(0);

  useEffect(() => {
    fetchAccountDetail();
  }, [customerId]);

  const fetchAccountDetail = async () => {
    if (!session?.user?.accessToken) {
      toast.error("ไม่พบ access token");
      return;
    }

    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/`, {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลได้");
      }

      const data = await response.json();
      setAccount(data);
      
      // คำนวณยอดปิดบัญชี
      if (data.remaining_balance > 0) {
        const closeAmt = calculateCloseAmount(data);
        setCloseAccountAmount(closeAmt);
      }
    } catch (error) {
      console.error("Error fetching account detail:", error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const calculateCloseAmount = (data: AccountDetail) => {
    const remainingInstallments = data.installment_count - data.paid_count;
    
    // คำนวณจำนวนเดือนที่เหลือ
    const remainingMonths = data.period_type === 'รายปี' 
      ? remainingInstallments * 12 
      : remainingInstallments;
    
    // ดอกเบี้ยต่อเดือน (ปัดเศษ: < 0.5 ปัดลง, >= 0.5 ปัดขึ้น)
    const interestPerMonthRaw = data.finance_amount * (data.interest_rate / 100);
    const interestPerMonth = Math.round(interestPerMonthRaw);
    
    // ส่วนลด = ดอกเบี้ยต่อเดือน × จำนวนเดือนที่เหลือ
    const discount = interestPerMonth * remainingMonths;
    
    // ยอดปิดบัญชี = หนี้คงเหลือ - ส่วนลด
    return Math.round(data.remaining_balance - discount);
  };

  const handlePayment = async () => {
    if (!account || !session?.user?.accessToken) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    if (amount > account.remaining_balance) {
      toast.error("จำนวนเงินเกินยอดคงเหลือ");
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/record_payment/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_paid: amount,
          note: paymentNote,
        }),
      });

      if (response.ok) {
        toast.success("บันทึกการชำระเงินสำเร็จ");
        setIsPaymentDialogOpen(false);
        setPaymentAmount("");
        setPaymentNote("");
        fetchAccountDetail();
      } else {
        const error = await response.json();
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("ไม่สามารถบันทึกการชำระเงินได้");
    }
  };

  const handleCloseAccount = async () => {
    if (!account || !session?.user?.accessToken) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/close_account/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          close_amount: closeAccountAmount,
        }),
      });

      if (response.ok) {
        toast.success("ปิดบัญชีสำเร็จ");
        setIsCloseAccountDialogOpen(false);
        router.push("/npg");
      } else {
        const error = await response.json();
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Close account error:", error);
      toast.error("ไม่สามารถปิดบัญชีได้");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>ไม่พบข้อมูลบัญชี</p>
      </div>
    );
  }

  const progressPercentage = account.progress_percentage || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={() => router.push("/npg")} variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          รายละเอียดบัญชี NPG #{account.id}
        </h1>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText size={20} />
            ข้อมูลลูกค้า
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">ชื่อลูกค้า:</span>
              <span className="font-medium">{account.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">เบอร์โทร:</span>
              <span className="font-medium">{account.customer_phone}</span>
            </div>
            {account.bike_info && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">ยี่ห้อ:</span>
                  <span className="font-medium">{account.bike_info.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">รุ่น:</span>
                  <span className="font-medium">{account.bike_info.model_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">รหัสรุ่น:</span>
                  <span className="font-medium">{account.bike_info.model_code}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">ประเภทการชำระ:</span>
              <span className="font-medium">{account.period_type}</span>
            </div>
          </div>
        </div>

        {/* Right Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            ข้อมูลการเงิน
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">ยอดจัด:</span>
              <span className="font-medium">{account.finance_amount.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ดอกเบี้ย:</span>
              <span className="font-medium">{account.interest_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">จำนวนงวด:</span>
              <span className="font-medium">{account.installment_count} งวด</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ค่างวด:</span>
              <span className="font-medium">{account.installment_amount.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">วันเริ่มต้น:</span>
              <span className="font-medium">
                {new Date(account.start_date).toLocaleDateString("th-TH")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">สถานะการชำระเงิน</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm opacity-90">ชำระแล้ว</p>
            <p className="text-2xl font-bold">{account.total_paid.toLocaleString()} ฿</p>
          </div>
          <div>
            <p className="text-sm opacity-90">คงเหลือ</p>
            <p className="text-2xl font-bold">{account.remaining_balance.toLocaleString()} ฿</p>
          </div>
          <div>
            <p className="text-sm opacity-90">งวดที่ชำระ</p>
            <p className="text-2xl font-bold">
              {account.paid_count} / {account.installment_count}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">วันชำระถัดไป</p>
            <p className="text-lg font-bold">
              {new Date(account.next_payment_date).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-blue-400 rounded-full h-4">
          <div
            className="bg-white h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
            style={{ width: `${progressPercentage}%` }}
          >
            <span className="text-blue-600 text-xs font-bold">{progressPercentage.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {account.status === "active" && (
        <div className="flex gap-4">
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setIsPaymentDialogOpen(true)}
          >
            <DollarSign size={18} className="mr-2" />
            บันทึกการชำระเงิน
          </Button>

          <Button 
            className="flex-1 bg-orange-600 hover:bg-orange-700"
            onClick={() => setIsCloseAccountDialogOpen(true)}
          >
            <CheckCircle size={18} className="mr-2" />
            ปิดบัญชี
          </Button>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการชำระเงิน</DialogTitle>
            <DialogDescription>
              บันทึกการชำระเงินงวดถัดไปของลูกค้า {account.customer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>จำนวนเงิน (฿)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                ค่างวดปกติ: {account.installment_amount.toLocaleString()} ฿
              </p>
            </div>
            <div>
              <Label>หมายเหตุ (ถ้ามี)</Label>
              <Textarea
                placeholder="เช่น ชำระล่าช้า, ชำระล่วงหน้า"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handlePayment}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Account Dialog */}
      <Dialog open={isCloseAccountDialogOpen} onOpenChange={setIsCloseAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปิดบัญชี</DialogTitle>
            <DialogDescription>
              คำนวณยอดชำระเพื่อปิดบัญชีก่อนกำหนด
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertCircle size={16} />
                การปิดบัญชีก่อนกำหนดจะได้รับส่วนลดดอกเบี้ยตามจำนวนเดือนที่เหลือ
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">หนี้คงเหลือ:</span>
                <span className="font-medium">{account.remaining_balance.toLocaleString()} ฿</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ส่วนลดดอกเบี้ย:</span>
                <span className="font-medium text-green-600">
                  -{(account.remaining_balance - closeAccountAmount).toLocaleString()} ฿
                </span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>ยอดชำระปิดบัญชี:</span>
                <span className="text-orange-600">{closeAccountAmount.toLocaleString()} ฿</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseAccountDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleCloseAccount} className="bg-orange-600 hover:bg-orange-700">
              ยืนยันปิดบัญชี
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar size={20} />
            ประวัติการชำระเงิน
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่ชำระ</TableHead>
              <TableHead>งวดที่</TableHead>
              <TableHead className="text-right">จำนวนเงิน</TableHead>
              <TableHead className="text-right">คงเหลือหลังชำระ</TableHead>
              <TableHead>หมายเหตุ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!account.payments || account.payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  ยังไม่มีประวัติการชำระเงิน
                </TableCell>
              </TableRow>
            ) : (
              account.payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.payment_date).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>งวดที่ {payment.installment_number}</TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {payment.amount_paid.toLocaleString()} ฿
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.remaining_balance_after.toLocaleString()} ฿
                  </TableCell>
                  <TableCell className="text-gray-600">{payment.note || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default NPGCustomerDetail;