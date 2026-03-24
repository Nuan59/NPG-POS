import { Font } from "@react-pdf/renderer";

export const registerFonts = () => {
  Font.register({
    family: 'Sarabun',
    fonts: [
      { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 'normal' },
      { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
    ],
  });
  Font.registerHyphenationCallback((word: string) => [word]);
};

export const ZWJ = '\u200D';

export const sanitizeText = (text: any): string => {
  if (!text) return "";
  let str = String(text);
  str = str
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  str = str.replace(/ำ/g, `ำ${ZWJ}`);
  str = str.replace(/-([ก-๙])/g, `-${ZWJ}$1`);
  str = str.replace(/(ง|ญ|ว|ย|ร|ล|ศ|ส|ห|อ|ฮ|ป|ด|บ|ท)/g, `$1${ZWJ}`);
  str = str.replace(/([0-9])/g, `$1${ZWJ}`);
  return str.trim();
};

export const numberToThaiText = (num: number): string => {
  try {
    if (num === 0) return "ศูนย์บาทถ้วน";
    const ones = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    let result = "";
    const absNum = Math.abs(Math.floor(num));
    const strNum = absNum.toString();
    const len = strNum.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(strNum[i]);
      const place = len - i - 1;
      if (digit === 0) continue;
      if (place === 0 && digit === 1 && len > 1) result += "เอ็ด";
      else if (place === 1 && digit === 1) result += "สิบ";
      else if (place === 1 && digit === 2) result += "ยี่สิบ";
      else if (place === 1) result += ones[digit] + "สิบ";
      else result += ones[digit] + (positions[place] || "");
    }
    return result + "บาทถ้วน";
  } catch (e) {
    return "ศูนย์บาทถ้วน";
  }
};

export const fmt = (n: number): string => n.toLocaleString('en-US');

export const getCustomerField = (field: string, order: any, customerData?: any): string => {
  try {
    if (customerData && typeof customerData === 'object') {
      const value = customerData[field];
      if (value && typeof value === 'string' && value.trim().length > 0)
        return sanitizeText(value);
    }
    const apiField = field === 'phone' ? 'customer_phone'
      : field === 'address' ? 'customer_address'
      : field === 'name' ? 'customer'
      : field;
    const apiValue = order[apiField];
    if (apiValue && typeof apiValue === 'string' && apiValue.trim().length > 0)
      return sanitizeText(apiValue);
    if (order.customer && typeof order.customer === 'object') {
      const value = order.customer[field];
      if (value && typeof value === 'string' && value.trim().length > 0)
        return sanitizeText(value);
    }
    return "";
  } catch (e) {
    return "";
  }
};

export const buildFullAddress = (order: any, customerData?: any): string => {
  let fullAddress = getCustomerField('address', order, customerData);
  const subdistrict = order.customer_subdistrict || getCustomerField('subdistrict', order, customerData);
  const district = order.customer_district || getCustomerField('district', order, customerData);
  const province = order.customer_province || getCustomerField('province', order, customerData);
  const postalCode = order.customer_postal_code || getCustomerField('postal_code', order, customerData);
  if (fullAddress && subdistrict) fullAddress += ` ต.${subdistrict}`;
  else if (subdistrict) fullAddress = `ต.${subdistrict}`;
  if (district) fullAddress += ` อ.${district}`;
  if (province) fullAddress += ` จ.${province}`;
  if (postalCode) fullAddress += ` ${postalCode}`;
  return fullAddress.trim() || "ไม่ระบุที่อยู่";
};

export const isPaymentMethod = (method: string, order: any): boolean => {
  try {
    const pm = (order.payment_method || "").toLowerCase();
    const fp = (order.finance_provider || "").toLowerCase();
    return pm === method ||
      (method === "cash" && pm === "เงินสด") ||
      (method === "finance" && (pm === "ไฟแนนซ์" || fp === "cathay" || fp === "ทรัพย์สยาม")) ||
      (method === "npg" && fp === "npg");
  } catch (e) {
    return false;
  }
};