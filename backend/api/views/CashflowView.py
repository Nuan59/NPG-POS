from decimal import Decimal, InvalidOperation
from datetime import date
import traceback

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F

from api.models.Cashflow import CashflowEntry, CashflowDayMeta


def _net_expr():
    return F("income") - F("sent") - F("expense") - F("change") - F("deposit_return")


def _section_opening(section: str, date_str: str) -> Decimal:
    """
    ยอดยกมาของ section (cash/transfer) ณ วันที่ date_str (ยอดก่อนเริ่มวันนั้น)
    หา override ล่าสุดก่อนหน้าวันนี้ก่อน ถ้าไม่มีให้เริ่มจาก 0 ที่รายการแรกสุด
    """
    override_field = "cash_opening_override" if section == "cash" else "transfer_opening_override"

    latest_override = (
        CashflowDayMeta.objects.filter(date__lt=date_str)
        .exclude(**{f"{override_field}__isnull": True})
        .order_by("-date")
        .first()
    )

    if latest_override:
        base = getattr(latest_override, override_field) or Decimal("0")
        start_date = latest_override.date
    else:
        base = Decimal("0")
        first_entry = CashflowEntry.objects.filter(section=section).order_by("date").first()
        if not first_entry:
            return base
        start_date = first_entry.date

    net_sum = (
        CashflowEntry.objects.filter(section=section, date__gte=start_date, date__lt=date_str)
        .aggregate(total=Sum(_net_expr()))
        .get("total")
    )
    return base + (net_sum or Decimal("0"))


def _calc_section(entries, opening: Decimal):
    running = opening
    rows = []
    totals = {
        "income": Decimal("0"), "sent": Decimal("0"), "expense": Decimal("0"),
        "change": Decimal("0"), "deposit_return": Decimal("0"),
    }
    for e in entries:
        running = running + e.income - e.sent - e.expense - e.change - e.deposit_return
        totals["income"] += e.income
        totals["sent"] += e.sent
        totals["expense"] += e.expense
        totals["change"] += e.change
        totals["deposit_return"] += e.deposit_return
        rows.append({
            "id": e.id,
            "description": e.description,
            "income": e.income,
            "sent": e.sent,
            "expense": e.expense,
            "change": e.change,
            "depositReturn": e.deposit_return,
            "createdBy": e.created_by,
            "balance": running,
        })
    return rows, totals, running


def _build_day_payload(date_str: str) -> dict:
    cash_entries = CashflowEntry.objects.filter(date=date_str, section="cash").order_by("seq")
    transfer_entries = CashflowEntry.objects.filter(date=date_str, section="transfer").order_by("seq")

    cash_opening = _section_opening("cash", date_str)
    transfer_opening = _section_opening("transfer", date_str)

    cash_rows, cash_totals, cash_closing = _calc_section(cash_entries, cash_opening)
    transfer_rows, transfer_totals, transfer_closing = _calc_section(transfer_entries, transfer_opening)

    meta = CashflowDayMeta.objects.filter(date=date_str).first()

    return {
        "date": date_str,
        "cash": {
            "opening": cash_opening,
            "openingOverride": meta.cash_opening_override if meta else None,
            "rows": cash_rows, "totals": cash_totals, "closing": cash_closing,
        },
        "transfer": {
            "opening": transfer_opening,
            "openingOverride": meta.transfer_opening_override if meta else None,
            "rows": transfer_rows, "totals": transfer_totals, "closing": transfer_closing,
        },
        "checkerName": meta.checker_name if meta else "",
        "checkerDate": meta.checker_date if meta else None,
        # ✅ ประวัติการนับเงินสดปลายวัน (ถ้าเคยบันทึกไว้) - แค่บันทึกไว้ดู ไม่มีผลกับยอดคำนวณ
        "cashCount": {
            "countedAmount": meta.counted_cash_amount if meta else None,
            "countedBy": meta.counted_by if meta else "",
            "countedAt": meta.counted_at if meta else None,
            "systemAmount": cash_closing,
            "diff": (meta.counted_cash_amount - cash_closing) if (meta and meta.counted_cash_amount is not None) else None,
        },
    }


