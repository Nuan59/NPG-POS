# NPG-POS

ระบบหน้าร้านขายรถ: `frontend/` (Next.js บน Vercel) + `backend/` (Django REST บน Railway)

## กฎ: เพิ่ม/เปลี่ยนฟังก์ชัน → อัปเดตคู่มือใน commit เดียวกัน

คู่มือการใช้งานอยู่ในแอป (หน้า `/manual`, ปุ่ม `?` บนแถบเมนู) เนื้อหาทั้งหมดอยู่ที่
`frontend/src/app/(private)/manual/manualContent.ts`

ทุกครั้งที่เพิ่มหรือเปลี่ยนสิ่งที่ผู้ใช้เห็น (หน้าใหม่ ปุ่มใหม่ ขั้นตอนเปลี่ยน สิทธิ์เปลี่ยน):
1. แก้/เพิ่มเนื้อหาในหมวดที่เกี่ยวข้องใน `SECTIONS` (ภาษาไทย ประโยคสั้น ชื่อปุ่มตรงกับหน้าจอจริงเป็น **ตัวหนา**)
2. เพิ่มรายการบนสุดของ `UPDATES` (วันที่ · ชื่อ · อธิบาย 1 บรรทัด · `section`)
3. อัปเดต `MANUAL_UPDATED_AT`
หน้าใหม่ที่ต้องมีสิทธิ์ → ใส่ `permission` ให้ตรงกับ `frontend/src/app/(private)/employees/components/permissions.ts`

## ทดสอบ

- backend: `cd backend && python manage.py test api.tests --settings=core.test_settings`
- frontend: `cd frontend && npm run build`
- GitHub Actions (`.github/workflows/ci.yml`) รันทั้งสองอย่างทุก push

## ข้อควรรู้

- ตารางหลายตัวสร้างด้วย raw SQL ผ่าน `/dev/...` ไม่ผ่าน migration - อย่ารัน `makemigrations` แบบไม่ดูผล
- `/dev/...` ใช้ได้เฉพาะ adm (token) หรือ `?key=DEV_TOOLS_KEY`
- ทุก API ต้องล็อกอิน (DRF default IsAuthenticated) endpoint สาธารณะต้องตั้ง `permission_classes` เอง
- การเพิ่ม/แก้/ลบทุกครั้งถูกบันทึกใน activity log (`backend/api/activity.py`) งานเงินให้เรียก `activity.note(request, "...")` บอกยอดก่อน → หลัง
