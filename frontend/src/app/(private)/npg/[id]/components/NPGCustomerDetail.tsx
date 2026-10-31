"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  Plus,
  Trash2,
  ClipboardList,
  Banknote,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import PaymentRowButtons from "./PaymentRowButtons";

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
  period_type: "รายวัน" | "รายสัปดาห์" | "รายเดือน" | "รายปี";
  // ✅ ค่าจริงจาก Order.npg_period - แม่นกว่า period_type เดิมที่อาจบันทึกผิดในอดีต
  // (ต้องใช้ตัวนี้ก่อนเสมอ ไม่งั้นจะเจอบั๊กแบบที่เคยเจอ - ตารางโชว์ "รายปี" แต่หน้ารายละเอียดโชว์ "รายเดือน")
  order_npg_period?: "รายวัน" | "รายสัปดาห์" | "รายเดือน" | "รายปี" | null;
  paid_count: number;
  total_paid: number;
  remaining_balance: number;
  start_date: string;
  next_payment_date: string;
  last_payment_date: string | null;
  progress_percentage: number;
  is_overdue?: boolean; // ✅ คำนวณสดจาก backend (status active + วันครบกำหนดผ่านมาแล้ว)
  estimated_late_fee?: number; // ✅ ค่าปรับโดยประมาณถ้าจ่ายวันนี้ (ยังไม่ได้บันทึกจริง)
  payments: Payment[];
  fees?: Fee[]; // ✅ ค่าธรรมเนียมอื่นๆ
  metrics?: Metrics; // ✅ ตัวเลขสรุปสัญญา (NPGSerializer.get_metrics)
}

interface Fee {
  id: number;
  fee_date: string;
  description: string;
  amount: number | string;
  payment_method: string;
  note: string;
  created_by: string;
}

interface Metrics {
  credit: number;
  expected_total: number;
  paid: number;
  principal_paid: number;
  interest_received: number;
  outstanding: number;
  late_fees: number;
  other_fees: number;
  fees_received: number;
  realized_profit: number;
  days_overdue: number;
  bad_debt: number;
  contract_status: "normal" | "overdue" | "bad_debt" | "closed";
}

const CONTRACT_STATUS: Record<Metrics["contract_status"], { label: string; cls: string }> = {
  normal: { label: "ปกติ", cls: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "ค้างชำระ", cls: "bg-red-100 text-red-700" },
  bad_debt: { label: "หนี้เสีย", cls: "bg-rose-700 text-white" },
  closed: { label: "ปิดแล้ว", cls: "bg-slate-100 text-slate-600" },
};

const baht = (n: number | string | undefined) => `${Number(n || 0).toLocaleString()} ฿`;

// ✅ วันที่แบบปลอดภัย - ไม่มีค่า/ค่าเพี้ยน ขึ้น "—" แทน Invalid Date
const fmtDate = (s: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("th-TH", opts || { year: "numeric", month: "long", day: "numeric" });
};

interface Payment {
  id: number;
  payment_date: string;
  installment_number: number;
  amount_paid: number;
  remaining_balance_after: number;
  payment_method?: string;
  transfer_bank?: string;
  check_number?: string;
  late_fee?: number; // ✅ ค่าปรับจ่ายล่าช้าจริงที่คิดตอนบันทึกรายการนี้
  note: string;
}

const PAY_METHODS = ["เงินสด", "เงินโอน", "เช็ค"];
const BANKS = ["KBank", "BBL"];

// ปุ่มเลือกแบบกลุ่ม (วิธีชำระ / ธนาคาร)
const SegButtons = ({
  options,
  value,
  onChange,
  toggleable = false,
  cols = 3,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  toggleable?: boolean;
  cols?: number;
}) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {options.map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => onChange(toggleable && value === m ? "" : m)}
        className={`text-sm py-2 px-3 rounded-lg border transition-colors ${
          value === m
            ? "bg-[#1e2432] text-white border-[#1e2432]"
            : "bg-white text-[#1e2432] border-slate-200 hover:bg-slate-50"
        }`}
      >
        {m}
      </button>
    ))}
  </div>
);

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5">
    <span className="text-[#7A7A7A] shrink-0">{label}</span>
    <span className="font-medium text-right tabular-nums min-w-0 break-words">{children}</span>
  </div>
);

