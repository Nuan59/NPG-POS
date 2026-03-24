// hooks/usePostalCodeLookup.ts
import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const usePostalCodeLookup = () => {
    const [loading, setLoading] = useState(false);

    const lookupPostalCode = async (postalCode: string) => {
        if (postalCode.length !== 5) {
            return null;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/postal-code/?postal_code=${postalCode}`
            );

            if (response.ok) {
                const data = await response.json();
                return {
                    subdistrict: data.subdistrict_th || data.subdistrict || '',
                    district: data.district_th || data.district || '',
                    province: data.province_th || data.province || '',
                };
            }
            return null;
        } catch (error) {
            console.error('Error looking up postal code:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { lookupPostalCode, loading };
};