class CashflowViewSet(viewsets.ViewSet):
    """
    GET  /cashflow/day/?date=YYYY-MM-DD
    POST /cashflow/save_day/   body: { date, cashRows, transferRows, cashOpeningOverride, transferOpeningOverride, checkerName, checkerDate }
                                แต่ละแถวใน cashRows/transferRows รับ createdBy (ชื่อพนักงานที่บันทึก)
    GET  /cashflow/month/?month=YYYY-MM
    GET  /cashflow/today-summary/   สรุปยอดคงเหลือวันนี้แบบสั้น (ใช้กับการ์ดหน้า Dashboard หลัก)
    """

    @action(detail=False, methods=["get"], url_path="day")
    def day(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"error": "ต้องระบุ date"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_build_day_payload(date_str))

    @action(detail=False, methods=["post"], url_path="record_count")
    def record_count(self, request):
        """
        บันทึกการนับเงินสดปลายวัน - แค่บันทึกไว้เป็นประวัติเฉยๆ ไม่มีผลกับยอดคำนวณในระบบเลย
        body: { date, countedAmount }
        """
        try:
            data = request.data
            date_str = data.get("date")
            if not date_str:
                return Response({"error": "ต้องระบุ date"}, status=status.HTTP_400_BAD_REQUEST)

            counted_amount_raw = data.get("countedAmount")
            if counted_amount_raw in ("", None):
                return Response({"error": "ต้องระบุยอดที่นับได้"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                counted_amount = Decimal(str(counted_amount_raw))
            except InvalidOperation:
                return Response({"error": "ยอดที่นับได้ไม่ใช่ตัวเลขที่ถูกต้อง"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                counted_by = getattr(request.user, "name", None) or getattr(request.user, "username", "") or ""
            except Exception:
                counted_by = ""

            from django.utils import timezone

            meta, _created = CashflowDayMeta.objects.get_or_create(date=date_str)
            meta.counted_cash_amount = counted_amount
            meta.counted_by = counted_by
            meta.counted_at = timezone.now()
            meta.save()

            return Response(_build_day_payload(date_str))
        except Exception as e:
            traceback.print_exc()
            return Response({"error": f"{type(e).__name__}: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="save_day")
    def save_day(self, request):
        # ✅ ครอบทั้งฟังก์ชันด้วย try/except ชั่วคราว - production ปิด DEBUG ทำให้ error 500 จริง
        # ไม่โชว์รายละเอียดกลับมาที่ browser เลย (เห็นแค่หน้า HTML ทั่วไป) ครอบแบบนี้จะได้เห็น
        # ข้อความ error จริงใน response ตรงๆ ไม่ต้องไปงมใน Railway logs
        try:
            data = request.data
            date_str = data.get("date")
            if not date_str:
                return Response({"error": "ต้องระบุ date"}, status=status.HTTP_400_BAD_REQUEST)

            # ผู้ใช้ปัจจุบัน (เผื่อแถวไหนไม่ได้แนบ createdBy มาจาก frontend ให้ fallback มาใช้อันนี้)
            try:
                current_user_name = getattr(request.user, "name", None) or getattr(request.user, "username", "") or ""
            except Exception:
                current_user_name = ""

            CashflowEntry.objects.filter(date=date_str).delete()

            objs = []
            for idx, row in enumerate(data.get("cashRows", []) or []):
                objs.append(CashflowEntry(
                    date=date_str, section="cash", seq=idx,
                    description=row.get("description", "") or "",
                    income=row.get("income") or 0, sent=row.get("sent") or 0,
                    expense=row.get("expense") or 0, change=row.get("change") or 0,
                    deposit_return=row.get("depositReturn") or 0,
                    created_by=row.get("createdBy") or current_user_name,
                ))
            for idx, row in enumerate(data.get("transferRows", []) or []):
                objs.append(CashflowEntry(
                    date=date_str, section="transfer", seq=idx,
                    description=row.get("description", "") or "",
                    income=row.get("income") or 0, sent=row.get("sent") or 0,
                    expense=row.get("expense") or 0, change=row.get("change") or 0,
                    deposit_return=row.get("depositReturn") or 0,
                    created_by=row.get("createdBy") or current_user_name,
                ))
            if objs:
                CashflowEntry.objects.bulk_create(objs)

            cash_override = data.get("cashOpeningOverride")
            transfer_override = data.get("transferOpeningOverride")

            meta, _created = CashflowDayMeta.objects.get_or_create(date=date_str)
            meta.cash_opening_override = cash_override if cash_override not in ("", None) else None
            meta.transfer_opening_override = transfer_override if transfer_override not in ("", None) else None
            meta.checker_name = data.get("checkerName", "") or ""
            meta.checker_date = data.get("checkerDate") or None
            meta.save()

            return Response(_build_day_payload(date_str))
        except Exception as e:
            # ✅ พิมพ์ traceback เต็มลง Railway logs ด้วย (เผื่อจะดูย้อนหลังทีหลัง)
            traceback.print_exc()
            return Response(
                {
                    "error": f"{type(e).__name__}: {str(e)}",
                    "received_payload_keys": list(request.data.keys()) if hasattr(request.data, "keys") else None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="month")
    def month(self, request):
        yyyy_mm = request.query_params.get("month")
        if not yyyy_mm:
            return Response({"error": "ต้องระบุ month (YYYY-MM)"}, status=status.HTTP_400_BAD_REQUEST)

        entries = CashflowEntry.objects.filter(date__startswith=yyyy_mm)

        def sum_totals(qs):
            agg = qs.aggregate(
                income=Sum("income"), sent=Sum("sent"), expense=Sum("expense"),
                change=Sum("change"), deposit_return=Sum("deposit_return"),
            )
            return {k: (v or Decimal("0")) for k, v in agg.items()}

        cash_totals = sum_totals(entries.filter(section="cash"))
        transfer_totals = sum_totals(entries.filter(section="transfer"))

        dates = sorted(set(entries.values_list("date", flat=True)))
        days = []
        for d in dates:
            d_str = d.isoformat()
            cash_opening = _section_opening("cash", d_str)
            transfer_opening = _section_opening("transfer", d_str)
            cash_net = CashflowEntry.objects.filter(date=d, section="cash").aggregate(t=Sum(_net_expr())).get("t") or Decimal("0")
            transfer_net = CashflowEntry.objects.filter(date=d, section="transfer").aggregate(t=Sum(_net_expr())).get("t") or Decimal("0")
            days.append({
                "date": d_str,
                "cashClosing": cash_opening + cash_net,
                "transferClosing": transfer_opening + transfer_net,
            })

        last_cash_closing = days[-1]["cashClosing"] if days else Decimal("0")
        last_transfer_closing = days[-1]["transferClosing"] if days else Decimal("0")

        return Response({
            "month": yyyy_mm,
            "cashTotals": cash_totals,
            "transferTotals": transfer_totals,
            "cashClosing": last_cash_closing,
            "transferClosing": last_transfer_closing,
            "days": days,
        })

    @action(detail=False, methods=["get"], url_path="today-summary")
    def today_summary(self, request):
        date_str = date.today().isoformat()
        payload = _build_day_payload(date_str)
        return Response({
            "date": date_str,
            "cashClosing": payload["cash"]["closing"],
            "transferClosing": payload["transfer"]["closing"],
        })