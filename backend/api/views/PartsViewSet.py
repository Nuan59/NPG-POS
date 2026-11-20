"""
✅ เมนูอะไหล่
GET    /parts/?q=&low=1&all=1          รายการ (low=1 เฉพาะใกล้หมด / all=1 รวมที่ปิดแล้ว)
POST   /parts/                          เพิ่มอะไหล่ (ใส่ยอดตั้งต้น + ทุน ได้ = รับเข้าครั้งแรก)
PATCH  /parts/{id}/                     แก้ข้อมูล (ยอดคงเหลือแก้ตรงนี้ไม่ได้ - ใช้ รับเข้า / ปรับยอด)
DELETE /parts/{id}/                     (adm) ปิดอะไหล่ (ไม่ลบประวัติ)
POST   /parts/{id}/receive/             รับเข้า { qty, unit_cost, supplier?, bill_no?, note?, pay_cash? }
POST   /parts/{id}/adjust/              (adm) ปรับยอด { qty, reason }
GET    /parts/{id}/movements/           ประวัติเข้า-ออก
GET    /parts/summary/                  จำนวนรายการ / ใกล้หมด / มูลค่าสต็อก (มูลค่าเฉพาะ adm)
ราคาทุน / มูลค่า เห็นเฉพาะ adm
"""
from decimal import Decimal

from django.db.models import F, Q
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api import activity, parts
from api.models.Parts import Part, PartMovement


def _is_admin(request):
    return activity.is_admin(request.user)


def _user(request):
    return getattr(request.user, "name", "") or getattr(request.user, "username", "") or ""


class PartSerializer(serializers.ModelSerializer):
    low = serializers.SerializerMethodField()

    class Meta:
        model = Part
        fields = ["id", "code", "name", "fits", "unit", "cost", "price", "wholesale_price", "qty", "min_qty",
                  "location", "notes", "active", "low", "created_at", "updated_at"]
        read_only_fields = ["id", "qty", "cost", "low", "created_at", "updated_at"]

    def get_low(self, obj):
        return obj.active and obj.qty <= obj.min_qty

    def to_representation(self, obj):
        data = super().to_representation(obj)
        request = self.context.get("request")
        if request is not None and not _is_admin(request):
            data.pop("cost", None)  # 🔒 ราคาทุนเฉพาะ adm
        return data


class MovementSerializer(serializers.ModelSerializer):
    kind_label = serializers.SerializerMethodField()

    class Meta:
        model = PartMovement
        fields = ["id", "kind", "kind_label", "qty", "qty_after", "unit_cost", "unit_price", "ref_type", "ref_id",
                  "supplier", "bill_no", "note", "created_by", "created_at"]

    def get_kind_label(self, obj):
        return PartMovement.KIND_LABEL.get(obj.kind, obj.kind)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        request = self.context.get("request")
        if request is not None and not _is_admin(request):
            data.pop("unit_cost", None)
        return data


