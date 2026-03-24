"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encodePrice, decodePrice } from "@/util/PriceDecoder";

interface PriceEncoderProps {
  value: string;
  onChange: (encoded: string) => void;
  label?: string;
  placeholder?: string;
}

/**
 * 🔐 Component สำหรับกรอกราคาส่งแบบเข้ารหัส
 * - ให้กรอกตัวเลข แล้วแปลงเป็นรหัสอัตโนมัติ
 * - หรือกรอกรหัสโดยตรง
 */
const PriceEncoder: React.FC<PriceEncoderProps> = ({
  value,
  onChange,
  label = "ราคาขายส่ง",
  placeholder = "กรอกราคาหรือรหัส"
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [decoded, setDecoded] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toUpperCase();
    setInputValue(val);

    // ถ้าเป็นตัวเลข → แปลงเป็นรหัส
    if (/^\d+$/.test(val)) {
      const encoded = encodePrice(parseInt(val));
      onChange(encoded);
      setDecoded(parseInt(val));
    }
    // ถ้าเป็นรหัส → ถอดรหัสแสดงผล
    else {
      onChange(val);
      const decodedVal = decodePrice(val);
      setDecoded(decodedVal > 0 ? decodedVal : null);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1">
        <Input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="font-mono"
        />
        {decoded !== null && decoded > 0 && (
          <p className="text-xs text-gray-600">
            💰 ราคาจริง: <span className="font-semibold">{decoded.toLocaleString()}</span> บาท
          </p>
        )}
        {inputValue && decoded === 0 && (
          <p className="text-xs text-red-600">
            ⚠️ รหัสไม่ถูกต้อง
          </p>
        )}
      </div>
      <p className="text-xs text-gray-500">
        💡 กรอกตัวเลข (เช่น 14500) หรือรหัส (เช่น NOWTT)
      </p>
    </div>
  );
};

export default PriceEncoder;