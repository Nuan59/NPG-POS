from fpdf import FPDF

pdf = FPDF()
pdf.add_page()

# บอกให้ใช้ฟอนต์ภาษาไทย
pdf.add_font(
    "THS",
    "",
    "fonts/THSarabunNew.ttf",
    uni=True
)

pdf.set_font("THS", size=16)

pdf.cell(0, 10, "ทดสอบภาษาไทย", ln=1)
pdf.cell(0, 10, "ใบเสร็จรับเงิน นพดลมอเตอร์กรุ๊ป", ln=1)
pdf.cell(0, 10, "ถ้าอ่านข้อความนี้ออก แปลว่าผ่าน", ln=1)

pdf.output("thai_test.pdf")