class PartsViewSet(viewsets.ModelViewSet):
    serializer_class = PartSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def initial(self, request, *args, **kwargs):
        parts.ensure_tables()
        super().initial(request, *args, **kwargs)

    def handle_exception(self, exc):
        if isinstance(exc, parts.StockError):
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return super().handle_exception(exc)

    def get_queryset(self):
        qs = Part.objects.all()
        p = self.request.query_params
        if p.get("all") not in ("1", "true"):
            qs = qs.filter(active=True)
        q = (p.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(code__icontains=q) | Q(fits__icontains=q) | Q(location__icontains=q))
        if p.get("low") in ("1", "true"):
            qs = qs.filter(qty__lte=F("min_qty"))
        return qs.order_by("name")

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        name = (ser.validated_data.get("name") or "").strip()
        if not name:
            return Response({"error": "กรุณาใส่ชื่ออะไหล่"}, status=400)
        code = (ser.validated_data.get("code") or "").strip()
        if code and Part.objects.filter(code__iexact=code, active=True).exists():
            return Response({"error": f"รหัส {code} มีอยู่แล้ว"}, status=400)
        part = ser.save(name=name, code=code)
        note = f"เพิ่มอะไหล่ {part.code} {part.name} ราคาขาย {parts.fmt(part.price)} ฿".replace("  ", " ")
        # ✅ ยอดตั้งต้น = รับเข้าครั้งแรก (มีประวัติ + ทุนเฉลี่ยถูกต้อง)
        start_qty = request.data.get("start_qty")
        if start_qty not in (None, "", 0, "0"):
            part, mv = parts.receive(part.id, start_qty, request.data.get("unit_cost") or 0, _user(request),
                                     note="ยอดตั้งต้น")
            note += f" · ยอดตั้งต้น {parts.fmt(mv.qty)} {part.unit}"
        activity.note(request, note)
        return Response(self.get_serializer(part).data, status=201)

    def partial_update(self, request, *args, **kwargs):
        part = self.get_object()
        before = {f: getattr(part, f) for f in ("code", "name", "price", "wholesale_price", "min_qty", "location")}
        response = super().partial_update(request, *args, **kwargs)
        part.refresh_from_db()
        changes = [f"{f} {before[f]} → {getattr(part, f)}" for f in before if str(before[f]) != str(getattr(part, f))]
        activity.note(request, f"{part.name}: " + (", ".join(changes) or "ไม่มีการเปลี่ยนแปลง"))
        return response

    def destroy(self, request, *args, **kwargs):
        if not _is_admin(request):
            return Response({"error": "เฉพาะผู้ดูแลระบบ"}, status=403)
        part = self.get_object()
        part.active = False
        part.save(update_fields=["active", "updated_at"])
        activity.note(request, f"ปิดอะไหล่ {part.name} (คงเหลือ {parts.fmt(part.qty)})")
        return Response({"message": "ปิดอะไหล่แล้ว"})

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        part = self.get_object()
        d = request.data
        part, mv = parts.receive(part.id, d.get("qty"), d.get("unit_cost") or 0, _user(request),
                                 supplier=(d.get("supplier") or "").strip(), bill_no=(d.get("bill_no") or "").strip(),
                                 note=(d.get("note") or "").strip())
        expense = None
        if d.get("pay_cash") in (True, "true", "1", 1):
            expense = parts.post_purchase_expense(mv, part, _user(request))
        activity.note(request, f"รับเข้า {part.name} +{parts.fmt(mv.qty)} {part.unit} ทุน {parts.fmt(mv.unit_cost)}/{part.unit}"
                               + (f" · {mv.supplier}" if mv.supplier else "")
                               + (f" · ลงรายจ่ายเงินสด {parts.fmt(expense.expense)} ฿" if expense else ""))
        return Response({"part": self.get_serializer(part).data, "expense_id": expense.id if expense else None})

    @action(detail=True, methods=["post"])
    def adjust(self, request, pk=None):
        if not _is_admin(request):
            return Response({"error": "ปรับยอดได้เฉพาะผู้ดูแลระบบ"}, status=403)
        part = self.get_object()
        before = part.qty
        part, mv = parts.adjust(part.id, request.data.get("qty"), request.data.get("reason"), _user(request))
        activity.note(request, f"ปรับยอด {part.name} {parts.fmt(before)} → {parts.fmt(part.qty)} ({request.data.get('reason')})")
        return Response({"part": self.get_serializer(part).data})

    @action(detail=True, methods=["get"])
    def movements(self, request, pk=None):
        part = self.get_object()
        qs = PartMovement.objects.filter(part=part).order_by("-created_at", "-id")[:200]
        return Response(MovementSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = Part.objects.filter(active=True)
        data = {"count": qs.count(), "low": qs.filter(qty__lte=F("min_qty")).count()}
        if _is_admin(request):
            data["stock_value"] = float(sum((p.qty * p.cost for p in qs if p.qty > 0), Decimal("0")))
        return Response(data)
