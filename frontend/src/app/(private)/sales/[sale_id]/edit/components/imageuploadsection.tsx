// ImageUploadSection.tsx
// วางไฟล์นี้ใน: src/app/(private)/sales/[sale_id]/edit/components/

"use client";

import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

interface ImageUploadSectionProps {
  existingImages: string[];
  imagesPreviews: string[];
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveExisting: (index: number) => void;
  onRemoveNew: (index: number) => void;
}

export const ImageUploadSection = ({
  existingImages,
  imagesPreviews,
  onImageUpload,
  onRemoveExisting,
  onRemoveNew,
}: ImageUploadSectionProps) => {
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
      <Label className="flex items-center gap-2 mb-3">
        <ImageIcon size={16} className="text-blue-600" />
        รูปภาพประกอบ
      </Label>

      {/* แสดงรูปเดิม */}
      {existingImages.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-2">รูปภาพเดิม:</p>
          <div className="grid grid-cols-3 gap-2">
            {existingImages.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img}
                  alt={`รูปที่ ${index + 1}`}
                  className="w-full h-24 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => onRemoveExisting(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* แสดงรูปใหม่ที่เลือก */}
      {imagesPreviews.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-2">รูปใหม่:</p>
          <div className="grid grid-cols-3 gap-2">
            {imagesPreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => onRemoveNew(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ปุ่มอัปโหลด */}
      <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
        <Upload size={16} className="text-blue-600" />
        <span className="text-sm text-blue-600">เพิ่มรูปภาพ</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onImageUpload}
          className="hidden"
        />
      </label>
      <p className="text-xs text-gray-500 mt-2">
        รองรับไฟล์: JPG, PNG, GIF (สูงสุด 5 รูป)
      </p>
    </div>
  );
};