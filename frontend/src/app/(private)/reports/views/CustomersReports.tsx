"use client";

import React, { useEffect, useState } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { MapPin, TrendingUp, Users, Package, Map as MapIcon, BarChart3 } from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CENTER = { lat: 18.1447, lng: 100.1381 };
const mapContainerStyle = { width: "100%", height: "600px" };

const MODEL_COLORS: { [key: string]: string } = {
	"WAVE110i": "#FF6B6B",
	"Wave110i": "#FF8C94",
	"GIORNO125 ABS": "#4ECDC4",
	"Click125i": "#45B7D1",
	"PCX160": "#FFA07A",
	"ADV160": "#98D8C8",
	"default": "#6C757D",
};

type Customer = {
	id: number;
	name: string;
	address: string;
	phone: string;
	latitude?: number;
	longitude?: number;
	bike_models?: string[];
	district?: string;
	subdistrict?: string;
};

type ViewMode = "map" | "area";

const CustomersReports = () => {
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("map");

	useEffect(() => {
		const fetchCustomers = async () => {
			try {
				setLoading(true);
				setError(null);

				// ✅ แก้: ใช้ API_BASE_URL แทน hardcode localhost
				const response = await fetch(`${API_BASE_URL}/customers/map/`, {
					headers: {
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				console.log("✅ Fetched customers:", data);

				const mappedCustomers: Customer[] = data.map((item: any) => ({
					id: item.id,
					name: item.name,
					address: item.address,
					phone: item.phone,
					latitude: item.latitude,
					longitude: item.longitude,
					bike_models: item.bike_models || [],
					district: item.district,
					subdistrict: item.subdistrict,
				}));

				setCustomers(mappedCustomers);
			} catch (err) {
				console.error("❌ Error fetching customers:", err);
				setError(err instanceof Error ? err.message : "Failed to load customers");
			} finally {
				setLoading(false);
			}
		};

		fetchCustomers();
	}, []);

	const getAreaAnalysis = () => {
		const byDistrict: { [key: string]: number } = {};
		const bySubdistrict: { [key: string]: { district: string; count: number } } = {};
		const byModel: { [key: string]: number } = {};

		customers.forEach((c) => {
			if (c.district) {
				byDistrict[c.district] = (byDistrict[c.district] || 0) + 1;
			}
			if (c.subdistrict && c.district) {
				const key = `${c.subdistrict} (${c.district})`;
				if (!bySubdistrict[key]) {
					bySubdistrict[key] = { district: c.district, count: 0 };
				}
				bySubdistrict[key].count += 1;
			}
			if (c.bike_models && c.bike_models.length > 0) {
				c.bike_models.forEach((model) => {
					byModel[model] = (byModel[model] || 0) + 1;
				});
			}
		});

		const topDistrict = Object.entries(byDistrict).sort((a, b) => b[1] - a[1])[0];
		const topModel = Object.entries(byModel).sort((a, b) => b[1] - a[1])[0];

		return { byDistrict, bySubdistrict, byModel, topDistrict, topModel };
	};

	const analysis = getAreaAnalysis();

	const getMarkerColor = (bikeModels?: string[]): string => {
		if (!bikeModels || bikeModels.length === 0) return MODEL_COLORS["default"];
		const firstModel = bikeModels[0];
		return MODEL_COLORS[firstModel] || MODEL_COLORS["default"];
	};

	const createColoredMarker = (color: string) => {
		return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
				<path fill="${color}" stroke="white" stroke-width="2" 
					d="M16 0C7.163 0 0 7.163 0 16c0 13 16 32 16 32s16-19 16-32c0-8.837-7.163-16-16-16zm0 22c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/>
			</svg>
		`)}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4 mx-auto"></div>
					<p className="text-gray-600">กำลังโหลดข้อมูล...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full h-full p-6">
				<div className="bg-red-50 border border-red-300 rounded-lg p-6">
					<h2 className="text-xl font-bold text-red-800 mb-2">❌ เกิดข้อผิดพลาด</h2>
					<p className="text-red-700 mb-4">{error}</p>
					<button
						onClick={() => window.location.reload()}
						className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
					>
						โหลดใหม่
					</button>
				</div>
			</div>
		);
	}

	if (!GOOGLE_MAPS_API_KEY) {
		return (
			<div className="w-full h-full p-6">
				<div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
					<h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ ต้องตั้งค่า Google Maps API Key</h2>
					<p className="text-yellow-700 mb-4">ตรวจสอบว่าไฟล์ <code>.env.local</code> มี:</p>
					<div className="bg-white p-4 rounded border">
						<code className="text-sm">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE</code>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold mb-2">การวิเคราะห์ลูกค้า</h2>
					<p className="text-gray-600">
						แสดงข้อมูลลูกค้าทั้งหมด {customers.length} คน
					</p>
				</div>

				<div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
					<button
						onClick={() => setViewMode("map")}
						className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
							viewMode === "map"
								? "bg-white shadow text-blue-600 font-semibold"
								: "text-gray-600 hover:text-gray-900"
						}`}
					>
						<MapIcon className="h-5 w-5" />
						ตามตำแหน่ง
					</button>
					<button
						onClick={() => setViewMode("area")}
						className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
							viewMode === "area"
								? "bg-white shadow text-blue-600 font-semibold"
								: "text-gray-600 hover:text-gray-900"
						}`}
					>
						<BarChart3 className="h-5 w-5" />
						ตามพื้นที่
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-blue-600 font-medium">ลูกค้าทั้งหมด</p>
							<p className="text-3xl font-bold text-blue-900 mt-1">{customers.length}</p>
							<p className="text-xs text-blue-600 mt-1">คน</p>
						</div>
						<div className="bg-blue-200 p-3 rounded-full">
							<Users className="h-8 w-8 text-blue-700" />
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-green-600 font-medium">พื้นที่ยอดนิยม</p>
							<p className="text-2xl font-bold text-green-900 mt-1">
								{analysis.topDistrict?.[0] || "-"}
							</p>
							<p className="text-xs text-green-600 mt-1">{analysis.topDistrict?.[1] || 0} คน</p>
						</div>
						<div className="bg-green-200 p-3 rounded-full">
							<MapPin className="h-8 w-8 text-green-700" />
						</div>
					</div>
				</div>

				<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-purple-600 font-medium">รุ่นรถยอดนิยม</p>
							<p className="text-xl font-bold text-purple-900 mt-1">
								{analysis.topModel?.[0] || "-"}
							</p>
							<p className="text-xs text-purple-600 mt-1">{analysis.topModel?.[1] || 0} คัน</p>
						</div>
						<div className="bg-purple-200 p-3 rounded-full">
							<TrendingUp className="h-8 w-8 text-purple-700" />
						</div>
					</div>
				</div>
			</div>

			{viewMode === "map" ? (
				<>
					<div className="bg-white rounded-lg shadow overflow-hidden mb-4">
						<LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
							<GoogleMap mapContainerStyle={mapContainerStyle} center={CENTER} zoom={13}>
								{customers
									.filter((c) => c.latitude && c.longitude && c.bike_models && c.bike_models.length > 0)
									.map((customer) => {
										const color = getMarkerColor(customer.bike_models);
										return (
											<Marker
												key={customer.id}
												position={{ lat: customer.latitude!, lng: customer.longitude! }}
												icon={{
													url: createColoredMarker(color),
													scaledSize: { width: 32, height: 48 } as any,
												}}
												onClick={() => setSelectedCustomer(customer)}
											/>
										);
									})}

								{selectedCustomer && selectedCustomer.latitude && selectedCustomer.longitude && (
									<InfoWindow
										position={{ lat: selectedCustomer.latitude, lng: selectedCustomer.longitude }}
										onCloseClick={() => setSelectedCustomer(null)}
									>
										<CustomerInfoBox customer={selectedCustomer} />
									</InfoWindow>
								)}
							</GoogleMap>
						</LoadScript>
					</div>

					<div className="bg-white rounded-lg shadow p-4">
						<div className="flex items-center gap-2 mb-3">
							<Package className="h-5 w-5 text-gray-600" />
							<h3 className="text-lg font-semibold">คำอธิบายสีตามรุ่นรถ</h3>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
							{Object.entries(analysis.byModel)
								.sort((a, b) => b[1] - a[1])
								.map(([model, count]) => {
									const color = MODEL_COLORS[model] || MODEL_COLORS["default"];
									return (
										<div key={model} className="flex items-center gap-2 p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
											<div
												className="w-6 h-6 rounded-full border-2 border-white shadow flex-shrink-0"
												style={{ backgroundColor: color }}
											/>
											<div className="flex-1 min-w-0">
												<span className="text-sm font-medium block truncate">{model}</span>
												<span className="text-xs text-gray-600">{count} คัน</span>
											</div>
										</div>
									);
								})}
						</div>
					</div>
				</>
			) : (
				<>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="bg-white rounded-lg shadow p-6">
							<h3 className="text-xl font-bold mb-4 flex items-center gap-2">
								<MapPin className="h-6 w-6 text-green-600" />
								สรุปตามอำเภอ
							</h3>
							<div className="space-y-3">
								{Object.entries(analysis.byDistrict)
									.sort((a, b) => b[1] - a[1])
									.map(([district, count]) => {
										const percentage = ((count / customers.length) * 100).toFixed(1);
										return (
											<div key={district} className="border-b pb-3">
												<div className="flex justify-between items-center mb-1">
													<span className="font-medium">{district}</span>
													<span className="text-sm text-gray-600">{count} คน ({percentage}%)</span>
												</div>
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className="bg-green-500 h-2 rounded-full transition-all"
														style={{ width: `${percentage}%` }}
													/>
												</div>
											</div>
										);
									})}
							</div>
							{Object.keys(analysis.byDistrict).length === 0 && (
								<p className="text-gray-500 text-center py-8">ไม่มีข้อมูล</p>
							)}
						</div>

						<div className="bg-white rounded-lg shadow p-6">
							<h3 className="text-xl font-bold mb-4 flex items-center gap-2">
								<MapPin className="h-6 w-6 text-blue-600" />
								สรุปตามตำบล
							</h3>
							<div className="space-y-3 max-h-[600px] overflow-y-auto">
								{Object.entries(analysis.bySubdistrict)
									.sort((a, b) => b[1].count - a[1].count)
									.map(([subdistrictKey, data]) => {
										const percentage = ((data.count / customers.length) * 100).toFixed(1);
										return (
											<div key={subdistrictKey} className="border-b pb-3">
												<div className="flex justify-between items-center mb-1">
													<span className="font-medium text-sm">{subdistrictKey}</span>
													<span className="text-xs text-gray-600">{data.count} คน ({percentage}%)</span>
												</div>
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className="bg-blue-500 h-2 rounded-full transition-all"
														style={{ width: `${percentage}%` }}
													/>
												</div>
											</div>
										);
									})}
							</div>
							{Object.keys(analysis.bySubdistrict).length === 0 && (
								<p className="text-gray-500 text-center py-8">ไม่มีข้อมูล</p>
							)}
						</div>
					</div>

					<div className="bg-white rounded-lg shadow p-6 mt-6">
						<h3 className="text-xl font-bold mb-4 flex items-center gap-2">
							<Package className="h-6 w-6 text-purple-600" />
							สรุปตามรุ่นรถ
						</h3>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{Object.entries(analysis.byModel)
								.sort((a, b) => b[1] - a[1])
								.map(([model, count]) => {
									const color = MODEL_COLORS[model] || MODEL_COLORS["default"];
									const percentage = ((count / customers.length) * 100).toFixed(1);
									return (
										<div key={model} className="bg-gray-50 rounded-lg p-4 border hover:shadow-md transition-shadow">
											<div className="flex items-center gap-3 mb-2">
												<div
													className="w-8 h-8 rounded-full border-2 border-white shadow flex-shrink-0"
													style={{ backgroundColor: color }}
												/>
												<span className="font-semibold text-sm">{model}</span>
											</div>
											<p className="text-2xl font-bold text-gray-800">{count}</p>
											<p className="text-xs text-gray-600">คัน ({percentage}%)</p>
										</div>
									);
								})}
						</div>
					</div>
				</>
			)}
		</div>
	);
};

const CustomerInfoBox = ({ customer }: { customer: Customer }) => (
	<div className="p-2">
		<h3 className="font-bold text-lg mb-1">{customer.name}</h3>
		<p className="text-sm text-gray-600 mb-1">📍 {customer.address}</p>
		<p className="text-sm text-gray-600 mb-1">📞 {customer.phone}</p>
		{customer.bike_models && customer.bike_models.length > 0 && (
			<div className="mt-2">
				<p className="text-sm font-semibold text-blue-600">🏍️ รุ่นรถที่ซื้อ:</p>
				<ul className="text-xs text-gray-700 ml-4 mt-1">
					{customer.bike_models.map((model, index) => (
						<li key={index}>• {model}</li>
					))}
				</ul>
			</div>
		)}
	</div>
);

export default CustomersReports;