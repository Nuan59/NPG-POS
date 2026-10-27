export interface IBike {
	id: number;
	model_name: string;
	model_code: string;
	engine: string;
	chassi: string;
	registration_plate: string;
	color: string;
	notes: string;
	category: string;
	sale_price: string;
	wholesale_price: string;
	wholesale_price_net: string;
	received_date: string;
	sold: boolean;
	brand: string;
	storage_place: string | null;
	source?: number | null; // ✅ ที่มาของรถ (id)
	source_code?: string | null; // โค้ดที่มา (ทุกคนเห็น)
	source_name?: string | null; // ชื่อเต็มของที่มา (เฉพาะ adm)
	source_code_import?: string; // ใช้ตอนนำเข้า CSV
}