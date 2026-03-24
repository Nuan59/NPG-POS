// imageHandlers.ts
// วางไฟล์นี้ใน: src/app/(private)/sales/[sale_id]/edit/components/

/**
 * จัดการอัปโหลดรูป
 */
export const handleImageUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  setImages: React.Dispatch<React.SetStateAction<File[]>>,
  setImagesPreviews: React.Dispatch<React.SetStateAction<string[]>>
) => {
  const files = e.target.files;
  if (!files) return;

  const newImages = Array.from(files);
  setImages((prev) => [...prev, ...newImages]);

  // สร้าง preview
  newImages.forEach((file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagesPreviews((prev) => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  });
};

/**
 * ลบรูปใหม่
 */
export const handleRemoveNewImage = (
  index: number,
  setImages: React.Dispatch<React.SetStateAction<File[]>>,
  setImagesPreviews: React.Dispatch<React.SetStateAction<string[]>>
) => {
  setImages((prev) => prev.filter((_, i) => i !== index));
  setImagesPreviews((prev) => prev.filter((_, i) => i !== index));
};

/**
 * ลบรูปเดิม
 */
export const handleRemoveExistingImage = (
  index: number,
  setExistingImages: React.Dispatch<React.SetStateAction<string[]>>
) => {
  setExistingImages((prev) => prev.filter((_, i) => i !== index));
};