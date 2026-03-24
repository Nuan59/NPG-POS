"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, Autocomplete } from "@react-google-maps/api";
import { MapPin, Search } from "lucide-react";
import { getSession } from "next-auth/react";
import { pdf } from "@react-pdf/renderer";
import PDPAConsentTemplate from "@/components/pdf/PDPAConsentTemplate";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// พิกัดศูนย์กลาง (แพร่)
const DEFAULT_CENTER = { lat: 18.1447, lng: 100.1381 };

// ✅ เพิ่ม libraries สำหรับ Places API
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

// ✅ Interface สำหรับ Customer
interface Customer {
    id?: number;
    name: string;
    id_card_number: string;
    age: number;
    dob: string;
    gender: string;
    phone: string;
    address: string;
    postal_code?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    latitude?: number | null;
    longitude?: number | null;
}

interface CustomerFormProps {
    customer?: Customer;  // ✅ เพิ่ม prop สำหรับแก้ไข
}

export default function CustomerFormWithMap({ customer }: CustomerFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        id_card_number: "",
        age: "",
        dob: "",
        gender: "M",
        phone: "",
        address: "",
        postal_code: "",
        subdistrict: "",
        district: "",
        province: "",
        latitude: null as number | null,
        longitude: null as number | null,
    });

    const [loading, setLoading] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
    
    // ✅ สำหรับ Google Places Autocomplete
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [searchValue, setSearchValue] = useState("");

    // ✅ useEffect เพื่อโหลดข้อมูลเดิม (สำหรับแก้ไข)
    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || "",
                id_card_number: customer.id_card_number || "",
                age: customer.age?.toString() || "",
                dob: customer.dob || "",
                gender: customer.gender || "M",
                phone: customer.phone || "",
                address: customer.address || "",
                postal_code: customer.postal_code || "",
                subdistrict: customer.subdistrict || "",
                district: customer.district || "",
                province: customer.province || "",
                latitude: customer.latitude || null,
                longitude: customer.longitude || null,
            });

            // ✅ ถ้ามีพิกัด ให้ center แผนที่ไปที่ตำแหน่งนั้น
            if (customer.latitude && customer.longitude) {
                setMapCenter({
                    lat: customer.latitude,
                    lng: customer.longitude
                });
            }
        }
    }, [customer]);

    // ✅ ฟังก์ชันคำนวณอายุจากวันเกิด
    const calculateAge = (dateString: string): number => {
        const birthDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    };

    // ✅ Handle วันเกิดเปลี่ยน
    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dob = e.target.value;
        const age = calculateAge(dob);
        
        setFormData({
            ...formData,
            dob: dob,
            age: age.toString(),
        });
    };

    // 🔍 ฟังก์ชันเมื่อเลือกสถานที่จาก Autocomplete
    const handlePlaceSelect = useCallback(() => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            
            // ✅ ตรวจสอบว่า place มีข้อมูลครบถ้วน
            if (!place || !place.geometry || !place.geometry.location) {
                console.log("ไม่พบข้อมูลสถานที่");
                return;
            }
            
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            
            console.log("📍 Selected place:", place.name, { lat, lng });
            
            // ✅ เก็บแค่พิกัด ไม่แก้ที่อยู่
            setFormData({
                ...formData,
                latitude: lat,
                longitude: lng,
            });
            
            setMapCenter({ lat, lng });
            setSearchValue("");
        }
    }, [formData]);

    const handleAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    }, []);

    // 🗺️ ปักหมุด → เก็บแค่พิกัด (ไม่ดึงที่อยู่)
    const reverseGeocode = async (lat: number, lng: number) => {
        // ✅ เก็บแค่พิกัด ไม่ดึงที่อยู่
        setFormData({
            ...formData,
            latitude: lat,
            longitude: lng,
        });
        
        console.log("📍 Marker placed at:", { lat, lng });
    };

    // 🔍 Forward Geocoding: ที่อยู่ → ปักหมุด
    const forwardGeocode = async () => {
        if (!GOOGLE_MAPS_API_KEY) {
            alert("ไม่พบ Google Maps API Key");
            return;
        }
        
        const { address, subdistrict, district, province } = formData;
        
        // ต้องมีข้อมูลพอสมควร
        if (!district || !province) {
            alert("กรุณากรอกอย่างน้อย อำเภอ และ จังหวัด");
            return;
        }

        // สร้างที่อยู่ที่ค้นหาได้ง่าย (ไม่ใส่ที่อยู่เฉพาะ)
        const searchAddress = `${subdistrict} ${district} ${province} ประเทศไทย`.trim();
        
        console.log("🔍 Searching for:", searchAddress);
        
        setGeocoding(true);
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchAddress)}&key=${GOOGLE_MAPS_API_KEY}&language=th`
            );
            
            const data = await response.json();
            
            console.log("📍 Geocoding result:", data);
            
            if (data.status === "OK" && data.results[0]) {
                const location = data.results[0].geometry.location;
                
                setFormData({
                    ...formData,
                    latitude: location.lat,
                    longitude: location.lng,
                });
                
                setMapCenter({ lat: location.lat, lng: location.lng });
                
                alert(`✅ พบตำแหน่ง: ${data.results[0].formatted_address}`);
            } else if (data.status === "ZERO_RESULTS") {
                alert(`❌ ไม่พบตำแหน่งที่อยู่นี้: "${searchAddress}"\n\nลองใช้วิธีคลิกบนแผนที่แทนครับ`);
            } else {
                alert(`เกิดข้อผิดพลาด: ${data.status}\n\nลองใช้วิธีคลิกบนแผนที่แทนครับ`);
            }
        } catch (error) {
            console.error("Forward geocoding error:", error);
            alert("เกิดข้อผิดพลาดในการค้นหาตำแหน่ง\n\nลองใช้วิธีคลิกบนแผนที่แทนครับ");
        } finally {
            setGeocoding(false);
        }
    };

    // ฟังก์ชันค้นหาอำเภอ/จังหวัดจากรหัสไปรษณีย์
    const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const postal_code = e.target.value;
        setFormData({ ...formData, postal_code });

        if (postal_code.length === 5) {
            setLookingUp(true);
            try {
                const response = await fetch(`${API_BASE_URL}/postal-code/?postal_code=${postal_code}`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    setFormData({
                        ...formData,
                        postal_code: postal_code,
                        subdistrict: data.subdistrict_th || data.subdistrict || "",
                        district: data.district_th || data.district || "",
                        province: data.province_th || data.province || "",
                    });
                }
            } catch (error) {
                console.error("Error looking up postal code:", error);
            } finally {
                setLookingUp(false);
            }
        }
    };

    // 🗺️ ฟังก์ชันคลิกบนแผนที่เพื่อปักหมุด
    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            
            // เรียก Reverse Geocoding เพื่อดึงที่อยู่
            reverseGeocode(lat, lng);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // ✅ Validation
        if (!formData.name) {
            alert("❌ กรุณากรอกชื่อลูกค้า");
            return;
        }
        if (!formData.id_card_number) {
            alert("❌ กรุณากรอกเลขบัตรประชาชน");
            return;
        }
        if (!formData.phone) {
            alert("❌ กรุณากรอกเบอร์โทรศัพท์");
            return;
        }
        if (!formData.dob) {
            alert("❌ กรุณาเลือกวันเกิด");
            return;
        }
        if (!formData.age) {
            alert("❌ กรุณากรอกอายุ");
            return;
        }
        if (!formData.address) {
            alert("❌ กรุณากรอกที่อยู่");
            return;
        }
        
        setLoading(true);

        try {
            // ✅ ดึง session และ token
            const session = await getSession();
            const token = (session as any)?.user?.accessToken;

            if (!token) {
                alert("❌ ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
                window.location.href = "/login";
                return;
            }

            // ✅ ตรวจสอบว่าเป็นการแก้ไขหรือสร้างใหม่
            const isEdit = customer && customer.id;
            const url = isEdit 
                ? `${API_BASE_URL}/customers/${customer.id}/`
                : `${API_BASE_URL}/customers/`;
            const method = isEdit ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const savedCustomer = await response.json();
                
                // ✅ บันทึกสำเร็จ!
                
                // 🎯 สร้างที่อยู่เต็ม
                const fullAddress = [
                    formData.address,
                    formData.subdistrict ? `ต.${formData.subdistrict}` : "",
                    formData.district ? `อ.${formData.district}` : "",
                    formData.province ? `จ.${formData.province}` : "",
                    formData.postal_code || "",
                ].filter(Boolean).join(" ");

                // 🎯 เปิด PDF PDPA Consent Form
                if (!isEdit) {  // เฉพาะเพิ่มใหม่ (ไม่ใช่แก้ไข)
                    try {
                        console.log("[PDPA] Creating PDF...");
                        
                        const blob = await pdf(
                            <PDPAConsentTemplate
                                customerName={formData.name}
                                address={fullAddress}
                                phone={formData.phone}
                            />
                        ).toBlob();
                        
                        console.log(`[PDPA] PDF created (${blob.size} bytes)`);
                        
                        const pdfUrl = URL.createObjectURL(blob);
                        window.open(pdfUrl, "_blank");
                        
                        // ล้าง URL หลัง 5 วินาที
                        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
                        
                        alert("✅ เพิ่มลูกค้าสำเร็จ!\n\n📄 กรุณาพิมพ์ใบยินยอม PDPA ให้ลูกค้าลงนาม");
                    } catch (pdfError) {
                        console.error("[PDPA] PDF Error:", pdfError);
                        // ไม่ alert error เพราะลูกค้าบันทึกสำเร็จแล้ว
                        alert("✅ เพิ่มลูกค้าสำเร็จ!\n\n⚠️ ไม่สามารถสร้าง PDF ได้ กรุณาเปิดจากหน้าลูกค้า");
                    }
                } else {
                    alert("✅ แก้ไขข้อมูลลูกค้าสำเร็จ!");
                }
                
                // Redirect
                if (isEdit) {
                    window.location.href = `/customers/${customer.id}`;
                } else {
                    window.location.href = "/customers";
                }
            } else {
                const error = await response.json();
                
                if (error.detail) {
                    alert(`❌ ${error.detail}`);
                } else {
                    alert(`❌ เกิดข้อผิดพลาด: ${JSON.stringify(error)}`);
                }
            }
        } catch (error) {
            console.error("Error:", error);
            alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ซ้าย: ฟอร์มข้อมูล */}
                    <div className="space-y-6">
                        {/* ข้อมูลส่วนตัว */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4">ข้อมูลส่วนตัว</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">ชื่อ-นามสกุล *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">เลขบัตรประชาชน *</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={13}
                                        value={formData.id_card_number}
                                        onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">เบอร์โทร *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">วันเกิด *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.dob}
                                            onChange={handleDobChange}
                                            max={new Date().toISOString().split('T')[0]}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">อายุ *</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.age}
                                            readOnly
                                            className="w-full border rounded px-3 py-2 bg-gray-50"
                                            placeholder="คำนวณอัตโนมัติ"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">เพศ *</label>
                                    <select
                                        required
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full border rounded px-3 py-2"
                                    >
                                        <option value="M">ชาย</option>
                                        <option value="F">หญิง</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ที่อยู่ */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4">ที่อยู่</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">ที่อยู่ *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="เลขที่ หมู่บ้าน ถนน"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        รหัสไปรษณีย์ *
                                        {lookingUp && <span className="ml-2 text-blue-600 text-sm">กำลังค้นหา...</span>}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={5}
                                        value={formData.postal_code}
                                        onChange={handlePostalCodeChange}
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="กรอกรหัสไปรษณีย์ 5 หลัก"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">ตำบล/แขวง</label>
                                        <input
                                            type="text"
                                            value={formData.subdistrict}
                                            onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">อำเภอ/เขต *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.district}
                                            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2">จังหวัด *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.province}
                                            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                            className="w-full border rounded px-3 py-2"
                                        />
                                    </div>
                                </div>

                                {/* ปุ่มค้นหาตำแหน่งจากที่อยู่ */}
                                <button
                                    type="button"
                                    onClick={forwardGeocode}
                                    disabled={geocoding || !formData.district || !formData.province}
                                    className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                                >
                                    <MapPin className="w-4 h-4" />
                                    {geocoding ? "กำลังค้นหา..." : "🔍 ค้นหาตำแหน่งจากที่อยู่"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ขวา: แผนที่ */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">ปักหมุดตำแหน่ง</h3>
                                <div className="flex items-center gap-2">
                                    {geocoding && (
                                        <span className="text-sm text-blue-600">กำลังประมวลผล...</span>
                                    )}
                                    {formData.latitude && formData.longitude && (
                                        <span className="text-sm text-green-600 flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            ปักหมุดแล้ว
                                        </span>
                                    )}
                                </div>
                            </div>

                            {GOOGLE_MAPS_API_KEY ? (
                                <>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                        <p className="text-sm text-blue-800 font-medium mb-1">💡 3 วิธีในการปักหมุด:</p>
                                        <ul className="text-sm text-blue-700 space-y-1 ml-4">
                                            <li>• <strong>วิธีที่ 1:</strong> ค้นหาในช่อง Search บนแผนที่</li>
                                            <li>• <strong>วิธีที่ 2:</strong> คลิกบนแผนที่เพื่อปักหมุด</li>
                                            <li>• <strong>วิธีที่ 3:</strong> กรอกที่อยู่ → กด "ค้นหาตำแหน่ง"</li>
                                            <li className="text-green-700">• <strong>ลากหมุด:</strong> สามารถลากหมุดเพื่อปรับตำแหน่งได้</li>
                                        </ul>
                                        <p className="text-xs text-blue-600 mt-2">ℹ️ หมายเหตุ: การปักหมุดจะบันทึกพิกัดเท่านั้น ที่อยู่กรุณากรอกเองในฟอร์มด้านซ้าย</p>
                                    </div>
                                    
                                    <div className="border rounded-lg overflow-hidden">
                                        <LoadScript 
                                            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
                                            libraries={libraries}
                                        >
                                            <div className="relative">
                                                {/* 🔍 Search Box */}
                                                <div className="absolute top-3 left-3 right-3 z-10">
                                                    <Autocomplete
                                                        onLoad={handleAutocompleteLoad}
                                                        onPlaceChanged={handlePlaceSelect}
                                                        options={{
                                                            componentRestrictions: { country: "th" },
                                                            fields: ["address_components", "geometry", "name", "formatted_address"],
                                                            language: "th",  // ✅ ภาษาไทย
                                                        }}
                                                    >
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="🔍 ค้นหาสถานที่ เช่น โรงพยาบาล ตลาด โรงเรียน"
                                                                value={searchValue}
                                                                onChange={(e) => setSearchValue(e.target.value)}
                                                                className="w-full pl-10 pr-4 py-3 rounded-lg shadow-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </Autocomplete>
                                                </div>

                                                <GoogleMap
                                                    mapContainerStyle={{ width: "100%", height: "400px" }}
                                                    center={formData.latitude && formData.longitude 
                                                        ? { lat: formData.latitude, lng: formData.longitude }
                                                        : mapCenter
                                                    }
                                                    zoom={13}
                                                    onClick={handleMapClick}
                                                    options={{
                                                        language: "th",
                                                        region: "TH",
                                                    }}
                                                >
                                                    {formData.latitude && formData.longitude && (
                                                        <Marker
                                                            position={{
                                                                lat: formData.latitude,
                                                                lng: formData.longitude,
                                                            }}
                                                            draggable={true}
                                                            onDragEnd={(e) => {
                                                                if (e.latLng) {
                                                                    const lat = e.latLng.lat();
                                                                    const lng = e.latLng.lng();
                                                                    reverseGeocode(lat, lng);
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </GoogleMap>
                                            </div>
                                        </LoadScript>
                                    </div>

                                    {formData.latitude && formData.longitude && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                            <p className="font-medium mb-1">พิกัดที่เลือก:</p>
                                            <p className="text-gray-600">
                                                Lat: {formData.latitude.toFixed(6)}, 
                                                Lng: {formData.longitude.toFixed(6)}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ 
                                                    ...formData, 
                                                    latitude: null, 
                                                    longitude: null,
                                                    address: "",
                                                    subdistrict: "",
                                                    district: "",
                                                    province: "",
                                                    postal_code: "",
                                                })}
                                                className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                            >
                                                🗑️ ลบหมุดและล้างที่อยู่
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800">
                                        ⚠️ ต้องตั้งค่า Google Maps API Key ใน .env.local
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ปุ่ม Submit */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="px-6 py-2 border rounded hover:bg-gray-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-6 py-2 rounded transition-colors ${
                            loading 
                                ? "bg-gray-400 cursor-not-allowed" 
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                        {loading ? "กำลังบันทึก..." : (customer?.id ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า")}
                    </button>
                </div>
            </form>
        </div>
    );
}