const NPGCustomerDetail = ({ customerId }: NPGCustomerDetailProps) => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const accessToken = session?.user?.accessToken;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [paymentMethodType, setPaymentMethodType] = useState<string>("เงินสด");
  const [transferBank, setTransferBank] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false); // ✅ กันกดบันทึกซ้ำ
  const [isCloseAccountDialogOpen, setIsCloseAccountDialogOpen] = useState(false);
  const [isClosingAccount, setIsClosingAccount] = useState(false); // ✅ กันกดปิดบัญชีซ้ำ
  const [closeAccountAmount, setCloseAccountAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"payments" | "fees">("payments");
  const submitLock = useRef(false); // ✅ กันดับเบิลคลิกเร็วกว่า state อัปเดต

  // ✅ แก้ไขรายการชำระเงินที่บันทึกไปแล้ว (adm เท่านั้น)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");
  const [editMethod, setEditMethod] = useState<string>("เงินสด");
  const [editBank, setEditBank] = useState<string>("");
  const [editCheckNumber, setEditCheckNumber] = useState<string>("");
  const [editPaymentDate, setEditPaymentDate] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ✅ ค่าธรรมเนียมอื่นๆ
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [feeDescription, setFeeDescription] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeMethod, setFeeMethod] = useState("เงินสด");
  const [feeNote, setFeeNote] = useState("");
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [deletingFee, setDeletingFee] = useState<Fee | null>(null);
  const [isDeletingFee, setIsDeletingFee] = useState(false);

  // 🔒 adm เท่านั้น (เหมือนเดิม): แก้ไข/ลบการชำระเงิน, ลบค่าธรรมเนียม, ตัวเลขกำไร/ดอกเบี้ย/หนี้เสีย
  const isAdmin = String(session?.user?.role ?? "").toLowerCase() === "adm";

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const calculateCloseAmount = (data: AccountDetail) => {
    const remainingInstallments = data.installment_count - data.paid_count;

    // ✅ ใช้ order_npg_period ก่อนเสมอ (แม่นกว่า period_type ที่อาจบันทึกผิดในอดีต)
    const effectivePeriod = data.order_npg_period || data.period_type;

    // คำนวณจำนวนเดือนที่เหลือ - รายวัน 1/30, รายสัปดาห์ 7/30, รายเดือน 1, รายปี 12 (ตรงกับ backend)
    const MONTHS_PER_PERIOD: Record<string, number> = { รายวัน: 1 / 30, รายสัปดาห์: 7 / 30, รายเดือน: 1, รายปี: 12 };
    const remainingMonths = remainingInstallments * (MONTHS_PER_PERIOD[effectivePeriod] ?? 1);

    // ดอกเบี้ยต่อเดือน (ปัดเศษ: < 0.5 ปัดลง, >= 0.5 ปัดขึ้น)
    const interestPerMonthRaw = data.finance_amount * (data.interest_rate / 100);
    const interestPerMonth = Math.round(interestPerMonthRaw);

    // ส่วนลด = (ดอกเบี้ยต่อเดือน × จำนวนเดือนที่เหลือ) ÷ 2 - ต้องตรงกับสูตรฝั่ง backend
    // (NPGAccount.calculate_close_amount) เป๊ะ ไม่งั้นตัวเลข preview กับยอดที่บันทึกจริงจะไม่ตรงกัน
    const discount = (interestPerMonth * remainingMonths) / 2;

    // ยอดปิดบัญชี = หนี้คงเหลือ - ส่วนลด
    return Math.round(data.remaining_balance - discount);
  };

  const fetchAccountDetail = useCallback(async () => {
    if (!accessToken) return; // ✅ รอ session พร้อมก่อน (เดิมจะค้าง "กำลังโหลด..." ถ้าเปิดหน้าก่อน login โหลดเสร็จ)

    try {
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        toast.error("Session หมดอายุ", { description: "กรุณาเข้าสู่ระบบใหม่" });
        router.push("/login");
        return;
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, customerId, baseUrl, router]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      setLoading(false);
      router.push("/login");
      return;
    }
    if (sessionStatus === "authenticated") {
      if (accessToken) fetchAccountDetail();
      else {
        toast.error("ไม่พบ access token");
        setLoading(false);
      }
    }
  }, [sessionStatus, accessToken, fetchAccountDetail, router]);

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentMethodType("เงินสด");
    setTransferBank("");
    setCheckNumber("");
  };

  const handlePayment = async () => {
    if (!account || !accessToken || submitLock.current) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    if (amount > account.remaining_balance) {
      toast.error("จำนวนเงินเกินยอดคงเหลือ");
      return;
    }

    submitLock.current = true;
    setIsSavingPayment(true);
    try {
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/record_payment/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_paid: amount,
          note: paymentNote,
          payment_method: paymentMethodType,
          transfer_bank: paymentMethodType === "เงินโอน" ? transferBank : "",
          check_number: paymentMethodType === "เช็ค" ? checkNumber : "",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("บันทึกการชำระเงินสำเร็จ");
        setIsPaymentDialogOpen(false);
        resetPaymentForm();
        // ✅ เด้งไปหน้าใบเสร็จรับเงินชั่วคราว
        router.push(`/npg/${customerId}/receipt?payment_id=${data.payment_id}`);
        return; // คงปุ่มล็อกไว้ระหว่างเปลี่ยนหน้า
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("ไม่สามารถบันทึกการชำระเงินได้");
    }
    submitLock.current = false;
    setIsSavingPayment(false);
  };

  const handleCloseAccount = async () => {
    if (!account || !accessToken || submitLock.current) return;

    submitLock.current = true;
    setIsClosingAccount(true);
    try {
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/close_account/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          close_amount: closeAccountAmount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("ปิดบัญชีสำเร็จ");
        setIsCloseAccountDialogOpen(false);
        // ✅ เด้งไปหน้าใบเสร็จรับเงินชั่วคราว
        router.push(`/npg/${customerId}/receipt?payment_id=${data.payment_id}`);
        return;
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Close account error:", error);
      toast.error("ไม่สามารถปิดบัญชีได้");
    }
    submitLock.current = false;
    setIsClosingAccount(false);
  };

  const openEditDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setEditAmount(String(payment.amount_paid));
    setEditNote(payment.note || "");
    setEditMethod(payment.payment_method || "เงินสด");
    setEditBank(payment.transfer_bank || "");
    setEditCheckNumber(payment.check_number || "");
    // ✅ แปลงเป็น yyyy-mm-dd สำหรับ input type="date"
    setEditPaymentDate(payment.payment_date ? payment.payment_date.slice(0, 10) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingPayment || !accessToken || isSavingEdit) return;

    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`${baseUrl}/npg/payments/${editingPayment.id}/edit/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_paid: amount,
          note: editNote,
          payment_method: editMethod,
          transfer_bank: editMethod === "เงินโอน" ? editBank : "",
          check_number: editMethod === "เช็ค" ? editCheckNumber : "",
          payment_date: editPaymentDate || undefined,
        }),
      });

      if (response.ok) {
        toast.success("แก้ไขรายการชำระเงินสำเร็จ");
        setEditingPayment(null);
        fetchAccountDetail();
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Edit payment error:", error);
      toast.error("ไม่สามารถแก้ไขรายการได้");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const resetFeeForm = () => {
    setFeeDescription("");
    setFeeAmount("");
    setFeeMethod("เงินสด");
    setFeeNote("");
  };

  const handleAddFee = async () => {
    if (!accessToken || isSavingFee) return;
    const amount = parseFloat(feeAmount);
    if (!feeDescription.trim()) {
      toast.error("กรุณาระบุรายการค่าธรรมเนียม");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setIsSavingFee(true);
    try {
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/add_fee/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: feeDescription.trim(),
          amount,
          payment_method: feeMethod,
          note: feeNote,
        }),
      });

      if (response.ok) {
        toast.success("บันทึกค่าธรรมเนียมสำเร็จ");
        setIsFeeDialogOpen(false);
        resetFeeForm();
        setActiveTab("fees");
        fetchAccountDetail();
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Add fee error:", error);
      toast.error("ไม่สามารถบันทึกค่าธรรมเนียมได้");
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleDeleteFee = async () => {
    if (!deletingFee || !accessToken || isDeletingFee) return;
    setIsDeletingFee(true);
    try {
      const response = await fetch(`${baseUrl}/npg/accounts/${customerId}/delete_fee/${deletingFee.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("ลบค่าธรรมเนียมสำเร็จ");
        setDeletingFee(null);
        fetchAccountDetail();
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Delete fee error:", error);
      toast.error("ไม่สามารถลบค่าธรรมเนียมได้");
    } finally {
      setIsDeletingFee(false);
    }
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-[#7A7A7A]">
        <p>ไม่พบข้อมูลบัญชี</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/npg")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            กลับหน้ารายการ
          </Button>
          <Button onClick={() => { setLoading(true); fetchAccountDetail(); }} className="bg-[#F26B1D] hover:bg-[#d95c14] text-white">
            ลองอีกครั้ง
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.min(Math.max(Number(account.progress_percentage) || 0, 0), 100);
  const period = account.order_npg_period || account.period_type;
  const estLateFee = Number(account.estimated_late_fee || 0);

  // ✅ ใช้ is_overdue จาก backend ก่อนเสมอ (คำนวณสดจากวันที่จริง) มี fallback เทียบวันที่เองเผื่อ field ไม่มา
  const isOverdue =
    account.status === "overdue" ||
    account.is_overdue === true ||
    (account.status === "active" &&
      !!account.next_payment_date &&
      new Date(account.next_payment_date) < new Date());

  const m = account.metrics;
  // 🔒 หนี้เสียแสดงเฉพาะ admin - พนักงานเห็นเป็น "ค้างชำระ"
  const contractKey = m ? (!isAdmin && m.contract_status === "bad_debt" ? "overdue" : m.contract_status) : null;
  const contractStatus = contractKey ? CONTRACT_STATUS[contractKey] || CONTRACT_STATUS.normal : null;

  const statusPill =
    account.status === "completed"
      ? { label: "ชำระครบ", cls: "bg-blue-100 text-blue-800" }
      : account.status === "closed"
      ? { label: "ปิดบัญชี", cls: "bg-white/20 text-white" }
      : isOverdue
      ? { label: "เกินกำหนดชำระ", cls: "bg-white text-red-700" }
      : { label: "กำลังชำระ", cls: "bg-emerald-400/20 text-emerald-200" };

  const fees = account.fees || [];
  const payments = account.payments || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={() => router.push("/npg")} variant="outline" size="icon" aria-label="กลับ">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs text-[#7A7A7A]">
            บัญชี NPG #{account.id}
            {account.order_id ? ` · ออเดอร์ #${account.order_id}` : ""}
          </p>
          <h1 className="text-xl md:text-2xl font-bold text-[#1e2432]">รายละเอียดบัญชี</h1>
        </div>
      </div>

      {/* ✅ กล่องสรุปบนสุด - สีกรมท่า / แดงเมื่อเกินกำหนด */}
      <section
        className={`rounded-2xl p-5 md:p-6 text-white space-y-5 ${
          isOverdue ? "bg-gradient-to-br from-red-800 to-red-600" : "bg-[#1e2432]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-12 w-12 shrink-0 rounded-full bg-[#F26B1D] grid place-items-center text-lg font-bold">
              {(account.customer_name || "?").trim().charAt(0)}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold truncate">{account.customer_name}</h2>
              <p className="text-sm text-white/70 tabular-nums truncate">
                {account.customer_phone}
                {account.bike_info ? ` · ${account.bike_info.brand} ${account.bike_info.model_name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold">{period}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 ${statusPill.cls}`}>
              {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
              {statusPill.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 tabular-nums">
          <div className="rounded-xl bg-white/[0.07] px-3 py-2.5">
            <p className="text-xs text-white/65">ชำระแล้ว</p>
            <p className="text-lg md:text-xl font-bold">{baht(account.total_paid)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.07] px-3 py-2.5">
            <p className="text-xs text-white/65">คงเหลือ</p>
            <p className="text-lg md:text-xl font-bold">{baht(account.remaining_balance)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.07] px-3 py-2.5">
            <p className="text-xs text-white/65">งวดที่ชำระ</p>
            <p className="text-lg md:text-xl font-bold">
              {account.paid_count} / {account.installment_count}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.07] px-3 py-2.5">
            <p className="text-xs text-white/65">{isOverdue ? "วันครบกำหนด (เกินแล้ว)" : "วันชำระถัดไป"}</p>
            <p className={`text-lg md:text-xl font-bold ${isOverdue ? "text-yellow-200" : ""}`}>
              {fmtDate(account.next_payment_date, { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {isOverdue && (m?.days_overdue || estLateFee > 0) ? (
              <p className="text-xs text-yellow-100">
                {m?.days_overdue ? `เกิน ${m.days_overdue} วัน` : ""}
                {m?.days_overdue && estLateFee > 0 ? " · " : ""}
                {estLateFee > 0 ? `ค่าปรับ ~${baht(estLateFee)}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isOverdue ? "bg-white" : "bg-[#F26B1D]"}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-white/70 mt-1 tabular-nums">ผ่อนไปแล้ว {progressPercentage.toFixed(0)}%</p>
        </div>
      </section>

      {/* Action Buttons */}
      {account.status === "active" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            className="h-12 text-base bg-[#F26B1D] hover:bg-[#d95c14] text-white"
            onClick={() => setIsPaymentDialogOpen(true)}
          >
            <Banknote size={18} className="mr-2" />
            บันทึกการชำระเงิน
          </Button>

          <Button
            className="h-12 text-base bg-[#1e2432] hover:bg-[#2a3245] text-white"
            onClick={() => setIsCloseAccountDialogOpen(true)}
          >
            <CheckCircle size={18} className="mr-2" />
            ปิดบัญชี
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ข้อมูลลูกค้า + ข้อมูลการเงิน (ทุกคนเห็น เหมือนเดิม) */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-base font-semibold mb-2 flex items-center gap-2 text-[#1e2432]">
            <FileText size={18} />
            ข้อมูลสัญญา
          </h2>
          <div className="divide-y divide-slate-100 text-sm">
            <InfoRow label="ชื่อลูกค้า">{account.customer_name}</InfoRow>
            <InfoRow label="เบอร์โทร">{account.customer_phone || "—"}</InfoRow>
            {account.bike_info && (
              <>
                <InfoRow label="ยี่ห้อ / รุ่น">
                  {account.bike_info.brand} {account.bike_info.model_name}
                </InfoRow>
                <InfoRow label="รหัสรุ่น">{account.bike_info.model_code || "—"}</InfoRow>
              </>
            )}
            {/* ✅ ใช้ order_npg_period ก่อนเสมอ - ตรงกับที่ตาราง NPGTable.tsx ใช้ */}
            <InfoRow label="ประเภทการชำระ">{period}</InfoRow>
            <InfoRow label="ยอดจัด">{baht(account.finance_amount)}</InfoRow>
            <InfoRow label="ดอกเบี้ย">{account.interest_rate}%</InfoRow>
            <InfoRow label="ค่างวด">
              {baht(account.installment_amount)} × {account.installment_count} งวด
            </InfoRow>
            <InfoRow label="วันเริ่มต้น">{fmtDate(account.start_date)}</InfoRow>
          </div>
        </div>

        {/* ✅ สรุปสัญญา - พนักงานเห็นแค่ สถานะสัญญา / ชำระแล้ว / ยอดคงค้าง, 🔒 admin เห็นทั้งหมด */}
        {m && contractStatus && (() => {
          const rows: { label: string; value: string; adminOnly?: boolean; cls?: string }[] = [
            { label: "สินเชื่อ (เงินต้น)", value: baht(m.credit), adminOnly: true },
            { label: "ยอดชำระคาดการณ์", value: baht(m.expected_total), adminOnly: true },
            { label: "ชำระแล้ว", value: baht(m.paid), cls: "text-emerald-600" },
            { label: "เงินต้นชำระแล้ว", value: baht(m.principal_paid), adminOnly: true },
            { label: "ยอดคงค้าง", value: baht(m.outstanding), cls: "text-amber-600" },
            { label: "ดอกเบี้ยรับ", value: baht(m.interest_received), adminOnly: true },
            {
              label: "ค่าธรรมเนียมรับแล้ว",
              value: `${baht(m.fees_received)} (ค่าปรับ ${baht(m.late_fees)} + อื่นๆ ${baht(m.other_fees)})`,
              adminOnly: true,
            },
            { label: "กำไรรับจริง", value: baht(m.realized_profit), adminOnly: true, cls: "text-emerald-600" },
            ...(m.bad_debt > 0
              ? [{ label: "หนี้เสียคาดการณ์", value: baht(m.bad_debt), adminOnly: true, cls: "text-rose-700" }]
              : []),
          ];

          return (
            <div className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-base font-semibold flex items-center gap-2 text-[#1e2432]">
                  <ClipboardList size={18} />
                  สรุปสัญญา
                </h2>
                <div className="flex items-center gap-2">
                  {m.days_overdue > 0 && (
                    <span className="text-sm text-red-600">เกินกำหนด {m.days_overdue} วัน</span>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${contractStatus.cls}`}>
                    {contractStatus.label}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                {rows
                  .filter((r) => isAdmin || !r.adminOnly)
                  .map((r) => (
                    <InfoRow key={r.label} label={r.label}>
                      <span className={r.cls || ""}>{r.value}</span>
                    </InfoRow>
                  ))}
              </div>
              {!isAdmin && (
                <p className="mt-3 text-xs text-[#7A7A7A] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  ตัวเลขดอกเบี้ย/กำไร ดูได้เฉพาะผู้ดูแลระบบ
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* ✅ แท็บ: ประวัติการชำระเงิน / ค่าธรรมเนียมอื่นๆ */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center gap-1 border-b px-2 md:px-3">
          {[
            { key: "payments" as const, label: "ประวัติการชำระเงิน", icon: Calendar, count: payments.length },
            { key: "fees" as const, label: "ค่าธรรมเนียมอื่นๆ", icon: Receipt, count: fees.length },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-2 md:px-3 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? "border-[#F26B1D] text-[#1e2432]"
                  : "border-transparent text-[#7A7A7A] hover:text-[#1e2432]"
              }`}
            >
              <t.icon className="h-4 w-4 hidden sm:block" />
              {t.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-[#7A7A7A] tabular-nums">
                {t.count}
              </span>
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === "fees" && (
            <Button variant="ghost" size="sm" onClick={() => setIsFeeDialogOpen(true)} className="gap-1 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">บันทึกค่าธรรมเนียม</span>
              <span className="sm:hidden">เพิ่ม</span>
            </Button>
          )}
        </div>

        {activeTab === "payments" ? (
          payments.length === 0 ? (
            <div className="text-center py-10 text-[#7A7A7A]">ยังไม่มีประวัติการชำระเงิน</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b text-xs text-[#7A7A7A]">
                    <th className="text-left px-4 py-2.5 font-semibold">วันที่ชำระ</th>
                    <th className="text-left p-2.5 font-semibold">งวดที่</th>
                    <th className="text-right p-2.5 font-semibold">จำนวนเงิน</th>
                    <th className="text-right p-2.5 font-semibold">ค่าปรับ</th>
                    <th className="text-right p-2.5 font-semibold">คงเหลือหลังชำระ</th>
                    <th className="text-left p-2.5 font-semibold">วิธีชำระ</th>
                    <th className="text-left p-2.5 font-semibold">หมายเหตุ</th>
                    <th className="text-center p-2.5 font-semibold">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 tabular-nums">{fmtDate(payment.payment_date)}</td>
                      <td className="p-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                          งวดที่ {payment.installment_number}
                        </span>
                      </td>
                      <td className="p-2.5 text-right text-emerald-600 font-semibold tabular-nums">
                        {Number(payment.amount_paid || 0).toLocaleString()} ฿
                      </td>
                      <td className="p-2.5 text-right tabular-nums">
                        {payment.late_fee && payment.late_fee > 0 ? (
                          <span className="text-red-600 font-medium">{payment.late_fee.toLocaleString()} ฿</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right tabular-nums">
                        {Number(payment.remaining_balance_after || 0).toLocaleString()} ฿
                      </td>
                      <td className="p-2.5 text-[#7A7A7A]">
                        {payment.payment_method || "-"}
                        {payment.payment_method === "เงินโอน" && payment.transfer_bank ? ` (${payment.transfer_bank})` : ""}
                        {payment.payment_method === "เช็ค" && payment.check_number ? ` เลขที่ ${payment.check_number}` : ""}
                      </td>
                      <td className="p-2.5 text-[#7A7A7A]">{payment.note || "-"}</td>
                      <td className="p-2.5 text-center">
                        {/* 🔒 แก้ไข/ลบ เฉพาะ adm (อยู่ใน PaymentRowButtons) */}
                        <PaymentRowButtons
                          payment={payment}
                          accountId={customerId}
                          isAdmin={isAdmin}
                          onEdit={openEditDialog}
                          onDeleted={fetchAccountDetail}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : fees.length === 0 ? (
          <div className="text-center py-10 text-[#7A7A7A]">ยังไม่มีค่าธรรมเนียม</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b text-xs text-[#7A7A7A]">
                  <th className="text-left px-4 py-2.5 font-semibold">วันที่</th>
                  <th className="text-left p-2.5 font-semibold">รายการ</th>
                  <th className="text-right p-2.5 font-semibold">จำนวนเงิน</th>
                  <th className="text-left p-2.5 font-semibold">วิธีชำระ</th>
                  <th className="text-left p-2.5 font-semibold">หมายเหตุ</th>
                  <th className="text-left p-2.5 font-semibold">ผู้บันทึก</th>
                  {/* 🔒 ลบค่าธรรมเนียม เฉพาะ adm */}
                  {isAdmin && <th className="text-center p-2.5 font-semibold">จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 tabular-nums">{fmtDate(fee.fee_date)}</td>
                    <td className="p-2.5">{fee.description}</td>
                    <td className="p-2.5 text-right text-emerald-600 font-semibold tabular-nums">{baht(fee.amount)}</td>
                    <td className="p-2.5 text-[#7A7A7A]">{fee.payment_method || "-"}</td>
                    <td className="p-2.5 text-[#7A7A7A]">{fee.note || "-"}</td>
                    <td className="p-2.5 text-[#7A7A7A]">{fee.created_by || "-"}</td>
                    {isAdmin && (
                      <td className="p-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => setDeletingFee(fee)}
                          aria-label="ลบค่าธรรมเนียม"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(o) => {
          if (isSavingPayment) return; // ✅ ปิดไม่ได้ระหว่างกำลังบันทึก
          setIsPaymentDialogOpen(o);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>บันทึกการชำระเงิน</DialogTitle>
            <DialogDescription>
              {account.customer_name} · งวดที่ {account.paid_count + 1} จาก {account.installment_count}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="npg-pay-amount">จำนวนเงิน (฿)</Label>
              <Input
                id="npg-pay-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="text-lg font-semibold h-11"
              />
              {/* ✅ ปุ่มเลือกยอดเร็ว */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "ค่างวด", v: account.installment_amount },
                  { label: "2 งวด", v: account.installment_amount * 2 },
                  { label: "ทั้งหมด", v: account.remaining_balance },
                ]
                  .filter((q, i, arr) => q.v > 0 && q.v <= account.remaining_balance && arr.findIndex((x) => x.v === q.v) === i)
                  .map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => setPaymentAmount(String(q.v))}
                      className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-xs hover:border-[#F26B1D] hover:text-[#F26B1D] tabular-nums"
                    >
                      {q.label} {Number(q.v).toLocaleString()} ฿
                    </button>
                  ))}
              </div>
            </div>
            {estLateFee > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  จ่ายวันนี้จะมีค่าปรับล่าช้าเพิ่ม <b>{estLateFee.toLocaleString()} ฿</b>{" "}
                  (ระบบจะคิดค่าปรับให้อัตโนมัติตอนกดบันทึก)
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>วิธีการชำระ</Label>
              <SegButtons options={PAY_METHODS} value={paymentMethodType} onChange={setPaymentMethodType} />

              {paymentMethodType === "เงินโอน" && (
                <SegButtons options={BANKS} value={transferBank} onChange={setTransferBank} toggleable cols={2} />
              )}

              {paymentMethodType === "เช็ค" && (
                <Input
                  type="text"
                  placeholder="เลขที่เช็ค"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="npg-pay-note">หมายเหตุ (ถ้ามี)</Label>
              <Textarea
                id="npg-pay-note"
                placeholder="เช่น ชำระล่าช้า, ชำระล่วงหน้า"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} disabled={isSavingPayment}>
              ยกเลิก
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isSavingPayment}
              className="bg-[#F26B1D] hover:bg-[#d95c14] text-white"
            >
              {isSavingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Account Dialog */}
      <Dialog
        open={isCloseAccountDialogOpen}
        onOpenChange={(o) => {
          if (isClosingAccount) return;
          setIsCloseAccountDialogOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปิดบัญชี</DialogTitle>
            <DialogDescription>คำนวณยอดชำระเพื่อปิดบัญชีก่อนกำหนด</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                การปิดบัญชีก่อนกำหนดจะได้รับส่วนลดดอกเบี้ยตามจำนวนเดือนที่เหลือ
              </p>
            </div>

            <div className="space-y-2 tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#7A7A7A]">หนี้คงเหลือ</span>
                <span className="font-medium">{account.remaining_balance.toLocaleString()} ฿</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A7A7A]">ส่วนลดดอกเบี้ย</span>
                <span className="font-medium text-emerald-600">
                  -{(account.remaining_balance - closeAccountAmount).toLocaleString()} ฿
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-dashed pt-2">
                <span>ยอดชำระปิดบัญชี</span>
                <span className="text-[#F26B1D]">{closeAccountAmount.toLocaleString()} ฿</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCloseAccountDialogOpen(false)} disabled={isClosingAccount}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleCloseAccount}
              disabled={isClosingAccount}
              className="bg-[#F26B1D] hover:bg-[#d95c14] text-white"
            >
              {isClosingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังปิดบัญชี...
                </>
              ) : (
                "ยืนยันปิดบัญชี"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔒 Edit Payment Dialog (adm เท่านั้น) */}
      <Dialog
        open={!!editingPayment}
        onOpenChange={(open) => !open && !isSavingEdit && setEditingPayment(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขรายการชำระเงิน</DialogTitle>
            <DialogDescription>
              แก้ไขรายการงวดที่ {editingPayment?.installment_number} ของลูกค้า {account.customer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="npg-edit-date">วันที่ชำระ</Label>
              <Input
                id="npg-edit-date"
                type="date"
                value={editPaymentDate}
                onChange={(e) => setEditPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="npg-edit-amount">จำนวนเงิน (฿)</Label>
              <Input
                id="npg-edit-amount"
                type="number"
                inputMode="decimal"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>วิธีการชำระ</Label>
              <SegButtons options={PAY_METHODS} value={editMethod} onChange={setEditMethod} />
              {editMethod === "เงินโอน" && (
                <SegButtons options={BANKS} value={editBank} onChange={setEditBank} toggleable cols={2} />
              )}
              {editMethod === "เช็ค" && (
                <Input
                  type="text"
                  placeholder="เลขที่เช็ค"
                  value={editCheckNumber}
                  onChange={(e) => setEditCheckNumber(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="npg-edit-note">หมายเหตุ</Label>
              <Textarea id="npg-edit-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ การแก้ไขจำนวนเงินหรือวันที่ชำระ จะคำนวณยอดคงเหลือและลำดับงวดของบัญชีทั้งหมดใหม่ทันที (เรียงตามวันที่ชำระ)
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingPayment(null)} disabled={isSavingEdit}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-[#1e2432] hover:bg-[#2a3245] text-white">
              {isSavingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fee Dialog (ทุกคนบันทึกได้ เหมือนเดิม) */}
      <Dialog
        open={isFeeDialogOpen}
        onOpenChange={(o) => {
          if (isSavingFee) return;
          setIsFeeDialogOpen(o);
          if (!o) resetFeeForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>บันทึกค่าธรรมเนียม</DialogTitle>
            <DialogDescription>
              ค่าธรรมเนียมอื่นๆ ของลูกค้า {account.customer_name} (ไม่กระทบยอดหนี้คงเหลือ)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="npg-fee-desc">รายการ</Label>
              <Input
                id="npg-fee-desc"
                value={feeDescription}
                onChange={(e) => setFeeDescription(e.target.value)}
                placeholder="เช่น ค่าทวงถาม"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npg-fee-amount">จำนวนเงิน (฿)</Label>
              <Input
                id="npg-fee-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>วิธีการชำระ</Label>
              <SegButtons options={PAY_METHODS} value={feeMethod} onChange={setFeeMethod} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npg-fee-note">หมายเหตุ (ถ้ามี)</Label>
              <Textarea id="npg-fee-note" value={feeNote} onChange={(e) => setFeeNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsFeeDialogOpen(false);
                resetFeeForm();
              }}
              disabled={isSavingFee}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleAddFee} disabled={isSavingFee} className="bg-[#F26B1D] hover:bg-[#d95c14] text-white">
              {isSavingFee ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔒 Delete Fee Dialog (adm เท่านั้น) */}
      <Dialog open={!!deletingFee} onOpenChange={(o) => !o && !isDeletingFee && setDeletingFee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบค่าธรรมเนียม?</DialogTitle>
            <DialogDescription>
              ต้องการลบ <strong>{deletingFee?.description}</strong> จำนวน{" "}
              <strong>{baht(deletingFee?.amount)}</strong> ใช่ไหม? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeletingFee(null)} disabled={isDeletingFee}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteFee} disabled={isDeletingFee} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {isDeletingFee ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NPGCustomerDetail;