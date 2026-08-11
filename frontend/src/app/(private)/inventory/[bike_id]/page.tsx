import Link from "next/link";
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";

type PageProps = {
  params: { bike_id: string };
};

export default async function InventoryViewPage({ params }: PageProps) {
  const bikeId = Number(params.bike_id);

  if (Number.isNaN(bikeId)) {
    return (
      <div style={{ padding: 24 }}>
        <h2>รหัสสินค้าไม่ถูกต้อง</h2>
        <Link href="/inventory">กลับไปหน้าสินค้า</Link>
      </div>
    );
  }

  let bike: any = null;
  let errorMsg: string | null = null;

  try {
    const apiBase = process.env.API_URL || "http://localhost:8000";
    const res = await authorizedFetch(`${apiBase}/inventory/${bikeId}/`, {
      cache: "no-store",
    });

    if (!res) {
      errorMsg = "ไม่ได้รับ response (อาจยังไม่ login หรือ session หลุด)";
    } else if (!res.ok) {
      const t = await res.text().catch(() => "");
      errorMsg = `โหลดสินค้าไม่ได้ (${res.status}) ${t}`;
    } else {
      bike = await res.json();
    }
  } catch (e: any) {
    errorMsg = e?.message || "เกิดข้อผิดพลาดตอนโหลดสินค้า";
  }

  if (errorMsg || !bike) {
    return (
      <div style={{ padding: 24 }}>
        <h2>ไม่สามารถแสดงข้อมูลสินค้า</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{errorMsg || "ไม่พบสินค้า"}</pre>
        <div style={{ marginTop: 12 }}>
          <Link href="/inventory">← กลับไปหน้าสินค้า</Link>
        </div>
      </div>
    );
  }

  // ✅ แปลง category เป็นภาษาไทย
  const categoryLabel = bike.category === "new" ? "รถใหม่" : "มือสอง";
  const isPreOwned = bike.category === "pre_owned";

  // ✅ สร้างแถวข้อมูลพื้นฐาน
  const rows: { label: string; value: any }[] = [
    { label: "ID", value: bike.id },
    { label: "ยี่ห้อ", value: bike.brand },
    { label: "ชื่อรุ่น", value: bike.model_name },
    { label: "สี", value: bike.color },
    { label: "รหัสรุ่น", value: bike.model_code },
    { label: "เลขเครื่อง", value: bike.engine },
    { label: "เลขตัวถัง", value: bike.chassi },
    { label: "ประเภทสินค้า", value: categoryLabel },
  ];

  // ✅ ถ้าเป็นรถมือสอง เพิ่มฟิลด์ทะเบียนและวันหมดอายุ
  if (isPreOwned) {
    rows.push({ label: "ทะเบียนรถ", value: bike.registration_plate || "-" });

    if (bike.registration_expiry_date) {
      rows.push({
        label: "วันหมดอายุทะเบียน",
        value: new Date(bike.registration_expiry_date).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });
    }
  }

  // ✅ ข้อมูลอื่นๆ - ใช้ storage_place_name แทน storage_place
  rows.push(
    { label: "สถานที่เก็บ", value: bike.storage_place_name || bike.storage_place || "-" },
    { label: "หมายเหตุ", value: bike.notes || "-" },
    { label: "สถานะขาย", value: bike.sold ? "ขายแล้ว" : "ยังไม่ขาย" }
  );

  const saleInfo = bike.sale_info as
    | {
        order_id: number;
        customer_name: string | null;
        customer_phone: string | null;
        sale_date: string;
        salesperson: string | null;
        payment_method: string | null;
        total: number | null;
      }
    | undefined;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>
          ดูสินค้า: {bike.model_name || "-"}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/inventory/${bike.id}/edit`}>
            <Button variant="outline">แก้ไข</Button>
          </Link>
          <Link href="/inventory">
            <Button variant="secondary">← กลับ</Button>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 12, fontWeight: 600, width: 220 }}>
                  {r.label}
                </td>
                <td style={{ padding: 12 }}>
                  {r.value === null || r.value === undefined || r.value === ""
                    ? "-"
                    : String(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ ข้อมูลการขาย - แสดงเฉพาะสินค้าที่ขายแล้ว */}
      {bike.sold && (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #fca5a5",
            backgroundColor: "#fef2f2",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#991b1b" }}>
              ข้อมูลการขาย
            </h3>
            {saleInfo && (
              <Link href={`/sales/${saleInfo.order_id}`}>
                <Button size="sm" className="flex items-center gap-2">
                  <Receipt size={16} />
                  ดูรายละเอียดการขาย
                </Button>
              </Link>
            )}
          </div>

          {!saleInfo ? (
            <p style={{ color: "#7f1d1d", fontSize: 14 }}>
              สินค้านี้ถูกทำเครื่องหมายว่า "ขายแล้ว" แต่ไม่พบรายการขายที่ผูกอยู่
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 0", fontWeight: 600, width: 160, color: "#7f1d1d" }}>ผู้ซื้อ</td>
                  <td style={{ padding: "4px 0", color: "#7f1d1d" }}>{saleInfo.customer_name || "-"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#7f1d1d" }}>เบอร์โทร</td>
                  <td style={{ padding: "4px 0", color: "#7f1d1d" }}>{saleInfo.customer_phone || "-"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#7f1d1d" }}>วันที่ขาย</td>
                  <td style={{ padding: "4px 0", color: "#7f1d1d" }}>
                    {saleInfo.sale_date
                      ? new Date(saleInfo.sale_date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "-"}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#7f1d1d" }}>ผู้ขาย</td>
                  <td style={{ padding: "4px 0", color: "#7f1d1d" }}>{saleInfo.salesperson || "-"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#7f1d1d" }}>วิธีการชำระ</td>
                  <td style={{ padding: "4px 0", color: "#7f1d1d" }}>{saleInfo.payment_method || "-"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#7f1d1d" }}>ยอดสุทธิ</td>
                  <td style={{ padding: "4px 0", color: "#7f1d1d" }}>
                    {saleInfo.total ? `${Number(saleInfo.total).toLocaleString()} บาท` : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}