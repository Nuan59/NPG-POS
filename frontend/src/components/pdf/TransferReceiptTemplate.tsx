import {
	Page,
	Text,
	View,
	Document,
	Image,
	Font,
	StyleSheet,
} from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import { IBike } from "@/types/Bike";
import { IStorage } from "@/types/Storage";
import { Table, TR, TH, TD } from "@ag-media/react-pdf-table";
import { getDate } from "@/util/GetDateString";

interface HistoryItem {
	id: number;
	transfer_date: Date | string;
	bikes: IBike[];
	origin: IStorage;
	destination: IStorage;
}

interface TransferReceiptTemplateProps {
	item: HistoryItem;
}

/** ✅ Word-like: 5 แถว/หน้า */
const ROWS_PER_PAGE = 5;

/** แบ่ง array เป็นหน้า ๆ */
function chunk<T>(arr: T[], size: number): T[][] {
	if (!arr || arr.length === 0) return [[]];
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

/** ✅ กันตัวท้าย/วรรณยุกต์ไทยโดนตัดใน cell */
const safeThai = (text: any) => {
	const t = text === null || text === undefined ? "" : String(text);
	return t ? `${t}\u00A0` : t;
};

const TransferReceiptTemplate = ({ item }: TransferReceiptTemplateProps) => {
	/** ฟอนต์เดิม */
	Font.register({
		family: "Prompt",
		format: "truetype",
		src: "/fonts/Prompt-Regular.ttf",
	});

	//@ts-expect-error
	const dateString = getDate(item.transfer_date);

	const styles = StyleSheet.create({
		general: {
			fontFamily: "Prompt",
		},
		image: {
			padding: 0,
			margin: 0,
		},
	});

	const tw = createTw({});

	/**
	 * ✅ แก้สีขาดตัวท้าย (ไทยโดนตัด)
	 * - เพิ่มความสูง cell อีกนิด + เพิ่ม padding ล่าง
	 * - ล็อก line-height ให้เหมาะกับไทยใน react-pdf
	 */
	const tdStyle = tw(
		"text-xs flex justify-center items-start pt-1 pb-2 px-2 min-h-[26px] leading-[1.35]"
	);

	const bikes = item.bikes ?? [];
	const pages = chunk(bikes, ROWS_PER_PAGE);

	return (
		<Document style={tw("flex flex-row items-center")}>
			{pages.map((pageItems, pageIndex) => {
				// ลำดับเป็น 1..n ต่อเนื่องข้ามหน้า
				const startNo = pageIndex * ROWS_PER_PAGE;

				// เติมแถวว่างให้ครบ 5 แถว/หน้า เพื่อให้ฟอร์มทุกหน้าเหมือนกัน
				const blanks = Array.from({
					length: Math.max(0, ROWS_PER_PAGE - pageItems.length),
				});

				return (
					<Page
						key={pageIndex}
						style={styles.general}
						size="A5"
						orientation="landscape"
					>
						{/* ===== HEADER (ซ้ำทุกหน้า เหมือน Word) ===== */}
						<View style={tw("flex flex-row pt-5 px-5 justify-between w-[95%]")}>
							<View style={tw("w-32 p-0 m-0 h-32")}>
								<Image style={styles.image} src={"/logo.png"} />
							</View>

							<View style={tw("flex items-center")}>
								<Text style={tw("text-sm")}>นพดลมอเตอร์กรุ้ป</Text>
								<Text style={tw("text-sm")}>
									359/2 หมู่ 6 ตําบลร้องเข็ม อําเภอร้องกวาง จังหวัดแพร่ โทร.
									099-376-8889
								</Text>
								<Text style={tw("text-sm")}>ศูนย์รวมรถจักรยานยนต์</Text>
								<Text style={tw("text-sm mt-3 font-extrabold underline")}>
									ใบส่งมอบสินค้า
								</Text>
							</View>

							<View style={tw("flex items-center")}>
								<Text style={tw("text-sm")}>ใบโอนรถ</Text>
								<Text style={tw("text-sm")}>
									{`${item.destination?.id}`.padStart(4, "0")}/
									{`${item.id}`.padStart(2, "0")}
								</Text>
							</View>
						</View>

						<View style={tw("flex items-center justify-center -translate-y-12")}>
							{/* วันที่ (ซ้ำทุกหน้า) */}
							<View style={tw("flex items-end w-[89%] justify-end")}>
								<Text style={tw("text-sm")}>{dateString}</Text>
							</View>

							{/* กล่องผู้รับ (ซ้ำทุกหน้า) */}
							<View style={tw("border w-[89%] p-2")}>
								<Text style={tw("text-xs my-2")}>
									นาม {safeThai(item.destination?.storage_name)}
								</Text>
								<Text style={tw("text-xs my-2")}>
									ที่อยู่ {safeThai(item.destination?.address)}
								</Text>
								<Text style={tw("text-xs my-2")}>
									โทรศัพท์ {safeThai(item.destination?.phone)}
								</Text>
							</View>

							{/* ===== TABLE (ซ้ำหัวตารางทุกหน้า + 5 แถว/หน้า) ===== */}
							<Table style={tw("w-[91%] p-2 mt-2")}>
								{/* ✅ ไม่มีคอลัมน์จำนวนเงิน */}
								<TH>
									<TD style={tdStyle}>ลําดับ</TD>
									<TD style={tdStyle}>รหัสรุ่น</TD>
									<TD style={tdStyle}>เลขตัวเครื่อง</TD>
									<TD style={tdStyle}>เลขตัวถัง</TD>
									<TD style={tdStyle}>สี</TD>
								</TH>

								{/* แถวข้อมูลของหน้านี้ */}
								{pageItems.map((bike, index) => (
									<TR key={`${pageIndex}-${index}`}>
										<TD style={tdStyle}>{startNo + index + 1}</TD>
										<TD style={tdStyle}>{safeThai(bike.model_code)}</TD>
										<TD style={tdStyle}>{safeThai(bike.engine)}</TD>
										<TD style={tdStyle}>{safeThai(bike.chassi)}</TD>
										{/* ✅ จุดสำคัญ: ใส่ safeThai ให้คอลัมน์สี */}
										<TD style={tdStyle}>{safeThai(bike.color)}</TD>
									</TR>
								))}

								{/* เติมแถวว่างให้ครบ 5 เพื่อให้เป็นฟอร์มเหมือน Word */}
								{blanks.map((_, i) => (
									<TR key={`blank-${pageIndex}-${i}`}>
										<TD style={tdStyle}> </TD>
										<TD style={tdStyle}> </TD>
										<TD style={tdStyle}> </TD>
										<TD style={tdStyle}> </TD>
										<TD style={tdStyle}> </TD>
									</TR>
								))}
							</Table>

							{/* ===== FOOTER: แสดงเฉพาะหน้าสุดท้าย ===== */}
							{pageIndex === pages.length - 1 && (
								<>
									<View style={tw("w-[60%] p-2 flex flex-row gap-10")}>
										<View style={tw("flex gap-3")}>
											<Text style={tw("text-sm")}>
												ลงชื่อ ......................................... ผู้รับสินค้า
											</Text>
											<Text style={tw("text-sm")}>
												ลงชื่อ ......................................... ผู้ส่งสินค้า
											</Text>
										</View>

										<View style={tw("flex gap-3")}>
											<Text style={tw("text-sm")}>
												ลงชื่อ ......................................... ผู้ขาย/ออกบิล
											</Text>
											<Text style={tw("text-sm")}>
												ลงชื่อ ......................................... ผู้อนุมัติขาย
											</Text>
										</View>
									</View>

									<View style={tw("w-[95%] text-center")}>
										<Text style={tw("text-xs")}>
											ได้รับสินค้าเรียบร้อยครบถ้วน
											และได้ลงนามในใบรับสินค้านี้ไว้ให้เป็นหลักฐานสำคัญ
											หากเกิดการสูญหายหรือเสียหาย ทางห้างฯ จะไม่รับผิดชอบ
											ไม่ว่ากรณีใดทั้งสิ้น
										</Text>
									</View>
								</>
							)}

							{/* ===== เลขหน้า (แสดงเฉพาะหลายหน้า) ===== */}
							{pages.length > 1 && (
								<View style={tw("w-[95%] flex items-end mt-1")}>
									<Text style={tw("text-xs")}>
										หน้า {pageIndex + 1}/{pages.length}
									</Text>
								</View>
							)}
						</View>
					</Page>
				);
			})}
		</Document>
	);
};

export default TransferReceiptTemplate;