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
}
