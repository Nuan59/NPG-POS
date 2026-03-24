"use client";

import { useEffect } from "react";

/**
 * PosScaleWrapper - จัดการ responsive scaling แบบ CSS Variables
 * ไม่ใช้ transform: scale() เพื่อไม่ให้ layout พัง
 */
export default function PosScaleWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const BASE_WIDTH = 1920;
  const BASE_HEIGHT = 1080;

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // คำนวณ scale factor
      const scaleX = vw / BASE_WIDTH;
      const scaleY = vh / BASE_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      // จำกัด scale ระหว่าง 0.6 - 1.5
      const clampedScale = Math.max(0.6, Math.min(1.5, scale));

      // อัพเดท CSS variable แทนการใช้ transform
      document.documentElement.style.setProperty(
        '--viewport-scale',
        `${clampedScale * 100}`
      );
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "auto",
      }}
    >
      {children}
    </div>
  );
}